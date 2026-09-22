import { useEffect, useState } from 'react';
import { api, type Card, type PetSpecies } from '../api';
import { BarraSesion, BotonVolver } from '../components/comunes';
import { Mascota } from '../components/Mascota';
import { Tarjeta } from '../components/Tarjeta';

interface Props {
  species: PetSpecies;
  onVolver: () => void;
}

const CANTIDAD = 6;

/**
 * 07 — Repaso: práctica libre sobre lo ya dominado, con las mismas tarjetas.
 * Nada de lo que pase acá toca el promedio de los niveles.
 */
export function Repaso({ species, onVolver }: Props) {
  const [tarjetas, setTarjetas] = useState<Card[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    api
      .reviewCards(CANTIDAD)
      .then((r) => vivo && setTarjetas(r.cards.filter((card) => card.kind !== 'LETTER_INTRO')))
      .catch((e) => vivo && setError(e instanceof Error ? e.message : 'NO SE PUDO ABRIR EL REPASO.'));
    return () => {
      vivo = false;
    };
  }, []);

  if (error) {
    return (
      <div className="pantalla">
        <BotonVolver onClick={onVolver} />
        <div className="espacio" />
        <p className="aviso">{error}</p>
        <div className="espacio" />
      </div>
    );
  }

  if (!tarjetas) {
    return (
      <div className="pantalla">
        <BotonVolver onClick={onVolver} />
      </div>
    );
  }

  if (tarjetas.length === 0 || indice >= tarjetas.length) {
    const terminado = tarjetas.length > 0;
    return (
      <div className="pantalla" style={{ gap: 20 }}>
        <BotonVolver onClick={onVolver} />
        <div className="espacio" />
        <div className="centro">
          <Mascota species={species} size={150} />
        </div>
        <p className="t-instruccion">
          {terminado ? '¡REPASASTE TODO POR HOY!' : 'TODAVÍA NO HAY NADA PARA REPASAR.'}
          <br />
          {terminado ? 'MAÑANA HAY MÁS.' : 'ACÁ APARECEN LOS SONIDOS QUE YA DOMINÁS.'}
        </p>
        <div className="espacio" />
        <button className="btn-principal" onClick={onVolver}>
          VOLVER
        </button>
      </div>
    );
  }

  const card = tarjetas[indice];

  return (
    <div className="pantalla" style={{ gap: 20 }}>
      <BarraSesion total={tarjetas.length} actual={indice} onVolver={onVolver} />
      <Tarjeta
        key={card.id}
        card={card}
        species={species}
        onArmado={async (sequence) => {
          const r = await api.reviewAttempt(card.id, sequence);
          return {
            correct: r.correct,
            matchedPrefixLength: r.firstWrongIndex ?? sequence.length,
            feedback: r.feedback,
            voiceCheckRequired: false,
          };
        }}
        onLista={() => setIndice((i) => i + 1)}
        repaso
      />
    </div>
  );
}
