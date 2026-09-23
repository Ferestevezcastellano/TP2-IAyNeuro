import { API_URL, api } from './api';

let current: HTMLAudioElement | null = null;
/** Resuelve la promesa del audio que esta sonando, aunque lo corte otro. */
let cerrarActual: (() => void) | null = null;

/** Corta lo que este sonando y da por terminada su promesa, para no dejarla colgada. */
function cortar(): void {
  if (current) {
    current.pause();
    current = null;
  }
  if (cerrarActual) {
    const cerrar = cerrarActual;
    cerrarActual = null;
    cerrar();
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/** Ningún sonido de la app dura más que esto: pasado el tope, se da por terminado. */
const TOPE_SONIDO_MS = 5000;

/** Voz del navegador. La promesa termina cuando termina de hablar. */
function speak(text: string): Promise<void> {
  if (!('speechSynthesis' in window) || !text) return Promise.resolve();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-AR';
  utterance.rate = 0.8;
  return new Promise<void>((resolve) => {
    // En Android la voz del navegador a veces no dispara `onend` nunca. Sin este
    // tope, quien espera que termine de sonar (la palabra armada) queda colgado
    // y la tarjeta no avanza.
    const tope = window.setTimeout(resolve, TOPE_SONIDO_MS);
    const listo = () => {
      window.clearTimeout(tope);
      resolve();
    };
    utterance.onend = listo;
    utterance.onerror = listo;
    speechSynthesis.speak(utterance);
  });
}

/**
 * Hace sonar una tarjeta o un botón: la grabación del fonema si la hay, si no
 * la voz del navegador leyendo `spokenAs` (que ya viene como sonido, "mmm",
 * y nunca como nombre de letra).
 *
 * La promesa termina cuando termina el sonido, para poder encadenar dos (la
 * letra que se acaba de poner y despues la palabra entera). Si otro `play()`
 * lo interrumpe, termina igual: nadie se queda esperando.
 */
export function play(target: { audioKey?: string; spokenAs?: string; label?: string } | null | undefined): Promise<void> {
  if (!target) return Promise.resolve();
  const spoken = target.spokenAs || target.label || '';
  const key = target.audioKey || '';

  cortar();

  if (!key.startsWith('audio/fonema/')) return speak(spoken);

  const audio = new Audio(`${API_URL}/${key}.ogg`);
  current = audio;

  return new Promise<void>((resolve) => {
    cerrarActual = resolve;

    const listo = () => {
      if (current === audio) {
        current = null;
        cerrarActual = null;
      }
      resolve();
    };

    // El respaldo con voz sintética es solo para cuando el archivo no existe. Si
    // este audio fue interrumpido por otro (play() rechaza con AbortError), o ya
    // no es el vigente, no hay que hablar encima del sonido nuevo.
    const fallback = () => {
      if (current !== audio) {
        resolve();
        return;
      }
      current = null;
      cerrarActual = null;
      void speak(spoken).then(resolve);
    };

    audio.onended = listo;
    audio.onerror = fallback;
    // Mismo resguardo que en `speak`: si el teléfono nunca avisa que terminó
    // (pasa con el audio en segundo plano o bloqueado), no se espera para siempre.
    window.setTimeout(() => {
      if (current === audio) listo();
    }, TOPE_SONIDO_MS);
    audio.play().catch((error: unknown) => {
      if ((error as { name?: string })?.name !== 'AbortError') fallback();
      else resolve();
    });
  });
}

type Recognizer = new () => SpeechRecognition;

const RecognizerCtor: Recognizer | undefined =
  (window as unknown as { SpeechRecognition?: Recognizer }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: Recognizer }).webkitSpeechRecognition;

/**
 * Un arpegio corto de confirmación. No es un fonema ni una consigna: es el
 * sonido de que algo salió bien, y por eso suena distinto a todo lo demás.
 * Hoy lo usa la pantalla del compañero cada vez que el chico se prueba algo.
 */
let contexto: AudioContext | null = null;
export function celebrar(notas: number[] = [523.25, 659.25, 783.99, 1046.5]): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    contexto = contexto ?? new Ctor();
    if (contexto.state === 'suspended') void contexto.resume();
    const ctx = contexto;
    notas.forEach((hz, i) => {
      const t0 = ctx.currentTime + i * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.4);
    });
  } catch {
    // Sin audio la pantalla funciona igual; no vale romper la celebración por esto.
  }
}

export const canListen = Boolean(RecognizerCtor);

/**
 * Si no llega ningún resultado en este tiempo desde que el micrófono se abrió,
 * se corta. Se cuenta desde que abrió, no desde el toque: la primera vez el
 * teléfono pregunta por el permiso y eso no puede comerse el tiempo del chico.
 */
const LISTEN_TIMEOUT_MS = 7000;
/** Tope absoluto, por si el micrófono no llega a abrir nunca (permiso sin contestar). */
const LISTEN_HARD_TIMEOUT_MS = 20000;

/** Errores que dicen que el micrófono no se puede usar, no que el chico no habló. */
const SIN_MICROFONO = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported']);

/**
 * Lo que devuelve `listen()`. Los tres casos son distintos y quien llama TIENE
 * que distinguirlos: dar por buena una pronunciación que nadie escuchó es
 * exactamente el bug que hacía que decir "pantalón" contara como haber dicho
 * "manzana".
 */
export type Escucha =
  /** Lo que entendió el navegador. */
  | { tipo: 'texto'; texto: string }
  /** El audio grabado (WAV 16 kHz mono en base64), para que lo reconozca el servidor. */
  | { tipo: 'audio'; audioBase64: string }
  /** Escuchó pero no entendió nada (silencio o se acabó el tiempo). */
  | { tipo: 'vacio' }
  /** No se puede escuchar: sin reconocimiento, sin permiso, sin https o sin red. */
  | { tipo: 'sin-microfono'; motivo: string };

const VACIO: Escucha = { tipo: 'vacio' };

/** Explicación corta para el adulto que está al lado, según el error del navegador. */
function explicar(error: string): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') {
    return window.isSecureContext
      ? `EL NAVEGADOR NO DIO PERMISO DE MICRÓFONO. REVISÁ EL CANDADO DE LA BARRA DE DIRECCIONES. (${error})`
      : `EL NAVEGADOR TRATA ESTA PÁGINA COMO INSEGURA Y NO DA EL MICRÓFONO. (${error}, ${location.origin})`;
  }
  if (error === 'audio-capture') return 'NO ENCONTRÉ NINGÚN MICRÓFONO CONECTADO.';
  if (error === 'network') return 'ESTE NAVEGADOR NO PUEDE RECONOCER LA VOZ (PROBÁ CON GOOGLE CHROME).';
  if (error === 'sin-reconocimiento') return 'ESTE NAVEGADOR NO RECONOCE LA VOZ. PROBÁ CON GOOGLE CHROME.';
  return `NO PUDE USAR EL MICRÓFONO (${error}).`;
}

/**
 * Errores con los que el reconocimiento del navegador no va a andar nunca en
 * esta máquina, pero el micrófono sí: ahí conviene grabar y que reconozca el
 * servidor. Es el caso de Chrome o Chromium en Linux, que dan `network`.
 */
const SIN_RECONOCEDOR = new Set(['network', 'service-not-allowed', 'language-not-supported']);

/**
 * Con `not-allowed` el reconocedor del navegador no tiene permiso, pero grabar
 * usa otro camino (getUserMedia) que a veces sí lo tiene: pasa en Chrome de
 * Android con la página marcada como segura a mano. Se prueba grabar, sin dar
 * por roto el reconocedor.
 */
const PROBAR_GRABANDO = new Set([...SIN_RECONOCEDOR, 'not-allowed']);

/** Una vez que el reconocimiento del navegador falló así, no se lo vuelve a probar. */
let reconocedorRoto = !RecognizerCtor;

let proveedorServidor: Promise<string> | null = null;
/** Si el servidor reconoce voz de verdad (Vosk) y no es el de utilería. */
function servidorReconoce(): Promise<boolean> {
  proveedorServidor ??= api
    .speechProvider()
    .then((r) => r.provider)
    .catch(() => 'ninguno');
  return proveedorServidor.then((p) => p === 'vosk');
}

/**
 * Escucha el micrófono. Ver `Escucha`.
 *
 * Primero con el reconocimiento del navegador, que es el mejor (el de Google en
 * Chrome). Si ese no existe o no anda en esta máquina, graba el audio y lo
 * reconoce el servidor.
 */
export async function listen(): Promise<Escucha> {
  if (!reconocedorRoto) {
    const escucha = await escucharNavegador();
    if (escucha.tipo !== 'sin-microfono' || !PROBAR_GRABANDO.has(ultimoError)) return escucha;
    if (SIN_RECONOCEDOR.has(ultimoError)) reconocedorRoto = true;
  }
  if (navigator.mediaDevices && (await servidorReconoce())) return grabar();
  return { tipo: 'sin-microfono', motivo: explicar(RecognizerCtor ? ultimoError || 'network' : 'sin-reconocimiento') };
}

let ultimoError = '';

function escucharNavegador(): Promise<Escucha> {
  if (!RecognizerCtor) return Promise.resolve({ tipo: 'sin-microfono', motivo: explicar('sin-reconocimiento') });
  ultimoError = '';

  return new Promise((resolve) => {
    const recognizer = new RecognizerCtor();
    recognizer.lang = 'es-AR';
    recognizer.maxAlternatives = 1;
    recognizer.interimResults = false;
    recognizer.continuous = false;

    let done = false;
    let timer: number | undefined;
    const parar = () => {
      try {
        recognizer.abort();
      } catch {
        // ya estaba parado
      }
    };
    const finish = (value: Escucha) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      window.clearTimeout(tope);
      resolve(value);
    };

    const tope = window.setTimeout(() => {
      parar();
      finish(VACIO);
    }, LISTEN_HARD_TIMEOUT_MS);

    recognizer.onstart = () => {
      timer = window.setTimeout(() => {
        // `stop()` y no `abort()`: si el chico estaba hablando, que llegue el resultado.
        try {
          recognizer.stop();
        } catch {
          // ya estaba parado
        }
        window.setTimeout(() => finish(VACIO), 1500);
      }, LISTEN_TIMEOUT_MS);
    };
    recognizer.onresult = (event) => {
      const texto = event.results[0]?.[0]?.transcript ?? '';
      const limpio = texto.trim();
      finish(limpio ? { tipo: 'texto', texto: limpio } : VACIO);
    };
    recognizer.onerror = (event) => {
      const tipo = (event as unknown as { error?: string }).error ?? '';
      // Queda en la consola para poder diagnosticar desde otra compu.
      console.warn('[AMI] reconocimiento de voz:', tipo);
      ultimoError = tipo;
      finish(SIN_MICROFONO.has(tipo) ? { tipo: 'sin-microfono', motivo: explicar(tipo) } : VACIO);
    };
    // En Android `onend` puede llegar un instante antes que `onresult`: se le da
    // un margen corto antes de darlo por vacío.
    recognizer.onend = () => window.setTimeout(() => finish(VACIO), 400);

    try {
      recognizer.start();
    } catch (error) {
      finish({ tipo: 'sin-microfono', motivo: explicar(String((error as Error)?.message ?? error)) });
    }
  });
}

/** Frecuencia que espera el modelo de Vosk. */
const FRECUENCIA_VOSK = 16000;
/** Tope de una grabación: una palabra o una oración corta entran de sobra. */
const GRABACION_MAX_MS = 5000;
/** Silencio después de hablar que da la grabación por terminada. */
const SILENCIO_FINAL_MS = 900;

/**
 * Graba hasta que el chico termina de hablar (o hasta el tope) y devuelve el
 * audio listo para el servidor. Si no habló nada, devuelve vacío.
 */
async function grabar(): Promise<Escucha> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (error) {
    const nombre = (error as { name?: string })?.name;
    console.warn('[AMI] micrófono:', nombre);
    return { tipo: 'sin-microfono', motivo: explicar(nombre === 'NotAllowedError' ? 'not-allowed' : 'audio-capture') };
  }

  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  await ctx.resume().catch(() => undefined);
  const fuente = ctx.createMediaStreamSource(stream);
  const proceso = ctx.createScriptProcessor(4096, 1, 1);
  const trozos: Float32Array[] = [];

  return new Promise<Escucha>((resolve) => {
    const inicio = performance.now();
    /** El nivel más bajo que se escuchó: el ruido de fondo de la sala. */
    let piso = Infinity;
    let pico = 0;
    let huboVoz = false;
    let ultimaVoz = 0;
    let cerrado = false;

    const umbral = () => Math.min(0.02, Math.max(0.008, piso * 3));

    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      proceso.disconnect();
      fuente.disconnect();
      stream.getTracks().forEach((pista) => pista.stop());
      void ctx.close().catch(() => undefined);
      // Si arrancó a hablar apenas abrió el micrófono, el piso se conoce recién
      // al final: por eso la última palabra la tiene el pico contra ese piso.
      const hablo = huboVoz || pico > umbral();
      console.debug('[AMI] grabación:', { hablo, pico: pico.toFixed(3), piso: piso.toFixed(3), ms: Math.round(performance.now() - inicio) });
      resolve(hablo ? { tipo: 'audio', audioBase64: aWavBase64(trozos, ctx.sampleRate) } : VACIO);
    };

    proceso.onaudioprocess = (evento) => {
      const datos = new Float32Array(evento.inputBuffer.getChannelData(0));
      trozos.push(datos);
      let suma = 0;
      for (const x of datos) suma += x * x;
      const nivel = Math.sqrt(suma / datos.length);
      const ahora = performance.now() - inicio;

      // Antes se medía el ruido en el primer cuarto de segundo, y si el chico
      // arrancaba a hablar enseguida (lo natural con una palabra), su propia voz
      // quedaba tomada como ruido y la grabación salía "vacía". Ahora el ruido
      // es el nivel más bajo escuchado, y hablar es superar un mínimo fijo o
      // quedar bien por encima de ese piso.
      piso = Math.min(piso, Math.max(nivel, 0.002));
      pico = Math.max(pico, nivel);
      if (nivel > umbral()) {
        huboVoz = true;
        ultimaVoz = ahora;
      }
      if ((huboVoz && ahora - ultimaVoz > SILENCIO_FINAL_MS) || ahora > GRABACION_MAX_MS) cerrar();
    };

    fuente.connect(proceso);
    proceso.connect(ctx.destination);
  });
}

/** Junta los trozos, los baja a 16 kHz y arma un WAV PCM de 16 bits mono. */
function aWavBase64(trozos: Float32Array[], frecuencia: number): string {
  const total = trozos.reduce((n, t) => n + t.length, 0);
  const todo = new Float32Array(total);
  let desde = 0;
  for (const t of trozos) {
    todo.set(t, desde);
    desde += t.length;
  }

  // Bajar de frecuencia promediando cada tramo: sin filtro, el sonido de la S
  // (que es agudo) se doblaría hacia abajo y ensuciaría el resto.
  const paso = frecuencia / FRECUENCIA_VOSK;
  const largo = Math.floor(total / paso);
  const pcm = new Int16Array(largo);
  for (let i = 0; i < largo; i += 1) {
    const a = Math.floor(i * paso);
    const b = Math.min(total, Math.floor((i + 1) * paso));
    let suma = 0;
    for (let j = a; j < b; j += 1) suma += todo[j];
    const x = Math.max(-1, Math.min(1, suma / Math.max(1, b - a)));
    pcm[i] = x < 0 ? x * 0x8000 : x * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + pcm.byteLength);
  const v = new DataView(buffer);
  const texto = (offset: number, s: string) => [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  texto(0, 'RIFF');
  v.setUint32(4, 36 + pcm.byteLength, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, FRECUENCIA_VOSK, true);
  v.setUint32(28, FRECUENCIA_VOSK * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texto(36, 'data');
  v.setUint32(40, pcm.byteLength, true);
  new Uint8Array(buffer, 44).set(new Uint8Array(pcm.buffer));

  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}
