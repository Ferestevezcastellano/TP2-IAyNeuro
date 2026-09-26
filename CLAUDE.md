# CLAUDE.md — Instrucciones globales para Claude Code

Este archivo define cómo Claude Code debe comportarse en todos los proyectos. Cada sección nueva se agrega al final sin modificar las existentes, a menos que una corrección lo requiera explícitamente.

---

## 1. Flujo antes de escribir código

Primero se clasifica el cambio pedido.

**Cambio menor**: corrige un bug local, toca un solo archivo y no altera clases, interfaces ni relaciones entre módulos. Se implementa directamente y, al terminar, se resume en pocas líneas qué se cambió.

**Cambio estructural**: agrega o modifica clases, interfaces, módulos, dependencias o el modelo de datos, o requiere tocar varios archivos de forma coordinada. Sigue estos pasos sin excepción:

1. **Buscar diagramas.** Buscar archivos `.drawio` en el directorio del proyecto y leer también cualquier otro formato de diagrama que exista (imágenes con descripción adjunta, archivos de texto con notación UML). Los `.drawio` son XML: se leen extrayendo el texto de cada celda (clases, atributos, métodos) y los conectores que las unen, incluyendo el tipo de flecha para distinguir herencia, composición, asociación y dependencia.
2. **Interpretarlos.** Identificar clases, responsabilidades, relaciones (asociación, composición, herencia, dependencia), flujos de comportamiento, actores y casos de uso. Si algo es ambiguo, preguntar en lugar de asumir.
3. **Presentar un plan y esperar aprobación.** El plan indica qué archivos se crean o modifican, qué estructuras de código surgen de los diagramas, qué patrones o principios se proponen y por qué, y señala explícitamente cualquier riesgo de sobreingeniería o inconsistencia entre diagramas y código. Recién con la aprobación del usuario se empieza a escribir código.

Si hay dudas sobre si un cambio es menor o estructural, se lo trata como estructural.

**Si no hay diagramas**, se dice en una línea y el flujo continúa: para un cambio estructural, el plan se arma tomando el código existente como referencia. No se frena el trabajo ni se pide al usuario que cree diagramas.

---

## 2. Diagramas como referencia de diseño

Los diagramas del repo son la referencia de diseño. Cuando el código existente o la modificación pedida los contradice, o cuando dos diagramas se contradicen entre sí, Claude Code no lo resuelve en silencio: presenta las opciones con sus implicancias y espera la decisión del usuario, que es quien define si prevalece el diagrama o el código.

Si el usuario aprueba un cambio que deja desactualizado un `.drawio`, Claude Code lo indica al terminar y propone la actualización del diagrama, sin aplicarla hasta que el usuario lo confirme.

---

## 3. Criterios de diseño

Claude Code razona con principios de diseño (descomposición, abstracción, bajo acoplamiento, alta cohesión, SOLID, GRASP, KISS, DRY, YAGNI) y con estilos arquitectónicos reconocidos cuando la decisión lo amerita. El detalle completo está en el skill `principios-de-diseno`, que se consulta cuando hay una decisión de diseño concreta y no en cada tarea.

Cuando dos principios chocan, se prefiere la opción más simple que resuelva el requerimiento actual.

**Patrones GoF.** Claude Code puede proponer un patrón cuando resuelve un problema real y presente. Al proponerlo debe nombrarlo, explicar por qué aplica, indicar qué alternativa más simple descartó y esperar aprobación antes de implementarlo. Nunca aplica patrones por defecto.

---

## 4. Anti-patrones a reportar

Si Claude Code detecta alguno de estos problemas en el código existente o en lo que está por generar, lo señala antes de continuar: God Class, código espagueti, baja cohesión, acoplamiento alto, violaciones de LSP, interfaces demasiado grandes y dependencias directas sobre implementaciones concretas en lugar de abstracciones.

---

## 5. Sobreingeniería

Una propuesta es sobreingeniería cuando agrega capas de abstracción sin beneficio concreto para el problema actual, aplica un patrón que el problema no requiere, anticipa variaciones que no figuran en ningún requerimiento presente o vuelve el código más difícil de leer sin darle flexibilidad real. Cuando su propia propuesta cae en alguno de estos casos, Claude Code lo dice en el plan y ofrece la alternativa más simple.

---

## 6. Consistencia durante iteraciones

En cada iteración, Claude Code verifica que el código nuevo siga siendo consistente con los diagramas ya interpretados y con estos criterios. Si un pedido del usuario genera una divergencia, la señala antes de implementar y presenta opciones. Si el usuario agrega o modifica diagramas, actualiza su comprensión del sistema.

---

## 7. Extensiones

Sección reservada para nuevas instrucciones que surjan durante el uso. Cada extensión se agrega como subsección numerada con título descriptivo, sin modificar las anteriores.
