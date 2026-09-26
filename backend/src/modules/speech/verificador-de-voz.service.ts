import { Injectable, Logger } from '@nestjs/common';
import { Card, CardKind, VoiceSays } from '../../core/domain';
import { SpeechRecognitionPort } from '../../core/ports';
import { PhoneticNormalizerService } from '../../core/services';
import { ISOLATED_PHONEME_FLOOR, VOICE_SIMILARITY_THRESHOLD } from '../../core/config/mastery.config';
import { JuezDePronunciacion } from './juez-pronunciacion';
import { sabeVerificar, verificarSonido } from './verificador-acustico';

/** Lo que manda el cliente para verificar cómo se dijo una tarjeta. */
export interface VoiceInput {
  /** Audio grabado, para que lo reconozca el servidor. */
  audioBase64?: string;
  /** Transcripción ya resuelta por el reconocedor del navegador. */
  transcript?: string;
  /** El cliente avisa que no pudo escuchar al chico. */
  unverified?: boolean;
}

/** Veredicto sobre una pronunciación. */
export interface VoiceVerdict {
  /** Si hubo voz para juzgar. Si no, no cuenta como intento: se pide repetir. */
  heard: boolean;
  accepted: boolean;
  /** Si la pronunciación se llegó a comparar de verdad contra lo esperado. */
  verified: boolean;
  transcript: string;
  confidence: number;
  similarity: number;
  provider: string;
}

/**
 * Decide si el chico dijo bien lo que pedía la tarjeta, venga la voz como
 * venga: una transcripción del navegador, audio grabado para que lo reconozca
 * el servidor, o el aviso de que no se pudo escuchar.
 *
 * Cada fuente se juzga distinto porque cada una falla distinto, y en todos los
 * casos la regla es la misma: decirle "así no se dice" a un chico que lo dijo
 * bien es el peor error que puede cometer esta app, así que ante la duda sobre
 * el instrumento el intento queda sin verificar en vez de rechazado.
 *
 * Se inyecta como clase concreta, sin puerto: tiene una sola implementación y
 * nada la reemplaza. `SpeechRecognitionPort`, en cambio, sí tiene dos.
 */
@Injectable()
export class VerificadorDeVoz {
  private readonly logger = new Logger(VerificadorDeVoz.name);

  constructor(
    private readonly speech: SpeechRecognitionPort,
    private readonly phonetics: PhoneticNormalizerService,
    private readonly juez: JuezDePronunciacion,
  ) {}

  async verificar(card: Card, input: VoiceInput): Promise<VoiceVerdict> {
    const expected = card.voiceTarget ?? '';

    if (input.unverified) {
      // El cliente avisa que no pudo escuchar. No se inventa una pronunciacion:
      // el chico avanza, pero el intento queda marcado como no verificado y no
      // suma como acierto de voz en el puntaje ni en el panel docente.
      return { heard: true, accepted: true, verified: false, transcript: '', confidence: 0, similarity: 0, provider: 'none' };
    }

    if (input.transcript !== undefined) {
      return this.juzgarTranscripcionDelNavegador(card, expected, input.transcript);
    }

    return this.juzgarAudio(card, expected, Buffer.from(input.audioBase64 ?? '', 'base64'));
  }

  private juzgarTranscripcionDelNavegador(card: Card, expected: string, transcript: string): VoiceVerdict {
    const similarity = this.phonetics.similarity(transcript, expected);

    // Un fonema aislado ("aaa", "mmm") esta fuera del alcance del reconocedor del
    // navegador. Si el parecido queda muy bajo en una tarjeta de letra nueva, es
    // casi seguro que fallo el reconocedor y no el chico: se registra sin
    // verificar. Con audio grabado no hace falta: lo juzga el analisis acustico,
    // que si detecta el error.
    if (card.kind === CardKind.LETTER_INTRO && similarity < ISOLATED_PHONEME_FLOOR) {
      return { heard: true, accepted: true, verified: false, transcript, confidence: 1, similarity, provider: 'client' };
    }

    const accepted = this.aceptaTexto(card, transcript, undefined, similarity);
    return { heard: true, accepted, verified: true, transcript, confidence: 1, similarity, provider: 'client' };
  }

  private async juzgarAudio(card: Card, expected: string, audio: Buffer): Promise<VoiceVerdict> {
    const recognized = await this.speech.transcribe(audio, expected);
    const { transcript, confidence, alternatives } = recognized;

    // Un sonido suelto o una silaba no son palabras: el reconocedor no los
    // entiende ("mmm" le suena a "i"). Se juzgan por la huella acustica del
    // audio, con lo que oyo Vosk como segundo juez para la vocal.
    const esSonido = card.voiceSays === VoiceSays.SOUND || card.voiceSays === VoiceSays.SYLLABLE;
    if (esSonido && sabeVerificar(expected)) {
      const veredicto = verificarSonido(audio, expected, transcript);
      this.logger.debug(`Sonido "${expected}": ${veredicto.correcto ? 'bien' : 'mal'} · ${veredicto.detalle}`);
      if (!veredicto.escuchado) return this.noEscuchado(recognized.provider);

      // El parecido es el del analisis acustico: 1 si esta bien; si esta mal,
      // "parecido" para que el feedback sea de guia y no de ruido.
      return {
        heard: true,
        accepted: veredicto.correcto,
        verified: true,
        transcript,
        confidence,
        similarity: veredicto.correcto ? 1 : 0.5,
        provider: `${recognized.provider}+acustico`,
      };
    }

    // No se oyo ninguna palabra: no es un error del chico, es que no se escucho.
    if (!transcript.trim()) return this.noEscuchado(recognized.provider);

    const similarity = this.phonetics.similarity(transcript, expected);
    const accepted = this.aceptaTexto(card, transcript, alternatives, similarity);
    return { heard: true, accepted, verified: true, transcript, confidence, similarity, provider: recognized.provider };
  }

  /**
   * Juicio de una pronunciacion ya transcripta. Una oracion se compara palabra
   * por palabra: por letras, "la nena sale" se parece demasiado a "la luna
   * sale" y pasaba. Una palabra perdona las confusiones del reconocedor, salvo
   * que haya oido otra palabra real.
   */
  private aceptaTexto(card: Card, transcript: string, alternatives: string[] | undefined, similarity: number): boolean {
    const expected = card.voiceTarget ?? '';
    if (card.voiceSays === VoiceSays.SENTENCE) {
      return this.juez.aceptaOracion(expected, alternatives?.length ? alternatives : [transcript]);
    }
    if (card.voiceSays === VoiceSays.WORD) return this.juez.aceptaPalabra(expected, transcript, alternatives);
    return similarity >= VOICE_SIMILARITY_THRESHOLD;
  }

  private noEscuchado(provider: string): VoiceVerdict {
    return { heard: false, accepted: false, verified: false, transcript: '', confidence: 0, similarity: 0, provider };
  }
}
