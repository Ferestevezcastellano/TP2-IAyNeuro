import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SpeechRecognitionPort, SpeechTranscription } from '../../core/ports';

/** Debajo de esto damos por hecho que el microfono no capto nada util. */
const MIN_AUDIO_BYTES = 512;

/** De cada 100 audios validos, cuantos se reconocen bien. */
const RECOGNITION_RATE = 80;

/**
 * Reconocedor de utileria para la demo.
 *
 * No escucha: deriva el resultado del contenido del audio de forma
 * determinista, asi el mismo audio da siempre lo mismo y la demo es
 * reproducible. Existe porque la restriccion del TP es costo cero y porque una
 * demo en vivo no puede depender de que la maquina de turno tenga un modelo
 * descargado ni un microfono que ande.
 *
 * Deja pasar un caso de cada cinco como no reconocido a proposito: es lo que
 * permite mostrar el feedback constructivo, que es la mitad de lo que la app
 * tiene para decir sobre los cuatro pilares.
 *
 * Para reconocimiento real, `AMI_SPEECH_PROVIDER=vosk`.
 */
@Injectable()
export class StubSpeechRecognitionProvider extends SpeechRecognitionPort {
  readonly name = 'stub';
  private readonly logger = new Logger(StubSpeechRecognitionProvider.name);

  async transcribe(audio: Buffer, expected: string): Promise<SpeechTranscription> {
    if (audio.length < MIN_AUDIO_BYTES) {
      this.logger.debug(`Audio de ${audio.length} bytes: por debajo del minimo.`);
      return { transcript: '', confidence: 0.1, provider: this.name };
    }

    const digest = createHash('sha1').update(audio).digest();
    const roll = digest.readUInt16BE(0) % 100;

    if (roll < RECOGNITION_RATE) {
      return { transcript: expected, confidence: 0.75 + (roll % 20) / 100, provider: this.name };
    }

    return { transcript: this.degrade(expected, digest[2]), confidence: 0.35 + (roll % 15) / 100, provider: this.name };
  }

  /** Simula una pronunciacion incompleta: se come una letra de la palabra. */
  private degrade(expected: string, seed: number): string {
    const clean = expected.trim();
    if (clean.length <= 2) return '';
    const cut = 1 + (seed % (clean.length - 1));
    return clean.slice(0, cut);
  }
}
