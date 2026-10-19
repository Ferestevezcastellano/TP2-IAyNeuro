import { barajar } from './barajar';

/** Generador con semilla: el mismo resultado en cada corrida. */
function sembrado(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe('barajar', () => {
  it('devuelve los mismos elementos, sin tocar el original', () => {
    const original = ['a', 'b', 'c', 'd', 'e'];
    const mezcla = barajar(original, sembrado(1));

    expect([...mezcla].sort()).toEqual(original);
    expect(original).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('con el mismo generador sale el mismo orden', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(barajar(items, sembrado(42))).toEqual(barajar(items, sembrado(42)));
  });

  it('cada orden sale con la misma frecuencia', () => {
    // Con tres elementos hay seis órdenes; en 60.000 mezclas, cada uno ronda 10.000.
    // Ordenar con `() => Math.random() - 0.5` daba un orden casi seis veces más que otro.
    const random = sembrado(7);
    const veces = new Map<string, number>();
    for (let i = 0; i < 60000; i += 1) {
      const orden = barajar(['a', 'b', 'c'], random).join('');
      veces.set(orden, (veces.get(orden) ?? 0) + 1);
    }

    expect(veces.size).toBe(6);
    for (const n of veces.values()) expect(Math.abs(n - 10000)).toBeLessThan(500);
  });
});
