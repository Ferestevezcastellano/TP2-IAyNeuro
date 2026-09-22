import { Card, CardKind, TileKind } from '../domain';
import { WordAssemblyValidator } from './word-assembly.validator';

const card: Card = {
  id: 'card-mesa',
  levelId: 'level-03-m-s',
  position: 1,
  group: 'PALABRA',
  kind: CardKind.WORD_BUILDING,
  prompt: 'ARMA LA PALABRA',
  targetWord: 'MESA',
  audioKey: 'audio/palabra/mesa',
  spokenAs: 'mesa',
  tiles: ['M', 'E', 'S', 'A'].map((label, index) => ({
    id: `t${index}`,
    label,
    kind: TileKind.LETTER,
  })),
  solution: ['t0', 't1', 't2', 't3'],
};

describe('WordAssemblyValidator', () => {
  const validator = new WordAssemblyValidator();

  it('acepta la secuencia exacta', () => {
    const result = validator.validate(card, ['t0', 't1', 't2', 't3']);

    expect(result.correct).toBe(true);
    expect(result.firstWrongIndex).toBeNull();
    expect(result.matchedPrefixLength).toBe(4);
  });

  it('senala el indice del primer boton equivocado', () => {
    const result = validator.validate(card, ['t0', 't1', 't3', 't2']);

    expect(result.correct).toBe(false);
    expect(result.firstWrongIndex).toBe(2);
    expect(result.matchedPrefixLength).toBe(2);
  });

  it('un prefijo correcto pero incompleto no es error todavia', () => {
    const result = validator.validate(card, ['t0', 't1']);

    expect(result.correct).toBe(false);
    expect(result.firstWrongIndex).toBeNull();
    expect(result.complete).toBe(false);
    expect(result.matchedPrefixLength).toBe(2);
  });

  it('rechaza una secuencia mas larga que la solucion', () => {
    const result = validator.validate(card, ['t0', 't1', 't2', 't3', 't0']);

    expect(result.correct).toBe(false);
    expect(result.firstWrongIndex).toBe(4);
  });

  it('con letras repetidas, cualquiera de los dos botones iguales vale en cualquier lugar', () => {
    const masa: Card = {
      ...card,
      id: 'card-masa',
      targetWord: 'MASA',
      tiles: ['M', 'A', 'S', 'A', 'U'].map((label, index) => ({ id: `t${index}`, label, kind: TileKind.LETTER })),
      solution: ['t0', 't1', 't2', 't3'],
    };

    expect(validator.validate(masa, ['t0', 't3', 't2', 't1']).correct).toBe(true);
    expect(validator.validate(masa, ['t0', 't1', 't2', 't4']).firstWrongIndex).toBe(3);
  });

  it('un id que no es de la tarjeta es un error', () => {
    expect(validator.validate(card, ['t0', 'ajeno']).firstWrongIndex).toBe(1);
  });

  it('el casillero vacio no es correcto', () => {
    const result = validator.validate(card, []);

    expect(result.correct).toBe(false);
    expect(result.matchedPrefixLength).toBe(0);
  });
});
