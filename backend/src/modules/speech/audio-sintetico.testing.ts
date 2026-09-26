/**
 * Audio sintético para los tests de voz: señales con la huella acústica de cada
 * tipo de sonido (silencio, soplido, zumbido, vocal) empaquetadas como WAV PCM
 * de 16 bits a 16 kHz, el formato que manda el frontend.
 *
 * Es un archivo de apoyo de tests, no de producción.
 */

export const SR = 16000;

/** Señales sintéticas con la huella de cada tipo de sonido. */
export function silencio(ms: number): Float64Array {
  return new Float64Array(Math.round((SR * ms) / 1000));
}

/** Soplido: ruido agudo sin tono, como una S. */
export function soplido(ms: number): Float64Array {
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
export function voz(ms: number, formantes: [number, number][], ganancia = 0.3): Float64Array {
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

export const vocal = (f1: number, f2: number, ms = 450) => voz(ms, [[f1, 80], [f2, 100], [2800, 150]]);
export const zumbido = (ms = 600) => voz(ms, [[250, 60], [2700, 300]], 0.15);

export function wav(...partes: Float64Array[]): Buffer {
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
