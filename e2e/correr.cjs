// Corre los dos recorridos de punta a punta y los compara con la línea base.
//
//   npm run recorrido              # falla si alguna pantalla cambió
//   npm run recorrido:actualizar   # el cambio es a propósito: reescribe la línea base
//
// Compila el backend, lo levanta con Math.random sembrado (el mazo sale igual
// en cada corrida) y levanta el frontend con Vite apuntando a ese backend. Usa
// puertos propios para no chocar con lo que ya esté corriendo.
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { abrirNavegador } = require('./comun.cjs');
const { recorrerFrontend } = require('./frontend.cjs');
const { recorrerConsola } = require('./consola.cjs');
const { diferenciasDeTexto, mostrarDiferencias } = require('./comparar.cjs');

const RAIZ = path.resolve(__dirname, '..');
const PUERTO_BACKEND = 3100;
const PUERTO_FRONTEND = 5180;
const ACTUALIZAR = process.argv.includes('--actualizar');

const procesos = [];

function levantar(comando, args, cwd, env) {
  // En su propio grupo, para poder apagar también los hijos (npx → vite).
  const hijo = spawn(comando, args, { cwd, env: { ...process.env, ...env }, detached: true, stdio: 'ignore' });
  procesos.push(hijo);
  return hijo;
}

function apagarTodo() {
  for (const hijo of procesos) {
    try {
      process.kill(-hijo.pid, 'SIGTERM');
    } catch {}
  }
}

async function esperar(url, nombre) {
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${nombre} no respondió en ${url}`);
}

async function main() {
  for (const dir of ['backend', 'frontend']) {
    if (!fs.existsSync(path.join(RAIZ, dir, 'node_modules'))) {
      throw new Error(`Falta instalar ${dir}: cd ${dir} && npm install`);
    }
  }

  console.log('Compilando el backend…');
  const build = spawnSync('npm', ['run', 'build'], { cwd: path.join(RAIZ, 'backend'), encoding: 'utf8' });
  if (build.status !== 0) throw new Error(`No compiló el backend:\n${build.stdout}${build.stderr}`);

  levantar('node', ['-r', path.join(__dirname, 'azar-sembrado.cjs'), 'dist/main.js'], path.join(RAIZ, 'backend'), {
    PORT: String(PUERTO_BACKEND),
  });
  levantar('npx', ['vite', '--port', String(PUERTO_FRONTEND), '--strictPort'], path.join(RAIZ, 'frontend'), {
    AMI_BACKEND: `http://localhost:${PUERTO_BACKEND}`,
  });
  await esperar(`http://localhost:${PUERTO_BACKEND}/catalog/speech`, 'El backend');
  await esperar(`http://localhost:${PUERTO_FRONTEND}/`, 'El frontend');

  const recorridos = [
    ['frontend', recorrerFrontend, `http://localhost:${PUERTO_FRONTEND}/`],
    ['consola', recorrerConsola, `http://localhost:${PUERTO_BACKEND}/`],
  ];

  const navegador = await abrirNavegador();
  let fallas = 0;
  try {
    // El orden importa: los dos comparten el backend y su sorteo.
    for (const [nombre, recorrer, url] of recorridos) {
      console.log(`Recorriendo ${nombre}…`);
      const salida = path.join(__dirname, 'salida', nombre);
      let pasos = [];
      let errores = [];
      try {
        ({ pasos, errores } = await recorrer(navegador, url, salida));
      } catch (e) {
        errores = [e.message.split('\n')[0]];
      }
      fs.mkdirSync(salida, { recursive: true });
      fs.writeFileSync(path.join(salida, 'traza.json'), JSON.stringify({ pasos, errores }, null, 2));

      const base = path.join(__dirname, 'linea-base', `${nombre}.json`);
      if (errores.length) {
        fallas += 1;
        console.log(`✗ ${nombre}: el recorrido no pudo terminar o la página tuvo errores`);
        errores.slice(0, 5).forEach((e) => console.log(`  ${e}`));
        continue;
      }
      if (ACTUALIZAR || !fs.existsSync(base)) {
        fs.writeFileSync(base, `${JSON.stringify(pasos, null, 2)}\n`);
        console.log(`✓ ${nombre}: ${pasos.length} pantallas guardadas como línea base`);
        continue;
      }
      const distintas = diferenciasDeTexto(JSON.parse(fs.readFileSync(base, 'utf8')), pasos);
      if (distintas.length) {
        fallas += 1;
        console.log(`✗ ${nombre}: ${distintas.length} de ${pasos.length} pantallas cambiaron respecto de la línea base`);
        mostrarDiferencias(distintas);
      } else {
        console.log(`✓ ${nombre}: ${pasos.length} pantallas iguales a la línea base`);
      }
    }
  } finally {
    await navegador.close();
  }

  if (fallas) {
    console.log('\nSi el cambio es a propósito: npm run recorrido:actualizar');
    console.log('Las capturas de esta corrida quedaron en e2e/salida/.');
  }
  return fallas;
}

main()
  .then((fallas) => {
    apagarTodo();
    process.exit(fallas ? 1 : 0);
  })
  .catch((e) => {
    apagarTodo();
    console.error(e.message);
    process.exit(1);
  });
