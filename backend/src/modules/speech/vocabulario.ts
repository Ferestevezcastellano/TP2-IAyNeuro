import { VOCALES } from '../../core/config/phonemes';
import { Card } from '../../core/domain';

/**
 * Vocabulario que compite con lo esperado cuando Vosk reconoce con gramática.
 *
 * Con una gramática que solo trae lo esperado, Vosk lo "escucha" diga lo que
 * diga el chico: una oración cambiada a propósito salía igual a la esperada.
 * Con las palabras de todos los niveles y un puñado de palabras comunes de
 * primer grado, lo que se dijo en lugar de lo esperado tiene a qué parecerse, y
 * sale tal cual ("la nena sale" en vez de "la luna sale").
 */

const CONSONANTES = ['m', 'p', 's', 'l', 'n', 'd', 'f', 't', 'b', 'c', 'r', 'g', 'j', 'v', 'z', 'y', 'ch'];

/**
 * Las vocales y todas las sílabas directas. Para un sonido o una sílaba son
 * los únicos competidores que hacen falta: un "me" dicho en lugar de "ma" sale
 * "me". En una palabra permiten que salga partida ("me sa") si el chico la
 * dice despacio, en vez de forzarla a otra palabra entera.
 */
export const SILABAS = [...VOCALES, ...CONSONANTES.flatMap((c) => VOCALES.map((v) => c + v))];

/**
 * Palabras frecuentes que un chico puede decir en lugar de la pedida. Sin
 * plurales ni variantes de las del contenido: "lunas" compitiendo con "luna"
 * solo agrega confusiones del reconocedor, no errores del chico.
 */
const COMUNES = [
  'el', 'la', 'los', 'las', 'un', 'una', 'mi', 'tu', 'su', 'es', 'está', 'en', 'con', 'y', 'de', 'que', 'no',
  'sí', 'me', 'se', 'lo', 'al', 'yo', 'va', 'come', 'toma', 'mira', 'ama', 'tiene', 'mamá', 'papá', 'nene',
  'perro', 'gato', 'pato', 'pelota', 'agua', 'pan', 'leche', 'flor', 'rosa', 'papa', 'pala', 'dedo', 'foca',
  'vaca', 'pie', 'ala', 'loma', 'sola', 'solo', 'sale', 'usa', 'suma', 'ilumina', 'mona', 'noche', 'día', 'sopa',
];

/**
 * Palabras del contenido que el modelo chico de Vosk no trae. Se reemplazan en
 * la gramática por partes que sí conoce y que dichas juntas suenan igual; el
 * juez compara uniendo palabras seguidas, así que "tu can" vale por "tucán".
 * IGLÚ nunca se pide decir: solo se saca, para que Vosk no avise en cada pedido.
 */
const ALIAS: Record<string, string[]> = {
  tucán: ['tu', 'can'],
  iglú: [],
};

/** Una palabra, o las partes que la reemplazan si el modelo no la conoce. */
export function enGramatica(palabra: string): string[] {
  return ALIAS[palabra] ?? [palabra];
}

function palabrasDe(texto: string): string[] {
  return texto.toLowerCase().split(/\s+/).filter(Boolean);
}

function palabrasDelContenido(cards: Card[]): string[] {
  const palabras: string[] = [];
  for (const card of cards) {
    if (card.targetWord) palabras.push(...palabrasDe(card.targetWord));
    if (card.targetSentence) palabras.push(...palabrasDe(card.targetSentence));
    for (const tile of card.tiles) if (tile.label.length > 2) palabras.push(...palabrasDe(tile.label));
  }
  return palabras;
}

/**
 * Todas las palabras que compiten con la esperada, sin repetir y ya en la forma
 * que Vosk conoce. Recibe las tarjetas en vez de leer los datos semilla, para
 * que el vocabulario siga al contenido que tenga cargado el repositorio.
 */
export function vocabularioDe(cards: Card[]): string[] {
  return [...new Set([...palabrasDelContenido(cards), ...COMUNES].flatMap(enGramatica))];
}
