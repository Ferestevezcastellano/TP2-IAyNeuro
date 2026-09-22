/**
 * Ilustraciones provisorias: el backend nombra cada imagen con una clave
 * (`img/palabra/mesa`) y no sirve binarios. Hasta que exista el banco de
 * imágenes, un emoji por palabra alcanza para que la tarjeta se entienda.
 */
const EMOJI: Record<string, string> = {
  ÁRBOL: '🌳', ARAÑA: '🕷️', AVIÓN: '✈️', ABEJA: '🐝', ANILLO: '💍', AUTO: '🚗',
  ELEFANTE: '🐘', ESCALERA: '🪜', ESTRELLA: '⭐', ESPEJO: '🪞', ERIZO: '🦔', ENCHUFE: '🔌',
  IGLÚ: '🧊', IMÁN: '🧲', ISLA: '🏝️', IGLESIA: '⛪',
  OSO: '🐻', OJO: '👁️', OVEJA: '🐑', OREJA: '👂',
  UVA: '🍇', UÑA: '💅', UNICORNIO: '🦄', UNO: '1️⃣',
  MASA: '🥟', SUMA: '➕', MUSA: '🧚', ASA: '🏺', SAPO: '🐸', SILLA: '💺',
  MIMO: '🤡', MOMIA: '🧟', MIAU: '🐱',
  LUNA: '🌙', SOL: '☀️', MANO: '✋', MONO: '🐒', SALA: '🛋️', LIMA: '🍋', MIEL: '🍯', MISA: '⛪',
  LANA: '🧶', NENA: '👧', NUBE: '☁️',
  CASA: '🏠', CAMA: '🛏️', TELA: '🧵', MOTO: '🏍️', TOMATE: '🍅', TUCÁN: '🦜',
  LATA: '🥫', COLA: '🥤', CUNA: '👶', CANASTA: '🧺', MAPA: '🗺️',
};

/** Palabras sin emoji razonable, dibujadas aparte en public/ilustraciones. */
const IMAGEN: Record<string, string> = {
  MESA: '/ilustraciones/mesa.svg',
};

export type Ilustracion = { emoji: string } | { src: string };

export function ilustracion(palabra: string | undefined): Ilustracion {
  const clave = (palabra ?? '').toUpperCase();
  if (IMAGEN[clave]) return { src: IMAGEN[clave] };
  return { emoji: EMOJI[clave] ?? '🔤' };
}

export const EMOJI_ACCESORIO: Record<string, string> = {
  'acc-gorro': '🎩',
  'acc-anteojos': '👓',
  'acc-bufanda': '🧣',
  'acc-capa': '🦸',
  'acc-medalla': '🏅',
  'acc-mochila': '🎒',
};
