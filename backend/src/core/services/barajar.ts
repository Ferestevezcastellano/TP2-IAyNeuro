/**
 * Mezcla parejo (Fisher-Yates): cada orden posible sale con la misma
 * probabilidad. Ordenar con `() => Math.random() - 0.5`, que es lo que hacía
 * el repaso, no baraja parejo: algunas tarjetas salían primero más seguido.
 *
 * El generador se recibe para que un test pueda fijar el resultado.
 */
export function barajar<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
