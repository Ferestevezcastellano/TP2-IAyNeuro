// Recorrido de la consola de prueba que sirve el backend en `/`.
//
// Hace lo que haría alguien probando la API con botones: entra como alumno,
// juega una sesión del nivel 1 hasta cerrarla (con un armado equivocado y una
// voz mal dicha en el camino), repasa, viste a la mascota y entra como docente
// a habilitar un nivel. Cualquier error que la consola muestre en su cartel
// rojo cuenta como falla: así se rompió en silencio cuando un campo de la API
// cambió de nombre (`sesion.id` contra `sessionId`).
const { paginaQuieta, traza, sinTilde } = require('./comun.cjs');

/**
 * La secuencia de botones que resuelve la tarjeta, leyendo solo lo que la
 * tarjeta muestra: la solución no viaja al cliente.
 */
function resolver(card) {
  if (card.kind === 'LETTER_INTRO') return [card.tiles[0].id];
  if (card.kind === 'SOUND_RECOGNITION') {
    return [card.tiles.find((t) => sinTilde(t.label).startsWith(sinTilde(card.targetPhoneme))).id];
  }
  const libres = [...card.tiles];
  const tomar = (tile) => libres.splice(libres.indexOf(tile), 1)[0].id;
  if (card.kind === 'SENTENCE_BUILDING') {
    return sinTilde(card.targetSentence)
      .split(' ')
      .map((p) => tomar(libres.find((t) => sinTilde(t.label) === p)));
  }
  // Palabra: el botón más largo que encaje, así sirve con letras y con sílabas.
  const ids = [];
  let resto = sinTilde(card.targetWord);
  while (resto) {
    const tile = libres
      .filter((t) => resto.startsWith(sinTilde(t.label)))
      .sort((a, b) => b.label.length - a.label.length)[0];
    if (!tile) throw new Error(`no se puede armar ${card.targetWord}`);
    resto = resto.slice(tile.label.length);
    ids.push(tomar(tile));
  }
  return ids;
}

async function recorrerConsola(navegador, url, salida) {
  const { pagina, errores } = await paginaQuieta(navegador, { width: 1000, height: 900 });
  const { pasos, registrar: registrarPaso } = traza(pagina, '#vista', salida);

  // `estado` es una variable global del script de la consola.
  const libre = () => pagina.waitForFunction(() => !estado.ocupado);
  /** Corta el recorrido si la consola mostró un error: lo que sigue ya no tendría sentido. */
  async function sinCartelDeError(donde) {
    const cartel = pagina.locator('#errorGlobal:not(.oculto)');
    if (await cartel.count()) throw new Error(`la consola mostró un error en ${donde}: ${await cartel.innerText()}`);
  }
  async function registrar(etiqueta) {
    await libre();
    await registrarPaso(etiqueta);
    await sinCartelDeError(etiqueta);
  }
  /** Toca el primer botón que coincide: en repaso y mascota hay varios. */
  const tocar = async (selector) => {
    await pagina.locator(selector).first().click();
    await libre();
    await sinCartelDeError(selector);
  };

  await pagina.goto(url, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('#btnEntrar');
  await registrar('onboarding');
  await tocar('[data-especie="KOALA"]');
  await tocar('#btnEntrar');
  await pagina.waitForSelector('.niveles');
  await registrar('inicio');

  // Una sesión del nivel 1 entera.
  await tocar('[data-nivel]');
  let equivocado = false;
  let vozMal = false;
  for (let t = 1; t <= 30; t += 1) {
    if (await pagina.locator('#btnCerrar').count()) break;
    const card = await pagina.evaluate(() => estado.sesion.card);
    await registrar(`t${t}-inicial`);

    // La primera tarjeta que lo permite se arma mal una vez, para ver la marca.
    const primero = card.tiles.find((t2) => t2.id === resolver(card)[0]);
    const otro = card.tiles.find((t2) => t2.label !== primero.label);
    if (!equivocado && otro && card.expectedLength === 1) {
      equivocado = true;
      await tocar(`[data-tile="${otro.id}"]`);
      await registrar(`t${t}-equivocada`);
    }

    for (const id of resolver(card)) await tocar(`[data-tile="${id}"]`);
    await registrar(`t${t}-armada`);

    if (await pagina.locator('#btnVozBien').count()) {
      // La voz mal dicha va en una tarjeta que el servidor puede rechazar: en la
      // presentación de la letra, lo que el navegador no entiende pasa sin verificar.
      if (!vozMal && card.kind !== 'LETTER_INTRO') {
        vozMal = true;
        await tocar('#btnVozMal');
        await registrar(`t${t}-voz-mal`);
      }
      if (await pagina.locator('#btnVozBien').count()) await tocar('#btnVozBien');
      await registrar(`t${t}-voz`);
    }
  }
  await tocar('#btnCerrar');
  await registrar('cierre');
  await tocar('#btnVolver');
  await registrar('inicio-despues');

  // Repaso de una tarjeta ya dominada.
  await tocar('#btnRepaso');
  await registrar('repaso');
  await tocar('[data-repaso]');
  const repaso = await pagina.evaluate(() => estado.tarjetaRepaso);
  for (const id of resolver(repaso)) await tocar(`[data-tile-repaso="${id}"]`);
  await registrar('repaso-resuelto');
  await tocar('#btnVolver');

  // La mascota se pone lo que ganó.
  await tocar('#btnMascota');
  await registrar('mascota');
  await tocar('[data-accesorio]:not([disabled])');
  await registrar('mascota-vestida');
  await tocar('#btnVolver');

  // La seño entra y habilita hasta el último nivel.
  await tocar('#solapaDocente');
  await registrar('docente');
  await tocar('#btnEntrarDocente');
  await pagina.waitForSelector('#selectNivel');
  await registrar('docente-curso');
  const ultimo = await pagina.locator('#selectNivel option').last().getAttribute('value');
  await pagina.locator('#selectNivel').selectOption(ultimo);
  await libre();
  await registrar('docente-habilito');

  await pagina.context().close();
  return { pasos, errores };
}

module.exports = { recorrerConsola };
