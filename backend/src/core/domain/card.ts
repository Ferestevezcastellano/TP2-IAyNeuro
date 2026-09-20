/** Mecanica de la tarjeta. Las tres comparten el gesto: tocar botones en orden. */
export enum CardKind {
  /** Suena un fonema y el chico elige la imagen que empieza con ese sonido. */
  SOUND_RECOGNITION = 'SOUND_RECOGNITION',
  /** Imagen de una palabra y botones por letra para armarla. */
  WORD_BUILDING = 'WORD_BUILDING',
  /** Botones por palabra para armar una oracion. */
  SENTENCE_BUILDING = 'SENTENCE_BUILDING',
}

export enum TileKind {
  LETTER = 'LETTER',
  SYLLABLE = 'SYLLABLE',
  WORD = 'WORD',
  IMAGE = 'IMAGE',
}

/** Boton tocable de la tarjeta. */
export interface CardTile {
  id: string;
  label: string;
  kind: TileKind;
  audioKey?: string;
  imageKey?: string;
}

/**
 * Una tarjeta del nivel. El backend no sirve binarios: imageKey y audioKey son
 * claves simbolicas que el frontend resuelve contra su propio banco de assets.
 */
export interface Card {
  id: string;
  levelId: string;
  position: number;
  kind: CardKind;
  /** Consigna en mayuscula, como toda la interfaz de primer grado. */
  prompt: string;
  targetPhoneme?: string;
  targetWord?: string;
  targetSentence?: string;
  imageKey?: string;
  audioKey: string;
  tiles: CardTile[];
  /** Ids de tiles en el orden esperado. */
  solution: string[];
  /** Que tiene que decir el chico en la verificacion por voz. */
  voiceTarget?: string;
}
