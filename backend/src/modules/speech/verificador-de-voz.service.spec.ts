import { Card, CardKind, VoiceSays } from '../../core/domain';
import { SpeechRecognitionPort, SpeechTranscription } from '../../core/ports';
import { PhoneticNormalizerService } from '../../core/services';
import { silencio, soplido, wav } from './audio-sintetico.testing';
import { JuezDePronunciacion } from './juez-pronunciacion';
import { VerificadorDeVoz } from './verificador-de-voz.service';

/** Reconocedor controlado desde el test: devuelve lo que se le indique. */
class ReconocedorFalso extends SpeechRecognitionPort {
  readonly name = 'falso';
  oye: Omit<SpeechTranscription, 'provider'> = { transcript: '', confidence: 0.9 };

  async transcribe(): Promise<SpeechTranscription> {
    return { ...this.oye, provider: this.name };
  }
}

function tarjeta(kind: CardKind, voiceSays: VoiceSays, voiceTarget: string): Card {
  return {
    id: `t-${voiceTarget}`,
    levelId: 'nivel',
    position: 1,
    group: 'g',
    kind,
    prompt: '',
    audioKey: '',
    spokenAs: voiceTarget.toLowerCase(),
    tiles: [],
    solution: [],
    voiceTarget,
    voiceSays,
    voiceLabel: voiceTarget,
  };
}

const palabra = tarjeta(CardKind.WORD_BUILDING, VoiceSays.WORD, 'MESA');
const oracion = tarjeta(CardKind.SENTENCE_BUILDING, VoiceSays.SENTENCE, 'LA LUNA SALE');
const letraS = tarjeta(CardKind.LETTER_INTRO, VoiceSays.SOUND, 'sss');
const letraM = tarjeta(CardKind.LETTER_INTRO, VoiceSays.SOUND, 'mmm');

const audioDe = (buffer: Buffer) => ({ audioBase64: buffer.toString('base64') });
const cualquierAudio = audioDe(Buffer.alloc(2048, 1));

describe('VerificadorDeVoz', () => {
  let reconocedor: ReconocedorFalso;
  let verificador: VerificadorDeVoz;

  beforeEach(() => {
    reconocedor = new ReconocedorFalso();
    const phonetics = new PhoneticNormalizerService();
    verificador = new VerificadorDeVoz(reconocedor, phonetics, new JuezDePronunciacion(phonetics));
  });

  it('si el cliente no pudo escuchar, deja pasar sin verificar', async () => {
    expect(await verificador.verificar(palabra, { unverified: true })).toEqual({
      heard: true,
      accepted: true,
      verified: false,
      transcript: '',
      confidence: 0,
      similarity: 0,
      provider: 'none',
    });
  });

  describe('transcripción del navegador', () => {
    it('acepta la palabra bien dicha', async () => {
      const v = await verificador.verificar(palabra, { transcript: 'MESA' });
      expect(v).toMatchObject({ heard: true, accepted: true, verified: true, provider: 'client', confidence: 1, similarity: 1 });
    });

    it('rechaza otra palabra', async () => {
      const v = await verificador.verificar(palabra, { transcript: 'PANTALON' });
      expect(v).toMatchObject({ accepted: false, verified: true });
    });

    it('rechaza una oración con una palabra cambiada', async () => {
      expect((await verificador.verificar(oracion, { transcript: 'LA NENA SALE' })).accepted).toBe(false);
      expect((await verificador.verificar(oracion, { transcript: 'LA LUNA SALE' })).accepted).toBe(true);
    });

    it('en una letra nueva, lo que el navegador no pudo transcribir queda sin verificar', async () => {
      const v = await verificador.verificar(letraS, { transcript: 'PANTALON' });
      expect(v).toMatchObject({ accepted: true, verified: false, provider: 'client' });
    });

    it('en una letra nueva, lo bien transcripto sí se verifica', async () => {
      const v = await verificador.verificar(letraS, { transcript: 'sss' });
      expect(v).toMatchObject({ accepted: true, verified: true });
    });
  });

  describe('audio reconocido por el servidor', () => {
    it('acepta la palabra si el reconocedor la oyó', async () => {
      reconocedor.oye = { transcript: 'mesa', confidence: 0.8, alternatives: ['mesa'] };
      const v = await verificador.verificar(palabra, cualquierAudio);
      expect(v).toMatchObject({ heard: true, accepted: true, verified: true, provider: 'falso', confidence: 0.8 });
    });

    it('rechaza si el reconocedor oyó otra palabra real parecida', async () => {
      reconocedor.oye = { transcript: 'mesa', confidence: 0.8, alternatives: ['masa'] };
      expect((await verificador.verificar(palabra, cualquierAudio)).accepted).toBe(false);
    });

    it('en una oración juzga las hipótesis del reconocedor', async () => {
      reconocedor.oye = { transcript: 'la luna', confidence: 0.7, alternatives: ['la luna sale'] };
      expect((await verificador.verificar(oracion, cualquierAudio)).accepted).toBe(true);
    });

    it('si no se oyó ninguna palabra, no juzga: pide repetir', async () => {
      reconocedor.oye = { transcript: '  ', confidence: 0 };
      const v = await verificador.verificar(palabra, cualquierAudio);
      expect(v).toMatchObject({ heard: false, accepted: false, verified: false, provider: 'falso' });
    });

    it('un sonido suelto lo juzga el análisis acústico', async () => {
      const s = audioDe(wav(silencio(200), soplido(700), silencio(200)));

      const bien = await verificador.verificar(letraS, s);
      expect(bien).toMatchObject({ heard: true, accepted: true, similarity: 1, provider: 'falso+acustico' });

      const mal = await verificador.verificar(letraM, s);
      expect(mal).toMatchObject({ heard: true, accepted: false, similarity: 0.5, provider: 'falso+acustico' });
    });

    it('un sonido suelto grabado en silencio no se juzga', async () => {
      const v = await verificador.verificar(letraS, audioDe(wav(silencio(1500))));
      expect(v).toMatchObject({ heard: false, accepted: false, provider: 'falso' });
    });
  });
});
