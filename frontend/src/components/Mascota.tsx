import type { PetSpecies } from '../api';
import { EMOJI_ACCESORIO } from '../ilustraciones';

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

interface Props {
  species: PetSpecies;
  size: number;
  /** Ids de accesorios puestos. Hasta que exista el arte, se dibujan como emoji. */
  accesorios?: string[];
  className?: string;
}

/** La mascota tal cual está en los mockups: el SVG exportado de Figma, sin redibujar. */
export function Mascota({ species, size, accesorios = [], className }: Props) {
  return (
    <span className={className} style={{ position: 'relative', display: 'inline-block', width: size, height: size, flex: '0 0 auto' }}>
      <img src={ARCHIVO[species]} alt={NOMBRE_MASCOTA[species]} width={size} height={size} draggable={false} style={{ display: 'block' }} />
      {accesorios.length > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: -size * 0.04,
            bottom: -size * 0.04,
            fontSize: size * 0.3,
            lineHeight: 1,
            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))',
          }}
        >
          {accesorios.map((id) => EMOJI_ACCESORIO[id] ?? '✨').join('')}
        </span>
      )}
    </span>
  );
}
