import { Global, Module, Provider } from '@nestjs/common';
import { SpeechRecognitionPort, VerificadorDeVozPort } from '../../core/ports';
import { JuezDePronunciacion } from './juez-pronunciacion';
import { StubSpeechRecognitionProvider } from './stub-speech-recognition.provider';
import { VerificadorDeVoz } from './verificador-de-voz.service';
import { VoskSpeechRecognitionProvider } from './vosk-speech-recognition.provider';

/**
 * Elige el reconocedor por variable de entorno. Es el unico lugar que sabe cual
 * esta activo: el resto del codigo depende de SpeechRecognitionPort, y quien
 * necesita saber si el chico lo dijo bien depende de VerificadorDeVozPort.
 */
const speechProvider: Provider = {
  provide: SpeechRecognitionPort,
  useClass: process.env.AMI_SPEECH_PROVIDER === 'vosk' ? VoskSpeechRecognitionProvider : StubSpeechRecognitionProvider,
};

@Global()
@Module({
  providers: [speechProvider, JuezDePronunciacion, { provide: VerificadorDeVozPort, useClass: VerificadorDeVoz }],
  exports: [SpeechRecognitionPort, VerificadorDeVozPort],
})
export class SpeechModule {}
