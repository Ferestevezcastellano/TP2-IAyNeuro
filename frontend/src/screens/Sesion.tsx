import { useEffect, useRef, useState } from 'react';
import { api, type PetSpecies, type SessionState, type SessionSummary } from '../api';
import { BarraSesion } from '../components/comunes';
import { Tarjeta } from '../components/Tarjeta';

interface Props {
  species: PetSpecies;
  levelId?: string;
  onSalir: () => void;
  onTerminada: (resumen: SessionSummary) => void;
}

/** 04 / 06 — Una sesión de práctica: la barra de progreso arriba y una tarjeta por vez. */
export function Sesion({ species, levelId, onSalir, onTerminada }: Props) {
  const [sesion, setSesion] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  // El estado que devolvió el servidor tras cerrar la tarjeta actual. Se aplica
  // recién cuando la tarjeta terminó de mostrar su feedback.
  const siguiente = useRef<SessionState | null>(null);

  useEffect(() => {
    let vivo = true;
    api
      .startSession(levelId)
      .then((s) => vivo && setSesion(s))
      .catch((e) => vivo && setError(e instanceof Error ? e.message : 'NO SE PUDO ABRIR LA PRÁCTICA.'));
    return () => {
      vivo = false;
    };
  }, [levelId]);

  useEffect(() => {
    if (sesion && sesion.card === null) {
      api
        .complete(sesion.sessionId)
        .then(onTerminada)
        .catch((e) => setError(e instanceof Error ? e.message : 'NO SE PUDO CERRAR.'));
    }
  }, [sesion, onTerminada]);

  if (error) {
    return (
      <div className="pantalla">
        <BarraSesion total={1} actual={0} onVolver={onSalir} />
        <div className="espacio" />
        <p className="aviso">{error}</p>
        <div className="espacio" />
      </div>
    );
  }

  if (!sesion || !sesion.card) {
    return (
      <div className="pantalla">
        <BarraSesion total={sesion?.cardsTotal ?? 5} actual={sesion?.cardIndex ?? 0} onVolver={onSalir} />
      </div>
    );
  }

  const card = sesion.card;

  return (
    <div className="pantalla">
      <BarraSesion total={sesion.cardsTotal} actual={sesion.cardIndex} onVolver={onSalir} />
      <Tarjeta
        key={card.id}
        card={card}
        species={species}
        onArmado={async (sequence) => {
          const r = await api.attempt(sesion.sessionId, card.id, sequence);
          if (r.correct && !r.voiceCheckRequired) siguiente.current = r.session;
          return r;
        }}
        onVoz={async (voz) => {
          const r = await api.voiceCheck(sesion.sessionId, card.id, voz);
          siguiente.current = r.session;
          return r;
        }}
        onLista={() => {
          if (siguiente.current) setSesion(siguiente.current);
          siguiente.current = null;
        }}
      />
    </div>
  );
}
