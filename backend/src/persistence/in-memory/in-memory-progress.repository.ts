import { Injectable } from '@nestjs/common';
import { LevelProgress } from '../../core/domain';
import { ProgressRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryProgressRepository extends ProgressRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async find(studentId: string, levelId: string): Promise<LevelProgress | null> {
    const found = this.store.progress.get(this.store.progressKey(studentId, levelId));
    return found ? detach(found) : null;
  }

  async findByStudent(studentId: string): Promise<LevelProgress[]> {
    return [...this.store.progress.values()]
      .filter((item) => item.studentId === studentId)
      .sort((a, b) => a.levelOrder - b.levelOrder)
      .map(detach);
  }

  async findByStudents(studentIds: string[]): Promise<LevelProgress[]> {
    const wanted = new Set(studentIds);
    return [...this.store.progress.values()]
      .filter((item) => wanted.has(item.studentId))
      .sort((a, b) => a.levelOrder - b.levelOrder)
      .map(detach);
  }

  async save(progress: LevelProgress): Promise<LevelProgress> {
    this.store.progress.set(this.store.progressKey(progress.studentId, progress.levelId), detach(progress));
    return detach(progress);
  }
}
