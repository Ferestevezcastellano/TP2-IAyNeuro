import type { Level, Profile } from '../api';
import { Mascota } from '../components/Mascota';
import './Inicio.css';

interface Props {
  perfil: Profile;
  niveles: Level[];
  onJugar: (levelId?: string) => void;
  onRepaso: () => void;
  onMascota: () => void;
  onSalir: () => void;
}

function tituloDe(nivel: Level): string {
  return nivel.newLetters.length > 0 ? nivel.newLetters.join(' · ') : nivel.title.toUpperCase();
}

/** 03 — Pantalla inicial: saludo, estrellas, Jugar / Repaso y la lista de niveles. */
export function Inicio({ perfil, niveles, onJugar, onRepaso, onMascota, onSalir }: Props) {
  const equipados = perfil.pet.accessories.filter((a) => a.equipped).map((a) => a.id);
  const hayRepaso = niveles.some((n) => n.status === 'MASTERED');
  // Si no queda nivel nuevo (la docente todavia no habilito mas), Jugar repite el ultimo jugable.
  const paraJugar = perfil.currentLevel ?? [...niveles].reverse().find((n) => n.playable) ?? null;

  return (
    <div className="inicio">
      <header className="inicio-cabecera">
        <button className="inicio-avatar" onClick={onMascota} aria-label="Vestí a tu compañero">
          <Mascota species={perfil.pet.species} size={50} accesorios={equipados} />
        </button>
        <h1 className="inicio-hola">HOLA</h1>
        <button className="inicio-estrellas" onClick={onSalir} title="Empezar de cero">
          <span>★</span> {perfil.stars}
        </button>
      </header>

      <div className="inicio-acciones">
        <button className="inicio-jugar" onClick={() => onJugar(paraJugar?.id)} disabled={!paraJugar} aria-label="Jugar">
          <img src="/icons/play.svg" width={24} height={24} alt="" />
        </button>
        <button className="inicio-repaso" onClick={onRepaso} aria-label="Repaso" disabled={!hayRepaso} title={hayRepaso ? 'Repaso' : 'Dominá un nivel para repasar'}>
          <img src="/icons/refresh.svg" width={24} height={24} alt="" />
        </button>
      </div>

      <ul className="niveles">
        {niveles.map((nivel) => {
          const dominado = nivel.status === 'MASTERED';
          const trabado = !nivel.playable;
          const clase = dominado ? 'dominado' : trabado ? 'trabado' : 'actual';
          return (
            <li key={nivel.id} className={`nivel ${clase}`}>
              <button className="nivel-boton" onClick={() => onJugar(nivel.id)} disabled={trabado} aria-label={`Nivel ${nivel.order} ${tituloDe(nivel)}`}>
                <span className="nivel-numero">{nivel.order}</span>
                <span className="nivel-titulo">{tituloDe(nivel)}</span>
                {trabado ? (
                  <img className="nivel-candado" src="/icons/lock.svg" width={24} height={24} alt="Bloqueado" />
                ) : (
                  <span className={`nivel-estrellas ${nivel.stars > 0 ? 'ganadas' : ''}`}>★★★</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
