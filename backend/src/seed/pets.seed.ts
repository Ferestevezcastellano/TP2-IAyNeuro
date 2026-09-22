import { PetSpecies, PetSpeciesId } from '../core/domain';

/** Las cuatro mascotas de la grilla 2x2 del onboarding, las mismas de los mockups de Figma. */
export const SEEDED_PETS: PetSpecies[] = [
  { id: PetSpeciesId.LION, label: 'LEÓN', assetKey: 'img/mascota/lion' },
  { id: PetSpeciesId.KOALA, label: 'KOALA', assetKey: 'img/mascota/koala' },
  { id: PetSpeciesId.POLAR_BEAR, label: 'OSO POLAR', assetKey: 'img/mascota/polar-bear' },
  { id: PetSpeciesId.RHINOCEROS, label: 'RINOCERONTE', assetKey: 'img/mascota/rhinoceros' },
];
