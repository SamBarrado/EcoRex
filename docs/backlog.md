# Backlog de futuras funcionalidades

Ideas y mejoras identificadas pero no priorizadas para un sprint concreto. Sin orden de prioridad implícito salvo que se indique lo contrario — revisar y mover a un plan (`docs/superpowers/plans/`) cuando toque abordarlas.

## Performance y contenido

- **Optimizar peso de imágenes de especies**: actualmente 2+ MB por foto. Revisar compresión/formato (WebP/AVIF), resoluciones servidas según contexto (thumbnail vs reveal a pantalla completa) y si merece la pena un pipeline de optimización en `scripts/generate-species-art.mjs` o en el propio Worker al servir desde R2.
- **Pesos por especie**: introducir un % de aparición distinto por especie dentro del pool activo (hoy el sorteo de especie es uniforme entre `species.is_active`), independiente del sorteo de rareza (que ya es un eje ortogonal, sección 6 del world bible).
- **Fase Eco**: pensar cómo generarla y cómo avanzar hasta ella. Hoy el frontend solo permite llegar a Exceso (vía fusión) — Eco no tiene camino de progresión implementado en la UI aunque el dato/fase existe en el modelo.

## Sistemas de juego

- **Sistema de sonidos**: revisión completa — qué suena en fusión, edición de los propios sonidos, y reorganizar la lógica de audio en componentes reutilizables en vez de estar repartida/duplicada como está ahora (ver nota histórica en `PercibirRitual.tsx` sobre `safePlay` vs llamadas directas a `.play()` en `FusionPage.tsx`).
- **Ediciones**: añadir "edición" como concepto de producto para futuras colecciones tipo sobre (el campo `edition` ya existe en las fichas-spec de `scripts/lote.json`/`species.wave1.json`, pero falta la mecánica de cara al usuario — sobres, desbloqueo, etc.).
- **Operaciones/eventos especiales con freshness automática**: una especie es "rara" porque es nueva y se normaliza sola con el tiempo, sin necesidad de tocar `drop_weight` a mano. Encaja con el modelo de Operaciones ya esbozado en el world bible (sección 7/18.3), donde el mecanismo de distribución de rareza por Operación queda pendiente de diseño.
- **Bucles de contenido/misiones**: expandir más allá de las 3 misiones diarias fijas actuales (`functions/lib/missions.ts`) — es la pieza que más se relaciona con retención/"engancharse", así que merece bloque propio de diseño (misiones semanales, rachas, rotación de objetivos, etc.).

## Colección y progreso

- **Terminología "especies" vs "variantes"**: diferenciar en la UI especie (p. ej. T-Rex, Diplodocus) de variante (cada fase de esa especie — Balance/Exceso/Eco). Hoy "especies descubiertas" en el perfil/home puede confundirse con el conteo de fases.
- **Gráfica de tipos Fractae obtenidos**: visualización en el EcoDex de la distribución de Fractae capturados (a lo Pokédex por tipo).

## Cartas

- **Nuevo diseño de cartas + animación por capas**: investigar cómo estructurar el layout en capas para animarlo de forma más dinámica (qué capas hacen falta — fondo, criatura, marco, texto —, dónde vive cada una y cómo se posiciona el texto). Pendiente de decidir arquitectura antes de tocar `Card.tsx`/`CardScene.tsx`.
- **Thickness visual en la rotación de la carta**: dar sensación de grosor/canto al flip 3D existente (`perspective`/`preserve-3d`/`rotateY`, ver `src/index.css`), sin romper la animación actual.
- **Quitar el ID de carta**: fuera de alcance del MVP inicial, revisar más adelante si el `discovery_code` (`DX-HAB-DSC`) sigue aportando algo de cara al usuario o se puede retirar de la UI.
