import { LevelProgress } from '../domain';
import { MasteryService } from './mastery.service';

describe('MasteryService', () => {
  let service: MasteryService;
  let progress: LevelProgress;

  beforeEach(() => {
    service = new MasteryService();
    progress = service.empty('alumno-1', 'level-03-m-s', 3);
  });

  /** Encadena varias sesiones seguidas sobre el mismo progreso. */
  const play = (start: LevelProgress, accuracies: number[]) =>
    accuracies.reduce(
      (acc, accuracy) => {
        const update = service.register(acc.progress, accuracy);
        return { progress: update.progress, masteredNow: update.masteredNow };
      },
      { progress: start, masteredNow: false },
    );

  it('no domina con una sola sesion perfecta', () => {
    const { progress: result, masteredNow } = play(progress, [1]);

    expect(masteredNow).toBe(false);
    expect(result.mastered).toBe(false);
    expect(result.sessionsCompleted).toBe(1);
  });

  it('no domina con dos sesiones perfectas: el minimo son tres', () => {
    const { progress: result } = play(progress, [1, 1]);

    expect(result.mastered).toBe(false);
    expect(service.sessionsRemaining(result)).toBe(1);
  });

  it('domina con tres sesiones al 0.9 y marca masteredNow solo en esa', () => {
    const first = play(progress, [0.9, 0.9]);
    expect(first.progress.mastered).toBe(false);

    const third = service.register(first.progress, 0.9);
    expect(third.masteredNow).toBe(true);
    expect(third.progress.mastered).toBe(true);
    expect(third.progress.masteryAverage).toBeCloseTo(0.9, 4);
    expect(third.progress.masteredAt).toBeInstanceOf(Date);

    const fourth = service.register(third.progress, 0.95);
    expect(fourth.masteredNow).toBe(false);
  });

  it('no domina con 0.7 sostenido, por mas sesiones que haga', () => {
    const { progress: result } = play(progress, [0.7, 0.7, 0.7, 0.7, 0.7]);

    expect(result.mastered).toBe(false);
    expect(result.masteryAverage).toBeCloseTo(0.7, 4);
    expect(result.sessionsCompleted).toBe(5);
  });

  it('el promedio es movil: un arranque malo deja de pesar', () => {
    const { progress: result } = play(progress, [0, 0, 0.9, 0.9, 0.9]);

    expect(result.recentAccuracies).toEqual([0.9, 0.9, 0.9]);
    expect(result.mastered).toBe(true);
  });

  it('una sesion floja posterior no revierte el dominio ya ganado', () => {
    const mastered = play(progress, [1, 1, 1]).progress;
    const after = play(mastered, [0.2, 0.2, 0.2]).progress;

    expect(after.mastered).toBe(true);
    expect(after.masteryAverage).toBeCloseTo(0.2, 4);
  });

  it('acota precisiones fuera de rango', () => {
    const { progress: result } = play(progress, [1.5, -0.3, 0.9]);

    expect(result.recentAccuracies).toEqual([1, 0, 0.9]);
    expect(result.bestAccuracy).toBe(1);
  });
});
