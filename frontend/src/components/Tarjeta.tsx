import { useEffect, useRef, useState } from 'react';
import type { Card, EntradaVoz, Feedback, PetSpecies, Tile } from '../api';
import { listen, play, reproducirGrabacion } from '../audio';
import { Boca, consejoDe, sonidosDe } from './Boca';
import { Ilustracion } from './Ilustracion';
import { BotonSonido, CajaFeedback } from './comunes';
import { Mascota } from './Mascota';
import './Tarjeta.css';

export interface ResultadoArmado {
  correct: boolean;
  matchedPrefixLength: number;
  feedback: Feedback;
  voiceCheckRequired: boolean;
}

export interface ResultadoVoz {
  accepted: boolean;
  /** Si todavía quedan intentos para esta misma tarjeta. */
  canRetry: boolean;
  /** En false, el servidor no oyó nada útil: se pide repetir, no es un error. */
  heard?: boolean;
  feedback: Feedback;
}

interface Props {
  card: Card;
  species: PetSpecies;
  onArmado: (sequence: string[]) => Promise<ResultadoArmado>;
  /** `null` significa que no se pudo escuchar. */
  onVoz?: (voz: EntradaVoz) => Promise<ResultadoVoz>;
  /** La tarjeta quedó resuelta (y dicha, si pedía voz). */
  onLista: () => void;
  /** En Repaso la letra va en verde agua, como en el mockup, y no hay verificación por voz. */
  repaso?: boolean;
}

const PAUSA_TRAS_ACIERTO = 1500;
/** Cuando la tarjeta hace sonar la palabra sola, hay que darle tiempo a terminar. */
const PAUSA_CON_SONIDO = 2600;

/**
 * Una tarjeta de práctica, con la mecánica que le corresponde según `kind`.
 * Maneja el armado, el feedback y la verificación por voz; quien la usa decide
 * qué hacer cuando termina (pasar a la siguiente, cerrar la sesión, etc.).
 */
export function Tarjeta({ card, species, onArmado, onVoz, onLista, repaso }: Props) {
  const [armado, setArmado] = useState<string[]>([]);
  const [marcaError, setMarcaError] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [acierto, setAcierto] = useState(false);
  const [esperandoVoz, setEsperandoVoz] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [instrucciones, setInstrucciones] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [equivocado, setEquivocado] = useState<string | null>(null);
  const [vozRechazada, setVozRechazada] = useState(false);
  /** Si al cerrar la hoja se vuelve a intentar la voz en vez de pasar de tarjeta. */
  const [puedeReintentar, setPuedeReintentar] = useState(false);
  const [noSeEntendio, setNoSeEntendio] = useState(false);
  /** Veces seguidas que el micrófono no captó nada. Los rechazos no cuentan acá. */
  const [vacios, setVacios] = useState(0);
  /** Falló el pedido al servidor: se avisa y se deja volver a tocar. */
  const [sinConexion, setSinConexion] = useState(false);
  /** El micrófono no se puede usar: por qué, para el adulto que está al lado. */
  const [sinMicrofono, setSinMicrofono] = useState<string | null>(null);
  const temporizador = useRef<number | null>(null);
  /** La voz del chico en su último intento, para que se escuche. */
  const [grabacion, setGrabacion] = useState<string | null>(null);
  /** Se está reproduciendo su grabación, antes de decirle si estuvo bien. */
  const [reproduciendo, setReproduciendo] = useState(false);
  const grabacionActual = useRef<string | null>(null);

  const guardarGrabacion = (url: string | null) => {
    if (grabacionActual.current) URL.revokeObjectURL(grabacionActual.current);
    grabacionActual.current = url;
    setGrabacion(url);
  };

  useEffect(() => {
    setArmado([]);
    setMarcaError(null);
    setFeedback(null);
    setAcierto(false);
    setEsperandoVoz(false);
    setEscuchando(false);
    setInstrucciones(false);
    setEquivocado(null);
    setVozRechazada(false);
    setPuedeReintentar(false);
    setNoSeEntendio(false);
    setVacios(0);
    setSinConexion(false);
    setSinMicrofono(null);
    setReproduciendo(false);
    guardarGrabacion(null);
    // La tarjeta aparece en silencio: el sonido sale cuando el chico toca el
    // boton, no solo. Que suene sin que nadie lo pida le saca el control de la
    // mano justo en el gesto que la app le esta pidiendo que haga.
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, [card.id]);

  const terminar = (pausa = PAUSA_TRAS_ACIERTO) => {
    temporizador.current = window.setTimeout(onLista, pausa);
  };

  const enviar = async (sequence: string[], sonandoUltima?: Promise<void>) => {
    setOcupado(true);
    setSinConexion(false);
    try {
      const resultado = await onArmado(sequence);
      setFeedback(resultado.feedback);
      if (resultado.correct) {
        setAcierto(true);
        setMarcaError(null);
        // Recien armada, la palabra suena entera: el chico escucha lo que acaba
        // de construir y confirma que esta bien antes de repetirla al microfono.
        const suenaSola = card.kind === 'WORD_BUILDING' || card.kind === 'SENTENCE_BUILDING';
        const pideVoz = resultado.voiceCheckRequired && Boolean(onVoz);
        if (pideVoz) setEsperandoVoz(true);
        if (suenaSola) {
          // Primero termina de sonar la letra que acaba de poner y recien
          // despues suena la palabra entera. Las dos cosas son parte del
          // mismo gesto: el sonido que agrego y lo que ese sonido completo.
          if (sonandoUltima) await sonandoUltima;
          void play(card);
        }
        if (!pideVoz) terminar(suenaSola ? PAUSA_CON_SONIDO : PAUSA_TRAS_ACIERTO);
      } else {
        // Se conserva el prefijo que ya estaba bien: marcar el casillero exacto
        // en lugar de borrar todo es la diferencia entre corregir y castigar.
        setMarcaError(resultado.matchedPrefixLength);
        setEquivocado(sequence[resultado.matchedPrefixLength] ?? null);
        setArmado(sequence.slice(0, resultado.matchedPrefixLength));
      }
    } catch {
      // Si el pedido falla (se cortó el wifi, el servidor se reinició), la
      // tarjeta NO puede quedar con la ficha puesta: el próximo toque la
      // agregaría de más y el armado ya nunca llegaría al largo esperado, que
      // es justo lo que dejaba la letra trabada sin avanzar ni abrir el micrófono.
      setArmado([]);
      setMarcaError(null);
      setSinConexion(true);
    } finally {
      setOcupado(false);
    }
  };

  const tocar = (tile: Tile) => {
    if (ocupado || acierto) return;
    const sonando = play(tile);
    setMarcaError(null);
    setEquivocado(null);
    // Por las dudas: si el armado ya estaba completo, el toque arranca de nuevo.
    const base = armado.length >= card.expectedLength ? [] : armado;
    const siguiente = [...base, tile.id];
    setArmado(siguiente);
    if (siguiente.length === card.expectedLength) void enviar(siguiente, sonando);
  };

  /** Saca una letra puesta (y las que siguen, para que el orden no se desarme). */
  const sacar = (indice: number) => {
    if (ocupado || acierto) return;
    setMarcaError(null);
    setEquivocado(null);
    setArmado((actual) => actual.slice(0, indice));
  };

  /** Tras estas veces seguidas sin captar nada, se sigue sin verificar. */
  const MAX_VACIOS = 3;

  /**
   * Manda la pronunciación al servidor. `null` es "no se pudo escuchar": el
   * chico avanza, pero el intento queda SIN VERIFICAR y no suma como acierto de
   * voz. Lo que NO se hace nunca es mandar la respuesta esperada como si la
   * hubiera dicho.
   */
  const verificar = async (voz: EntradaVoz, suVoz?: string) => {
    if (!onVoz) return;
    // El servidor evalúa mientras el chico se escucha: primero oye cómo sonó y
    // recién después sabe si estuvo bien. Escucharse es parte de aprender a
    // decirlo, no un paso de más.
    const evaluando = onVoz(voz);
    evaluando.catch(() => undefined);
    if (suVoz) {
      setReproduciendo(true);
      try {
        await reproducirGrabacion(suVoz);
        await new Promise((r) => window.setTimeout(r, 300));
      } finally {
        setReproduciendo(false);
      }
    }
    const resultado = await evaluando;

    if (resultado.heard === false) {
      setNoSeEntendio(true);
      return;
    }

    setFeedback(resultado.feedback);
    setVozRechazada(!resultado.accepted);

    if (resultado.accepted) {
      setEsperandoVoz(false);
      terminar();
      return;
    }

    // Rechazada. Si quedan intentos, la tarjeta NO pasa: se le muestra como
    // se hace el sonido y el microfono queda listo para volver a probar.
    setPuedeReintentar(resultado.canRetry);
    setEsperandoVoz(resultado.canRetry);
    setInstrucciones(true);
  };

  const hablar = async () => {
    if (!onVoz || escuchando || ocupado) return;
    setEscuchando(true);
    setNoSeEntendio(false);
    setSinConexion(false);
    setSinMicrofono(null);
    try {
      const escucha = await listen();

      // El microfono no se puede usar (sin permiso, sin https, navegador sin
      // reconocimiento). Antes esto pasaba de tarjeta al instante, sin que el
      // chico llegara a hablar. Ahora se queda: se explica por que y se ofrece
      // seguir sin decirlo, pero lo decide la persona, no la app.
      if (escucha.tipo === 'sin-microfono') {
        setSinMicrofono(escucha.motivo);
        return;
      }

      // No se entendio, pero el navegador SI puede escuchar: no es un error del
      // chico, es que el microfono no capto. Le damos otra oportunidad. Se
      // cuentan aparte de los rechazos: antes un "no te escuche" despues de un
      // "lo dijiste mal" agotaba los intentos y salteaba la tarjeta.
      if (escucha.tipo === 'vacio') {
        const seguidos = vacios + 1;
        setVacios(seguidos);
        if (seguidos < MAX_VACIOS) {
          setNoSeEntendio(true);
          return;
        }
        await verificar(null);
        return;
      }

      setVacios(0);
      guardarGrabacion(escucha.grabacion ?? null);
      await verificar(
        escucha.tipo === 'texto' ? escucha.texto : { audioBase64: escucha.audioBase64 },
        escucha.grabacion,
      );
    } catch {
      // El servidor no contesto: se queda en la misma tarjeta con el microfono listo.
      setSinConexion(true);
    } finally {
      setEscuchando(false);
    }
  };

  /** Seguir sin decirlo, cuando el microfono no anda. Queda sin verificar. */
  const seguirSinVoz = async () => {
    if (ocupado) return;
    setOcupado(true);
    setSinMicrofono(null);
    try {
      await verificar(null);
    } catch {
      setSinConexion(true);
    } finally {
      setOcupado(false);
    }
  };

  const cerrarInstrucciones = () => {
    setInstrucciones(false);
    if (puedeReintentar) {
      // Queda en la misma tarjeta, con el microfono habilitado.
      setPuedeReintentar(false);
      setVozRechazada(false);
      return;
    }
    terminar();
  };

  const vozPendiente = esperandoVoz && Boolean(onVoz);
  const conEstrellas = acierto && !vozPendiente && !vozRechazada;
  const conVoz = Boolean(card.voiceCheckRequired && onVoz);
  /** En reconocimiento con palabra, "así se dice" es el dibujo elegido y no el sonido. */
  const respuesta = card.voiceSays === 'WORD' ? card.tiles.find((t) => t.label === card.voiceLabel) : undefined;
  const claseLetra = repaso ? 'tarjeta-letra tocable teal' : 'tarjeta-letra tocable';

  if (card.kind === 'LETTER_INTRO') {
    const tile = card.tiles[0];
    const unidad = card.targetPhoneme ?? '';
    const esSilaba = unidad.length > 1;
    return (
      <>
        <button className={`${claseLetra} ${esSilaba ? 'con-silaba' : ''}`} onClick={() => (acierto ? play(card) : tocar(tile))} aria-label={esSilaba ? `Sílaba ${unidad}` : `Letra ${unidad}`}>
          {esSilaba && <span className="letra-partes">{unidad.split('').join(' + ')}</span>}
          <span className={esSilaba ? 'letra-silaba' : ''}>{unidad}</span>
        </button>
        <p className="t-instruccion">TOCÁ PARA ESCUCHAR EL SONIDO</p>
        <BloqueVoz visible={conVoz} pedido={pedidoDeVoz(card)} activo={vozPendiente} escuchando={escuchando} noSeEntendio={noSeEntendio} reproduciendo={reproduciendo} sinConexion={sinConexion} sinMicrofono={sinMicrofono} onHablar={hablar} onSeguir={seguirSinVoz} />
        <div className="espacio" />
        <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
        {instrucciones && <HojaInstrucciones species={species} letra={card.targetPhoneme ?? card.targetWord ?? ''} sonido={card.spokenAs} reintenta={puedeReintentar} onCerrar={cerrarInstrucciones} onEscucharCorrecto={() => play(card)} onEscucharme={grabacion ? () => reproducirGrabacion(grabacion) : undefined} />}
      </>
    );
  }

  if (card.kind === 'SOUND_RECOGNITION') {
    const elegido = armado[0];
    return (
      <>
        <p className="t-instruccion tarjeta-consigna">
          SELECCIONÁ LA IMAGEN
          <br />
          QUE EMPIEZA CON {card.targetPhoneme}
        </p>
        {/*
          El parlante no es un boton aparte (no se puede anidar uno dentro de
          otro): es la pista de que la tarjeta entera se toca para oir el
          sonido. Hace falta porque la tarjeta ya no suena sola al aparecer.
        */}
        <button className={`${claseLetra} con-pista`} onClick={() => play(card)} aria-label={`Escuchar el sonido ${card.targetPhoneme}`}>
          <span className="tarjeta-sonido pista" aria-hidden>
            <img src="/icons/sound-high.svg" width={24} height={24} alt="" />
          </span>
          <span className={(card.targetPhoneme ?? '').length > 1 ? 'letra-silaba' : ''}>{card.targetPhoneme}</span>
        </button>
        <div className="opciones">
          {card.tiles.map((tile) => {
            const estado = acierto && elegido === tile.id ? 'bien' : equivocado === tile.id ? 'mal' : '';
            return (
              <button key={tile.id} className={`opcion ${estado}`} onClick={() => tocar(tile)} disabled={acierto || ocupado} aria-label={tile.label}>
                <Ilustracion palabra={tile.label} />
              </button>
            );
          })}
        </div>
        <BloqueVoz visible={conVoz} pedido={pedidoDeVoz(card)} activo={vozPendiente} escuchando={escuchando} noSeEntendio={noSeEntendio} reproduciendo={reproduciendo} sinConexion={sinConexion} sinMicrofono={sinMicrofono} onHablar={hablar} onSeguir={seguirSinVoz} compacto />
        <div className="espacio" />
        {feedback && (acierto || marcaError !== null) ? (
          <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
        ) : null}
        {instrucciones && (
          <HojaInstrucciones
            species={species}
            letra={respuesta ? respuesta.label : card.targetPhoneme ?? ''}
            palabra={Boolean(respuesta)}
            sonido={card.spokenAs}
            reintenta={puedeReintentar}
            onCerrar={cerrarInstrucciones}
            onEscucharCorrecto={() => play(respuesta ?? card)}
            onEscucharme={grabacion ? () => reproducirGrabacion(grabacion) : undefined}
          />
        )}
      </>
    );
  }

  // WORD_BUILDING y SENTENCE_BUILDING comparten la mecánica: tocar en orden.
  const esOracion = card.kind === 'SENTENCE_BUILDING';
  const porId = new Map(card.tiles.map((tile) => [tile.id, tile]));
  const objetivo = card.targetWord ?? card.targetSentence ?? '';

  return (
    <>
      <div className="tarjeta-ilustracion" role="img" aria-label={objetivo}>
        <span className="tarjeta-emoji">{esOracion ? '💬' : <Ilustracion palabra={card.targetWord} grande />}</span>
        {esOracion && <span className="tarjeta-oracion">{objetivo}</span>}
        <BotonSonido onClick={() => play(card)} className="tarjeta-sonido" />
      </div>

      <div className="casilleros">
        {Array.from({ length: card.expectedLength }, (_, i) => {
          const tile = armado[i] ? porId.get(armado[i]) : undefined;
          const mal = marcaError !== null && i === marcaError;
          const clase = `casillero ${tile ? 'tocable' : 'vacio'} ${mal ? 'mal' : ''} ${esOracion ? 'palabra' : ''}`;
          return tile ? (
            <button key={i} className={clase} onClick={() => sacar(i)} disabled={acierto || ocupado} aria-label={`Sacar ${tile.label}`}>
              {tile.label}
            </button>
          ) : (
            <span key={i} className={clase} />
          );
        })}
      </div>

      <p className="t-instruccion chica">{esOracion ? 'TOCÁ LAS PALABRAS EN ORDEN' : 'TOCÁ LAS LETRAS EN ORDEN'}</p>

      <div className="fichas">
        {card.tiles.map((tile) => {
          const puesta = armado.indexOf(tile.id);
          return (
            <button
              key={tile.id}
              className={`ficha ${puesta >= 0 ? 'usada' : ''} ${esOracion ? 'palabra' : ''}`}
              onClick={() => (puesta >= 0 ? sacar(puesta) : tocar(tile))}
              disabled={acierto || ocupado}
              aria-label={puesta >= 0 ? `Sacar ${tile.label}` : tile.label}
            >
              {tile.label}
            </button>
          );
        })}
      </div>

      <BloqueVoz visible={conVoz} pedido={pedidoDeVoz(card)} activo={vozPendiente} escuchando={escuchando} noSeEntendio={noSeEntendio} reproduciendo={reproduciendo} sinConexion={sinConexion} sinMicrofono={sinMicrofono} onHablar={hablar} onSeguir={seguirSinVoz} compacto />
      <div className="espacio" />
      <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
      {instrucciones && <HojaInstrucciones species={species} letra={objetivo} palabra sonido={card.spokenAs} reintenta={puedeReintentar} onCerrar={cerrarInstrucciones} onEscucharCorrecto={() => play(card)} onEscucharme={grabacion ? () => reproducirGrabacion(grabacion) : undefined} />}
    </>
  );
}

/**
 * Qué hay que decir, en dos tiempos. Antes de resolver la tarjeta se anticipa
 * la clase ("la palabra", "el sonido") sin escribirla: mostrar CASA antes de
 * armarla, o antes de elegir el dibujo, regalaría la respuesta. Ya resuelta,
 * se muestra entera.
 */
interface PedidoVoz {
  /** "DECÍ LA PALABRA", "DECÍ EL SONIDO DE LA". */
  que: string;
  /** Lo que hay que decir, escrito: "CASA", "A". Vacío en las oraciones, que ya están armadas en pantalla. */
  cual: string;
}

function pedidoDeVoz(card: Card): PedidoVoz {
  const cual = card.voiceLabel ?? '';
  switch (card.voiceSays) {
    case 'SOUND':
      return { que: 'DECÍ EL SONIDO DE LA', cual };
    case 'SYLLABLE':
      return { que: 'DECÍ EL SONIDO', cual };
    case 'WORD':
      return { que: 'DECÍ LA PALABRA', cual };
    case 'SENTENCE':
      return { que: 'DECÍ LA ORACIÓN ENTERA', cual: '' };
    default:
      return { que: 'DECILO VOS', cual: '' };
  }
}

interface BloqueVozProps {
  visible: boolean;
  pedido: PedidoVoz;
  activo: boolean;
  escuchando: boolean;
  compacto?: boolean;
  /** Escuchó pero no entendió nada. No es un error del chico: se le pide de nuevo. */
  noSeEntendio?: boolean;
  sinConexion?: boolean;
  /** Suena la grabación del chico. */
  reproduciendo?: boolean;
  /** Por qué no se puede usar el micrófono; si viene, se ofrece seguir sin decirlo. */
  sinMicrofono?: string | null;
  onHablar: () => void;
  onSeguir: () => void;
}

/** El micrófono y qué hay que decir. Se ve apagado hasta que el armado esté bien. */
function BloqueVoz({ visible, pedido, activo, escuchando, compacto, noSeEntendio, reproduciendo, sinConexion, sinMicrofono, onHablar, onSeguir }: BloqueVozProps) {
  if (sinConexion) return <p className="aviso">NO SE PUDO CONECTAR. TOCÁ DE NUEVO.</p>;
  if (!visible) return null;
  if (sinMicrofono) {
    return (
      <div className="sin-microfono">
        <p className="aviso">{sinMicrofono}</p>
        <div className="sin-microfono-botones">
          <button className="btn-secundario" onClick={onHablar}>PROBAR DE NUEVO</button>
          <button className="btn-secundario" onClick={onSeguir}>SEGUIR SIN DECIRLO</button>
        </div>
      </div>
    );
  }
  return (
    <div className={`bloque-voz ${compacto ? 'compacto' : ''} ${activo ? 'activo' : ''}`}>
      <button className={`btn-mic ${escuchando ? 'escuchando' : ''}`} onClick={onHablar} disabled={!activo || escuchando || reproduciendo} aria-label={`${pedido.que} ${pedido.cual}`.trim()}>
        <img src="/icons/microphone.svg" width={24} height={24} alt="" />
      </button>
      <p className="t-instruccion">
        {reproduciendo ? (
          'ASÍ SONASTE...'
        ) : escuchando ? (
          'TE ESCUCHO...'
        ) : noSeEntendio ? (
          'NO TE ESCUCHE, PROBA DE NUEVO'
        ) : activo ? (
          <>
            AHORA {pedido.que}
            {pedido.cual && <strong className="pedido-voz"> {pedido.cual}</strong>}
          </>
        ) : (
          `DESPUÉS ${pedido.que.replace(/ DE LA$/, '')}`
        )}
      </p>
    </div>
  );
}

interface HojaProps {
  species: PetSpecies;
  /** La letra, sílaba o palabra de la tarjeta. */
  letra: string;
  /** Es una palabra u oración: se muestra cómo empieza, no cada sonido. */
  palabra?: boolean;
  sonido: string;
  /** Al cerrar se vuelve a intentar en la misma tarjeta. */
  reintenta?: boolean;
  onCerrar: () => void;
  onEscucharCorrecto: () => void;
  /** Vuelve a reproducir lo que dijo el chico, si se pudo grabar. */
  onEscucharme?: () => void;
}

/** La primera sílaba: los sonidos hasta la primera vocal, inclusive. */
function primeraSilaba<T extends { clave: string }>(sonidos: T[]): T[] {
  const vocal = sonidos.findIndex((s) => 'aeiou'.includes(s.clave));
  return vocal < 0 ? sonidos.slice(0, 1) : sonidos.slice(0, vocal + 1);
}

/**
 * 05 — La hoja naranja: cómo se pone la boca para decirlo bien. Una boca por
 * sonido, en orden (la M y después la A para MA), con qué hacer en palabras.
 * Al abrirse suena cómo se dice, para comparar con lo que acaba de escuchar de
 * sí mismo.
 */
export function HojaInstrucciones({ species, letra, palabra, sonido, reintenta, onCerrar, onEscucharCorrecto, onEscucharme }: HojaProps) {
  const texto = palabra ? letra.split(/\s+/)[0] ?? '' : letra;
  const todos = sonidosDe(texto);
  const bocas = palabra ? primeraSilaba(todos) : todos.slice(0, 3);

  useEffect(() => {
    const t = window.setTimeout(onEscucharCorrecto, 450);
    return () => window.clearTimeout(t);
    // Solo al abrir la hoja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hoja" role="dialog" aria-label="Cómo se hace el sonido">
      <button className="btn-volver" onClick={onCerrar} aria-label="Cerrar">
        <img src="/icons/xmark.svg" width={24} height={24} alt="" />
      </button>
      <div className="hoja-cabecera">
        <Mascota species={species} size={56} />
        <p>
          {palabra ? (
            <>
              ASÍ EMPIEZA
              <br />
              <strong>{letra.toUpperCase()}</strong>
            </>
          ) : (
            <>
              MIRÁ MI BOCA Y DECÍ
              <br />
              <strong>{sonido.toUpperCase()}</strong>
            </>
          )}
        </p>
      </div>
      <div className="hoja-bocas">
        {bocas.map((s, i) => (
          <div className="hoja-boca" key={`${s.clave}-${i}`}>
            {i > 0 && <span className="hoja-flecha" aria-hidden>→</span>}
            <figure>
              <Boca clave={s.clave} size={bocas.length > 2 ? 110 : 160} />
              <figcaption>
                <strong>{s.escrito}</strong>
                {consejoDe(s.clave)}
              </figcaption>
            </figure>
          </div>
        ))}
      </div>
      <div className="hoja-escuchar">
        <button className="btn-secundario" onClick={onEscucharCorrecto}>
          <img src="/icons/sound-high.svg" width={20} height={20} alt="" /> ASÍ SE DICE
        </button>
        {onEscucharme && (
          <button className="btn-secundario" onClick={onEscucharme}>
            <img src="/icons/microphone.svg" width={20} height={20} alt="" style={{ filter: 'invert(1)' }} /> ASÍ SONASTE
          </button>
        )}
      </div>
      {/* El boton dice exactamente lo que va a pasar al tocarlo: si quedan
          intentos se vuelve a la misma tarjeta, y si no, se sigue. */}
      <button className="btn-hoja" onClick={onCerrar}>
        {reintenta ? 'PROBAR DE NUEVO' : 'SEGUIR'}
      </button>
    </div>
  );
}
