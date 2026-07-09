# Ecorex

Juego de descubrimiento y colección de dinosaurios con carga emocional (Fractae). React + Vite en el frontend, Cloudflare Pages Functions en el backend, D1 como base de datos.

Lore completo del universo: [docs/lore_world_bible_ecorex_v5.md](docs/lore_world_bible_ecorex_v5.md).

## Stack

- **Frontend:** React 19 + React Router, Vite, PWA (vite-plugin-pwa)
- **Backend:** Cloudflare Pages Functions (`functions/api/**`)
- **Base de datos:** Cloudflare D1 (`ecorex-db`), esquema en [schema.sql](schema.sql)
- **Storage:** R2 (`DINO_IMAGES`, imágenes de especies generadas), KV (`RATE_LIMIT_KV`, `CACHE_KV`)
- **Hosting:** Cloudflare Pages, proyecto `ecorex-project`

## Desarrollo local

```bash
npm install
npm run dev          # build + wrangler pages dev dist (usa una D1/KV locales, separadas de producción)
npm run vite:dev      # solo Vite, sin las Functions de Cloudflare
npm test              # vitest
npm run typecheck      # tsc sobre app y functions
```

`wrangler pages dev` usa una copia local de D1/KV (bajo `.wrangler/state/`), completamente aislada de los recursos remotos. Ver [CLAUDE.md](CLAUDE.md#base-de-datos-d1-local-vs-remoto) para cómo mantenerlas sincronizadas.

## Estructura

```
src/pages/          Pantallas: Inicio, Percibir (descubrir), Colección, Perfil, Fusión, Login/Registro
src/components/     Componentes compartidos (NotificationBell, etc.)
src/components/card/ Carta de especie por capas: Card.tsx (presentacional) + CardScene.tsx (gestos: flip, drag/inercia, swipe-up)
functions/api/       Endpoints: auth, discover, collection, fuse, notifications, species, profile, missions
functions/lib/       Lógica compartida: auth, discovery, cache, rate limit, R2, proveedores de imagen (Anthropic/OpenAI)
schema.sql           Esquema D1, fuente de verdad de la base de datos
scripts/             Seed de datos, sync de especies, generación de arte/specs, comparador de esquema remoto
especies_design/     Material de trabajo/borrador para el arte de cada especie (NO producción)
public/species-art/  Arte final en producción, servido por la app
public/icons/fractae/ Badges de Fractae servidos por la app (copia de design/fractae/, uno por fractae.slug)
```

## Despliegue

Producción: https://ecorex-project.pages.dev (proyecto de Cloudflare Pages `ecorex-project`).

```bash
npm run build
npx wrangler pages deploy dist --project-name=ecorex-project
```

Detalles del proceso de release y de la base de datos remota en [CLAUDE.md](CLAUDE.md).

## Backlog

Ideas y mejoras futuras sin priorizar todavía: [docs/backlog.md](docs/backlog.md).
