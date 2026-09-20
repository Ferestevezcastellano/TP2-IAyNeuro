import { Card, CardKind, CardTile, TileKind } from '../core/domain';

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
 * Es a proposito: el mismo nivel devuelve siempre los botones en el mismo orden,
 * asi el contrato es estable para el frontend y la demo es reproducible. Si el
 * orden fuera aleatorio por request, dos capturas de la misma tarjeta no
 * coincidirian y ningun test de integracion podria fijar una expectativa.
 */
function stableShuffle<T>(items: T[], seed: string): T[] {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000;
  }

  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    hash = (hash * 1103515245 + 12345) % 2147483648;
    const j = hash % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Separa una palabra en unidades tocables, respetando los digrafos. */
function splitGraphemes(word: string): string[] {
  return word.toUpperCase().match(/CH|LL|RR|QU|./g) ?? [];
}

export interface WordCardInput {
  levelId: string;
  position: number;
  word: string;
  /** Letras del acumulado que se agregan como botones de mas. */
  distractors: string[];
  voiceCheck: boolean;
}

/** Tarjeta de armar palabra: imagen arriba, botones por letra abajo. */
export function buildWordCard(input: WordCardInput): Card {
  const letters = splitGraphemes(input.word);
  const id = `${input.levelId}-w-${input.word.toLowerCase()}`;

  const solutionTiles: CardTile[] = letters.map((letter, index) => ({
    id: `${id}-t${index}`,
    label: letter,
    kind: TileKind.LETTER,
    audioKey: assetKey('audio/fonema', letter),
  }));

  const distractorTiles: CardTile[] = input.distractors.map((letter, index) => ({
    id: `${id}-d${index}`,
    label: letter.toUpperCase(),
    kind: TileKind.LETTER,
    audioKey: assetKey('audio/fonema', letter),
  }));

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    kind: CardKind.WORD_BUILDING,
    prompt: 'ARMÁ LA PALABRA TOCANDO LOS SONIDOS EN ORDEN.',
    targetWord: input.word.toUpperCase(),
    imageKey: assetKey('img/palabra', input.word),
    audioKey: assetKey('audio/palabra', input.word),
    tiles: stableShuffle([...solutionTiles, ...distractorTiles], id),
    solution: solutionTiles.map((tile) => tile.id),
    voiceTarget: input.voiceCheck ? input.word.toUpperCase() : undefined,
  };
}

export interface SoundCardInput {
  levelId: string;
  position: number;
  /** Fonema o silaba que se escucha. */
  phoneme: string;
  /** Palabra ilustrada correcta. */
  answer: string;
  /** Palabras ilustradas incorrectas. */
  options: string[];
  prompt?: string;
  voiceCheck: boolean;
}

/** Tarjeta de reconocimiento: suena un fonema, se elige el dibujo que lo lleva. */
export function buildSoundCard(input: SoundCardInput): Card {
  const id = `${input.levelId}-s-${input.phoneme.toLowerCase()}-${input.answer.toLowerCase()}`;

  const answerTile: CardTile = {
    id: `${id}-ok`,
    label: input.answer.toUpperCase(),
    kind: TileKind.IMAGE,
    imageKey: assetKey('img/palabra', input.answer),
    audioKey: assetKey('audio/palabra', input.answer),
  };

  const optionTiles: CardTile[] = input.options.map((option, index) => ({
    id: `${id}-o${index}`,
    label: option.toUpperCase(),
    kind: TileKind.IMAGE,
    imageKey: assetKey('img/palabra', option),
    audioKey: assetKey('audio/palabra', option),
  }));

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    kind: CardKind.SOUND_RECOGNITION,
    prompt: input.prompt ?? `¿CUÁL EMPIEZA CON ${input.phoneme.toUpperCase()}?`,
    targetPhoneme: input.phoneme.toUpperCase(),
    audioKey: assetKey('audio/fonema', input.phoneme),
    tiles: stableShuffle([answerTile, ...optionTiles], id),
    solution: [answerTile.id],
    voiceTarget: input.voiceCheck ? input.phoneme.toUpperCase() : undefined,
  };
}

export interface SentenceCardInput {
  levelId: string;
  position: number;
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
  }));

  const distractorTiles: CardTile[] = input.distractors.map((word, index) => ({
    id: `${id}-d${index}`,
    label: word.toUpperCase(),
    kind: TileKind.WORD,
    audioKey: assetKey('audio/palabra', word),
  }));

  return {
    id,
    levelId: input.levelId,
    position: input.position,
    kind: CardKind.SENTENCE_BUILDING,
    prompt: 'ARMÁ LA ORACIÓN TOCANDO LAS PALABRAS EN ORDEN.',
    targetSentence: input.sentence.toUpperCase(),
    imageKey: assetKey('img/oracion', words.join('-')),
    audioKey: assetKey('audio/oracion', words.join('-')),
    tiles: stableShuffle([...solutionTiles, ...distractorTiles], id),
    solution: solutionTiles.map((tile) => tile.id),
    voiceTarget: input.voiceCheck ? input.sentence.toUpperCase() : undefined,
  };
}
