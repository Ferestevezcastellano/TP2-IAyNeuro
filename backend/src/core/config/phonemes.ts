/**
 * Como suena cada letra cuando se la pronuncia sola: el sonido que hace la boca,
 * no el nombre de la letra. La M se presenta como "mmm" y nunca como "eme",
 * porque el chico arma palabras juntando sonidos, y "eme" + "a" no da "ma".
 *
 * `spokenAs` es el texto que un sintetizador de voz lee para producir el sonido,
 * y tambien lo que se espera oir en la verificacion por voz. Las oclusivas
 * (C, T, P...) no se pueden estirar: se dicen cortas y sin vocal de apoyo.
 */
export interface PhonemeSpec {
  letter: string;
  audioKey: string;
  spokenAs: string;
}

const PHONEMES: Record<string, string> = {
  A: 'aaa',
  E: 'eee',
  I: 'iii',
  O: 'ooo',
  U: 'uuu',
  M: 'mmm',
  S: 'sss',
  L: 'lll',
  N: 'nnn',
  C: 'k',
  T: 't',
  F: 'fff',
  B: 'b',
  D: 'd',
  P: 'p',
  G: 'g',
  R: 'rrr',
  RR: 'rrr',
  QU: 'k',
  CH: 'ch',
  LL: 'sh',
  V: 'b',
  Z: 'sss',
  J: 'jjj',
  K: 'k',
  Y: 'sh',
  Ñ: 'ñ',
  X: 'ks',
  W: 'u',
};

export function phonemeOf(letter: string): PhonemeSpec {
  const key = letter.toUpperCase();
  const spokenAs = PHONEMES[key];
  if (!spokenAs) {
    throw new Error(`No hay sonido definido para la letra ${key}.`);
  }
  return { letter: key, audioKey: `audio/fonema/${key.toLowerCase()}`, spokenAs };
}

/**
 * Forma hablada de una unidad cualquiera: una letra suelta suena como su
 * fonema; una silaba o palabra se lee entera, en minuscula para que el
 * sintetizador no la deletree como sigla.
 */
export function spokenFormOf(unit: string): string {
  const key = unit.toUpperCase();
  return PHONEMES[key] ?? key.toLowerCase();
}

/** Las cinco vocales, en minúscula. Una sola definición para todo lo que analiza voz. */
export const VOCALES: readonly string[] = ['a', 'e', 'i', 'o', 'u'];
