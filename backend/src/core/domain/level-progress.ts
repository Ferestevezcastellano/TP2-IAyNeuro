/**
 * Progreso de un alumno en un nivel. El dominio no se mide por una sesion
 * aislada sino por el promedio de las ultimas N (ver MasteryService).
 */
export interface LevelProgress {
  studentId: string;
  levelId: string;
  levelOrder: number;
  /** Ventana movil: las ultimas N precisiones de sesion, mas vieja primero. */
  recentAccuracies: number[];
  sessionsCompleted: number;
  masteryAverage: number;
  bestAccuracy: number;
  mastered: boolean;
  masteredAt?: Date;
  starsAwarded: number;
  lastSessionAt?: Date;
}

/** Estado de un nivel para un alumno concreto, tal como lo dibuja la pantalla inicial. */
export enum LevelStatus {
  /** La docente todavia no libero este nivel para el curso. */
  LOCKED_BY_TEACHER = 'LOCKED_BY_TEACHER',
  /** Falta dominar el nivel anterior. */
  LOCKED_BY_PROGRESS = 'LOCKED_BY_PROGRESS',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  MASTERED = 'MASTERED',
}
