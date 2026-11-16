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
| ❓ | **Lore visible en el grid del Ecodex** | El lore ya se pasa a las tiles (`2927326`) pero se renderiza a ~3,8 px: ilegible. Opciones: (1) grid de 2 columnas, (2) **línea de lore propia de 11-12 px bajo cada tile** (recomendada), (3) dejarlo como está y revertir el commit. |
| ✅ | **Quitar `discovery_code` de la carta de Fusión** | `8a5586e`. Sigue existiendo en API/BD, solo desaparece de la UI. Si se quiere conservar (p. ej. para el modo amigos), revertir ese commit. |
| ❓ | **3 imágenes de perfil por defecto** (en vez de la inicial) | Feature pequeña. Falta decidir de dónde salen las imágenes y dónde se elige. |
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
| 3 | Sacar el pipeline de especies a `tools/species/` | ⏳ | bajo-medio (rutas relativas, `package.json`, guard de `main()`) | La app deja de compartir repo con ~3.700 líneas de herramientas locales |
| 4 | Hook `useSound` (audio duplicado entre `PercibirRitual` y `FusionPage`) | ⏳ | medio (trucos de iOS Safari; los tests mockean `play()` y no detectarían regresión: probar en iPhone) | Un solo sitio para sonidos; solo compensa si vas a tocar el sonido |
| 5 | Extraer tile y filtro de fases de `ColeccionPage` (273 líneas, 14 estilos inline) | ⏳ | bajo | Es la pantalla donde se va a seguir iterando (lore, modo álbum) |
| 6 | Unificar `discover` y `fuse` en una función común | ⏳ | medio-alto (núcleo de la economía: XP, misiones, rareza) | Reglas de XP/misiones en un solo sitio. Ya es más pequeño: ambos perdieron la resolución de imagen, pero siguen duplicando `generateDiscoveryCode` y el flujo rareza→insert→XP→misiones→bonus |
| 7 | Migraciones numeradas de D1 (`wrangler d1 migrations`) | ⏳ | medio (hay que declarar el estado actual como línea base en una BD remota con datos) | Se acaba el "remoto desfasado". Buen momento para eliminar las columnas sin uso `rarity_tiers.anchor_probability` y `discoveries.is_unique_variant`. Base: `scripts/migrations/2026-07-06-username-unique.sql` |
| 8 | Partir `index.css` (1.394 líneas) por componente | ⏳ | medio (orden/especificidad del CSS; los tests no ven lo visual: hacer capturas antes y después) | Encontrar estilos rápido |
| 9 | Separar lógica y presentación en `PercibirRitual` (437 líneas) | ⏳ | alto (flujo central, animaciones, audio) | Solo si lo vas a tocar de todos modos |
| 10 | Sacar los PNG originales de git | ⛔ | alto: quitarlos del tracking **no** reduce el `.git` (209 MB); haría falta reescribir historial + force push | No recomendado salvo que el peso moleste. No se comprobó que estén trackeados |

**Orden recomendado:** 3 → 5 → 7 → 6; el resto según se vaya tocando cada zona.

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
