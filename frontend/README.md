# AMI — frontend

La app tal como está en los mockups de Figma ([AMI — Mockups](https://www.figma.com/design/dHf5AHIJGYiJugKL5HfhAu/AMI-%E2%80%94-Mockups?node-id=0-1)), consumiendo la API del backend. Vite + React + TypeScript, CSS plano, sin librería de componentes.

## Levantarlo

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Necesita el backend corriendo en `http://localhost:3000` (`cd backend && npm run start:dev`). Para apuntar a otro servidor, `VITE_API_URL=https://... npm run dev`.

```bash
npm run build      # compila a dist/
npm run preview    # sirve dist/
```

## Pantallas y su mockup

| Pantalla | Frame de Figma | Archivo |
|---|---|---|
| Carga | 01 — Carga (`1:2`) | `src/screens/Carga.tsx` |
| Onboarding | 02 — Onboarding (`1:11`) | `src/screens/Onboarding.tsx` |
| Inicio | 03 — Pantalla inicial (`1:23`) | `src/screens/Inicio.tsx` |
| Sesión: letra nueva o sílaba | 04 — Sesión sonido de letra (`1:57`, `18:1373`) | `src/components/Tarjeta.tsx` (`LETTER_INTRO`; para una sílaba muestra "M + A" y "MA") |
| Sesión: instrucciones | 05 — con instrucciones (`13:967`) | `Tarjeta.tsx` (`HojaInstrucciones`) |
| Sesión: armar palabra | 06 — Sesión armar palabra (`1:88`, `14:1169`) | `Tarjeta.tsx` (`WORD_BUILDING`, `SENTENCE_BUILDING`) |
| Sesión / Repaso: reconocer sonido | 07 — Repaso (`1:109`, `14:1082`) | `Tarjeta.tsx` (`SOUND_RECOGNITION`), `src/screens/Repaso.tsx` |
| Personalización | 08 — Personalización (`1:121`) | `src/screens/Personalizacion.tsx` |
| Cierre | 09 — cierre (`18:1444`) | `src/screens/Cierre.tsx` |

Cada mockup muestra un caso (la A, la palabra MAPA); el componente aplica el mismo diseño a lo que traiga el backend: la letra que toque, la palabra que toque, las opciones que toque.

Dos gestos que el mockup no muestra: en armar palabra, una letra puesta se saca tocándola de nuevo (en el casillero o en su ficha, que queda atenuada), y se van con ella las que venían después para que el orden no se desarme; y el botón de audio de la palabra vive dentro de la caja de la ilustración.

## Lo que se respeta a rajatabla

**Las mascotas.** `public/mascotas/*.svg` son las cuatro exportadas de Figma (león, oso polar, rinoceronte, koala), sin redibujar. El componente `Mascota` las muestra en los tamaños del mockup (150, 104, 75, 50). El backend las conoce como `LION`, `POLAR_BEAR`, `RHINOCEROS`, `KOALA`.

**Tipografía y colores.** Fredoka (títulos, letras, botones) y Nunito (flecha de volver, placeholder), de Google Fonts. Los colores están como variables en `src/styles.css` con los valores exactos del archivo de Figma.

**Los íconos.** `public/icons/` son los SVG del mockup (play, refresh, lock, microphone, sound-high, xmark).

## Lo que es provisorio

- **Ilustraciones de palabras y opciones**: emojis (`src/ilustraciones.ts`) hasta que exista el banco de imágenes; donde no hay emoji que sirva (MESA) hay un dibujo propio en `public/ilustraciones/`. El mockup usa imágenes generadas (mapa, avión, araña).
- **Accesorios de la mascota**: emoji superpuesto; no hay arte en el mockup.
- **Hoja de instrucciones**: la imagen del león haciendo el sonido es la del mockup (`public/ilustraciones/instrucciones-lion.jpg`); para las otras tres mascotas se muestra la mascota con el sonido escrito hasta que haya imagen.
- **Voz**: usa el `SpeechRecognition` del navegador (Chrome). Si no existe o no responde en 6 segundos, se da la pronunciación por hecha para que la demo no se trabe.

## Alcance

La primera versión cubre los niveles 1 a 5 (todo el Capítulo 2 del cuadernillo). Los dos cursos cargados (`PRIMERO-A`, `PRIMERO-B`) arrancan habilitados hasta el 5 y el 6 aparece con candado, bloqueado por la docente.
