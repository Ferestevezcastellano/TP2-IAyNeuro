import { Injectable } from '@nestjs/common';
import { Student } from '../../core/domain';
import { StudentRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryStudentRepository extends StudentRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async findById(id: string): Promise<Student | null> {
    const found = this.store.students.get(id);
    return found ? detach(found) : null;
  }

  async findByClassId(classId: string): Promise<Student[]> {
    return [...this.store.students.values()]
      .filter((student) => student.classId === classId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(detach);
  }

  async save(student: Student): Promise<Student> {
    this.store.students.set(student.id, detach(student));
    return detach(student);
  }
}
