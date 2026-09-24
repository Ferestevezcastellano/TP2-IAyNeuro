import { Level, LevelKind, LevelProgress, LevelStatus, SchoolClass } from '../domain';
import { LevelAccessService } from './level-access.service';
import { MasteryService } from './mastery.service';

function level(order: number): Level {
  return {
    id: `level-0${order}`,
    order,
    title: `Nivel ${order}`,
    block: 'Cap. 2',
    goal: 'OBJETIVO',
    newLetters: [],
    cumulativeLetters: [],
    kind: LevelKind.WORD_BUILDING,
    voiceCheckEnabled: true,
    sessionDraw: [],
    accessoryId: `acc-${order}`,
  };
}

const levels = [level(1), level(2), level(3), level(4)];

const schoolClass = (unlockedLevelOrder: number): SchoolClass => ({
  id: 'class-primero-a',
  code: 'PRIMERO-A',
  teacherCode: 'PRIMERO-A-DOC',
  name: '1er grado A',
  schoolName: 'Escuela Modelo',
  unlockedLevelOrder,
  createdAt: new Date(),
});

describe('LevelAccessService', () => {
  const access = new LevelAccessService();
  const mastery = new MasteryService();

  const masteredProgress = (order: number): LevelProgress =>
    [1, 1, 1].reduce(
      (progress, accuracy) => mastery.register(progress, accuracy).progress,
      mastery.empty('alumno-1', `level-0${order}`, order),
    );

  const statuses = (unlocked: number, progresses: LevelProgress[]) =>
    access.resolve(levels, schoolClass(unlocked), progresses).map((item) => item.status);

  it('arranca con el primer nivel disponible y el resto esperando', () => {
    expect(statuses(3, [])).toEqual([
      LevelStatus.AVAILABLE,
      LevelStatus.LOCKED_BY_PROGRESS,
      LevelStatus.LOCKED_BY_PROGRESS,
      LevelStatus.LOCKED_BY_TEACHER,
    ]);
  });

  it('dominar un nivel abre el siguiente, si la docente lo habilito', () => {
    expect(statuses(3, [masteredProgress(1)])).toEqual([
      LevelStatus.MASTERED,
      LevelStatus.AVAILABLE,
      LevelStatus.LOCKED_BY_PROGRESS,
      LevelStatus.LOCKED_BY_TEACHER,
    ]);
  });

  it('el dominio no pasa por encima del limite de la docente', () => {
    const progresses = [masteredProgress(1), masteredProgress(2), masteredProgress(3)];

    expect(statuses(3, progresses)[3]).toBe(LevelStatus.LOCKED_BY_TEACHER);
  });

  it('habilitar el nivel siguiente lo destraba sin tocar el progreso', () => {
    const progresses = [masteredProgress(1), masteredProgress(2), masteredProgress(3)];

    expect(statuses(4, progresses)[3]).toBe(LevelStatus.AVAILABLE);
  });

  it('habilitar de mas no adelanta a quien no domino el anterior', () => {
    expect(statuses(4, [])).toEqual([
      LevelStatus.AVAILABLE,
      LevelStatus.LOCKED_BY_PROGRESS,
      LevelStatus.LOCKED_BY_PROGRESS,
      LevelStatus.LOCKED_BY_PROGRESS,
    ]);
  });

  it('un nivel con sesiones pero sin dominio queda en curso', () => {
    const started = mastery.register(mastery.empty('alumno-1', 'level-01', 1), 0.5).progress;

    expect(statuses(3, [started])[0]).toBe(LevelStatus.IN_PROGRESS);
  });

  it('el nivel actual es el primero jugable sin dominar', () => {
    const accesses = access.resolve(levels, schoolClass(3), [masteredProgress(1)]);

    expect(access.currentLevel(accesses)?.level.order).toBe(2);
  });

  it('sin niveles jugables pendientes, no hay nivel actual', () => {
    const progresses = [masteredProgress(1), masteredProgress(2), masteredProgress(3)];
    const accesses = access.resolve(levels, schoolClass(3), progresses);

    expect(access.currentLevel(accesses)).toBeNull();
  });
});
