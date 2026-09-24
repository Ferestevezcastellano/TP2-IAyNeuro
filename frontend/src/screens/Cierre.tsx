import type { Accessory, Level, PetSpecies, SessionSummary } from '../api';
import { BotonVolver, Progreso } from '../components/comunes';
import { Mascota, PiezaAccesorio } from '../components/Mascota';
import './Cierre.css';

interface Props {
  species: PetSpecies;
  resumen: SessionSummary;
  niveles: Level[];
  /** Los accesorios del compañero, como estaban antes de esta sesión. */
  accesorios: Accessory[];
  onVolver: () => void;
  /** Ir a la pantalla del compañero, a probarse lo ganado. */
  onAmigo: () => void;
}

type EstadoPremio = 'ganado' | 'tuyo' | 'pendiente';

/** 09 — Cierre: la mascota con las estrellas, qué se practicó hoy y un adelanto borroso de mañana. */
export function Cierre({ species, resumen, niveles, accesorios, onVolver, onAmigo }: Props) {
  const nivel = niveles.find((n) => n.id === resumen.levelId);
  const letras = nivel?.newLetters.length ? nivel.newLetters : (nivel?.cumulativeLetters ?? []).slice(-3);
  const bien = resumen.masteredNow || resumen.accuracy >= 0.8;
  // Mañana: si el nivel quedó dominado y el siguiente está abierto, su primera letra; si no, se repite este.
  const manana = resumen.mastered && resumen.nextLevel?.playable ? resumen.nextLevel.newLetters[0] : letras[0];

  // El premio del nivel, siempre a la vista: ganarlo es la meta que se ve.
  const premioId = resumen.accessoryUnlocked?.id ?? nivel?.accessoryId;
  const premio = accesorios.find((a) => a.id === premioId);
  const nombrePremio = resumen.accessoryUnlocked?.label ?? premio?.label;
  const estadoPremio: EstadoPremio = resumen.accessoryUnlocked ? 'ganado' : premio?.owned || resumen.mastered ? 'tuyo' : 'pendiente';
  // Lo que ya tenía puesto, más lo recién ganado para que se vea cómo le queda.
  const puestos = accesorios.filter((a) => a.equipped).map((a) => a.id);
  if (estadoPremio === 'ganado' && premioId && !puestos.includes(premioId)) puestos.push(premioId);

  return (
    <div className="pantalla cierre">
      <div className="barra-sesion">
        <BotonVolver onClick={onVolver} />
        <Progreso total={resumen.cardsTotal} actual={resumen.cardsTotal} />
      </div>

      <div className="cierre-tarjeta aparece">
        <Mascota species={species} size={130} accesorios={puestos} />
        <span className={`cierre-estrellas ${bien ? '' : 'apagadas'}`}>{'★'.repeat(3)}</span>
        {!bien && <p className="cierre-nota">{resumen.feedback.valoro}</p>}
      </div>

      <div className="cierre-fila">
        <div className="cierre-hoy">
          <p className="t-instruccion chica">HOY PRACTICASTE</p>
          <div className="casilleros">
            {letras.map((letra) => (
              <span key={letra} className="casillero">
                {letra}
              </span>
            ))}
          </div>
        </div>

        <div className="cierre-manana">
          <p>MAÑANA...</p>
          <span className="cierre-borroso" aria-hidden>
            {manana ?? '?'}
          </span>
        </div>
      </div>

      {resumen.masteredNow && <p className="cierre-logro">¡DOMINASTE EL NIVEL! GANASTE 3 ESTRELLAS.</p>}

      {premioId && nombrePremio && (
        <div className={`cierre-premio ${estadoPremio}`}>
          <span className="cierre-premio-caja">
            <PiezaAccesorio id={premioId} size={50} className="cierre-premio-arte" />
          </span>
          <div className="cierre-premio-texto">
            <span className="cierre-premio-titulo">
              {estadoPremio === 'ganado'
                ? '¡GANASTE UN PREMIO!'
                : estadoPremio === 'tuyo'
                  ? 'EL PREMIO DE ESTE NIVEL YA ES TUYO'
                  : 'SI DOMINÁS ESTE NIVEL, GANÁS'}
            </span>
            <span className="cierre-premio-nombre">{nombrePremio}</span>
          </div>
        </div>
      )}

      <div className="espacio" />
      <div className="cierre-botones">
        <button className="btn-principal cierre-volver" onClick={onVolver}>
          VOLVER MAÑANA
        </button>
        <button className="cierre-amigo" onClick={onAmigo}>
          <Mascota species={species} size={36} accesorios={puestos} />
          {estadoPremio === 'ganado' ? 'PROBÁRSELO A MI AMIGO' : 'IR CON MI AMIGO'}
        </button>
      </div>
    </div>
  );
}
