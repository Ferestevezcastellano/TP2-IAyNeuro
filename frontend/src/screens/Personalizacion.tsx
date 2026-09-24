import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type Accessory, type Level, type Pet, type PetSpecies } from '../api';
import { celebrar } from '../audio';
import { BotonVolver } from '../components/comunes';
import { Mascota, NOMBRE_MASCOTA, PiezaAccesorio } from '../components/Mascota';
import './Personalizacion.css';

interface Props {
  species: PetSpecies;
  estrellas: number;
  niveles: Level[];
  onVolver: () => void;
}

type Categoria = 'GORROS' | 'ANTEOJOS' | 'ROPA' | 'ESPECIALES';

const CATEGORIAS: Categoria[] = ['GORROS', 'ANTEOJOS', 'ROPA', 'ESPECIALES'];

const ICONO_CATEGORIA: Record<Categoria, string> = {
  GORROS: '/accesorios/gorro.svg',
  ANTEOJOS: '/accesorios/anteojos.svg',
  ROPA: '/accesorios/bufanda.svg',
  ESPECIALES: '/accesorios/medalla.svg',
};

const POR_ID: Record<string, Categoria> = {
  'acc-gorro': 'GORROS',
  'acc-anteojos': 'ANTEOJOS',
  'acc-bufanda': 'ROPA',
  'acc-capa': 'ROPA',
  'acc-mochila': 'ROPA',
  'acc-medalla': 'ESPECIALES',
};

const POR_SLOT: Record<string, Categoria> = { HEAD: 'GORROS', FACE: 'ANTEOJOS', NECK: 'ROPA', BODY: 'ROPA' };

const categoriaDe = (a: Accessory): Categoria => POR_ID[a.id] ?? POR_SLOT[a.slot] ?? 'ESPECIALES';

/**
 * 08 — El compañero.
 *
 * Es una pantalla de colección, no un formulario. Tres cosas la sostienen:
 *
 * 1. **La mascota es la protagonista.** Escenario propio, sombra apoyada en el
 *    piso, y reacciona cada vez que se prueba algo. Si el personaje no se mueve
 *    al vestirlo, vestirlo no se siente.
 * 2. **Las piezas se sienten objetos.** Cada una tiene canto sólido abajo y se
 *    hunde al tocarla, como una ficha de juguete.
 * 3. **Lo bloqueado da ganas.** Se ve la silueta de lo que falta y, encima, la
 *    letra que hay que dominar para ganarlo. Un candado frustra; una letra es
 *    una meta.
 */
export function Personalizacion({ species, estrellas, niveles, onVolver }: Props) {
  const [mascota, setMascota] = useState<Pet | null>(null);
  const [puestos, setPuestos] = useState<string[]>([]);
  const [categoria, setCategoria] = useState<Categoria>('GORROS');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  /** Se incrementa en cada cambio: dispara el rebote y las chispas. */
  const [pulso, setPulso] = useState(0);
  const primeraCarga = useRef(true);

  useEffect(() => {
    let vivo = true;
    api
      .pet()
      .then((m) => {
        if (!vivo) return;
        setMascota(m);
        setPuestos(m.accessories.filter((a) => a.equipped).map((a) => a.id));
      })
      .catch((e) => vivo && setError(e instanceof Error ? e.message : 'NO SE PUDO CARGAR TU COMPAÑERO.'));
    return () => {
      vivo = false;
    };
  }, []);

  const letrasPorNivel = useMemo(() => {
    const mapa = new Map<number, string[]>();
    niveles.forEach((n) => mapa.set(n.order, n.newLetters.length ? n.newLetters : n.cumulativeLetters.slice(-2)));
    return mapa;
  }, [niveles]);

  const todos = mascota?.accessories ?? [];
  const delGrupo = todos.filter((a) => categoriaDe(a) === categoria);
  const ganados = todos.filter((a) => a.owned).length;

  /** Cuántos hay sin desbloquear por categoría: el numerito de la solapa. */
  const faltanPorCategoria = useMemo(() => {
    const m = new Map<Categoria, number>();
    todos.forEach((a) => {
      if (!a.owned) m.set(categoriaDe(a), (m.get(categoriaDe(a)) ?? 0) + 1);
    });
    return m;
  }, [todos]);

  const alternar = (a: Accessory) => {
    if (!a.owned) return;
    setPuestos((actual) => (actual.includes(a.id) ? actual.filter((x) => x !== a.id) : [...actual, a.id]));
    setPulso((n) => n + 1);
    if (primeraCarga.current) primeraCarga.current = false;
    celebrar([880]);
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await api.equip(puestos);
      onVolver();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NO SE PUDO GUARDAR.');
      setGuardando(false);
    }
  };

  return (
    <div className="pantalla persona">
      <header className="persona-barra">
        <BotonVolver onClick={onVolver} />
        <h2 className="persona-titulo">TU COMPAÑERO</h2>
        <span className="persona-estrellas">
          <span aria-hidden>★</span> {estrellas}
        </span>
      </header>

      {/* ---- Escenario ---- */}
      <div className="persona-escena">
        <span className="persona-halo" aria-hidden />
        <div key={pulso} className={`persona-figura ${pulso > 0 ? 'rebota' : ''}`}>
          <Mascota species={species} size={210} accesorios={puestos} />
          {pulso > 0 && (
            <span className="persona-chispas" aria-hidden>
              {Array.from({ length: 7 }, (_, i) => (
                <i key={i} style={{ ['--a' as string]: `${(i * 360) / 7}deg` }} />
              ))}
            </span>
          )}
        </div>
        <span className="persona-piso" aria-hidden />
      </div>

      <p className="persona-nombre">
        {NOMBRE_MASCOTA[species]} · <strong>{ganados}</strong> de {todos.length}
      </p>

      {error && <p className="aviso">{error}</p>}

      {/* ---- Bandeja ---- */}
      <section className="persona-bandeja">
        <nav className="persona-tabs" role="tablist" aria-label="Tipo de accesorio">
          <span
            className="persona-tab-fondo"
            aria-hidden
            style={{ transform: `translateX(${CATEGORIAS.indexOf(categoria) * 100}%)` }}
          />
          {CATEGORIAS.map((c) => {
            const faltan = faltanPorCategoria.get(c) ?? 0;
            return (
              <button
                key={c}
                role="tab"
                aria-selected={categoria === c}
                className={`persona-tab ${categoria === c ? 'activa' : ''}`}
                onClick={() => setCategoria(c)}
              >
                <img src={ICONO_CATEGORIA[c]} alt="" aria-hidden className="persona-tab-icono" />
                <span>{c}</span>
                {faltan > 0 && <i className="persona-tab-falta">{faltan}</i>}
              </button>
            );
          })}
        </nav>

        <div className="persona-grilla">
          {delGrupo.length === 0 && <p className="persona-vacio">TODAVÍA NO HAY NADA ACÁ</p>}

          {delGrupo.map((a) => {
            const puesto = puestos.includes(a.id);
            const letras = letrasPorNivel.get(a.unlockedByLevelOrder) ?? [];
            return (
              <button
                key={a.id}
                className={`persona-item ${a.owned ? '' : 'trabado'} ${puesto ? 'puesto' : ''}`}
                onClick={() => alternar(a)}
                disabled={!a.owned}
                aria-pressed={puesto}
                aria-label={
                  a.owned
                    ? `${a.label}${puesto ? ', puesto' : ''}`
                    : `${a.label}, bloqueado. Se gana al dominar ${letras.join(' y ') || `el nivel ${a.unlockedByLevelOrder}`}`
                }
              >
                <span className="persona-item-caja">
                  <PiezaAccesorio id={a.id} className="persona-item-arte" />
                </span>

                {a.owned ? (
                  <span className="persona-item-nombre">{a.label}</span>
                ) : (
                  // La silueta deja ver QUÉ es, y la cinta dice QUÉ aprender
                  // para tenerlo. Ese par es lo que genera las ganas.
                  <span className="persona-item-pista">
                    {letras.length ? letras.join(' ') : `NIVEL ${a.unlockedByLevelOrder}`}
                  </span>
                )}

                {puesto && (
                  <span className="persona-item-tilde" aria-hidden>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <button className="btn-principal persona-guardar" onClick={guardar} disabled={guardando || !mascota}>
        {guardando ? 'GUARDANDO...' : 'LISTO'}
      </button>
    </div>
  );
}
