import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { CommonModule } from '../../common/common.module';
import { PetSpeciesId, Student } from '../../core/domain';
import { CoreModule } from '../../core/core.module';
import { LevelRepository, ProgressRepository, StudentRepository } from '../../core/ports';
import { PersistenceModule } from '../../persistence/persistence.module';
import { SeedModule } from '../../seed/seed.module';
import { ReviewModule } from './review.module';
import { ReviewService } from './review.service';

/** Generador con semilla: el mismo resultado en cada corrida. */
function sembrado(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('ReviewService.cardsFor', () => {
  let app: TestingModule;
  let review: ReviewService;
  let levels: LevelRepository;
  let progress: ProgressRepository;
  let students: StudentRepository;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [PersistenceModule, CoreModule, CommonModule, SeedModule, ReviewModule],
    }).compile();
    await app.init();
    review = app.get(ReviewService);
    levels = app.get(LevelRepository);
    progress = app.get(ProgressRepository);
    students = app.get(StudentRepository);
  });

  afterAll(() => app.close());

  /** Un alumno que ya dominó el nivel 1. */
  async function conNivelUnoDominado(): Promise<Student> {
    const student = await students.save({
      id: randomUUID(),
      classId: 'class-primero-a',
      pet: { species: PetSpeciesId.LION, accessoriesOwned: [], accessoriesEquipped: [] },
      stars: 0,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });
    const primero = (await levels.findAll()).find((l) => l.order === 1)!;
    await progress.save({
      studentId: student.id,
      levelId: primero.id,
      levelOrder: 1,
      recentAccuracies: [1],
      sessionsCompleted: 1,
      masteryAverage: 1,
      bestAccuracy: 1,
      mastered: true,
      starsAwarded: 3,
    });
    return student;
  }

  it('sin niveles dominados no hay nada para repasar', async () => {
    const student = await students.save({
      id: randomUUID(),
      classId: 'class-primero-a',
      pet: { species: PetSpeciesId.KOALA, accessoriesOwned: [], accessoriesEquipped: [] },
      stars: 0,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });
    expect(await review.cardsFor(student, 6)).toEqual({ cards: [], available: 0 });
  });

  it('saca tarjetas solo de lo dominado, hasta el límite pedido', async () => {
    const student = await conNivelUnoDominado();
    const { cards, available } = await review.cardsFor(student, 4, sembrado(1));

    expect(cards).toHaveLength(4);
    expect(available).toBeGreaterThan(4);
    expect(new Set(cards.map((c) => c.levelId))).toEqual(new Set([cards[0].levelId]));
    expect(new Set(cards.map((c) => c.id)).size).toBe(4);
  });

  it('el orden lo decide el generador que se le pasa', async () => {
    const student = await conNivelUnoDominado();
    const ids = async (semilla: number) => (await review.cardsFor(student, 6, sembrado(semilla))).cards.map((c) => c.id);

    expect(await ids(5)).toEqual(await ids(5));
    expect(await ids(5)).not.toEqual(await ids(6));
  });
});
