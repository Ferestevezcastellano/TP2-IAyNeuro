import { Accessory } from '../domain';

export abstract class AccessoryRepository {
  abstract findById(id: string): Promise<Accessory | null>;
  abstract findAll(): Promise<Accessory[]>;
  abstract findByLevelOrder(levelOrder: number): Promise<Accessory | null>;
  abstract save(accessory: Accessory): Promise<Accessory>;
}
