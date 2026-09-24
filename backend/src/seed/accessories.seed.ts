import { Accessory, AccessorySlot } from '../core/domain';

/** Un accesorio por nivel. Se gana al dominar el nivel, una sola vez. */
export const SEEDED_ACCESSORIES: Accessory[] = [
  { id: 'acc-gorro', label: 'GORRO ROJO', slot: AccessorySlot.HEAD, assetKey: 'img/accesorio/gorro-rojo', unlockedByLevelOrder: 1 },
  { id: 'acc-anteojos', label: 'ANTEOJOS', slot: AccessorySlot.FACE, assetKey: 'img/accesorio/anteojos', unlockedByLevelOrder: 2 },
  { id: 'acc-bufanda', label: 'BUFANDA', slot: AccessorySlot.NECK, assetKey: 'img/accesorio/bufanda', unlockedByLevelOrder: 3 },
  { id: 'acc-capa', label: 'CAPA', slot: AccessorySlot.BODY, assetKey: 'img/accesorio/capa', unlockedByLevelOrder: 4 },
  { id: 'acc-medalla', label: 'MEDALLA', slot: AccessorySlot.NECK, assetKey: 'img/accesorio/medalla', unlockedByLevelOrder: 5 },
  { id: 'acc-mochila', label: 'MOCHILA', slot: AccessorySlot.BODY, assetKey: 'img/accesorio/mochila', unlockedByLevelOrder: 6 },
];
