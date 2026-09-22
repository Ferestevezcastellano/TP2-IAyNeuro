import type { Level, PetSpecies, SessionSummary } from '../api';
import { BotonVolver, Progreso } from '../components/comunes';
import { Mascota } from '../components/Mascota';
import './Cierre.css';

interface Props {
  species: PetSpecies;
  resumen: SessionSummary;
  niveles: Level[];
  onVolver: () => void;
}

/** 09 — Cierre: la mascota con las estrellas, qué se practicó hoy y un adelanto borroso de mañana. */
export function Cierre({ species, resumen, niveles, onVolver }: Props) {
  const nivel = niveles.find((n) => n.id === resumen.levelId);
  const letras = nivel?.newLetters.length ? nivel.newLetters : (nivel?.cumulativeLetters ?? []).slice(-3);
  const bien = resumen.masteredNow || resumen.accuracy >= 0.8;
  // Mañana: si el nivel quedó dominado y el siguiente está abierto, su primera letra; si no, se repite este.
  const manana = resumen.mastered && resumen.nextLevel?.playable ? resumen.nextLevel.newLetters[0] : letras[0];

  return (
    <div className="pantalla cierre">
      <div className="barra-sesion">
        <BotonVolver onClick={onVolver} />
        <Progreso total={resumen.cardsTotal} actual={resumen.cardsTotal} />
      </div>

      <div className="cierre-tarjeta aparece">
        <Mascota species={species} size={150} />
        <span className={`cierre-estrellas ${bien ? '' : 'apagadas'}`}>{'★'.repeat(3)}</span>
        {!bien && <p className="cierre-nota">{resumen.feedback.valoro}</p>}
      </div>

      <p className="t-instruccion chica">HOY PRACTICASTE</p>
      <div className="casilleros">
        {letras.map((letra) => (
          <span key={letra} className="casillero">
            {letra}
          </span>
        ))}
      </div>

      <div className="cierre-manana">
        <p>MAÑANA...</p>
        <span className="cierre-borroso" aria-hidden>
          {manana ?? '?'}
        </span>
      </div>

      {resumen.masteredNow && (
        <p className="cierre-logro">
          ¡DOMINASTE EL NIVEL! GANASTE 3 ESTRELLAS
          {resumen.accessoryUnlocked ? ` Y ${resumen.accessoryUnlocked.label}` : ''}.
        </p>
      )}

      <div className="espacio" />
      <button className="btn-principal" onClick={onVolver}>
        VOLVER MAÑANA
      </button>
    </div>
  );
}
