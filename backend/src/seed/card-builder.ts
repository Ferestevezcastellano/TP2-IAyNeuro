import { phonemeOf, spokenFormOf } from '../core/config/phonemes';
import { Card, CardKind, CardTile, TileKind, VoiceSays } from '../core/domain';

/** Clave simbolica del asset. El backend no sirve binarios. */
function assetKey(prefix: string, value: string): string {
  return `${prefix}/${value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

/**
 * Baraja de forma determinista, a partir del texto de la palabra.
 *
 * Es a proposito: la misma tarjeta devuelve siempre los botones en el mismo
 * orden, asi el contrato es estable para el frontend y la demo es reproducible.
 * La variedad entre sesiones viene de sortear tarjetas distintas del banco, no
 * de reordenar los botones de una misma tarjeta.
 *
 * El generador es splitmix32 y no un LCG simple: en un LCG modulo 2^31 los bits
 * bajos casi no varian (el ultimo alterna en cada paso), y como el barajado usa
 * `% (i + 1)`, justamente esos bits decidian la posicion. Con tres opciones eso
 * dejaba la respuesta correcta siempre en el medio o a la derecha, nunca
 * primera, y un chico puede aprender ese patron en vez de escuchar el sonido.
 */
function stableShuffle<T>(items: T[], seed: string): T[] {
  // FNV-1a sobre el texto de la semilla.
  let estado = 0x811c9dc5;
  for (const char of seed) {
    estado = Math.imul(estado ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }

  const siguiente = (): number => {
    estado = (estado + 0x9e3779b9) >>> 0;
    let z = estado;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return (z ^ (z >>> 15)) >>> 0;
  };

  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = siguiente() % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Los campos de la verificacion por voz: que se compara, que clase de cosa es
 * y como se escribe en pantalla. Van juntos o no va ninguno.
 */
function voice(enabled: boolean, target: string, says: VoiceSays, label: string): Pick<Card, 'voiceTarget' | 'voiceSays' | 'voiceLabel'> {
  return enabled ? { voiceTarget: target, voiceSays: says, voiceLabel: label.toUpperCase() } : {};
}

/** Separa una palabra en unidades tocables, respetando los digrafos. */
function splitGraphemes(word: string): string[] {
  return word.toUpperCase().match(/CH|LL|RR|QU|./g) ?? [];
}

/** Boton de letra: al tocarlo suena el fonema, no el nombre de la letra. */
function letterTile(id: string, letter: string): CardTile {
  const phoneme = phonemeOf(letter);
  return {
    id,
    label: phoneme.letter,
    kind: TileKind.LETTER,
    audioKey: phoneme.audioKey,
    spokenAs: phoneme.spokenAs,
  };
}

export interface LetterIntroInput {
  levelId: string;
  position: number;
  group: string;
  letter: string;
  /** Palabra ilustrada que empieza con la letra, como ejemplo. */
  example: string;
  voiceCheck: boolean;
}

/**
 * Presentacion de una letra nueva: se ve grande, se la toca, suena su fonema
 * estirado y el chico lo repite. Es el primer paso de la estructura del
 * cuadernillo (sonido nuevo aislado) y va antes de cualquier silaba o palabra.
 */
export function buildLetterIntroCard(input: LetterIntroInput): Card {
  const phoneme = phonemeOf(input.letter);
  const id = `${input.levelId}-l-${phoneme.letter.toLowerCase()}`;
  const tile = letterTile(`${id}-t0`, phoneme.letter);

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    group: input.group,
    kind: CardKind.LETTER_INTRO,
    prompt: `ESTA ES LA ${phoneme.letter}. TOCALA Y ESCUCHÁ CÓMO SUENA.`,
    targetPhoneme: phoneme.letter,
    targetWord: input.example.toUpperCase(),
    imageKey: assetKey('img/palabra', input.example),
    audioKey: phoneme.audioKey,
    spokenAs: phoneme.spokenAs,
    tiles: [tile],
    solution: [tile.id],
    ...voice(input.voiceCheck, phoneme.spokenAs, VoiceSays.SOUND, phoneme.letter),
  };
}

export interface SyllableIntroInput {
  levelId: string;
  position: number;
  group: string;
  /** Consonante + vocal, por ejemplo "MA". */
  syllable: string;
  voiceCheck: boolean;
}

/**
 * Presentacion de una silaba: la primera combinacion consonante + vocal. Misma
 * mecanica que la letra nueva (se toca, suena, se repite), con la grabacion de
 * la silaba dicha de corrido (`audio/fonema/ma`), no la consonante y la vocal
 * una atras de la otra.
 */
export function buildSyllableIntroCard(input: SyllableIntroInput): Card {
  const syllable = input.syllable.toUpperCase();
  const [consonant, vowel] = splitGraphemes(syllable);
  const id = `${input.levelId}-l-${syllable.toLowerCase()}`;
  const spokenAs = spokenFormOf(syllable);
  const tile: CardTile = {
    id: `${id}-t0`,
    label: syllable,
    kind: TileKind.SYLLABLE,
    audioKey: assetKey('audio/fonema', syllable),
    spokenAs,
  };

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    group: input.group,
    kind: CardKind.LETTER_INTRO,
    prompt: `JUNTAMOS ${consonant} Y ${vowel}: ${syllable}. TOCALA Y ESCUCHÁ CÓMO SUENA.`,
    targetPhoneme: syllable,
    audioKey: assetKey('audio/fonema', syllable),
    spokenAs,
    tiles: [tile],
    solution: [tile.id],
    ...voice(input.voiceCheck, spokenAs, VoiceSays.SYLLABLE, syllable),
  };
}

export interface WordCardInput {
  levelId: string;
  position: number;
  group: string;
  word: string;
  /** Letras del acumulado que se agregan como botones de mas. */
  distractors: string[];
  voiceCheck: boolean;
}

/** Tarjeta de armar palabra: imagen arriba, botones por letra abajo. */
export function buildWordCard(input: WordCardInput): Card {
  const letters = splitGraphemes(input.word);
  const id = `${input.levelId}-w-${input.word.toLowerCase()}`;

  const solutionTiles = letters.map((letter, index) => letterTile(`${id}-t${index}`, letter));
  const distractorTiles = input.distractors.map((letter, index) => letterTile(`${id}-d${index}`, letter));

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    group: input.group,
    kind: CardKind.WORD_BUILDING,
    prompt: 'ARMÁ LA PALABRA TOCANDO LOS SONIDOS EN ORDEN.',
    targetWord: input.word.toUpperCase(),
    imageKey: assetKey('img/palabra', input.word),
    audioKey: assetKey('audio/palabra', input.word),
    spokenAs: spokenFormOf(input.word),
    tiles: stableShuffle([...solutionTiles, ...distractorTiles], id),
    solution: solutionTiles.map((tile) => tile.id),
    ...voice(input.voiceCheck, input.word.toUpperCase(), VoiceSays.WORD, input.word),
  };
}

export interface SoundCardInput {
  levelId: string;
  position: number;
  group: string;
  /** Fonema o silaba que se escucha. */
  phoneme: string;
  /** Palabra ilustrada correcta. */
  answer: string;
  /** Palabras ilustradas incorrectas. */
  options: string[];
  prompt?: string;
  voiceCheck: boolean;
  /**
   * Que se dice despues de elegir el dibujo: el sonido que se escucho o la
   * palabra del dibujo. En los niveles de vocales se pide el sonido; a partir
   * de las consonantes, la palabra entera.
   */
  voiceSays: VoiceSays.SOUND | VoiceSays.WORD;
}

/** Tarjeta de reconocimiento: suena un fonema, se elige el dibujo que lo lleva. */
export function buildSoundCard(input: SoundCardInput): Card {
  const phoneme = input.phoneme.toUpperCase();
  const id = `${input.levelId}-s-${input.group.toLowerCase()}-${phoneme.toLowerCase()}-${input.answer.toLowerCase()}`;

  const answerTile: CardTile = {
    id: `${id}-ok`,
    label: input.answer.toUpperCase(),
    kind: TileKind.IMAGE,
    imageKey: assetKey('img/palabra', input.answer),
    audioKey: assetKey('audio/palabra', input.answer),
    spokenAs: spokenFormOf(input.answer),
  };

  const optionTiles: CardTile[] = input.options.map((option, index) => ({
    id: `${id}-o${index}`,
    label: option.toUpperCase(),
    kind: TileKind.IMAGE,
    imageKey: assetKey('img/palabra', option),
    audioKey: assetKey('audio/palabra', option),
    spokenAs: spokenFormOf(option),
  }));

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    group: input.group,
    kind: CardKind.SOUND_RECOGNITION,
    prompt: input.prompt ?? `¿CUÁL EMPIEZA CON ${phoneme}?`,
    targetPhoneme: phoneme,
    audioKey: assetKey('audio/fonema', phoneme),
    spokenAs: spokenFormOf(phoneme),
    tiles: stableShuffle([answerTile, ...optionTiles], id),
    solution: [answerTile.id],
    ...(input.voiceSays === VoiceSays.WORD
      ? voice(input.voiceCheck, input.answer.toUpperCase(), VoiceSays.WORD, input.answer)
      : voice(input.voiceCheck, spokenFormOf(phoneme), phoneme.length > 1 ? VoiceSays.SYLLABLE : VoiceSays.SOUND, phoneme)),
  };
}

export interface SentenceCardInput {
  levelId: string;
  position: number;
  group: string;
  sentence: string;
  /** Palabras del acumulado que se agregan como botones de mas. */
  distractors: string[];
  voiceCheck: boolean;
}

/** Tarjeta de armar oracion: los botones son palabras enteras. */
export function buildSentenceCard(input: SentenceCardInput): Card {
  const words = input.sentence.toUpperCase().split(/\s+/);
  const id = `${input.levelId}-f-${words.join('-').toLowerCase()}`;

  const solutionTiles: CardTile[] = words.map((word, index) => ({
    id: `${id}-t${index}`,
    label: word,
    kind: TileKind.WORD,
    audioKey: assetKey('audio/palabra', word),
    spokenAs: spokenFormOf(word),
  }));

  const distractorTiles: CardTile[] = input.distractors.map((word, index) => ({
    id: `${id}-d${index}`,
    label: word.toUpperCase(),
    kind: TileKind.WORD,
    audioKey: assetKey('audio/palabra', word),
    spokenAs: spokenFormOf(word),
  }));

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    group: input.group,
    kind: CardKind.SENTENCE_BUILDING,
    prompt: 'ARMÁ LA ORACIÓN TOCANDO LAS PALABRAS EN ORDEN.',
    targetSentence: input.sentence.toUpperCase(),
    imageKey: assetKey('img/oracion', words.join('-')),
    audioKey: assetKey('audio/oracion', words.join('-')),
    spokenAs: input.sentence.toLowerCase(),
    tiles: stableShuffle([...solutionTiles, ...distractorTiles], id),
    solution: solutionTiles.map((tile) => tile.id),
    ...voice(input.voiceCheck, input.sentence.toUpperCase(), VoiceSays.SENTENCE, input.sentence),
  };
}
