import { CardKind } from '../core/domain';
import { SEEDED_ACCESSORIES } from './accessories.seed';
import { SEEDED_LEVELS } from './levels.seed';

describe('Contenido semilla', () => {
  it('los niveles van en orden y sin saltos', () => {
    expect(SEEDED_LEVELS.map((item) => item.level.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('cada nivel tiene su accesorio y ningun accesorio se repite', () => {
    const accessoryIds = SEEDED_LEVELS.map((item) => item.level.accessoryId);
    const known = new Set(SEEDED_ACCESSORIES.map((item) => item.id));

    expect(new Set(accessoryIds).size).toBe(accessoryIds.length);
    accessoryIds.forEach((id) => expect(known.has(id)).toBe(true));
  });

  it('el accesorio de cada nivel se desbloquea justo en ese nivel', () => {
    SEEDED_LEVELS.forEach(({ level }) => {
      const accessory = SEEDED_ACCESSORIES.find((item) => item.id === level.accessoryId);
      expect(accessory?.unlockedByLevelOrder).toBe(level.order);
    });
  });

  it('el acumulado crece y contiene siempre al anterior', () => {
    SEEDED_LEVELS.forEach(({ level }, index) => {
      if (index === 0) return;
      const previous = SEEDED_LEVELS[index - 1].level.cumulativeLetters;
      previous.forEach((letter) => expect(level.cumulativeLetters).toContain(letter));
      level.newLetters.forEach((letter) => expect(level.cumulativeLetters).toContain(letter));
    });
  });

  /**
   * La regla de acumulacion del cuadernillo: ninguna palabra que el chico arma
   * o lee puede tener una letra que todavia no trabajo. Si este test se pone en
   * rojo al agregar contenido, el contenido esta mal, no el test.
   */
  it('ninguna palabra usa una letra fuera del acumulado del nivel', () => {
    SEEDED_LEVELS.forEach(({ level, cards }) => {
      const allowed = new Set(level.cumulativeLetters);

      cards
        .filter((card) => card.kind !== CardKind.SOUND_RECOGNITION)
        .forEach((card) => {
          const text = (card.targetWord ?? card.targetSentence ?? '')
            .normalize('NFD')
            .replace(/[̀-̂̄-ͯ]/g, '')
            .replace(/[^A-ZÑ]/gi, '')
            .toUpperCase();

          const word = card.targetWord ?? card.targetSentence;
          const outside = [...new Set(text)].filter((letter) => !allowed.has(letter));

          expect({ nivel: level.order, palabra: word, fueraDelAcumulado: outside }).toEqual({
            nivel: level.order,
            palabra: word,
            fueraDelAcumulado: [],
          });
        });
    });
  });

  it('las tarjetas de cada nivel estan numeradas desde 1 y sin repetir', () => {
    SEEDED_LEVELS.forEach(({ cards }) => {
      expect(cards.map((card) => card.position)).toEqual(cards.map((_, index) => index + 1));
    });
  });

  it('cada tarjeta tiene solucion y todos sus tiles de solucion existen', () => {
    SEEDED_LEVELS.flatMap((item) => item.cards).forEach((card) => {
      const tileIds = new Set(card.tiles.map((tile) => tile.id));
      expect(card.solution.length).toBeGreaterThan(0);
      card.solution.forEach((tileId) => expect(tileIds.has(tileId)).toBe(true));
    });
  });

  it('ningun id de tarjeta se repite entre niveles', () => {
    const ids = SEEDED_LEVELS.flatMap((item) => item.cards).map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('las tarjetas de armado traen botones de mas, para que no se resuelvan por descarte', () => {
    SEEDED_LEVELS.flatMap((item) => item.cards)
      .filter((card) => card.kind === CardKind.WORD_BUILDING)
      .forEach((card) => {
        expect(card.tiles.length).toBeGreaterThan(card.solution.length);
      });
  });
});
