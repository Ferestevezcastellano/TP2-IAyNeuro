/** Resultado crudo del reconocedor, antes de compararlo con lo esperado. */
export interface SpeechTranscription {
  transcript: string;
  confidence: number;
  provider: string;
  /**
   * Las mejores hipotesis (la primera, la mas probable) de un reconocimiento
   * con todo el vocabulario de la app compitiendo con lo esperado. Solo para
   * palabras y oraciones, y solo si el adaptador las sabe dar: permiten ver si
   * se dijo OTRA palabra real en vez de la pedida.
   */
  alternatives?: string[];
}

/**
 * Puerto de reconocimiento de voz. Lo implementa el stub determinista que usa la
 * demo y, opcionalmente, un adaptador Vosk que corre el modelo en la maquina.
 */
export abstract class SpeechRecognitionPort {
  abstract readonly name: string;
  /**
   * @param audio audio del chico, ya decodificado
   * @param expected lo que se esperaba escuchar, disponible para los adaptadores
   *   que pueden acotar el vocabulario (Vosk lo usa; el stub tambien)
   */
  abstract transcribe(audio: Buffer, expected: string): Promise<SpeechTranscription>;
}
