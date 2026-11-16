# Backlog de futuras funcionalidades

Ideas y mejoras identificadas pero no priorizadas para un sprint concreto. Sin orden de prioridad implícito salvo que se indique lo contrario — revisar y mover a un plan cuando toque abordarlas.

## Performance y contenido

- **Pesos por especie**: introducir un % de aparición distinto por especie dentro del pool activo (hoy el sorteo de especie es uniforme entre `species.is_active`), independiente del sorteo de rareza (que ya es un eje ortogonal, sección 6 del world bible).
- **Fase Eco**: pensar cómo generarla y cómo avanzar hasta ella. Hoy el frontend solo permite llegar a Exceso (vía fusión) — Eco no tiene camino de progresión implementado en la UI aunque el dato/fase existe en el modelo.

## Sistemas de juego

- **Sistema de sonidos**: revisión completa — qué suena en fusión, edición de los propios sonidos, y reorganizar la lógica de audio en componentes reutilizables en vez de estar repartida/duplicada como está ahora (ver nota histórica en `PercibirRitual.tsx` sobre `safePlay` vs llamadas directas a `.play()` en `FusionPage.tsx`).
- **Ediciones**: añadir "edición" como concepto de producto para futuras colecciones tipo sobre (el campo `edition` ya existe en las fichas-spec de `tools/species/lote.json`/`species.wave1.json`, pero falta la mecánica de cara al usuario — sobres, desbloqueo, etc.).
- **Operaciones/eventos especiales con freshness automática**: una especie es "rara" porque es nueva y se normaliza sola con el tiempo, sin necesidad de tocar `drop_weight` a mano. Encaja con el modelo de Operaciones ya esbozado en el world bible (sección 7/18.3), donde el mecanismo de distribución de rareza por Operación queda pendiente de diseño.
- **Bucles de contenido/misiones**: expandir más allá de las 3 misiones diarias fijas actuales (`functions/lib/missions.ts`) — es la pieza que más se relaciona con retención/"engancharse", así que merece bloque propio de diseño (misiones semanales, rachas, rotación de objetivos, etc.).

## Colección y progreso

- **Terminología "especies" vs "variantes"**: diferenciar en la UI especie (p. ej. T-Rex, Diplodocus) de variante (cada fase de esa especie — Balance/Exceso/Eco). Hoy "especies descubiertas" en el perfil/home puede confundirse con el conteo de fases.
- **Gráfica de tipos Fractae obtenidos**: visualización en el EcoDex de la distribución de Fractae capturados (a lo Pokédex por tipo).

## Cartas

- **Pulir el layout definitivo de la carta por capas**: `Card.tsx`/`CardScene.tsx` (v0.7.0) implementan una primera composición funcional — nameplate, ventana de arte, medallón de Fractae, pill de rareza, caja de lore, borde ornamentado y canto con relieve — pero es un punto de partida, no el diseño final. Pendiente de iterar layout una vez haya diseños definitivos: en concreto, el nombre común se trunca con ellipsis en especies con nombres largos (ver `.card-name` en `src/index.css`), y conviene revisar tamaños relativos de cada capa con más nombres reales.

## Seguridad

- **Comprobación explícita de origen en los POST (defensa en profundidad)**: hoy los endpoints POST no validan la cabecera `Origin`. La cookie de sesión ya lleva `HttpOnly; Secure; SameSite=Lax`, que bloquea el envío de la cookie en POST cross-site en navegadores modernos, así que el riesgo real es bajo; la comprobación sería una segunda capa por si en el futuro algún endpoint relaja el `content-type` o la cookie. El `origin.ts` heredado de DinoDiscovery se borró en `e63e1ff` por no usarse, y **tenía hardcodeado el dominio del prototipo** (`dino-discovery-generator.pages.dev`), así que no habría servido tal cual: habría que reescribirlo con `ecorex-project.pages.dev` (y el dominio propio si se añade). Recuperable con `git show e63e1ff^:functions/lib/origin.ts`.
- **Límite de tamaño del cuerpo en los POST**: los endpoints hacen `request.json()` sin límite propio (solo aplica el tope de la plataforma). Los POST de Ecorex tienen cuerpos minúsculos (`phase`, `speciesId`, credenciales), así que un límite bajo (p. ej. 4 KB) es seguro y evita parsear cuerpos enormes. Recuperable con `git show e63e1ff^:functions/lib/requestBody.ts` (`readJsonBody`), aplicándolo primero a `auth/*`, `discover` y `fuse`.

## Por ordenar y determinar alcance y elementos afectados

- **pulir grid ecodex (sigue sin verse el lore antes de ampliar carta)
- **habilitar modo album con ilusttraciones (lo que era al principio el ecodex. en lugar de mostrar carta, se muestra ficha del dino y ilustracion más grande y al natural, posiblemente ilustracion alternativa.)
- **decidir que se hace con modo eco y si las fusiones aplican más allá de fase balance.
- **definir scope de modo amigos. QR con codigo, regalos? etc.