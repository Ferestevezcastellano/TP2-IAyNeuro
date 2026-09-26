# CLAUDE.md — Instrucciones globales para Claude Code

Este archivo define cómo Claude Code debe comportarse en todos los proyectos. Está pensado para ser extendido: cada sección nueva se agrega al final sin modificar las existentes, a menos que una corrección lo requiera explícitamente.

---

## 1. Flujo obligatorio antes de escribir código

Antes de producir cualquier línea de código, Claude Code debe seguir este flujo sin excepción:

**Paso 1 — Buscar diagramas en el repo.**
Buscar archivos `.puml` en el directorio del proyecto. Si existen otros formatos de diagrama (imágenes con descripción adjunta, archivos de texto con notación UML, etc.), también leerlos. Si no hay ningún diagrama, indicarlo explícitamente antes de continuar.

**Paso 2 — Interpretar los diagramas.**
Leer cada diagrama e identificar: clases, responsabilidades, relaciones (asociación, composición, herencia, dependencia), flujos de comportamiento, actores y casos de uso. Resolver ambigüedades antes de avanzar: si algo no está claro en el diagrama, preguntar al usuario en lugar de asumir.

**Paso 3 — Presentar un plan de ejecución y esperar aprobación.**
Antes de escribir código, redactar un plan que incluya:
- Qué archivos se van a crear o modificar.
- Qué estructuras de código emergen de los diagramas (clases, interfaces, módulos).
- Qué patrones o principios se proponen aplicar y por qué.
- Si se detecta riesgo de sobreingeniería, señalarlo explícitamente en el plan.
- Si hay inconsistencias entre diagramas o entre un diagrama y el código existente, presentar las opciones y esperar decisión del usuario.

Solo después de que el usuario apruebe el plan, Claude Code puede empezar a escribir código.

---

## 2. Diagramas como contrato de diseño

Los diagramas del repo son la especificación de diseño. Toda decisión de estructura que contradiga un diagrama es una inconsistencia que debe reportarse, no resolverse silenciosamente.

Cuando hay conflicto entre el diagrama y el código existente, o entre dos diagramas, Claude Code presenta las opciones disponibles con sus implicancias y espera que el usuario decida. El diagrama no es automáticamente la fuente de verdad: esa decisión la toma el usuario.

Durante iteraciones, Claude Code debe verificar que el código nuevo no rompa la correspondencia con los diagramas ya interpretados. Si una modificación pedida por el usuario genera una divergencia con el diagrama, señalarlo antes de implementar.

---

## 3. Principios de diseño como guía de fondo

Los siguientes principios operan como criterio permanente durante todo el desarrollo. Claude Code los tiene presentes en cada decisión de diseño, pero no los aplica mecánicamente: los usa para razonar y, cuando corresponde, para fundamentar una sugerencia.

**Seis principios fundamentales:**
- **Descomposición**: dividir el problema en partes independientes y manejables. Módulos para tiempo de diseño; componentes para tiempo de ejecución.
- **Abstracción**: exponer qué hace algo, no cómo lo hace. APIs e interfaces como contratos.
- **Bajo acoplamiento**: minimizar dependencias entre módulos. Alto acoplamiento implica propagación de cambios y dificultad de reuso y testeo.
- **Alta cohesión**: un módulo debe tener una sola razón de ser. Los tipos aceptables son comunicacional, secuencial y funcional.
- **Modularidad**: abstracciones independientes con interfaces bien definidas que habiliten reemplazo, trabajo paralelo y escalabilidad.
- **Encapsulamiento**: ocultar detalles de implementación detrás de interfaces estables. Los consumidores dependen de la interfaz, nunca de la representación interna.

**SOLID:**
- **SRP**: una clase, una razón para cambiar. Detectar God Classes.
- **OCP**: abierto a extensión, cerrado a modificación. Preferir polimorfismo sobre `if/else` acumulativos.
- **LSP**: una subclase debe poder reemplazar a su padre sin romper el comportamiento. No forzar herencia cuando el contrato no se puede cumplir.
- **ISP**: interfaces pequeñas y cohesivas. No obligar a una clase a implementar métodos que no necesita.
- **DIP**: los módulos de alto nivel dependen de abstracciones, no de implementaciones concretas. Inyectar dependencias en lugar de instanciarlas internamente.

**GRASP (a quién asignar cada responsabilidad):**
- **Experto en información**: la responsabilidad va a la clase que tiene la información para cumplirla.
- **Creador**: la clase que contiene o agrega a otra es la que la crea.
- **Controlador**: separar el manejo de eventos del sistema de la UI. El controlador nunca es la interfaz gráfica.
- **Bajo acoplamiento / Alta cohesión**: criterios de evaluación permanente al asignar responsabilidades.
- **Polimorfismo**: cuando el comportamiento varía por tipo, usar polimorfismo en lugar de condicionales.
- **Fabricación pura**: si ninguna clase del dominio puede asumir una responsabilidad sin comprometer el diseño, crear una clase artificial cohesiva (`Repositorio`, `Logger`, `CacheManager`).
- **Indirección**: introducir un intermediario para desacoplar dos elementos que no deben conocerse directamente.
- **Variaciones protegidas**: envolver puntos de cambio en interfaces estables. Lo que varía queda aislado detrás de una abstracción.

**Principios adicionales:**
- **KISS**: si algo puede hacerse de forma más simple, hacerlo más simple. La complejidad debe justificarse, no asumirse.
- **DRY**: no duplicar lógica. Si algo se repite dos veces, extraerlo.
- **YAGNI**: no implementar algo porque "puede ser útil después". Si no hay un requerimiento concreto ahora, no existe.

---

## 4. Patrones de diseño GoF

Claude Code puede identificar oportunidades para aplicar patrones GoF durante el desarrollo. Cuando lo hace, debe:
1. Nombrar el patrón y explicar brevemente por qué aplica al problema concreto.
2. Indicar qué problema resuelve y qué alternativa más simple fue descartada.
3. Esperar aprobación antes de implementarlo.

Claude Code no aplica patrones por defecto ni porque "es la forma correcta". Un patrón se justifica cuando resuelve un problema real y presente, no uno hipotético.

**Patrones disponibles por categoría:**

*Creacionales*: Singleton, Factory Method, Abstract Factory, Builder, Prototype.

*Estructurales*: Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy.

*De comportamiento*: Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor, Interpreter.

*Otros mencionados*: DTO, MVC / MV*, Open Session In View.

---

## 5. Anti-patrones a detectar y reportar

Si Claude Code detecta alguno de los siguientes patrones problemáticos en el código existente o en lo que está a punto de generar, debe señalarlo antes de continuar:

- **God Class**: una clase que acumula lógica de negocio, persistencia, validación y presentación al mismo tiempo.
- **Código espagueti**: dependencias cruzadas sin orden ni estructura clara.
- **Baja cohesión**: elementos sin relación clara agrupados en el mismo módulo.
- **Acoplamiento alto**: módulos que se conocen en detalle unos a otros, dificultando el cambio aislado.
- **Violaciones de LSP**: herencia forzada donde la subclase no puede cumplir el contrato del padre.
- **Fat interfaces**: interfaces que obligan a implementar métodos sin sentido para quien las usa.
- **Dependencias directas sobre implementaciones concretas** en lugar de abstracciones.

---

## 6. Sobreingeniería

Claude Code debe evaluar activamente si lo que está por proponer o implementar es sobreingeniería. Una solución es sobreingeniería cuando:
- Agrega capas de abstracción sin un beneficio concreto para el problema actual.
- Aplica un patrón porque "es la práctica correcta" aunque el problema no lo requiera.
- Anticipa variaciones futuras que no están en ningún requerimiento presente.
- Introduce complejidad estructural que dificulta leer y entender el código sin agregar flexibilidad real.

Cuando Claude Code identifica que su propia propuesta cae en alguno de estos casos, lo dice explícitamente en el plan y propone la alternativa más simple que resuelve el problema.

---

## 7. Arquitectura de software

Claude Code tiene en cuenta los conceptos de arquitectura cuando trabaja en proyectos que involucren decisiones de estructura a nivel de sistema.

**Principios generales:**
- Toda aplicación tiene una arquitectura, aunque no esté documentada. Las decisiones de estructura son decisiones arquitectónicas.
- La arquitectura resuelve atributos de calidad a nivel de sistema: escalabilidad, confiabilidad, performance, mantenibilidad, portabilidad.
- El diseño detallado (algoritmos, estructuras de datos) queda fuera del alcance arquitectónico.

**Viewtypes (vistas para razonar sobre el sistema):**
- *Module Viewtype*: visión estática. Unidades de implementación, sus responsabilidades e interfaces. Subtipos: descomposición, usos, clases.
- *C&C Viewtype*: visión dinámica. Componentes como entidades runtime conectados mediante conectores. La relación es *attachment*: puertos de componentes con roles de conectores.
- *Allocation Viewtype*: relación entre software y entorno. Deployment (software → hardware), implementation (elementos → repositorios), work assignment (módulos → equipos).

**Estilos arquitectónicos reconocidos:**
- *Data Flow*: Batch Sequential, Pipes & Filters.
- *Call Return*: Layered/Multi-tier (layer = capa lógica; tier = capa física), Client-Server, Peer to Peer.
- *Event-Based*: Event Driven Architecture, Publish-Subscribe.
- *Centradas en datos*: Shared Data / Repository.
- *Arquitecturas de referencia*: Clean Architecture, Hexagonal (Ports & Adapters), Onion Architecture.

Cuando un proyecto use un estilo arquitectónico reconocible, Claude Code lo identifica y respeta sus restricciones de composición (por ejemplo: en Layered, una capa solo accede a la inmediatamente inferior; en Pipes & Filters, los filtros solo se comunican a través de pipes).

Las arquitecturas reales suelen ser heterogéneas: combinan estilos. Claude Code lo señala cuando corresponde.

---

## 8. Consistencia durante iteraciones

En cada iteración del código, Claude Code debe:
- Verificar que el código nuevo sea consistente con los diagramas interpretados al inicio.
- Verificar que no se introduzcan violaciones a los principios de diseño establecidos en este archivo.
- Si el usuario pide algo que genera una inconsistencia o una violación, señalarlo antes de implementar y presentar opciones.
- Actualizar su comprensión del sistema si el usuario introduce nuevos diagramas o modifica los existentes.

---

## 9. Extensiones

Esta sección se reserva para nuevas instrucciones que surjan durante el uso. Cada extensión se agrega como una subsección numerada con título descriptivo, sin modificar las secciones anteriores.
