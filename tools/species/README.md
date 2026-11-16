# tools/species — pipeline de contenido (solo local)

Herramientas de desarrollo para producir especies: ficha-spec → arte → registro en la base de datos. **Nada de esta carpeta se despliega ni lo importa la app** (`src/`, `functions/` y `workers/` no dependen de ella). Todos los comandos se ejecutan **desde la raíz del repo**.

Las claves de API (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) se leen de variables de entorno o de `.dev.vars`. Los comandos marcados con 💸 hacen llamadas de pago.

## Flujo normal de una especie nueva

1. **Elegir especie** — `npm run species:discover` (servidor local en `:4790`, ver "Discovery") o `node tools/species/lookup-species.mjs <Genero>` para inspeccionar datos reales.
2. **Ficha-spec** 💸 — `npm run species:spec -- "<especie>" "<Fractae>" [--out tools/species/lote.json --append] [--edition "Wave 2"]`
3. **Arte** — Balance se genera a mano en ChatGPT (prompt con `print-species-prompt`); Exceso y Eco 💸 con `npm run species:art`. Guardar en `public/species-art/{slug}/{balance,exceso,eco}.png`.
4. **WebP** — `node tools/species/convert-species-art-to-webp.mjs` (conserva los PNG como fuente).
5. **Registrar en BD** — `npm run db:sync-species` (local) y después, a mano y conscientemente, `npm run db:seed:remote`.

## Qué hace cada fichero

| Fichero | Para qué | Coste |
|---|---|---|
| `generate-species-spec.mjs` | Ficha-spec de una especie con grounding en NHM + dinosaurpictures.org + PBDB | 💸 Anthropic |
| `generate-species-art.mjs` | Arte de Balance/Exceso/Eco por image-to-image (pipeline de escena plana, el vigente) | 💸 OpenAI |
| `print-species-prompt.mjs` | Imprime el prompt exacto de una fase sin generar nada (útil para pegarlo en ChatGPT) | gratis |
| `lookup-species.mjs` | Muestra lo que devuelven las 3 fuentes reales para un género | gratis |
| `discover-species-pbdb.mjs` | Herramienta web local para buscar candidatos en PBDB y generar+guardar su ficha | 💸 Anthropic al generar |
| `convert-species-art-to-webp.mjs` | PNG → WebP (calidad 82) junto a cada original | gratis |
| `sync-species-db.mjs` | Detecta carpetas nuevas en `public/species-art/`, las añade a `scripts/seed.sql` y lo aplica a la D1 **local** | gratis |
| `generate-species-art-layered.mjs`, `composite-species-art.mjs` | Pipeline experimental de dos capas (fondo + recorte). **No es el vigente** (ver world bible §15.4.3) | 💸 OpenAI |
| `lib/` | Clientes de NHM Dino Directory, dinosaurpictures.org y PBDB | — |

Los avatares de perfil se generan aparte: `node tools/generate-avatars.mjs [1|2|3]` 💸.

## Datos

- `lote.json` — las 54 fichas-spec del bestiario. Campo `edition` = oleada/edición (`"Wave 1"`, vacío = sin planificar).
- `species.wave1.json` — las 5 fichas de Wave 1 (duplicadas en `lote.json`).
- `species.example.json` — ejemplo del formato.

## Reglas importantes

- **Guard de `main()`:** `generate-species-art.mjs` solo ejecuta `main()` si se lanza directamente (`import.meta.url === file://process.argv[1]`). Si otro script reutiliza sus funciones, **impórtalo siempre como módulo**; ejecutarlo con otros argv dispara una generación real de pago (ya ocurrió una vez).
- Cambios de ruta de imagen en especies ya publicadas: `discoveries.image_url` es una copia por usuario, no una referencia viva; hay que migrar también `discoveries` en local y remoto.
- `scripts/seed.sql` usa `INSERT OR IGNORE`: no actualiza filas existentes.

Documentación ampliada en [CLAUDE.md](../../CLAUDE.md) (secciones "Arte de especies" y "Seed y sync de especies") y [docs/lore_world_bible_ecorex_v5.md](../../docs/lore_world_bible_ecorex_v5.md) §15.
