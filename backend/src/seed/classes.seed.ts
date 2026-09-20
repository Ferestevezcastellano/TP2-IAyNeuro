import { SchoolClass } from '../core/domain';

/**
 * Dos cursos con distinto avance docente, para que la demo muestre en vivo que
 * el limite de la docente es real: en PRIMERO-A el nivel 4 esta cerrado aunque
 * el chico domine el 3, y en PRIMERO-B no.
 */
export const SEEDED_CLASSES: SchoolClass[] = [
  {
    id: 'class-primero-a',
    code: 'PRIMERO-A',
    teacherCode: 'PRIMERO-A-DOC',
    name: '1er grado A',
    schoolName: 'Escuela Modelo',
    unlockedLevelOrder: 3,
    createdAt: new Date('2026-03-02T09:00:00.000Z'),
  },
  {
    id: 'class-primero-b',
    code: 'PRIMERO-B',
    teacherCode: 'PRIMERO-B-DOC',
    name: '1er grado B',
    schoolName: 'Escuela Modelo',
    unlockedLevelOrder: 6,
    createdAt: new Date('2026-03-02T09:00:00.000Z'),
  },
];
