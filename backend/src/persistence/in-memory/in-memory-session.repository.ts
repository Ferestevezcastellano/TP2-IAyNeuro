import { Injectable } from '@nestjs/common';
import { PracticeSession, SessionStatus } from '../../core/domain';
import { SessionRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemorySessionRepository extends SessionRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async findById(id: string): Promise<PracticeSession | null> {
    const found = this.store.sessions.get(id);
    return found ? detach(found) : null;
  }

  async findOpenByStudent(studentId: string): Promise<PracticeSession | null> {
    const found = [...this.store.sessions.values()]
      .filter((session) => session.studentId === studentId && session.status === SessionStatus.IN_PROGRESS)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
    return found ? detach(found) : null;
  }

  async findByStudent(studentId: string): Promise<PracticeSession[]> {
    return [...this.store.sessions.values()]
      .filter((session) => session.studentId === studentId)
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map(detach);
  }

  async save(session: PracticeSession): Promise<PracticeSession> {
    this.store.sessions.set(session.id, detach(session));
    return detach(session);
  }
}
