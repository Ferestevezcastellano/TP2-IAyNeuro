import type { PetSpecies } from '../api';

const ARCHIVO: Record<PetSpecies, string> = {
  LION: '/mascotas/lion.svg',
  POLAR_BEAR: '/mascotas/polar-bear.svg',
  RHINOCEROS: '/mascotas/rhinoceros.svg',
  KOALA: '/mascotas/koala.svg',
};

export const NOMBRE_MASCOTA: Record<PetSpecies, string> = {
  LION: 'LEÓN',
  POLAR_BEAR: 'OSO POLAR',
  RHINOCEROS: 'RINOCERONTE',
  KOALA: 'KOALA',
};

/**
 * Cada accesorio es un SVG del MISMO lienzo de 150×150 que las mascotas, y ya
 * viene dibujado en la posición que le toca sobre la cara.
 *
 * Eso evita el problema que hace inviable la otra ruta: si el arte fuera "el
 * animal con el accesorio puesto", harían falta 4 animales × 6 accesorios = 24
 * imágenes, y con dos accesorios encima se va a cientos. Superponiendo capas
 * son 6 archivos y punto, y cualquier accesorio nuevo suma uno solo.
 */
export const ARCHIVO_ACCESORIO: Record<string, string> = {
  'acc-gorro': '/accesorios/gorro.svg',
  'acc-anteojos': '/accesorios/anteojos.svg',
  'acc-bufanda': '/accesorios/bufanda.svg',
  'acc-capa': '/accesorios/capa.svg',
  'acc-medalla': '/accesorios/medalla.svg',
  'acc-mochila': '/accesorios/mochila.svg',
};

/**
 * En qué orden se apilan. La capa y la mochila van DETRÁS de la mascota; el
 * resto, delante. Sin esto, la capa le taparía la cara.
 */
const CAPA_DE_ATRAS = new Set(['acc-capa', 'acc-mochila']);

/** Delante, de abajo hacia arriba: primero lo que cuelga, después lo de la cara. */
const ORDEN_ADELANTE = ['acc-bufanda', 'acc-medalla', 'acc-anteojos', 'acc-gorro'];

interface Props {
  species: PetSpecies;
  size: number;
  /** Ids de accesorios puestos. */
  accesorios?: string[];
  className?: string;
}

/** La mascota tal cual está en los mockups, con los accesorios encima. */
export function Mascota({ species, size, accesorios = [], className }: Props) {
  const puestos = accesorios.filter((id) => ARCHIVO_ACCESORIO[id]);
  const atras = puestos.filter((id) => CAPA_DE_ATRAS.has(id));
  const adelante = ORDEN_ADELANTE.filter((id) => puestos.includes(id));

  const capa = (id: string, z: number) => (
    <img
      key={id}
      src={ARCHIVO_ACCESORIO[id]}
      alt=""
      aria-hidden
      draggable={false}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: z, pointerEvents: 'none' }}
    />
  );

  return (
    // `size` es el tamaño del mockup, pero es un techo: si el hueco es más
    // angosto (un teléfono chico), la mascota se achica en vez de desbordarlo.
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        maxWidth: '100%',
        aspectRatio: '1',
        height: 'auto',
        flex: '0 0 auto',
      }}
    >
      {atras.map((id) => capa(id, 0))}
      <img
        src={ARCHIVO[species]}
        alt={NOMBRE_MASCOTA[species]}
        width={size}
        height={size}
        draggable={false}
        style={{ position: 'relative', zIndex: 1, display: 'block', width: '100%', height: '100%' }}
      />
      {adelante.map((id, i) => capa(id, 2 + i))}
    </span>
  );
}
