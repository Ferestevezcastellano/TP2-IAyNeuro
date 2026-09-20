import { Level } from '../domain';

export abstract class LevelRepository {
  abstract findById(id: string): Promise<Level | null>;
  abstract findByOrder(order: number): Promise<Level | null>;
  /** Devuelve todos los niveles ordenados por `order` ascendente. */
  abstract findAll(): Promise<Level[]>;
  abstract save(level: Level): Promise<Level>;
}
