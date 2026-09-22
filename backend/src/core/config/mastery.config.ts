/**
 * Parametros de la regla de dominio. Estan juntos y aparte a proposito: son la
 * perilla que el equipo pedagogico va a querer mover sin leer codigo.
 */
export interface MasteryConfig {
  /** Cuantas sesiones entran en el promedio movil. */
  windowSize: number;
  /** Minimo de sesiones antes de poder declarar dominio. */
  minSessions: number;
  /** Promedio requerido, entre 0 y 1. */
  threshold: number;
  /** Estrellas que se pagan al dominar un nivel, una sola vez. */
  starsPerMasteredLevel: number;
}

/** Token de DI para poder inyectar otros parametros en los tests. */
export const MASTERY_CONFIG_TOKEN = Symbol('MASTERY_CONFIG');

/**
 * Por ahora una sola sesion alcanza para dominar: se baja el minimo a 1 mientras
 * se calibra. La ventana movil queda en 3 para que, si se vuelve a subir el
 * minimo, no haya que tocar nada mas.
 */
export const MASTERY_CONFIG: MasteryConfig = {
  windowSize: 3,
  minSessions: 1,
  threshold: 0.8,
  starsPerMasteredLevel: 3,
};

/** Puntaje de una tarjeta segun cuantos intentos necesito para resolverla. */
export const ATTEMPT_SCORES: Record<number, number> = {
  1: 1,
  2: 0.5,
  3: 0.25,
};

/** Puntaje de una tarjeta resuelta recien al cuarto intento o mas. */
export const ATTEMPT_SCORE_FLOOR = 0.1;

/**
 * Peso de la verificacion por voz dentro del puntaje de una tarjeta que la pide.
 * El armado por botones pesa mas porque es la habilidad que el nivel entrena;
 * la voz cierra el circuito pero el habla infantil es ruidosa.
 */
export const VOICE_WEIGHT = 0.4;

/** Similitud minima para aceptar la pronunciacion, entre 0 y 1. */
export const VOICE_SIMILARITY_THRESHOLD = 0.7;
