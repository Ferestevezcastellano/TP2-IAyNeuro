# AMI

App de práctica diaria de conciencia fonológica para primer grado, pensada como complemento del aula (no reemplazo del docente) y sincronizada con el avance curricular semanal.

> **Nombre**: AMI (contracción de "amigo"). Está pensado como el nombre del compañero/mascota que el chico elige y personaliza, no como marca separada de la app.

Mockups: [https://claude.ai/artifact/Mptuub3XAioTH5LUb4bjqP](https://www.figma.com/design/dHf5AHIJGYiJugKL5HfhAu/AMI-%E2%80%94-Mockups?node-id=0-1&t=pbtHTYetMBs0jjkq-1)

TP2 de la materia **IA y Neurociencias** — UTDT, 2do semestre 2026.

## Contexto del trabajo

- **Consigna**: diseñar una app que enseñe, ancaldada en los 4 pilares del aprendizaje (Dehaene, vía cátedra Rieznik).
- **Entregables**: informe en Word (3-5 carillas, 60% de la nota) + pitch en clase (5 min + 3 de preguntas, 40% de la nota).
- **Fechas**: informe jueves 24/9 23:59 hs · pitch viernes 25/9.
- **Grupo**: 3-5 integrantes (completar nombres).

## Qué es la app

Práctica diaria de 10-15 min para chicos de primer grado (6-7 años) de escuelas argentinas, con estructura tipo Duolingo: dos secciones principales —**Sesiones** (niveles con progresión de dificultad) y **Repaso** (sonidos ya vistos)— más una zona de **personalización de la mascota**. Cada sesión es una tarjeta con imagen + sonido de una palabra, botones por letra/sonido para armarla en orden, y verificación final por audio con feedback de la mascota. La progresión de niveles sigue el orden vocales → M, P, S (combinando con vocales para armar sílabas y palabras como "mapa") → resto de las letras, de forma creciente, y avanza solo cuando detecta dominio real, no por tiempo transcurrido.

Al completar una sesión el chico gana 3 estrellas y un accesorio para vestir a su mascota (león, oso polar, rinoceronte o koala, elegido en el onboarding); niveles nuevos los habilita la maestra a medida que avanza con la clase.

Resuelve tres problemas que hoy hacen fracasar la alfabetización temprana en aulas argentinas:
1. El docente no puede dar feedback fonológico individualizado a 25-30 chicos a la vez.
2. Los materiales analógicos (ej. juego de cartas /eko/) permiten resolver por atajos visuales sin mediación adulta constante.
3. Ningún material impreso se recalibra en tiempo real ante una dificultad puntual (ej. sonidos oclusivos /p/,/t/,/k/).

## Correrlo

```bash
cd backend && npm install && npm run start:dev    # API en http://localhost:3000
cd frontend && npm install && npm run dev         # app en http://localhost:5173
```

Códigos de clase cargados: `PRIMERO-A` y `PRIMERO-B`. No hace falta base de datos; el estado vive en memoria. Guía paso a paso y ajustes pendientes en [`COMO_CORRERLO.md`](COMO_CORRERLO.md).

## Estructura del repo

| Archivo | Contenido |
|---|---|
| `backend/` | API en NestJS: niveles, sesiones, dominio, voz, panel docente (ver su README) |
| `frontend/` | La app, replicando los mockups de Figma (ver su README) |
| `00_tp_brief.md` | Checklist de la consigna (no va en el informe final) |
| `01_estado_del_arte.md` | Diagnóstico PISA, evidencia sobre conciencia fonológica, intervenciones previas en Argentina, estado del arte de apps de referencia |
| `02_cuatro_pilares.md` | Los 4 pilares del aprendizaje aplicados a la app (qué dice el pilar / feature concreta / cómo se mide) |
| `03_propuesta_app.md` | Propuesta completa: la apuesta, decisiones de memoria (costo de entrada, pico y final), mecánica central, métrica de éxito, la app como instrumento de investigación, referencias |
| `04_plan_de_escritura.md` | Mapeo de estos archivos al informe Word final + lista de decisiones pendientes de equipo |

## Estado actual

- [x] Estado del arte y justificación del problema
- [x] Los 4 pilares desarrollados con feature y métrica
- [x] Decisiones de memoria (onboarding, pico/final)
- [x] Mecánica central y guion de las 3 pantallas
- [x] Métrica de éxito e instrumento de investigación
- [x] Mockups interactivos de 7 pantallas (carga, onboarding, inicio, sesión x2 variantes, personalización, repaso) — [ver en Claude](https://claude.ai/artifact/Mptuub3XAioTH5LUb4bjqP)
- [x] Comprador del pitch (tentativo): dirección de colegio — arranca por escuelas que ya adoptan este enfoque pedagógico como primera adopción; puede revisarse
- [x] Nombre de la app: AMI (mascota/compañero personalizable — león, oso polar, rinoceronte o koala, los de los mockups)
- [x] Backend funcionando (niveles 1 a 6 cargados) y frontend con las 7 pantallas de los mockups, niveles 1 a 3 jugables
- [ ] Diseño visual definitivo de la mascota (por ahora hay 4 referencias de estilo, falta cerrar arte final y gestos de feedback)
- [ ] Informe final en Word ensamblado y recortado a 3-5 carillas
- [ ] Slides del pitch (opcionales, máx. 6)

## Comprador del pitch

Dirección de colegio (tentativo, sujeto a revisión). Como primera versión de estrategia de entrada, apuntamos a escuelas que ya adoptan este enfoque pedagógico —fónico-sintético, con conciencia fonológica explícita— en vez de partir por el universo completo de escuelas de gestión estatal: son las que van a ver valor inmediato en la app sin necesitar primero convencerlas del enfoque.

## Punto débil a mencionar en el pitch

Viabilidad del reconocimiento de voz para chicos de 6-7 años (el habla infantil es más difícil de reconocer que la adulta) y su funcionamiento con conectividad débil en escuelas de gestión estatal.

## Referencias principales

- Ramírez, Celi y Zabala (2025) — juego /eko/
- Diuk (2023) — Programa DALE!
- Borzone y Signorini — entrenamiento fonológico estructurado (CABA)
- PISA 2025 (diagnóstico Argentina)
