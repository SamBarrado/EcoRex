# Spec: cartas por capas dentro del Art Studio (v1.1)

Estado: **propuesta** para implementar con Claude Code. Versión 1.1, 2026-11-25 (v1: 2026-11-24).
Subordinado a: `lore_world_bible_ecorex_v7.md` (canon) y `ECOREX_ADMIN_ARCHITECTURE.md` v1.2 (Admin y Art Studio). Orden de autoridad según World Bible §0.1: si algo de este spec choca con ellos, prevalecen ellos. **Este spec no es canon**: lo que cambia una regla de producto o el modelo de datos se lista en §11 y exige una World Bible v8 antes de implementarse.

### Historial de cambios

- **1.1 (2026-11-25):** sincronizado con World Bible v7 y Admin Architecture v1.2. Cambios principales: el Art Studio deja de ser una herramienta dev-only aparte y pasa a ser **el módulo de capas de cartas del Art Studio de Ecorex Admin** (§0, §7); «biomas» se sustituyen por el catálogo canónico de hábitats `habitatSlug` (§4.1); se corrige el modelo de datos (no hay `species.biome_id`; sí hay migraciones y tablas de Admin, §5); se añaden las restricciones reales del renderer actual (`Card.tsx`, §3 y §6); la ruta de publicación respeta `sync-species-db.mjs`, la caché `immutable` y `discoveries.image_url` (§4.5); los FX Eco por Fractae se alinean con los arquetipos de §15.3 (§6); se añade la Creature Bible Sheet como entrada (§4.2); las decisiones se marcan según su estado real.
- **1.0 (2026-11-24):** versión inicial.

### Etiquetas

- **[CANÓNICO v7]** regla explícita de la World Bible v7.
- **[ADMIN]** definido en Admin Architecture v1.2.
- **[IMPLEMENTADO]** comprobado en el repositorio a fecha de este spec.
- **[PROPUESTA]** diseño de este spec, pendiente de decisión.
- **[PENDIENTE]** decisión abierta; no se da por cerrada.

---

## 0. Objetivo, alcance y encaje

Este spec cubre una **extensión del Art Studio**: pasar de una imagen plana por especie+fase a una carta compuesta por capas (fondo de hábitat, criatura recortada, marco, FX) con pop-out.

- **Art Studio (módulo de Admin)** [ADMIN]: produce y gestiona los assets de cada carta por capas. Encaja en las fases 5–8 de Admin (hoja de referencia, motor de generación, anclas de fase, publicación). Hoy `/art-studio` en Admin es un `Placeholder` [IMPLEMENTADO].
- **Renderer PWA**: compone las capas en cliente con inclinación, parallax y FX, y deja que partes de la criatura sobresalgan del marco (pop-out).
- **Fuera de alcance**: generación de imágenes en runtime para el jugador, variantes únicas por usuario (mecánica retirada, World Bible §15.6), Capacitor/nativo, y cualquier cambio en Percibir, Fusión, Eco o energía [CANÓNICO v7].

**Estado del arte de capas.** World Bible §15.4.3 describe un pipeline de dos capas (fondo + recorte con chroma-key) que **no es el pipeline vigente**: `species_phase_anchors` tiene un único `image_url` y el script en uso es el de escena plana. Admin Architecture §14 y §32 prohíben rediseñar el modelo para dos capas o tratarlo como vigente sin una decisión explícita. **Este spec es esa decisión en forma de propuesta**: no se implementa nada hasta aprobar §11.

## 1. Decisiones

**Propuestas de este spec (a aprobar)**

| # | Decisión |
|---|---|
| 1 | La carta es un conjunto de capas más un `layout.json` de composición, no una imagen única. |
| 2 | **Fondos y criaturas se generan por separado.** Los fondos son una biblioteca reutilizable por **hábitat canónico** (`habitatSlug`, World Bible §15.4.4); las criaturas se generan por especie+fase. |
| 3 | Pop-out: la criatura se dibuja dos veces, dentro de la ventana (detrás del marco) y otra por delante del marco, enmascarada a la zona que sobresale. |
| 4 | Texto, stats e iconos son DOM (i18n, copy como datos). Nunca dentro de la imagen generada. |
| 5 | El recorte no depende de la API: `gpt-image-2` no ofrece fondo transparente fiable (World Bible §15.4.3 ya lo recoge) y hay reportes de halos. Se usa `rembg` offline o `@imgly/background-removal` (WASM en navegador). El chroma-key verde de §15.4.3 queda como alternativa si el matting falla. |
| 6 | Sin inpainting con máscara para limpiar fondos: no obedece la máscara de forma fiable. Los fondos se generan limpios, sin criatura. |
| 7 | Producción sirve estáticos desde `public/` (coste cero, sin endpoints de generación para jugadores). |
| 8 | Grids, regalos y export usan un WebP «baked». El detalle y la revelación usan capas vivas. |
| 9 | Formato vertical nativo (1024x1536) para fondos y criaturas. |

**Heredadas de Admin y World Bible (no se reabren aquí)**

- La IA propone, **la aprobación canónica es humana**; un activo aprobado es inmutable y cualquier cambio crea una versión nueva [ADMIN §8, §13].
- Exceso y Eco parten **del mismo Balance aprobado**; nunca se encadenan entre sí [ADMIN §11].
- Balance se diseña a mano en ChatGPT; Exceso y Eco se generan por `images/edits` [CANÓNICO v7 §15.4.1].
- Las llamadas de pago exigen confirmación explícita (`confirm:true` en Admin) y estimación previa [ADMIN §18, IMPLEMENTADO en Discovery].
- La rareza no es atributo de especie ni de ancla: se sortea por captura. Los marcos por rareza son solo presentación [CANÓNICO v7 §6].

**Abiertas [PENDIENTE]**

- **Proporción de carta.** El renderer actual ya es **2:3** (`.ecodex-tile`, dorso `card-back.webp` 2:3 opaco y a sangre [IMPLEMENTADO]). La propuesta de 5:7 de la v1 queda descartada salvo decisión contraria: cambiarla obligaría a rehacer el dorso y todos los tamaños en `cqw`. Falta fijar el rectángulo de la ventana de arte al diseñar los marcos.
- **Fondo por fase o por hábitat.** World Bible §15.4.3 prevé fondo por hábitat **+ fase** (~36 fondos para 12 hábitats). Este spec propone por defecto un fondo por hábitat y fase por tinte y FX en runtime (12 fondos). Se decide tras la especie piloto.
- **Almacenamiento privado** de originales, borradores y capas del Admin desplegado: R2 está retirado y Admin §16/§31 lo deja sin decidir. Mientras tanto, el flujo local basado en `especies_design/` es una etapa temporal.
- **Dónde corre el procesado de imagen** (matting, composición): `rembg` y `sharp` no corren en Workers. Opciones: scripts locales que Admin solo registra y revisa, o procesado en cliente del navegador. Pendiente de decidir junto con el almacenamiento.
- Migración de las 6 especies activas (hoy 3:2 apaisadas) a vertical.

## 2. Modelo de capas (de abajo arriba)

| z | Capa | Recorte | Origen |
|---|---|---|---|
| 0 | Fondo de hábitat | A la ventana de arte | Habitat Studio (1 por `habitatSlug`) |
| 1 | Sombra de contacto | A la ventana | Runtime, desde `shadow` del layout |
| 2 | Criatura A (interior) | A la ventana | Cutout con alfa |
| 3 | Marco por rareza | Silueta de la carta | 5 PNG/WebP con ventana transparente (hechos una vez) |
| 4 | Criatura B (pop-out) | Máscara `popout.path` | El mismo cutout |
| 5 | FX (foil por rareza, tinte de fase, disolución Eco) | Alfa de criatura o marco | Runtime |
| 6 | Texto y stats | Ninguno | DOM |

Hoy `Card.tsx` pinta **una sola imagen** (`imageUrl`) dentro de la cara, con el foil y el reflejo como degradados encima y el marco como material CSS por tier [IMPLEMENTADO]. El modelo de capas sustituye esa imagen única por la pila de arriba; el canto de 9 láminas y el dorso no cambian.

## 3. Pop-out y renderer: reglas e interacción con `Card.tsx`

Reglas del spec:

- El contenedor de la carta **no** lleva `overflow:hidden`, `border-radius` con recorte, `filter`, `mask`, `clip-path` ni `opacity<1`: aplanan `preserve-3d`. El recorte va en cada capa, nunca en el padre.
- Las esquinas redondeadas pertenecen al fondo y al marco, no al contenedor. Todas las partes del objeto 3D comparten el mismo `border-radius` (16 px): cara, dorso y las 9 láminas [IMPLEMENTADO].
- `popout.path` es un path SVG con coordenadas normalizadas 0..1, con `<clipPath clipPathUnits="objectBoundingBox">` en un SVG inline.
- Parallax: `perspective` en el padre y `translateZ` por capa; amplitud máxima por capa en `layout.parallax`.
- Inclinación: el renderer actual usa solo **puntero** (hover con ratón, arrastre; `CardScene` mueve la carta imperativamente en un bucle `requestAnimationFrame`, sin giroscopio) [IMPLEMENTADO]. Añadir `DeviceOrientation` es opcional; en iOS exige `DeviceOrientationEvent.requestPermission()` desde un gesto del usuario.

**Conflictos con trampas ya pisadas (CLAUDE.md, «Cartas y EcoDex»)** que este spec debe respetar o resolver explícitamente en la fase 1:

| Trampa conocida | Consecuencia para el spec |
|---|---|
| No usar `mix-blend-mode` ni `transform` en las capas internas de la cara; las capas con mezcla o transformadas dentro de una cara 3D con `backface-visibility` dan artefactos en algunas GPU. El arte se desplaza con `object-position`. | La v1 pedía `translateZ` por capa y foil con `mix-blend-mode`. **Ambos quedan como hipótesis a validar en GPU real** (iOS incluido) antes de adoptarlos. Alternativa preferida: parallax por `object-position`/desplazamiento 2D y foil con degradados de alfa normal, como hoy. |
| `img { max-width: 100% }` recorta imágenes sobredimensionadas. | Las capas sobredimensionadas llevan `max-width: none`. |
| Imágenes dentro de la carta: `pointer-events: none` y `draggable="false"`. | Aplica a todas las capas nuevas. |
| `touch-action: none` en `.card-perspective`. | Se mantiene. |
| Bucle de movimiento sin fin: con `vi.useFakeTimers()` no vale `runAllTimersAsync()`. | Los tests de capas usan `advanceTimersByTimeAsync`. |
| El giro con el dedo solo está activo en el visor del EcoDex (`allowSpin`); en Percibir la carta solo se inclina y levita. | El pop-out se evalúa en ambos modos; con giro completo (backface) la capa B no debe asomar por el dorso. |

## 4. Art Studio: módulos

Todos viven en el Art Studio de Admin, detrás de su autorización deny-by-default (§7).

### 4.1 Habitat Studio (fondos)

- **Entrada**: el catálogo canónico de **12 `habitatSlug`** de World Bible §15.4.4 (bosque-abierto-templado, matorral-arido, riberas-humedales, desierto-dunas, pantano-oscuro, pantano-dorado, llanura-abierta, costa-litoral, bosque-boreal-frio, volcanico, valle-helado-cristal, oceano-profundo). **No se crea una lista de biomas nueva**: la «lista cerrada de biomas» abierta en la v1 queda resuelta por este catálogo. Se añaden slugs solo si el hábitat **y** el mood narrativo son genuinamente distintos [CANÓNICO v7]. Metadatos propios del fondo: ambiente, paleta, dirección de luz, hora del día.
- **Datos de partida**: `habitatSlug` está en las fichas-spec y lo elige una persona al aprobar [ADMIN/IMPLEMENTADO: Discovery exige `habitatSlug` para aprobar]. **No existe en D1** (`species` no tiene columna de hábitat) [IMPLEMENTADO]. Dos fichas heredadas (`Stegosaurus pavor`, `Diplodocus fidei`) no lo tienen y habrá que asignarlo antes de generar su carta.
- **Generación**: vertical 1024x1536, **sin criaturas ni personajes**, zona central más calmada (ahí irá la criatura), perspectiva atmosférica (fondo más suave y desaturado, ver `FIGURE_GROUND_SEPARATION` en `generate-species-art.mjs`), mismo estilo ilustrado que el pipeline vigente.
- **Salida**: `public/habitats/{habitatSlug}/bg.webp` más metadatos (`lightDir`, `palette[]`, `horizonY`, `groundY` para la sombra de contacto).
- **Reutilización**: varias especies comparten fondo. Reduce llamadas de imagen, que es el único gasto variable.
- **Convención de borradores**: se respeta la de World Bible §15.4.3 (`especies_design/backgrounds/{habitatSlug}/`), no una nueva.

### 4.2 Creature Studio (criaturas)

- **Entrada**: ficha-spec **aprobada** y fase. Para Exceso y Eco, el **Balance aprobado**. Si existe, la **Creature Bible Sheet aprobada** [ADMIN §9]: sus rasgos invariables y su paleta tienen prioridad en el prompt y la hoja no se sustituye por este paso.
- **Reglas del prompt**: cuerpo completo, **sin cortar en ningún borde**, margen generoso, fondo plano neutro y contrastado con la paleta, vertical, mismo estilo. Exceso y Eco con pose y encuadre propios (`buildExcesoPrompt`, `buildEcoPrompt`). **Reutilizar los builders de `generate-species-art.mjs`, no copiarlos** (jerarquía de restricciones de Admin §10: anatomía y rasgos diagnósticos antes que pose o entorno). Importar solo con el guard de `main()`; un script sin él se ejecuta con tu `argv` y factura contra la API.
- **Eco** [CANÓNICO v7 §15.3]: el mecanismo visual sale de combinar el arquetipo del Fractae con el hábitat y los rasgos de la especie; dos especies del mismo Fractae no repiten solución.
- **Flujo**: Balance a mano en ChatGPT e importado. Exceso y Eco por `images/edits` **sobre el mismo Balance**.
- **Recorte**: matting, descontaminación de color en el borde (fringe) y revisión visual de halo. Rechazar si hay halo.
- **Salida**: borradores en `especies_design/cutouts/{slug}/{fase}.png` (convención de §15.4.3) más `creature.raw.png`/`creature.webp` con alfa según la herramienta.
- **Registro** [ADMIN §12]: cada generación guarda prompt exacto, versión de plantilla, modelo y parámetros, referencias usadas, usuario, estado y coste.

### 4.3 Composition Editor

- Carga fondo de hábitat, criatura, marco y rareza elegidos.
- Controles: arrastrar, escalar, rotar y voltear la criatura; dibujar el polígono de pop-out; ajustar sombra, parallax y FX.
- Preview 3D en vivo con inclinación, usando el mismo `CardScene` que la app.
- Guarda `layout.json` como **versión nueva** (nada se edita en sitio; aprobado = inmutable).

### 4.4 Bake y export

- `composeCard()` (canvas 2D, `src/lib/cardCompose.ts`, **por crear**) compone las capas en un WebP estático. `html2canvas` suele fallar con 3D, blend modes y máscaras; no se usa.
- El `baked.webp` es lo que ven las superficies que no necesitan capas vivas: EcoDex (`EcodexTile` es una mini carta propia, no la carta reducida), listas, y el futuro Regalo (sin endpoints todavía [IMPLEMENTADO]).
- No existen hoy `cardCapture.ts` ni `dinoCutout.ts` (los nombraba la World Bible §18.2 como piezas del prototipo por portar): no se «recablean», se escriben nuevas si hacen falta.

### 4.5 Flujo candidato a producción y publicación

Restricciones reales que la v1 ignoraba:

- La app y `sync-species-db.mjs` esperan `public/species-art/{slug}/balance|exceso|eco.png` (con `.webp` hermano). **Cambiar la estructura rompe la sincronización.**
- `public/_headers` sirve `/species-art/*` con `Cache-Control: immutable` a un año **sin hash en el nombre**: un fichero regenerado con el mismo nombre no se recarga en los navegadores.
- `discoveries.image_url` es una **copia por usuario fijada al descubrir**; un cambio de ruta obliga a migrar `discoveries` (y revisar `gifts`/`user_resonance_cards`) en local y en remoto [CLAUDE.md].

Por tanto, **[PROPUESTA]**:

1. Los assets por capas van a **rutas nuevas** (p. ej. `public/species-art/{slug}/layers/{fase}/…` y `baked` con nombre versionado), nunca sobrescribiendo `{fase}.webp`.
2. Publicar = **copiar** (no mover) desde `especies_design/` y actualizar `species_phase_anchors.image_url` al baked. Un cambio de ruta incluye la migración de `discoveries.image_url` de las especies ya publicadas (mismo cuidado que `.png` → `.webp`).
3. Publicar sigue los pasos de Admin §14: permisos, ficha aprobada, activos aprobados, validación de formato y rutas, copia, actualización de anclas, verificación de URLs, registro de quién publicó qué versión y rollback.
4. Promover una especie en Admin la deja con `is_active = 0`; activarla y subir sus anclas **no está en Admin todavía** [CLAUDE.md]. Esta fase lo cubre (Admin fases 7–8). Publicar **no** activa la especie automáticamente.

## 5. Modelo de datos

**Corrección de la v1:** ni `species.biome_id` ni «sin migraciones» son válidos. D1 ya tiene migraciones `0001`–`0010` y las tablas de Admin (`species_drafts`, `spec_versions`, `admin_audit_log`, roles) [IMPLEMENTADO]. La siguiente migración libre es la `0011`.

- **Hábitat**: no se añade `species.biome_id`. Se usa `habitatSlug` de la ficha-spec. Si el renderer o Admin necesitan el hábitat de una especie ya publicada, hay que persistirlo (columna o tabla estática derivada de las fichas) mediante una migración aditiva, aplicada a remoto **antes** de desplegar el código que la usa [CLAUDE.md]. [PENDIENTE: decidir dónde vive, junto con el modelo de datos de Admin.]
- **Estado de producción de arte** (versiones, jobs, revisiones, prompts): lo define Admin §15 como entidades **propuestas** (`art_generation_jobs`, `art_assets`, `art_reviews`, `art_prompt_templates`, `creature_reference_sheets`…), **no creadas**. Este spec no crea tablas por su cuenta: reutiliza las de Admin cuando se diseñen, comprobando antes que no existan equivalentes. Lo que sí es un artefacto estático publicado es el `layout.json` que consume la PWA.
- **No añadir rareza fija** a `species` ni a `species_phase_anchors` [CANÓNICO v7 §18.3].
- `species_phase_anchors` mantiene `species_id`, `phase`, `image_url`: **una imagen por especie y fase** (el baked). Un modelo de dos URLs queda fuera hasta aprobar §11.

```ts
type Phase = 'balance' | 'exceso' | 'eco'; // nunca 'furia': Furia es un Fractae (Ira)

interface Habitat {
  slug: string;                          // uno de los 12 habitatSlug canónicos
  nameEs: string;
  nameEn: string;
  lightDir: { x: number; y: number };
  palette: string[];
  horizonY: number;                      // 0..1
  groundY: number;                       // 0..1, para la sombra
  bg: string;                            // ruta a bg.webp
}

interface CardLayout {
  version: 1;
  speciesSlug: string;
  phase: Phase;
  habitatSlug: string;
  creature: { x: number; y: number; scale: number; rotationDeg: number; flipX?: boolean };
  popout?: { path: string; part: 'head' | 'claw' | 'tail' | 'wing' | 'other' };
  shadow?: { enabled: boolean; opacity: number; blur: number };
  parallax: { bg: number; creatureInner: number; frame: number; creaturePop: number }; // px máx
  fx: { preset: string; intensity: number };
}
```

Marcos: `public/frames/{tier}.webp` más `frames.json` con `windowRect` normalizado y radio de esquina, uno por tier de rareza (5). El tier sale de `rarityTierIndex` (`src/lib/rarityGlow.ts`, 0–4, un slug desconocido cae en 0) [IMPLEMENTADO]; los marcos por imagen sustituirían al material CSS actual del marco.

## 6. Renderer en la PWA

| Pieza | Estado | Uso |
|---|---|---|
| `Card` / `CardScene` | [IMPLEMENTADO] objeto 3D con revelado «Barrido», giro con resorte, levitación | Pasan a admitir la pila de capas además de `imageUrl`. |
| `EcodexTile` | [IMPLEMENTADO] mini carta propia | Sirve el baked. Sin lore bajo la baldosa (decisión deliberada). |
| `composeCard()` | por crear | Fuente de verdad para baked y export PNG. |
| `useTilt` | por crear, opcional | Giroscopio con permiso de iOS. Hoy solo hay puntero. |

- Máximo 1 a 3 `CardScene` vivas a la vez.
- WebP con alfa, capas a 720x1008 como base (2x de 360x504, proporción 2:3).
- Todo tamaño interior en `cqw` (la cara es el `container`).
- La carta con capas debe seguir funcionando en `reveal="scan"` y `reveal="none"`.
- **FX Eco por Fractae (fase posterior).** Cada Fractae tiene un **preset base** coherente con su arquetipo de World Bible §15.3, **parametrizable por especie**; no sustituye la regla de que el Eco de dos especies del mismo Fractae sea distinto. Se aplican solo a la capa de criatura:

| Fractae | Arquetipo canónico (§15.3) | Preset base de disolución |
|---|---|---|
| Alegría (Lumen) | Júbilo que le hace perder el control de la forma; casi ingrávida y radiante | Ascensión luminosa |
| Tristeza (Tristitia) | Duelo que le impide sostenerse; se disuelve cediendo su forma | Derretido hacia abajo |
| Furia (Ira) | Rabia que fractura su cuerpo desde dentro hasta la autodestrucción | Grietas y brasas desde el interior |
| Miedo (Pavor) | Pánico hasta la disolución total, el instante antes de desaparecer | Sombras que entran desde los bordes |
| Confianza (Fides) | Convicción absoluta; se vuelve un **monumento viviente** anclado a lo que cree | **Cristalización/petrificación estática** (corrige la v1, que proponía un fundido uniforme: lo contrario de «inamovible») |
| Asco (Fastidium) | Su rechazo la corroe; se **descompone en tiempo real** | Corrosión/descomposición (la v1 proponía evaporación con bruma, que no expresa la corrosión) |
| Sorpresa (Stupor) | Asombro congelado a mitad de un movimiento; fragmentada | Fragmentos de cristal congelados |
| Curiosidad (Spes) | Se disuelve en fragmentos que siguen buscando respuestas por separado | Dispersión en fragmentos que se alejan en espiral |

## 7. Seguridad y costes

**Corrección de la v1:** la protección `import.meta.env.DEV` y la exclusión del despliegue ya no son el modelo. El Art Studio vive en Admin, que **está desplegado** (`ecorex-admin.pages.dev`) con:

- **Autorización deny-by-default** en servidor: `admin/functions/api/admin/_middleware.ts` protege todo `/api/admin/*` salvo `login`; cada endpoint puede acotar por rol con `hasRole(...)` (`admin` pasa siempre; `art_editor` y `content_editor` solo lo suyo). Las mutaciones exigen `Origin` igual al host (CSRF). Cada acción sensible (aprobar, publicar, borrar) se registra con `writeAudit` en `admin_audit_log` (solo-añadir).
- **Secretos solo en servidor.** La clave de OpenAI vive en secretos de Pages y en `.dev.vars` local, nunca en el bundle ni en `VITE_*`.
- **Trampa de coste:** `wrangler pages dev` (también el de `admin/`) carga la `.dev.vars` de la **raíz**, con claves reales. Probar un endpoint de pago en local **sí factura**; los tests usan `fetch` simulado.
- **Frontera:** `admin/functions` y `functions` nunca importan de `tools/` (scripts locales con efectos).
- **Pago:** antes de cada generación, estimación de coste y confirmación explícita; idempotencia para evitar el doble clic; jobs `queued → running → succeeded | failed | cancelled`; resultados cacheados por hash de prompt más entradas.
- **Presupuesto por especie:** 3 criaturas (Balance manual en ChatGPT, Exceso y Eco por API) más fondo compartido por hábitat.
- No ejecutar comandos `--remote` de D1 ni `wrangler pages deploy` sin autorización explícita. Un push a `main` despliega la PWA a producción.

## 8. Plan por fases

Las fases se enganchan a las de Admin (§23 de su arquitectura: la fase 5 es la hoja de referencia, la 6 el motor de generación, la 7 las anclas de fase, la 8 la publicación).

1. **Renderer con assets mock** (ventana de 1 a 3 h): capas, `layout.json`, un marco y pop-out con *Tyrannosaurus imperator*, sobre `Card`/`CardScene`. Valida el efecto sin gastar API y **resuelve en dispositivo real (iOS incluido) los conflictos de §3**. Es lo más arriesgado y valioso, va primero.
2. Matting y **una especie completa** en vertical (disciplina «una especie completa antes de escalar»), siguiendo el piloto de Admin §22 con especies que ya tienen ficha.
3. Composition Editor.
4. Habitat Studio y Creature Studio como UI sobre el motor de generación de Admin (fase 6), con registro de jobs.
5. Bake, publicación y activación (fases 7–8 de Admin), incluida la migración de rutas de §4.5.
6. FX Eco por Fractae.

## 9. Criterios de aceptación

- Pop-out sin artefactos con inclinación de ±15 grados, con giro completo y sin que la capa B asome por el dorso.
- 60 fps en un móvil de gama media con una carta viva.
- Baked y vivo coinciden en reposo (diff visual).
- Ninguna clave en el bundle de producción ni de Admin.
- El EcoDex y Percibir sirven el baked sin llamadas de generación.
- Las rutas publicadas no rompen `sync-species-db.mjs`, no chocan con la caché `immutable` y `discoveries.image_url` de las especies ya publicadas sigue resolviendo.
- Un activo aprobado no se sobrescribe; publicar requiere permiso y acción explícita, y queda en `admin_audit_log`.
- Tests de autorización, validación y publicación (los de Admin usan `fetch` simulado y SQLite real).

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| `translateZ` y `mix-blend-mode` dan artefactos de GPU dentro de una cara 3D con `backface-visibility` (trampa ya pisada) | Alternativas 2D de §3; validar en GPU real en la fase 1. |
| Desajuste de luz entre fondo y criatura | Mismo bloque de estilo, `lightDir` del hábitat en el prompt, sombra de contacto y tinte en runtime. |
| Halos en el recorte | Descontaminación de borde y rechazo manual. |
| `preserve-3d` aplanado en Safari | Recorte solo por capa; probar en iOS real desde el paso 1. |
| Hábitats demasiado genéricos para especies de mood opuesto (p. ej. Miedo/Asco frente a Sorpresa/Confianza) | Mantener sub-hábitats con paleta y luz propias, como `pantano-oscuro` y `pantano-dorado`. |
| Caché `immutable` de un año sin hash | Rutas nuevas versionadas; nunca regenerar sobre un nombre ya publicado. |
| Importar un script `.mjs` sin guard de `main()` | Solo se reutilizan los builders del script con guard; el resto no se importa. |
| Ficha aprobada sin `habitatSlug` (dos fichas heredadas) | Asignarlo antes de generar su fondo. |

## 11. Cambios necesarios antes de implementar

Cambios que este spec **propone** y que no están en el canon:

**World Bible (v8):**
- §15.4 / §15.4.3: pasar de una imagen plana a una carta por capas más baked, formato vertical (`IMAGE_SIZE` de `generate-species-art.mjs` pasaría de `1536x1024` a `1024x1536`), y declarar si el fondo es por hábitat o por hábitat+fase.
- §15.4.3: sustituir el «pendiente de decidir» sobre cómo se resuelve en la app (¿`habitatSlug` en el esquema o dos URLs?) por la decisión que se adopte.
- §18.2: la capa visual ya no está «pendiente de portar»: `Card.tsx` y `CardScene.tsx` existen (diseño Foil); `cardCapture.ts` y `dinoCutout.ts` no existen. Actualizar.
- §18.3: reflejar dónde vive el hábitat de la especie, si se persiste.
- Registrar que el Art Studio pasa de «scripts offline» a módulo de Admin con generación asistida (con las salvaguardas de §7).

**Admin Architecture:**
- §14 y §32: quitar o matizar «no rediseñar el modelo para dos capas» y «no tratar el pipeline layered como vigente» cuando se apruebe.
- §16 y §31: cerrar el almacenamiento privado y dónde corre el procesado de imagen.
- §15: concretar las entidades de arte que cubran capas, `layout.json` y versiones.

**Código y datos:** la ruta de publicación de §4.5 y su migración de `discoveries.image_url` solo se ejecutan tras estas decisiones, con la migración aditiva aplicada a remoto antes del despliegue.
