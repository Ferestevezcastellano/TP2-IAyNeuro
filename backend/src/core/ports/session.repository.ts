import { PracticeSession } from '../domain';

export abstract class SessionRepository {
  abstract findById(id: string): Promise<PracticeSession | null>;
  abstract findOpenByStudent(studentId: string): Promise<PracticeSession | null>;
  abstract findByStudent(studentId: string): Promise<PracticeSession[]>;
  abstract save(session: PracticeSession): Promise<PracticeSession>;
}
