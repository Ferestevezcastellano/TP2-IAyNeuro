import { useId } from 'react';

/**
 * Cómo se pone la boca para cada sonido. No es fonética de laboratorio: es lo
 * que una docente de primer grado le muestra al chico frente al espejo (labios
 * juntos para la M, dientes juntos para la S, la lengua arriba para la L).
 */
type Lengua = 'abajo' | 'punta-arriba' | 'atras' | 'no';
type Extra = 'aire' | 'nariz' | 'explota' | 'vibra';

type Forma =
  | {
      forma: 'abierta';
      /** Medio ancho de la boca. */
      ancho: number;
      /** Cuánto sube el borde de arriba y cuánto baja el de abajo. */
      arriba: number;
      abajo: number;
      /** Grosor de los labios: más grueso es más redondeado (O, U). */
      labio: number;
      dientesArriba?: boolean;
      dientesAbajo?: boolean;
      /** Los dientes de arriba y los de abajo se tocan (S, CH). */
      dientesJuntos?: boolean;
      lengua: Lengua;
      extra?: Extra;
    }
  | { forma: 'cerrada'; extra?: Extra }
  | { forma: 'dientes-en-labio'; extra?: Extra };

interface Sonido {
  forma: Forma;
  consejo: string;
}

const SONIDOS: Record<string, Sonido> = {
  a: { forma: { forma: 'abierta', ancho: 40, arriba: 20, abajo: 30, labio: 7, dientesArriba: true, lengua: 'abajo' }, consejo: 'ABRÍ LA BOCA BIEN GRANDE' },
  e: { forma: { forma: 'abierta', ancho: 46, arriba: 10, abajo: 18, labio: 7, dientesArriba: true, dientesAbajo: true, lengua: 'abajo' }, consejo: 'ESTIRÁ LA BOCA, COMO SONRIENDO' },
  i: { forma: { forma: 'abierta', ancho: 50, arriba: 8, abajo: 13, labio: 7, dientesArriba: true, dientesAbajo: true, lengua: 'no' }, consejo: 'SONREÍ BIEN ANCHO' },
  o: { forma: { forma: 'abierta', ancho: 24, arriba: 24, abajo: 26, labio: 10, lengua: 'abajo' }, consejo: 'HACÉ UNA RUEDA CON LOS LABIOS' },
  u: { forma: { forma: 'abierta', ancho: 13, arriba: 13, abajo: 14, labio: 12, lengua: 'no' }, consejo: 'LABIOS PARA ADELANTE, COMO PARA DAR UN BESO' },
  m: { forma: { forma: 'cerrada', extra: 'nariz' }, consejo: 'CERRÁ LOS LABIOS Y HACÉ MMM' },
  p: { forma: { forma: 'cerrada', extra: 'explota' }, consejo: 'CERRÁ LOS LABIOS Y SOLTÁ EL AIRE DE GOLPE' },
  b: { forma: { forma: 'cerrada', extra: 'explota' }, consejo: 'CERRÁ LOS LABIOS Y ABRILOS SUAVE' },
  s: { forma: { forma: 'abierta', ancho: 48, arriba: 7, abajo: 9, labio: 7, dientesJuntos: true, lengua: 'no', extra: 'aire' }, consejo: 'JUNTÁ LOS DIENTES Y SOPLÁ: SSS' },
  l: { forma: { forma: 'abierta', ancho: 38, arriba: 16, abajo: 22, labio: 7, dientesArriba: true, lengua: 'punta-arriba' }, consejo: 'LA LENGUA ARRIBA, DETRÁS DE LOS DIENTES' },
  n: { forma: { forma: 'abierta', ancho: 36, arriba: 10, abajo: 15, labio: 7, dientesArriba: true, lengua: 'punta-arriba', extra: 'nariz' }, consejo: 'LENGUA ARRIBA: EL SONIDO SALE POR LA NARIZ' },
  t: { forma: { forma: 'abierta', ancho: 38, arriba: 10, abajo: 15, labio: 7, dientesArriba: true, dientesAbajo: true, lengua: 'punta-arriba', extra: 'explota' }, consejo: 'LA LENGUA TOCA LOS DIENTES DE ARRIBA Y SE SUELTA' },
  d: { forma: { forma: 'abierta', ancho: 38, arriba: 10, abajo: 15, labio: 7, dientesArriba: true, dientesAbajo: true, lengua: 'punta-arriba' }, consejo: 'LA LENGUA TOCA LOS DIENTES DE ARRIBA, SUAVE' },
  k: { forma: { forma: 'abierta', ancho: 38, arriba: 14, abajo: 20, labio: 7, dientesArriba: true, lengua: 'atras', extra: 'explota' }, consejo: 'LEVANTÁ LA LENGUA DE ATRÁS Y SOLTÁ' },
  g: { forma: { forma: 'abierta', ancho: 38, arriba: 14, abajo: 20, labio: 7, dientesArriba: true, lengua: 'atras' }, consejo: 'LEVANTÁ LA LENGUA DE ATRÁS, SUAVE' },
  j: { forma: { forma: 'abierta', ancho: 38, arriba: 14, abajo: 20, labio: 7, dientesArriba: true, lengua: 'atras', extra: 'aire' }, consejo: 'LENGUA DE ATRÁS ARRIBA Y SOPLÁ FUERTE' },
  f: { forma: { forma: 'dientes-en-labio', extra: 'aire' }, consejo: 'APOYÁ LOS DIENTES EN EL LABIO DE ABAJO Y SOPLÁ' },
  r: { forma: { forma: 'abierta', ancho: 36, arriba: 14, abajo: 20, labio: 7, dientesArriba: true, lengua: 'punta-arriba', extra: 'vibra' }, consejo: 'LA PUNTA DE LA LENGUA ARRIBA, QUE VIBRE' },
  ch: { forma: { forma: 'abierta', ancho: 28, arriba: 10, abajo: 12, labio: 10, dientesJuntos: true, lengua: 'no', extra: 'aire' }, consejo: 'LABIOS PARA AFUERA Y SOLTÁ: CH' },
  ll: { forma: { forma: 'abierta', ancho: 46, arriba: 8, abajo: 12, labio: 7, dientesArriba: true, lengua: 'atras' }, consejo: 'LA LENGUA ARRIBA, COMO EN LLUVIA' },
};

/**
 * Parte una letra, sílaba o palabra en sonidos, con la ortografía del español:
 * CH, LL y RR son un sonido; la C suena S antes de E e I y K en el resto; la H
 * no suena. Devuelve cada sonido con cómo se escribe, para rotularlo.
 */
export function sonidosDe(texto: string): { clave: string; escrito: string }[] {
  const t = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-̂̄-ͯ]/g, '')
    .normalize('NFC')
    .replace(/[^a-zñ]/g, '');
  const salida: { clave: string; escrito: string }[] = [];
  let i = 0;
  while (i < t.length) {
    const dos = t.slice(i, i + 2);
    const c = t[i];
    const siguiente = t[i + 1] ?? '';
    let clave: string;
    let largo = 1;
    if (dos === 'ch' || dos === 'll') {
      clave = dos;
      largo = 2;
    } else if (dos === 'rr') {
      clave = 'r';
      largo = 2;
    } else if (dos === 'qu') {
      clave = 'k';
      largo = 2;
    } else if (c === 'h') {
      i += 1;
      continue;
    } else if (c === 'c') clave = 'ei'.includes(siguiente) ? 's' : 'k';
    else if (c === 'g') clave = 'ei'.includes(siguiente) ? 'j' : 'g';
    else if (c === 'z') clave = 's';
    else if (c === 'v' || c === 'w') clave = 'b';
    else if (c === 'x') clave = 'k';
    else if (c === 'ñ') clave = 'n';
    else if (c === 'y') clave = i === t.length - 1 ? 'i' : 'll';
    else clave = c;
    const escrito = t.slice(i, i + largo).toUpperCase();
    // Un sonido estirado ("aaa", "mmm") es un solo sonido.
    if (SONIDOS[clave] && salida[salida.length - 1]?.clave !== clave) salida.push({ clave, escrito });
    i += largo;
  }
  return salida;
}

/** Cómo se dice un sonido, en palabras para el chico (y el adulto al lado). */
export function consejoDe(clave: string): string {
  return SONIDOS[clave]?.consejo ?? '';
}

const LABIO = '#E56B5D';
const ADENTRO = '#5B2333';
const LENGUA = '#F28C96';
const DIENTE = '#FFFFFF';
const PIEL = '#FFE6C7';
const AIRE = '#6FA8E0';
const VIBRA = '#FF8A4C';

const CX = 80;
const CY = 66;

/** Una boca de frente, en la posición del sonido `clave`. */
export function Boca({ clave, size = 140 }: { clave: string; size?: number }) {
  const id = useId();
  const sonido = SONIDOS[clave];
  if (!sonido) return null;
  const f = sonido.forma;

  return (
    <svg width={size} height={(size * 120) / 160} viewBox="0 0 160 120" role="img" aria-label={sonido.consejo}>
      <circle cx={CX} cy={CY} r={56} fill={PIEL} />
      {f.forma === 'abierta' && <BocaAbierta f={f} id={id} />}
      {f.forma === 'cerrada' && <BocaCerrada />}
      {f.forma === 'dientes-en-labio' && <DientesEnLabio />}
      {f.extra && <Detalle extra={f.extra} />}
    </svg>
  );
}

function BocaAbierta({ f, id }: { f: Extract<Forma, { forma: 'abierta' }>; id: string }) {
  const { ancho: w, arriba: a, abajo: b } = f;
  // Dos curvas: la de arriba sube `a` y la de abajo baja `b` en el centro.
  const contorno = `M ${CX - w} ${CY} Q ${CX} ${CY - 2 * a} ${CX + w} ${CY} Q ${CX} ${CY + 2 * b} ${CX - w} ${CY} Z`;
  const clip = `boca-${id.replace(/:/g, '')}`;
  const alto = a + b;
  const diente = Math.max(5, Math.min(10, alto * 0.28));

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={contorno} />
        </clipPath>
      </defs>
      <path d={contorno} fill={ADENTRO} />
      <g clipPath={`url(#${clip})`}>
        {f.lengua === 'abajo' && <ellipse cx={CX} cy={CY + b} rx={w * 0.6} ry={Math.max(6, b * 0.7)} fill={LENGUA} />}
        {f.lengua === 'atras' && <ellipse cx={CX} cy={CY + b * 0.35} rx={w * 0.72} ry={Math.max(8, b * 0.9)} fill={LENGUA} />}
        {f.lengua === 'punta-arriba' && (
          <path
            d={`M ${CX - w * 0.3} ${CY + b + 4} Q ${CX - w * 0.26} ${CY - a + diente} ${CX} ${CY - a + diente} Q ${CX + w * 0.26} ${CY - a + diente} ${CX + w * 0.3} ${CY + b + 4} Z`}
            fill={LENGUA}
          />
        )}
        {f.dientesJuntos ? (
          <>
            <rect x={CX - w} y={CY - a} width={2 * w} height={a + 0.5} fill={DIENTE} />
            <rect x={CX - w} y={CY} width={2 * w} height={b} fill={DIENTE} />
            <line x1={CX - w} y1={CY} x2={CX + w} y2={CY} stroke="#E4DCD4" strokeWidth={1.5} />
          </>
        ) : (
          <>
            {f.dientesArriba && <rect x={CX - w} y={CY - a - 2} width={2 * w} height={diente + 2} fill={DIENTE} />}
            {f.dientesAbajo && <rect x={CX - w} y={CY + b - diente} width={2 * w} height={diente + 2} fill={DIENTE} />}
          </>
        )}
      </g>
      <path d={contorno} fill="none" stroke={LABIO} strokeWidth={f.labio} strokeLinejoin="round" />
    </g>
  );
}

/** Labios juntos (M, P, B). */
function BocaCerrada() {
  return (
    <g>
      <path d={`M ${CX - 38} ${CY} Q ${CX} ${CY - 26} ${CX + 38} ${CY} Q ${CX} ${CY + 2} ${CX - 38} ${CY} Z`} fill={LABIO} />
      <path d={`M ${CX - 38} ${CY} Q ${CX} ${CY + 28} ${CX + 38} ${CY} Q ${CX} ${CY + 2} ${CX - 38} ${CY} Z`} fill="#D65A4D" />
      <path d={`M ${CX - 38} ${CY} Q ${CX} ${CY + 4} ${CX + 38} ${CY}`} fill="none" stroke={ADENTRO} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

/** Los dientes de arriba apoyados en el labio de abajo (F). */
function DientesEnLabio() {
  return (
    <g>
      <path d={`M ${CX - 34} ${CY - 2} Q ${CX} ${CY - 16} ${CX + 34} ${CY - 2} Z`} fill={ADENTRO} />
      <path d={`M ${CX - 36} ${CY} Q ${CX} ${CY - 18} ${CX + 36} ${CY}`} fill="none" stroke={LABIO} strokeWidth={7} strokeLinecap="round" />
      <path d={`M ${CX - 34} ${CY + 2} Q ${CX} ${CY + 20} ${CX + 34} ${CY + 2} Q ${CX} ${CY + 8} ${CX - 34} ${CY + 2} Z`} fill="#D65A4D" />
      <rect x={CX - 22} y={CY - 9} width={44} height={12} rx={2} fill={DIENTE} />
      <line x1={CX} y1={CY - 9} x2={CX} y2={CY + 3} stroke="#E4DCD4" strokeWidth={1.2} />
    </g>
  );
}

/** Lo que no se ve en la boca: el aire que sale, la nariz que zumba, el golpe, la vibración. */
function Detalle({ extra }: { extra: Extra }) {
  if (extra === 'aire') {
    return (
      <g fill="none" stroke={AIRE} strokeWidth={3} strokeLinecap="round">
        <path d="M 128 56 q 8 -3 16 0" />
        <path d="M 130 66 q 10 -3 20 0" />
        <path d="M 128 76 q 8 -3 16 0" />
      </g>
    );
  }
  if (extra === 'nariz') {
    return (
      <g fill="none" stroke={VIBRA} strokeWidth={2.5} strokeLinecap="round">
        <path d="M 68 26 q 4 -5 8 0 q 4 5 8 0 q 4 -5 8 0" />
        <path d="M 64 16 q 4 -5 8 0 q 4 5 8 0 q 4 -5 8 0 q 4 5 8 0" />
      </g>
    );
  }
  if (extra === 'explota') {
    return (
      <g stroke={AIRE} strokeWidth={3} strokeLinecap="round">
        <line x1={124} y1={66} x2={140} y2={66} />
        <line x1={122} y1={54} x2={135} y2={46} />
        <line x1={122} y1={78} x2={135} y2={86} />
      </g>
    );
  }
  return (
    <g fill="none" stroke={VIBRA} strokeWidth={2.5} strokeLinecap="round">
      <path d="M 126 56 l 5 5 l -5 5 l 5 5 l -5 5" />
      <path d="M 34 56 l -5 5 l 5 5 l -5 5 l 5 5" />
    </g>
  );
}
