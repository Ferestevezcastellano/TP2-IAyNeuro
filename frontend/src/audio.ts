import { API_URL } from './api';

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

/** Voz del navegador. La promesa termina cuando termina de hablar. */
function speak(text: string): Promise<void> {
  if (!('speechSynthesis' in window) || !text) return Promise.resolve();
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-AR';
  utterance.rate = 0.8;
  return new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
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

export const canListen = Boolean(RecognizerCtor);

/** Si el micrófono no responde en este tiempo, se sigue igual: no hay que dejar al chico esperando. */
const LISTEN_TIMEOUT_MS = 6000;

/** Escucha el micrófono y devuelve lo que entendió. Null si el navegador no puede. */
export function listen(): Promise<string | null> {
  if (!RecognizerCtor) return Promise.resolve(null);

  return new Promise((resolve) => {
    const recognizer = new RecognizerCtor();
    recognizer.lang = 'es-AR';
    recognizer.maxAlternatives = 1;
    recognizer.interimResults = false;

    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve(value);
    };

    const timer = window.setTimeout(() => {
      try {
        recognizer.stop();
      } catch {
        // ya estaba parado
      }
      finish('');
    }, LISTEN_TIMEOUT_MS);

    recognizer.onresult = (event) => finish(event.results[0][0].transcript);
    recognizer.onerror = () => finish('');
    recognizer.onend = () => finish('');

    try {
      recognizer.start();
    } catch {
      finish(null);
    }
  });
}
