import { Injectable } from '@nestjs/common';
import { Card, Level } from '../domain';

/**
 * Arma el mazo de una sesion sorteando tarjetas del banco del nivel segun la
 * receta `level.sessionDraw`, y las devuelve en orden pedagogico (`position`):
 * primero la letra nueva, despues las silabas, despues las palabras.
 *
 * Existe porque el dominio se mide sobre varias sesiones, y si las tres fueran
 * identicas el chico terminaria memorizando cual dibujo va con cual sonido en
 * vez de escuchar el sonido.
 */
@Injectable()
export class SessionDeckService {
  draw(level: Level, pool: Card[], random: () => number = Math.random): Card[] {
    const chosen: Card[] = [];

    for (const { group, count } of level.sessionDraw) {
      const bag = this.shuffle(
        pool.filter((card) => card.group === group),
        random,
      );
      chosen.push(...bag.slice(0, count));
    }

    return chosen.sort((a, b) => a.position - b.position);
  }

  private shuffle<T>(items: T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
