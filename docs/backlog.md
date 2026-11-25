# Backlog de Ecorex

Documento único de producto: análisis de retención, quick wins con estado, ideas futuras y decisiones abiertas. Complementa a [simplificacion-y-pendientes.md](simplificacion-y-pendientes.md) (deuda técnica y limpieza). Última revisión: 2026-11-18.

Leyenda de estado: ✅ hecho · 🚧 en curso · ⏳ pendiente · ❓ necesita decisión · ⛔ descartado.
Esfuerzo (estimación con tests): **S** < 2 h · **M** medio día · **L** 1–2 días.

---

## 1. Diagnóstico de retención (2026-11-18)

Análisis hecho leyendo el código (no la app en el navegador). Datos de uso de referencia: 7 usuarios y 262 descubrimientos a 2026-11-17.

1. **El contenido se agota en 1–2 semanas.** Solo hay 6 especies activas y la fase Eco no se podía conseguir desde la UI: 12 cartas alcanzables. *(Eco ya es obtenible desde el 2026-11-18, ver #4: son 18 registros.)* Unas 15 percepciones para ver las 6 de Balance y ~40 para fusionarlas todas; con 3 de energía cada 12 h, el catálogo se completa en 1–2 semanas.
2. **La economía de XP se rompe al acabarse el contenido.** El bonus de especie completa (+200 XP) exige las 3 fases e incluye Eco (inalcanzable). La misión "carta nueva" solo se cumple con una carta nueva en un hueco nuevo, así que casi nunca se completa cuando ya tienes los 6 Balance, y con ella se cae el bonus diario (+30). El XP diario baja de ~85 a ~15–35. Nivel 15 = 2.619 XP; nivel 50 = 17.150.
3. **Una sesión dura un minuto.** 3 de energía → 3 percepciones y se acaba la app. Sin racha, sin objetivo a medio plazo.
4. **Promesas vacías y huecos.** Tres tarjetas bloqueadas en Inicio (Eco, Álbum, Amigos) que no llevan a ningún sitio; sin onboarding (el lore solo vive dentro de las cartas); sin compartir; tablas de regalos sin endpoints; sin analítica.

Conclusión: los quick wins amortiguan, pero la palanca de fondo es **más contenido** (una oleada de ~6 especies = otras 2 semanas; un calendario fijo tipo "especie nueva cada viernes" es en sí un hábito semanal) y **resolver qué es Eco**.

---

## 2. Quick wins

| # | Mejora | Qué cambia | Esfuerzo | Impacto | Estado |
|---|---|---|---|---|---|
| 1 | **Arreglar la economía de misiones** | "Carta nueva" pasa a "Consigue 1 carta" (cualquiera). Todas las misiones deben ser completables siempre. | S–M | Alto | ✅ 2026-11-18 (variante: ver nota) |
| 2 | **Racha de días con premio** | Contador de días seguidos en Inicio; premio de XP + energía recargada a los 3 días, a los 7 y cada 7 después. Se deriva de `daily_missions` (sin migración); el cobro es idempotente vía la bandeja de notificaciones. | M | Alto | ✅ 2026-11-18 |
| 3 | **Subir de nivel rellena la energía** | En `recordDiscovery`, si `leveledUp`, energía al máximo; `LevelUpScreen` lo anuncia. | S | Alto | ✅ 2026-11-18 |
| 4 | **Eco como drop raro** | 5 % de las percepciones salen en fase Eco, decidido por el servidor y solo de especies cuyo Balance ya tienes. Desbloquea 18 registros y el bonus de +200 XP. El tile "Eco · Próximamente" de Inicio se retira (Eco ya no es un modo). | M | Muy alto | ✅ 2026-11-18 |
| 5 | **Onboarding de 3 pantallas** | 3 slides de lore al entrar por primera vez (solo cuentas sin cartas), **sin botón de saltar** (solo "Siguiente"), terminando en "Percibir mi primera carta". La pista del gesto ya existía en el propio ritual. Textos a revisar por ti. | M | Alto | ✅ 2026-11-18 |
| 6 | **"Próximamente" en vez de candados muertos** | Eco/Álbum/Amigos con etiqueta y, si se puede, "Avísame" por push. | S | Medio | ✅ 2026-11-18 (sin "Avísame": queda para cuando haya algo que avisar) |
| 7 | **Progreso de fusión visible** | Barra "Próxima fusión: Rex de Fuego 3/5" en Inicio y lista "en progreso" en el Altar. `/api/fuse/eligible` añade `progress` y `threshold`. Falta mostrarlo en las baldosas del EcoDex. | S–M | Alto | ✅ 2026-11-18 (EcoDex pendiente) |
| 8 | **Analítica mínima** | Cloudflare Web Analytics + `scripts/retention.sql` (D1/D7/D30 desde `discoveries`; se ejecuta a mano contra remoto). Revisar `/privacidad`. | S | Indirecto (alto) | ✅ 2026-11-18: `scripts/retention.sql` + `npm run db:retention[:remote]`. Pendiente tuyo: activar Web Analytics en el panel de Pages |
| 9 | **Reinicio diario en hora de Madrid** | `todayUTC()` → `todayInSpain()` (`Europe/Madrid`). | S | Medio | ✅ 2026-11-18 |
| 10 | **Compartir carta** | Botón en visor/revelado: `navigator.share` con fallback a descargar imagen. Lo delicado es renderizar la carta 3D a imagen (ver trampas en CLAUDE.md). | M–L | Alto (adquisición) | ⏳ |
| 11 | **Pity de rareza** | Contador de percepciones sin Rara+; a las ~15 la siguiente sale mínimo Rara. Requiere migración. | M | Medio–alto | ⏳ |
| 12 | **Más motivos de push** | "Tu racha se acaba hoy", "Carta lista para fusionar"; textos con voz del lore; tope de 1–2 al día. Se despliega aparte (`workers/push-cron`). | M | Alto | ⏳ |
| 13 | **Gráfica de Fractae y "Nuevo" en el EcoDex** | Rueda de los 8 Fractae obtenidos + marca "NUEVO" en cartas sin ver. | M | Medio | ⏳ |
| 14 | **Ranking / "Explorador del día"** | Top 10 simple por nivel o especies. Aporta poco con pocos usuarios. | M | Bajo ahora | ⏳ (cuando haya más usuarios) |

**Nota sobre #1 (variante aplicada):** al implementarlo apareció que la misión de **fusión** tampoco se puede cumplir a diario (5 duplicados ≈ 1,7 días de energía) y el bonus la exigía, así que el bonus era inalcanzable incluso al empezar. Resultado: `percibir` = 1 carta (10 XP), `coleccionista` = 3 cartas cualesquiera, nuevas o repetidas, fusión incluida (25 XP), bonus +30 XP por esas dos; `fusion` pasa a **extra opcional** (+20 XP, fuera del bonus). Techo diario sin fusión: 65 XP. Todo ajustable en `MISSION_DEFS`/`BONUS_SLUGS` ([missions.ts](../functions/lib/missions.ts)). Si más adelante se quiere la 4ª misión rotatoria, es una extensión de esto.

**Notas del #4 (Eco) y de la terminología (2026-11-18):**
- **Eco:** decisiones de producto cerradas: sin minijuego para llegar a Eco, drop raro de Percibir (5 %), solo de especies cuyo Balance ya tienes, rareza sorteada aparte, Eco repetido sin uso. Medido en 1000 percepciones reales en local: 4,2 % de Eco, 0 Eco de una especie sin Balance previo, y el perfil cuadra con el SQL a mano. Un efecto lateral importante: antes el servidor aceptaba `phase: "eco"` del cliente; ahora se rechaza (habría sido una trampa para conseguir Eco garantizado).
- **Terminología:** vocabulario especie / fase / registro / carta / repetida (ver world bible §11 y CLAUDE.md). Arreglado además que "Duplicados" del Perfil contaba mal (capturas − especies; subía al fusionar) y que el denominador incluía los huecos "???" (Inicio no pasaba del 75 %). Ahora Inicio y Perfil muestran "Especies 6/6" y "Registros 12/18"; el EcoDex, "Registros".
- **Fusión:** el texto pasa a "cartas Balance de la misma especie" (5), no "duplicados", para no chocar con el nuevo vocabulario.

**Notas de la tanda 2:**
- **Racha:** cuenta días naturales (hora de Madrid) con cualquier actividad; si ayer jugaste y hoy aún no, sigue viva ("¡Juega hoy para no perderla!"). Premios: día 3 = 20 XP, día 7 = 50 XP, cada 7 días = 50 XP, y en todos la energía se recarga. Rachas y premios son constantes en [streak.ts](../functions/lib/streak.ts). Las rachas de usuarios existentes empiezan a contar desde el historial de `daily_missions`.
- **Service worker:** al verificar en navegador real apareció que `sw.ts` no hacía `skipWaiting()`, así que tras un deploy los jugadores seguían con el build anterior hasta cerrar todas las pestañas. Corregido (ver CLAUDE.md); sin esto ningún quick win llegaba rápido a producción.

**Tandas:** 1 = #3, #9, #6, #8, #1 (barato y arregla lo roto; **hecha 2026-11-18**, sin desplegar) → 2 = #2, #7, #5 (crea el hábito; **hecha 2026-11-18**, sin desplegar) → decidir #4 y generar la siguiente oleada → resto cuando haya tracción.

**Extra sin ubicar:** "reciclar" duplicados sobrantes (más allá de las 5 de fusión) por XP o energía; hoy no sirven para nada y hace falta diseño.

---

## 3. Contenido

- **Eco de las próximas oleadas:** cada especie nueva necesita sus 3 artes (Balance, Exceso, Eco) y su ancla Eco con lore para que el drop pueda sacarla.
- **Oleada siguiente de especies.** Solo 6 de 40 en remoto están activas; `tools/species/archive/lote.json` (archivado) tiene 55 fichas-spec históricas; las nuevas nacen en Admin. Pipeline: `species:art` → `convert-species-art-to-webp` → `db:sync-species` → `db:seed:remote`.
- **Ediciones**: añadir "edición" como concepto de producto para colecciones tipo sobre (el campo `edition` ya existe en las fichas-spec, falta la mecánica de cara al usuario: sobres, desbloqueo, etc.).
- **Operaciones/eventos con freshness automática**: una especie es "rara" porque es nueva y se normaliza sola con el tiempo, sin tocar `drop_weight` a mano. Encaja con el modelo de Operaciones del world bible (§7/18.3); el reparto de rareza por Operación sigue sin diseñar.
- **Pesos por especie**: % de aparición distinto por especie dentro del pool activo (hoy el sorteo es uniforme entre `species.is_active`), independiente del sorteo de rareza.
- **Misiones más allá de las 3 fijas**: semanales, rotación de objetivos, rachas (ver #1, #2). Merece bloque propio de diseño.
- **Admin · pantalla de auditoría (opcional, baja prioridad).** `admin_audit_log` ya guarda cada acción (crear, generar, aprobar, promover, activar…), pero no hay pantalla para verla: se consulta con `wrangler d1 execute`. Tabla filtrable por acción y fecha; solo aporta si algún día hay más de un editor. ⏳

## 4. Decisiones (abiertas y cerradas)

- ✅ **Fase Eco** (decidido 2026-11-18): drop raro de Percibir, ver #4. El minijuego de Grietas deja de ser la vía a Eco (el minijuego en sí sigue pospuesto, sin dependencias).
- ✅ **Fusiones más allá de Balance** (decidido 2026-11-18): no. Eco no se fusiona y un Eco repetido no tiene uso.
- ❓ **Modo Amigos**: alcance (código QR, regalos, invitación con premio para ambos…). Las tablas `gifts` ya existen; no hay endpoints.
- ❓ **Modo Álbum** con ilustraciones: lo que era el EcoDex al principio; en vez de carta, ficha del dino con ilustración grande y al natural, posiblemente alternativa.
- ✅ **Terminología** (decidido 2026-11-18): especie / fase / registro / carta / repetida; no se usa "variante". Aplicado a Inicio, Perfil y EcoDex.

## 5. Sistemas y UX

- **✅ Diseño de interfaz ELEGIDO (2026-11-18) — pendiente de aplicar a la app.** Combinación (ábrela en la maqueta con la URL): `design/ux/mockup-interfaz-2026-11.html#trans-2,nav-1,xp-2,lvl-2,rew-4,fab-1,ntf-1,btn-1,home-1,auth-3,onb-1,coach-2,bg-4`

  | Eje | Elegida |
  |---|---|
  | Transición entre pantallas | B · Deslizamiento direccional |
  | Barra inferior | A · Píldora deslizante |
  | XP | B · Orbes al nivel (requiere un indicador de nivel siempre visible) |
  | Subida de nivel | B · Onda de fractura |
  | Logros y recompensas | D · Mixta (banner para lo pequeño, medalla para especie nueva, Eco y especie completa) |
  | Botón de notificaciones | A · Campana en la cabecera (desaparece el flotante; oculta en Percibir) |
  | Llegada de notificaciones | A · Aviso que se pliega en la campana |
  | Botones | A · Foil |
  | Inicio | A · Panel de misión |
  | Onboarding · entrada | C · Carnet de explorador |
  | Onboarding · bienvenida | A · Cuento animado (sin «Saltar») |
  | Onboarding · primeros pasos | B · Checklist con premio |
  | Fondo | D · Atmósfera viva (según pantalla, energía y eventos; tinte por Fractae) |

  **Estado: fase 1 aplicada el 2026-11-18 (sin commit/despliegue todavía): botones Foil, píldora de la barra, fondo «atmósfera viva» global, transición deslizante entre rutas (con migración a enrutador de datos) e indicador de nivel. Fase 2 hecha (2026-11-25, sin commit): orbes de XP, onda de fractura, cola de logros (banner/medalla) y campana en cabecera con aviso que se pliega. Fases 3–4 pendientes.**

  **Fases propuestas** (de menos a más riesgo; cada una se puede desplegar sola): **1 · Fundamentos** (botones Foil, píldora de la barra, fondo «atmósfera viva» como capa global con opacidad base para las transiciones, transición deslizante entre rutas, indicador de nivel superior) → **2 · Feedback** (orbes de XP, onda de fractura, cola de logros con banner/medalla, campana en cabecera + aviso que se pliega) → **3 · Inicio** (panel de misión) → **4 · Onboarding** (carnet, cuento animado, checklist). Todo CSS/Web Animations: no hay librerías de animación en el proyecto y no hace falta añadir ninguna.

  **Restricciones detectadas en el código** (a resolver al construir): (a) el registro no recibe avatar → tras registrarse hay que llamar a `PATCH /api/auth/avatar` (sin cambios de servidor); (b) las notificaciones solo se recargan al cambiar de ruta (`NotificationsContext`), así que el aviso que se pliega necesita además recargar al volver a la app (`visibilitychange`) o con un sondeo suave; (c) el premio del checklist (+50 XP y energía llena) debe cobrarse **una sola vez en el servidor**: mismo patrón que el premio de racha (notificación `onboarding_reward` como marca de idempotencia, sin migración), y los pasos se derivan de datos reales (cuenta, cartas, permiso de push, misión completada) salvo «visitar el EcoDex», que necesita una marca; (d) en XP orbes + campana en cabecera comparten la esquina superior derecha: la campana se desplaza a la izquierda del indicador de nivel; (e) `prefers-reduced-motion` global obligatorio y prueba en un móvil de gama baja (capas animadas grandes del fondo y partículas de la onda de fractura).

- **Maqueta de interfaz y animaciones** (2026-11-18; **variantes ya elegidas, ver arriba**): [design/ux/mockup-interfaz-2026-11.html](../design/ux/mockup-interfaz-2026-11.html) (autocontenida: se abre con doble clic). **Onboarding en la maqueta (2026-11-18):** 3 ejes nuevos (entrada, bienvenida, primeros pasos) con un flujo recorrible de principio a fin (▶ Flujo completo): registro → bienvenida → primer sobre → primera carta → Inicio. Hallazgo: hoy, tras la primera carta, **no hay ninguna guía** (solo la tarjeta de avisos push); además la fusión, la energía y las misiones no se explican en ningún momento. Ninguna variante de la bienvenida lleva «Saltar» (decisión de producto). A decidir antes de construir: la variante «Empezar jugando» exige sesiones de invitado en el servidor y tiene implicaciones de privacidad con menores (consentimiento parental y datos del niño; ver la política de privacidad); el copy de la guía con burbujas y del interactivo es propuesta (la Tricera de las Lágrimas es una especie real; el resto del texto reutiliza el de las diapositivas actuales).

**Maqueta única con 13 ejes** (Actual + 3–4 variantes cada uno): transición entre pantallas, barra inferior e iconos, XP, subida de nivel, logros y recompensas, **botón de notificaciones** (¿mantenerlo, moverlo, ocultarlo o mostrarlo a veces?), llegada de notificaciones, botones, pantalla de inicio y **fondo** (con tinte por Fractae y estado de energía); con panel de demos, cámara lenta, «reducir movimiento» y la combinación guardada en la URL. Datos que conviene tener presentes al decidir el botón de notificaciones: hoy el botón flotante (88 px) **solo existe en Inicio** y tapa contenido, y sus 4 tipos de aviso ya tienen una señal persistente en la app (energía → barra de energía y punto en Percibir; fusión → progreso de fusión; nivel → pantalla de subida; racha → tarjeta de racha), así que el buzón es en buena parte redundante. Se regenera con `python3 design/ux/mockup-interfaz/build.py`. Aplicarla a la app es trabajo aparte (hoy React Router no tiene transiciones y no existe un HUD de XP ni un sistema de «Logros»).

- **Sistema de sonidos**: revisión completa (qué suena en fusión, edición de los sonidos) y reorganizar el audio en componentes reutilizables (hoy repartido/duplicado; ver nota histórica en `PercibirRitual.tsx` sobre `safePlay` vs `.play()` directo en `FusionPage.tsx`).
- **Revelados alternativos de carta** ya prototipados en `design/cartas/propuesta-cartas-2026-11.html`: Rotura, Iris y Giro con vueltas según rareza; para el giro manual, Libre y Toque. Idea abierta: un revelado distinto por rareza (p. ej. Rotura solo para Épica y Legendaria). También los diseños de carta A (Lámina) y C (Reliquia).

## 6. Cuentas y acceso

- **Verificación de email y recuperación de contraseña por email**: el registro con email + contraseña no verifica el email (de ahí que al vincular Google se borre su `password_hash`) y las cuentas antiguas no tienen recuperación (hoy se resetean a mano con `wrangler d1 execute`). Las cuentas de Google no lo necesitan.
- **Regenerar `docs/screenshots/login.png`**: no muestra aún el botón "Continuar con Google".

## 7. Seguridad

- **Comprobación explícita de origen en los POST (defensa en profundidad)**: hoy no se valida `Origin`. La cookie `HttpOnly; Secure; SameSite=Lax` ya bloquea el POST cross-site en navegadores modernos, así que el riesgo real es bajo. El `origin.ts` heredado de DinoDiscovery se borró en `e63e1ff` y **tenía hardcodeado el dominio del prototipo**: habría que reescribirlo con `ecorex-project.pages.dev`. Recuperable con `git show e63e1ff^:functions/lib/origin.ts`.
- **Límite de tamaño del cuerpo en los POST**: `request.json()` sin límite propio. Los cuerpos son minúsculos, así que un tope de ~4 KB es seguro. Recuperable con `git show e63e1ff^:functions/lib/requestBody.ts` (`readJsonBody`), aplicándolo primero a `auth/*`, `discover` y `fuse`.
