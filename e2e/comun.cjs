// Lo que comparten los dos recorridos: abrir el navegador y registrar cada
// pantalla (texto visible y captura) para después compararla.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

/**
 * Chromium con micrófono falso y permiso ya dado. `AMI_CHROMIUM` apunta a un
 * Chromium instalado aparte; sin ella se usa el que baja
 * `npx playwright install chromium`.
 */
function abrirNavegador() {
  return chromium.launch({
    executablePath: process.env.AMI_CHROMIUM || undefined,
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
}

/** Una pestaña que no hace ruido ni anima nada: todo tiene que dar igual en cada corrida. */
async function paginaQuieta(navegador, viewport) {
  const contexto = await navegador.newContext({ viewport, permissions: ['microphone'], reducedMotion: 'reduce' });
  await contexto.addInitScript(() => {
    // Sonidos instantáneos: la app espera que terminen para seguir.
    HTMLMediaElement.prototype.play = function () {
      setTimeout(() => this.dispatchEvent(new Event('ended')), 30);
      return Promise.resolve();
    };
    if ('speechSynthesis' in window) {
      speechSynthesis.speak = (u) => setTimeout(() => u.onend && u.onend(new Event('end')), 30);
    }
    document.addEventListener('DOMContentLoaded', () => {
      const estilo = document.createElement('style');
      estilo.textContent = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
      document.head.appendChild(estilo);
    });
  });
  const pagina = await contexto.newPage();
  const errores = [];
  pagina.on('pageerror', (e) => errores.push(e.message));
  return { pagina, errores };
}

/**
 * Registra pasos numerados: el texto visible de `raiz`, normalizado, y una
 * captura en `salida`. El texto es lo que se compara contra la línea base.
 */
function traza(pagina, raiz, salida) {
  fs.rmSync(salida, { recursive: true, force: true });
  fs.mkdirSync(salida, { recursive: true });
  const pasos = [];
  return {
    pasos,
    async registrar(etiqueta) {
      await pagina.waitForTimeout(250);
      const nombre = `${String(pasos.length + 1).padStart(3, '0')}-${etiqueta}`;
      const texto = (await pagina.locator(raiz).innerText()).replace(/\s+/g, ' ').trim();
      pasos.push({ paso: nombre, texto });
      await pagina.screenshot({ path: path.join(salida, `${nombre}.png`) });
    },
  };
}

const sinTilde = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

module.exports = { abrirNavegador, paginaQuieta, traza, sinTilde };
