import { Mascota } from '../components/Mascota';
import './Carga.css';

/** 01 — Carga: el logo, las cuatro mascotas y una barra que avanza mientras se consulta al servidor. */
export function Carga() {
  return (
    <div className="carga">
      <span className="carga-deco d1" />
      <span className="carga-deco d2" />
      <span className="carga-deco d3" />
      <h1 className="carga-logo">AMI</h1>
      <div className="carga-mascotas">
        <Mascota species="LION" size={104} />
        <Mascota species="KOALA" size={104} />
        <Mascota species="POLAR_BEAR" size={104} />
        <Mascota species="RHINOCEROS" size={104} />
      </div>
      <div className="carga-barra">
        <i />
      </div>
    </div>
  );
}
