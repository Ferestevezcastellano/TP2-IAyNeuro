import { VOCALES } from '../../core/config/phonemes';

/**
 * Verifica un sonido suelto ("mmm", "sss", "aaa") o una sílaba ("ma") mirando
 * el audio en sí, sin transcribirlo.
 *
 * Existe porque un reconocedor de voz reconoce PALABRAS: para Vosk, "mmm" es
 * "i" y "sss" es silencio. Pero cada tipo de sonido deja una huella acústica
 * que se puede medir cuadro por cuadro (10 ms):
 *
 * - vocal: con tono (las cuerdas vocales vibran) y fuerte; cuál vocal es se ve
 *   en las dos primeras resonancias de la boca (formantes F1 y F2).
 * - zumbido (M, N, L): con tono, grave y casi sin energía aguda.
 * - soplido (S, F, J): sin tono y agudo.
 * - golpe (P, T, K): corto y sin tono.
 *
 * Con eso se detecta el error más común de primer grado, decir el nombre de la
 * letra ("eme") en vez del sonido ("mmm"): aparece una vocal donde tendría que
 * haber solo zumbido.
 *
 * Las reglas se calibraron con el banco de sonidos de la app. Con él acepta
 * todos los sonidos y sílabas bien dichos y rechaza los sonidos sueltos
 * equivocados, los nombres de letra y 7 de cada 10 sílabas equivocadas. Lo que
 * NO distingue, a propósito: consonantes del mismo tipo (M/N/L, P/T/K) y, en
 * las sílabas, vocales del mismo grupo (A/O/U o E/I). Con voces agudas, como
 * la de un chico, las vocales cerradas se miden mal, y rechazar un "mo" bien
 * dicho por creer que fue "ma" es peor que dejar pasar el error.
 */

const SR = 16000;
const FRAME = 400; // 25 ms
const HOP = 160; // 10 ms

type Clase = 'vocal' | 'zumbido' | 'soplido' | 'golpe';
interface Cuadro {
  clase: Clase;
  vocal?: Vocal;
}
type Vocal = 'a' | 'e' | 'i' | 'o' | 'u';

export interface Veredicto {
  /** Hubo suficiente voz para juzgar. Si no, es "no te escuché", no un error. */
  escuchado: boolean;
  correcto: boolean;
  /** Para los logs y para ajustar: la secuencia de clases y las vocales vistas. */
  detalle: string;
}

/** Lo que se pide decir, ya separado en sonido: "mmm" → m; "ma" → m + a; "ca" → k + a. */
interface Objetivo {
  consonante?: string;
  vocal?: Vocal;
}

const ZUMBIDO = new Set(['m', 'n', 'ñ', 'l']);
const SOPLIDO = new Set(['s', 'f', 'j', 'z']);
const GOLPE_SORDO = new Set(['p', 't', 'k']);
const GOLPE_SONORO = new Set(['b', 'd', 'g']);

/** Si este verificador sabe juzgar lo que se espera (sonido suelto o sílaba directa). */
export function sabeVerificar(esperado: string): boolean {
  return objetivoDe(esperado) !== null;
}

function objetivoDe(esperado: string): Objetivo | null {
  const t = esperado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zñ]/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/^qu/, 'k')
    .replace(/^c(?=[aou]|$)/, 'k')
    .replace(/^c(?=[ei])/, 's')
    .replace(/^v/, 'b')
    .replace(/^h/, '');
  if (t.length === 1) return VOCALES.includes(t) ? { vocal: t as Vocal } : { consonante: t };
  if (t.length === 2 && !VOCALES.includes(t[0]) && VOCALES.includes(t[1])) {
    return { consonante: t[0], vocal: t[1] as Vocal };
  }
  return null;
}

/**
 * @param pcm audio mono de 16 kHz, 16 bits (con o sin cabecera WAV)
 * @param esperado lo que la tarjeta pide decir ("mmm", "aaa", "ma", "ca")
 * @param transcripcionVosk lo que oyó Vosk: segundo juez para la vocal
 */
export function verificarSonido(pcm: Buffer, esperado: string, transcripcionVosk = ''): Veredicto {
  const objetivo = objetivoDe(esperado);
  if (!objetivo) return { escuchado: true, correcto: false, detalle: 'objetivo no soportado' };

  const cuadros = analizar(aMuestras(pcm));
  const n = cuadros.length;
  const letras = cuadros.map((c) => ({ vocal: 'v', zumbido: 'm', soplido: 'f', golpe: 'g' })[c.clase]).join('');
  if (n < 5) return { escuchado: false, correcto: false, detalle: letras };

  const cuenta = (clase: Clase) => cuadros.filter((c) => c.clase === clase).length;
  const fraccion = (clase: Clase) => cuenta(clase) / n;
  const detalle = `${letras} vosk="${transcripcionVosk}"`;
  const veredicto = (correcto: boolean): Veredicto => ({ escuchado: true, correcto, detalle });

  const vistas = cuadros.filter((c) => c.clase === 'vocal' && c.vocal).map((c) => c.vocal as Vocal);
  // La vocal se juzga en su parte estable: se saca el primer tercio (la transición).
  const estables = vistas.slice(Math.floor(vistas.length / 3));
  const vocalFormantes = masVotada(estables.length ? estables : vistas);
  const vocalesVosk = transcripcionVosk
    .toLowerCase()
    .replace(/h/g, '')
    .replace(/y/g, 'i')
    .split('')
    .filter((c) => VOCALES.includes(c)) as Vocal[];

  // Vocal sola: fuerte y con tono, y alguno de los dos jueces la reconoce.
  if (!objetivo.consonante && objetivo.vocal) {
    const v = objetivo.vocal;
    const vosk = transcripcionVosk.toLowerCase().replace(/h/g, '').replace(/y/g, 'i').trim();
    return veredicto(fraccion('vocal') >= 0.4 && (vocalFormantes === v || vosk === v));
  }

  const c = objetivo.consonante as string;

  // Consonante sola.
  if (!objetivo.vocal) {
    // Decir el nombre de la letra ("E-me", "E-le", "E-se") empieza con una
    // vocal; el sonido solo arranca directo con la consonante.
    const arranque = cuadros.slice(0, 10);
    if (arranque.filter((q) => q.clase === 'vocal').length >= 6) return veredicto(false);
    if (c === 'l') return veredicto(fraccion('zumbido') >= 0.35 && fraccion('vocal') < 0.55 && fraccion('soplido') < 0.2);
    if (ZUMBIDO.has(c)) return veredicto(fraccion('zumbido') >= 0.45 && fraccion('vocal') < 0.3);
    if (SOPLIDO.has(c)) return veredicto(cuenta('soplido') >= 30 && fraccion('soplido') >= 0.45 && fraccion('vocal') < 0.3);
    if (GOLPE_SORDO.has(c) || GOLPE_SONORO.has(c)) {
      return veredicto(
        fraccion('vocal') < 0.4 && fraccion('zumbido') < 0.2 && cuenta('soplido') + cuenta('golpe') >= 2 && cuenta('soplido') < 30,
      );
    }
    // R, CH, LL, Y sueltas: sin regla propia; basta con que no sea una vocal larga.
    return veredicto(fraccion('vocal') < 0.5);
  }

  // Sílaba: el comienzo tiene que ser del tipo de la consonante, y la vocal no
  // puede ser de otro grupo según los dos jueces a la vez.
  const inicio = cuadros.slice(0, 15).map((q) => q.clase);
  const enInicio = (clase: Clase) => inicio.filter((q) => q === clase).length;
  let inicioBien: boolean;
  if (c === 'l') inicioBien = enInicio('soplido') === 0;
  else if (ZUMBIDO.has(c)) inicioBien = enInicio('zumbido') >= 3;
  else if (SOPLIDO.has(c)) inicioBien = enInicio('soplido') >= 3;
  else if (GOLPE_SONORO.has(c)) inicioBien = enInicio('soplido') < 12; // el zumbido previo de B, D, G es normal
  else if (GOLPE_SORDO.has(c)) inicioBien = enInicio('zumbido') < 3 && enInicio('soplido') < 12;
  else inicioBien = true;

  // Segundo juez para la consonante: si Vosk oyó la misma consonante, vale
  // aunque el comienzo no se haya medido bien. Pasa sobre todo con la S: el
  // soplido es suave, y en un micrófono de compu o de teléfono llega tan débil
  // que queda por debajo del umbral de voz y el comienzo parece vacío. Vosk
  // elige entre todas las sílabas, así que un "ma" dicho en lugar de "sa" sale
  // "ma" y no lo salva.
  const consonanteVosk = objetivoDe(transcripcionVosk)?.consonante;
  const voskOyoLaConsonante = consonanteVosk !== undefined && mismoSonido(consonanteVosk, c);

  const grupo = (v: Vocal) => ('ei'.includes(v) ? 'anterior' : 'abierta');
  const vo = objetivo.vocal;
  const voskVocal = vocalesVosk[vocalesVosk.length - 1];
  const vocalMal =
    vocalFormantes !== undefined &&
    voskVocal !== undefined &&
    grupo(vocalFormantes) !== grupo(vo) &&
    grupo(voskVocal) !== grupo(vo);

  // Una E o una I dichas con voz aguda tienen el primer formante tan bajo que
  // se miden como zumbido. Después de una consonante que no zumba (S, P, T…) y
  // con Vosk oyendo esa consonante, ese zumbido es la vocal.
  const vocalCerrada = 'ei'.includes(vo) && !ZUMBIDO.has(c) && voskOyoLaConsonante;
  const conVocal = fraccion('vocal') + (vocalCerrada ? fraccion('zumbido') : 0) >= 0.3;

  return veredicto((inicioBien || voskOyoLaConsonante) && conVocal && !vocalMal);
}

/** La Z y la S suenan igual en el Río de la Plata; la V y la B, también. */
function mismoSonido(a: string, b: string): boolean {
  const base = (x: string) => ({ z: 's', v: 'b' })[x] ?? x;
  return base(a) === base(b);
}

function masVotada<T>(xs: T[]): T | undefined {
  const votos = new Map<T, number>();
  for (const x of xs) votos.set(x, (votos.get(x) ?? 0) + 1);
  let mejor: T | undefined;
  let max = 0;
  for (const [x, v] of votos) if (v > max) [mejor, max] = [x, v];
  return mejor;
}

// ---------------------------------------------------------------- señal

function aMuestras(audio: Buffer): Float64Array {
  const esWav = audio.length > 44 && audio.subarray(0, 4).toString('ascii') === 'RIFF';
  const datos = esWav ? audio.subarray(44) : audio;
  const n = Math.floor(datos.length / 2);
  const x = new Float64Array(n);
  for (let i = 0; i < n; i += 1) x[i] = datos.readInt16LE(i * 2) / 32768;
  return x;
}

/** Clasifica cada cuadro con voz (10 ms) en vocal, zumbido, soplido o golpe. */
function analizar(x: Float64Array): Cuadro[] {
  const total = x.length < FRAME ? 0 : 1 + Math.floor((x.length - FRAME) / HOP);
  if (total === 0) return [];

  const db = new Float64Array(total);
  for (let i = 0; i < total; i += 1) {
    let s = 0;
    for (let j = 0; j < FRAME; j += 1) s += x[i * HOP + j] ** 2;
    db[i] = 20 * Math.log10(Math.sqrt(s / FRAME) + 1e-9);
  }
  // Hay voz si el cuadro está cerca del más fuerte y bien por encima del ruido de fondo.
  const ordenados = [...db].sort((a, b) => a - b);
  const ruido = ordenados[Math.floor(ordenados.length * 0.1)];
  const tope = ordenados[ordenados.length - 1];
  const umbral = Math.max(tope - 35, ruido + 12);

  const x10 = a10k(x);
  const ventana = hann(FRAME);
  const cuadros: Cuadro[] = [];

  for (let i = 0; i < total; i += 1) {
    if (db[i] <= umbral) continue;
    const cuadro = x.subarray(i * HOP, i * HOP + FRAME);
    const tono = periodicidad(cuadro);
    const centroide = centroideEspectral(cuadro, ventana);

    if (tono < 0.45) {
      cuadros.push({ clase: centroide > 2500 ? 'soplido' : 'golpe' });
      continue;
    }

    const j = i * 100; // el mismo instante, en la señal de 10 kHz
    const f = j + 300 <= x10.length ? formantes(x10.subarray(j, j + 300)) : [];
    const f1 = f[0] ?? 0;
    const f2 = f[1] ?? 0;
    if (centroide < 560 && f1 < 420 && (f2 === 0 || f2 > 1500)) {
      cuadros.push({ clase: 'zumbido' });
      continue;
    }
    cuadros.push({ clase: 'vocal', vocal: f1 && f2 ? vocalPorFormantes(f1, f2) : undefined });
  }
  return cuadros;
}

/** Cuánto se parece el cuadro a sí mismo corrido un período de voz (80 a 500 Hz): 1 es tono puro. */
function periodicidad(cuadro: Float64Array): number {
  const n = cuadro.length;
  let media = 0;
  for (const v of cuadro) media += v;
  media /= n;
  const c = Float64Array.from(cuadro, (v) => v - media);
  let r0 = 0;
  for (const v of c) r0 += v * v;
  if (r0 <= 0) return 0;
  let max = 0;
  for (let lag = Math.floor(SR / 500); lag < Math.floor(SR / 75); lag += 1) {
    let s = 0;
    for (let k = 0; k + lag < n; k += 1) s += c[k] * c[k + lag];
    if (s > max) max = s;
  }
  return max / r0;
}

function centroideEspectral(cuadro: Float64Array, ventana: Float64Array): number {
  const N = 512;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let k = 0; k < cuadro.length; k += 1) re[k] = cuadro[k] * ventana[k];
  fft(re, im);
  let num = 0;
  let den = 0;
  for (let k = 0; k <= N / 2; k += 1) {
    const p = re[k] * re[k] + im[k] * im[k];
    num += p * ((k * SR) / N);
    den += p;
  }
  return den > 0 ? num / den : 0;
}

function hann(n: number): Float64Array {
  return Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
}

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k += 1) {
        const wr = Math.cos(ang * k);
        const wi = Math.sin(ang * k);
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/** Baja de 16 a 10 kHz con un filtro pasabajos: a 10 kHz los formantes se estiman mejor. */
function a10k(x: Float64Array): Float64Array {
  const taps = 63;
  const corte = 4500 / SR;
  const h = new Float64Array(taps);
  let suma = 0;
  for (let i = 0; i < taps; i += 1) {
    const m = i - (taps - 1) / 2;
    const sinc = m === 0 ? 2 * corte : Math.sin(2 * Math.PI * corte * m) / (Math.PI * m);
    h[i] = sinc * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (taps - 1)));
    suma += h[i];
  }
  const largo = Math.floor((x.length * 10) / 16);
  const y = new Float64Array(largo);
  for (let i = 0; i < largo; i += 1) {
    const centro = Math.round((i * 16) / 10);
    let s = 0;
    for (let k = 0; k < taps; k += 1) {
      const idx = centro + k - (taps - 1) / 2;
      if (idx >= 0 && idx < x.length) s += x[idx] * h[k];
    }
    y[i] = s / suma;
  }
  return y;
}

/** F1, F2… de un cuadro de 10 kHz, por predicción lineal (LPC de orden 10). */
function formantes(cuadro: Float64Array): number[] {
  const n = cuadro.length;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    const pre = i === 0 ? cuadro[0] : cuadro[i] - 0.63 * cuadro[i - 1];
    x[i] = pre * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  const a = lpc(x, 10);
  const raices = raicesPolinomio(a);
  const fs = 10000;
  return raices
    .filter(([, im]) => im > 0.01)
    .map(([re, im]) => ({
      f: (Math.atan2(im, re) * fs) / (2 * Math.PI),
      bw: (-Math.log(Math.hypot(re, im)) * fs) / Math.PI,
    }))
    .filter(({ f, bw }) => f > 200 && bw < 500)
    .map(({ f }) => f)
    .sort((p, q) => p - q);
}

function lpc(x: Float64Array, orden: number): Float64Array {
  const r = new Float64Array(orden + 1);
  for (let k = 0; k <= orden; k += 1) for (let i = 0; i + k < x.length; i += 1) r[k] += x[i] * x[i + k];
  const a = new Float64Array(orden + 1);
  a[0] = 1;
  let e = r[0];
  if (e <= 0) return a;
  for (let i = 1; i <= orden; i += 1) {
    let acc = r[i];
    for (let j = 1; j < i; j += 1) acc += a[j] * r[i - j];
    const k = -acc / e;
    const prev = Float64Array.from(a);
    for (let j = 1; j < i; j += 1) a[j] = prev[j] + k * prev[i - j];
    a[i] = k;
    e *= 1 - k * k;
    if (e <= 0) break;
  }
  return a;
}

/**
 * Raíces de 1 + a1 z^-1 + … + an z^-n, es decir de z^n + a1 z^(n-1) + … + an,
 * por Durand-Kerner. Devuelve pares [real, imaginaria].
 */
function raicesPolinomio(a: Float64Array): [number, number][] {
  const n = a.length - 1;
  let z: [number, number][] = Array.from({ length: n }, (_, k) => {
    const ang = (2 * Math.PI * k) / n + 0.4;
    return [0.9 * Math.cos(ang), 0.9 * Math.sin(ang)];
  });
  const evaluar = ([zr, zi]: [number, number]): [number, number] => {
    let pr = 1;
    let pi = 0;
    for (let k = 1; k <= n; k += 1) {
      [pr, pi] = [pr * zr - pi * zi + a[k], pr * zi + pi * zr];
    }
    return [pr, pi];
  };
  for (let iter = 0; iter < 200; iter += 1) {
    let cambio = 0;
    const nuevo = z.map((zk, k) => {
      const [nr, ni] = evaluar(zk);
      let dr = 1;
      let di = 0;
      for (let j = 0; j < n; j += 1) {
        if (j === k) continue;
        const [er, ei] = [zk[0] - z[j][0], zk[1] - z[j][1]];
        [dr, di] = [dr * er - di * ei, dr * ei + di * er];
      }
      const den = dr * dr + di * di || 1e-30;
      const qr = (nr * dr + ni * di) / den;
      const qi = (ni * dr - nr * di) / den;
      cambio = Math.max(cambio, Math.hypot(qr, qi));
      return [zk[0] - qr, zk[1] - qi] as [number, number];
    });
    z = nuevo;
    if (cambio < 1e-10) break;
  }
  return z;
}

/** Vocal más cercana por F1 y F2, probando la escala de un adulto y la de voces más chicas. */
const PLANTILLAS: Record<Vocal, [number, number]> = {
  a: [750, 1350],
  e: [480, 2100],
  i: [320, 2600],
  o: [480, 950],
  u: [330, 780],
};
function vocalPorFormantes(f1: number, f2: number): Vocal {
  let mejor: Vocal = 'a';
  let min = Infinity;
  for (const escala of [1, 1.15, 1.3, 1.45]) {
    for (const [v, [p1, p2]] of Object.entries(PLANTILLAS) as [Vocal, [number, number]][]) {
      const d = Math.log(f1 / (p1 * escala)) ** 2 + Math.log(f2 / (p2 * escala)) ** 2;
      if (d < min) [min, mejor] = [d, v];
    }
  }
  return mejor;
}
