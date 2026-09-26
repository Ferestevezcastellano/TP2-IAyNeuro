import { Card } from '../domain';

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
 * Decide si el chico dijo bien lo que pedía la tarjeta.
 *
 * Es un puerto aparte de `SpeechRecognitionPort` porque reconocer y juzgar son
 * cosas distintas: una transcripción puede venir del navegador sin pasar por
 * ningún reconocedor, y un sonido suelto se juzga por su huella acústica y no
 * por lo que transcribió nadie. Quien conduce la sesión solo necesita el
 * veredicto, no cómo se llegó a él.
 */
export abstract class VerificadorDeVozPort {
  abstract verificar(card: Card, input: VoiceInput): Promise<VoiceVerdict>;
}
