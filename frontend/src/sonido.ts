import { API_URL } from './api';

/**
 * Todo lo que suena: los fonemas y palabras de las tarjetas, la voz del
 * navegador como respaldo, el arpegio de festejo y la grabación del propio
 * chico. Un solo sonido a la vez: el que empieza corta al anterior.
 */

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

/** Reproduce la grabación del chico. Termina cuando termina de sonar (o a los 8 s). */
export function reproducirGrabacion(url: string): Promise<void> {
  cortar();
  const audio = new Audio(url);
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
    audio.onended = listo;
    audio.onerror = listo;
    audio.play().catch(listo);
    window.setTimeout(() => {
      if (current === audio) {
        audio.pause();
        listo();
      }
    }, 8000);
  });
}
