import type { PetSpecies } from '../api';
import { ACCESORIOS } from '../accesorios';

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
 * Un accesorio solo, encuadrado para que se vea la pieza y no el aire
 * alrededor. Sin `size` ocupa todo su contenedor, que tiene que ser cuadrado.
 */
export function PiezaAccesorio({ id, size, className }: { id: string; size?: number; className?: string }) {
  const [x, y, lado] = ACCESORIOS[id]?.encuadre ?? [0, 0, 150];
  const pct = (n: number) => `${(n / lado) * 100}%`;
  const caja = size ?? '100%';
  return (
    <span className={className} style={{ display: 'block', width: caja, height: caja, overflow: 'hidden', position: 'relative' }}>
      <img
        src={ACCESORIOS[id]?.archivo ?? ''}
        alt=""
        aria-hidden
        draggable={false}
        style={{ position: 'absolute', width: pct(150), height: pct(150), maxWidth: 'none', left: pct(-x), top: pct(-y) }}
      />
    </span>
  );
}

interface Props {
  species: PetSpecies;
  size: number;
  /** Ids de accesorios puestos. */
  accesorios?: string[];
  className?: string;
}

/** La mascota tal cual está en los mockups, con los accesorios encima. */
export function Mascota({ species, size, accesorios = [], className }: Props) {
  const puestos = accesorios.filter((id) => ACCESORIOS[id]);
  const atras = puestos.filter((id) => ACCESORIOS[id].plano === 0);
  const adelante = puestos.filter((id) => ACCESORIOS[id].plano > 0).sort((a, b) => ACCESORIOS[a].plano - ACCESORIOS[b].plano);

  // La mascota está en el plano 1: lo de atrás queda en 0 y lo de adelante, encima.
  const capa = (id: string) => (
    <img
      key={id}
      src={ACCESORIOS[id].archivo}
      alt=""
      aria-hidden
      draggable={false}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: ACCESORIOS[id].plano === 0 ? 0 : 1 + ACCESORIOS[id].plano, pointerEvents: 'none' }}
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
      {atras.map(capa)}
      <img
        src={ARCHIVO[species]}
        alt={NOMBRE_MASCOTA[species]}
        width={size}
        height={size}
        draggable={false}
        style={{ position: 'relative', zIndex: 1, display: 'block', width: '100%', height: '100%' }}
      />
      {adelante.map(capa)}
    </span>
  );
}
