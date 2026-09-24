import type { Feedback, PetSpecies } from '../api';
import { Mascota } from './Mascota';

export function BotonVolver({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn-volver" onClick={onClick} aria-label="Volver">
      ←
    </button>
  );
}

export function BotonSonido({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button className={`btn-sonido ${className ?? ''}`} onClick={onClick} aria-label="Escuchar">
      <img src="/icons/sound-high.svg" width={24} height={24} alt="" />
    </button>
  );
}

export function Progreso({ total, actual }: { total: number; actual: number }) {
  return (
    <div className="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={actual}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < actual ? 'hecha' : i === actual ? 'actual' : ''} />
      ))}
    </div>
  );
}

export function BarraSesion({ total, actual, onVolver }: { total: number; actual: number; onVolver: () => void }) {
  return (
    <div className="barra-sesion">
      <BotonVolver onClick={onVolver} />
      <Progreso total={total} actual={actual} />
    </div>
  );
}

interface FeedbackProps {
  species: PetSpecies;
  feedback: Feedback | null;
  /** Cuando se acierta se muestran las tres estrellas, como en el mockup. */
  estrellas?: boolean;
}

/** La caja de abajo donde habla la mascota: estrellas si salió bien, texto si hay que corregir. */
export function CajaFeedback({ species, feedback, estrellas }: FeedbackProps) {
  if (!feedback) return null;
  const clase = feedback.tone === 'CELEBRATE' ? '' : feedback.tone === 'GUIDE' ? 'guia' : 'anima';

  return (
    <div className={`feedback aparece ${clase}`}>
      <div className="feedback-mascota">
        <Mascota species={species} size={75} />
      </div>
      <div className="feedback-cuerpo">
        {estrellas ? (
          <span className="feedback-estrellas">★★★</span>
        ) : (
          <p className="feedback-texto">
            <strong>{feedback.valoro}</strong>
            {feedback.mePregunto ?? feedback.sugiero}
          </p>
        )}
      </div>
    </div>
  );
}
