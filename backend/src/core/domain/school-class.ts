/**
 * Un curso. El codigo de clase es lo unico que el chico escribe en toda la app;
 * el teacherCode es la contraparte de la docente sobre ese mismo curso.
 */
export interface SchoolClass {
  id: string;
  code: string;
  teacherCode: string;
  name: string;
  schoolName: string;
  /** Hasta que nivel (inclusive) libero la docente para todo el curso. */
  unlockedLevelOrder: number;
  createdAt: Date;
}
