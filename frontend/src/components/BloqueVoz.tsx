import type { Card } from '../api';

/**
 * Qué hay que decir, en dos tiempos. Antes de resolver la tarjeta se anticipa
 * la clase ("la palabra", "el sonido") sin escribirla: mostrar CASA antes de
 * armarla, o antes de elegir el dibujo, regalaría la respuesta. Ya resuelta,
 * se muestra entera.
 */
export interface PedidoVoz {
  /** "DECÍ LA PALABRA", "DECÍ LA LETRA", "DECÍ EL SONIDO DE LA". */
  que: string;
  /** Lo que hay que decir, escrito: "CASA", "A". Vacío en las oraciones, que ya están armadas en pantalla. */
  cual: string;
}

function esVocal(letra: string): boolean {
  return /^[AEIOUÁÉÍÓÚ]$/.test(letra);
}

/**
 * Qué se dice cuando la tarjeta no lo trae: un backend anterior a `voiceSays`
 * no lo manda, y sin esto la pantalla quedaba en "DECILO VOS" a secas. Se
 * deduce del tipo de tarjeta, igual que lo verificaba ese backend.
 */
function deducirPedido(card: Card): Pick<Card, 'voiceSays' | 'voiceLabel'> {
  const fonema = card.targetPhoneme ?? '';
  switch (card.kind) {
    case 'LETTER_INTRO':
    case 'SOUND_RECOGNITION':
      return { voiceSays: fonema.length > 1 ? 'SYLLABLE' : 'SOUND', voiceLabel: fonema };
    case 'WORD_BUILDING':
      return { voiceSays: 'WORD', voiceLabel: card.targetWord ?? '' };
    case 'SENTENCE_BUILDING':
      return { voiceSays: 'SENTENCE', voiceLabel: '' };
    default:
      return {};
  }
}

export function pedidoDeVoz(card: Card): PedidoVoz {
  const { voiceSays, voiceLabel } = card.voiceSays ? card : deducirPedido(card);
  const cual = voiceLabel ?? '';
  switch (voiceSays) {
    case 'SOUND':
      // En una vocal el nombre y el sonido coinciden: se pide "la letra", que
      // es como lo dice la maestra. En una consonante se pide el sonido
      // ("mmm"), porque el nombre ("eme") no es lo que se practica.
      return { que: esVocal(cual) ? 'DECÍ LA LETRA' : 'DECÍ EL SONIDO DE LA', cual };
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
export function BloqueVoz({ visible, pedido, activo, escuchando, compacto, noSeEntendio, reproduciendo, sinConexion, sinMicrofono, onHablar, onSeguir }: BloqueVozProps) {
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
