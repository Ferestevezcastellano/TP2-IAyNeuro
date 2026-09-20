# AMI — backend

API del MVP de **AMI**, la app de práctica diaria de conciencia fonológica para primer grado. Es el backend que consume un frontend separado: expone el contrato completo y no sirve assets ni HTML.

El contexto pedagógico y el diseño de contenido están en `../docs/`, en particular `05_niveles.md`, de donde sale la secuencia de niveles.

## Levantarlo

```bash
cd backend
npm install
npm run start:dev
```

- **Consola de prueba: `http://localhost:3000`** — el flujo completo con botones
- Documentación interactiva: `http://localhost:3000/docs`
- API: `http://localhost:3000`

No hace falta base de datos ni ninguna otra cosa instalada. **El estado vive en memoria y se pierde al reiniciar**: los alumnos, las sesiones y el progreso desaparecen, y el contenido (niveles, tarjetas, cursos, accesorios) se vuelve a cargar solo en cada arranque.

```bash
npm run build        # compila a dist/
npm test             # tests unitarios de la lógica de negocio
npm run demo         # recorrido completo por HTTP, con el servidor ya levantado
```

`npm run demo` necesita `jq` y un servidor corriendo en otra terminal, y no corre en PowerShell. Recorre el flujo entero: onboarding, tres sesiones hasta dominar el nivel 1, estrellas y accesorio, nivel bloqueado por la docente, desbloqueo desde el panel, repaso y tabla del curso.

## Consola de prueba

En `http://localhost:3000` hay una página que consume esta misma API con botones: elegir mascota, tocar las letras para armar la palabra, ver el feedback de AMI, ganar las estrellas y, desde la solapa Docente, habilitar niveles para el curso. Existe porque probar el recorrido desde Swagger obliga a copiar a mano el `sessionId`, el `cardId` y el id del botón correcto entre un endpoint y el siguiente, tres sesiones seguidas por nivel.

No es el frontend de la app —ese se desarrolla aparte y tiene su propio diseño— y la página lo aclara arriba de todo. Las ilustraciones son emojis porque el banco de imágenes todavía no existe, los audios los genera `speechSynthesis` y la verificación por voz usa el `SpeechRecognition` del navegador, las dos sin costo y sin instalar nada. Donde el navegador no las trae, quedan botones para simular la voz. El código está en `public/`, sin build ni dependencias.

## Datos semilla

Seis niveles, los del Capítulo 2 del cuadernillo *Yo amo aprender — Lengua, 1er grado* (CABA, 2026) más el primero del Capítulo 4:

| Nivel | Contenido | Tipo |
|---|---|---|
| 1 | A, E | sonido aislado |
| 2 | I, O, U | sonido aislado |
| 3 | M, S | primeras sílabas y palabras |
| 4 | L, N | primera oración |
| 5 | Consolidación | sin letras nuevas |
| 6 | C (ca, co, cu), T | palabras y oración |

Dos cursos, con distinto avance docente a propósito:

| Código de clase | Código de docente | Habilitado hasta |
|---|---|---|
| `PRIMERO-A` | `PRIMERO-A-DOC` | nivel 3 |
| `PRIMERO-B` | `PRIMERO-B-DOC` | nivel 6 |

Las imágenes y los audios no están: cada tarjeta trae `imageKey` y `audioKey`, claves simbólicas (`img/palabra/mesa`, `audio/fonema/m`) que el frontend resuelve contra su propio banco de assets.

## Cómo se identifica cada uno

No hay usuario ni contraseña, porque el usuario es un chico de seis años que recién está aprendiendo a escribir.

**El chico** canjea código de clase más mascota por un token opaco:

```bash
curl -X POST localhost:3000/onboarding/students \
  -H 'Content-Type: application/json' \
  -d '{"classCode":"PRIMERO-A","petSpecies":"LION"}'
```

y manda ese token en el header `x-ami-student-token`. No se guarda nombre, edad ni ningún otro dato personal: la mascota es la identidad visible, también en el panel de la docente.

**La docente** canjea el código de su curso en `POST /teacher/session` y usa `x-ami-teacher-token`. No es un usuario del sistema: quien tiene el código del curso es la docente de ese curso.

Los dos esquemas están declarados en Swagger, así que el botón *Authorize* de `/docs` alcanza para recorrer toda la demo desde el navegador.

## Endpoints

### Catálogo (sin token)
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/catalog/pets` | Las cuatro mascotas del onboarding |
| GET | `/catalog/levels` | Los niveles en orden, sin estado de alumno |
| GET | `/catalog/accessories` | Accesorios y en qué nivel se gana cada uno |
| GET | `/catalog/mastery-rules` | Con qué parámetros se mide el dominio |

### Onboarding (sin token)
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/onboarding/class-code/verify` | Valida el código antes de elegir mascota |
| POST | `/onboarding/students` | Registra al chico y devuelve su token |

### Alumno (`x-ami-student-token`)
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/me` | Mascota, estrellas y nivel actual |
| GET | `/me/levels` | Los niveles con su estado para este alumno |
| GET | `/me/pet` | La mascota con accesorios ganados y bloqueados |
| PATCH | `/me/pet` | Viste a la mascota con lo ya ganado |

### Sesión de práctica (`x-ami-student-token`)
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/practice/sessions` | Abre una sesión del nivel actual o del pedido |
| GET | `/practice/sessions/{id}/current-card` | La tarjeta que toca ahora |
| POST | `/practice/sessions/{id}/cards/{cardId}/attempt` | Valida el armado por botones |
| POST | `/practice/sessions/{id}/cards/{cardId}/voice-check` | Verificación final por voz |
| POST | `/practice/sessions/{id}/complete` | Cierra la sesión y devuelve la pantalla de cierre |

### Repaso (`x-ami-student-token`)
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/review/sounds` | Los sonidos ya dominados, para la grilla |
| GET | `/review/cards?limit=` | Tarjetas barajadas de niveles dominados |
| POST | `/review/attempts` | Valida un armado de repaso, sin tocar el progreso |

### Panel docente (`x-ami-teacher-token`)
| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/teacher/session` | Canjea el código de docente por un token |
| GET | `/teacher/class` | Datos del curso y hasta qué nivel está habilitado |
| GET | `/teacher/class/students` | Progreso de cada alumno |
| GET | `/teacher/class/levels` | Cómo viene el curso nivel por nivel |
| PUT | `/teacher/class/unlocked-level` | Habilita niveles hasta el indicado |

## Las tres reglas que importan

**Dominio.** Un nivel no se domina por acertar una vez. Se mide con el promedio móvil de las **últimas 3 sesiones**, con un mínimo de **3 sesiones** y un umbral de **0.8**. Dentro de una sesión, cada tarjeta puntúa según cuántos intentos necesitó (1 al primero, 0.5 al segundo, 0.25 al tercero), porque el chico que se corrige solo aprendió algo y contarlo como error sería falso. Donde hay verificación por voz, la voz pesa el 40% de la tarjeta. Los parámetros están juntos en `src/core/config/mastery.config.ts`.

**Avance.** El nivel siguiente necesita las dos condiciones a la vez: que el anterior esté dominado y que la docente ya lo haya habilitado para el curso. Habilitar de más no adelanta a nadie, y dominar de más no pasa por encima de lo que el aula todavía no vio. Por eso hay dos estados de bloqueo distintos, `LOCKED_BY_PROGRESS` y `LOCKED_BY_TEACHER`, con su motivo en texto listo para mostrar.

**Feedback.** Siempre con la estructura Valoro / Me pregunto / Sugiero del pilar 2, en tres campos separados para que la interfaz le dé a cada parte su tiempo. Un error informa el índice del primer botón equivocado en lugar de un simple *incorrecto*, así el casillero se marca sin borrar lo que el chico ya armó. No hay puntaje negativo, ranking ni comparación entre chicos, y ningún endpoint de alumno expone datos de otro.

## Verificación por voz

La restricción del TP es costo cero: ningún servicio pago, ninguna API key facturable, ni siquiera con capa gratuita.

La solución es un puerto, `SpeechRecognitionPort`, con dos implementaciones que se eligen por variable de entorno:

**`stub` (por defecto).** No escucha: deriva el resultado del contenido del audio de forma determinista, así el mismo audio da siempre lo mismo. Acepta alrededor de cuatro de cada cinco audios y rechaza el resto a propósito, que es lo que permite mostrar el feedback constructivo en la demo. Existe porque una demo en vivo no puede depender de que la máquina de turno tenga un modelo descargado ni un micrófono que ande.

**`vosk` (opcional).** Reconocimiento real, corriendo entero en la máquina, sin cuenta ni API key. Es opcional porque el modelo son unos 50 MB que hay que bajar a mano y el binding es nativo, dos cosas que no queremos entre el `npm install` y el pitch:

```bash
npm install vosk
curl -O https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip
unzip vosk-model-small-es-0.42.zip -d models/
AMI_SPEECH_PROVIDER=vosk AMI_VOSK_MODEL_PATH=./models/vosk-model-small-es-0.42 npm run start:dev
```

Espera WAV PCM 16 bits mono a 16 kHz, y acota el vocabulario a lo que la tarjeta espera, que es lo que más sube la precisión con habla infantil.

El endpoint también acepta un campo `transcript` en lugar del audio, para un frontend que prefiera usar el reconocimiento del navegador. En los tres casos la decisión final la toma el servidor y es **fonética, no ortográfica**: un normalizador rioplatense más distancia de edición, con umbral de similitud 0.7. BACA vale por VACA, KESO por QUESO y SAPATO por ZAPATO, porque a los seis años decir bien la palabra y escribirla bien son dos habilidades distintas y este nivel evalúa la primera. Un rechazo nunca traba la sesión: el chico ya armó la palabra, y dejarlo encerrado porque el micrófono del aula es malo sería exactamente el feedback punitivo que la app evita.

## Estructura

```
src/
  core/
    domain/        entidades puras, sin decoradores de Nest ni de ORM
    ports/         clases abstractas: los contratos de persistencia y de voz
    services/      reglas de negocio (dominio, recompensas, feedback, validación, fonética)
    config/        parámetros de dominio
  persistence/
    in-memory/     las nueve implementaciones sobre Maps
    persistence.module.ts   el único lugar que elige el almacenamiento
  modules/         una carpeta por sección de la app, con su controller y sus DTOs
  seed/            contenido curricular y carga inicial
  common/          guards, decoradores y DTOs compartidos
public/            consola de prueba (HTML y JS sueltos, sin build)
```

La regla que sostiene todo: los controllers hablan con servicios, y los servicios solo conocen las clases abstractas de `core/ports`. **Migrar a una base real es escribir `persistence/typeorm/` con esas mismas nueve clases y cambiar los `useClass` en `persistence.module.ts`.** Ningún servicio de negocio se entera, y los tests de `core/services/` siguen corriendo sin levantar nada.

## Variables de entorno

| Variable | Default | Para qué |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `AMI_SPEECH_PROVIDER` | `stub` | `stub` o `vosk` |
| `AMI_VOSK_MODEL_PATH` | — | Ruta del modelo, obligatoria con `vosk` |
| `AMI_VOSK_SAMPLE_RATE` | `16000` | Frecuencia del modelo |

## Qué falta para producción

Nada de esto hace falta para la demo, pero conviene tenerlo escrito:

- Persistencia real. La capa está preparada; falta escribirla.
- Los tokens no expiran ni se pueden revocar, y viven en memoria.
- Sin límite de intentos por IP en los endpoints sin token.
- El audio viaja en base64 dentro del JSON, con un límite de 10 MB. Para volumen real conviene `multipart/form-data`.
- La tolerancia fonética (0.7) está puesta a ojo: habría que calibrarla con grabaciones reales de chicos de primer grado.
