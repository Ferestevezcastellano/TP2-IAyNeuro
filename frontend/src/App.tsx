import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, getToken, setToken, type Level, type Profile, type SessionSummary } from './api';
import { Carga } from './screens/Carga';
import { Onboarding } from './screens/Onboarding';
import { Inicio } from './screens/Inicio';
import { Sesion } from './screens/Sesion';
import { Cierre } from './screens/Cierre';
import { Repaso } from './screens/Repaso';
import { Personalizacion } from './screens/Personalizacion';

type Pantalla =
  | { nombre: 'carga' }
  | { nombre: 'onboarding' }
  | { nombre: 'inicio' }
  | { nombre: 'sesion'; levelId?: string }
  | { nombre: 'cierre'; resumen: SessionSummary }
  | { nombre: 'repaso' }
  | { nombre: 'personalizacion' };

export default function App() {
  const [pantalla, setPantalla] = useState<Pantalla>({ nombre: 'carga' });
  const [perfil, setPerfil] = useState<Profile | null>(null);
  const [niveles, setNiveles] = useState<Level[]>([]);

  const refrescar = useCallback(async () => {
    const [p, n] = await Promise.all([api.profile(), api.levels()]);
    setPerfil(p);
    setNiveles(n);
  }, []);

  // La pantalla de carga dura lo que tarda en saberse si hay un alumno guardado.
  useEffect(() => {
    let vivo = true;
    const minimo = new Promise((r) => setTimeout(r, 1400));

    (async () => {
      let destino: Pantalla = { nombre: 'onboarding' };
      await api.despertar().catch(() => undefined);
      if (getToken()) {
        try {
          await refrescar();
          destino = { nombre: 'inicio' };
        } catch (error) {
          // El estado del servidor vive en memoria: un token viejo se descarta.
          if (error instanceof ApiError && (error.status === 401 || error.status === 404)) setToken(null);
        }
      }
      await minimo;
      if (vivo) setPantalla(destino);
    })();

    return () => {
      vivo = false;
    };
  }, [refrescar]);

  const irAlInicio = async () => {
    await refrescar();
    setPantalla({ nombre: 'inicio' });
  };

  const irAlAmigo = async () => {
    // Refresca antes: el accesorio recién ganado y las estrellas nuevas tienen que estar.
    await refrescar();
    setPantalla({ nombre: 'personalizacion' });
  };

  const salir = () => {
    setToken(null);
    setPerfil(null);
    setNiveles([]);
    setPantalla({ nombre: 'onboarding' });
  };

  return (
    <div className="telefono">
      {pantalla.nombre === 'carga' && <Carga />}

      {pantalla.nombre === 'onboarding' && (
        <Onboarding
          onListo={async () => {
            await refrescar();
            setPantalla({ nombre: 'inicio' });
          }}
        />
      )}

      {pantalla.nombre === 'inicio' && perfil && (
        <Inicio
          perfil={perfil}
          niveles={niveles}
          onJugar={(levelId) => setPantalla({ nombre: 'sesion', levelId })}
          onRepaso={() => setPantalla({ nombre: 'repaso' })}
          onMascota={() => setPantalla({ nombre: 'personalizacion' })}
          onSalir={salir}
        />
      )}

      {pantalla.nombre === 'sesion' && perfil && (
        <Sesion
          species={perfil.pet.species}
          levelId={pantalla.levelId}
          onSalir={irAlInicio}
          onTerminada={(resumen) => setPantalla({ nombre: 'cierre', resumen })}
        />
      )}

      {pantalla.nombre === 'cierre' && perfil && (
        <Cierre
          species={perfil.pet.species}
          resumen={pantalla.resumen}
          niveles={niveles}
          accesorios={perfil.pet.accessories}
          onVolver={irAlInicio}
          onAmigo={irAlAmigo}
        />
      )}

      {pantalla.nombre === 'repaso' && perfil && <Repaso species={perfil.pet.species} onVolver={irAlInicio} />}

      {pantalla.nombre === 'personalizacion' && perfil && (
        <Personalizacion
          species={perfil.pet.species}
          estrellas={perfil.stars}
          niveles={niveles}
          onVolver={irAlInicio}
        />
      )}
    </div>
  );
}
