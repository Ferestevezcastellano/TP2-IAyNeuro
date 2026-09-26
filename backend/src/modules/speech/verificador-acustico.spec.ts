import { silencio, soplido, vocal, wav, zumbido } from './audio-sintetico.testing';
import { sabeVerificar, verificarSonido } from './verificador-acustico';

describe('verificarSonido', () => {
  const pausa = () => silencio(200);

  it('acepta un soplido largo como S y lo rechaza como M', () => {
    const audio = wav(pausa(), soplido(700), pausa());
    expect(verificarSonido(audio, 'sss').correcto).toBe(true);
    expect(verificarSonido(audio, 'mmm').correcto).toBe(false);
  });

  it('acepta un zumbido como M y lo rechaza como S', () => {
    const audio = wav(pausa(), zumbido(), pausa());
    expect(verificarSonido(audio, 'mmm').correcto).toBe(true);
    expect(verificarSonido(audio, 'sss').correcto).toBe(false);
  });

  it('rechaza el nombre de la letra ("eme") cuando se pide el sonido', () => {
    const eme = wav(pausa(), vocal(480, 2100, 250), zumbido(300), vocal(480, 2100, 250), pausa());
    expect(verificarSonido(eme, 'mmm').correcto).toBe(false);
  });

  it('reconoce la vocal por sus formantes', () => {
    const a = wav(pausa(), vocal(750, 1350), pausa());
    const i = wav(pausa(), vocal(320, 2600), pausa());
    expect(verificarSonido(a, 'aaa').correcto).toBe(true);
    expect(verificarSonido(a, 'iii').correcto).toBe(false);
    expect(verificarSonido(i, 'iii').correcto).toBe(true);
    expect(verificarSonido(i, 'aaa').correcto).toBe(false);
  });

  it('en una silaba mira el comienzo y la vocal', () => {
    const ma = wav(pausa(), zumbido(200), vocal(750, 1350, 350), pausa());
    const sa = wav(pausa(), soplido(250), vocal(750, 1350, 350), pausa());
    const mi = wav(pausa(), zumbido(200), vocal(320, 2600, 350), pausa());
    expect(verificarSonido(ma, 'ma', 'ma').correcto).toBe(true);
    expect(verificarSonido(sa, 'ma', 'sa').correcto).toBe(false);
    expect(verificarSonido(mi, 'ma', 'mi').correcto).toBe(false);
  });

  it('sin voz no juzga: es "no te escuché", no un error', () => {
    const v = verificarSonido(wav(silencio(1500)), 'mmm');
    expect(v.escuchado).toBe(false);
  });

  it('sabe qué puede verificar: sonidos sueltos y silabas, no palabras', () => {
    expect(sabeVerificar('mmm')).toBe(true);
    expect(sabeVerificar('ma')).toBe(true);
    expect(sabeVerificar('ca')).toBe(true);
    expect(sabeVerificar('MESA')).toBe(false);
  });
});
