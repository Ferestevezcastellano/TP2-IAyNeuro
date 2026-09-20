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
 */
@Injectable()
export class WordAssemblyValidator {
  validate(card: Card, sequence: string[]): AssemblyResult {
    const expected = card.solution;
    let matched = 0;

    while (matched < sequence.length && matched < expected.length && sequence[matched] === expected[matched]) {
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
