/** Mecanica de la tarjeta. Todas comparten el gesto: tocar botones en orden. */
export enum CardKind {
  /** Se presenta una letra nueva: se la toca, suena su fonema y el chico lo repite. */
  LETTER_INTRO = 'LETTER_INTRO',
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
  /** Como suena el boton al tocarlo: "mmm" para la M, nunca "eme". */
  spokenAs?: string;
}

/**
 * Una tarjeta del nivel. El backend no sirve binarios: imageKey y audioKey son
 * claves simbolicas que el frontend resuelve contra su propio banco de assets.
 */
export interface Card {
  id: string;
  levelId: string;
  /** Orden pedagogico dentro del banco del nivel. La sesion respeta este orden. */
  position: number;
  /** Bolsa de la que se sortea la tarjeta al armar una sesion. Ver `Level.sessionDraw`. */
  group: string;
  kind: CardKind;
  /** Consigna en mayuscula, como toda la interfaz de primer grado. */
  prompt: string;
  targetPhoneme?: string;
  targetWord?: string;
  targetSentence?: string;
  imageKey?: string;
  audioKey: string;
  /** Como suena el audio principal de la tarjeta, para un sintetizador de voz. */
  spokenAs: string;
  tiles: CardTile[];
  /** Ids de tiles en el orden esperado. */
  solution: string[];
  /** Que tiene que decir el chico en la verificacion por voz. */
  voiceTarget?: string;
}
