import { Injectable } from '@nestjs/common';
import { Accessory, Level, PetSpecies } from '../../core/domain';
import { AccessoryRepository, LevelRepository, PetRepository } from '../../core/ports';
import { MASTERY_CONFIG } from '../../core/config/mastery.config';

@Injectable()
export class CatalogService {
  constructor(
    private readonly levels: LevelRepository,
    private readonly pets: PetRepository,
    private readonly accessories: AccessoryRepository,
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

  masteryRules() {
    return {
      windowSize: MASTERY_CONFIG.windowSize,
      minSessions: MASTERY_CONFIG.minSessions,
      threshold: MASTERY_CONFIG.threshold,
      starsPerMasteredLevel: MASTERY_CONFIG.starsPerMasteredLevel,
    };
  }
}
