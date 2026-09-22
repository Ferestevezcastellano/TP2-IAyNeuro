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
- `http://localhost:3000/audio/fonema/m.ogg` — los sonidos de las letras (uno por archivo).

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

## 1. Sonidos fluidos de las sílabas

**Hoy:** las sílabas (`ma`, `me`, `sa`, `lu`…) se arman fundiendo la grabación de la consonante con la de la vocal, las dos recortadas del video de ColorKids Play. Suena "mmm → aaa", que sirve para mostrar la unión, pero no es una sílaba dicha de corrido por una persona. Además solo funciona con consonantes que se pueden estirar (M, S, L, N): con T, P, C, D, B, G habría que grabar sí o sí.

**Qué hacer:**
- Grabar las sílabas con una voz real (ideal: la misma persona para todo el banco, en un lugar silencioso, con el celular alcanza). Lista mínima para los niveles 3 y 4: `ma me mi mo mu sa se si so su la le li lo lu na ne ni no nu` (20 archivos). Para el nivel 6: `ca co cu ta te ti to tu`.
- Guardarlas como `backend/public/audio/fonema/<silaba>.ogg` (mono, 44,1 kHz, normalizadas a -18 LUFS como las demás). El frontend ya las busca por ese nombre: no hay que tocar código.
- Mismo camino para las letras, si se quiere reemplazar la voz del video por una propia: son 26 archivos `a.ogg` … `z.ogg` (la `h` no suena) más `qu.ogg` y `rr.ogg`. Eso además resuelve el tema de licencia: los recortes del video sirven para la demo, pero no para publicar la app.
- El proceso con el que se generaron los clips actuales (bajar el video, separar la voz de la música con Demucs, cortar por detección de silencios, fundir consonante + vocal) se hizo a mano y no está en el repo; si se va a repetir, conviene dejarlo como script en `backend/scripts/`.

## 2. Mejor personalización de la mascota

**Hoy:** la pantalla existe (`frontend/src/screens/Personalizacion.tsx`) y funciona con la API: cada nivel dominado paga un accesorio y se puede poner o sacar. Pero los accesorios se dibujan como un emoji flotando al lado de la mascota, porque no hay arte.

**Qué hacer:**
- Dibujar cada accesorio (gorro, anteojos, bufanda, capa, medalla, mochila) como SVG en `frontend/public/accesorios/`, con el mismo estilo de las mascotas, y posicionarlo sobre la cara según el `slot` que ya manda el backend (`HEAD`, `FACE`, `NECK`, `BODY`). Como las cuatro mascotas tienen la misma proporción (150×150 con la cara centrada), un mismo accesorio puede servir para las cuatro con un ajuste chico por especie.
- Que la mascota vestida se vea en todos lados donde aparece (inicio, feedback de la sesión, cierre), no solo en la pantalla de personalización. El componente `Mascota` ya recibe la lista de accesorios puestos.
- Sumar más para ganar: hoy hay uno por nivel (6). La pantalla de Figma muestra una grilla de 2×2; con más de 4 conviene que la grilla haga scroll.

## 3. Llevarlo al teléfono

**Hoy:** la app está pensada para 390 px de ancho (el frame del mockup) y en la computadora se ve como un teléfono centrado. Se puede abrir desde un celular, pero hay que hacer dos cosas para que sea cómodo.

**Para probarla ya en el celular, en la misma red Wi-Fi:**
1. Averiguar la IP de la computadora (`ip addr` en Linux, `ipconfig` en Windows, `ifconfig` en Mac). Ejemplo: `192.168.0.10`.
2. Levantar el frontend apuntando al backend por esa IP y aceptando conexiones de afuera:
   ```bash
   cd frontend
   VITE_API_URL=http://192.168.0.10:3000 npm run dev -- --host
   ```
3. En el celular, abrir `http://192.168.0.10:5173` en Chrome.

Ojo: el reconocimiento de voz de Chrome exige conexión segura (`https`) salvo en `localhost`, así que por IP el micrófono no va a andar; la pronunciación se da por hecha, como en Firefox.

**Para que sea una app de teléfono de verdad:**
- **Publicarla con `https`** (por ejemplo backend en Railway/Render y frontend en Vercel/Netlify, o los dos en un mismo servidor detrás de Nginx con certificado de Let's Encrypt). Con `https` el micrófono funciona en el celular.
- **Convertirla en PWA**: un `manifest.json` (nombre, ícono, color `#ff8a4c`, `display: standalone`) y un service worker que guarde en caché la app y los audios. Con eso se "instala" desde Chrome o Safari a la pantalla de inicio, abre a pantalla completa sin barra del navegador y los sonidos siguen andando sin señal. Vite tiene el plugin `vite-plugin-pwa` que hace casi todo.
- **Pantalla completa y toques**: el layout ya es de una sola columna; falta usar el alto real de la pantalla (`100dvh` en vez de 844 px fijos), respetar el área segura del notch (`env(safe-area-inset-*)`) y bloquear el zoom con doble toque en los botones de letras (`touch-action: manipulation`).
- **Persistencia del backend**: hoy el progreso se borra al reiniciar el servidor. Para usarlo de verdad hace falta una base de datos; la capa de persistencia ya está preparada para eso (ver `backend/README.md`, sección "Qué falta para producción").
