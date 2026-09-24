import { Global, Module, Provider } from '@nestjs/common';
import { SpeechRecognitionPort } from '../../core/ports';
import { StubSpeechRecognitionProvider } from './stub-speech-recognition.provider';
import { VoskSpeechRecognitionProvider } from './vosk-speech-recognition.provider';

/**
 * Elige el reconocedor por variable de entorno. Es el unico lugar que sabe cual
 * esta activo: el resto del codigo depende de SpeechRecognitionPort.
 */
const speechProvider: Provider = {
  provide: SpeechRecognitionPort,
  useClass: process.env.AMI_SPEECH_PROVIDER === 'vosk' ? VoskSpeechRecognitionProvider : StubSpeechRecognitionProvider,
};

@Global()
@Module({
  providers: [speechProvider],
  exports: [SpeechRecognitionPort],
})
export class SpeechModule {}
