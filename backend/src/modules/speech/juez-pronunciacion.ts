import { Injectable } from '@nestjs/common';
import { VOCALES } from '../../core/config/phonemes';
import { VOICE_SIMILARITY_THRESHOLD } from '../../core/config/mastery.config';
import { PhoneticNormalizerService } from '../../core/services/phonetic-normalizer.service';
import { SILABAS } from './vocabulario';

/**
 * Decide si una palabra u oración se dijo bien, a partir de lo que oyó el
 * reconocedor. Los sonidos sueltos y las sílabas no pasan por acá: los juzga
 * `verificador-acustico`.
 *
 * Los dos errores cuestan distinto según la tarjeta:
 *
 * - En una PALABRA el chico acaba de armarla tocando sus letras, así que decir
 *   otra es raro y rechazar la bien dicha es lo que más frustra. Se perdonan
 *   las confusiones típicas del reconocedor (M/N/L, una vocal por otra, un
 *   ruido al empezar), salvo que Vosk haya oído otra palabra real parecida.
 * - En una ORACIÓN lo que hay que atrapar es decir otra oración. Se compara
 *   palabra por palabra: cada palabra con contenido tiene que estar, en orden.
 *   Parecerse en letras no alcanza ("la nena sale" no es "la luna sale").
 */

/**
 * Parecido mínimo, con las confusiones típicas del reconocedor ya descontadas,
 * para aceptar una palabra. Es el mismo umbral que el resto de la verificación
 * por voz: calibrarlo en un solo lugar alcanza.
 */
const UMBRAL_PALABRA = VOICE_SIMILARITY_THRESHOLD;
/** Parecido mínimo (estricto, letra a letra) para que una palabra de la oración cuente como dicha. */
const UMBRAL_PALABRA_EN_ORACION = 0.75;
/**
 * Error tolerado en una oración: un artículo o palabra corta ("el", "la", "en")
 * mal oído. Una palabra con contenido que falte o esté cambiada ya no pasa.
 */
const TOLERANCIA_ORACION = 0.5;
/** Hipótesis del reconocedor que se miran para dar por buena una palabra u oración. */
const HIPOTESIS_PALABRA = 3;
const HIPOTESIS_ORACION = 2;

/** Sonidos que el reconocedor confunde entre sí con habla infantil. */
const PARECIDOS = [new Set('mnñl'), new Set('pb'), new Set('td'), new Set('kg')];

@Injectable()
export class JuezDePronunciacion {
  constructor(private readonly phonetics: PhoneticNormalizerService) {}

  /**
   * @param oido lo mejor que oyó el reconocedor (con Vosk, contra las sílabas)
   * @param alternativas hipótesis de Vosk con todo el vocabulario compitiendo;
   *   sin ellas (reconocimiento del navegador) se compara solo `oido`
   */
  aceptaPalabra(esperado: string, oido: string, alternativas?: string[]): boolean {
    if (!alternativas) return this.phonetics.similarity(oido, esperado) >= UMBRAL_PALABRA;

    const buscada = this.phonetics.normalize(esperado);
    const hipotesis = alternativas.slice(0, HIPOTESIS_PALABRA);
    if (hipotesis.some((h) => this.phonetics.normalize(h.replace(/ /g, '')) === buscada)) return true;

    // Vosk oyó otra palabra real y parecida a la pedida (MASA en vez de MESA):
    // compitiendo las dos, ganó la otra, así que el chico dijo la otra. Si la que
    // oyó no se parece en nada, es más probable que el reconocedor se haya
    // perdido que un chico que acaba de armar OSO diga CASA: decide la primera pasada.
    const primera = hipotesis[0]?.trim() ?? '';
    const otraPalabra = primera && !primera.includes(' ') && !SILABAS.includes(primera);
    if (otraPalabra && this.parecidoFonetico(primera, esperado) >= UMBRAL_PALABRA) return false;

    return this.parecidoFonetico(oido, esperado) >= UMBRAL_PALABRA;
  }

  /** Acepta si alguna de las mejores hipótesis tiene todas las palabras de la oración, en orden. */
  aceptaOracion(esperado: string, candidatos: string[]): boolean {
    return candidatos.slice(0, HIPOTESIS_ORACION).some((c) => this.costoOracion(c, esperado) <= TOLERANCIA_ORACION);
  }

  /**
   * Parecido entre 0 y 1 que cobra la mitad las confusiones típicas del
   * reconocedor: una vocal por otra, M/N/L, P/B, T/D, K/G, y una letra
   * de más en los bordes de lo oído (un soplido o un ruido al arrancar o al
   * terminar). Una letra que FALTA cuesta entera: "la" no es "tela".
   */
  parecidoFonetico(oido: string, esperado: string): number {
    const a = this.phonetics.normalize(oido).replace(/ /g, '');
    const b = this.phonetics.normalize(esperado).replace(/ /g, '');
    if (!a || !b) return 0;

    const costo = (x: string, y: string) => {
      if (x === y) return 0;
      if (VOCALES.includes(x) && VOCALES.includes(y)) return 0.5;
      return PARECIDOS.some((g) => g.has(x) && g.has(y)) ? 0.5 : 1;
    };

    let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i += 1) {
      const actual = [i * 0.5];
      for (let j = 1; j <= b.length; j += 1) {
        // Sobra la letra a[i-1]: barata si está en un borde de lo esperado.
        const sobra = previa[j] + (j === 0 || j === b.length ? 0.5 : 1);
        // Falta la letra b[j-1].
        const falta = actual[j - 1] + 1;
        actual[j] = Math.min(sobra, falta, previa[j - 1] + costo(a[i - 1], b[j - 1]));
      }
      previa = actual;
    }
    return Math.max(0, 1 - previa[b.length] / Math.max(a.length, b.length));
  }

  /** Las palabras cortas ("el", "la", "en") pesan la mitad: el reconocedor las confunde seguido. */
  private peso(palabra: string): number {
    return this.phonetics.normalize(palabra).length <= 2 ? 0.5 : 1;
  }

  /**
   * Cuánto hay que corregir lo oído para llegar a la oración, palabra por
   * palabra. Una palabra esperada puede corresponder a hasta tres palabras oídas
   * seguidas, porque Vosk a veces parte una palabra en sílabas ("sa le") o en las
   * partes de un alias ("tu can").
   */
  private costoOracion(oido: string, esperado: string): number {
    const O = oido.toLowerCase().split(/\s+/).filter(Boolean);
    const E = esperado.toLowerCase().split(/\s+/).filter(Boolean);
    const d = Array.from({ length: E.length + 1 }, () => new Array<number>(O.length + 1).fill(Infinity));
    d[0][0] = 0;

    for (let i = 0; i <= E.length; i += 1) {
      for (let j = 0; j <= O.length; j += 1) {
        const base = d[i][j];
        if (base === Infinity) continue;
        if (i < E.length) d[i + 1][j] = Math.min(d[i + 1][j], base + this.peso(E[i]));
        if (j < O.length) d[i][j + 1] = Math.min(d[i][j + 1], base + this.peso(O[j]));
        if (i === E.length) continue;
        for (let k = 1; k <= 3 && j + k <= O.length; k += 1) {
          const junto = O.slice(j, j + k).join('');
          const coincide = this.phonetics.similarity(junto, E[i]) >= UMBRAL_PALABRA_EN_ORACION;
          d[i + 1][j + k] = Math.min(d[i + 1][j + k], base + (coincide ? 0 : this.peso(E[i])));
        }
      }
    }
    return d[E.length][O.length];
  }
}
