# Cómo compilar y montar AMI en cualquier computadora

AMI son dos programas que corren a la vez: el **backend** (la API, en NestJS) y el **frontend** (la app, en React). Los dos viven en este mismo repositorio, en las carpetas `backend/` y `frontend/`.

## 1. Lo único que hay que tener instalado

- **Node.js 20 o más nuevo** (trae `npm`). Se baja de [nodejs.org](https://nodejs.org). Para comprobarlo:
  ```bash
  node --version    # tiene que decir v20.x o más
  npm --version
  ```
- **Git**, para bajar el repositorio.
- **Google Chrome** (o Edge) para usar la app: es el navegador que trae reconocimiento de voz. En Firefox y Safari la app funciona igual, pero la parte de "ahora decilo vos" se da por hecha sin escuchar.

No hace falta base de datos, Docker, Python ni ninguna otra cosa. El estado vive en memoria: cada vez que se reinicia el backend, los alumnos y su progreso vuelven a cero (el contenido de los niveles se carga solo).

## 2. Bajar el repositorio

```bash
git clone <url-del-repositorio> ami
cd ami
```

## 3. Levantar el backend

En una terminal:

```bash
cd backend
npm install        # solo la primera vez, baja las dependencias
npm run start:dev  # arranca en http://localhost:3000 y se recarga solo al tocar código
```

Cuando termine de arrancar muestra `API escuchando en http://localhost:3000`. Dejá esa terminal abierta.

Qué queda disponible:
- `http://localhost:3000` — consola de prueba (una herramienta para recorrer la API con botones; no es la app).
- `http://localhost:3000/docs` — documentación interactiva de la API (Swagger).
- `http://localhost:3000/audio/fonema/m.ogg` — los sonidos de las letras y de las sílabas (uno
  por archivo: `m.ogg`, `ma.ogg`, `te.ogg`…). `_silabas-seguidas.ogg` y `_todas-seguidas.ogg` los
  encadenan todos, para escuchar el banco entero de una.

## 4. Levantar el frontend (la app)

En **otra** terminal:

```bash
cd frontend
npm install        # solo la primera vez
npm run dev        # arranca en http://localhost:5173
```

Abrí `http://localhost:5173` en Chrome. Códigos de clase para entrar: `PRIMERO-A` o `PRIMERO-B`.

Por defecto el frontend busca el backend en `http://localhost:3000`. Si el backend corre en otra máquina o puerto:

```bash
VITE_API_URL=http://192.168.0.10:3000 npm run dev
```

## 5. Compilar para producción (opcional)

```bash
cd backend && npm run build && npm run start:prod   # sirve la API desde dist/
cd frontend && npm run build                        # deja la app lista en frontend/dist/
```

`frontend/dist/` son archivos estáticos: se pueden servir con cualquier servidor web (Nginx, Vercel, Netlify, GitHub Pages…), siempre que `VITE_API_URL` apunte al backend al momento de compilar.

## 6. Comprobar que todo está bien

```bash
cd backend && npm test    # 67 tests de la lógica de negocio y del contenido
cd frontend && npm run build   # si compila, el código tipa bien
```

## 7. Panel de la docente

Está en la consola de prueba (`http://localhost:3000`, solapa **Docente**). Código: `PRIMERO-A-DOC` o `PRIMERO-B-DOC`. Desde ahí se ve el progreso de cada alumno y se habilitan niveles para el curso (los dos cursos arrancan habilitados hasta el nivel 5).

## Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| La app dice "no se pudo hablar con el servidor" | El backend no está corriendo o está en otro puerto. Revisá la terminal del paso 3. |
| Al abrir la app me manda al onboarding aunque ya había entrado | El backend se reinició y borró el estado en memoria. Entrá de nuevo con el código de clase. |
| El micrófono no escucha | Chrome pide permiso de micrófono la primera vez; si se negó, se cambia en el candado de la barra de direcciones. En Firefox/Safari no hay reconocimiento de voz. |
| `npm install` falla por versión de Node | Actualizá Node a 20 o más nuevo. |
| Puerto 3000 o 5173 ocupado | Backend: `PORT=3001 npm run start:dev` y después `VITE_API_URL=http://localhost:3001 npm run dev` para el frontend. |

---

# Ajustes pendientes

Lo que quedó anotado para seguir. En orden de prioridad.

## 1. Grabar el banco de audio con voz propia

**Hoy:** los sonidos de las letras (`m.ogg`, `a.ogg`…) y los de las sílabas (`ma.ogg`, `te.ogg`…)
son recortes de dos videos de YouTube: las letras de ColorKids Play y las sílabas de FIESTIKIDS.
Son voces humanas de verdad, sin música de fondo, y suenan bien; el problema es la licencia.
Ninguno de los dos videos es de uso libre, así que sirven para la demo del TP pero no para
publicar la app.

Además faltan cuatro sonidos, que hoy caen a la voz sintética del navegador: `ch` y `ll`, que no
están en el video de letras, y `ca` y `cu` del nivel 6, que no están en el de sílabas.

**Qué hacer:**
- Grabar el banco con una voz propia: ideal la misma persona para todo, en un lugar silencioso,
  con el celular alcanza. Son 26 letras (la `h` no suena) más `qu` y `rr`, y 45 sílabas
  (`ma me mi mo mu`, y lo mismo con P, S, L, N, D, F, T y B), más `ca ce ci co cu`.
- Guardarlas como `backend/public/audio/fonema/<letra o sílaba>.ogg` (mono, 44,1 kHz,
  normalizadas a -18 LUFS como las de ahora). El frontend las busca por ese nombre: no hay que
  tocar código, alcanza con reemplazar el archivo.
- Si en vez de grabar se quiere volver a recortar de un video, el proceso de las sílabas está
  automatizado en `backend/scripts/silabas.py` (baja el video, separa la voz de la música con
  Demucs, recorta cada sílaba y normaliza). Sirve de plantilla para cualquier otro video: lo
  único que hay que volver a medir son los tiempos de arriba del archivo.

## 2. Mejor personalización de la mascota

**Hoy:** la pantalla existe (`frontend/src/screens/Personalizacion.tsx`) y funciona con la API: cada nivel dominado paga un accesorio y se puede poner o sacar. Pero los accesorios se dibujan como un emoji flotando al lado de la mascota, porque no hay arte.

**Qué hacer:**
- Dibujar cada accesorio (gorro, anteojos, bufanda, capa, medalla, mochila) como SVG en `frontend/public/accesorios/`, con el mismo estilo de las mascotas, y posicionarlo sobre la cara según el `slot` que ya manda el backend (`HEAD`, `FACE`, `NECK`, `BODY`). Como las cuatro mascotas tienen la misma proporción (150×150 con la cara centrada), un mismo accesorio puede servir para las cuatro con un ajuste chico por especie.
- Que la mascota vestida se vea en todos lados donde aparece (inicio, feedback de la sesión, cierre), no solo en la pantalla de personalización. El componente `Mascota` ya recibe la lista de accesorios puestos.
- Sumar más para ganar: hoy hay uno por nivel (6). La pantalla de Figma muestra una grilla de 2×2; con más de 4 conviene que la grilla haga scroll.

## 3. Llevarlo al teléfono

**Hoy:** el layout ya es responsive: 390 px sigue siendo el ancho de referencia del mockup, pero las medidas fijas son topes y no valores clavados, así que la pantalla se acomoda sola desde 280 px de ancho hasta el escritorio, y usa el alto real de la ventana (`dvh`) en vez de los 844 px del frame. Está probado con capturas en 280×653, 320×568, 360×640, 390×844, 412×915 y escritorio, sin recortes ni scroll horizontal. Lo que falta para que sea una app de teléfono de verdad es lo de abajo.

**Para probarla ya en el celular, en la misma red Wi-Fi:**
1. Levantar backend y frontend como siempre. El frontend ya acepta conexiones de otros equipos y
   le reenvía la API al backend (`/api`), así que no hay que configurar `VITE_API_URL`.
2. Averiguar la IP de la computadora (`ip addr` en Linux). Ejemplo: `192.168.0.10`.
3. El micrófono del teléfono solo funciona en páginas seguras, y por IP la página es `http`.
   Para marcarla como segura, una sola vez, en Chrome del celular:
   - abrir `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
   - escribir `http://192.168.0.10:5173` en el cuadro, poner **Enabled** y tocar **Relaunch**.
4. Abrir `http://192.168.0.10:5173`.

(`npm run dev:telefono` sirve la app por `https` con certificado autofirmado, pero Chrome la
sigue tratando como insegura y no da el micrófono: el paso 3 es lo que anda.)

**Reconocimiento de voz en Linux (y en Firefox):** Chrome y Chromium en Linux no traen el
reconocimiento de voz de Google (dan error `network`). En ese caso la app graba el audio y lo
reconoce el backend con Vosk, si está activado:
```bash
cd backend
npm install vosk-koffi
mkdir -p models && cd models
curl -O https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip && unzip vosk-model-small-es-0.42.zip && cd ..
AMI_SPEECH_PROVIDER=vosk AMI_VOSK_MODEL_PATH=./models/vosk-model-small-es-0.42 npm run start:dev
```
Vosk anda bien con palabras pero es flojo con sílabas sueltas: el reconocedor de Google (Chrome
en Android, Windows o Mac) es bastante mejor.

**Para que sea una app de teléfono de verdad:**
- **Publicarla con `https`** (por ejemplo backend en Railway/Render y frontend en Vercel/Netlify, o los dos en un mismo servidor detrás de Nginx con certificado de Let's Encrypt). Con `https` el micrófono funciona en el celular.
- **Convertirla en PWA**: un `manifest.json` (nombre, ícono, color `#ff8a4c`, `display: standalone`) y un service worker que guarde en caché la app y los audios. Con eso se "instala" desde Chrome o Safari a la pantalla de inicio, abre a pantalla completa sin barra del navegador y los sonidos siguen andando sin señal. Vite tiene el plugin `vite-plugin-pwa` que hace casi todo.
- **Probarla en teléfonos reales**: el alto real de la pantalla (`dvh`), el área segura del notch (`env(safe-area-inset-*)`) y el bloqueo del zoom por doble toque (`touch-action: manipulation`) ya están puestos, pero se verificaron con un navegador headless. En un teléfono de verdad hay que mirar sobre todo el notch y la barra de gestos de iOS, que el emulador no reproduce.
- **Persistencia del backend**: hoy el progreso se borra al reiniciar el servidor. Para usarlo de verdad hace falta una base de datos; la capa de persistencia ya está preparada para eso (ver `backend/README.md`, sección "Qué falta para producción").
