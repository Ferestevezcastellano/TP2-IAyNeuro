// Recorrido del frontend (la app de los chicos) de punta a punta.
//
// Juega los niveles 1 a 5 como lo haría el chico, leyendo solo la pantalla,
// después el repaso y el compañero con cada accesorio ganado. Para que dé lo
// mismo en cada corrida:
// - el backend corre con Math.random sembrado (mismo sorteo de tarjetas);
// - el micrófono es el falso de Chromium, y el guion reescribe en la red lo que
//   "dijo" el chico en cada intento, para recorrer a propósito cada rama del
//   flujo de voz: rechazo con reintento, "no te escuché" y acierto;
// - los sonidos terminan al instante y las animaciones están apagadas.
const { paginaQuieta, traza, sinTilde } = require('./comun.cjs');

async function recorrerFrontend(navegador, url, salida) {
  const { pagina, errores } = await paginaQuieta(navegador, { width: 400, height: 860 });

  // El servidor "reconoce voz": así la app graba con el micrófono y se escucha.
  await pagina.route('**/api/catalog/speech', (r) => r.fulfill({ json: { provider: 'vosk' } }));

  // Tarjetas vistas, por id, para saber qué hay que decir.
  const tarjetas = new Map();
  const anotarTarjeta = (c) => c && c.id && tarjetas.set(c.id, c);
  pagina.on('response', async (res) => {
    if (!/\/api\/(practice|review)\//.test(res.url())) return;
    try {
      const j = await res.json();
      anotarTarjeta(j.card);
      anotarTarjeta(j.session && j.session.card);
      (j.cards || []).forEach(anotarTarjeta);
    } catch {}
  });

  // Qué "dice" el chico en cada intento. La primera tarjeta de cada tipo de
  // pedido recorre las tres ramas; el resto acierta de una.
  const recorridas = new Set();
  const intentos = new Map();
  await pagina.route('**/voice-check', async (route) => {
    const cardId = decodeURIComponent(route.request().url().split('/cards/')[1].split('/')[0]);
    const card = tarjetas.get(cardId) || {};
    const n = (intentos.get(cardId) || 0) + 1;
    intentos.set(cardId, n);
    const tipo = card.voiceSays || 'SIN-TIPO';
    let cuerpo;
    if (!recorridas.has(tipo) && n === 1) cuerpo = { transcript: 'PANTALON' };
    else if (!recorridas.has(tipo) && n === 2) cuerpo = { audioBase64: 'AAAA' };
    else {
      recorridas.add(tipo);
      cuerpo = { transcript: card.voiceTarget };
    }
    await route.continue({ postData: JSON.stringify(cuerpo), headers: { ...route.request().headers(), 'content-type': 'application/json' } });
  });

  const { pasos, registrar } = traza(pagina, '#root', salida);

  /** Lo que identifica a la tarjeta en pantalla, para saber cuándo cambió. */
  async function identidad() {
    const partes = await pagina.evaluate(() => {
      const q = (s) => document.querySelector(s);
      return [
        q('.tarjeta-letra')?.getAttribute('aria-label'),
        q('.tarjeta-consigna')?.textContent,
        q('.tarjeta-ilustracion')?.getAttribute('aria-label'),
        [...document.querySelectorAll('.opcion')].map((b) => b.getAttribute('aria-label')).join(','),
        q('.cierre') ? 'CIERRE' : '',
      ].join('|');
    });
    return partes;
  }

  async function esperarCambio(antes, tope = 8000) {
    const fin = Date.now() + tope;
    while (Date.now() < fin) {
      if ((await identidad()) !== antes) return true;
      await pagina.waitForTimeout(150);
    }
    return false;
  }

  /** Arma la tarjeta como lo haría el chico, leyendo solo la pantalla. */
  async function resolver() {
    if (await pagina.locator('.tarjeta-letra:not(.con-pista)').count()) {
      await pagina.locator('.tarjeta-letra').click();
      return;
    }
    if (await pagina.locator('.opciones').count()) {
      const consigna = sinTilde(await pagina.locator('.tarjeta-consigna').innerText());
      const fonema = consigna.split('EMPIEZA CON')[1].trim();
      const opciones = pagina.locator('.opcion');
      for (let i = 0; i < (await opciones.count()); i += 1) {
        if (sinTilde((await opciones.nth(i).getAttribute('aria-label')) || '').startsWith(fonema)) {
          await opciones.nth(i).click();
          return;
        }
      }
      throw new Error(`ninguna opción empieza con ${fonema}`);
    }
    const objetivo = sinTilde((await pagina.locator('.tarjeta-ilustracion').getAttribute('aria-label')) || '');
    for (const palabra of objetivo.split(' ')) {
      let resto = palabra;
      while (resto) {
        const fichas = await pagina.locator('.ficha:not(.usada)').evaluateAll((bs) => bs.map((b) => b.textContent.trim()));
        const candidatas = fichas
          .map((f, i) => ({ f: f.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(), i }))
          .filter(({ f }) => (objetivo.includes(' ') ? f === resto : resto.startsWith(f)))
          .sort((a, b) => b.f.length - a.f.length);
        if (!candidatas.length) throw new Error(`no encuentro ficha para ${resto} (${objetivo})`);
        await pagina.locator('.ficha:not(.usada)').nth(candidatas[0].i).click();
        resto = resto.slice(candidatas[0].f.length);
        await pagina.waitForTimeout(60);
      }
    }
  }

  async function hablarHastaTerminar(antes) {
    for (let k = 1; k <= 6; k += 1) {
      if (await pagina.locator('.sin-microfono').count()) {
        await registrar('sin-microfono');
        await pagina.getByText('SEGUIR SIN DECIRLO').click();
        return;
      }
      const mic = pagina.locator('.bloque-voz.activo .btn-mic:not([disabled])');
      if (!(await mic.count())) return;
      const respuesta = pagina.waitForResponse(/voice-check/, { timeout: 15000 });
      await mic.click();
      await respuesta;
      await pagina.waitForTimeout(700);
      await registrar(`voz-${k}`);
      if (await pagina.locator('.hoja').count()) {
        const boton = (await pagina.locator('.btn-hoja').innerText()).trim();
        await pagina.locator('.btn-hoja').click();
        await registrar(`hoja-${boton.toLowerCase().replace(/\s+/g, '-')}`);
        if (boton === 'SEGUIR') return;
        continue;
      }
      if ((await identidad()) !== antes) return;
      if (!(await pagina.getByText('NO TE ESCUCHE').count())) {
        await esperarCambio(antes);
        return;
      }
    }
  }

  async function jugarNivel(nivel) {
    await pagina.getByRole('button', { name: 'Jugar' }).click();
    await pagina.waitForSelector('.tarjeta-letra, .opciones, .fichas');
    for (let t = 1; t <= 25; t += 1) {
      if (await pagina.locator('.cierre').count()) break;
      const antes = await identidad();
      await registrar(`n${nivel}-t${t}-inicial`);
      await resolver();
      await pagina.waitForTimeout(400);
      await registrar(`n${nivel}-t${t}-armada`);
      await hablarHastaTerminar(antes);
      await esperarCambio(antes);
    }
    await pagina.waitForSelector('.cierre', { timeout: 10000 });
    await registrar(`n${nivel}-cierre`);
    await pagina.locator('.cierre-volver').click();
    await pagina.waitForSelector('.inicio');
    await registrar(`n${nivel}-inicio`);
  }

  await pagina.goto(url, { waitUntil: 'networkidle' });
  await pagina.waitForSelector('.onboarding');
  await registrar('onboarding');
  await pagina.locator('.onboarding-celda').first().click();
  await pagina.locator('.onboarding-input').fill('PRIMERO-A');
  await pagina.locator('.btn-principal').click();
  await pagina.waitForSelector('.inicio');
  await registrar('inicio');

  for (let nivel = 1; nivel <= 5; nivel += 1) await jugarNivel(nivel);

  // Repaso: la tarjeta en modo repaso, sin voz.
  await pagina.getByRole('button', { name: 'Repaso' }).click();
  await pagina.waitForTimeout(800);
  await registrar('repaso');
  for (let t = 1; t <= 3; t += 1) {
    if (!(await pagina.locator('.tarjeta-letra, .opciones, .fichas').count())) break;
    const antes = await identidad();
    await resolver();
    await pagina.waitForTimeout(400);
    await registrar(`repaso-t${t}`);
    await esperarCambio(antes);
  }
  await pagina.locator('.btn-volver').first().click();
  await pagina.waitForSelector('.inicio');

  // Compañero: cada categoría y cada accesorio ganado puesto.
  await pagina.getByRole('button', { name: 'Vestí a tu compañero' }).click();
  await pagina.waitForSelector('.persona-tabs');
  await registrar('companero');
  const pestanas = pagina.locator('.persona-tab');
  for (let i = 0; i < (await pestanas.count()); i += 1) {
    await pestanas.nth(i).click();
    await registrar(`companero-tab${i + 1}`);
    const items = pagina.locator('.persona-item:not(.trabado)');
    for (let j = 0; j < (await items.count()); j += 1) {
      await items.nth(j).click();
      await registrar(`companero-tab${i + 1}-item${j + 1}`);
    }
  }

  await pagina.context().close();
  return { pasos, errores };
}

module.exports = { recorrerFrontend };
