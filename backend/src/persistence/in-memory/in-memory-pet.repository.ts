import { Injectable } from '@nestjs/common';
import { PetSpecies, PetSpeciesId } from '../../core/domain';
import { PetRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryPetRepository extends PetRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async findById(id: PetSpeciesId): Promise<PetSpecies | null> {
    const found = this.store.pets.get(id);
    return found ? detach(found) : null;
  }

  async findAll(): Promise<PetSpecies[]> {
    return [...this.store.pets.values()].map(detach);
  }

  async save(species: PetSpecies): Promise<PetSpecies> {
    this.store.pets.set(species.id, detach(species));
    return detach(species);
  }
}
