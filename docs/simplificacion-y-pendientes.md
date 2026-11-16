# Simplificación y pendientes — revisión del 2026-11-16

Resultado de la revisión al retomar el proyecto tras ~3 meses parado. Complementa a [backlog.md](backlog.md) (ideas de producto); este documento recoge **lo que quedó pendiente/a medias**, **las ideas de simplificación** y **el estado de cada una**.

Estado de referencia: versión 0.9.6, producción desplegada con el commit `605bb84`. El commit `e63e1ff` está en local, sin subir (comprobar con `git status`/`git log origin/main..HEAD`).

Leyenda: ✅ hecho · ⏳ pendiente · ❓ pendiente de tu decisión · ⛔ descartado/no recomendado

---

## 1. Estado técnico al retomar

Todo lo publicado funcionaba: typecheck OK, tests OK, esquema de D1 remota sincronizado con `schema.sql`, `push-cron` desplegado después de su último cambio, producción respondiendo. No había nada roto; lo pendiente son cabos sueltos, correcciones de UX y decisiones abiertas.

---

## 2. Cabos sueltos que había en el working tree

| Estado | Qué | Commit |
|---|---|---|
| ✅ | Guard `import.meta.url` en `generate-species-art.mjs` + script `print-species-prompt.mjs` | `a44d027` |
| ✅ | Sección "Por ordenar" en `backlog.md`; quitada referencia a `docs/superpowers/plans/` | `1a1336f` |

---

## 3. Correcciones de UX a corto plazo

| Estado | Qué | Notas |
|---|---|---|
| ✅ | **Lore visible en el grid del Ecodex** | Línea de lore propia bajo cada tile (10,5 px, recortada a 3 líneas con «…»; las frases miden 81-208 caracteres, así que en el grid es un adelanto y la frase completa está en el visor y en el `title`). Quitado el lore de la miniatura escalada, donde era ilegible. |
| ✅ | **Quitar `discovery_code` de la carta de Fusión** | `8a5586e`. Sigue existiendo en API/BD, solo desaparece de la UI. Si se quiere conservar (p. ej. para el modo amigos), revertir ese commit. |
| ✅ (local, sin desplegar) | **3 imágenes de perfil por defecto** | Avatares generados con `tools/generate-avatars.mjs` (fuentes 1024 px en `design/avatares/`, WebP 256 px en `public/avatars/`). El usuario los elige tocando su avatar en Perfil (o vuelve a la inicial); columna nueva `users.avatar` + `PATCH /api/auth/avatar`. **Antes de hacer push hay que aplicar en remoto:** `npx wrangler d1 execute DB --remote --command="ALTER TABLE users ADD COLUMN avatar TEXT;"` (si no, `/api/profile` y la sesión fallan con `no such column`). |
| ⏳ | **Nombre truncado en la carta** (`.card-name`, nombres largos) | Esperar a los diseños definitivos de la carta. |
| ❓ | **"Especies" vs "variantes"** en la UI | Falta decidir terminología y en qué pantallas cambia. |

---

## 4. Decisiones de diseño sin tomar

Mientras no se decidan, **no construir nada de esto** (es el mayor ahorro de complejidad posible).

- ❓ Qué hacer con la **fase Eco**: hoy la UI solo llega a Exceso.
- ❓ Si las **fusiones** aplican más allá de Balance.
- ❓ Alcance del **modo amigos** (QR con código, regalos…).
- ❓ **Modo álbum** con ilustraciones grandes (ficha del dino + ilustración al natural/alternativa).
- ❓ Ediciones/sobres, misiones semanales y rachas, pesos por especie, sistema de sonidos (ver `backlog.md`).

---

## 5. Contenido

- ⏳ Solo **6 de 40 especies** están activas y con arte (las 5 de Wave 1 + Tyrannosaurus imperator). `lote.json` tiene 54 fichas-spec; no se ha cuadrado esa cifra con las 40 de remoto. Falta generar el arte de la siguiente oleada. Pipeline: `species:art` → `convert-species-art-to-webp` → `db:sync-species` → `db:seed:remote`.

---

## 6. Ideas de simplificación

Ordenadas de menor a mayor esfuerzo/riesgo. "Qué ganas" es una valoración honesta; algunas ganancias son pequeñas.

| # | Idea | Estado | Riesgo | Qué ganas |
|---|---|---|---|---|
| 1 | Limpiar scripts puntuales y backlog | ✅ `382c241` | casi nulo | Menos ruido al volver |
| 2 | Quitar `CACHE_KV` y `lib/cache.ts` | ✅ `c321769` | bajo | Un recurso menos que entender |
| 3 | Sacar el pipeline de especies a `tools/species/` | ✅ | bajo-medio (rutas relativas, `package.json`, guard de `main()`) | La app deja de compartir repo con ~3.700 líneas de herramientas locales |
| 4 | Hook `useSound` (audio duplicado entre `PercibirRitual` y `FusionPage`) | ⏳ | medio (trucos de iOS Safari; los tests mockean `play()` y no detectarían regresión: probar en iPhone) | Un solo sitio para sonidos; solo compensa si vas a tocar el sonido |
| 5 | Extraer tile y filtro de fases de `ColeccionPage` (279 → 122 líneas; 14 estilos inline → 1 dinámico) | ✅ | bajo | Es la pantalla donde se va a seguir iterando (lore, modo álbum) |
| 6 | Unificar `discover` y `fuse` en una función común | ✅ | Hecho: `functions/lib/recordDiscovery.ts` (`loadSpeciesPhase`, `rollRarityTier`, `recordDiscovery`, `discoveryResponseBody`). `discover.ts` 218 → 115 líneas y `fuse/index.ts` 192 → 105. Las reglas de XP, misiones, bonus diario y notificación de subida de nivel viven ahora en un solo sitio. Red de seguridad permanente: `functions/api/economy.golden.test.ts` |
| 7 | Migraciones numeradas de D1 (`wrangler d1 migrations`) | ✅ | Hecho: `migrations/0001_baseline.sql` verificada columna a columna contra producción y marcada como aplicada en remoto y en local (sin ejecutarla); `schema.sql` y `check-remote-schema` retirados. Flujo: `npm run db:migrate:new/db:migrate/db:migrate:status/db:migrate:remote` (ver CLAUDE.md) |
| 7b | Migración 0002 de limpieza de columnas sin uso | ✅ en el repo; **⏳ falta aplicarla en producción** | Hecho: `migrations/0002_drop_unused_columns.sql` borra `species.lore_phrase` (sus 6 textos antiguos quedan como comentario en el propio fichero), `discoveries.is_unique_variant` y `rarity_tiers.anchor_probability`; el código, el seed y los tests ya no la usan. Probada en una BD con datos y en arranque desde cero; aplicada en la D1 local. **Para producción, en este orden: push (deploy) → `npm run db:migrate:remote`.** Hacerlo al revés rompe la versión antigua del código con `no such column` |
| 8 | Partir `index.css` (1.394 líneas) por componente | ⏳ | medio (orden/especificidad del CSS; los tests no ven lo visual: hacer capturas antes y después) | Encontrar estilos rápido |
| 9 | Separar lógica y presentación en `PercibirRitual` (437 líneas) | ⏳ | alto (flujo central, animaciones, audio) | Solo si lo vas a tocar de todos modos |
| 10 | Sacar los PNG originales de git | ⛔ | alto: quitarlos del tracking **no** reduce el `.git` (209 MB); haría falta reescribir historial + force push | No recomendado salvo que el peso moleste. No se comprobó que estén trackeados |

**Orden recomendado:** ~~3~~ → ~~5~~ → ~~7~~ → ~~6~~; el resto según se vaya tocando cada zona.

**Hallazgo del #7:** el comprobador antiguo no detectaba columnas *de más*. Al comparar el baseline con producción apareció `species.lore_phrase`, que `schema.sql` ya no definía. Y la D1 *local* estaba desfasada (le faltaban `push_subscriptions`, `energy_last_notified_count` y `avatar`); se alineó a mano, con copia de seguridad, conservando los datos de prueba.

---

## 7. Limpieza de herencia del prototipo DinoDiscovery (hecha)

| Estado | Qué | Commit |
|---|---|---|
| ✅ | `functions/lib/anthropic.ts` (solo lo importaba su test) | `4b287c4` |
| ✅ | **Mecánica de variantes únicas** (ancla vs. variante generada con OpenAI, R2, `/images/`). Estaba apagada: `anchor_probability = 1` en los 5 tiers, 0 variantes en 262 capturas, sin `OPENAI_API_KEY` en producción. World bible §15.6 marcada como retirada (se conserva como referencia de diseño; recuperable del historial de git) | `9fafec6` |
| ✅ | `hash.ts` y `shared/types.ts` | `605bb84` |
| ✅ (local) | `adminAuth.ts`, `origin.ts`, `requestBody.ts`, `shared/validateEmail.ts` (`shared/` eliminada) | `e63e1ff` |

**Aviso de seguridad (anotado en [backlog.md](backlog.md#seguridad), sin hacer):** `origin.ts` (comprobación de origen) y `requestBody.ts` (límite de tamaño de cuerpo) eran protecciones del prototipo que Ecorex nunca aplicó. Matiz: la cookie de sesión ya lleva `SameSite=Lax; HttpOnly; Secure`, así que el riesgo CSRF real es bajo; la comprobación de origen sería una segunda capa. Además `origin.ts` tenía hardcodeado el dominio del prototipo, por lo que habría que reescribirlo. Hoy no hay límite de cuerpo propio en los POST. Ambos se recuperan del historial (`git show e63e1ff^:functions/lib/<fichero>.ts`).

---

## 8. Estado de Cloudflare (recursos)

- ✅ Borrados: KV `ecorex_cache` y `ecorex_cache_preview`; bucket R2 `ecorex-dino-images` (estaba vacío).
- En uso: D1 `ecorex-db`, KV `ecorex_rate_limit` (+ preview), worker `push-cron`.
- ❓ **No tocados, parecen del prototipo DinoDiscovery** (que sigue enlazado en el README, así que podrían estar en uso por otro proyecto): bucket R2 `dino-discovery-images` y namespace KV titulado `CACHE_KV` (con claves `cache:…`).

---

## 9. Verificaciones y avisos pendientes

- ⏳ **Probar en producción un descubrimiento y una fusión con sesión real** tras el deploy de `9fafec6` (solo se comprobó que los endpoints responden 401 sin sesión).
- ⏳ **Renovar el token del MCP de GitHub** (credencial caducada). Para el release (GitHub Release + bump de versión) servirá también `gh`.
- ⏳ **Dependencias**: tras meses parado, no se ha mirado `npm outdated` ni `npm audit`.
- ℹ️ `generate-species-art-layered.mjs` y `composite-species-art.mjs` se conservaron a propósito: el pipeline de dos capas está documentado en el world bible (§15.4.3) como experimento no vigente. Si se abandona esa línea, se pueden borrar junto con esa sección.
- ℹ️ `CLAUDE.md` y `docs/superpowers/` están en `.gitignore` desde `cd7c027`: no viajan con el repo, conviene tener copia aparte. Los checkboxes de los planes en `docs/superpowers/plans/` están todos sin marcar aunque las features están publicadas (solo es desorden).
- ℹ️ Cada push a `main` despliega a producción automáticamente.
