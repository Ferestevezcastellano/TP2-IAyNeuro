import { Card } from '../domain';

export abstract class CardRepository {
  abstract findById(id: string): Promise<Card | null>;
  /** Tarjetas del nivel ordenadas por `position`. */
  abstract findByLevelId(levelId: string): Promise<Card[]>;
  abstract findByLevelIds(levelIds: string[]): Promise<Card[]>;
  abstract save(card: Card): Promise<Card>;
}
