# TP2-IAyNeuro

App de práctica diaria de conciencia fonológica para primer grado, pensada como complemento del aula (no reemplazo del docente) y sincronizada con el avance curricular semanal.

TP2 de la materia **IA y Neurociencias** — UTDT, 2do semestre 2026.

## Contexto del trabajo

- **Consigna**: diseñar una app que enseñe, ancaldada en los 4 pilares del aprendizaje (Dehaene, vía cátedra Rieznik).
- **Entregables**: informe en Word (3-5 carillas, 60% de la nota) + pitch en clase (5 min + 3 de preguntas, 40% de la nota).
- **Fechas**: informe jueves 24/9 23:59 hs · pitch viernes 25/9.
- **Grupo**: 2-3 integrantes (completar nombres).

## Qué e

Práctica diaria de 10-15 min para chicos de primer grado (6-7 años) de escuelas argentinas, con estructura tipo Duolingo: tarjeta con imagen + sonido de una palabra, botones por letra/sonido para armarla en orden, y verificación final por audio con feedback de una mascota. Avanza en dificultad (sonidos prolongables → no prolongables → rimas) solo cuando detecta dominio real.

Resuelve tres problemas que hoy hacen fracasar la alfabetización temprana en aulas argentinas:
1. El docente no puede dar feedback fonológico individualizado a 25-30 chicos a la vez.
2. Los materiales analógicos (ej. juego de cartas /eko/) permiten resolver por atajos visuales sin mediación adulta constante.
3. Ningún material impreso se recalibra en tiempo real ante una dificultad puntual (ej. sonidos oclusivos /p/,/t/,/k/).

## Estructura del repo

| Archivo | Contenido |
|---|---|
| `00_tp_brief.md` | Checklist de la consigna (no va en el informe final) |
| `01_estado_del_arte.md` | Diagnóstico PISA, evidencia sobre conciencia fonológica, intervenciones previas en Argentina, estado del arte de apps de referencia |
| `02_cuatro_pilares.md` | Los 4 pilares del aprendizaje aplicados a Fonito (qué dice el pilar / feature concreta / cómo se mide) |
| `03_propuesta_app.md` | Propuesta completa: la apuesta, decisiones de memoria (costo de entrada, pico y final), mecánica central, métrica de éxito, la app como instrumento de investigación, referencias |
| `04_plan_de_escritura.md` | Mapeo de estos archivos al informe Word final + lista de decisiones pendientes de equipo |

## Estado actual

- [x] Estado del arte y justificación del problema
- [x] Los 4 pilares desarrollados con feature y métrica
- [x] Decisiones de memoria (onboarding, pico/final)
- [x] Mecánica central y guion de las 3 pantallas
- [x] Métrica de éxito e instrumento de investigación
- [ ] Mockups reales (Figma o papel) de las 3 pantallas
- [ ] Definir comprador del pitch (ministerio de educación / dirección de colegio / otro)
- [ ] Diseño visual de la mascota (especie, nombre, gestos)
- [ ] Informe final en Word ensamblado y recortado a 3-5 carillas
- [ ] Slides del pitch (opcionales, máx. 6)

## Punto débil a mencionar en el pitch

Viabilidad del reconocimiento de voz para chicos de 6-7 años (el habla infantil es más difícil de reconocer que la adulta) y su funcionamiento con conectividad débil en escuelas de gestión estatal.

## Referencias principales

- Ramírez, Celi y Zabala (2025) — juego /eko/
- Diuk (2023) — Programa DALE!
- Borzone y Signorini — entrenamiento fonológico estructurado (CABA)
- PISA 2025 (diagnóstico Argentina)
