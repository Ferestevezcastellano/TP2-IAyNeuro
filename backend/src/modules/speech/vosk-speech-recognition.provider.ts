import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CardRepository, LevelRepository, SpeechRecognitionPort, SpeechTranscription } from '../../core/ports';
import { SILABAS, enGramatica, vocabularioDe } from './vocabulario';

/** Bytes de cabecera de un WAV canonico, antes de las muestras. */
const WAV_HEADER_BYTES = 44;

/** Cuantas hipotesis se piden al reconocer con el vocabulario completo. */
const HIPOTESIS = 3;

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
export class VoskSpeechRecognitionProvider extends SpeechRecognitionPort implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(VoskSpeechRecognitionProvider.name);
  private model: unknown = null;
  private vosk: any = null;
  /** Palabras del contenido que compiten con la esperada. Se arma al arrancar. */
  private palabras: string[] = [];

  constructor(
    private readonly levels: LevelRepository,
    private readonly cards: CardRepository,
  ) {
    super();
  }

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

  /**
   * El vocabulario sale del repositorio, no de los datos semilla. Se arma
   * recien aca, cuando todos los modulos ya terminaron de iniciarse: antes, el
   * contenido podria no estar cargado todavia.
   */
  async onApplicationBootstrap(): Promise<void> {
    const niveles = await this.levels.findAll();
    this.palabras = vocabularioDe(await this.cards.findByLevelIds(niveles.map((nivel) => nivel.id)));
    this.logger.log(`Vocabulario de Vosk armado con ${this.palabras.length} palabras.`);
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
    // ("aaa" es la palabra "a"), mas competidores para que no lo fuerce.
    const esperadas = expected
      .toLowerCase()
      .split(/\s+/)
      .map((palabra) => palabra.replace(/(.)\1+/g, '$1'))
      .filter(Boolean);
    const unaSola = esperadas.length === 1;
    const sonido = unaSola && (esperadas[0].length === 1 || SILABAS.includes(esperadas[0]));

    // Sonido, silaba o palabra: contra las silabas. Asi una palabra dicha
    // despacio sale partida ("me sa") en vez de forzada a otra palabra entera.
    let transcript = '';
    let confidence = 0.6;
    if (!esperadas.length || unaSola) {
      const result = this.reconocer(audio, sampleRate, [...esperadas, ...SILABAS], 0);
      transcript = this.limpiar(result.text);
      // Si se esperaba una sola palabra y salio partida ("is la"), se junta.
      if (unaSola) transcript = transcript.replace(/ /g, '');
      if (typeof result.confidence === 'number') confidence = result.confidence;
    }

    // Palabra u oracion: ademas, contra todo el vocabulario de la app. Si el
    // chico dijo otra palabra real, aca sale esa palabra y no la esperada.
    let alternatives: string[] | undefined;
    if (!sonido && esperadas.length) {
      const deEsperadas = esperadas.flatMap(enGramatica);
      const result = this.reconocer(audio, sampleRate, [...deEsperadas, ...this.palabras, ...SILABAS], HIPOTESIS);
      alternatives = (result.alternatives ?? []).map((alternativa: { text?: string }) => this.limpiar(alternativa.text));
      if (!unaSola) transcript = alternatives?.[0] ?? '';
    }

    this.logger.debug(`Esperaba "${expected}", escuche "${transcript}"${alternatives ? ` (${alternatives.join(' | ')})` : ''}.`);
    return { transcript, confidence, provider: this.name, alternatives };
  }

  /** Una pasada de Vosk con la gramatica dada. Con `alternativas` > 0 devuelve las N mejores. */
  private reconocer(audio: Buffer, sampleRate: number, palabras: string[], alternativas: number): any {
    const grammar = [...new Set(palabras), '[unk]'];
    const recognizer = new this.vosk.Recognizer({ model: this.model, sampleRate, grammar });
    try {
      if (alternativas) recognizer.setMaxAlternatives(alternativas);
      recognizer.acceptWaveform(this.stripWavHeader(audio));
      return recognizer.finalResult();
    } finally {
      recognizer.free();
    }
  }

  private limpiar(texto: unknown): string {
    return String(texto ?? '').replace(/\[unk\]/g, '').replace(/\s+/g, ' ').trim();
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
