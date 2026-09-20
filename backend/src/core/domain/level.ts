/** Que tipo de trabajo propone el nivel, segun la estructura del cuadernillo. */
export enum LevelKind {
  /** Sonido aislado: reconocer y pronunciar, sin armar palabras (niveles 1 y 2). */
  PHONEME_ISOLATION = 'PHONEME_ISOLATION',
  /** Combinacion consonante + vocal, silabas y palabras. */
  WORD_BUILDING = 'WORD_BUILDING',
  /** Sin letras nuevas: solo consolidar lo ya visto con practica intercalada. */
  CONSOLIDATION = 'CONSOLIDATION',
}

/** Un nivel es una sesion de 10-15 min. Ver docs/05_niveles.md. */
export interface Level {
  id: string;
  order: number;
  title: string;
  block: string;
  goal: string;
  newLetters: string[];
  cumulativeLetters: string[];
  kind: LevelKind;
  /**
   * Falso en los niveles puramente ortograficos donde no hay nada que pronunciar
   * (la H del nivel 19). El frontend no muestra el boton de microfono.
   */
  voiceCheckEnabled: boolean;
  accessoryId: string;
}
