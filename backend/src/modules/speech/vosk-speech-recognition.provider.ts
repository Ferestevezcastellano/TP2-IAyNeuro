import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SpeechRecognitionPort, SpeechTranscription } from '../../core/ports';

/** Bytes de cabecera de un WAV canonico, antes de las muestras. */
const WAV_HEADER_BYTES = 44;

const VOCALES = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTES = ['m', 'p', 's', 'l', 'n', 'd', 'f', 't', 'b', 'c', 'r', 'g', 'j', 'v', 'z', 'y', 'ch'];

/**
 * Distractores del vocabulario: las vocales y todas las silabas directas. Con
 * solo la palabra esperada en el vocabulario, Vosk la "escucha" diga lo que
 * diga el chico; con los distractores, un "me" dicho en lugar de "ma" sale "me".
 */
const DISTRACTORES = [...VOCALES, ...CONSONANTES.flatMap((c) => VOCALES.map((v) => c + v))];

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
  private readonly logger = new Logger(VoskSpeechRecognitionProvider.name);
  private model: unknown = null;
  private vosk: any = null;

  /**
   * `vosk` solo si el modelo cargo. Si no, el frontend no le manda audio y
   * muestra el aviso de que este navegador no reconoce la voz.
   */
  get name(): string {
    return this.model ? 'vosk' : 'vosk-sin-modelo';
  }

  /**
   * Si Vosk no carga (falta el modelo, o una libreria del sistema), el servidor
   * arranca igual: sin reconocimiento por servidor, pero con todo lo demas. Que
   * la voz de Linux falle no puede tirar la app entera.
   */
  async onModuleInit(): Promise<void> {
    try {
      this.cargarModelo();
    } catch (error) {
      this.model = null;
      this.logger.error(`Vosk no cargo; sigo sin reconocimiento por servidor. ${(error as Error).message}`);
    }
  }

  private cargarModelo(): void {
    const modelPath = process.env.AMI_VOSK_MODEL_PATH;
    if (!modelPath) {
      throw new Error('AMI_SPEECH_PROVIDER=vosk requiere AMI_VOSK_MODEL_PATH apuntando al modelo descomprimido.');
    }
    // vosk-koffi no falla con una ruta mala: devuelve un modelo vacio y
    // revienta recien al reconocer. Por eso se mira antes que este el modelo.
    if (!existsSync(join(modelPath, 'am')) || !existsSync(join(modelPath, 'conf'))) {
      throw new Error(`No hay un modelo de Vosk en ${modelPath}.`);
    }

    // Carga diferida: vosk no esta en dependencies para que la demo no lo
    // necesite. `vosk-koffi` es la misma API con binarios ya compilados, y es
    // la que anda en Node 20+; `vosk` queda como alternativa.
    this.vosk = this.cargar('vosk-koffi') ?? this.cargar('vosk');
    if (!this.vosk) {
      throw new Error('Falta la dependencia opcional de Vosk. Instalala con: npm install vosk-koffi');
    }

    this.vosk.setLogLevel(-1);
    this.model = new this.vosk.Model(modelPath);
    this.logger.log(`Modelo Vosk cargado desde ${modelPath}.`);
  }

  async transcribe(audio: Buffer, expected: string): Promise<SpeechTranscription> {
    if (!this.model) return { transcript: '', confidence: 0, provider: this.name };
    const sampleRate = Number(process.env.AMI_VOSK_SAMPLE_RATE ?? 16000);

    // Acotar el vocabulario sube muchisimo la precision con habla infantil, que
    // es justo donde el modelo generico falla. Va lo esperado, sin estirar
    // ("aaa" es la palabra "a"), mas los distractores para que no lo fuerce.
    const esperadas = expected
      .toLowerCase()
      .split(/\s+/)
      .map((palabra) => palabra.replace(/(.)\1+/g, '$1'))
      .filter(Boolean);
    const grammar = [...new Set([...esperadas, ...DISTRACTORES]), '[unk]'];
    const recognizer = new this.vosk.Recognizer({ model: this.model, sampleRate, grammar });

    try {
      recognizer.acceptWaveform(this.stripWavHeader(audio));
      const result = recognizer.finalResult();
      let transcript = String(result.text ?? '').replace(/\[unk\]/g, '').replace(/\s+/g, ' ').trim();
      // Con las silabas como distractores, una palabra dicha despacio puede
      // salir partida ("is la"). Si se esperaba una sola palabra, se juntan.
      if (esperadas.length === 1) transcript = transcript.replace(/ /g, '');
      this.logger.debug(`Esperaba "${expected}", escuche "${transcript}".`);
      return {
        transcript,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.6,
        provider: this.name,
      };
    } finally {
      recognizer.free();
    }
  }

  private cargar(nombre: string): any {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require(nombre);
    } catch {
      return null;
    }
  }

  private stripWavHeader(audio: Buffer): Buffer {
    const isWav = audio.length > WAV_HEADER_BYTES && audio.subarray(0, 4).toString('ascii') === 'RIFF';
    return isWav ? audio.subarray(WAV_HEADER_BYTES) : audio;
  }
}
