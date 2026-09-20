import { Injectable } from '@nestjs/common';
import { Accessory } from '../../core/domain';
import { AccessoryRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryAccessoryRepository extends AccessoryRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async findById(id: string): Promise<Accessory | null> {
    const found = this.store.accessories.get(id);
    return found ? detach(found) : null;
  }

  async findAll(): Promise<Accessory[]> {
    return [...this.store.accessories.values()]
      .sort((a, b) => a.unlockedByLevelOrder - b.unlockedByLevelOrder)
      .map(detach);
  }

  async findByLevelOrder(levelOrder: number): Promise<Accessory | null> {
    const found = [...this.store.accessories.values()].find((item) => item.unlockedByLevelOrder === levelOrder);
    return found ? detach(found) : null;
  }

  async save(accessory: Accessory): Promise<Accessory> {
    this.store.accessories.set(accessory.id, detach(accessory));
    return detach(accessory);
  }
}
