# Plan — AMI (TP2 IA y Neurociencias)

> La documentación de producto y contenido pedagógico vive en `docs/` (en especial
> `docs/03_propuesta_app.md` y `docs/05_niveles.md`). Este archivo registra únicamente
> decisiones de implementación del código.

## Estado

### En curso

### Pendientes

- **Persistencia real** — la capa de puertos está lista y los repositorios en memoria son
  reemplazables, pero mientras no exista una base, cada reinicio borra alumnos y progreso.
- **Calibrar el umbral de similitud fonética** — hoy está en 0.7, elegido a ojo. Con habla
  infantil real puede estar rechazando pronunciaciones correctas, que es el peor error posible
  para esta app.
- **Tokens sin expiración ni revocación** — alcanzan para la demo; un token filtrado hoy sirve
  para siempre.
- **Sin límite de intentos en los endpoints sin token** — `/onboarding/students` deja crear
  alumnos sin tope.
- **Audio en base64 dentro del JSON** — límite de 10 MB por request. Para volumen real conviene
  `multipart/form-data`.
- **Tests de integración HTTP** — hoy los tests cubren la lógica de negocio y la integridad del
  contenido; el recorrido por HTTP se verifica con `scripts/demo.sh`, que no corre en CI.

### Completadas

- 2026-09-20 — Backend MVP en NestJS

## Bitácora de decisiones

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
