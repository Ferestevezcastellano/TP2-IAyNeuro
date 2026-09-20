import { Student } from '../domain';

export abstract class StudentRepository {
  abstract findById(id: string): Promise<Student | null>;
  abstract findByClassId(classId: string): Promise<Student[]>;
  abstract save(student: Student): Promise<Student>;
}
