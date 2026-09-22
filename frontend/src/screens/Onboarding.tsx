import { useState } from 'react';
import { api, setToken, type PetSpecies } from '../api';
import { Mascota, NOMBRE_MASCOTA } from '../components/Mascota';
import './Onboarding.css';

const ORDEN: PetSpecies[] = ['LION', 'KOALA', 'POLAR_BEAR', 'RHINOCEROS'];

/**
 * 02 — Onboarding: todo lo que se pide es el código que la seño escribió en el
 * pizarrón y una mascota. Sin nombre, sin cuenta, sin contraseña.
 */
export function Onboarding({ onListo }: { onListo: () => Promise<void> }) {
  const [especie, setEspecie] = useState<PetSpecies | null>(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    if (!especie) {
      setError('ELEGÍ TU COMPAÑERO TOCANDO UNO DE LOS ANIMALES.');
      return;
    }
    const classCode = codigo.trim().toUpperCase();
    if (!classCode) {
      setError('ESCRIBÍ EL CÓDIGO DE CLASE.');
      return;
    }

    setOcupado(true);
    setError(null);
    try {
      const verificacion = await api.verifyClassCode(classCode);
      if (!verificacion.valid) {
        setError('ESE CÓDIGO NO ES DE NINGÚN CURSO. PREGUNTALE A TU SEÑO.');
        return;
      }
      const sesion = await api.register(classCode, especie);
      setToken(sesion.studentToken);
      await onListo();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'NO SE PUDO ENTRAR.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-grilla" role="radiogroup" aria-label="Elegí tu compañero">
        {ORDEN.map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={especie === id}
            className={`onboarding-celda ${especie === id ? 'elegida' : ''}`}
            onClick={() => {
              setEspecie(id);
              setError(null);
            }}
          >
            <Mascota species={id} size={150} />
            <span className="onboarding-nombre">{NOMBRE_MASCOTA[id]}</span>
          </button>
        ))}
      </div>

      <div className="onboarding-pie">
        {error && <p className="aviso">{error}</p>}
        <input
          className="onboarding-input"
          placeholder="CÓDIGO DE CLASE"
          value={codigo}
          autoComplete="off"
          autoCapitalize="characters"
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void entrar();
          }}
        />
        <button className="btn-principal" onClick={entrar} disabled={ocupado}>
          {ocupado ? 'ENTRANDO...' : '¡EMPEZAR A JUGAR!'}
        </button>
      </div>
    </div>
  );
}
