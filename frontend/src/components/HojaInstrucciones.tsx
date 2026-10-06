import { useEffect } from 'react';
import type { PetSpecies } from '../api';
import { Boca, consejoDe, sonidosDe } from './Boca';
import { Mascota } from './Mascota';

interface HojaProps {
  species: PetSpecies;
  /** La letra, sílaba o palabra de la tarjeta. */
  letra: string;
  /** Es una palabra u oración: se muestra cómo empieza, no cada sonido. */
  palabra?: boolean;
  sonido: string;
  /** Al cerrar se vuelve a intentar en la misma tarjeta. */
  reintenta?: boolean;
  onCerrar: () => void;
  onEscucharCorrecto: () => void;
  /** Vuelve a reproducir lo que dijo el chico, si se pudo grabar. */
  onEscucharme?: () => void;
}

/** La primera sílaba: los sonidos hasta la primera vocal, inclusive. */
function primeraSilaba<T extends { clave: string }>(sonidos: T[]): T[] {
  const vocal = sonidos.findIndex((s) => 'aeiou'.includes(s.clave));
  return vocal < 0 ? sonidos.slice(0, 1) : sonidos.slice(0, vocal + 1);
}

/**
 * 05 — La hoja naranja: cómo se pone la boca para decirlo bien. Una boca por
 * sonido, en orden (la M y después la A para MA), con qué hacer en palabras.
 * Al abrirse suena cómo se dice, para comparar con lo que acaba de escuchar de
 * sí mismo.
 */
export function HojaInstrucciones({ species, letra, palabra, sonido, reintenta, onCerrar, onEscucharCorrecto, onEscucharme }: HojaProps) {
  const texto = palabra ? letra.split(/\s+/)[0] ?? '' : letra;
  const todos = sonidosDe(texto);
  const bocas = palabra ? primeraSilaba(todos) : todos.slice(0, 3);

  useEffect(() => {
    const t = window.setTimeout(onEscucharCorrecto, 450);
    return () => window.clearTimeout(t);
    // Solo al abrir la hoja.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hoja" role="dialog" aria-label="Cómo se hace el sonido">
      <button className="btn-volver" onClick={onCerrar} aria-label="Cerrar">
        <img src="/icons/xmark.svg" width={24} height={24} alt="" />
      </button>
      <div className="hoja-cabecera">
        <Mascota species={species} size={56} />
        <p>
          {palabra ? (
            <>
              ASÍ EMPIEZA
              <br />
              <strong>{letra.toUpperCase()}</strong>
            </>
          ) : (
            <>
              MIRÁ MI BOCA Y DECÍ
              <br />
              <strong>{sonido.toUpperCase()}</strong>
            </>
          )}
        </p>
      </div>
      <div className="hoja-bocas">
        {bocas.map((s, i) => (
          <div className="hoja-boca" key={`${s.clave}-${i}`}>
            {i > 0 && <span className="hoja-flecha" aria-hidden>→</span>}
            <figure>
              <Boca clave={s.clave} size={bocas.length > 2 ? 110 : 160} />
              <figcaption>
                <strong>{s.escrito}</strong>
                {consejoDe(s.clave)}
              </figcaption>
            </figure>
          </div>
        ))}
      </div>
      <div className="hoja-escuchar">
        <button className="btn-secundario" onClick={onEscucharCorrecto}>
          <img src="/icons/sound-high.svg" width={20} height={20} alt="" /> ASÍ SE DICE
        </button>
        {onEscucharme && (
          <button className="btn-secundario" onClick={onEscucharme}>
            <img src="/icons/microphone.svg" width={20} height={20} alt="" style={{ filter: 'invert(1)' }} /> ASÍ SONASTE
          </button>
        )}
      </div>
      {/* El boton dice exactamente lo que va a pasar al tocarlo: si quedan
          intentos se vuelve a la misma tarjeta, y si no, se sigue. */}
      <button className="btn-hoja" onClick={onCerrar}>
        {reintenta ? 'PROBAR DE NUEVO' : 'SEGUIR'}
      </button>
    </div>
  );
}
