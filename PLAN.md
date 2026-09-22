# Plan — AMI (TP2 IA y Neurociencias)

> La documentación de producto y contenido pedagógico vive en `docs/` (en especial
> `docs/03_propuesta_app.md` y `docs/05_niveles.md`). Este archivo registra únicamente
> decisiones de implementación del código.

## Estado

### En curso

### Pendientes

- **Persistencia real** — la capa de puertos está lista y los repositorios en memoria son
  reemplazables, pero mientras no exista una base, cada reinicio borra alumnos y progreso.
- **Calibrar el mínimo de sesiones para dominar** — quedó en 1 por pedido del equipo (una sesión
  al 80 % ya domina el nivel). La ventana móvil sigue en 3, así que volver a 3 es cambiar un
  número en `mastery.config.ts`.
- **Calibrar el umbral de similitud fonética** — hoy está en 0.7, elegido a ojo. Con habla
  infantil real puede estar rechazando pronunciaciones correctas, que es el peor error posible
  para esta app.
- **Tokens sin expiración ni revocación** — alcanzan para la demo; un token filtrado hoy sirve
  para siempre.
- **Sin límite de intentos en los endpoints sin token** — `/onboarding/students` deja crear
  alumnos sin tope.
- **Los audios de fonemas no tienen licencia para publicar** — son recortes de un video de
  YouTube (ColorKids Play) y alcanzan para la demo, pero una app publicada necesita grabar los
  fonemas o pedir permiso al canal. CH y LL no están en el video y caen a la voz sintética.
- **Audio en base64 dentro del JSON** — límite de 10 MB por request. Para volumen real conviene
  `multipart/form-data`.
- **Tests de integración HTTP** — hoy los tests cubren la lógica de negocio y la integridad del
  contenido; el recorrido por HTTP se verifica con `scripts/demo.sh` y con un guion de Playwright
  que quedó fuera del repo, ninguno de los dos en CI.
- **El frontend no tiene tests automatizados** — se recorrió con Playwright (onboarding, sesión completa
  de nivel 1 y de nivel 3, repaso, personalización, cierre) pero el guion quedó fuera del repo.
- **Ilustraciones y arte de accesorios** — el frontend usa emojis donde el mockup tiene imágenes
  generadas; la hoja de instrucciones solo tiene imagen para el león.
- **La consola de prueba no tiene tests** — se verificó a mano con Playwright, pero nada impide
  que un cambio en un DTO la rompa en silencio. El bug de `sesion.id` contra `sessionId` apareció
  justamente así.

### Completadas

- 2026-09-20 — Backend MVP en NestJS
- 2026-09-20 — Consola de prueba servida por el propio backend
- 2026-09-21 — Banco de tarjetas con sorteo por sesión, presentación de la letra nueva y sonido de fonema en vez de nombre de letra
- 2026-09-21 — Frontend en `frontend/` replicando los mockups de Figma (niveles 1 a 3)
- 2026-09-21 — Niveles 3 a 5 reordenados: letra → sus cinco sílabas → palabras, consonante por consonante; nivel 5 solo palabras y oraciones

## Bitácora de decisiones

### 2026-09-21 — Frontend aparte, en Vite + React, replicando el Figma
**Contexto:** había que pasar de la consola de prueba a la app real, con los mockups de Figma como
única fuente de diseño y una condición innegociable: las mascotas tienen que ser exactamente las
del mockup.
**Decisión:** `frontend/` como app separada (Vite + React + TypeScript, CSS plano con los tokens
del archivo de Figma) que consume la misma API; la consola de prueba queda intacta como
herramienta. Las cuatro mascotas se exportaron de Figma como SVG y se usan sin redibujar; el
backend cambió sus especies a `LION`, `POLAR_BEAR`, `RHINOCEROS`, `KOALA`. Cada mockup se
implementó como componente parametrizado: "Sesión sonido de letra" sirve para cualquier letra,
"Sesión armar palabra" para cualquier palabra, con las ilustraciones provisorias (emojis) donde el
mockup tenía imágenes generadas. Primera versión acotada a los niveles 1 a 3: los dos cursos
arrancan habilitados hasta el 3 y el resto se ve bloqueado por la docente.
**Alternativas descartadas:** rediseñar la consola en el lugar (mezcla herramienta de verificación
con producto y arrastra su estructura); Tailwind como en el código que genera Figma (una
dependencia más para diez pantallas que caben en un CSS con variables); generar las mascotas desde
las capas sueltas que devuelve Figma (decenas de `<img>` posicionados por mascota, cuando un SVG
exportado es un archivo).
**Revisión post-implementación:** dos cosas que el mockup no resolvía y hubo que decidir: cómo se
llega a Personalización (tocando el avatar de la pantalla inicial) y cuándo aparece la hoja de
instrucciones (cuando la voz no se acepta). Y una que apareció probando: el reconocimiento de voz
del navegador puede quedarse escuchando para siempre sin micrófono, así que se le puso un tope de
6 segundos tras el cual la pronunciación se da por hecha.

### 2026-09-21 — Banco por nivel y sorteo por sesión, con la letra nueva primero
**Contexto:** dominar un nivel pide tres sesiones como mínimo, y las tres eran idénticas: mismas
tarjetas, mismos dibujos, mismo orden. A la tercera el chico ya sabía que "el árbol" era la
respuesta sin escuchar nada. Además los niveles de consonantes arrancaban directo en sílabas sin
presentar nunca la letra sola, que es el primer paso de la estructura del cuadernillo.
**Decisión:** cada nivel tiene un banco más grande que una sesión, repartido en bolsas (`group`:
LETRA, SILABA, PALABRA, ORACION, o una por vocal), y una receta `sessionDraw` que dice cuántas se
sortean de cada bolsa (`SessionDeckService`). El mazo sale ordenado por `position`, así la
estructura letra → sílaba → palabra → oración se mantiene aunque las tarjetas cambien. Se agregó
la tarjeta `LETTER_INTRO` (la letra grande, se la toca, suena, el chico la repite) en todo nivel
con letras nuevas, siempre antes de cualquier sílaba o palabra de esa letra; un test del seed lo
verifica.
**Alternativas descartadas:** barajar los botones de una misma tarjeta por request (cambia el
orden pero no el contenido, y rompe la reproducibilidad del contrato); elegir tarjetas al azar sin
bolsas (una sesión podía salir con cinco sílabas y ninguna palabra); marcar las tarjetas de letra
como "siempre incluidas" por tipo (una bolsa LETRA con `count` igual al total hace lo mismo sin
caso especial).
**Revisión post-implementación:** apareció un bug que ya estaba y que el banco más grande hizo
visible: el validador comparaba ids de botón, así que en MASA o ASA tocar "la otra A" contaba como
error. Ahora compara por etiqueta. También hubo que meter la bolsa en el id de las tarjetas de
reconocimiento, porque ISLA aparecía en la bolsa I y en la de las cinco vocales con el mismo id.

### 2026-09-21 — Sílabas presentadas una por una, con audio fundido
**Contexto:** el equipo pidió que el nivel 3 presente M, ma, me, mi, mo, mu, S, sa, se, si, so, su
en ese orden (todo lo de una consonante antes de pasar a la otra), el 4 igual con L y N integrando
M y S en las palabras, y el 5 solo palabras y oraciones.
**Decisión:** las sílabas se presentan con la misma tarjeta que la letra nueva (`LETTER_INTRO`
con `targetPhoneme` de dos letras: se ve "M + A" arriba y "MA" grande, se toca, suena, se
repite). El audio de cada sílaba se generó fundiendo la grabación de la consonante con la de la
vocal (`mmm` → `aaa`), sin voz sintética. Las bolsas de letras y sílabas entran completas en cada
sesión y lo que se sortea son las palabras. En el nivel 4 hay dos bolsas de palabras (con L y con
N) para que las de la L queden antes de presentar la N.
**Alternativas descartadas:** tarjetas de reconocimiento por sílaba (SA → elegir SAPO) como
paso previo (piden una imagen por sílaba y no muestran la unión de los dos sonidos); leer la
sílaba con `speechSynthesis` (robótico y distinto por navegador); grabar sílabas del video
(no las tiene).
**Revisión post-implementación:** la sesión del nivel 3 quedó en 15 tarjetas y la del 4 en 17.
Las de letra y sílaba son de un toque y una repetición, así que entra en los 10-15 minutos, pero
es el primer lugar donde mirar si en el aula resulta larga. El test del seed que exige que
ninguna palabra use letras fuera del acumulado atrapó "MIRA" (R) en una oración del nivel 5.

### 2026-09-21 — Sonido de fonema, nunca nombre de letra
**Contexto:** al tocar la M la consola decía "eme". Para conciencia fonológica eso es el error
principal: el chico arma palabras juntando sonidos, y "eme" + "a" no da "ma".
**Decisión:** un catálogo `phonemes.ts` con cómo suena cada letra sola ("mmm", "sss", "k"), y un
campo `spokenAs` en cada tarjeta y cada botón para que cualquier frontend sepa qué hacer sonar.
El `voiceTarget` de una letra es su fonema, y el normalizador fonético colapsa sonidos repetidos
("m" vale por "mmm"; "eme" no). Para no depender de la voz sintética, las 26 letras suenan con
recortes del video "Los sonidos de las letras del abecedario" (ColorKids Play), servidos desde
`public/audio/fonema/`: se bajó el audio, se ubicó cada letra por los subtítulos automáticos
("la letra X y su sonido es" → tres repeticiones → palabra de ejemplo) y se recortó la primera
repetición por detección de silencios.
**Alternativas descartadas:** sintetizar "mmm" con `speechSynthesis` (suena robótico y cada
navegador lo lee distinto); una biblioteca npm con fonemas del español (no existe una con
grabaciones humanas y licencia clara); las grabaciones IPA de Wikimedia Commons (CC BY-SA, se
probaron primero, pero suenan a laboratorio de fonética y no a una voz que le habla a un chico);
Forvo o similares (API paga). Lingua Libre en Commons queda anotado para cuando haga falta audio
de palabras enteras: tiene miles de palabras en español con licencia libre.

### 2026-09-20 — Estado en memoria detrás de puertos de repositorio
**Contexto:** el MVP es para una demo en vivo y no justifica montar una base, pero la lógica
de progresión y dominio es lo único que el TP realmente tiene que mostrar y no puede quedar
atada al almacenamiento.
**Decisión:** clases abstractas en `src/core/ports/` como tokens de inyección, implementadas
por `src/persistence/in-memory/`. Los servicios de dominio solo conocen las abstractas; el
cableado vive en `persistence.module.ts`. Migrar a Postgres es agregar `persistence/typeorm/`
y cambiar el `useClass`.
**Alternativas descartadas:** TypeORM con SQLite en memoria (arrastra decoradores de ORM a las
entidades de dominio y suma dependencia nativa); servicios con `Map` adentro (no hay dónde
enchufar la base después).
**Revisión post-implementación:** salió como estaba planeado. Apareció un detalle no previsto:
los repositorios devuelven copias profundas (`detach` en `in-memory.store.ts`) en vez del objeto
guardado. Sin eso, mutar la respuesta de un repositorio modificaba el "disco", el código
funcionaba en memoria y se habría roto contra una base real, que es justo el error que esta capa
existe para evitar.

### 2026-09-20 — Verificación por voz con puerto pluggable y stub por defecto
**Contexto:** la restricción es costo cero absoluto, y una demo en vivo no puede depender de
descargar un modelo ni de que ande el micrófono en la máquina de turno.
**Decisión:** `SpeechRecognitionPort` con dos adaptadores elegidos por `AMI_SPEECH_PROVIDER`:
`stub` (por defecto, determinístico, acepta también una transcripción ya hecha por el cliente)
y `vosk` (reconocimiento real offline, opcional). La aceptación la resuelve un normalizador
fonético rioplatense con distancia de Levenshtein, no una comparación exacta, porque el habla
infantil es imprecisa y rechazar por una vocal mal articulada sería feedback punitivo.
**Alternativas descartadas:** Vosk obligatorio (modelo de ~50 MB y binding nativo antes de
poder levantar el server); Whisper por API (tiene costo); delegar todo a la Web Speech API del
navegador (deja la lógica fuera del backend y ata la demo a Chrome).
**Revisión post-implementación:** se agregó algo no planeado: el stub rechaza a propósito uno de
cada cinco audios. Con aceptación del 100% la demo no podía mostrar el feedback constructivo,
que es la mitad de lo que la app tiene para decir sobre los cuatro pilares.

### 2026-09-20 — Dominio por promedio móvil en vez de estrellas por sesión
**Contexto:** `docs/05_niveles.md` dice que un nivel se destraba al completarlo con sus 3
estrellas; el enunciado del TP pide dominio medido por promedio móvil sobre varias sesiones y
habilitación previa de la docente. Son reglas incompatibles.
**Decisión:** manda el enunciado. Un nivel se juega tantas veces como haga falta; el dominio es
el promedio de las últimas 3 sesiones sobre un umbral de 0.8, con mínimo de 3 sesiones. Las 3
estrellas y el accesorio se pagan una sola vez, al momento de dominar. El nivel siguiente exige
dominio **y** habilitación docente.
**Alternativas descartadas:** seguir `05_niveles.md` (una sesión perfecta destraba, que es
justo lo que el enunciado descarta); umbral sobre el total histórico (un mal arranque queda
penalizado para siempre y desalienta reintentar).
**Revisión post-implementación:** durante la implementación aparecieron dos decisiones que el
plan no cubría. Primera: cómo puntuar una tarjeta resuelta al segundo intento. Quedó en una
escala degradada (1 / 0.5 / 0.25) en vez de acierto o error, porque el chico que se corrige solo
aprendió algo. Segunda: qué pasa con una sesión floja después del dominio. No lo revierte: quitar
estrellas ya ganadas es el feedback punitivo que la app evita. Ambas están en
`session-scoring.service.ts` y `mastery.service.ts`, con tests.

### 2026-09-20 — Identificación por tokens opacos sin login
**Contexto:** el usuario es un chico de 6 años que no puede escribir su nombre ni una
contraseña, y el TP decidió no pedir ningún dato personal.
**Decisión:** el alumno canjea código de clase + mascota por un `studentToken` (UUID opaco) que
viaja en `x-ami-student-token`; la docente canjea el `teacherCode` de su clase por un
`teacherToken` en `x-ami-teacher-token`. Dos guards resuelven cada uno. Ambos esquemas quedan
declarados en Swagger para poder probar la demo desde `/docs`.
**Alternativas descartadas:** JWT (firma y expiración que nadie va a verificar en una demo sin
base); mandar el `studentId` crudo (cualquiera enumera alumnos de la clase).
**Revisión post-implementación:** salió tal cual. Los dos guards quedaron sobre un único puerto
`AccessTokenRepository` que distingue alumno de docente por `subjectType`, en lugar de dos
mecanismos separados.

### 2026-09-20 — Consola de prueba servida por el propio backend

**Contexto:** probar el flujo desde Swagger obliga a copiar a mano el sessionId, el cardId y el
id del botón correcto entre un endpoint y el siguiente, varias veces por sesión y tres sesiones
por nivel. Es tan tedioso que en la práctica nadie verifica el recorrido completo, que es
justamente lo único que muestra la regla de dominio funcionando.
**Decisión:** un `public/index.html` sin build ni dependencias, servido por el mismo NestJS con
`useStaticAssets`, que consume la API igual que lo haría el frontend. Los audios los genera
`speechSynthesis` y la verificación por voz usa `SpeechRecognition`, las dos del navegador, sin
costo y sin instalar nada; cuando el navegador no las tiene, quedan botones para simular la voz.
Las ilustraciones que el backend nombra con `imageKey` se representan con emojis, porque el banco
de imágenes todavía no existe.
**Alternativas descartadas:** script de PowerShell (resuelve el tedio pero deja todo en texto y
no sirve para mostrar en el pitch); abrir el HTML con `file://` (el origen `null` complica CORS
y obligaría a configurar algo aparte); adelantar el frontend real (se desarrolla por separado y
tiene su propio diseño; esto es una herramienta de verificación y la página lo dice).
**Revisión post-implementación:** salió como estaba planeado. Recorrerla con Playwright antes de
darla por buena encontró tres cosas que leyendo el código no se veían: la página llamaba a
`sesion.id` cuando el DTO expone `sessionId`, así que los tres endpoints de sesión salían con
`undefined`; la regla `.botonera button` pisaba el fondo del botón de acción pero no su color de
texto, y quedaba blanco sobre blanco; y las tarjetas de reconocimiento de sonido se dibujaban con
el emoji de palabra, que para ellas no existe.
