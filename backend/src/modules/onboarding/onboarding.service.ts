import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessSubjectType, PetSpeciesId, SchoolClass, Student } from '../../core/domain';
import { AccessTokenRepository, ClassRepository, PetRepository, StudentRepository } from '../../core/ports';

export interface StudentRegistration {
  student: Student;
  token: string;
  schoolClass: SchoolClass;
}

/**
 * Onboarding completo: codigo de clase mas mascota.
 *
 * No se pide nombre, ni edad, ni nada que identifique al chico. El codigo de
 * clase ya trae escuela, grado y docente, y la mascota reemplaza al nombre como
 * identidad visible.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly classes: ClassRepository,
    private readonly students: StudentRepository,
    private readonly pets: PetRepository,
    private readonly tokens: AccessTokenRepository,
  ) {}

  findClassByCode(classCode: string): Promise<SchoolClass | null> {
    return this.classes.findByCode(classCode);
  }

  async register(classCode: string, petSpecies: PetSpeciesId): Promise<StudentRegistration> {
    const schoolClass = await this.classes.findByCode(classCode);
    if (!schoolClass) {
      throw new NotFoundException(`No existe un curso con el codigo ${classCode.trim().toUpperCase()}.`);
    }

    const species = await this.pets.findById(petSpecies);
    if (!species) {
      throw new NotFoundException(`No existe la mascota ${petSpecies}.`);
    }

    const now = new Date();
    const student = await this.students.save({
      id: randomUUID(),
      classId: schoolClass.id,
      pet: { species: species.id, accessoriesOwned: [], accessoriesEquipped: [] },
      stars: 0,
      createdAt: now,
      lastSeenAt: now,
    });

    const token = await this.tokens.issue(AccessSubjectType.STUDENT, student.id);

    return { student, token: token.token, schoolClass };
  }
}
