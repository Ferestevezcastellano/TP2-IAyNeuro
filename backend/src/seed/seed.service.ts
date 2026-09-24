import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AccessoryRepository,
  CardRepository,
  ClassRepository,
  LevelRepository,
  PetRepository,
} from '../core/ports';
import { SEEDED_ACCESSORIES } from './accessories.seed';
import { SEEDED_CLASSES } from './classes.seed';
import { SEEDED_LEVELS } from './levels.seed';
import { SEEDED_PETS } from './pets.seed';

/**
 * Carga el contenido al arrancar. Como el estado vive en memoria, esto corre en
 * cada reinicio y deja la demo lista sin cargar nada a mano.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly classes: ClassRepository,
    private readonly levels: LevelRepository,
    private readonly cards: CardRepository,
    private readonly accessories: AccessoryRepository,
    private readonly pets: PetRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.run();
  }

  async run(): Promise<void> {
    await Promise.all(SEEDED_PETS.map((pet) => this.pets.save(pet)));
    await Promise.all(SEEDED_ACCESSORIES.map((accessory) => this.accessories.save(accessory)));
    await Promise.all(SEEDED_CLASSES.map((schoolClass) => this.classes.save(schoolClass)));

    let cardCount = 0;
    for (const seeded of SEEDED_LEVELS) {
      await this.levels.save(seeded.level);
      for (const card of seeded.cards) {
        await this.cards.save(card);
        cardCount += 1;
      }
    }

    this.logger.log(
      `Contenido cargado: ${SEEDED_LEVELS.length} niveles, ${cardCount} tarjetas, ` +
        `${SEEDED_CLASSES.length} cursos (${SEEDED_CLASSES.map((c) => c.code).join(', ')}).`,
    );
  }
}
