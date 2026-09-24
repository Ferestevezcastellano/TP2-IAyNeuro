import { sabeVerificar, verificarSonido } from './verificador-acustico';

const SR = 16000;

/** Señales sintéticas con la huella de cada tipo de sonido. */
function silencio(ms: number): Float64Array {
  return new Float64Array(Math.round((SR * ms) / 1000));
}

/** Soplido: ruido agudo sin tono, como una S. */
function soplido(ms: number): Float64Array {
  const x = silencio(ms);
  let semilla = 7;
  let prev = 0;
  for (let i = 0; i < x.length; i += 1) {
    semilla = (semilla * 1103515245 + 12345) % 2 ** 31;
    const r = semilla / 2 ** 31 - 0.5;
    x[i] = 0.4 * (r - prev); // derivar el ruido lo vuelve agudo
    prev = r;
  }
  return x;
}

/**
 * Voz con tono: pulsos a 180 Hz pasados por resonancias (formantes). Con
 * formantes bajos y débiles es un zumbido (M); con F1 y F2 de una vocal, esa vocal.
 */
function voz(ms: number, formantes: [number, number][], ganancia = 0.3): Float64Array {
  const n = Math.round((SR * ms) / 1000);
  let x = new Float64Array(n);
  const periodo = Math.round(SR / 180);
  for (let i = 0; i < n; i += periodo) x[i] = 1;
  for (const [f, bw] of formantes) {
    const r = Math.exp((-Math.PI * bw) / SR);
    const a1 = 2 * r * Math.cos((2 * Math.PI * f) / SR);
    const a2 = -r * r;
    const y = new Float64Array(n);
    for (let i = 0; i < n; i += 1) y[i] = x[i] + a1 * (y[i - 1] ?? 0) + a2 * (y[i - 2] ?? 0);
    x = y;
  }
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  return x.map((v) => (v / max) * ganancia);
}

const vocal = (f1: number, f2: number, ms = 450) => voz(ms, [[f1, 80], [f2, 100], [2800, 150]]);
const zumbido = (ms = 600) => voz(ms, [[250, 60], [2700, 300]], 0.15);

function wav(...partes: Float64Array[]): Buffer {
  const total = partes.reduce((n, p) => n + p.length, 0);
  const b = Buffer.alloc(44 + total * 2);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(36 + total * 2, 4);
  b.write('WAVEfmt ', 8, 'ascii');
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36, 'ascii');
  b.writeUInt32LE(total * 2, 40);
  let o = 44;
  for (const p of partes) for (const v of p) {
    b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), o);
    o += 2;
  }
  return b;
}

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
