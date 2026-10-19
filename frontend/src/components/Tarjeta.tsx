import { useEffect, useRef, useState } from 'react';
import type { Card, EntradaVoz, Feedback, PetSpecies, Tile } from '../api';
import { play } from '../sonido';
import { BloqueVoz, pedidoDeVoz } from './BloqueVoz';
import { HojaInstrucciones } from './HojaInstrucciones';
import { Ilustracion } from './Ilustracion';
import { BotonSonido, CajaFeedback } from './comunes';
import { type ResultadoVoz, useVerificacionVoz } from './useVerificacionVoz';
import './Tarjeta.css';

export type { ResultadoVoz };

export interface ResultadoArmado {
  correct: boolean;
  matchedPrefixLength: number;
  feedback: Feedback;
  voiceCheckRequired: boolean;
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
 * Maneja el armado y el feedback; la verificación por voz la conduce
 * `useVerificacionVoz`. Quien la usa decide qué hacer cuando termina (pasar a
 * la siguiente, cerrar la sesión, etc.).
 */
export function Tarjeta({ card, species, onArmado, onVoz, onLista, repaso }: Props) {
  const [armado, setArmado] = useState<string[]>([]);
  const [marcaError, setMarcaError] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [acierto, setAcierto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [equivocado, setEquivocado] = useState<string | null>(null);
  const temporizador = useRef<number | null>(null);

  const terminar = (pausa = PAUSA_TRAS_ACIERTO) => {
    temporizador.current = window.setTimeout(onLista, pausa);
  };

  const voz = useVerificacionVoz({ cardId: card.id, onVoz, ocupado, setOcupado, setFeedback, terminar: () => terminar() });

  useEffect(() => {
    setArmado([]);
    setMarcaError(null);
    setFeedback(null);
    setAcierto(false);
    setEquivocado(null);
    // La tarjeta aparece en silencio: el sonido sale cuando el chico toca el
    // boton, no solo. Que suene sin que nadie lo pida le saca el control de la
    // mano justo en el gesto que la app le esta pidiendo que haga.
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, [card.id]);

  const enviar = async (sequence: string[], sonandoUltima?: Promise<void>) => {
    setOcupado(true);
    voz.setSinConexion(false);
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
        if (pideVoz) voz.pedirVoz();
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
      voz.setSinConexion(true);
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

  const vozPendiente = voz.bloque.activo;
  const conEstrellas = acierto && !vozPendiente && !voz.vozRechazada;
  const conVoz = Boolean(card.voiceCheckRequired && onVoz);
  /** En reconocimiento con palabra, "así se dice" es el dibujo elegido y no el sonido. */
  const respuesta = card.voiceSays === 'WORD' ? card.tiles.find((t) => t.label === card.voiceLabel) : undefined;
  const claseLetra = repaso ? 'tarjeta-letra tocable teal' : 'tarjeta-letra tocable';

  /** El micrófono y qué hay que decir; en las tarjetas con fichas va compacto. */
  const bloqueVoz = (compacto?: boolean) => <BloqueVoz visible={conVoz} pedido={pedidoDeVoz(card)} {...voz.bloque} compacto={compacto} />;

  /** La hoja de cómo se dice, cuando la voz fue rechazada. */
  const hoja = (pedido: { letra: string; palabra?: boolean; onEscucharCorrecto: () => void }) =>
    voz.instrucciones && (
      <HojaInstrucciones
        species={species}
        sonido={card.spokenAs}
        reintenta={voz.puedeReintentar}
        onCerrar={voz.cerrarInstrucciones}
        onEscucharme={voz.escucharme}
        {...pedido}
      />
    );

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
        {bloqueVoz()}
        <div className="espacio" />
        <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
        {hoja({ letra: card.targetPhoneme ?? card.targetWord ?? '', onEscucharCorrecto: () => play(card) })}
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
        {bloqueVoz(true)}
        <div className="espacio" />
        {feedback && (acierto || marcaError !== null) ? (
          <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
        ) : null}
        {hoja({
          letra: respuesta ? respuesta.label : card.targetPhoneme ?? '',
          palabra: Boolean(respuesta),
          onEscucharCorrecto: () => play(respuesta ?? card),
        })}
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

      {bloqueVoz(true)}
      <div className="espacio" />
      <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
      {hoja({ letra: objetivo, palabra: true, onEscucharCorrecto: () => play(card) })}
    </>
  );
}
