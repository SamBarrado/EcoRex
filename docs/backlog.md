# Backlog de Ecorex

Documento único de producto: análisis de retención, quick wins con estado, ideas futuras y decisiones abiertas. Complementa a [simplificacion-y-pendientes.md](simplificacion-y-pendientes.md) (deuda técnica y limpieza). Última revisión: 2026-11-18.

Leyenda de estado: ✅ hecho · 🚧 en curso · ⏳ pendiente · ❓ necesita decisión · ⛔ descartado.
Esfuerzo (estimación con tests): **S** < 2 h · **M** medio día · **L** 1–2 días.

---

## 1. Diagnóstico de retención (2026-11-18)

Análisis hecho leyendo el código (no la app en el navegador). Datos de uso de referencia: 7 usuarios y 262 descubrimientos a 2026-11-17.

1. **El contenido se agota en 1–2 semanas.** Solo hay 6 especies activas y la fase Eco no se puede conseguir desde la UI: 12 cartas alcanzables. Unas 15 percepciones para ver las 6 de Balance y ~40 para fusionarlas todas; con 3 de energía cada 12 h, el catálogo se completa en 1–2 semanas.
2. **La economía de XP se rompe al acabarse el contenido.** El bonus de especie completa (+200 XP) exige las 3 fases e incluye Eco (inalcanzable). La misión "carta nueva" solo se cumple con una carta nueva en un hueco nuevo, así que casi nunca se completa cuando ya tienes los 6 Balance, y con ella se cae el bonus diario (+30). El XP diario baja de ~85 a ~15–35. Nivel 15 = 2.619 XP; nivel 50 = 17.150.
3. **Una sesión dura un minuto.** 3 de energía → 3 percepciones y se acaba la app. Sin racha, sin objetivo a medio plazo.
4. **Promesas vacías y huecos.** Tres tarjetas bloqueadas en Inicio (Eco, Álbum, Amigos) que no llevan a ningún sitio; sin onboarding (el lore solo vive dentro de las cartas); sin compartir; tablas de regalos sin endpoints; sin analítica.

Conclusión: los quick wins amortiguan, pero la palanca de fondo es **más contenido** (una oleada de ~6 especies = otras 2 semanas; un calendario fijo tipo "especie nueva cada viernes" es en sí un hábito semanal) y **resolver qué es Eco**.

---

## 2. Quick wins

| # | Mejora | Qué cambia | Esfuerzo | Impacto | Estado |
|---|---|---|---|---|---|
| 1 | **Arreglar la economía de misiones** | "Carta nueva" pasa a "Consigue 1 carta" (cualquiera). Todas las misiones deben ser completables siempre. | S–M | Alto | ✅ 2026-11-18 (variante: ver nota) |
| 2 | **Racha de días con premio** | Contador de días seguidos en Inicio; premio a los 3 y 7 días. Se deriva de `daily_missions`, sin migración. | M | Alto | ⏳ (tanda 2) |
| 3 | **Subir de nivel rellena la energía** | En `recordDiscovery`, si `leveledUp`, energía al máximo; `LevelUpScreen` lo anuncia. | S | Alto | ✅ 2026-11-18 |
| 4 | **Eco como drop raro** | ~3–5 % de las percepciones salen en fase Eco (el servidor ya acepta `eco`). Desbloquea 18 cartas y el bonus de +200 XP. | M | Muy alto | ❓ decidir (ver §4); requiere arte Eco |
| 5 | **Onboarding de 3 pantallas** | Slides de lore tras registrarse + pista del gesto en la primera percepción. | M | Alto | ⏳ (tanda 2) |
| 6 | **"Próximamente" en vez de candados muertos** | Eco/Álbum/Amigos con etiqueta y, si se puede, "Avísame" por push. | S | Medio | ✅ 2026-11-18 (sin "Avísame": queda para cuando haya algo que avisar) |
| 7 | **Progreso de fusión visible** | "Rex de Fuego 3/5 → Exceso" en Inicio y EcoDex. Ampliar `/api/fuse/eligible` con los parciales. | S–M | Alto | ⏳ (tanda 2) |
| 8 | **Analítica mínima** | Cloudflare Web Analytics + `scripts/retention.sql` (D1/D7/D30 desde `discoveries`; se ejecuta a mano contra remoto). Revisar `/privacidad`. | S | Indirecto (alto) | ✅ 2026-11-18: `scripts/retention.sql` + `npm run db:retention[:remote]`. Pendiente tuyo: activar Web Analytics en el panel de Pages |
| 9 | **Reinicio diario en hora de Madrid** | `todayUTC()` → `todayInSpain()` (`Europe/Madrid`). | S | Medio | ✅ 2026-11-18 |
| 10 | **Compartir carta** | Botón en visor/revelado: `navigator.share` con fallback a descargar imagen. Lo delicado es renderizar la carta 3D a imagen (ver trampas en CLAUDE.md). | M–L | Alto (adquisición) | ⏳ |
| 11 | **Pity de rareza** | Contador de percepciones sin Rara+; a las ~15 la siguiente sale mínimo Rara. Requiere migración. | M | Medio–alto | ⏳ |
| 12 | **Más motivos de push** | "Tu racha se acaba hoy", "Carta lista para fusionar"; textos con voz del lore; tope de 1–2 al día. Se despliega aparte (`workers/push-cron`). | M | Alto | ⏳ |
| 13 | **Gráfica de Fractae y "Nuevo" en el EcoDex** | Rueda de los 8 Fractae obtenidos + marca "NUEVO" en cartas sin ver. | M | Medio | ⏳ |
| 14 | **Ranking / "Explorador del día"** | Top 10 simple por nivel o especies. Aporta poco con pocos usuarios. | M | Bajo ahora | ⏳ (cuando haya más usuarios) |

**Nota sobre #1 (variante aplicada):** al implementarlo apareció que la misión de **fusión** tampoco se puede cumplir a diario (5 duplicados ≈ 1,7 días de energía) y el bonus la exigía, así que el bonus era inalcanzable incluso al empezar. Resultado: `percibir` = 1 carta (10 XP), `coleccionista` = 3 cartas cualesquiera, nuevas o repetidas, fusión incluida (25 XP), bonus +30 XP por esas dos; `fusion` pasa a **extra opcional** (+20 XP, fuera del bonus). Techo diario sin fusión: 65 XP. Todo ajustable en `MISSION_DEFS`/`BONUS_SLUGS` ([missions.ts](../functions/lib/missions.ts)). Si más adelante se quiere la 4ª misión rotatoria, es una extensión de esto.

**Tandas:** 1 = #3, #9, #6, #8, #1 (barato y arregla lo roto; **hecha 2026-11-18**, sin desplegar) → 2 = #2, #7, #5 (crea el hábito) → decidir #4 y generar la siguiente oleada → resto cuando haya tracción.

**Extra sin ubicar:** "reciclar" duplicados sobrantes (más allá de las 5 de fusión) por XP o energía; hoy no sirven para nada y hace falta diseño.

---

## 3. Contenido

- **Oleada siguiente de especies.** Solo 6 de 40 en remoto están activas; `tools/species/lote.json` tiene 54 fichas-spec. Pipeline: `species:art` → `convert-species-art-to-webp` → `db:sync-species` → `db:seed:remote`.
- **Ediciones**: añadir "edición" como concepto de producto para colecciones tipo sobre (el campo `edition` ya existe en las fichas-spec, falta la mecánica de cara al usuario: sobres, desbloqueo, etc.).
- **Operaciones/eventos con freshness automática**: una especie es "rara" porque es nueva y se normaliza sola con el tiempo, sin tocar `drop_weight` a mano. Encaja con el modelo de Operaciones del world bible (§7/18.3); el reparto de rareza por Operación sigue sin diseñar.
- **Pesos por especie**: % de aparición distinto por especie dentro del pool activo (hoy el sorteo es uniforme entre `species.is_active`), independiente del sorteo de rareza.
- **Misiones más allá de las 3 fijas**: semanales, rotación de objetivos, rachas (ver #1, #2). Merece bloque propio de diseño.

## 4. Decisiones abiertas (no construir hasta decidirlas)

- ❓ **Fase Eco**: qué es y cómo se alcanza. Recomendación: drop raro (#4), por ser lo más simple y lo que más desbloquea. Alternativa: premio de racha o de fusionar Exceso.
- ❓ **Fusiones más allá de Balance**: si Exceso → Eco, etc.
- ❓ **Modo Amigos**: alcance (código QR, regalos, invitación con premio para ambos…). Las tablas `gifts` ya existen; no hay endpoints.
- ❓ **Modo Álbum** con ilustraciones: lo que era el EcoDex al principio; en vez de carta, ficha del dino con ilustración grande y al natural, posiblemente alternativa.
- ❓ **Terminología "especies" vs "variantes"**: especie (T-Rex) vs variante (cada fase). Hoy "Especies descubiertas" en perfil/Inicio puede confundirse con el conteo de fases.

## 5. Sistemas y UX

- **Sistema de sonidos**: revisión completa (qué suena en fusión, edición de los sonidos) y reorganizar el audio en componentes reutilizables (hoy repartido/duplicado; ver nota histórica en `PercibirRitual.tsx` sobre `safePlay` vs `.play()` directo en `FusionPage.tsx`).
- **Revelados alternativos de carta** ya prototipados en `design/cartas/propuesta-cartas-2026-11.html`: Rotura, Iris y Giro con vueltas según rareza; para el giro manual, Libre y Toque. Idea abierta: un revelado distinto por rareza (p. ej. Rotura solo para Épica y Legendaria). También los diseños de carta A (Lámina) y C (Reliquia).

## 6. Cuentas y acceso

- **Verificación de email y recuperación de contraseña por email**: el registro con email + contraseña no verifica el email (de ahí que al vincular Google se borre su `password_hash`) y las cuentas antiguas no tienen recuperación (hoy se resetean a mano con `wrangler d1 execute`). Las cuentas de Google no lo necesitan.
- **Regenerar `docs/screenshots/login.png`**: no muestra aún el botón "Continuar con Google".

## 7. Seguridad

- **Comprobación explícita de origen en los POST (defensa en profundidad)**: hoy no se valida `Origin`. La cookie `HttpOnly; Secure; SameSite=Lax` ya bloquea el POST cross-site en navegadores modernos, así que el riesgo real es bajo. El `origin.ts` heredado de DinoDiscovery se borró en `e63e1ff` y **tenía hardcodeado el dominio del prototipo**: habría que reescribirlo con `ecorex-project.pages.dev`. Recuperable con `git show e63e1ff^:functions/lib/origin.ts`.
- **Límite de tamaño del cuerpo en los POST**: `request.json()` sin límite propio. Los cuerpos son minúsculos, así que un tope de ~4 KB es seguro. Recuperable con `git show e63e1ff^:functions/lib/requestBody.ts` (`readJsonBody`), aplicándolo primero a `auth/*`, `discover` y `fuse`.
