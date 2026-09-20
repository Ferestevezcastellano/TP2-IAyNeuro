/** Resultado crudo del reconocedor, antes de compararlo con lo esperado. */
export interface SpeechTranscription {
  transcript: string;
  confidence: number;
  provider: string;
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
