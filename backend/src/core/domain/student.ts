import { Pet } from './pet';

/**
 * Alumno. No guarda ningun dato personal: la identidad visible es la mascota.
 */
export interface Student {
  id: string;
  classId: string;
  pet: Pet;
  stars: number;
  createdAt: Date;
  lastSeenAt: Date;
}
