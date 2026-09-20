import { Injectable } from '@nestjs/common';
import { SchoolClass } from '../../core/domain';
import { ClassRepository } from '../../core/ports';
import { detach, InMemoryStore } from './in-memory.store';

@Injectable()
export class InMemoryClassRepository extends ClassRepository {
  constructor(private readonly store: InMemoryStore) {
    super();
  }

  async findById(id: string): Promise<SchoolClass | null> {
    const found = this.store.classes.get(id);
    return found ? detach(found) : null;
  }

  async findByCode(code: string): Promise<SchoolClass | null> {
    const normalized = code.trim().toUpperCase();
    const found = [...this.store.classes.values()].find((item) => item.code === normalized);
    return found ? detach(found) : null;
  }

  async findByTeacherCode(teacherCode: string): Promise<SchoolClass | null> {
    const normalized = teacherCode.trim().toUpperCase();
    const found = [...this.store.classes.values()].find((item) => item.teacherCode === normalized);
    return found ? detach(found) : null;
  }

  async findAll(): Promise<SchoolClass[]> {
    return [...this.store.classes.values()].map(detach);
  }

  async save(schoolClass: SchoolClass): Promise<SchoolClass> {
    this.store.classes.set(schoolClass.id, detach(schoolClass));
    return detach(schoolClass);
  }
}
