// Comparación de recorridos.
//
// Como módulo, compara el texto de cada paso contra la línea base (lo usa
// `correr.cjs`). Desde la terminal, compara dos carpetas de salida también en
// las capturas, píxel a píxel, para revisar a mano un antes y un después:
//
//   node comparar.cjs salida-antes/frontend salida/frontend
const fs = require('node:fs');
const path = require('node:path');

/** Pasos cuyo nombre o texto no coincide. Vacío si los dos recorridos dieron lo mismo. */
function diferenciasDeTexto(esperados, obtenidos) {
  const distintas = [];
  const n = Math.max(esperados.length, obtenidos.length);
  for (let i = 0; i < n; i += 1) {
    const a = esperados[i];
    const b = obtenidos[i];
    if (!a || !b || a.paso !== b.paso || a.texto !== b.texto) distintas.push({ esperado: a, obtenido: b });
  }
  return distintas;
}

function mostrarDiferencias(distintas, cuantas = 5) {
  for (const { esperado, obtenido } of distintas.slice(0, cuantas)) {
    console.log(`  en ${esperado?.paso ?? '—'} / ${obtenido?.paso ?? '—'}`);
    console.log(`    esperado: ${esperado?.texto.slice(0, 200) ?? '(no hay paso)'}`);
    console.log(`    obtenido: ${obtenido?.texto.slice(0, 200) ?? '(no hay paso)'}`);
  }
  if (distintas.length > cuantas) console.log(`  … y ${distintas.length - cuantas} más`);
}

/** Cuántos píxeles cambian entre dos capturas; los PNG se decodifican en el navegador. */
async function pixelesDistintos(pagina, a, b) {
  return pagina.evaluate(
    async ([da64, db64]) => {
      const cargar = async (d) => {
        const img = new Image();
        img.src = `data:image/png;base64,${d}`;
        await img.decode();
        const lienzo = new OffscreenCanvas(img.width, img.height).getContext('2d');
        lienzo.drawImage(img, 0, 0);
        return lienzo.getImageData(0, 0, img.width, img.height).data;
      };
      const [pa, pb] = [await cargar(da64), await cargar(db64)];
      if (pa.length !== pb.length) return -1;
      let n = 0;
      for (let k = 0; k < pa.length; k += 4) if (pa[k] !== pb[k] || pa[k + 1] !== pb[k + 1] || pa[k + 2] !== pb[k + 2]) n += 1;
      return n;
    },
    [a.toString('base64'), b.toString('base64')],
  );
}

async function compararCarpetas(A, B) {
  const { abrirNavegador } = require('./comun.cjs');
  const leer = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'traza.json'), 'utf8')).pasos;
  const distintas = diferenciasDeTexto(leer(A), leer(B));
  mostrarDiferencias(distintas);

  const navegador = await abrirNavegador();
  const pagina = await navegador.newPage();
  const capturas = fs.readdirSync(A).filter((f) => f.endsWith('.png'));
  const cambiadas = [];
  for (const f of capturas) {
    const fb = path.join(B, f);
    if (!fs.existsSync(fb)) {
      cambiadas.push(`${f} (falta)`);
      continue;
    }
    const [ba, bb] = [fs.readFileSync(path.join(A, f)), fs.readFileSync(fb)];
    if (ba.equals(bb)) continue;
    const px = await pixelesDistintos(pagina, ba, bb);
    if (px !== 0) cambiadas.push(`${f} (${px < 0 ? 'otro tamaño' : `${px} px`})`);
  }
  await navegador.close();
  console.log(`texto distinto en ${distintas.length} pasos · capturas distintas: ${cambiadas.length} de ${capturas.length}`);
  cambiadas.slice(0, 20).forEach((c) => console.log(`  ${c}`));
}

if (require.main === module) {
  const [A, B] = process.argv.slice(2);
  if (!A || !B) {
    console.log('Uso: node comparar.cjs <carpeta-a> <carpeta-b>');
    process.exit(2);
  }
  compararCarpetas(A, B).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { diferenciasDeTexto, mostrarDiferencias };
