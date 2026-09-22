import { useEffect, useRef, useState } from 'react';
import type { Card, Feedback, PetSpecies, Tile } from '../api';
import { canListen, listen, play } from '../audio';
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
  feedback: Feedback;
}

interface Props {
  card: Card;
  species: PetSpecies;
  onArmado: (sequence: string[]) => Promise<ResultadoArmado>;
  onVoz?: (transcript: string) => Promise<ResultadoVoz>;
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
  const temporizador = useRef<number | null>(null);

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

  const enviar = async (sequence: string[]) => {
    setOcupado(true);
    try {
      const resultado = await onArmado(sequence);
      setFeedback(resultado.feedback);
      if (resultado.correct) {
        setAcierto(true);
        setMarcaError(null);
        // Recien armada, la palabra suena entera: el chico escucha lo que acaba
        // de construir y confirma que esta bien antes de repetirla al microfono.
        const suenaSola = card.kind === 'WORD_BUILDING' || card.kind === 'SENTENCE_BUILDING';
        if (suenaSola) play(card);
        if (resultado.voiceCheckRequired && onVoz) {
          setEsperandoVoz(true);
        } else {
          terminar(suenaSola ? PAUSA_CON_SONIDO : PAUSA_TRAS_ACIERTO);
        }
      } else {
        // Se conserva el prefijo que ya estaba bien: marcar el casillero exacto
        // en lugar de borrar todo es la diferencia entre corregir y castigar.
        setMarcaError(resultado.matchedPrefixLength);
        setEquivocado(sequence[resultado.matchedPrefixLength] ?? null);
        setArmado(sequence.slice(0, resultado.matchedPrefixLength));
      }
    } finally {
      setOcupado(false);
    }
  };

  const tocar = (tile: Tile) => {
    if (ocupado || acierto) return;
    play(tile);
    setMarcaError(null);
    setEquivocado(null);
    const siguiente = [...armado, tile.id];
    setArmado(siguiente);
    if (siguiente.length === card.expectedLength) void enviar(siguiente);
  };

  /** Saca una letra puesta (y las que siguen, para que el orden no se desarme). */
  const sacar = (indice: number) => {
    if (ocupado || acierto) return;
    setMarcaError(null);
    setEquivocado(null);
    setArmado((actual) => actual.slice(0, indice));
  };

  const hablar = async () => {
    if (!onVoz || escuchando || ocupado) return;
    setEscuchando(true);
    try {
      // Sin reconocimiento en el navegador, la demo sigue igual: se da por dicho.
      const escuchado = canListen ? await listen() : card.voiceTarget ?? '';
      const transcript = escuchado || card.voiceTarget || '';
      const resultado = await onVoz(transcript);
      setFeedback(resultado.feedback);
      setEsperandoVoz(false);
      setVozRechazada(!resultado.accepted);
      if (!resultado.accepted) setInstrucciones(true);
      else terminar();
    } finally {
      setEscuchando(false);
    }
  };

  const cerrarInstrucciones = () => {
    setInstrucciones(false);
    terminar();
  };

  const vozPendiente = esperandoVoz && Boolean(onVoz);
  const conEstrellas = acierto && !vozPendiente && !vozRechazada;
  const conVoz = Boolean(card.voiceCheckRequired && onVoz);
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
        <BloqueVoz visible={conVoz} activo={vozPendiente} escuchando={escuchando} onHablar={hablar} />
        <div className="espacio" />
        <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
        {instrucciones && <HojaInstrucciones species={species} letra={card.targetWord ?? card.targetPhoneme ?? ''} sonido={card.spokenAs} onCerrar={cerrarInstrucciones} />}
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
        <BloqueVoz visible={conVoz} activo={vozPendiente} escuchando={escuchando} onHablar={hablar} compacto />
        <div className="espacio" />
        {feedback && (acierto || marcaError !== null) ? (
          <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
        ) : null}
        {instrucciones && <HojaInstrucciones species={species} letra={card.targetPhoneme ?? ''} sonido={card.spokenAs} onCerrar={cerrarInstrucciones} />}
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

      <BloqueVoz visible={conVoz} activo={vozPendiente} escuchando={escuchando} onHablar={hablar} compacto />
      <div className="espacio" />
      <CajaFeedback species={species} feedback={feedback} estrellas={conEstrellas} />
      {instrucciones && <HojaInstrucciones species={species} letra={objetivo} sonido={card.spokenAs} onCerrar={cerrarInstrucciones} />}
    </>
  );
}

interface BloqueVozProps {
  visible: boolean;
  activo: boolean;
  escuchando: boolean;
  compacto?: boolean;
  onHablar: () => void;
}

/** El micrófono y "AHORA DECILO VOS". Se ve apagado hasta que el armado esté bien. */
function BloqueVoz({ visible, activo, escuchando, compacto, onHablar }: BloqueVozProps) {
  if (!visible) return null;
  return (
    <div className={`bloque-voz ${compacto ? 'compacto' : ''} ${activo ? 'activo' : ''}`}>
      <button className={`btn-mic ${escuchando ? 'escuchando' : ''}`} onClick={onHablar} disabled={!activo || escuchando} aria-label="Decilo vos">
        <img src="/icons/microphone.svg" width={24} height={24} alt="" />
      </button>
      <p className="t-instruccion">{escuchando ? 'TE ESCUCHO...' : 'AHORA DECILO VOS'}</p>
    </div>
  );
}

interface HojaProps {
  species: PetSpecies;
  letra: string;
  sonido: string;
  onCerrar: () => void;
}

/** 05 — La hoja naranja con la mascota mostrando cómo se hace el sonido. */
function HojaInstrucciones({ species, letra, sonido, onCerrar }: HojaProps) {
  return (
    <div className="hoja" role="dialog" aria-label="Cómo se hace el sonido">
      <button className="btn-volver" onClick={onCerrar} aria-label="Cerrar">
        <img src="/icons/xmark.svg" width={24} height={24} alt="" />
      </button>
      {species === 'LION' ? (
        <img className="hoja-imagen" src="/ilustraciones/instrucciones-lion.jpg" alt="El león hace el sonido" />
      ) : (
        <div className="hoja-mascota">
          <Mascota species={species} size={120} />
          <p>
            MIRÁ MI BOCA Y DECÍ
            <br />
            <strong style={{ fontSize: 28 }}>{sonido.toUpperCase()}</strong>
            <br />
            COMO EN {letra}
          </p>
        </div>
      )}
    </div>
  );
}
