import { Injectable } from '@nestjs/common';
import { Card } from '../../core/domain';
import { CardRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryCardRepository extends CardRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async findById(id: string): Promise<Card | null> {
    const found = this.store.cards.get(id);
    return found ? detach(found) : null;
  }

  async findByLevelId(levelId: string): Promise<Card[]> {
    return [...this.store.cards.values()]
      .filter((card) => card.levelId === levelId)
      .sort((a, b) => a.position - b.position)
      .map(detach);
  }

  async findByLevelIds(levelIds: string[]): Promise<Card[]> {
    const wanted = new Set(levelIds);
    return [...this.store.cards.values()]
      .filter((card) => wanted.has(card.levelId))
      .sort((a, b) => a.position - b.position)
      .map(detach);
  }

  async save(card: Card): Promise<Card> {
    this.store.cards.set(card.id, detach(card));
    return detach(card);
  }
}
