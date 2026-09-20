import { PetSpecies, PetSpeciesId } from '../core/domain';

/** Las cuatro mascotas de la grilla 2x2 del onboarding. */
export const SEEDED_PETS: PetSpecies[] = [
  { id: PetSpeciesId.DOG, label: 'PERRO', assetKey: 'img/mascota/perro' },
  { id: PetSpeciesId.CAT, label: 'GATO', assetKey: 'img/mascota/gato' },
  { id: PetSpeciesId.LION, label: 'LEÓN', assetKey: 'img/mascota/leon' },
  { id: PetSpeciesId.BEAR, label: 'OSO', assetKey: 'img/mascota/oso' },
];
