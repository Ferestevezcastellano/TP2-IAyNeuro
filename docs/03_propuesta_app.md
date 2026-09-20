# Propuesta app — borrador de contenido por sección

## 1. La apuesta

*(Versión condensada, que es la que va al Word: la sección 1 estaba quedando larga.)*

**Quién aprende**: niños y niñas de primer grado (6-7 años) que ya reciben instrucción fonológica del docente pero no tienen dónde practicarla de forma individual y frecuente. La primera versión apunta a **escuelas de gestión privada**, con aulas de unos 20 alumnos y niveles parejos, para escalar después al resto del sistema: son las que deciden su propio material sin pasar por un ministerio, ya cuentan con dispositivos y conectividad estable —que la verificación por voz necesita— y ofrecen un entorno más limpio para medir si la app efectivamente funciona.

**Por qué hoy fracasan**: PISA 2025 ubica a Argentina en 389 puntos en Lectura frente a 461 de la OCDE, con un 59,6% de los alumnos de 15 años en Nivel 1 o inferior. Esa falla no es un problema de razonamiento adolescente sino la consecuencia terminal de una decodificación que nunca se automatizó en primer grado. La conciencia fonológica es la palanca correcta: es el predictor causal más robusto del éxito alfabetizador en ortografías transparentes como el español (Melby-Lervåg et al., 2012; Defior y Serrano, 2011; Ferroni y D'Ambrosio, 2022). Tres razones explican por qué hoy no se consolida:
1. **Brecha de feedback**: la conciencia fonológica exige escuchar a cada chico pronunciar y corregirlo en el momento. Con 20 a 30 alumnos y clases de 40 minutos, a cada uno le tocan uno o dos minutos de atención individual.
2. **Atajo visual en los materiales analógicos**: en juegos de cartas como /eko/, sin un adulto mediando, los chicos resuelven por color o memoria de la imagen en lugar de procesar el sonido.
3. **Falta de adaptabilidad**: ningún recurso impreso se recalibra cuando un chico se traba, ni deja registro de que eso ocurrió.

**Nombre y qué hace**: la app se llama **AMI**, contracción de "amigo": es el nombre del compañero que el chico elige al empezar (perro, gato, león u oso) y viste con lo que va ganando. A un chico de seis años lo acompaña un personaje, no una marca. Además A, M e I están entre los primeros sonidos que la app enseña (niveles 1, 2 y 3), así que el nombre termina siendo una de las primeras palabras que puede decodificar solo. AMI es una práctica diaria de 10-15 min con estructura de niveles inspirada en Duolingo: cada nivel presenta un sonido nuevo, lo combina con los ya aprendidos para formar sílabas y palabras, y cierra con oraciones cada vez más largas. La secuencia es la del cuadernillo oficial de CABA ("Yo amo aprender — Lengua, 1er grado", 2026), de modo que lo que el chico practica coincide con lo que el docente está dando esa semana. Un nivel se destraba solo cuando el anterior tiene sus 3 estrellas: se avanza por dominio demostrado, no por tiempo transcurrido. Es complemento del aula, no reemplazo.

## 2. Los cuatro pilares
*(ver `02_cuatro_pilares.md` — ya redactado por pilar con: qué dice / feature concreta / cómo se sabe que funciona)*

## 3. Las decisiones de memoria

### 3.1 El costo de entrada
Lista de lo que se le pediría al usuario antes de llegar a la primera cosa útil:
1. Nombre real del alumno
2. Grado/curso
3. Escuela / docente asignado
4. Diagnóstico inicial de nivel (cuestionario de varias preguntas)
5. Consentimiento de datos
6. Permiso de micrófono (necesario para la verificación por audio)

**Qué se elimina/difiere/agrupa y por qué**:
- El (1) nombre real se reemplaza por elección de mascota: no aporta nada al aprendizaje y agrega un paso de escritura que un chico de 6 años recién alfabetizándose no puede resolver solo.
- (2) y (3) se agrupan en un único **código de clase** que el docente entrega una sola vez (ej. escrito en el pizarrón); con ese código la app ya sabe grado, escuela y docente.
- (4) el diagnóstico no se hace como cuestionario aparte: se **incrusta en la primera tarjeta jugable** — la primera ronda funciona a la vez como calibración de nivel.
- (5) el consentimiento de datos se gestiona a nivel institucional (la escuela/dirección lo resuelve una vez con las familias), no dentro del onboarding de cada chico.
- (6) el permiso de micrófono se pide recién en el momento en que hace falta (justo antes del primer ejercicio de verificación por audio), no en el onboarding — así el pedido tiene contexto inmediato y no se percibe como una barrera de entrada.

Justificación: la memoria de trabajo de un chico de 6-7 años tiene capacidad y duración muy bajas (cuello de botella cognitivo); pedirle varios pasos antes de jugar garantiza abandono. En la condición real de uso (aula, tablet compartida, minutos contados de la clase), cada paso de fricción compite directamente con el tiempo de práctica real. Con código de clase + mascota + primera tarjeta como diagnóstico, el chico llega a algo útil en menos de un minuto.

### 3.2 El pico y el final
- **El pico es**: el momento en que el chico arma la palabra completa tocando los botones de letra/sonido en el orden correcto y confirma con su propia voz al micrófono que suena como corresponde — el cierre del circuito ver-tocar-escuchar-decir.
- **El final de una sesión típica es**: la mascota apareciendo grande y contenta junto a las tres estrellas ganadas, más el accesorio nuevo que se desbloquea para vestirla (sin comparar con otros chicos), para generar ganas de volver mañana.
- **Fricción inevitable**: son los niveles **puramente ortográficos**, donde el chico descubre que un sonido que ya domina puede escribirse de más de una forma: la C suave (Nivel 7), el QU (Nivel 13), la V frente a la B (Nivel 16) y, en el extremo, la **H (Nivel 19)**, la única letra sin sonido, donde la verificación por audio directamente no se puede usar. No hay nada nuevo que escuchar, solo una regla que memorizar, y eso es genuinamente menos gratificante. Por eso esa fricción se ubica **después** del pico de la sesión, enmarcada como "desafío" opcional y no bloqueante: el chico ya tuvo su momento de éxito antes de enfrentar lo más árido.

*(Nota: la versión anterior de esta sección también listaba como fricción el nivel de cinco letras F-B-D-P-G. Ya no aplica: al fijar el tope de 15 min por nivel, esa unidad se partió en tres niveles — ver `05_niveles.md`.)*

## 4. Cómo se ve — estructura tipo Duolingo (mecánica central)

La app tiene dos secciones principales desde la pantalla inicial — **Niveles** (los 21 en orden, cada uno con sus 3 estrellas) y **Repaso** (una grilla con los sonidos ya dominados, para volver a cualquiera) — más una zona de **personalización de la mascota**, a la que se entra tocando su cara en el encabezado.

La pantalla de aprendizaje se organiza como una **tarjeta**. En los niveles de sonido aislado es un cuadrado grande con la letra: tocarlo reproduce el sonido y muestra la ilustración de la posición de los labios; debajo, un botón circular de micrófono para que el chico diga el sonido él mismo. En los niveles de armado de palabra, el cuadrado contiene la imagen de la palabra (tocarlo reproduce la palabra completa) y debajo aparecen los botones individuales por letra, que el chico va tocando en orden para completar el casillero.

La mascota —perro, gato, león u oso, elegida en el onboarding— es el hilo visual y afectivo de toda la app: cierra cada intento correcto apareciendo en grande junto a las tres estrellas, y guía suavemente el reintento si algo salió mal (estructura Valoro / Me pregunto / Sugiero del pilar 2, encarnada en un personaje en vez de texto). Todo el texto de la interfaz está en mayúscula, que es la forma en que los chicos de primer grado empiezan a leer y escribir.

**Mockups hechos** (https://claude.ai/artifact/Mptuub3XAioTH5LUb4bjqP):
1. **Carga**: logo AMI + los cuatro animales juntos + barra de progreso.
2. **Onboarding**: los cuatro animales ocupando la pantalla completa en grilla 2x2, sin texto, + campo para el código de clase.
3. **Pantalla inicial**: mascota (que lleva a personalización) + contador de estrellas, selector Niveles/Repaso con íconos, y la lista scrolleable de los 21 niveles; los no alcanzados aparecen con candado.
4. **Sesión — sonido de letra**: el cuadrado con la letra (que es a la vez el botón de sonido) + botón de micrófono.
5. **Sesión — al tocar**: el mismo cuadrado mostrando la posición de labios.
6. **Sesión — armar palabra**: imagen de la palabra + botones por letra + casillero de armado.
7. **Repaso**: consigna con botón de audio + el sonido + grilla de imágenes para elegir.
8. **Personalización**: mascota en grande + accesorios ganados y bloqueados.

**Falta**: una pantalla de **cierre de sesión** como tal. El enunciado pide explícitamente onboarding / aprendizaje / cierre, y hoy la recompensa (mascota + 3 estrellas) es una franja dentro de la pantalla de sesión, no una pantalla propia.

## 5. Cómo sabrían si funciona
**Métrica única**: tasa de retención de fonemas a 2 semanas — porcentaje de fonemas que el chico sigue reconociendo y pronunciando correctamente (verificado por audio) en una tarjeta que reaparece 14 días después de haberlos "dominado" por primera vez, sin haber vuelto a practicarlos explícitamente en el medio.

La elegimos porque mide aprendizaje consolidado y no actividad. Las métricas habituales de una app educativa —niveles completados, días de racha, minutos de uso— describen cuánto se usó el producto, no cuánto quedó en la cabeza del chico: un alumno puede completar todos los niveles y no retener nada. La retención a 2 semanas solo sube si el reciclaje neuronal efectivamente ocurrió.

## 6. La app como instrumento de investigación
- **Pregunta de investigación**: partimos las unidades más cargadas del cuadernillo (f-b-d-p-g, j-k-v-z) en varios niveles de 15 minutos por una razón teórica —el límite de la memoria de trabajo en primer grado—, pero no hay evidencia directa de que eso mejore la retención. ¿Un chico que recibe las cinco letras f-b-d-p-g en tres niveles separados retiene mejor a 2 semanas que uno que las recibe en un solo nivel largo, a igual tiempo total de práctica?
- **Qué habría que agregar**: un grupo de clases con la secuencia partida (los niveles 8, 9 y 10 tal como están diseñados) y otro con la unidad entera en un solo nivel, como viene en el cuadernillo. Mismo tiempo total, distinta fragmentación. Así se distingue el efecto de la fragmentación del efecto del tiempo dedicado.
- **Por qué vale la pena**: es una decisión de diseño que ya tomamos y que afecta a todo el producto; si el experimento la desmiente, hay que rediseñar la estructura de niveles, no un detalle.
- **Qué queda registrado del uso normal** (sin agregar cuestionarios): tiempo de respuesta por botón tocado, orden en que toca las letras, reintentos, qué palabras se saltean o abandonan, hora del día de la sesión, cuántos intentos necesita para las 3 estrellas de cada nivel, y —gracias a la verificación por audio— precisión de pronunciación por fonema y tiempo de vacilación antes de grabar (posible señal temprana de dificultad, sin necesidad de diagnosticar nada).

## 7. Qué le copiaron a quién
- **Duolingo**: la estructura central — tarjeta con palabra + sonido, construcción por partes, verificación mediante audio/voz, y la progresión por niveles que se destraban de a uno. La diferencia está en la unidad de trabajo: donde Duolingo arma oraciones con palabras enteras, AMI arma palabras con fonemas aislados, que es el nivel al que opera la conciencia fonológica.
- **"Yo amo aprender — Lengua, 1er grado"** (CABA, 2026): la secuencia completa de sonidos y letras y el tipo de actividades de cada unidad. Es lo que permite que la app quede alineada con el aula sin que el docente configure nada.
- **/eko/** (Ramírez, Celi y Zabala, 2025): el criterio de selección de palabras ilustrables y la lógica de trabajar sonido inicial y rima como habilidades separadas. No copiamos la mecánica de emparejamiento de cartas, justamente porque es la que permite resolver por memoria visual sin procesar el sonido.
- **MORA** (mencionado en el enunciado del TP): que la app funcione como instrumento de investigación pasivo, sin cuestionarios que interrumpan la experiencia.
- **Diferencia propia**: ni Duolingo ni /eko/ trabajan a nivel de fonema aislado con verificación por voz pensada para chicos que recién empiezan a alfabetizarse, ni se sincronizan con el plan de clase semanal del docente. El cuadernillo de CABA define qué enseñar y cuándo, pero es papel: no da feedback, no se recalibra y no registra nada.
