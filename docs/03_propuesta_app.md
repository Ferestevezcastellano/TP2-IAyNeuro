# Propuesta app — borrador de contenido por sección

## 1. La apuesta

**Quién aprende**: niños y niñas de primer grado (6-7 años) de escuelas argentinas (foco en gestión estatal, aulas de 25-30 alumnos con niveles muy dispares), que ya están recibiendo instrucción fonológica en clase pero necesitan práctica individualizada y frecuente que el docente no puede dar a cada uno en simultáneo.

**Por qué hoy fracasan**:
1. El docente no puede dar feedback fonológico inmediato e individualizado a 25-30 chicos con niveles distintos al mismo tiempo (brecha de feedback).
2. Los materiales analógicos existentes (juegos de cartas como /eko/) permiten "atajos" — el chico resuelve por color o memoria visual de la imagen en vez de procesar el sonido, si no hay un adulto mediando todo el tiempo.
3. Ningún recurso impreso se recalibra en tiempo real: si un chico se traba con un sonido, no hay forma de volver automáticamente a los sonidos anteriores ya dominados para reforzar antes de reintentar.

**Qué hace la app**: práctica diaria (10-15 min) de conciencia fonológica para primer grado, con estructura fuertemente inspirada en Duolingo, que sigue el mismo orden de sonidos y letras que el cuadernillo oficial de CABA ("Yo amo aprender — Lengua, 1er grado") y por lo tanto queda sincronizada con lo que el docente da en clase esa semana. Cada nivel se destraba solo cuando el anterior está completo con sus 3 estrellas, es decir cuando hay dominio demostrado, no por tiempo transcurrido. Funciona como complemento del aula, no como reemplazo de la instrucción docente.

## 2. Los cuatro pilares
*(ver `02_cuatro_pilares.md` — ya redactado por pilar con: qué dice / feature concreta / cómo se sabe que funciona; copiar directo a esta sección del Word, ajustando redacción)*

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
- El (1) nombre real se reemplaza por elección de una mascota: no aporta nada al aprendizaje y agrega un paso de escritura que un chico de 6 años recién alfabetizándose no puede resolver solo.
- (2) y (3) se agrupan en un único **código de clase** que el docente entrega una sola vez (ej. escrito en el pizarrón); con ese código la app ya sabe grado, escuela y docente.
- (4) el diagnóstico no se hace como cuestionario aparte: se **incrusta en la primera tarjeta jugable** — la primera ronda funciona a la vez como calibración de nivel.
- (5) el consentimiento de datos se gestiona a nivel institucional (la escuela/dirección lo resuelve una vez con las familias), no dentro del onboarding de cada chico.
- (6) el permiso de micrófono se pide recién en el momento en que hace falta (justo antes del primer ejercicio de verificación por audio), no en el onboarding — así el pedido tiene contexto inmediato y no se percibe como una barrera de entrada.

Justificación: la memoria de trabajo de un chico de 6-7 años tiene capacidad y duración muy bajas (cuello de botella cognitivo); pedirle varios pasos antes de jugar garantiza abandono. En la condición real de uso (aula, tablet compartida, minutos contados de la clase), cada paso de fricción compite directamente con el tiempo de práctica real. Con código de clase + mascota + primera tarjeta como diagnóstico, el chico llega a algo útil en menos de un minuto.

### 3.2 El pico y el final
- **El pico es**: el momento en que el chico arma la palabra completa tocando los botones de letra/sonido en el orden correcto y confirma con su propia voz al micrófono que suena como corresponde — el cierre del circuito ver-tocar-escuchar-decir.
- **El final de una sesión típica es**: la mascota apareciendo grande y contenta junto a las tres estrellas ganadas, más el accesorio nuevo que se desbloquea para vestirla (sin comparar con otros chicos), para generar ganas de volver mañana.
- **Fricción inevitable**: hay niveles que son objetivamente más duros y no se pueden suavizar sin romper la secuencia curricular. Son de dos tipos: el **Nivel 8** (F, B, D, P, G), que introduce cinco letras de una sola vez porque el cuadernillo las agrupa así; y los niveles **puramente ortográficos** (C suave, QU, V/B, H), donde el chico tiene que aprender que un sonido que ya domina se puede escribir de dos formas distintas — no hay nada nuevo que escuchar, solo una regla que memorizar. En ambos casos la fricción se ubica **después** del pico de la sesión, enmarcada como "desafío" opcional y no bloqueante, así el chico ya tuvo su momento de éxito antes de enfrentar lo más duro. El caso extremo es el Nivel 16 (H), la única letra sin sonido, donde la verificación por audio directamente no se puede usar.

## 4. Cómo se ve — estructura tipo Duolingo (mecánica central)

La app tiene dos secciones principales desde la pantalla inicial — **Sesiones** (los niveles en orden) y **Repaso** (una grilla con los sonidos ya dominados, para volver a cualquiera) — más una zona de **personalización de la mascota**, a la que se entra tocando su cara en el encabezado.

La pantalla de aprendizaje se organiza como una **tarjeta**. En los niveles de sonido aislado, es un cuadrado grande con la letra: tocarlo reproduce el sonido y muestra la ilustración de la posición de los labios; debajo, un botón circular de micrófono para que el chico diga el sonido él mismo. En los niveles de armado de palabra, el cuadrado contiene la imagen de la palabra (tocarlo reproduce la palabra completa) y debajo aparecen los botones individuales por letra, que el chico va tocando en orden para completar el casillero.

La mascota —perro, gato, león u oso, elegida en el onboarding— es el hilo visual y afectivo de toda la app: cierra cada intento correcto apareciendo en grande junto a las tres estrellas, y guía suavemente el reintento si algo salió mal (estructura Valoro / Me pregunto / Sugiero del pilar 2, encarnada en un personaje en vez de texto). Todo el texto de la interfaz está en mayúscula, que es la forma en que los chicos de primer grado empiezan a leer y escribir.

**Mockup (pantallas)**:
1. **Carga**: logo AMI + los cuatro animales juntos + barra de progreso.
2. **Onboarding**: los cuatro animales ocupando la pantalla completa en grilla 2x2, sin texto, + campo único para el código de clase.
3. **Pantalla inicial**: mascota (que lleva a personalización) + contador de estrellas, selector Sesiones/Repaso con íconos, y la lista de niveles con su progreso; los niveles siguientes aparecen bloqueados.
4. **Sesión — sonido de letra**: el cuadrado con la letra (que es a la vez el botón de sonido y de posición de labios) + botón de micrófono.
5. **Sesión — armar palabra**: imagen de la palabra + botones por letra + casillero de armado.
6. **Repaso**: consigna con botón de audio + el sonido + grilla de imágenes para elegir.
7. **Personalización**: mascota en grande + accesorios ganados y bloqueados.

## 5. Cómo sabrían si funciona
**Métrica única**: tasa de retención de fonemas a 2 semanas — porcentaje de fonemas que el chico sigue reconociendo y pronunciando correctamente (verificado por audio) en una tarjeta que reaparece 14 días después de haberlos "dominado" por primera vez, sin haber vuelto a practicarlos explícitamente en el medio. Mide aprendizaje consolidado, no uso ni finalización de niveles.

## 6. La app como instrumento de investigación
- **Pregunta de investigación**: los niveles del cuadernillo no tienen todos la misma carga — el Nivel 8 introduce cinco letras de una sola vez mientras otros introducen una o dos. ¿Esa diferencia de carga produce peor retención a 2 semanas, a igual tiempo total de práctica? Y si la produce, ¿partir ese nivel en varias sesiones más chicas la compensa?
- **Qué habría que agregar**: un grupo de clases que reciba el Nivel 8 tal como viene en el cuadernillo (las cinco letras juntas) y otro que lo reciba partido en tres sesiones separadas, con el mismo tiempo total de práctica. Así se distingue el efecto de la cantidad de contenido del efecto del tiempo dedicado.
- **Qué queda registrado del uso normal** (sin agregar cuestionarios): tiempo de respuesta por botón tocado, orden en que toca las letras, reintentos, qué palabras se saltean o abandonan, hora del día de la sesión, cuántas sesiones necesita para las 3 estrellas de cada nivel, y —gracias a la verificación por audio— precisión de pronunciación por fonema y tiempo de vacilación antes de grabar (posible señal temprana de dificultad, sin necesidad de diagnosticar nada).

## 7. Qué le copiaron a quién
- **Duolingo**: la estructura central de la app — tarjeta con palabra + sonido, construcción por partes (letras/sonidos en vez de palabras enteras como en Duolingo), verificación mediante audio/voz, y la progresión por niveles que se destraban de a uno. Es el modelo de referencia para todo el flujo de la pantalla de aprendizaje.
- **"Yo amo aprender — Lengua, 1er grado"** (Ministerio de Educación de CABA, 2026): la secuencia completa de sonidos y letras, y el tipo de actividades de conciencia fonológica de cada unidad (sonido inicial, sonido intermedio, asociación fonema-grafema). Es lo que permite que la app quede alineada con el aula sin que el docente tenga que configurar nada.
- **/eko/** (Ramírez, Celi y Zabala, 2025): el criterio de selección de palabras ilustrables y la lógica de trabajar sonido inicial y rima como habilidades separadas.
- **MORA** (mencionado en el enunciado del TP): que la app funcione como instrumento de investigación pasivo, sin cuestionarios que interrumpan la experiencia.
- **Diferencia propia**: ni Duolingo ni /eko/ trabajan a nivel de fonema aislado con verificación por voz pensada para chicos que recién empiezan a alfabetizarse, ni se sincronizan con el plan de clase semanal del docente. El cuadernillo de CABA define qué enseñar y cuándo, pero es papel: no da feedback, no se recalibra y no registra nada.
