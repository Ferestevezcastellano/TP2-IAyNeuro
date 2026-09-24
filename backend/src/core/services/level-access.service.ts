import { Injectable } from '@nestjs/common';
import { Level, LevelProgress, LevelStatus, SchoolClass } from '../domain';

export interface LevelAccess {
  level: Level;
  status: LevelStatus;
  progress: LevelProgress | null;
  playable: boolean;
  /** Motivo en texto cuando no se puede jugar, para mostrarlo tal cual. */
  lockedReason: string | null;
}

/**
 * Decide que niveles puede jugar un alumno.
 *
 * Son dos condiciones que se aplican juntas y ninguna alcanza por si sola: la
 * docente libera hasta donde llego con el curso, y dentro de ese limite el chico
 * avanza dominando el nivel anterior. Asi la app nunca le adelanta contenido que
 * el aula todavia no vio, ni deja pasar a alguien que no demostro dominio.
 */
@Injectable()
export class LevelAccessService {
  resolve(levels: Level[], schoolClass: SchoolClass, progresses: LevelProgress[]): LevelAccess[] {
    const progressByLevel = new Map(progresses.map((item) => [item.levelId, item]));
    const ordered = [...levels].sort((a, b) => a.order - b.order);

    let previousMastered = true;

    return ordered.map((level) => {
      const progress = progressByLevel.get(level.id) ?? null;
      const status = this.statusOf(level, schoolClass, progress, previousMastered);
      previousMastered = progress?.mastered ?? false;

      const playable = status === LevelStatus.AVAILABLE || status === LevelStatus.IN_PROGRESS || status === LevelStatus.MASTERED;

      return {
        level,
        status,
        progress,
        playable,
        lockedReason: this.reasonOf(status),
      };
    });
  }

  private statusOf(
    level: Level,
    schoolClass: SchoolClass,
    progress: LevelProgress | null,
    previousMastered: boolean,
  ): LevelStatus {
    if (progress?.mastered) return LevelStatus.MASTERED;
    if (level.order > schoolClass.unlockedLevelOrder) return LevelStatus.LOCKED_BY_TEACHER;
    if (!previousMastered) return LevelStatus.LOCKED_BY_PROGRESS;
    if (progress && progress.sessionsCompleted > 0) return LevelStatus.IN_PROGRESS;
    return LevelStatus.AVAILABLE;
  }

  private reasonOf(status: LevelStatus): string | null {
    switch (status) {
      case LevelStatus.LOCKED_BY_TEACHER:
        return 'LA SEÑO TODAVÍA NO ABRIÓ ESTE NIVEL.';
      case LevelStatus.LOCKED_BY_PROGRESS:
        return 'PRIMERO TERMINAMOS EL NIVEL ANTERIOR.';
      default:
        return null;
    }
  }

  /** Primer nivel jugable todavia no dominado: el que abre la pantalla inicial. */
  currentLevel(accesses: LevelAccess[]): LevelAccess | null {
    return (
      accesses.find((access) => access.status === LevelStatus.IN_PROGRESS) ??
      accesses.find((access) => access.status === LevelStatus.AVAILABLE) ??
      null
    );
  }
}
