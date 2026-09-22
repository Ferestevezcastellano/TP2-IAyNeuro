import { Card, CardKind, Level, LevelKind } from '../domain';
import { SessionDeckService } from './session-deck.service';

function card(id: string, position: number, group: string): Card {
  return {
    id,
    levelId: 'level-01-a-e',
    position,
    group,
    kind: CardKind.SOUND_RECOGNITION,
    prompt: '',
    audioKey: 'audio/fonema/a',
    spokenAs: 'aaa',
    tiles: [],
    solution: [],
  };
}

function level(sessionDraw: Level['sessionDraw']): Level {
  return {
    id: 'level-01-a-e',
    order: 1,
    title: 'A, E',
    block: '',
    goal: '',
    newLetters: ['A', 'E'],
    cumulativeLetters: ['A', 'E'],
    kind: LevelKind.PHONEME_ISOLATION,
    voiceCheckEnabled: true,
    accessoryId: 'acc-gorro',
    sessionDraw,
  };
}

const pool = [
  card('intro-a', 1, 'LETRA'),
  card('a1', 2, 'A'),
  card('a2', 3, 'A'),
  card('a3', 4, 'A'),
  card('intro-e', 5, 'LETRA'),
  card('e1', 6, 'E'),
  card('e2', 7, 'E'),
  card('e3', 8, 'E'),
];

/** Generador determinista para fijar expectativas. */
function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('SessionDeckService', () => {
  const service = new SessionDeckService();

  it('sortea de cada bolsa la cantidad pedida y respeta el orden pedagogico', () => {
    const deck = service.draw(
      level([
        { group: 'LETRA', count: 2 },
        { group: 'A', count: 2 },
        { group: 'E', count: 2 },
      ]),
      pool,
    );

    expect(deck).toHaveLength(6);
    expect(deck.map((item) => item.position)).toEqual([...deck.map((item) => item.position)].sort((a, b) => a - b));
    expect(deck.filter((item) => item.group === 'LETRA').map((item) => item.id)).toEqual(['intro-a', 'intro-e']);
    expect(deck.filter((item) => item.group === 'A')).toHaveLength(2);
    expect(deck.filter((item) => item.group === 'E')).toHaveLength(2);
    expect(deck[0].id).toBe('intro-a');
  });

  it('dos sesiones con distinto azar traen distintas tarjetas', () => {
    const recipe = level([
      { group: 'A', count: 1 },
      { group: 'E', count: 1 },
    ]);

    const first = service.draw(recipe, pool, sequence([0.1, 0.1, 0.1]));
    const second = service.draw(recipe, pool, sequence([0.9, 0.9, 0.9]));

    expect(first.map((item) => item.id)).not.toEqual(second.map((item) => item.id));
  });

  it('si la bolsa es mas chica que el pedido, entra entera', () => {
    const deck = service.draw(level([{ group: 'LETRA', count: 5 }]), pool);
    expect(deck.map((item) => item.id)).toEqual(['intro-a', 'intro-e']);
  });

  it('una bolsa que no figura en la receta no entra en la sesion', () => {
    const deck = service.draw(level([{ group: 'A', count: 3 }]), pool);
    expect(deck.every((item) => item.group === 'A')).toBe(true);
  });
});
