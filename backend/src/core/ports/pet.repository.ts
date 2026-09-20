import { PetSpecies, PetSpeciesId } from '../domain';

export abstract class PetRepository {
  abstract findById(id: PetSpeciesId): Promise<PetSpecies | null>;
  abstract findAll(): Promise<PetSpecies[]>;
  abstract save(species: PetSpecies): Promise<PetSpecies>;
}
