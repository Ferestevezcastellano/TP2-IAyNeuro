import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SpeechRecognitionPort, SpeechTranscription } from '../../core/ports';

/** Bytes de cabecera de un WAV canonico, antes de las muestras. */
const WAV_HEADER_BYTES = 44;

/**
 * Reconocimiento real, offline y sin costo, con Vosk.
 *
 * Es opcional a proposito: el modelo son unos 50 MB que hay que bajar a mano y
 * el binding es nativo, dos cosas que no queremos entre el `npm install` y la
 * demo. Se activa con AMI_SPEECH_PROVIDER=vosk y AMI_VOSK_MODEL_PATH apuntando
 * al modelo descomprimido.
 *
 * Espera audio WAV PCM 16 bits mono a la frecuencia del modelo (16 kHz para
 * vosk-model-small-es-0.42).
 */
@Injectable()
export class VoskSpeechRecognitionProvider extends SpeechRecognitionPort implements OnModuleInit {
  readonly name = 'vosk';
  private readonly logger = new Logger(VoskSpeechRecognitionProvider.name);
  private model: unknown = null;
  private vosk: any = null;

  async onModuleInit(): Promise<void> {
    const modelPath = process.env.AMI_VOSK_MODEL_PATH;
    if (!modelPath) {
      throw new Error(
        'AMI_SPEECH_PROVIDER=vosk requiere AMI_VOSK_MODEL_PATH apuntando al modelo descomprimido.',
      );
    }

    try {
      // Carga diferida: vosk no esta en dependencies para que la demo no lo necesite.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.vosk = require('vosk');
    } catch {
      throw new Error('Falta la dependencia opcional vosk. Instalala con: npm install vosk');
    }

    this.vosk.setLogLevel(-1);
    this.model = new this.vosk.Model(modelPath);
    this.logger.log(`Modelo Vosk cargado desde ${modelPath}.`);
  }

  async transcribe(audio: Buffer, expected: string): Promise<SpeechTranscription> {
    const sampleRate = Number(process.env.AMI_VOSK_SAMPLE_RATE ?? 16000);

    // Acotar el vocabulario a lo que la tarjeta espera sube muchisimo la
    // precision con habla infantil, que es justo donde el modelo generico falla.
    const grammar = JSON.stringify([expected.toLowerCase(), '[unk]']);
    const recognizer = new this.vosk.Recognizer({ model: this.model, sampleRate, grammar });

    try {
      recognizer.acceptWaveform(this.stripWavHeader(audio));
      const result = recognizer.finalResult();
      return {
        transcript: String(result.text ?? ''),
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.6,
        provider: this.name,
      };
    } finally {
      recognizer.free();
    }
  }

  private stripWavHeader(audio: Buffer): Buffer {
    const isWav = audio.length > WAV_HEADER_BYTES && audio.subarray(0, 4).toString('ascii') === 'RIFF';
    return isWav ? audio.subarray(WAV_HEADER_BYTES) : audio;
  }
}
