# Plan — AMI (TP2 IA y Neurociencias)

> La documentación de producto y contenido pedagógico vive en `docs/` (en especial
> `docs/03_propuesta_app.md` y `docs/05_niveles.md`). Este archivo registra únicamente
> decisiones de implementación del código.

## Estado

### En curso

### Pendientes

- **`CierreDeSesionService` quedó con 11 dependencias** — es una sola responsabilidad (liquidar la
  sesión), pero coordina puntaje, dominio, recompensas y cinco repositorios. Si crece, conviene
  que el pago de estrellas y accesorio lo resuelva un solo colaborador.
- **`scripts/demo.sh` está roto desde el 21/9** — no sabe resolver las tarjetas `LETTER_INTRO` y se
  traba en la primera. No lo rompió la refactorización del 26/9: falla en el script, antes de
  llegar a la API. El recorrido por HTTP de los niveles 1 a 5 se verificó con un guion aparte que
  quedó fuera del repo.
- **Los tests de `PracticeService` arman la sesión a mano** — cubren la voz y el cierre, pero no
  `start()` ni `attempt()`, porque el mazo se sortea.
- **El vocabulario de Vosk se arma una vez al arrancar** — si el contenido cambiara con la app
  andando, no se entera hasta reiniciar. Hoy el contenido no cambia en caliente.
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
- **Los audios de fonemas y sílabas no tienen licencia para publicar** — son recortes de dos
  videos de YouTube (ColorKids Play para las letras, FIESTIKIDS para las sílabas) y alcanzan para
  la demo, pero una app publicada necesita grabarlos o pedir permiso a los canales. CH y LL no
  están en el video de letras y caen a la voz sintética; `ca` y `cu` del nivel 6 no están en el
  de sílabas y caen a la voz sintética también.
- **Audio en base64 dentro del JSON** — límite de 10 MB por request. Para volumen real conviene
  `multipart/form-data`.
- **Tests de integración HTTP** — hoy los tests cubren la lógica de negocio y la integridad del
  contenido; el recorrido por HTTP se verifica con `scripts/demo.sh` y con un guion de Playwright
  que quedó fuera del repo, ninguno de los dos en CI.
- **El frontend no tiene tests automatizados** — se recorrió con Playwright (onboarding, sesión completa
  de nivel 1 y de nivel 3, repaso, personalización, cierre) pero el guion quedó fuera del repo.
- **Ilustraciones de las palabras** — el frontend usa emojis donde el mockup tiene imágenes
  generadas; la hoja de instrucciones solo tiene imagen para el león. Los accesorios ya no:
  son SVG propios en `frontend/public/accesorios/`.
- **La consola de prueba no tiene tests** — se verificó a mano con Playwright, pero nada impide
  que un cambio en un DTO la rompa en silencio. El bug de `sesion.id` contra `sessionId` apareció
  justamente así.

### Completadas

- 2026-09-26 — Refactorización del backend contra el `CLAUDE.md`: voz y cierre de sesión fuera de `PracticeService`
- 2026-09-23 — Accesorios como capas SVG superpuestas, en vez de emojis
- 2026-09-23 — Personalización rehecha con escenario, reacción del personaje y siluetas de lo bloqueado

- 2026-09-23 — Personalización rehecha: los bloqueados muestran las letras que faltan

- 2026-09-23 — Verificación por voz: se elimina el fallback que daba por buena cualquier pronunciación

- 2026-09-20 — Backend MVP en NestJS
- 2026-09-20 — Consola de prueba servida por el propio backend
- 2026-09-21 — Banco de tarjetas con sorteo por sesión, presentación de la letra nueva y sonido de fonema en vez de nombre de letra
- 2026-09-21 — Frontend en `frontend/` replicando los mockups de Figma (niveles 1 a 3)
- 2026-09-21 — Niveles 3 a 5 reordenados: letra → sus cinco sílabas → palabras, consonante por consonante; nivel 5 solo palabras y oraciones
- 2026-09-22 — Sílabas con voz humana recortadas de un segundo video, en vez de fundir consonante + vocal
- 2026-09-22 — El sonido sale al tocar el botón y nunca solo; la palabra recién armada suena entera antes del micrófono
- 2026-09-22 — Layout responsive de 280 px al escritorio, con el alto real de la ventana y el área segura del notch

## Bitácora de decisiones

### 2026-09-26 — El juicio de voz y el cierre de sesión salen de `PracticeService`
**Contexto:** una revisión del backend contra el `CLAUDE.md` del equipo encontró que
`PracticeService` iba camino a ser una God Class (486 líneas, 15 dependencias) y que dependía
directamente de las funciones de `speech/juez-pronunciacion.ts` y `speech/verificador-acustico.ts`,
salteando el puerto de voz. Además, el vocabulario de Vosk se armaba importando los datos semilla,
así que al pasar el contenido a una base quedaría desactualizado sin que nada falle.
**Decisión:** un puerto `VerificadorDeVozPort` en `core/ports/` con su implementación en
`modules/speech/`, que concentra la decisión de si el chico pronunció bien; un
`CierreDeSesionService` en `modules/practice/` para el puntaje, el dominio y las recompensas; el
juez de pronunciación como clase inyectable; el vocabulario de Vosk armado desde los repositorios
en `onApplicationBootstrap`, después de que se cargue el contenido. Una sola definición de vocales
y un solo umbral de similitud.
**Alternativas descartadas:** Strategy con un juez por tipo de pedido (cuatro tipos fijos no lo
justifican); inyectar la clase concreta del verificador sin puerto (más simple, pero `PracticeService`
seguiría dependiendo de una implementación); un enum para el proveedor de voz (al mover la lógica,
la comparación de texto desaparece sola).
**Revisión post-implementación:** salió como estaba planeado, con tres diferencias. Primera:
`CierreDeSesionService` quedó con 11 dependencias; `PracticeService` bajó a 302 líneas y 8
dependencias, pero la coordinación del cierre sigue siendo grande, ahora en un lugar con una sola
razón para cambiar. Segunda: para testear el verificador con audio hubo que sacar los generadores
de audio sintético del test acústico a `audio-sintetico.testing.ts`, compartido por los dos tests.
Tercera, no prevista y la más útil: como `PracticeService` no tenía tests, antes de mover nada se
escribieron 10 tests de caracterización que fijan su comportamiento desde afuera, y pasaron igual
antes y después. Además se comparó el contrato OpenAPI contra la versión anterior (idéntico: 23
rutas, 33 esquemas), el vocabulario de Vosk contra el que se armaba antes (las mismas 109
palabras), y se recorrieron los niveles 1 a 5 por HTTP en las dos versiones con el mismo resultado.
115 tests en verde (eran 87).

### 2026-09-23 — Los accesorios son capas SVG, no imágenes del animal vestido
**Contexto:** los accesorios se dibujaban como un emoji flotando al lado de la mascota. Para
reemplazarlos por arte de verdad había dos caminos, y la diferencia no es estética sino de
cantidad de archivos.
**Decisión:** cada accesorio es un SVG propio, dibujado en el **mismo lienzo de 150×150 que las
mascotas** y ya ubicado en la posición que le toca sobre la cara. Superponerlos es apilar `<img>`
del mismo tamaño, sin cálculo de anclaje por especie. La capa y la mochila van detrás de la
mascota; bufanda, medalla, anteojos y gorro, delante, en ese orden.
El motivo es aritmético: si el arte fuera "el animal con el accesorio puesto", harían falta
4 animales × 6 accesorios = 24 imágenes, y con dos accesorios encima se va a cientos. Por capas son
6 archivos, y cada accesorio nuevo suma uno solo.
**Alternativas descartadas:** generar las combinaciones con IA (la explosión combinatoria de
arriba, y encima ninguna combinación queda consistente con las otras); bajar SVG de internet (el
proyecto ya tiene un problema de licencias abierto con los audios de YouTube, y repetirlo con el
arte en el mismo TP es sumar riesgo por comodidad).
**Si se quiere mejorar el arte:** generar con IA **cada accesorio suelto sobre fondo transparente**
—nunca el animal vestido— y reemplazar los 6 archivos de `frontend/public/accesorios/`. No hay que
tocar código: `ARCHIVO_ACCESORIO` en `Mascota.tsx` mapea id → archivo.
**Paleta usada:** la de las mascotas exportadas de Figma (#313234 de tinta, #FCD53F, #FFBDA1,
#FEFAEE) más los acentos de la app, para que las piezas no se vean de otro set.


### 2026-09-23 — El accesorio bloqueado dice qué letras hay que aprender
**Contexto:** la pantalla de personalización era una lista de botones con emojis, y los accesorios
que faltaban decían "NIVEL 4". Eso no le dice nada a un chico que todavía no lee números como
metas.
**Decisión:** rehacerla con mascota grande arriba y una bandeja abajo con cuatro categorías
(Gorros, Anteojos, Ropa, Especiales), pocas opciones por vez y grandes. Y el cambio que importa:
**un accesorio bloqueado muestra las letras que hay que dominar para ganarlo**, no el número de
nivel. La bufanda dice `M S`.
Así el premio nombra exactamente lo que hay que aprender, y querer el gorro y querer aprender la M
pasan a ser la misma cosa. Un candado solo frustra; una letra da una meta.
**Alternativas descartadas:** esconder los accesorios bloqueados (sin horizonte no hay deseo);
dejar el número de nivel (no es una meta legible a los seis años); un botón de "seguí jugando para
desbloquear más" abajo de todo, como en la referencia (es publicidad de la propia app, y el dato ya
está en cada ítem).
**Lo que falta:** el arte. Los accesorios siguen siendo emojis; hacen falta SVG en
`frontend/public/accesorios/` con el estilo de las mascotas del Figma.


### 2026-09-23 — Un rechazo de voz ya no saltea la tarjeta, y un fonema aislado no se da por mal dicho
**Contexto:** con la verificación por voz andando de verdad aparecieron dos problemas que antes
estaban tapados, porque nada se rechazaba nunca.
El primero: `voiceCheck` hacía `currentCardIndex + 1` **siempre**, también al rechazar. O sea que
equivocarse salteaba el ejercicio. Y el feedback decía "¿LO DECIMOS UNA VEZ MÁS, BIEN DESPACITO?"
mientras la API ya había pasado a la tarjeta siguiente: la interfaz prometía un reintento que el
sistema no permitía.
El segundo: las tarjetas `LETTER_INTRO` piden decir un fonema aislado ("aaa", "mmm"), y el
reconocedor del navegador no puede transcribir eso. Devuelve vacío o una palabra cualquiera. El
resultado era que después de hacer todo bien igual aparecía la hoja de "MIRÁ MI BOCA Y DECÍ EEE",
acusando al chico de un error que casi siempre era del reconocedor.
**Decisión:** dos reglas separadas.
1. Un rechazo no avanza. Hay hasta `MAX_VOICE_ATTEMPTS` (3) intentos por tarjeta; recién al
   agotarlos la sesión sigue. La respuesta expone `canRetry` para que el frontend sepa si la hoja
   de instrucciones vuelve al micrófono o pasa de tarjeta, y el botón de la hoja ahora dice
   exactamente qué va a pasar: "PROBAR DE NUEVO" o "SEGUIR".
2. En una tarjeta de letra nueva, si el parecido queda por debajo de `ISOLATED_PHONEME_FLOOR`
   (0,4), el intento se registra **sin verificar** en vez de rechazarse. La verificación real se
   sostiene donde el reconocedor funciona —palabras y oraciones— y no se le dice "así no se dice"
   a un chico por una limitación de la Web Speech API.
**Alternativas descartadas:** bajar el umbral general de 0,7 (debilita la verificación justo donde
sí funciona, que son las palabras); sacar la verificación por voz de las tarjetas de letra
(el chico igual tiene que decirlo en voz alta: ese es el ejercicio, lo que no corresponde es
puntuarlo con un instrumento que no sirve para eso); dejar que el rechazo saltee pero avisando
(el feedback ya prometía reintentar, y prometer algo que no pasa es peor que no ofrecerlo).
**Cómo se verificó:** contra la API real. Tres rechazos seguidos sobre la misma tarjeta:
`canRetry=true` en los dos primeros y la tarjeta no cambia; al tercero `canRetry=false` y recién
ahí avanza. Y una transcripción muy lejana en una tarjeta de letra ("PANTALON" contra "aaa",
similitud 0,125) sale `verified=false` en vez de rechazada, así que la hoja de instrucciones ya no
aparece. 70 tests en verde.
**Lo que queda anotado:** el umbral de 0,7 y el piso de 0,4 siguen elegidos a ojo. Ahora que la
verificación es real, calibrarlos con habla infantil es más urgente que antes.


### 2026-09-23 — Un intento de voz que nadie escuchó se registra como "no verificado", no como acierto
**Contexto:** probando la app se podía decir "pantalón" cuando la palabra era "manzana" y la daba
por buena. La causa estaba en `frontend/src/components/Tarjeta.tsx`: `listen()` devuelve `''`
cuando el reconocedor falla, cuando termina sin resultado o cuando se acaban los 6 segundos, y
había un fallback `escuchado || card.voiceTarget` que en ese caso mandaba **la respuesta esperada**
como si el chico la hubiera dicho. El backend la comparaba contra sí misma: similitud 1, aceptada
siempre.
No era solo cosmético. `session-scoring.service.ts` usa `check.accepted` para puntuar la tarjeta, y
ese puntaje alimenta el promedio móvil que decide el dominio. Un micrófono que no andaba inflaba la
única métrica que el TP tiene que medir bien.
**Decisión:** separar tres casos que antes eran uno solo. `listen()` ya devolvía `null` (el
navegador no tiene reconocimiento), `''` (escuchó y no entendió) y el texto dicho; ahora quien
llama los distingue. Si no se entendió y el navegador sí puede escuchar, se le pide al chico que
lo diga de nuevo (una vez). Si después de eso sigue sin entenderse, o si el navegador directamente
no puede, se manda `{ unverified: true }`: el backend registra el intento con `verified: false`,
el chico **avanza igual** —no es su error que el micrófono no ande— pero la tarjeta se puntúa solo
por el armado, como si nunca hubiera pedido voz.
**Alternativas descartadas:** mandar el transcript vacío y dejar que el backend lo rechace (castiga
al chico por un micrófono roto, y le mete errores falsos al panel docente); bloquear la tarjeta
hasta que se entienda (deja al chico trabado por algo que no depende de él); dejar el fallback pero
solo cuando `canListen === false` (sigue inventando una pronunciación que nadie escuchó, solo que
menos seguido).
**Cómo se verificó:** contra la API real, tres casos en sesiones separadas. Decir "PANTALON" cuando
había que decir "aaa" → `accepted=false, verified=true`, similitud 0,125. Decir lo correcto →
`accepted=true, verified=true`, similitud 1. Sin escuchar → `accepted=true, verified=false`,
similitud 0. Más un test nuevo en `session-scoring.service.spec.ts` que fija que un intento no
verificado deja `voiceScore` en null y la tarjeta vale por el armado (70 tests en total).
**Lo que queda anotado:** el umbral de similitud sigue en 0,7 elegido a ojo, y ahora que la
verificación es real importa más que antes: si rechaza pronunciaciones correctas de habla infantil,
es el peor error posible para esta app.


### 2026-09-22 — Sílabas con voz humana, recortadas del estribillo de un video
**Contexto:** las sílabas se venían armando fundiendo la grabación de la consonante con la de la
vocal. Suena "mmm → aaa", que muestra la unión pero no es una sílaba dicha por una persona, y el
truco solo funciona con consonantes que se pueden estirar: con T, P, D, B no hay nada que fundir.
**Decisión:** recortarlas de "SÍLABAS PARA NIÑOS CON MÚSICA" (FIESTIKIDS,
[youtu.be/j1RIUuftxKo](https://youtu.be/j1RIUuftxKo)), que tiene las 45 combinaciones de M, P, S,
L, N, D, F y B (más T) con las cinco vocales. El video presenta cada sílaba con la palabra de
ejemplo pegada atrás ("MA de mamá") y recién al cerrar cada bloque repite las cinco sílabas
solas: ese estribillo final es la única parte donde la sílaba suena aislada, y es de donde salen
los clips. La música de fondo se saca con Demucs, igual que en las letras; después de separar, lo
que queda de música está 40 dB por debajo de la sílaba. Todo el proceso quedó en
`backend/scripts/silabas.py`, que era uno de los pendientes anotados.
**Cómo se verificó que cada clip es la sílaba que dice ser:** dos comprobaciones independientes.
Una por imagen: el video escribe la sílaba en pantalla, así que con una grilla de fotogramas se
lee qué bloque es cuál. Otra por sonido: el ataque de cada clip separa las familias de
consonantes (las fricativas S y F arrancan cerca de 9 kHz, la T entre 3 y 8 kHz, las nasales M y
N por debajo de 1,4 kHz) y el brillo de la vocal ordena I > E > A > O > U en los nueve bloques,
que es lo que se espera de las vocales del español.
**Alternativas descartadas:** usar la primera aparición de cada sílaba en vez del estribillo
(viene con "de mamá" pegado atrás y hay que separar a mano cuántos fragmentos trae cada bloque);
grabar las 45 sílabas con voz propia (sigue siendo lo correcto para publicar, pero no para la
demo); partir por detección de silencios y nada más (el ataque de la F y de la S queda al mismo
nivel que la cola de reverberación de la sílaba anterior, así que el corte se comía el comienzo
de una o el final de la otra).
**Lo que falta:** `ca` y `cu`, que el nivel 6 usa y el video no tiene; siguen cayendo a la voz
sintética.

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

### 2026-09-21 — Sílabas presentadas una por una
**Contexto:** el equipo pidió que el nivel 3 presente M, ma, me, mi, mo, mu, S, sa, se, si, so, su
en ese orden (todo lo de una consonante antes de pasar a la otra), el 4 igual con L y N integrando
M y S en las palabras, y el 5 solo palabras y oraciones.
**Decisión:** las sílabas se presentan con la misma tarjeta que la letra nueva (`LETTER_INTRO`
con `targetPhoneme` de dos letras: se ve "M + A" arriba y "MA" grande, se toca, suena, se
repite). El audio de cada sílaba es una grabación humana de la sílaba dicha de corrido, recortada de
un video de sílabas (ver la entrada del 2026-09-22). Las bolsas de letras y sílabas entran completas en cada
sesión y lo que se sortea son las palabras. En el nivel 4 hay dos bolsas de palabras (con L y con
N) para que las de la L queden antes de presentar la N.
**Alternativas descartadas:** tarjetas de reconocimiento por sílaba (SA → elegir SAPO) como
paso previo (piden una imagen por sílaba y no muestran la unión de los dos sonidos); leer la
sílaba con `speechSynthesis` (robótico y distinto por navegador).
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
