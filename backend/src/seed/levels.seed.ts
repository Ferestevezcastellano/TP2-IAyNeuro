import { Card, CardKind, CardTile, Level, LevelKind, VoiceSays } from '../core/domain';
import { buildLetterIntroCard, buildSentenceCard, buildSoundCard, buildSyllableIntroCard, buildWordCard } from './card-builder';

/**
 * Niveles 1 a 6 de `docs/05_niveles.md`, que son el Capitulo 2 completo del
 * cuadernillo "Yo amo aprender - Lengua, 1er grado" (CABA, 2026) mas el primer
 * nivel del Capitulo 4.
 *
 * Cada nivel trae un banco mas grande que una sesion y una receta
 * (`sessionDraw`) que dice cuantas tarjetas de cada bolsa se sortean. Dominar
 * exige varias sesiones, y si fueran todas iguales el chico memorizaria las
 * respuestas en vez de los sonidos.
 *
 * Dos reglas del cuadernillo que el contenido respeta y conviene no romper al
 * agregar niveles: ninguna palabra que se arma usa una letra que el chico
 * todavia no vio (regla de acumulacion), y cada sesion entra en 10-15 minutos.
 * Las bolsas siguen la estructura interna del cuadernillo: LETRA (sonido nuevo
 * aislado) -> SILABA -> PALABRA -> ORACION.
 */

export interface SeededLevel {
  level: Level;
  cards: Card[];
}

export const GROUP = {
  LETTER: 'LETRA',
  SYLLABLE: 'SILABA',
  WORD: 'PALABRA',
  SENTENCE: 'ORACION',
  VOWELS: 'VOCALES',
} as const;

const L1 = 'level-01-a-e';
const L2 = 'level-02-i-o-u';
const L3 = 'level-03-m-s';
const L4 = 'level-04-l-n';
const L5 = 'level-05-consolidacion';
const L6 = 'level-06-c-t';

/**
 * Numera las tarjetas en el orden en que se declaran, que es el orden
 * pedagogico, y reparte el casillero de la respuesta correcta en las tarjetas
 * de reconocimiento.
 *
 * Lo segundo es una regla de contenido, no un detalle tecnico: si la correcta
 * cae siempre en el mismo casillero, un chico de primer grado aprende la
 * posicion y deja de escuchar el sonido, que es justo lo que la tarjeta mide.
 * Barajar no alcanza, porque el azar admite rachas largas en el mismo lugar;
 * por eso la respuesta va rotando de casillero a lo largo del nivel. La sesion
 * despues sortea un subconjunto de estas tarjetas, asi que el chico tampoco ve
 * la rotacion como una ronda previsible.
 */
function numbered(cards: Card[]): Card[] {
  let reconocimiento = 0;

  return cards.map((card, index) => {
    const numerada = { ...card, position: index + 1 };
    if (card.kind !== CardKind.SOUND_RECOGNITION) return numerada;

    const slot = reconocimiento % card.tiles.length;
    reconocimiento += 1;
    return { ...numerada, tiles: moveAnswerToSlot(card.tiles, card.solution[0], slot) };
  });
}

/** Deja la ficha correcta en el casillero pedido, sin tocar el orden del resto. */
function moveAnswerToSlot(tiles: CardTile[], answerId: string, slot: number): CardTile[] {
  const resto = tiles.filter((tile) => tile.id !== answerId);
  const answer = tiles.find((tile) => tile.id === answerId);
  if (!answer) return tiles;

  resto.splice(slot, 0, answer);
  return resto;
}

/**
 * Una tarjeta de reconocimiento por cada respuesta, con dos dibujos de mas
 * tomados en rueda de la lista de distractores. La verificacion por voz va en
 * una de cada dos, para que la sesion no se haga larga.
 *
 * `says` es lo que se pide decir despues de elegir: en los niveles de vocales,
 * el sonido; desde las consonantes, la palabra del dibujo.
 */
function soundCards(
  levelId: string,
  group: string,
  phoneme: string,
  answers: string[],
  distractors: string[],
  says: VoiceSays.SOUND | VoiceSays.WORD,
  prompt?: string,
): Card[] {
  return answers.map((answer, index) =>
    buildSoundCard({
      levelId,
      position: 0,
      group,
      phoneme,
      answer,
      options: [distractors[index % distractors.length], distractors[(index + 1) % distractors.length]],
      prompt,
      voiceCheck: index % 2 === 0,
      voiceSays: says,
    }),
  );
}

/** Las cinco silabas de una consonante, en el orden de las vocales. */
function syllableCards(levelId: string, consonant: string): Card[] {
  return ['A', 'E', 'I', 'O', 'U'].map((vowel) =>
    buildSyllableIntroCard({ levelId, position: 0, group: GROUP.SYLLABLE, syllable: `${consonant}${vowel}`, voiceCheck: true }),
  );
}

const A_WORDS = ['ÁRBOL', 'ARAÑA', 'AVIÓN', 'ABEJA', 'ANILLO', 'AUTO'];
const E_WORDS = ['ELEFANTE', 'ESCALERA', 'ESTRELLA', 'ESPEJO', 'ERIZO', 'ENCHUFE'];
const I_WORDS = ['IGLÚ', 'IMÁN', 'ISLA', 'IGLESIA'];
const O_WORDS = ['OSO', 'OJO', 'OVEJA', 'OREJA'];
const U_WORDS = ['UVA', 'UÑA', 'UNICORNIO', 'UNO'];

export const SEEDED_LEVELS: SeededLevel[] = [
  {
    level: {
      id: L1,
      order: 1,
      title: 'A, E',
      block: 'Capítulo 2 — Sonidos y letras bajo la lupa 1',
      goal: 'RECONOCER Y DECIR LOS SONIDOS /A/ Y /E/.',
      newLetters: ['A', 'E'],
      cumulativeLetters: ['A', 'E'],
      kind: LevelKind.PHONEME_ISOLATION,
      voiceCheckEnabled: true,
      accessoryId: 'acc-gorro',
      sessionDraw: [
        { group: GROUP.LETTER, count: 2 },
        { group: 'A', count: 2 },
        { group: 'E', count: 2 },
      ],
    },
    cards: numbered([
      buildLetterIntroCard({ levelId: L1, position: 0, group: GROUP.LETTER, letter: 'A', example: 'ÁRBOL', voiceCheck: true }),
      ...soundCards(L1, 'A', 'A', A_WORDS, E_WORDS, VoiceSays.SOUND),
      buildLetterIntroCard({ levelId: L1, position: 0, group: GROUP.LETTER, letter: 'E', example: 'ELEFANTE', voiceCheck: true }),
      ...soundCards(L1, 'E', 'E', E_WORDS, A_WORDS, VoiceSays.SOUND),
    ]),
  },
  {
    level: {
      id: L2,
      order: 2,
      title: 'I, O, U',
      block: 'Capítulo 2 — Sonidos y letras bajo la lupa 1',
      goal: 'COMPLETAR LAS CINCO VOCALES Y DISTINGUIRLAS ENTRE SÍ.',
      newLetters: ['I', 'O', 'U'],
      cumulativeLetters: ['A', 'E', 'I', 'O', 'U'],
      kind: LevelKind.PHONEME_ISOLATION,
      voiceCheckEnabled: true,
      accessoryId: 'acc-anteojos',
      sessionDraw: [
        { group: GROUP.LETTER, count: 3 },
        { group: 'I', count: 1 },
        { group: 'O', count: 1 },
        { group: 'U', count: 1 },
        { group: GROUP.VOWELS, count: 2 },
      ],
    },
    cards: numbered([
      buildLetterIntroCard({ levelId: L2, position: 0, group: GROUP.LETTER, letter: 'I', example: 'IGLÚ', voiceCheck: true }),
      ...soundCards(L2, 'I', 'I', I_WORDS, [...O_WORDS, ...U_WORDS], VoiceSays.SOUND),
      buildLetterIntroCard({ levelId: L2, position: 0, group: GROUP.LETTER, letter: 'O', example: 'OSO', voiceCheck: true }),
      ...soundCards(L2, 'O', 'O', O_WORDS, [...U_WORDS, ...I_WORDS], VoiceSays.SOUND),
      buildLetterIntroCard({ levelId: L2, position: 0, group: GROUP.LETTER, letter: 'U', example: 'UVA', voiceCheck: true }),
      ...soundCards(L2, 'U', 'U', U_WORDS, [...I_WORDS, ...O_WORDS], VoiceSays.SOUND),
      // Repaso mezclado de las cinco vocales, como la seccion "Las vocales" del cuadernillo.
      buildSoundCard({ levelId: L2, position: 0, group: GROUP.VOWELS, phoneme: 'E', answer: 'ELEFANTE', options: ['IGLÚ', 'OSO', 'UVA'], prompt: '¿CUÁL EMPIEZA CON E? ESCUCHAMOS LAS CINCO VOCALES.', voiceCheck: false, voiceSays: VoiceSays.SOUND }),
      buildSoundCard({ levelId: L2, position: 0, group: GROUP.VOWELS, phoneme: 'A', answer: 'ARAÑA', options: ['IGLÚ', 'UVA', 'OSO'], prompt: '¿CUÁL EMPIEZA CON A? ESCUCHAMOS LAS CINCO VOCALES.', voiceCheck: false, voiceSays: VoiceSays.SOUND }),
      buildSoundCard({ levelId: L2, position: 0, group: GROUP.VOWELS, phoneme: 'I', answer: 'ISLA', options: ['ÁRBOL', 'ESTRELLA', 'OSO'], prompt: '¿CUÁL EMPIEZA CON I? ESCUCHAMOS LAS CINCO VOCALES.', voiceCheck: false, voiceSays: VoiceSays.SOUND }),
      buildSoundCard({ levelId: L2, position: 0, group: GROUP.VOWELS, phoneme: 'O', answer: 'OVEJA', options: ['ABEJA', 'IMÁN', 'UVA'], prompt: '¿CUÁL EMPIEZA CON O? ESCUCHAMOS LAS CINCO VOCALES.', voiceCheck: false, voiceSays: VoiceSays.SOUND }),
      buildSoundCard({ levelId: L2, position: 0, group: GROUP.VOWELS, phoneme: 'U', answer: 'UNO', options: ['ERIZO', 'OJO', 'ANILLO'], prompt: '¿CUÁL EMPIEZA CON U? ESCUCHAMOS LAS CINCO VOCALES.', voiceCheck: false, voiceSays: VoiceSays.SOUND }),
    ]),
  },
  {
    level: {
      id: L3,
      order: 3,
      title: 'M, S',
      block: 'Capítulo 2 — Sonidos y letras bajo la lupa 1',
      goal: 'JUNTAR CONSONANTE Y VOCAL PARA ARMAR SÍLABAS Y PALABRAS.',
      newLetters: ['M', 'S'],
      cumulativeLetters: ['A', 'E', 'I', 'O', 'U', 'M', 'S'],
      kind: LevelKind.WORD_BUILDING,
      voiceCheckEnabled: true,
      accessoryId: 'acc-bufanda',
      // Todo lo de la M (letra, silabas y palabras de M con vocales), y recien
      // despues todo lo de la S, igual que el nivel 4 con L y N. Las palabras
      // de la M no pueden llevar S: todavia no esta ensenada.
      sessionDraw: [
        { group: GROUP.LETTER, count: 2 },
        { group: GROUP.SYLLABLE, count: 10 },
        { group: 'PALABRA-M', count: 2 },
        { group: 'PALABRA-S', count: 2 },
      ],
    },
    cards: numbered([
      buildLetterIntroCard({ levelId: L3, position: 0, group: GROUP.LETTER, letter: 'M', example: 'MESA', voiceCheck: true }),
      ...syllableCards(L3, 'M'),
      // Palabras de M con vocales. Ni la palabra ni sus botones de mas pueden
      // traer S: en este punto del nivel el chico todavia no la vio.
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-M', word: 'MIMO', distractors: ['A', 'E'], voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-M', word: 'MOMIA', distractors: ['E', 'U'], voiceCheck: false }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-M', word: 'MIAU', distractors: ['E', 'O'], voiceCheck: true }),
      buildLetterIntroCard({ levelId: L3, position: 0, group: GROUP.LETTER, letter: 'S', example: 'SOL', voiceCheck: true }),
      ...syllableCards(L3, 'S'),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-S', word: 'MESA', distractors: ['I', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-S', word: 'MASA', distractors: ['U'], voiceCheck: false }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-S', word: 'MISA', distractors: ['E', 'U'], voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-S', word: 'SUMA', distractors: ['I'], voiceCheck: false }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-S', word: 'OSO', distractors: ['M', 'E'], voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-S', word: 'MUSA', distractors: ['E', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 0, group: 'PALABRA-S', word: 'ASA', distractors: ['M', 'U'], voiceCheck: false }),
    ]),
  },
  {
    level: {
      id: L4,
      order: 4,
      title: 'L, N',
      block: 'Capítulo 2 — Sonidos y letras bajo la lupa 1',
      goal: 'ARMAR LA PRIMERA ORACIÓN CON LO QUE YA SABEMOS.',
      newLetters: ['L', 'N'],
      cumulativeLetters: ['A', 'E', 'I', 'O', 'U', 'M', 'S', 'L', 'N'],
      kind: LevelKind.WORD_BUILDING,
      voiceCheckEnabled: true,
      accessoryId: 'acc-capa',
      // Todo lo de la L (letra, silabas, palabras con L, M y S), despues todo lo de la N, y la primera oracion.
      sessionDraw: [
        { group: GROUP.LETTER, count: 2 },
        { group: GROUP.SYLLABLE, count: 10 },
        { group: 'PALABRA-L', count: 2 },
        { group: 'PALABRA-N', count: 2 },
        { group: GROUP.SENTENCE, count: 1 },
      ],
    },
    cards: numbered([
      buildLetterIntroCard({ levelId: L4, position: 0, group: GROUP.LETTER, letter: 'L', example: 'LUNA', voiceCheck: true }),
      ...syllableCards(L4, 'L'),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-L', word: 'SOL', distractors: ['M', 'I'], voiceCheck: true }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-L', word: 'SALA', distractors: ['M', 'E'], voiceCheck: true }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-L', word: 'LIMA', distractors: ['S', 'O'], voiceCheck: false }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-L', word: 'MIEL', distractors: ['S', 'A'], voiceCheck: true }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-L', word: 'ISLA', distractors: ['M', 'E'], voiceCheck: false }),
      buildLetterIntroCard({ levelId: L4, position: 0, group: GROUP.LETTER, letter: 'N', example: 'NENA', voiceCheck: true }),
      ...syllableCards(L4, 'N'),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-N', word: 'LUNA', distractors: ['S', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-N', word: 'MANO', distractors: ['E'], voiceCheck: false }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-N', word: 'MONO', distractors: ['L', 'A'], voiceCheck: false }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-N', word: 'LANA', distractors: ['M', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-N', word: 'NENA', distractors: ['L', 'U'], voiceCheck: false }),
      buildWordCard({ levelId: L4, position: 0, group: 'PALABRA-N', word: 'UNO', distractors: ['M', 'A'], voiceCheck: true }),
      buildSentenceCard({ levelId: L4, position: 0, group: GROUP.SENTENCE, sentence: 'LA LUNA SALE', distractors: ['SOL'], voiceCheck: true }),
      buildSentenceCard({ levelId: L4, position: 0, group: GROUP.SENTENCE, sentence: 'EL SOL ILUMINA', distractors: ['LUNA'], voiceCheck: true }),
    ]),
  },
  {
    level: {
      id: L5,
      order: 5,
      title: 'Consolidación',
      block: 'Capítulo 2 — Empezar a leer y escribir palabras',
      goal: 'LEER Y ESCRIBIR PALABRAS Y ORACIONES SIN AYUDA. SIN LETRAS NUEVAS.',
      newLetters: [],
      cumulativeLetters: ['A', 'E', 'I', 'O', 'U', 'M', 'S', 'L', 'N'],
      kind: LevelKind.CONSOLIDATION,
      voiceCheckEnabled: true,
      accessoryId: 'acc-medalla',
      // Sin letras nuevas: solo palabras y oraciones con todo lo visto, mezcladas.
      sessionDraw: [
        { group: GROUP.WORD, count: 4 },
        { group: GROUP.SENTENCE, count: 2 },
      ],
    },
    cards: numbered([
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'SALA', distractors: ['N', 'O'], voiceCheck: false }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'LIMA', distractors: ['S', 'U'], voiceCheck: true }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'LANA', distractors: ['M', 'I'], voiceCheck: false }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'MESA', distractors: ['L', 'U'], voiceCheck: true }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'MONO', distractors: ['S', 'E'], voiceCheck: false }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'SUMA', distractors: ['N', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'MANO', distractors: ['L', 'I'], voiceCheck: false }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'LUNA', distractors: ['M', 'E'], voiceCheck: true }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'SOL', distractors: ['N', 'A'], voiceCheck: false }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'MIEL', distractors: ['N', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'NENA', distractors: ['S', 'I'], voiceCheck: false }),
      buildWordCard({ levelId: L5, position: 0, group: GROUP.WORD, word: 'ISLA', distractors: ['N', 'E'], voiceCheck: true }),
      buildSentenceCard({ levelId: L5, position: 0, group: GROUP.SENTENCE, sentence: 'EL SOL ILUMINA LA SALA', distractors: ['LUNA'], voiceCheck: true }),
      buildSentenceCard({ levelId: L5, position: 0, group: GROUP.SENTENCE, sentence: 'LA LUNA SALE SOLA', distractors: ['SOL', 'MANO'], voiceCheck: true }),
      buildSentenceCard({ levelId: L5, position: 0, group: GROUP.SENTENCE, sentence: 'LA NENA SUMA SOLA', distractors: ['MONO'], voiceCheck: true }),
      buildSentenceCard({ levelId: L5, position: 0, group: GROUP.SENTENCE, sentence: 'EL MONO USA LA LANA', distractors: ['SOL'], voiceCheck: true }),
    ]),
  },
  {
    level: {
      id: L6,
      order: 6,
      title: 'C (ca, co, cu), T',
      block: 'Capítulo 4 — Sonidos y letras bajo la lupa 2',
      goal: 'SUMAR LA C DURA Y LA T AL BANCO DE PALABRAS.',
      newLetters: ['C', 'T'],
      cumulativeLetters: ['A', 'E', 'I', 'O', 'U', 'M', 'S', 'L', 'N', 'C', 'T'],
      kind: LevelKind.WORD_BUILDING,
      voiceCheckEnabled: true,
      accessoryId: 'acc-mochila',
      sessionDraw: [
        { group: GROUP.LETTER, count: 2 },
        { group: GROUP.SYLLABLE, count: 1 },
        { group: GROUP.WORD, count: 3 },
        { group: GROUP.SENTENCE, count: 1 },
      ],
    },
    cards: numbered([
      buildLetterIntroCard({ levelId: L6, position: 0, group: GROUP.LETTER, letter: 'C', example: 'CASA', voiceCheck: true }),
      buildLetterIntroCard({ levelId: L6, position: 0, group: GROUP.LETTER, letter: 'T', example: 'TOMATE', voiceCheck: true }),
      ...soundCards(L6, GROUP.SYLLABLE, 'CA', ['CASA'], ['TELA', 'MOTO'], VoiceSays.WORD),
      ...soundCards(L6, GROUP.SYLLABLE, 'CU', ['CUNA'], ['TOMATE', 'SOL'], VoiceSays.WORD),
      ...soundCards(L6, GROUP.SYLLABLE, 'TO', ['TOMATE'], ['CASA', 'LUNA'], VoiceSays.WORD),
      ...soundCards(L6, GROUP.SYLLABLE, 'TE', ['TELA'], ['CAMA', 'MONO'], VoiceSays.WORD),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'CASA', distractors: ['T', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'CAMA', distractors: ['N'], voiceCheck: false }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'TELA', distractors: ['C', 'I'], voiceCheck: false }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'MOTO', distractors: ['C', 'A'], voiceCheck: true }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'TOMATE', distractors: ['S'], voiceCheck: false }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'LATA', distractors: ['C', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'COLA', distractors: ['T', 'E'], voiceCheck: false }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'CUNA', distractors: ['M', 'T'], voiceCheck: true }),
      buildWordCard({ levelId: L6, position: 0, group: GROUP.WORD, word: 'CANASTA', distractors: ['L'], voiceCheck: false }),
      buildSentenceCard({ levelId: L6, position: 0, group: GROUP.SENTENCE, sentence: 'EL TUCÁN ESTÁ EN LA CASA', distractors: ['MOTO'], voiceCheck: true }),
      buildSentenceCard({ levelId: L6, position: 0, group: GROUP.SENTENCE, sentence: 'LA CAMA ESTÁ EN LA CASA', distractors: ['LATA'], voiceCheck: true }),
    ]),
  },
];
