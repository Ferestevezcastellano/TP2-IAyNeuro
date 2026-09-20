import { PhoneticNormalizerService } from './phonetic-normalizer.service';

describe('PhoneticNormalizerService', () => {
  const phonetics = new PhoneticNormalizerService();

  it.each([
    ['VACA', 'BACA'],
    ['CASA', 'KASA'],
    ['ZAPATO', 'SAPATO'],
    ['CENA', 'SENA'],
    ['HOJA', 'OJA'],
    ['LLAVE', 'YAVE'],
    ['QUESO', 'KESO'],
    ['LEON', 'LEÓN'],
  ])('%s y %s suenan igual en el rioplatense', (a, b) => {
    expect(phonetics.similarity(a, b)).toBe(1);
  });

  it('distingue palabras que suenan distinto', () => {
    expect(phonetics.similarity('PERRO', 'PERO')).toBeLessThan(1);
    expect(phonetics.similarity('MESA', 'PESA')).toBeLessThan(1);
  });

  it('la enie es un sonido propio y no se pierde', () => {
    expect(phonetics.normalize('CAÑA')).not.toBe(phonetics.normalize('CANA'));
  });

  it('la gu de GUISO suena dura, no como jota', () => {
    expect(phonetics.normalize('GUISO')).toBe('giso');
    expect(phonetics.normalize('GIRASOL')).toBe('xirasol');
  });

  it('una palabra a medias baja la similitud sin anularla', () => {
    const partial = phonetics.similarity('ME', 'MESA');

    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(0.7);
  });

  it('un audio vacio no se parece a nada', () => {
    expect(phonetics.similarity('', 'MESA')).toBe(0);
  });
});
