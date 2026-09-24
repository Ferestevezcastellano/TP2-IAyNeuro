import { Injectable, NotFoundException } from '@nestjs/common';
import { Accessory, PetSpecies, SchoolClass, Student } from '../../core/domain';
import {
  AccessoryRepository,
  ClassRepository,
  LevelRepository,
  PetRepository,
  ProgressRepository,
  StudentRepository,
} from '../../core/ports';
import { LevelAccess, LevelAccessService } from '../../core/services';

export interface StudentContext {
  student: Student;
  schoolClass: SchoolClass;
  accesses: LevelAccess[];
  current: LevelAccess | null;
}

/**
 * Arma la vista que tiene un alumno de su propio avance. Es el punto unico
 * donde se cruzan alumno, curso y progreso, para que el modulo de practica y la
 * pantalla inicial no calculen los estados de nivel cada uno por su lado.
 */
@Injectable()
export class StudentService {
  constructor(
    private readonly students: StudentRepository,
    private readonly classes: ClassRepository,
    private readonly levels: LevelRepository,
    private readonly progress: ProgressRepository,
    private readonly pets: PetRepository,
    private readonly accessories: AccessoryRepository,
    private readonly levelAccess: LevelAccessService,
  ) {}

  async context(student: Student): Promise<StudentContext> {
    const schoolClass = await this.classes.findById(student.classId);
    if (!schoolClass) {
      throw new NotFoundException('El curso del alumno ya no existe.');
    }

    const [levels, progresses] = await Promise.all([
      this.levels.findAll(),
      this.progress.findByStudent(student.id),
    ]);

    const accesses = this.levelAccess.resolve(levels, schoolClass, progresses);

    return { student, schoolClass, accesses, current: this.levelAccess.currentLevel(accesses) };
  }

  async species(student: Student): Promise<PetSpecies> {
    const species = await this.pets.findById(student.pet.species);
    if (!species) {
      throw new NotFoundException(`No existe la mascota ${student.pet.species}.`);
    }
    return species;
  }

  accessoryCatalog(): Promise<Accessory[]> {
    return this.accessories.findAll();
  }

  /**
   * Cambia lo que la mascota tiene puesto. Solo deja equipar accesorios ya
   * ganados: lo que se ve en la pantalla tiene que coincidir con lo que el chico
   * efectivamente logro.
   */
  async equipAccessories(student: Student, accessoryIds: string[]): Promise<Student> {
    const unknown = accessoryIds.filter((id) => !student.pet.accessoriesOwned.includes(id));
    if (unknown.length > 0) {
      throw new NotFoundException(`Accesorios no ganados todavia: ${unknown.join(', ')}.`);
    }

    return this.students.save({
      ...student,
      pet: { ...student.pet, accessoriesEquipped: [...new Set(accessoryIds)] },
      lastSeenAt: new Date(),
    });
  }

  touch(student: Student): Promise<Student> {
    return this.students.save({ ...student, lastSeenAt: new Date() });
  }
}
