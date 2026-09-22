import { CardKind, TileKind } from '../core/domain';
import { SEEDED_ACCESSORIES } from './accessories.seed';
import { SEEDED_LEVELS } from './levels.seed';

/** Nombres de las letras: lo que un boton nunca tiene que decir. */
const LETTER_NAMES = new Set([
  'a', 'be', 'ce', 'de', 'e', 'efe', 'ge', 'hache', 'i', 'jota', 'ka', 'ele', 'eme', 'ene', 'eñe',
  'o', 'pe', 'cu', 'erre', 'ese', 'te', 'u', 'uve', 'doble uve', 'equis', 'ye', 'i griega', 'zeta',
]);

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
        .filter((card) => card.kind === CardKind.WORD_BUILDING || card.kind === CardKind.SENTENCE_BUILDING)
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

  it('cada nivel presenta sus letras nuevas antes de cualquier silaba o palabra', () => {
    SEEDED_LEVELS.forEach(({ level, cards }) => {
      // Las silabas (MA, ME...) tambien se presentan como LETTER_INTRO; aca importan solo las letras.
      const intros = cards.filter((card) => card.kind === CardKind.LETTER_INTRO && (card.targetPhoneme ?? '').length === 1);
      expect(intros.map((card) => card.targetPhoneme)).toEqual(level.newLetters);

      intros.forEach((intro) => {
        const letter = intro.targetPhoneme ?? '';
        const usesLetter = cards.filter(
          (card) =>
            card.kind !== CardKind.LETTER_INTRO &&
            (card.targetPhoneme?.startsWith(letter) || card.targetWord?.includes(letter) || card.targetSentence?.includes(letter)),
        );
        usesLetter.forEach((card) => expect(card.position).toBeGreaterThan(intro.position));
      });
    });
  });

  /** Vale para el Capitulo 2 (niveles 3 a 5). El nivel 6 tiene la C dura, que no combina con E ni I. */
  it('las silabas de cada consonante vienen en orden y justo despues de su letra', () => {
    SEEDED_LEVELS.filter(({ level }) => level.order <= 5).forEach(({ cards }) => {
      cards
        .filter((card) => card.kind === CardKind.LETTER_INTRO && (card.targetPhoneme ?? '').length === 1)
        .filter((intro) => !'AEIOU'.includes(intro.targetPhoneme ?? ''))
        .forEach((intro) => {
          const letter = intro.targetPhoneme ?? '';
          const following = cards.filter((card) => card.position > intro.position).slice(0, 5);
          expect(following.map((card) => card.targetPhoneme)).toEqual(['A', 'E', 'I', 'O', 'U'].map((v) => `${letter}${v}`));
        });
    });
  });

  it('los botones de letra suenan como fonema y no como nombre de letra', () => {
    SEEDED_LEVELS.flatMap((item) => item.cards)
      .flatMap((card) => card.tiles)
      .filter((tile) => tile.kind === TileKind.LETTER)
      .forEach((tile) => {
        expect(tile.spokenAs).toBeDefined();
        expect(LETTER_NAMES.has(tile.spokenAs ?? '')).toBe(false);
      });

    SEEDED_LEVELS.flatMap((item) => item.cards)
      .filter((card) => card.kind === CardKind.LETTER_INTRO)
      .forEach((card) => expect(card.voiceTarget).toBe(card.spokenAs));
  });

  /**
   * El banco tiene que ser mas grande que la sesion: dominar pide tres sesiones
   * como minimo, y si las tres fueran iguales el chico memoriza las respuestas.
   */
  it('cada nivel tiene mas tarjetas que las que entran en una sesion', () => {
    SEEDED_LEVELS.forEach(({ level, cards }) => {
      const perSession = level.sessionDraw.reduce((acc, draw) => acc + draw.count, 0);
      expect({ nivel: level.order, banco: cards.length, sesion: perSession }).toEqual(
        expect.objectContaining({ banco: expect.any(Number) }),
      );
      expect(cards.length).toBeGreaterThan(perSession);
    });
  });

  it('la receta de cada nivel solo pide bolsas que existen, y ninguna tarjeta queda fuera de la receta', () => {
    SEEDED_LEVELS.forEach(({ level, cards }) => {
      const groups = new Set(cards.map((card) => card.group));
      level.sessionDraw.forEach((draw) => {
        expect({ nivel: level.order, bolsa: draw.group, existe: groups.has(draw.group) }).toEqual({
          nivel: level.order,
          bolsa: draw.group,
          existe: true,
        });
      });

      const recipe = new Set(level.sessionDraw.map((draw) => draw.group));
      cards.forEach((card) => expect({ tarjeta: card.id, enReceta: recipe.has(card.group) }).toEqual({ tarjeta: card.id, enReceta: true }));
    });
  });

  it('las tarjetas de armado traen botones de mas, para que no se resuelvan por descarte', () => {
    SEEDED_LEVELS.flatMap((item) => item.cards)
      .filter((card) => card.kind === CardKind.WORD_BUILDING)
      .forEach((card) => {
        expect(card.tiles.length).toBeGreaterThan(card.solution.length);
      });
  });
});
