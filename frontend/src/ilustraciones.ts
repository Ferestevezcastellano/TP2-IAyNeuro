/**
 * Ilustraciones provisorias: el backend nombra cada imagen con una clave
 * (`img/palabra/mesa`) y no sirve binarios. Hasta que exista el banco de
 * imágenes, un emoji por palabra alcanza para que la tarjeta se entienda.
 */
const EMOJI: Record<string, string> = {
  ÁRBOL: '🌳', ARAÑA: '🕷️', AVIÓN: '✈️', ABEJA: '🐝', ANILLO: '💍', AUTO: '🚗',
  ELEFANTE: '🐘', ESCALERA: '🪜', ESTRELLA: '⭐', ESPEJO: '🪞', ERIZO: '🦔', ENCHUFE: '🔌',
  IMÁN: '🧲', ISLA: '🏝️', IGLESIA: '⛪',
  OSO: '🐻', OJO: '👁️', OVEJA: '🐑', OREJA: '👂',
  UVA: '🍇', UÑA: '💅', UNICORNIO: '🦄', UNO: '1️⃣',
  SUMA: '➕', SAPO: '🐸', SILLA: '🪑', MIAU: '🐱',
  LUNA: '🌙', SOL: '☀️', MANO: '✋', MONO: '🐒', SALA: '🛋️', MIEL: '🍯',
  LANA: '🧶', NENA: '👧', NUBE: '☁️',
  CASA: '🏠', CAMA: '🛏️', MOTO: '🏍️', TOMATE: '🍅',
  LATA: '🥫', CANASTA: '🧺', MAPA: '🗺️',
};

/**
 * Palabras sin emoji que las muestre bien, dibujadas aparte en
 * public/ilustraciones. Un emoji parecido no alcanza: el chico nombra lo que ve,
 * y si ve un zombi dice "zombi", no "momia" (lo mismo el hielo por IGLÚ, el
 * payaso por MIMO, el loro por TUCÁN o el bebé por CUNA).
 */
const IMAGEN: Record<string, string> = {
  MESA: '/ilustraciones/mesa.svg',
  IGLÚ: '/ilustraciones/iglu.svg',
  MOMIA: '/ilustraciones/momia.svg',
  MIMO: '/ilustraciones/mimo.svg',
  MASA: '/ilustraciones/masa.svg',
  MUSA: '/ilustraciones/musa.svg',
  ASA: '/ilustraciones/asa.svg',
  LIMA: '/ilustraciones/lima.svg',
  MISA: '/ilustraciones/misa.svg',
  TELA: '/ilustraciones/tela.svg',
  TUCÁN: '/ilustraciones/tucan.svg',
  COLA: '/ilustraciones/cola.svg',
  CUNA: '/ilustraciones/cuna.svg',
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
