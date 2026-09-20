/** Especies disponibles para la mascota que el chico elige en el onboarding. */
export enum PetSpeciesId {
  DOG = 'DOG',
  CAT = 'CAT',
  LION = 'LION',
  BEAR = 'BEAR',
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
