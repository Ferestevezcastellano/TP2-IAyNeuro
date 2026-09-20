/**
 * Consola de prueba de la API de AMI.
 *
 * No es el frontend de la app: ese se desarrolla aparte y tiene su propio diseño.
 * Esto existe para recorrer el flujo completo con botones, porque hacerlo desde
 * Swagger obliga a copiar a mano el sessionId, el cardId y el id del botón
 * correcto entre un endpoint y el siguiente, tres sesiones seguidas por nivel.
 *
 * Sin build ni dependencias: lo sirve el mismo NestJS desde public/.
 */

/* ---------- Representación de los assets que todavía no existen ---------- */

// El backend nombra las ilustraciones con claves simbólicas (imageKey) y no
// sirve binarios. Hasta que exista el banco de imágenes, un emoji alcanza para
// que la tarjeta se entienda.
const EMOJI_MASCOTA = { DOG: '🐶', CAT: '🐱', LION: '🦁', BEAR: '🐻' };

const EMOJI_ACCESORIO = {
  'acc-gorro': '🎩',
  'acc-anteojos': '👓',
  'acc-bufanda': '🧣',
  'acc-capa': '🦸',
  'acc-medalla': '🏅',
  'acc-mochila': '🎒',
};

const EMOJI_PALABRA = {
  'ÁRBOL': '🌳', 'ARAÑA': '🕷️', 'AVIÓN': '✈️', 'ELEFANTE': '🐘', 'ESCALERA': '🪜',
  'ESTRELLA': '⭐', 'IGLÚ': '🧊', 'IMÁN': '🧲', 'OSO': '🐻', 'UVA': '🍇',
  'MESA': '🪑', 'MASA': '🥟', 'SUMA': '➕', 'LUNA': '🌙', 'SOL': '☀️',
  'MANO': '✋', 'MONO': '🐒', 'SALA': '🛋️', 'LIMA': '🍋', 'CASA': '🏠',
  'CAMA': '🛏️', 'TELA': '🧵', 'MOTO': '🏍️', 'TOMATE': '🍅', 'TUCÁN': '🦜',
};

const ilustracion = (palabra) => EMOJI_PALABRA[(palabra || '').toUpperCase()] || '🔤';

/* ---------- Estado ---------- */

const estado = {
  solapa: 'alumno',
  pantalla: 'onboarding',
  error: null,
  ocupado: false,

  // Alumno
  token: localStorage.getItem('ami.studentToken'),
  codigoClase: localStorage.getItem('ami.classCode') || 'PRIMERO-A',
  especie: 'LION',
  perfil: null,
  niveles: [],
  reglas: null,

  // Sesión en curso
  sesion: null,
  armado: [],
  marcaError: null,
  feedback: null,
  esperandoVoz: false,
  resultadoVoz: null,
  resumen: null,

  // Repaso
  repaso: null,
  tarjetaRepaso: null,

  // Mascota
  mascota: null,

  // Docente
  teacherToken: localStorage.getItem('ami.teacherToken'),
  codigoDocente: 'PRIMERO-A-DOC',
  curso: null,
  alumnos: [],
  nivelesCurso: [],
};

/* ---------- Acceso a la API ---------- */

async function api(metodo, ruta, cuerpo, tipoToken = 'alumno') {
  const headers = { 'Content-Type': 'application/json' };
  if (tipoToken === 'alumno' && estado.token) headers['x-ami-student-token'] = estado.token;
  if (tipoToken === 'docente' && estado.teacherToken) headers['x-ami-teacher-token'] = estado.teacherToken;

  const respuesta = await fetch(ruta, {
    method: metodo,
    headers,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje = datos && datos.message
      ? (Array.isArray(datos.message) ? datos.message.join(' · ') : datos.message)
      : `${respuesta.status} ${respuesta.statusText}`;
    const error = new Error(`${metodo} ${ruta} → ${mensaje}`);
    error.status = respuesta.status;
    throw error;
  }

  return datos;
}

/** Envuelve una acción: muestra el error en pantalla en vez de perderlo en la consola. */
async function intentar(accion) {
  estado.ocupado = true;
  estado.error = null;
  render();
  try {
    await accion();
  } catch (error) {
    estado.error = error.message;
  } finally {
    estado.ocupado = false;
    render();
  }
}

/* ---------- Voz, con lo que el navegador ya trae ---------- */

function decir(texto) {
  if (!('speechSynthesis' in window) || !texto) return;
  speechSynthesis.cancel();
  const frase = new SpeechSynthesisUtterance(texto);
  frase.lang = 'es-AR';
  frase.rate = 0.8;
  speechSynthesis.speak(frase);
}

const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;

/** Escucha al micrófono y devuelve lo que entendió. Null si el navegador no puede. */
function escuchar() {
  if (!Reconocedor) return Promise.resolve(null);

  return new Promise((resolver) => {
    const reconocedor = new Reconocedor();
    reconocedor.lang = 'es-AR';
    reconocedor.maxAlternatives = 1;
    reconocedor.interimResults = false;

    let resuelto = false;
    const terminar = (valor) => {
      if (resuelto) return;
      resuelto = true;
      resolver(valor);
    };

    reconocedor.onresult = (evento) => terminar(evento.results[0][0].transcript);
    reconocedor.onerror = () => terminar('');
    reconocedor.onend = () => terminar('');

    try {
      reconocedor.start();
    } catch {
      terminar(null);
    }
  });
}

/* ---------- Acciones del alumno ---------- */

async function refrescarAlumno() {
  const [perfil, niveles] = await Promise.all([api('GET', '/me'), api('GET', '/me/levels')]);
  estado.perfil = perfil;
  estado.niveles = niveles;
}

function entrar() {
  return intentar(async () => {
    const verificacion = await api('POST', '/onboarding/class-code/verify', { classCode: estado.codigoClase });
    if (!verificacion.valid) {
      throw new Error(`El código ${estado.codigoClase} no corresponde a ningún curso. Probá PRIMERO-A o PRIMERO-B.`);
    }

    const sesion = await api('POST', '/onboarding/students', {
      classCode: estado.codigoClase,
      petSpecies: estado.especie,
    });

    estado.token = sesion.studentToken;
    localStorage.setItem('ami.studentToken', sesion.studentToken);
    localStorage.setItem('ami.classCode', estado.codigoClase);

    estado.reglas = await api('GET', '/catalog/mastery-rules');
    await refrescarAlumno();
    estado.pantalla = 'inicio';
  });
}

function abrirNivel(levelId) {
  return intentar(async () => {
    estado.sesion = await api('POST', '/practice/sessions', levelId ? { levelId } : {});
    estado.armado = [];
    estado.marcaError = null;
    estado.feedback = null;
    estado.esperandoVoz = false;
    estado.resultadoVoz = null;
    estado.resumen = null;
    estado.pantalla = 'sesion';
  });
}

function tocarBoton(tileId) {
  const tarjeta = estado.sesion && estado.sesion.card;
  if (!tarjeta || estado.esperandoVoz || estado.ocupado) return;

  estado.marcaError = null;
  estado.armado = [...estado.armado, tileId];

  const tile = tarjeta.tiles.find((item) => item.id === tileId);
  if (tile) decir(tile.label);

  if (estado.armado.length === tarjeta.expectedLength) {
    enviarArmado();
  } else {
    render();
  }
}

function borrarUltimo() {
  estado.armado = estado.armado.slice(0, -1);
  estado.marcaError = null;
  render();
}

function enviarArmado() {
  const { sessionId, card } = estado.sesion;

  return intentar(async () => {
    const resultado = await api(
      'POST',
      `/practice/sessions/${sessionId}/cards/${card.id}/attempt`,
      { sequence: estado.armado },
    );

    estado.feedback = resultado.feedback;

    if (resultado.correct) {
      estado.marcaError = null;
      if (resultado.voiceCheckRequired) {
        // La tarjeta no avanza hasta cerrar el circuito con la voz.
        estado.esperandoVoz = true;
        estado.resultadoVoz = null;
      } else {
        pasarATarjeta(resultado.session);
      }
      return;
    }

    // Se conserva el prefijo que ya estaba bien: marcar el casillero exacto en
    // lugar de borrar todo es la diferencia entre corregir y castigar.
    estado.marcaError = resultado.matchedPrefixLength;
    estado.armado = estado.armado.slice(0, resultado.matchedPrefixLength);
  });
}

function pasarATarjeta(sesion) {
  estado.sesion = sesion;
  estado.armado = [];
  estado.marcaError = null;
  estado.esperandoVoz = false;
  estado.resultadoVoz = null;
}

function verificarVoz(transcripcionForzada) {
  const { sessionId, card } = estado.sesion;

  return intentar(async () => {
    let transcripcion = transcripcionForzada;

    if (transcripcion === undefined) {
      const escuchado = await escuchar();
      if (escuchado === null) {
        throw new Error('Este navegador no reconoce voz. Usá los botones de abajo para simularla, o probá en Chrome.');
      }
      transcripcion = escuchado;
    }

    if (!transcripcion) {
      // El backend rechaza transcript vacío, y con razón: no es una pronunciación.
      estado.resultadoVoz = {
        accepted: false,
        transcript: '',
        similarity: 0,
        local: true,
      };
      estado.feedback = {
        tone: 'ENCOURAGE',
        valoro: 'GRACIAS POR PROBAR CON TU VOZ.',
        mePregunto: '¿SE ESCUCHÓ BIEN O HABÍA MUCHO RUIDO?',
        sugiero: 'TOCÁ EL DIBUJO PARA ESCUCHARLO Y PROBÁ DE NUEVO.',
      };
      return;
    }

    const resultado = await api(
      'POST',
      `/practice/sessions/${sessionId}/cards/${card.id}/voice-check`,
      { transcript: transcripcion },
    );

    estado.feedback = resultado.feedback;
    estado.resultadoVoz = resultado;

    // Aceptada o no, la sesión sigue: el chico ya armó la palabra y dejarlo
    // trabado porque el micrófono del aula es malo sería feedback punitivo.
    estado.sesion = resultado.session;
    estado.armado = [];
    estado.esperandoVoz = false;
  });
}

function cerrarPractica() {
  const { sessionId } = estado.sesion;

  return intentar(async () => {
    estado.resumen = await api('POST', `/practice/sessions/${sessionId}/complete`, {});
    await refrescarAlumno();
    estado.pantalla = 'cierre';
  });
}

function volverAlInicio() {
  return intentar(async () => {
    await refrescarAlumno();
    estado.sesion = null;
    estado.resumen = null;
    estado.feedback = null;
    estado.pantalla = 'inicio';
  });
}

function abrirRepaso() {
  return intentar(async () => {
    const [sonidos, tarjetas] = await Promise.all([
      api('GET', '/review/sounds'),
      api('GET', '/review/cards?limit=6'),
    ]);
    estado.repaso = { sonidos, ...tarjetas };
    estado.tarjetaRepaso = null;
    estado.armado = [];
    estado.marcaError = null;
    estado.feedback = null;
    estado.pantalla = 'repaso';
  });
}

function elegirTarjetaRepaso(cardId) {
  estado.tarjetaRepaso = estado.repaso.cards.find((item) => item.id === cardId) || null;
  estado.armado = [];
  estado.marcaError = null;
  estado.feedback = null;
  render();
}

function tocarBotonRepaso(tileId) {
  const tarjeta = estado.tarjetaRepaso;
  if (!tarjeta || estado.ocupado) return;

  estado.marcaError = null;
  estado.armado = [...estado.armado, tileId];

  const tile = tarjeta.tiles.find((item) => item.id === tileId);
  if (tile) decir(tile.label);

  if (estado.armado.length !== tarjeta.expectedLength) {
    render();
    return;
  }

  intentar(async () => {
    const resultado = await api('POST', '/review/attempts', {
      cardId: tarjeta.id,
      sequence: estado.armado,
    });
    estado.feedback = resultado.feedback;
    if (!resultado.correct) {
      estado.marcaError = 0;
      estado.armado = [];
    }
  });
}

function abrirMascota() {
  return intentar(async () => {
    estado.mascota = await api('GET', '/me/pet');
    estado.pantalla = 'mascota';
  });
}

function alternarAccesorio(accessoryId) {
  const puestos = estado.mascota.accessories.filter((item) => item.equipped).map((item) => item.id);
  const siguiente = puestos.includes(accessoryId)
    ? puestos.filter((item) => item !== accessoryId)
    : [...puestos, accessoryId];

  return intentar(async () => {
    estado.mascota = await api('PATCH', '/me/pet', { equippedAccessoryIds: siguiente });
    await refrescarAlumno();
  });
}

/* ---------- Acciones de la docente ---------- */

function entrarComoDocente() {
  return intentar(async () => {
    const sesion = await api('POST', '/teacher/session', { teacherCode: estado.codigoDocente }, 'docente');
    estado.teacherToken = sesion.teacherToken;
    localStorage.setItem('ami.teacherToken', sesion.teacherToken);
    await refrescarDocente();
  });
}

async function refrescarDocente() {
  const [curso, alumnos, niveles] = await Promise.all([
    api('GET', '/teacher/class', undefined, 'docente'),
    api('GET', '/teacher/class/students', undefined, 'docente'),
    api('GET', '/teacher/class/levels', undefined, 'docente'),
  ]);
  estado.curso = curso;
  estado.alumnos = alumnos;
  estado.nivelesCurso = niveles;
}

function habilitarHasta(levelOrder) {
  return intentar(async () => {
    estado.curso = await api('PUT', '/teacher/class/unlocked-level', { levelOrder }, 'docente');
    await refrescarDocente();
    if (estado.token) await refrescarAlumno();
  });
}

function empezarDeCero() {
  localStorage.removeItem('ami.studentToken');
  localStorage.removeItem('ami.teacherToken');
  Object.assign(estado, {
    token: null,
    teacherToken: null,
    perfil: null,
    niveles: [],
    sesion: null,
    resumen: null,
    feedback: null,
    repaso: null,
    tarjetaRepaso: null,
    mascota: null,
    curso: null,
    alumnos: [],
    nivelesCurso: [],
    pantalla: 'onboarding',
    error: null,
  });
  render();
}

/* ---------- Render ---------- */

const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (caracter) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter]
));

const porcentaje = (valor) => `${Math.round((valor || 0) * 100)}%`;

const plural = (cantidad, singular, muchos) => `${cantidad} ${cantidad === 1 ? singular : muchos}`;

/** La escena grande de la tarjeta: el dibujo, o el altavoz si lo que hay que reconocer es un sonido. */
function escenaDe(tarjeta) {
  if (tarjeta.kind === 'SOUND_RECOGNITION') {
    return `\u{1f50a}<small>ESCUCH\u00c1 EL SONIDO ${escapar(tarjeta.targetPhoneme || '')}</small>`;
  }
  return `${ilustracion(tarjeta.targetWord)}<small>${escapar(tarjeta.targetWord || tarjeta.targetSentence || '')}</small>`;
}

/** Etiqueta corta de una tarjeta, para los chips de Repaso. */
function etiquetaDe(tarjeta) {
  if (tarjeta.kind === 'SOUND_RECOGNITION') return `\u{1f50a} ${escapar(tarjeta.targetPhoneme || '')}`;
  return `${ilustracion(tarjeta.targetWord)} ${escapar(tarjeta.targetWord || tarjeta.targetSentence || '')}`;
}

function caraDelAlumno() {
  const especie = estado.perfil ? estado.perfil.pet.species : estado.especie;
  return EMOJI_MASCOTA[especie] || '🐾';
}

function accesoriosPuestos() {
  if (!estado.perfil) return '';
  return estado.perfil.pet.accessories
    .filter((item) => item.equipped)
    .map((item) => EMOJI_ACCESORIO[item.id] || '✨')
    .join('');
}

function vistaOnboarding() {
  const especies = [
    ['DOG', 'PERRO'], ['CAT', 'GATO'], ['LION', 'LEÓN'], ['BEAR', 'OSO'],
  ];

  return `
    <section class="panel">
      <h2>Entrar como alumno</h2>
      <p class="sub">
        Todo el onboarding es esto: el código que la seño escribió en el pizarrón y una mascota.
        Sin nombre, sin cuenta, sin contraseña.
      </p>

      <label class="campo">
        Código de clase (los cargados son PRIMERO-A y PRIMERO-B)
        <input id="inputClase" value="${escapar(estado.codigoClase)}" autocomplete="off">
      </label>

      <div class="mascotas">
        ${especies.map(([id, nombre]) => `
          <button data-especie="${id}" aria-pressed="${estado.especie === id}">
            <span class="cara">${EMOJI_MASCOTA[id]}</span>
            <span class="nombre">${nombre}</span>
          </button>
        `).join('')}
      </div>

      <p></p>
      <button class="accion" id="btnEntrar" ${estado.ocupado ? 'disabled' : ''}>Empezar a jugar</button>
    </section>
  `;
}

function filaNivel(nivel) {
  const abierto = nivel.status === 'AVAILABLE' || nivel.status === 'IN_PROGRESS';
  const listo = nivel.status === 'MASTERED';
  const clase = listo ? 'listo' : abierto ? 'abierto' : 'trabado';

  const detalle = listo
    ? `Dominado · ${'★'.repeat(nivel.stars)}`
    : abierto
      ? `Promedio ${porcentaje(nivel.masteryAverage)} · ${plural(nivel.sessionsCompleted, 'sesión', 'sesiones')}`
      : escapar(nivel.lockedReason || '');

  const barra = abierto && estado.reglas
    ? `<div class="barra-dominio"><i class="${nivel.masteryAverage >= estado.reglas.threshold ? '' : 'corto'}" style="width:${Math.min(100, Math.round((nivel.masteryAverage || 0) * 100))}%"></i></div>`
    : '';

  return `
    <li class="${clase}">
      <span class="orden">${listo ? '★' : abierto ? nivel.order : '🔒'}</span>
      <span class="cuerpo">
        <span class="titulo">${escapar(nivel.title)}</span>
        <span class="detalle">${detalle}</span>
        ${barra}
      </span>
      ${nivel.playable
        ? `<button class="suave" data-nivel="${nivel.id}" ${estado.ocupado ? 'disabled' : ''}>${listo ? 'Repetir' : 'Jugar'}</button>`
        : ''}
    </li>
  `;
}

function vistaInicio() {
  const perfil = estado.perfil;
  const regla = estado.reglas;

  return `
    <section class="panel">
      <div class="perfil">
        <span class="avatar">${caraDelAlumno()}</span>
        <span class="puesto">${accesoriosPuestos()}</span>
        <span class="datos">
          <strong>${escapar(perfil.className)}</strong>
          <span>${plural(perfil.stars, 'estrella', 'estrellas')} · ${plural(perfil.masteredLevels, 'nivel dominado', 'niveles dominados')}</span>
        </span>
        <button class="suave" id="btnMascota">Vestir a AMI</button>
        <button class="suave" id="btnRepaso">Repaso</button>
      </div>
    </section>

    <section class="panel">
      <h2>Niveles</h2>
      <p class="sub">
        ${regla
          ? `Un nivel se domina con el promedio de las últimas ${regla.windowSize} sesiones por encima de ${porcentaje(regla.threshold)}, con ${regla.minSessions} sesiones como mínimo. Acertar una vez no alcanza.`
          : ''}
      </p>
      <ul class="niveles">${estado.niveles.map(filaNivel).join('')}</ul>
    </section>
  `;
}

function bloqueFeedback() {
  const feedback = estado.feedback;
  if (!feedback) return '';

  const clase = feedback.tone === 'CELEBRATE' ? 'celebra' : feedback.tone === 'GUIDE' ? 'guia' : 'anima';

  return `
    <div class="mascota-dice ${clase}">
      <span class="cara">${caraDelAlumno()}</span>
      <span>
        <p><span class="etiqueta">VALORO</span><br>${escapar(feedback.valoro)}</p>
        ${feedback.mePregunto ? `<p><span class="etiqueta">ME PREGUNTO</span><br>${escapar(feedback.mePregunto)}</p>` : ''}
        <p><span class="etiqueta">SUGIERO</span><br>${escapar(feedback.sugiero)}</p>
      </span>
    </div>
  `;
}

function bloqueCasillero(tarjeta) {
  const huecos = [];

  for (let i = 0; i < tarjeta.expectedLength; i += 1) {
    const tileId = estado.armado[i];
    const tile = tileId ? tarjeta.tiles.find((item) => item.id === tileId) : null;
    const malo = estado.marcaError !== null && i === estado.marcaError;
    huecos.push(`<span class="hueco ${tile ? 'lleno' : ''} ${malo ? 'mal' : ''}">${tile ? escapar(tile.label) : ''}</span>`);
  }

  return `<div class="casillero">${huecos.join('')}</div>`;
}

function bloqueBotones(tarjeta, atributo) {
  return `
    <div class="botonera">
      ${tarjeta.tiles.map((tile) => {
        const usado = estado.armado.includes(tile.id);
        const esImagen = tile.kind === 'IMAGE';
        return `
          <button class="${esImagen ? 'imagen' : ''}" ${atributo}="${tile.id}" ${usado || estado.esperandoVoz ? 'disabled' : ''}>
            ${esImagen ? `${ilustracion(tile.label)}<small>${escapar(tile.label)}</small>` : escapar(tile.label)}
          </button>
        `;
      }).join('')}
    </div>
  `;
}

function vistaSesion() {
  const sesion = estado.sesion;
  const tarjeta = sesion.card;

  if (!tarjeta) {
    return `
      <section class="panel tarjeta">
        <h2>Se terminaron las tarjetas</h2>
        <p class="sub">Cerrá la práctica para ver cómo quedó el promedio del nivel.</p>
        ${bloqueFeedback()}
        <button class="accion" id="btnCerrar" ${estado.ocupado ? 'disabled' : ''}>Cerrar la práctica</button>
      </section>
    `;
  }

  const aDecir = tarjeta.targetPhoneme || tarjeta.targetWord || tarjeta.targetSentence || '';

  return `
    <section class="panel tarjeta">
      <p class="sub">Nivel ${sesion.levelOrder} · tarjeta ${sesion.cardIndex + 1} de ${sesion.cardsTotal}</p>
      <p class="consigna">${escapar(tarjeta.prompt)}</p>

      <button class="escena" id="btnEscena">${escenaDe(tarjeta)}</button>

      ${bloqueCasillero(tarjeta)}
      ${bloqueBotones(tarjeta, 'data-tile')}

      <div class="botonera">
        <button class="suave" id="btnBorrar" ${estado.armado.length === 0 || estado.esperandoVoz ? 'disabled' : ''}>↩ Borrar</button>
        <button class="suave" id="btnAbandonar">Dejar para después</button>
      </div>

      ${bloqueFeedback()}

      ${estado.esperandoVoz ? `
        <div class="panel" style="margin:0">
          <h2>Ahora decilo en voz alta</h2>
          <p class="sub">
            Tenés que decir <strong>${escapar(aDecir)}</strong>.
            ${Reconocedor
              ? 'El navegador escucha por el micrófono y manda al servidor lo que entendió.'
              : 'Este navegador no reconoce voz, así que usá los botones para simularla.'}
            La comparación del servidor es fonética: BACA vale por VACA.
          </p>
          <div class="botonera">
            ${Reconocedor ? `<button class="accion" id="btnEscuchar" ${estado.ocupado ? 'disabled' : ''}>🎤 Hablar</button>` : ''}
            <button class="suave" id="btnVozBien" ${estado.ocupado ? 'disabled' : ''}>Simular que lo dice bien</button>
            <button class="suave" id="btnVozMal" ${estado.ocupado ? 'disabled' : ''}>Simular que se equivoca</button>
          </div>
        </div>
      ` : ''}

      ${estado.resultadoVoz && !estado.esperandoVoz ? `
        <p class="sub">
          Se escuchó “${escapar(estado.resultadoVoz.transcript || '(nada)')}” ·
          parecido ${porcentaje(estado.resultadoVoz.similarity)} ·
          ${estado.resultadoVoz.accepted ? 'aceptado' : 'no aceptado, pero la sesión sigue'}
        </p>
      ` : ''}
    </section>
  `;
}

function vistaCierre() {
  const resumen = estado.resumen;

  return `
    <section class="panel tarjeta">
      <p class="sub">Nivel terminado</p>
      <div class="escena" style="cursor:default">
        ${caraDelAlumno()}${accesoriosPuestos()}
        <small>${resumen.masteredNow ? '¡LO LOGRASTE!' : 'SEGUIMOS PRACTICANDO'}</small>
      </div>

      ${resumen.starsAwarded > 0 ? `<p class="estrellas" style="font-size:28px">${'★'.repeat(resumen.starsAwarded)}</p>` : ''}

      ${bloqueFeedback()}

      <table>
        <tr><th>Esta sesión</th><td class="num">${porcentaje(resumen.accuracy)} · ${resumen.cardsSolved}/${resumen.cardsTotal} tarjetas</td></tr>
        <tr><th>Promedio móvil del nivel</th><td class="num">${porcentaje(resumen.masteryAverage)}</td></tr>
        <tr><th>Sesiones hechas</th><td class="num">${resumen.sessionsCompleted}</td></tr>
        <tr><th>¿Dominado?</th><td class="num">${resumen.mastered ? 'sí' : `todavía no, faltan ${resumen.sessionsRemaining} como mínimo`}</td></tr>
        <tr><th>Estrellas ganadas</th><td class="num">${resumen.starsAwarded} (total ${resumen.totalStars})</td></tr>
        <tr><th>Accesorio</th><td class="num">${resumen.accessoryUnlocked ? `${EMOJI_ACCESORIO[resumen.accessoryUnlocked.id] || '✨'} ${escapar(resumen.accessoryUnlocked.label)}` : '—'}</td></tr>
        <tr><th>Nivel siguiente</th><td class="num">${resumen.nextLevel ? `${escapar(resumen.nextLevel.title)} · ${escapar(resumen.nextLevel.status)}` : '—'}</td></tr>
      </table>

      <p></p>
      <div class="botonera">
        <button class="accion" id="btnOtraVez" ${estado.ocupado ? 'disabled' : ''}>Jugar otra vez este nivel</button>
        <button class="suave" id="btnVolver">Volver a los niveles</button>
      </div>
    </section>
  `;
}

function vistaRepaso() {
  const repaso = estado.repaso;

  if (repaso.available === 0) {
    return `
      <section class="panel">
        <h2>Repaso</h2>
        <p class="vacio">
          Todavía no hay nada para repasar: acá solo aparecen los sonidos de niveles ya dominados.
          Dominá el nivel 1 y volvé.
        </p>
        <p></p>
        <button class="suave" id="btnVolver">Volver a los niveles</button>
      </section>
    `;
  }

  const tarjeta = estado.tarjetaRepaso;

  return `
    <section class="panel">
      <h2>Repaso</h2>
      <p class="sub">
        Práctica libre sobre lo ya dominado. Nada de lo que pase acá toca el promedio de los niveles:
        si repasar pudiera bajar el puntaje, el chico aprendería a no repasar.
      </p>
      <p>Sonidos dominados: <strong>${repaso.sonidos.map((item) => escapar(item.letter)).join(' · ') || '—'}</strong></p>
      <div class="chips">
        ${repaso.cards.map((item) => `
          <button data-repaso="${item.id}" aria-pressed="${tarjeta && tarjeta.id === item.id}">
            ${etiquetaDe(item)}
          </button>
        `).join('')}
      </div>
    </section>

    ${tarjeta ? `
      <section class="panel tarjeta">
        <p class="consigna">${escapar(tarjeta.prompt)}</p>
        <button class="escena" id="btnEscena">${escenaDe(tarjeta)}</button>
        ${bloqueCasillero(tarjeta)}
        ${bloqueBotones(tarjeta, 'data-tile-repaso')}
        ${bloqueFeedback()}
      </section>
    ` : ''}

    <section class="panel">
      <button class="suave" id="btnVolver">Volver a los niveles</button>
    </section>
  `;
}

function vistaMascota() {
  const mascota = estado.mascota;

  return `
    <section class="panel tarjeta">
      <h2>${escapar(mascota.label)}</h2>
      <div class="escena" style="cursor:default">
        ${EMOJI_MASCOTA[mascota.species]}${mascota.accessories.filter((item) => item.equipped).map((item) => EMOJI_ACCESORIO[item.id] || '✨').join('')}
      </div>
      <p class="sub">Solo se puede poner lo que ya está ganado. Cada nivel dominado paga un accesorio.</p>
      <div class="chips" style="justify-content:center">
        ${mascota.accessories.map((item) => `
          <button data-accesorio="${item.id}" aria-pressed="${item.equipped}" ${item.owned ? '' : 'disabled'}>
            ${EMOJI_ACCESORIO[item.id] || '✨'} ${escapar(item.label)} ${item.owned ? '' : `· nivel ${item.unlockedByLevelOrder}`}
          </button>
        `).join('')}
      </div>
      <p></p>
      <button class="suave" id="btnVolver">Volver a los niveles</button>
    </section>
  `;
}

function vistaAlumno() {
  if (!estado.token || estado.pantalla === 'onboarding') return vistaOnboarding();
  if (estado.pantalla === 'sesion' && estado.sesion) return vistaSesion();
  if (estado.pantalla === 'cierre' && estado.resumen) return vistaCierre();
  if (estado.pantalla === 'repaso' && estado.repaso) return vistaRepaso();
  if (estado.pantalla === 'mascota' && estado.mascota) return vistaMascota();
  if (estado.perfil) return vistaInicio();
  return vistaOnboarding();
}

function vistaDocente() {
  if (!estado.teacherToken || !estado.curso) {
    return `
      <section class="panel">
        <h2>Entrar como docente</h2>
        <p class="sub">
          Tampoco hay usuario ni contraseña: quien tiene el código del curso es la docente de ese curso.
          Los cargados son PRIMERO-A-DOC y PRIMERO-B-DOC.
        </p>
        <label class="campo">
          Código de docente
          <input id="inputDocente" value="${escapar(estado.codigoDocente)}" autocomplete="off">
        </label>
        <button class="accion" id="btnEntrarDocente" ${estado.ocupado ? 'disabled' : ''}>Ver mi curso</button>
      </section>
    `;
  }

  const curso = estado.curso;
  const opciones = [];
  for (let orden = 0; orden <= curso.lastLevelOrder; orden += 1) {
    opciones.push(`<option value="${orden}" ${orden === curso.unlockedLevelOrder ? 'selected' : ''}>${orden === 0 ? 'ninguno' : `hasta el nivel ${orden}`}</option>`);
  }

  return `
    <section class="panel">
      <h2>${escapar(curso.name)} · ${escapar(curso.code)}</h2>
      <p class="sub">${escapar(curso.schoolName)} · ${plural(curso.studentCount, 'alumno registrado', 'alumnos registrados')}</p>
      <div class="fila">
        <span>Habilitado para el curso:</span>
        <select id="selectNivel">${opciones.join('')}</select>
        <span class="nota" style="color:var(--suave);font-size:13px">de ${curso.lastLevelOrder} cargados</span>
      </div>
      <p class="sub" style="margin-top:12px;margin-bottom:0">
        Esto es un techo, no un adelanto: un chico que no dominó el nivel anterior sigue sin poder entrar al siguiente.
      </p>
    </section>

    <section class="panel">
      <h2>Alumnos</h2>
      <p class="sub">Se identifican por su mascota: el sistema no guarda nombres.</p>
      ${estado.alumnos.length === 0
        ? '<p class="vacio">Todavía no entró nadie con este código.</p>'
        : `<table>
            <tr><th>Mascota</th><th class="num">Estrellas</th><th class="num">Dominados</th><th>Nivel actual</th><th class="num">Promedio</th><th class="num">Sesiones</th></tr>
            ${estado.alumnos.map((alumno) => `
              <tr>
                <td>${EMOJI_MASCOTA[alumno.pet] || '🐾'}</td>
                <td class="num">${alumno.stars}</td>
                <td class="num">${alumno.masteredLevels}</td>
                <td>${alumno.currentLevelTitle ? escapar(alumno.currentLevelTitle) : '—'}</td>
                <td class="num">${porcentaje(alumno.currentMasteryAverage)}</td>
                <td class="num">${alumno.totalSessions}</td>
              </tr>
            `).join('')}
          </table>`}
    </section>

    <section class="panel">
      <h2>Niveles del curso</h2>
      <table>
        <tr><th>Nivel</th><th>Habilitado</th><th class="num">Dominado por</th><th class="num">En curso</th><th class="num">Sin empezar</th></tr>
        ${estado.nivelesCurso.map((nivel) => `
          <tr>
            <td>${nivel.order} · ${escapar(nivel.title)}</td>
            <td>${nivel.unlocked ? 'sí' : 'no'}</td>
            <td class="num">${nivel.masteredCount}</td>
            <td class="num">${nivel.inProgressCount}</td>
            <td class="num">${nivel.notStartedCount}</td>
          </tr>
        `).join('')}
      </table>
    </section>
  `;
}

function render() {
  document.getElementById('solapaAlumno').setAttribute('aria-selected', String(estado.solapa === 'alumno'));
  document.getElementById('solapaDocente').setAttribute('aria-selected', String(estado.solapa === 'docente'));

  const banner = document.getElementById('errorGlobal');
  banner.textContent = estado.error || '';
  banner.classList.toggle('oculto', !estado.error);

  document.getElementById('vista').innerHTML = estado.solapa === 'alumno' ? vistaAlumno() : vistaDocente();
  cablear();
}

/* ---------- Eventos ---------- */

const alTocar = (selector, accion) => {
  const elemento = document.getElementById(selector);
  if (elemento) elemento.addEventListener('click', accion);
};

function cablear() {
  document.querySelectorAll('[data-especie]').forEach((boton) => {
    boton.addEventListener('click', () => {
      estado.especie = boton.dataset.especie;
      render();
    });
  });

  const inputClase = document.getElementById('inputClase');
  if (inputClase) {
    inputClase.addEventListener('input', () => { estado.codigoClase = inputClase.value.trim().toUpperCase(); });
  }

  const inputDocente = document.getElementById('inputDocente');
  if (inputDocente) {
    inputDocente.addEventListener('input', () => { estado.codigoDocente = inputDocente.value.trim().toUpperCase(); });
  }

  alTocar('btnEntrar', entrar);
  alTocar('btnEntrarDocente', entrarComoDocente);
  alTocar('btnRepaso', abrirRepaso);
  alTocar('btnMascota', abrirMascota);
  alTocar('btnVolver', volverAlInicio);
  alTocar('btnAbandonar', volverAlInicio);
  alTocar('btnCerrar', cerrarPractica);
  alTocar('btnBorrar', borrarUltimo);
  alTocar('btnOtraVez', () => abrirNivel(estado.resumen.levelId));

  alTocar('btnEscena', () => {
    const tarjeta = estado.pantalla === 'repaso' ? estado.tarjetaRepaso : (estado.sesion && estado.sesion.card);
    if (tarjeta) decir(tarjeta.targetWord || tarjeta.targetSentence || tarjeta.targetPhoneme);
  });

  alTocar('btnEscuchar', () => verificarVoz(undefined));
  alTocar('btnVozBien', () => verificarVoz(estado.sesion.card.voiceTarget));
  alTocar('btnVozMal', () => {
    const objetivo = estado.sesion.card.voiceTarget || '';
    // Una pronunciación a medias, que es como suena de verdad cuando no sale.
    verificarVoz(objetivo.slice(0, Math.max(1, Math.floor(objetivo.length / 2))));
  });

  document.querySelectorAll('[data-nivel]').forEach((boton) => {
    boton.addEventListener('click', () => abrirNivel(boton.dataset.nivel));
  });

  document.querySelectorAll('[data-tile]').forEach((boton) => {
    boton.addEventListener('click', () => tocarBoton(boton.dataset.tile));
  });

  document.querySelectorAll('[data-tile-repaso]').forEach((boton) => {
    boton.addEventListener('click', () => tocarBotonRepaso(boton.dataset.tileRepaso));
  });

  document.querySelectorAll('[data-repaso]').forEach((boton) => {
    boton.addEventListener('click', () => elegirTarjetaRepaso(boton.dataset.repaso));
  });

  document.querySelectorAll('[data-accesorio]').forEach((boton) => {
    boton.addEventListener('click', () => alternarAccesorio(boton.dataset.accesorio));
  });

  const selectNivel = document.getElementById('selectNivel');
  if (selectNivel) {
    selectNivel.addEventListener('change', () => habilitarHasta(Number(selectNivel.value)));
  }
}

document.getElementById('solapaAlumno').addEventListener('click', () => {
  estado.solapa = 'alumno';
  estado.error = null;
  render();
});

document.getElementById('solapaDocente').addEventListener('click', () => {
  estado.solapa = 'docente';
  estado.error = null;
  if (estado.teacherToken && !estado.curso) {
    intentar(refrescarDocente);
  } else {
    render();
  }
});

document.getElementById('btnReiniciar').addEventListener('click', empezarDeCero);

/* ---------- Arranque ---------- */

(async function arrancar() {
  const indicador = document.getElementById('estadoServidor');

  try {
    estado.reglas = await api('GET', '/catalog/mastery-rules');
    indicador.textContent = `servidor ok · dominio: ${estado.reglas.minSessions} sesiones, promedio ≥ ${porcentaje(estado.reglas.threshold)}`;
  } catch {
    indicador.textContent = 'no se pudo hablar con el servidor';
  }

  // El token sobrevive al refresco de la página, pero no al reinicio del
  // servidor, que borra el estado en memoria. Si quedó viejo, se descarta.
  if (estado.token) {
    try {
      await refrescarAlumno();
      estado.pantalla = 'inicio';
    } catch {
      localStorage.removeItem('ami.studentToken');
      estado.token = null;
      estado.pantalla = 'onboarding';
    }
  }

  if (estado.teacherToken) {
    try {
      await refrescarDocente();
    } catch {
      localStorage.removeItem('ami.teacherToken');
      estado.teacherToken = null;
    }
  }

  render();
})();
