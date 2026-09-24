import { Inject, Injectable, Optional } from '@nestjs/common';
import { LevelProgress } from '../domain';
import { MASTERY_CONFIG, MASTERY_CONFIG_TOKEN, MasteryConfig } from '../config/mastery.config';

export interface MasteryUpdate {
  progress: LevelProgress;
  /** Verdadero solo en la sesion en la que el nivel pasa a dominado. */
  masteredNow: boolean;
}

/**
 * Regla de dominio de un nivel.
 *
 * No alcanza con acertar una vez: el nivel se da por dominado cuando el promedio
 * de las ultimas `windowSize` sesiones supera el umbral, con un minimo de
 * `minSessions` sesiones hechas. Una sesion floja despues del dominio no lo
 * revierte, porque quitarle estrellas ganadas a un chico de seis anos es
 * exactamente el feedback punitivo que la app evita.
 */
@Injectable()
export class MasteryService {
  private readonly config: MasteryConfig;

  constructor(@Optional() @Inject(MASTERY_CONFIG_TOKEN) config?: MasteryConfig) {
    this.config = config ?? MASTERY_CONFIG;
  }

  /** Progreso vacio, para la primera sesion de un alumno en un nivel. */
  empty(studentId: string, levelId: string, levelOrder: number): LevelProgress {
    return {
      studentId,
      levelId,
      levelOrder,
      recentAccuracies: [],
      sessionsCompleted: 0,
      masteryAverage: 0,
      bestAccuracy: 0,
      mastered: false,
      starsAwarded: 0,
    };
  }

  /** Incorpora la precision de una sesion recien cerrada a la ventana movil. */
  register(progress: LevelProgress, accuracy: number, at: Date = new Date()): MasteryUpdate {
    const bounded = Math.min(1, Math.max(0, accuracy));
    const recentAccuracies = [...progress.recentAccuracies, bounded].slice(-this.config.windowSize);
    const sessionsCompleted = progress.sessionsCompleted + 1;
    const masteryAverage = this.average(recentAccuracies);

    const reachesThreshold =
      sessionsCompleted >= this.config.minSessions &&
      recentAccuracies.length >= Math.min(this.config.windowSize, this.config.minSessions) &&
      masteryAverage >= this.config.threshold;

    const masteredNow = !progress.mastered && reachesThreshold;

    return {
      masteredNow,
      progress: {
        ...progress,
        recentAccuracies,
        sessionsCompleted,
        masteryAverage,
        bestAccuracy: Math.max(progress.bestAccuracy, bounded),
        mastered: progress.mastered || reachesThreshold,
        masteredAt: progress.masteredAt ?? (masteredNow ? at : undefined),
        lastSessionAt: at,
      },
    };
  }

  /** Cuantas sesiones mas hacen falta como minimo, para mostrarlo en el panel docente. */
  sessionsRemaining(progress: LevelProgress): number {
    return Math.max(0, this.config.minSessions - progress.sessionsCompleted);
  }

  get settings(): MasteryConfig {
    return this.config;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, value) => acc + value, 0);
    return Number((sum / values.length).toFixed(4));
  }
}
