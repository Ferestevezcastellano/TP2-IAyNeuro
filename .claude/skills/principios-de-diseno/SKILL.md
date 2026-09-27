---
name: "principios-de-diseno"
description: "Catálogo de principios de diseño (SOLID, GRASP, KISS, DRY, YAGNI), patrones GoF y estilos arquitectónicos. Usar cuando haya que tomar o justificar una decisión concreta de diseño o arquitectura."
---

# Principios de diseño y arquitectura

Se usan como criterio de razonamiento, no como reglas mecánicas. Cuando dos principios chocan, gana la opción más simple que resuelva el requerimiento actual.

## Seis principios fundamentales

- **Descomposición**: dividir el problema en partes independientes y manejables. Módulos para tiempo de diseño; componentes para tiempo de ejecución.
- **Abstracción**: exponer qué hace algo, no cómo lo hace. APIs e interfaces como contratos.
- **Bajo acoplamiento**: minimizar dependencias entre módulos. Alto acoplamiento implica propagación de cambios y dificultad de reuso y testeo.
- **Alta cohesión**: un módulo debe tener una sola razón de ser. Los tipos aceptables son comunicacional, secuencial y funcional.
- **Modularidad**: abstracciones independientes con interfaces bien definidas que habiliten reemplazo, trabajo paralelo y escalabilidad.
- **Encapsulamiento**: ocultar detalles de implementación detrás de interfaces estables. Los consumidores dependen de la interfaz, nunca de la representación interna.

## SOLID

- **SRP**: una clase, una razón para cambiar. Detectar God Classes.
- **OCP**: abierto a extensión, cerrado a modificación. Preferir polimorfismo sobre `if/else` acumulativos.
- **LSP**: una subclase debe poder reemplazar a su padre sin romper el comportamiento. No forzar herencia cuando el contrato no se puede cumplir.
- **ISP**: interfaces pequeñas y cohesivas. No obligar a una clase a implementar métodos que no necesita.
- **DIP**: los módulos de alto nivel dependen de abstracciones, no de implementaciones concretas. Inyectar dependencias en lugar de instanciarlas internamente.

## GRASP (a quién asignar cada responsabilidad)

- **Experto en información**: la responsabilidad va a la clase que tiene la información para cumplirla.
- **Creador**: la clase que contiene o agrega a otra es la que la crea.
- **Controlador**: separar el manejo de eventos del sistema de la UI. El controlador nunca es la interfaz gráfica.
- **Bajo acoplamiento / Alta cohesión**: criterios de evaluación permanente al asignar responsabilidades.
- **Polimorfismo**: cuando el comportamiento varía por tipo, usar polimorfismo en lugar de condicionales.
- **Fabricación pura**: si ninguna clase del dominio puede asumir una responsabilidad sin comprometer el diseño, crear una clase artificial cohesiva (`Repositorio`, `Logger`, `CacheManager`).
- **Indirección**: introducir un intermediario para desacoplar dos elementos que no deben conocerse directamente.
- **Variaciones protegidas**: envolver puntos de cambio en interfaces estables. Lo que varía queda aislado detrás de una abstracción.

## Principios adicionales

- **KISS**: si algo puede hacerse de forma más simple, hacerlo más simple. La complejidad debe justificarse, no asumirse.
- **DRY**: no duplicar lógica. Si algo se repite dos veces, extraerlo.
- **YAGNI**: no implementar algo porque "puede ser útil después". Si no hay un requerimiento concreto ahora, no existe.

## Patrones de diseño GoF

Un patrón se justifica cuando resuelve un problema real y presente, no uno hipotético.

- **Creacionales**: Singleton, Factory Method, Abstract Factory, Builder, Prototype.
- **Estructurales**: Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy.
- **De comportamiento**: Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor, Interpreter.
- **Otros**: DTO, MVC / MV*, Open Session In View.

## Arquitectura de software

Toda aplicación tiene una arquitectura, aunque no esté documentada. La arquitectura resuelve atributos de calidad a nivel de sistema: escalabilidad, confiabilidad, performance, mantenibilidad, portabilidad. El diseño detallado (algoritmos, estructuras de datos) queda fuera de su alcance.

### Viewtypes

- **Module**: visión estática. Unidades de implementación, sus responsabilidades e interfaces. Subtipos: descomposición, usos, clases.
- **C&C**: visión dinámica. Componentes como entidades runtime conectados mediante conectores. La relación es *attachment*: puertos de componentes con roles de conectores.
- **Allocation**: relación entre software y entorno. Deployment (software → hardware), implementation (elementos → repositorios), work assignment (módulos → equipos).

### Estilos arquitectónicos

- **Data Flow**: Batch Sequential, Pipes & Filters.
- **Call Return**: Layered/Multi-tier (layer = capa lógica; tier = capa física), Client-Server, Peer to Peer.
- **Event-Based**: Event Driven Architecture, Publish-Subscribe.
- **Centradas en datos**: Shared Data / Repository.
- **Arquitecturas de referencia**: Clean Architecture, Hexagonal (Ports & Adapters), Onion Architecture.

Cuando un proyecto use un estilo reconocible, respetar sus restricciones de composición (en Layered, una capa solo accede a la inmediatamente inferior; en Pipes & Filters, los filtros solo se comunican a través de pipes). Las arquitecturas reales suelen ser heterogéneas y combinan estilos; señalarlo cuando corresponda.