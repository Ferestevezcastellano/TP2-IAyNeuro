import { PhoneticNormalizerService } from '../../core/services/phonetic-normalizer.service';
import { JuezDePronunciacion } from './juez-pronunciacion';

describe('juez de pronunciacion', () => {
  const juez = new JuezDePronunciacion(new PhoneticNormalizerService());

  describe('oraciones', () => {
    it('acepta la oracion dicha, aunque el reconocedor parta una palabra o erre un articulo', () => {
      expect(juez.aceptaOracion('LA LUNA SALE', ['la luna sale'])).toBe(true);
      expect(juez.aceptaOracion('LA LUNA SALE', ['la luna sa le'])).toBe(true);
      expect(juez.aceptaOracion('EL SOL ILUMINA LA SALA', ['el sol ilumina las sala'])).toBe(true);
      expect(juez.aceptaOracion('EL TUCÁN ESTÁ EN LA CASA', ['el tu can está en la casa'])).toBe(true);
    });

    it('rechaza otra oracion aunque se parezca en letras', () => {
      expect(juez.aceptaOracion('LA LUNA SALE', ['la nena sale'])).toBe(false);
      expect(juez.aceptaOracion('LA LUNA SALE', ['la luna sola'])).toBe(false);
      expect(juez.aceptaOracion('LA LUNA SALE', ['el sol sale'])).toBe(false);
      expect(juez.aceptaOracion('EL TUCÁN ESTÁ EN LA CASA', ['el perro está en la casa'])).toBe(false);
      expect(juez.aceptaOracion('EL SOL ILUMINA LA SALA', ['el sol ilumina la mesa'])).toBe(false);
    });

    it('acepta si la oracion esta entre las mejores hipotesis', () => {
      expect(juez.aceptaOracion('LA LUNA SALE', ['la lunas sale', 'la luna sale'])).toBe(true);
    });
  });

  describe('palabras', () => {
    it('acepta la palabra si Vosk la tiene entre sus hipotesis', () => {
      expect(juez.aceptaPalabra('MESA', 'mesa', ['masa', 'mesa'])).toBe(true);
    });

    it('rechaza si Vosk oyo otra palabra real parecida', () => {
      expect(juez.aceptaPalabra('MESA', 'mesa', ['masa'])).toBe(false);
    });

    it('perdona las confusiones del reconocedor si no oyo otra palabra', () => {
      expect(juez.aceptaPalabra('OSO', 'tuso', ['tu so'])).toBe(true);
      expect(juez.aceptaPalabra('MUSA', 'nosa', ['no sa'])).toBe(true);
      // una primera pasada exacta pesa mas que una palabra lejana de la segunda
      expect(juez.aceptaPalabra('OSO', 'oso', ['casa'])).toBe(true);
    });

    it('rechaza lo que no se parece', () => {
      expect(juez.aceptaPalabra('TELA', 'la', ['la'])).toBe(false);
      expect(juez.aceptaPalabra('MANO', 'moto', ['moto'])).toBe(false);
    });

    it('sin hipotesis (reconocimiento del navegador) compara solo lo oido', () => {
      expect(juez.aceptaPalabra('LUNA', 'luna')).toBe(true);
      expect(juez.aceptaPalabra('LUNA', 'casa')).toBe(false);
    });
  });

  it('el parecido fonetico cobra la mitad las confusiones tipicas', () => {
    expect(juez.parecidoFonetico('nana', 'mano')).toBeGreaterThanOrEqual(0.7);
    expect(juez.parecidoFonetico('la', 'tela')).toBeLessThan(0.7);
  });
});
