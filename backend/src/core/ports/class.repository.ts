import { SchoolClass } from '../domain';

/**
 * Puerto de acceso a cursos. Es una clase abstracta y no una interface porque
 * Nest necesita un valor en tiempo de ejecucion para usarla como token de DI.
 */
export abstract class ClassRepository {
  abstract findById(id: string): Promise<SchoolClass | null>;
  abstract findByCode(code: string): Promise<SchoolClass | null>;
  abstract findByTeacherCode(teacherCode: string): Promise<SchoolClass | null>;
  abstract findAll(): Promise<SchoolClass[]>;
  abstract save(schoolClass: SchoolClass): Promise<SchoolClass>;
}
