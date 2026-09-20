import { Injectable } from '@nestjs/common';

/**
 * Normaliza texto antes de comparar pronunciaciones, con las equivalencias del
 * espanol rioplatense: un chico de seis anos que dice la palabra bien no tiene
 * por que escribirla bien, y el reconocedor tampoco acierta la ortografia.
 */
@Injectable()
export class PhoneticNormalizerService {
  /**
   * Lleva el texto a una forma donde dos palabras que suenan igual en el
   * rioplatense quedan escritas igual (BACA y VACA, CASA y QUASA, POLLO y POYO).
   */
  normalize(text: string): string {
    const base = text
      .toLowerCase()
      .normalize('NFD')
      // saca tildes pero deja la virgulilla (U+0303), que forma la enie
      .replace(/[̀-̂̄-ͯ]/g, '')
      .replace(/[^a-zñ̃ ]/g, '')
      .replace(/ñ/g, 'ñ')
      .trim()
      .replace(/\s+/g, ' ');

    return (
      base
        // la hache no suena
        .replace(/h/g, '')
        // digrafos primero, para que las reglas de letra suelta no los rompan
        .replace(/ch/g, 'ĉ')
        .replace(/ll/g, 'y')
        .replace(/rr/g, 'R')
        // la u de QUE y GUE es muda: marca la consonante dura y desaparece
        .replace(/qu([ei])/g, 'k$1')
        .replace(/gu([ei])/g, 'G$1')
        // seseo: la c suave, la z y la s son el mismo sonido
        .replace(/c([ei])/g, 's$1')
        .replace(/z/g, 's')
        .replace(/c/g, 'k')
        .replace(/q/g, 'k')
        .replace(/x/g, 'ks')
        // la ge y la gi suenan como jota
        .replace(/g([ei])/g, 'x$1')
        .replace(/j/g, 'x')
        .replace(/G/g, 'g')
        // la b y la v no se distinguen
        .replace(/v/g, 'b')
        .replace(/w/g, 'b')
        // la y al final de palabra es vocal (REY suena REI)
        .replace(/y(?![a-zñ])/g, 'i')
    );
  }

  /** Distancia de edicion clasica, sobre el texto ya normalizado. */
  levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      }
      previous = current;
    }

    return previous[b.length];
  }

  /**
   * Similitud entre 0 y 1 de lo que se escucho contra lo que se esperaba.
   * Compara formas normalizadas, asi que ROSA contra ROZA da 1.
   */
  similarity(heard: string, expected: string): number {
    const a = this.normalize(heard);
    const b = this.normalize(expected);

    if (a.length === 0 && b.length === 0) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const distance = this.levenshtein(a, b);
    return Math.max(0, 1 - distance / Math.max(a.length, b.length));
  }
}
