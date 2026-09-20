/** Una sesion de nivel cuenta para la progresion; una de repaso no. */
export enum SessionMode {
  LEVEL = 'LEVEL',
  REVIEW = 'REVIEW',
}

export enum SessionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  /** Quedo abierta y el chico arranco otra. No suma al progreso. */
  ABANDONED = 'ABANDONED',
}

/** Cada toque de "listo" sobre una tarjeta. Se guardan todos, tambien los fallidos. */
export interface CardAttempt {
  cardId: string;
  sequence: string[];
  correct: boolean;
  /** Indice del primer boton equivocado, para que el frontend marque el casillero. */
  firstWrongIndex: number | null;
  attemptNumber: number;
  elapsedMs?: number;
  at: Date;
}

/** Resultado de la verificacion por voz de una tarjeta. */
export interface VoiceCheck {
  cardId: string;
  transcript: string;
  expected: string;
  confidence: number;
  similarity: number;
  accepted: boolean;
  provider: string;
  at: Date;
}

/** Lo que se pago al cerrar la sesion. */
export interface SessionOutcome {
  accuracy: number;
  masteryAverage: number;
  mastered: boolean;
  /** Primera vez que este nivel llega a dominio. */
  masteredNow: boolean;
  starsAwarded: number;
  accessoryUnlockedId: string | null;
  nextLevelOrder: number | null;
  nextLevelUnlocked: boolean;
}

export interface PracticeSession {
  id: string;
  studentId: string;
  levelId: string;
  levelOrder: number;
  mode: SessionMode;
  status: SessionStatus;
  cardQueue: string[];
  currentCardIndex: number;
  attempts: CardAttempt[];
  voiceChecks: VoiceCheck[];
  startedAt: Date;
  completedAt?: Date;
  outcome?: SessionOutcome;
}
