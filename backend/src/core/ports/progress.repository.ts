import { LevelProgress } from '../domain';

export abstract class ProgressRepository {
  abstract find(studentId: string, levelId: string): Promise<LevelProgress | null>;
  abstract findByStudent(studentId: string): Promise<LevelProgress[]>;
  abstract findByStudents(studentIds: string[]): Promise<LevelProgress[]>;
  abstract save(progress: LevelProgress): Promise<LevelProgress>;
}
