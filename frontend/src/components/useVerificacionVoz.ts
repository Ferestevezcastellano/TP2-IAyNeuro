import { useEffect, useRef, useState } from 'react';
import type { EntradaVoz, Feedback } from '../api';
import { listen } from '../escucha';
import { reproducirGrabacion } from '../sonido';

export interface ResultadoVoz {
  accepted: boolean;
  /** Si todavía quedan intentos para esta misma tarjeta. */
  canRetry: boolean;
  /** En false, el servidor no oyó nada útil: se pide repetir, no es un error. */
  heard?: boolean;
  feedback: Feedback;
}

interface Opciones {
  /** Cambia con la tarjeta: al cambiar, todo el flujo de voz vuelve a cero. */
  cardId: string;
  /** `null` significa que no se pudo escuchar. */
  onVoz?: (voz: EntradaVoz) => Promise<ResultadoVoz>;
  /** Hay un pedido en curso en la tarjeta: no se abre el micrófono. */
  ocupado: boolean;
  setOcupado: (ocupado: boolean) => void;
  setFeedback: (feedback: Feedback) => void;
  /** La tarjeta quedó resuelta: pasar a la siguiente. */
  terminar: () => void;
}

/** Tras estas veces seguidas sin captar nada, se sigue sin verificar. */
const MAX_VACIOS = 3;

/**
 * El flujo de voz de una tarjeta: abrir el micrófono, dejar que el chico se
 * escuche, mandar la pronunciación, y decidir si se reintenta, se pide repetir
 * o se sigue. La tarjeta solo avisa cuándo corresponde pedir la voz.
 */
export function useVerificacionVoz({ cardId, onVoz, ocupado, setOcupado, setFeedback, terminar }: Opciones) {
  const [esperandoVoz, setEsperandoVoz] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [instrucciones, setInstrucciones] = useState(false);
  const [vozRechazada, setVozRechazada] = useState(false);
  /** Si al cerrar la hoja se vuelve a intentar la voz en vez de pasar de tarjeta. */
  const [puedeReintentar, setPuedeReintentar] = useState(false);
  const [noSeEntendio, setNoSeEntendio] = useState(false);
  /** Veces seguidas que el micrófono no captó nada. Los rechazos no cuentan acá. */
  const [vacios, setVacios] = useState(0);
  /** Falló el pedido al servidor: se avisa y se deja volver a tocar. */
  const [sinConexion, setSinConexion] = useState(false);
  /** El micrófono no se puede usar: por qué, para el adulto que está al lado. */
  const [sinMicrofono, setSinMicrofono] = useState<string | null>(null);
  /** La voz del chico en su último intento, para que se escuche. */
  const [grabacion, setGrabacion] = useState<string | null>(null);
  /** Se está reproduciendo su grabación, antes de decirle si estuvo bien. */
  const [reproduciendo, setReproduciendo] = useState(false);
  const grabacionActual = useRef<string | null>(null);

  const guardarGrabacion = (url: string | null) => {
    if (grabacionActual.current) URL.revokeObjectURL(grabacionActual.current);
    grabacionActual.current = url;
    setGrabacion(url);
  };

  useEffect(() => {
    setEsperandoVoz(false);
    setEscuchando(false);
    setInstrucciones(false);
    setVozRechazada(false);
    setPuedeReintentar(false);
    setNoSeEntendio(false);
    setVacios(0);
    setSinConexion(false);
    setSinMicrofono(null);
    setReproduciendo(false);
    guardarGrabacion(null);
  }, [cardId]);

  /**
   * Manda la pronunciación al servidor. `null` es "no se pudo escuchar": el
   * chico avanza, pero el intento queda SIN VERIFICAR y no suma como acierto de
   * voz. Lo que NO se hace nunca es mandar la respuesta esperada como si la
   * hubiera dicho.
   */
  const verificar = async (voz: EntradaVoz, suVoz?: string) => {
    if (!onVoz) return;
    // El servidor evalúa mientras el chico se escucha: primero oye cómo sonó y
    // recién después sabe si estuvo bien. Escucharse es parte de aprender a
    // decirlo, no un paso de más.
    const evaluando = onVoz(voz);
    evaluando.catch(() => undefined);
    if (suVoz) {
      setReproduciendo(true);
      try {
        await reproducirGrabacion(suVoz);
        await new Promise((r) => window.setTimeout(r, 300));
      } finally {
        setReproduciendo(false);
      }
    }
    const resultado = await evaluando;

    if (resultado.heard === false) {
      setNoSeEntendio(true);
      return;
    }

    setFeedback(resultado.feedback);
    setVozRechazada(!resultado.accepted);

    if (resultado.accepted) {
      setEsperandoVoz(false);
      terminar();
      return;
    }

    // Rechazada. Si quedan intentos, la tarjeta NO pasa: se le muestra como
    // se hace el sonido y el microfono queda listo para volver a probar.
    setPuedeReintentar(resultado.canRetry);
    setEsperandoVoz(resultado.canRetry);
    setInstrucciones(true);
  };

  const hablar = async () => {
    if (!onVoz || escuchando || ocupado) return;
    setEscuchando(true);
    setNoSeEntendio(false);
    setSinConexion(false);
    setSinMicrofono(null);
    try {
      const escucha = await listen();

      // El microfono no se puede usar (sin permiso, sin https, navegador sin
      // reconocimiento). Antes esto pasaba de tarjeta al instante, sin que el
      // chico llegara a hablar. Ahora se queda: se explica por que y se ofrece
      // seguir sin decirlo, pero lo decide la persona, no la app.
      if (escucha.tipo === 'sin-microfono') {
        setSinMicrofono(escucha.motivo);
        return;
      }

      // No se entendio, pero el navegador SI puede escuchar: no es un error del
      // chico, es que el microfono no capto. Le damos otra oportunidad. Se
      // cuentan aparte de los rechazos: antes un "no te escuche" despues de un
      // "lo dijiste mal" agotaba los intentos y salteaba la tarjeta.
      if (escucha.tipo === 'vacio') {
        const seguidos = vacios + 1;
        setVacios(seguidos);
        if (seguidos < MAX_VACIOS) {
          setNoSeEntendio(true);
          return;
        }
        await verificar(null);
        return;
      }

      setVacios(0);
      guardarGrabacion(escucha.grabacion ?? null);
      await verificar(
        escucha.tipo === 'texto' ? escucha.texto : { audioBase64: escucha.audioBase64 },
        escucha.grabacion,
      );
    } catch {
      // El servidor no contesto: se queda en la misma tarjeta con el microfono listo.
      setSinConexion(true);
    } finally {
      setEscuchando(false);
    }
  };

  /** Seguir sin decirlo, cuando el microfono no anda. Queda sin verificar. */
  const seguirSinVoz = async () => {
    if (ocupado) return;
    setOcupado(true);
    setSinMicrofono(null);
    try {
      await verificar(null);
    } catch {
      setSinConexion(true);
    } finally {
      setOcupado(false);
    }
  };

  const cerrarInstrucciones = () => {
    setInstrucciones(false);
    if (puedeReintentar) {
      // Queda en la misma tarjeta, con el microfono habilitado.
      setPuedeReintentar(false);
      setVozRechazada(false);
      return;
    }
    terminar();
  };

  return {
    esperandoVoz,
    /** El armado quedó bien y la tarjeta pide decirlo. */
    pedirVoz: () => setEsperandoVoz(true),
    instrucciones,
    vozRechazada,
    puedeReintentar,
    sinConexion,
    setSinConexion,
    cerrarInstrucciones,
    /** Vuelve a hacer sonar lo que dijo el chico, si se pudo grabar. */
    escucharme: grabacion ? () => reproducirGrabacion(grabacion) : undefined,
    /** Lo que necesita `BloqueVoz`, además de qué pedir y si se ve. */
    bloque: {
      activo: esperandoVoz && Boolean(onVoz),
      escuchando,
      noSeEntendio,
      reproduciendo,
      sinConexion,
      sinMicrofono,
      onHablar: hablar,
      onSeguir: seguirSinVoz,
    },
  };
}
