/** Especies disponibles para la mascota que el chico elige en el onboarding. */
export enum PetSpeciesId {
  LION = 'LION',
  POLAR_BEAR = 'POLAR_BEAR',
  RHINOCEROS = 'RHINOCEROS',
  KOALA = 'KOALA',
}

/** Entrada de catalogo de una especie. El asset lo resuelve el frontend. */
export interface PetSpecies {
  id: PetSpeciesId;
  label: string;
  assetKey: string;
}

/** Mascota concreta de un alumno, con lo que gano y lo que tiene puesto. */
export interface Pet {
  species: PetSpeciesId;
  accessoriesOwned: string[];
  accessoriesEquipped: string[];
}
