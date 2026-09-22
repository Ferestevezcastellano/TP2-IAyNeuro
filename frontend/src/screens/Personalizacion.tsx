import { useEffect, useState } from 'react';
import { api, type Pet, type PetSpecies } from '../api';
import { BotonVolver } from '../components/comunes';
import { Mascota } from '../components/Mascota';
import { EMOJI_ACCESORIO } from '../ilustraciones';
import './Personalizacion.css';

interface Props {
  species: PetSpecies;
  onVolver: () => void;
}

/** 08 — Personalización: solo se puede poner lo ya ganado; cada nivel dominado paga un accesorio. */
export function Personalizacion({ species, onVolver }: Props) {
  const [mascota, setMascota] = useState<Pet | null>(null);
  const [puestos, setPuestos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vivo = true;
    api
      .pet()
      .then((m) => {
        if (!vivo) return;
        setMascota(m);
        setPuestos(m.accessories.filter((a) => a.equipped).map((a) => a.id));
      })
      .catch((e) => vivo && setError(e instanceof Error ? e.message : 'NO SE PUDO CARGAR LA MASCOTA.'));
    return () => {
      vivo = false;
    };
  }, []);

  const alternar = (id: string) => {
    setPuestos((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]));
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await api.equip(puestos);
      onVolver();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NO SE PUDO GUARDAR.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="pantalla personalizacion">
      <div className="barra-sesion">
        <BotonVolver onClick={onVolver} />
        <h2 className="personalizacion-titulo">VESTÍ A TU COMPAÑERO</h2>
      </div>

      <div className="personalizacion-escenario">
        <Mascota species={species} size={150} accesorios={puestos} />
      </div>

      {error && <p className="aviso">{error}</p>}

      <div className="accesorios">
        {(mascota?.accessories ?? []).map((accesorio) => (
          <button
            key={accesorio.id}
            className={`accesorio ${accesorio.owned ? '' : 'trabado'} ${puestos.includes(accesorio.id) ? 'puesto' : ''}`}
            onClick={() => alternar(accesorio.id)}
            disabled={!accesorio.owned}
            aria-pressed={puestos.includes(accesorio.id)}
          >
            {accesorio.owned ? (
              <>
                <span className="accesorio-emoji">{EMOJI_ACCESORIO[accesorio.id] ?? '✨'}</span>
                {accesorio.label}
              </>
            ) : (
              `NIVEL ${accesorio.unlockedByLevelOrder}`
            )}
          </button>
        ))}
      </div>

      <div className="espacio" />
      <button className="btn-principal" onClick={guardar} disabled={guardando || !mascota}>
        {guardando ? 'GUARDANDO...' : 'GUARDAR'}
      </button>
    </div>
  );
}
