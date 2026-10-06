import { Inject, Injectable, Optional } from '@nestjs/common';
import { Accessory, LevelProgress, Student } from '../domain';
import { MASTERY_CONFIG, MASTERY_CONFIG_TOKEN, MasteryConfig } from '../config/mastery.config';

export interface RewardGrant {
  student: Student;
  progress: LevelProgress;
  starsAwarded: number;
  accessoryUnlockedId: string | null;
}

/**
 * Pago de estrellas y accesorios.
 *
 * Es idempotente por nivel: repetir un nivel ya dominado sigue siendo util para
 * practicar pero no vuelve a pagar, asi la recompensa marca un logro real y no
 * la cantidad de veces que el chico toco el mismo boton.
 */
@Injectable()
export class RewardService {
  private readonly config: MasteryConfig;

  /** Recibe la configuracion igual que `MasteryService`, para que las dos lean siempre la misma. */
  constructor(@Optional() @Inject(MASTERY_CONFIG_TOKEN) config?: MasteryConfig) {
    this.config = config ?? MASTERY_CONFIG;
  }

  grant(student: Student, progress: LevelProgress, accessory: Accessory | null): RewardGrant {
    if (progress.starsAwarded > 0 || !progress.mastered) {
      return { student, progress, starsAwarded: 0, accessoryUnlockedId: null };
    }

    const stars = this.config.starsPerMasteredLevel;
    const alreadyOwned = accessory ? student.pet.accessoriesOwned.includes(accessory.id) : true;
    const accessoryUnlockedId = accessory && !alreadyOwned ? accessory.id : null;

    return {
      starsAwarded: stars,
      accessoryUnlockedId,
      progress: { ...progress, starsAwarded: stars },
      student: {
        ...student,
        stars: student.stars + stars,
        pet: {
          ...student.pet,
          accessoriesOwned: accessoryUnlockedId
            ? [...student.pet.accessoriesOwned, accessoryUnlockedId]
            : student.pet.accessoriesOwned,
        },
      },
    };
  }
}
