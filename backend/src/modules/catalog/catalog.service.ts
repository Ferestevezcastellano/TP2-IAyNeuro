import { Inject, Injectable } from '@nestjs/common';
import { Accessory, Level, PetSpecies } from '../../core/domain';
import { AccessoryRepository, LevelRepository, PetRepository } from '../../core/ports';
import { MASTERY_CONFIG_TOKEN, MasteryConfig } from '../../core/config/mastery.config';

@Injectable()
export class CatalogService {
  constructor(
    private readonly levels: LevelRepository,
    private readonly pets: PetRepository,
    private readonly accessories: AccessoryRepository,
    @Inject(MASTERY_CONFIG_TOKEN) private readonly config: MasteryConfig,
  ) {}

  listLevels(): Promise<Level[]> {
    return this.levels.findAll();
  }

  listPets(): Promise<PetSpecies[]> {
    return this.pets.findAll();
  }

  listAccessories(): Promise<Accessory[]> {
    return this.accessories.findAll();
  }

  /** La misma regla que aplica `MasteryService`: el cliente la lee de aca y no la repite. */
  masteryRules() {
    const { windowSize, minSessions, threshold, starsPerMasteredLevel } = this.config;
    return { windowSize, minSessions, threshold, starsPerMasteredLevel };
  }
}
