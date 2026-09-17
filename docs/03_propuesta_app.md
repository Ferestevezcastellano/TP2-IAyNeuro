# Propuesta app — borrador de contenido por sección

## 1. La apuesta

**Quién aprende**: niños y niñas de primer grado (6-7 años) de escuelas argentinas (foco en gestión estatal, aulas de 25-30 alumnos con niveles muy dispares), que ya están recibiendo instrucción fonológica en clase pero necesitan práctica individualizada y frecuente que el docente no puede dar a cada uno en simultáneo.

**Por qué hoy fracasan**:
1. El docente no puede dar feedback fonológico inmediato e individualizado a 25-30 chicos con niveles distintos al mismo tiempo (brecha de feedback).
2. Los materiales analógicos existentes (juegos de cartas como /eko/) permiten "atajos" — el chico resuelve por color o memoria visual de la imagen en vez de procesar el sonido, si no hay un adulto mediando todo el tiempo.
3. Ningún recurso impreso se recalibra en tiempo real: si un chico se traba en un fonema oclusivo (/p/,/t/,/k/), no hay forma de volver automáticamente a fonemas prolongables para reforzar antes de reintentar.

**Qué hace la app**: práctica diaria (10-15 min) de conciencia fonológica para primer grado, con estructura fuertemente inspirada en Duolingo, que se sincroniza con lo que el docente da en clase esa semana y avanza en dificultad (sonidos prolongables → no prolongables → rimas) solo cuando detecta dominio real, no por tiempo transcurrido. Funciona como complemento del aula, no como reemplazo de la instrucción docente.

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
- El (1) nombre real se reemplaza por elección de un avatar: no aporta nada al aprendizaje y agrega un paso de escritura que un chico de 6 años recién alfabetizándose no puede resolver solo.
- (2) y (3) se agrupan en un único **código de clase** que el docente entrega una sola vez (ej. escrito en el pizarrón); con ese código la app ya sabe grado, escuela y docente.
- (4) el diagnóstico no se hace como cuestionario aparte: se **incrusta en la primera tarjeta jugable** — la primera ronda de armar-palabra funciona a la vez como calibración de nivel.
- (5) el consentimiento de datos se gestiona a nivel institucional (la escuela/dirección lo resuelve una vez con las familias), no dentro del onboarding de cada chico.
- (6) el permiso de micrófono se pide recién en el momento en que hace falta (justo antes del primer ejercicio de verificación por audio), no en el onboarding — así el pedido tiene contexto inmediato y no se percibe como una barrera de entrada.

Justificación: la memoria de trabajo de un chico de 6-7 años tiene capacidad y duración muy bajas (cuello de botella cognitivo); pedirle varios pasos antes de jugar garantiza abandono. En la condición real de uso (aula, tablet compartida, minutos contados de la clase), cada paso de fricción compite directamente con el tiempo de práctica real. Con código de clase + avatar + primera tarjeta como diagnóstico, el chico llega a algo útil en menos de un minuto.

### 3.2 El pico y el final
- **El pico es**: el momento en que el chico arma la palabra completa tocando los botones de letra/sonido en el orden correcto y confirma con su propia voz al micrófono que suena como corresponde — el cierre del circuito ver-tocar-escuchar-decir.
- **El final de una sesión típica es**: una pantalla breve que resume qué sonidos dominó hoy (sin comparar con otros chicos) y muestra un adelanto —sin revelarlo del todo— de la próxima palabra, para generar ganas de volver mañana.
- **Fricción inevitable**: los sonidos oclusivos (/p/,/t/,/k/) son objetivamente más difíciles (no se pueden prolongar, tienden a arrastrar una vocal parásita al pronunciarlos solos, lo que además complica el reconocimiento de voz). Se ubica esa fricción **después** del pico de la sesión, enmarcada como "desafío" opcional y no bloqueante, así el chico ya tuvo su momento de éxito antes de enfrentar lo más duro.

## 4. Cómo se ve — estructura tipo Duolingo (mecánica central)

La pantalla de aprendizaje se organiza como una **tarjeta**: arriba la imagen de una palabra (ej. "león") y su sonido completo, reproducible tocando un ícono de parlante. Debajo, la palabra aparece separada en **botones individuales por letra/sonido** (L - E - Ó - N), en orden. El chico va tocando cada botón en secuencia: al tocarlo, suena el fonema correspondiente (aislado, con la prolongación exagerada para los sonidos prolongables), y el botón queda "activado" visualmente.

Una vez tocados todos los botones en orden, la app pide **verificación por audio**: el chico dice la palabra en voz alta al micrófono (o, como alternativa más simple para los más chicos, escucha dos audios y elige cuál corresponde a la palabra). El sistema de reconocimiento de voz valida la pronunciación y dispara el feedback de la mascota.

La mascota es el hilo visual y afectivo de toda la app: aparece en cada tarjeta, reacciona en tiempo real a cada botón tocado, y es quien celebra el armado correcto y guía suavemente el reintento si algo salió mal (estructura Valoro / Me pregunto / Sugiero del pilar 2, encarnada en un personaje en vez de texto).

**Mockup (3 pantallas)**:
1. **Onboarding**: elección de avatar (3-4 opciones) + campo único para el código de clase.
2. **Pantalla de aprendizaje** (la tarjeta descripta arriba): imagen + sonido completo, botones por letra que se tocan en orden, verificación final por audio con la mascota reaccionando.
3. **Cierre de sesión**: resumen visual ("Hoy dominaste: L-, R-") + silueta borrosa de la próxima palabra + botón "volver mañana" (sin racha punitiva si no vuelve).

*(Falta: hacer los bocetos reales en Figma o a mano — acá queda el guion de cada pantalla)*

## 5. Cómo sabrían si funciona
**Métrica única**: tasa de retención de fonemas a 2 semanas — porcentaje de fonemas que el chico sigue reconociendo y pronunciando correctamente (verificado por audio) en una tarjeta que reaparece 14 días después de haberlos "dominado" por primera vez, sin haber vuelto a practicarlos explícitamente en el medio. Mide aprendizaje consolidado, no uso ni finalización de niveles.

## 6. La app como instrumento de investigación
- **Pregunta de investigación**: ¿los sonidos no prolongables (/p/,/t/,/k/) muestran una curva de aprendizaje distinta (más lenta, más sensible al orden de presentación) que los prolongables, y ese patrón se replica igual en escuelas de distinto contexto socioeconómico?
- **Qué habría que agregar**: un grupo de clases que reciba los sonidos en el orden fijo actual (prolongables → oclusivos) y otro grupo con orden aleatorizado, para poder distinguir efecto de la secuencia del efecto propio del sonido.
- **Qué queda registrado del uso normal** (sin agregar cuestionarios): tiempo de respuesta por botón tocado, orden en que toca las letras, reintentos, qué palabras se saltean o abandonan, hora del día de la sesión, racha de días consecutivos, y —gracias a la verificación por audio— precisión de pronunciación por fonema y tiempo de vacilación antes de grabar (posible señal temprana de dificultad, sin necesidad de diagnosticar nada).

## 7. Qué le copiaron a quién
- **Duolingo**: la estructura central de la app — tarjeta con palabra + sonido, construcción por partes (letras/sonidos en vez de palabras enteras como en Duolingo) y verificación mediante audio/voz. Es el modelo de referencia para todo el flujo de la pantalla de aprendizaje.
- **/eko/** (Ramírez, Celi y Zabala, 2025): no se copia la mecánica de emparejamiento de cartas, pero sí el criterio de selección y graduación de palabras por sonido inicial prolongable/no prolongable y por rima, que ya viene validado.
- **MORA** (mencionado en el enunciado del TP): que la app funcione como instrumento de investigación pasivo, sin cuestionarios que interrumpan la experiencia.
- **Diferencia propia**: ni Duolingo ni /eko/ trabajan a nivel de fonema aislado con verificación por voz pensada para chicos que recién empiezan a alfabetizarse, ni se sincronizan con el plan de clase semanal del docente.
