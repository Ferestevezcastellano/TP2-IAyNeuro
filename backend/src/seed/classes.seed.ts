import { SchoolClass } from '../core/domain';

/**
 * Dos cursos, los dos habilitados hasta el nivel 5 (todo el Capitulo 2): la
 * primera version de la app cubre esos niveles y el 6 queda bloqueado por la
 * docente. Desde el panel docente se puede habilitar para ver que el limite es real.
 */
export const SEEDED_CLASSES: SchoolClass[] = [
  {
    id: 'class-primero-a',
    code: 'PRIMERO-A',
    teacherCode: 'PRIMERO-A-DOC',
    name: '1er grado A',
    schoolName: 'Escuela Modelo',
    unlockedLevelOrder: 5,
    createdAt: new Date('2026-03-02T09:00:00.000Z'),
  },
  {
    id: 'class-primero-b',
    code: 'PRIMERO-B',
    teacherCode: 'PRIMERO-B-DOC',
    name: '1er grado B',
    schoolName: 'Escuela Modelo',
    unlockedLevelOrder: 5,
    createdAt: new Date('2026-03-02T09:00:00.000Z'),
  },
];
