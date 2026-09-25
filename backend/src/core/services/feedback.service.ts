import { Injectable } from '@nestjs/common';
import { Card, CardKind, VoiceSays } from '../domain';
import { AssemblyResult } from './word-assembly.validator';

/**
 * Feedback con la estructura Valoro / Me pregunto / Sugiero del pilar 2.
 * Lo dice la mascota, va en mayuscula como toda la interfaz de primer grado, y
 * nunca senala un error sin antes reconocer lo que el chico si resolvio.
 */
export interface Feedback {
  tone: FeedbackTone;
  /** Lo que salio bien. */
  valoro: string;
  /** El error, senalado en forma de pregunta y no de reproche. */
  mePregunto: string | null;
  /** Que conviene intentar ahora. */
  sugiero: string;
}

export enum FeedbackTone {
  CELEBRATE = 'CELEBRATE',
  ENCOURAGE = 'ENCOURAGE',
  GUIDE = 'GUIDE',
}

@Injectable()
export class FeedbackService {
  /** Feedback del armado por botones. */
  forAssembly(card: Card, result: AssemblyResult, attemptNumber: number): Feedback {
    const target = (card.targetWord ?? card.targetSentence ?? card.targetPhoneme ?? '').toUpperCase();

    if (card.kind === CardKind.LETTER_INTRO) {
      const unit = card.targetPhoneme ?? '';
      return {
        tone: FeedbackTone.CELEBRATE,
        valoro:
          unit.length > 1
            ? `¡${unit.split('').join(' Y ')} JUNTAS SUENAN ${card.spokenAs.toUpperCase()}!`
            : `¡ESA ES LA ${unit}! SUENA ${card.spokenAs.toUpperCase()}.`,
        mePregunto: null,
        sugiero: card.voiceTarget ? this.voiceRequest(card) : 'SEGUIMOS CON LA QUE VIENE.',
      };
    }

    if (result.correct) {
      return {
        tone: FeedbackTone.CELEBRATE,
        valoro: attemptNumber === 1 ? `¡LO ARMASTE DE UNA! ${target}.` : `¡AHORA SI! ${target}.`,
        mePregunto: null,
        sugiero: card.voiceTarget ? this.voiceRequest(card) : 'SEGUIMOS CON LA QUE VIENE.',
      };
    }

    if (result.matchedPrefixLength > 0) {
      return {
        tone: FeedbackTone.GUIDE,
        valoro: `LOS PRIMEROS ${result.matchedPrefixLength} ESTÁN BIEN.`,
        mePregunto: '¿ESCUCHAMOS OTRA VEZ EL SONIDO QUE SIGUE?',
        sugiero: this.hint(card),
      };
    }

    if (!result.complete) {
      return {
        tone: FeedbackTone.ENCOURAGE,
        valoro: 'EMPEZASTE BIEN.',
        mePregunto: `¿FALTAN SONIDOS? NECESITAMOS ${result.expectedLength}.`,
        sugiero: this.hint(card),
      };
    }

    return {
      tone: FeedbackTone.ENCOURAGE,
      valoro: 'TE ANIMASTE A PROBAR.',
      mePregunto: '¿CUÁL ES EL PRIMER SONIDO?',
      sugiero: this.hint(card),
    };
  }

  /**
   * El pedido de voz, diciendo QUE hay que decir. "Decilo" a secas, despues de
   * elegir un dibujo, dejaba al chico sin saber si iba la letra o la palabra.
   */
  voiceRequest(card: Card): string {
    const label = card.voiceLabel ?? '';
    switch (card.voiceSays) {
      case VoiceSays.SOUND:
        // En las vocales (niveles 1 y 2) se pide la letra; en las consonantes,
        // el sonido, porque el nombre ("eme") no es lo que se practica.
        return /^[AEIOUÁÉÍÓÚ]$/.test(label)
          ? `AHORA DECÍ VOS LA LETRA ${label}, BIEN LARGA.`
          : `AHORA DECÍ VOS EL SONIDO DE LA ${label}, BIEN LARGO.`;
      case VoiceSays.SYLLABLE:
        return `AHORA DECÍ VOS ${label}.`;
      case VoiceSays.WORD:
        return `AHORA DECÍ VOS LA PALABRA ${label}.`;
      case VoiceSays.SENTENCE:
        return 'AHORA DECÍ VOS LA ORACIÓN ENTERA.';
      default:
        return 'AHORA DECILO EN VOZ ALTA PARA QUE TE ESCUCHE.';
    }
  }

  /** Feedback de la verificacion por voz. */
  forVoice(card: Card, accepted: boolean, similarity: number): Feedback {
    const target = (card.voiceTarget ?? card.targetWord ?? '').toUpperCase();

    if (accepted) {
      return {
        tone: FeedbackTone.CELEBRATE,
        valoro: `¡TE ESCUCHÉ PERFECTO! DIJISTE ${target}.`,
        mePregunto: null,
        sugiero: 'SEGUIMOS CON LA QUE VIENE.',
      };
    }

    if (similarity >= 0.4) {
      return {
        tone: FeedbackTone.GUIDE,
        valoro: 'CASI CASI, TE ESCUCHÉ MUY PARECIDO.',
        mePregunto: '¿LO DECIMOS UNA VEZ MÁS, BIEN DESPACITO?',
        sugiero: `ESCUCHÁ CÓMO SUENA ${target} Y REPETILO.`,
      };
    }

    return {
      tone: FeedbackTone.ENCOURAGE,
      valoro: 'GRACIAS POR PROBAR CON TU VOZ.',
      mePregunto: '¿SE ESCUCHÓ BIEN O HABÍA MUCHO RUIDO?',
      sugiero: `TOCÁ LA IMAGEN PARA ESCUCHAR ${target} Y PROBÁ DE NUEVO.`,
    };
  }

  /** Feedback de cierre de sesion. */
  forSessionEnd(accuracy: number, mastered: boolean, masteredNow: boolean, sessionsRemaining: number): Feedback {
    if (masteredNow) {
      return {
        tone: FeedbackTone.CELEBRATE,
        valoro: '¡DOMINASTE ESTE NIVEL! GANASTE TUS 3 ESTRELLAS.',
        mePregunto: null,
        sugiero: 'ELEGÍ DÓNDE PONERLE EL ACCESORIO NUEVO A TU AMI.',
      };
    }

    if (mastered) {
      return {
        tone: FeedbackTone.CELEBRATE,
        valoro: 'VOLVISTE A PRACTICAR UN NIVEL QUE YA DOMINÁS.',
        mePregunto: null,
        sugiero: 'PROBÁ EL NIVEL QUE SIGUE O PASÁ POR REPASO.',
      };
    }

    if (accuracy >= 0.8) {
      return {
        tone: FeedbackTone.CELEBRATE,
        valoro: '¡SALIÓ MUY BIEN ESTA VEZ!',
        mePregunto: null,
        sugiero:
          sessionsRemaining > 0
            ? `CON ${sessionsRemaining} PRÁCTICA${sessionsRemaining === 1 ? '' : 'S'} MÁS ASÍ, EL NIVEL ES TUYO.`
            : 'UNA MÁS ASÍ Y EL NIVEL ES TUYO.',
      };
    }

    if (accuracy >= 0.5) {
      return {
        tone: FeedbackTone.ENCOURAGE,
        valoro: 'RESOLVISTE VARIAS TARJETAS SOLO.',
        mePregunto: '¿CUÁL FUE LA MÁS DIFÍCIL?',
        sugiero: 'MAÑANA LA VOLVEMOS A INTENTAR JUNTOS.',
      };
    }

    return {
      tone: FeedbackTone.ENCOURAGE,
      valoro: 'LLEGASTE HASTA EL FINAL DE LA PRÁCTICA.',
      mePregunto: '¿ESCUCHAMOS LOS SONIDOS UNA VEZ MÁS?',
      sugiero: 'PASÁ POR REPASO Y VOLVEMOS A ESTE NIVEL.',
    };
  }

  private hint(card: Card): string {
    switch (card.kind) {
      case CardKind.LETTER_INTRO:
        return 'TOCÁ LA LETRA GRANDE Y ESCUCHÁ CÓMO SUENA.';
      case CardKind.SOUND_RECOGNITION:
        return 'TOCÁ EL ALTAVOZ Y ESCUCHÁ CÓMO EMPIEZA CADA DIBUJO.';
      case CardKind.SENTENCE_BUILDING:
        return 'LEEÉ LA ORACIÓN DESDE EL PRINCIPIO Y BUSCÁ LA PALABRA QUE SIGUE.';
      case CardKind.WORD_BUILDING:
      default:
        return 'TOCÁ LA IMAGEN PARA ESCUCHAR LA PALABRA ENTERA Y SEGUÍ EL ORDEN DE LOS SONIDOS.';
    }
  }
}
