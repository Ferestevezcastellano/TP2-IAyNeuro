import { Injectable } from '@nestjs/common';
import { Card } from '../domain';

export interface AssemblyResult {
  correct: boolean;
  /** Indice del primer boton equivocado, o null si no hubo error. */
  firstWrongIndex: number | null;
  expectedLength: number;
  /** Cuantos botones desde el principio coinciden con la solucion. */
  matchedPrefixLength: number;
  complete: boolean;
}

/**
 * Compara la secuencia de botones tocados contra la solucion de la tarjeta.
 * Informa el primer error en vez de un simple falso, para que la interfaz pueda
 * senalar el casillero exacto en lugar de borrar todo lo que el chico armo.
 *
 * Compara por lo que dice el boton y no por su id: en MASA hay dos botones A y
 * cualquiera de los dos vale en cualquiera de los dos lugares.
 */
@Injectable()
export class WordAssemblyValidator {
  validate(card: Card, sequence: string[]): AssemblyResult {
    const labelOf = new Map(card.tiles.map((tile) => [tile.id, tile.label]));
    const expected = card.solution.map((tileId) => labelOf.get(tileId));
    const touched = sequence.map((tileId) => labelOf.get(tileId));

    let matched = 0;
    while (
      matched < touched.length &&
      matched < expected.length &&
      touched[matched] !== undefined &&
      touched[matched] === expected[matched]
    ) {
      matched += 1;
    }

    const firstWrongIndex = matched < sequence.length ? matched : null;
    const complete = sequence.length === expected.length;

    return {
      correct: firstWrongIndex === null && complete,
      firstWrongIndex,
      expectedLength: expected.length,
      matchedPrefixLength: matched,
      complete,
    };
  }
}
