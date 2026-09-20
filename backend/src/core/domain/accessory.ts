/** Parte de la mascota donde se apoya el accesorio. */
export enum AccessorySlot {
  HEAD = 'HEAD',
  FACE = 'FACE',
  NECK = 'NECK',
  BODY = 'BODY',
  HAND = 'HAND',
}

/** Accesorio de mascota. Se gana al dominar el nivel indicado. */
export interface Accessory {
  id: string;
  label: string;
  slot: AccessorySlot;
  assetKey: string;
  unlockedByLevelOrder: number;
}
