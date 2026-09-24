import { Injectable } from '@nestjs/common';
import { Level } from '../../core/domain';
import { LevelRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryLevelRepository extends LevelRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async findById(id: string): Promise<Level | null> {
    const found = this.store.levels.get(id);
    return found ? detach(found) : null;
  }

  async findByOrder(order: number): Promise<Level | null> {
    const found = [...this.store.levels.values()].find((level) => level.order === order);
    return found ? detach(found) : null;
  }

  async findAll(): Promise<Level[]> {
    return [...this.store.levels.values()].sort((a, b) => a.order - b.order).map(detach);
  }

  async save(level: Level): Promise<Level> {
    this.store.levels.set(level.id, detach(level));
    return detach(level);
  }
}
