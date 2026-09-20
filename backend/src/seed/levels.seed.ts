import { Card, Level, LevelKind } from '../core/domain';
import { buildSentenceCard, buildSoundCard, buildWordCard } from './card-builder';

/**
 * Niveles 1 a 6 de `docs/05_niveles.md`, que son el Capitulo 2 completo del
 * cuadernillo "Yo amo aprender - Lengua, 1er grado" (CABA, 2026) mas el primer
 * nivel del Capitulo 4.
 *
 * Dos reglas del cuadernillo que el contenido respeta y conviene no romper al
 * agregar niveles: ninguna palabra usa una letra que el chico todavia no vio
 * (regla de acumulacion), y cada nivel entra en una sesion de 10-15 minutos.
 */

export interface SeededLevel {
  level: Level;
  cards: Card[];
}

const L1 = 'level-01-a-e';
const L2 = 'level-02-i-o-u';
const L3 = 'level-03-m-s';
const L4 = 'level-04-l-n';
const L5 = 'level-05-consolidacion';
const L6 = 'level-06-c-t';

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
    },
    cards: [
      buildSoundCard({ levelId: L1, position: 1, phoneme: 'A', answer: 'ÁRBOL', options: ['ELEFANTE'], voiceCheck: true }),
      buildSoundCard({ levelId: L1, position: 2, phoneme: 'A', answer: 'ARAÑA', options: ['ESCALERA', 'ELEFANTE'], voiceCheck: false }),
      buildSoundCard({ levelId: L1, position: 3, phoneme: 'E', answer: 'ELEFANTE', options: ['AVIÓN'], voiceCheck: true }),
      buildSoundCard({ levelId: L1, position: 4, phoneme: 'E', answer: 'ESTRELLA', options: ['ARAÑA', 'ÁRBOL'], voiceCheck: false }),
    ],
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
    },
    cards: [
      buildSoundCard({ levelId: L2, position: 1, phoneme: 'I', answer: 'IGLÚ', options: ['OSO'], voiceCheck: true }),
      buildSoundCard({ levelId: L2, position: 2, phoneme: 'O', answer: 'OSO', options: ['UVA', 'IMÁN'], voiceCheck: true }),
      buildSoundCard({ levelId: L2, position: 3, phoneme: 'U', answer: 'UVA', options: ['IMÁN', 'ÁRBOL'], voiceCheck: true }),
      buildSoundCard({ levelId: L2, position: 4, phoneme: 'E', answer: 'ELEFANTE', options: ['IGLÚ', 'OSO', 'UVA'], prompt: '¿CUÁL EMPIEZA CON E? ESCUCHAMOS LAS CINCO VOCALES.', voiceCheck: false }),
      buildSoundCard({ levelId: L2, position: 5, phoneme: 'A', answer: 'ARAÑA', options: ['IGLÚ', 'UVA', 'OSO'], prompt: '¿CUÁL EMPIEZA CON A? ESCUCHAMOS LAS CINCO VOCALES.', voiceCheck: false }),
    ],
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
    },
    cards: [
      buildSoundCard({ levelId: L3, position: 1, phoneme: 'MA', answer: 'MASA', options: ['OSO'], prompt: '¿CUÁL EMPIEZA CON MA?', voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 2, word: 'MESA', distractors: ['I', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 3, word: 'MASA', distractors: ['U'], voiceCheck: false }),
      buildWordCard({ levelId: L3, position: 4, word: 'OSO', distractors: ['M', 'E'], voiceCheck: true }),
      buildWordCard({ levelId: L3, position: 5, word: 'SUMA', distractors: ['I'], voiceCheck: false }),
    ],
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
    },
    cards: [
      buildWordCard({ levelId: L4, position: 1, word: 'LUNA', distractors: ['S', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L4, position: 2, word: 'SOL', distractors: ['M', 'I'], voiceCheck: true }),
      buildWordCard({ levelId: L4, position: 3, word: 'MANO', distractors: ['E'], voiceCheck: false }),
      buildWordCard({ levelId: L4, position: 4, word: 'MONO', distractors: ['L', 'A'], voiceCheck: false }),
      buildSentenceCard({ levelId: L4, position: 5, sentence: 'LA LUNA SALE', distractors: ['SOL'], voiceCheck: true }),
    ],
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
    },
    cards: [
      buildWordCard({ levelId: L5, position: 1, word: 'SALA', distractors: ['N', 'O'], voiceCheck: false }),
      buildWordCard({ levelId: L5, position: 2, word: 'LIMA', distractors: ['S', 'U'], voiceCheck: true }),
      buildSoundCard({ levelId: L5, position: 3, phoneme: 'LU', answer: 'LUNA', options: ['MANO', 'SOL'], prompt: '¿CUÁL EMPIEZA CON LU?', voiceCheck: false }),
      buildSentenceCard({ levelId: L5, position: 4, sentence: 'EL SOL ILUMINA LA SALA', distractors: ['LUNA'], voiceCheck: true }),
      buildSentenceCard({ levelId: L5, position: 5, sentence: 'LA LUNA SALE SOLA', distractors: ['SOL', 'MANO'], voiceCheck: true }),
    ],
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
    },
    cards: [
      buildWordCard({ levelId: L6, position: 1, word: 'CASA', distractors: ['T', 'O'], voiceCheck: true }),
      buildWordCard({ levelId: L6, position: 2, word: 'CAMA', distractors: ['N'], voiceCheck: false }),
      buildWordCard({ levelId: L6, position: 3, word: 'TELA', distractors: ['C', 'I'], voiceCheck: false }),
      buildWordCard({ levelId: L6, position: 4, word: 'MOTO', distractors: ['C', 'A'], voiceCheck: true }),
      buildWordCard({ levelId: L6, position: 5, word: 'TOMATE', distractors: ['S'], voiceCheck: false }),
      buildSentenceCard({ levelId: L6, position: 6, sentence: 'EL TUCÁN ESTÁ EN LA CASA', distractors: ['MOTO'], voiceCheck: true }),
    ],
  },
];
