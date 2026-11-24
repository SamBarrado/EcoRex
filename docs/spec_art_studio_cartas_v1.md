# Spec: Art Studio y cartas por capas (v1)

Estado: borrador para implementar con Claude Code. Fecha: 2026-11-24.
Depende de: `lore_world_bible_ecorex_v5.md` (secciones 15 y 18). Si algo choca con el world bible, este spec manda hasta que se actualice el bible (ver sección 11).

---

## 0. Objetivo y alcance

- **Art Studio**: herramienta de desarrollo (solo dev, no se despliega) para producir los assets de cada carta por capas.
- **Renderer PWA**: compone esas capas en cliente con inclinación, parallax y FX, y permite que partes de la criatura sobresalgan del marco (pop-out).
- **Fuera de alcance**: generación de imágenes en runtime, variantes dinámicas por usuario, Capacitor/nativo.

## 1. Decisiones

**Cerradas**

| # | Decisión |
|---|---|
| 1 | La carta es un conjunto de capas más un `layout.json` de composición, no una imagen única. |
| 2 | **Fondos y criaturas se generan por separado en el Art Studio.** Los fondos son una **biblioteca de hábitats/biomas** reutilizable entre especies; las criaturas se generan por especie+fase. |
| 3 | Pop-out = la criatura se dibuja dos veces: dentro de la ventana (detrás del marco) y otra vez por delante del marco, enmascarada a la zona que sobresale. |
| 4 | Texto, stats e iconos son DOM (i18n, copy como datos). Nunca dentro de la imagen generada. |
| 5 | El recorte de la criatura no depende de la API (en `gpt-image-2` el fondo transparente está en preview y hay reportes de halos). Se usa `rembg` offline o `@imgly/background-removal` (WASM en navegador). |
| 6 | Sin inpainting con máscara para limpiar fondos: el modelo no obedece la máscara de forma fiable. Los fondos se generan limpios, sin criatura. |
| 7 | Art Studio solo en dev. Producción sirve estáticos desde `public/` (coste cero, sin endpoints de generación). |
| 8 | Grids, regalos y export usan un WebP "baked". El detalle y la revelación usan capas vivas. |
| 9 | Formato vertical nativo (1024x1536) para fondos y criaturas. |

**Abiertas**

- Proporción final de carta (propuesta 5:7) y rectángulo de la ventana de arte: se fija al diseñar los 5 marcos.
- Lista cerrada de biomas: derivarla del campo hábitat de las fichas-spec existentes antes de generar nada.
- Si cada fase necesita variante de fondo o basta tinte y FX en runtime (por defecto: tinte y FX).
- Migración de las ~6 especies curadas (hoy 3:2 apaisadas) a vertical.

## 2. Modelo de capas (de abajo arriba)

| z | Capa | Recorte | Origen |
|---|---|---|---|
| 0 | Fondo de bioma | A la ventana de arte | Biome Studio (1 por bioma) |
| 1 | Sombra de contacto | A la ventana | Runtime, desde `shadow` del layout |
| 2 | Criatura A (interior) | A la ventana | Cutout con alfa |
| 3 | Marco por rareza | Silueta de la carta | 5 PNG/WebP con ventana transparente (hechos una vez) |
| 4 | Criatura B (pop-out) | Máscara `popout.path` | El mismo cutout |
| 5 | FX (holo por rareza, tinte de fase, disolución Eco) | Máscara con alfa de criatura o marco | Runtime |
| 6 | Texto y stats | Ninguno | DOM |

## 3. Pop-out: reglas de implementación

- El contenedor de la carta **no** lleva `overflow:hidden`, `border-radius` con recorte, `filter`, `mask`, `clip-path` ni `opacity<1`: aplanan `preserve-3d`. El recorte va en cada capa, nunca en el padre.
- Las esquinas redondeadas pertenecen al fondo y al marco, no al contenedor.
- `popout.path` es un path SVG con coordenadas normalizadas 0..1. Usar `<clipPath clipPathUnits="objectBoundingBox">` en un SVG inline (o convertir a px según el tamaño de carta).
- Parallax: `perspective` en el padre y `translateZ` por capa; amplitud máxima por capa en `layout.parallax`.
- Inclinación: puntero en escritorio, `DeviceOrientation` en móvil. En iOS hay que llamar a `DeviceOrientationEvent.requestPermission()` desde un gesto del usuario.

## 4. Art Studio: módulos

### 4.1 Biome Studio (fondos)

- **Entrada**: ficha de bioma (`biomes.json`): `id`, nombre ES/EN, ambiente, paleta, dirección de luz, hora del día, elementos de terreno y vegetación.
- **Generación**: vertical 1024x1536, **sin criaturas ni personajes**, zona central más calmada (ahí irá la criatura), perspectiva atmosférica (fondo más suave y desaturado, ver `FIGURE_GROUND_SEPARATION` del script actual), mismo estilo ilustrado de tinta y cel-shading del pivote visual.
- **Salida**: `public/biomes/{biome_id}/bg.webp` y metadatos en `biomes.json`: `lightDir`, `palette[]`, `horizonY`, `groundY` (para colocar la sombra de contacto).
- **Reutilización**: `species.biome_id` apunta al bioma. Varias especies comparten fondo, y las fases se diferencian por tinte y FX en runtime. Esto reduce las llamadas de imagen, que es el único gasto variable.

### 4.2 Creature Studio (criaturas)

- **Entrada**: ficha-spec de la especie, fase, y ancla de Balance (para edits de Exceso y Eco).
- **Reglas del prompt**: cuerpo completo, **sin cortar en ningún borde**, margen generoso, fondo plano de color neutro y contrastado con la paleta, vertical, mismo estilo (contorno de tinta gruesa, 2-3 tonos por superficie, mate). Exceso y Eco con pose y encuadre propios (ver `buildExcesoPrompt` y `buildEcoPrompt`).
- **Flujo**: Balance se diseña a mano en ChatGPT (como hoy) y se importa. Exceso y Eco se generan por `images/edits` sobre Balance.
- **Recorte**: matting, descontaminación de color en el borde (fringe) y revisión visual de halo. Rechazar si hay halo.
- **Salida**: `especies_design/{slug}/{phase}/creature.raw.png` (original) y `creature.webp` (alfa).

### 4.3 Composition Editor

- Carga fondo de bioma, criatura, marco y rareza elegidos.
- Controles: arrastrar, escalar, rotar y voltear la criatura; dibujar el polígono de pop-out; ajustar sombra, parallax y FX.
- Preview 3D en vivo con inclinación.
- Guarda `layout.json`.

### 4.4 Bake y export

- `composeCard()` (canvas 2D, `src/lib/cardCompose.ts`) compone todas las capas en un WebP estático. `html2canvas` suele fallar con 3D, blend modes y máscaras, así que no se usa para esto.
- El `baked.webp` es el valor de `species_phase_anchors.image_url`, así Ecodex, Descubrir y Regalo siguen funcionando igual (el regalo sirve siempre la imagen ya generada).

### 4.5 Flujo candidato a producción

- Iterar siempre en `especies_design/` (candidatos).
- "Promover" **copia** (no mueve) a `public/species-art/{slug}/{phase}/` los archivos `creature.webp`, `layout.json` y `baked.webp`, y genera el SQL seed del `biome_id` de la especie.
- Mantiene la convención actual: lo que no está en `public/` no se sirve.

## 5. Modelo de datos

D1: solo `species.biome_id` (vía seed). Todo lo demás son estáticos versionados en git, sin migraciones.

```ts
type Phase = 'balance' | 'exceso' | 'eco';

interface Biome {
  id: string;
  nameEs: string;
  nameEn: string;
  lightDir: { x: number; y: number };   // dirección de la luz
  palette: string[];
  horizonY: number;                      // 0..1
  groundY: number;                       // 0..1, para la sombra
  bg: string;                            // ruta a bg.webp
}

interface CardLayout {
  version: 1;
  speciesSlug: string;
  phase: Phase;
  biomeId: string;
  creature: { x: number; y: number; scale: number; rotationDeg: number; flipX?: boolean };
  popout?: { path: string; part: 'head' | 'claw' | 'tail' | 'wing' | 'other' };
  shadow?: { enabled: boolean; opacity: number; blur: number };
  parallax: { bg: number; creatureInner: number; frame: number; creaturePop: number }; // px máx
  fx: { preset: string; intensity: number };
}
```

Marcos: `public/frames/{tier}.webp` más `frames.json` con `windowRect` normalizado y radio de esquina, uno por tier de rareza (5).

## 6. Renderer en la PWA

| Pieza | Uso |
|---|---|
| `CardScene` | Capas vivas con 3D y parallax. Solo en detalle y revelación. |
| `CardStatic` | Imagen baked. Grid de Ecodex, listas, regalos. |
| `composeCard()` | Fuente de verdad para baked y export PNG. |
| `useTilt` | Puntero y giroscopio con gestión del permiso de iOS. |

- Máximo 1 a 3 `CardScene` vivas a la vez.
- WebP con alfa, capas a 720x1008 como base (2x de 360x504).
- FX de rareza: foil con gradientes y `mix-blend-mode`, enmascarado con el alfa de criatura o marco.
- FX Eco por Fractae (fase posterior): cada una de las 8 se disuelve distinto (Furia como brasas, Tristeza derritiéndose hacia abajo, Sorpresa en fragmentos de cristal, Miedo con sombras desde los bordes, Alegría ascendiendo, Confianza con fundido uniforme, Curiosidad en espiral hacia fuera, Asco evaporándose con bruma). Se aplican solo a la capa de criatura gracias a la separación de capas.

## 7. Seguridad y costes

- La clave de OpenAI vive en `.dev.vars`, nunca en el bundle. Las rutas del Art Studio están protegidas con `import.meta.env.DEV` y se excluyen del despliegue.
- Antes de cada llamada: estimación de coste y confirmación. Resultados cacheados por hash de prompt más entradas.
- Presupuesto por especie: 3 criaturas (Balance manual en ChatGPT, Exceso y Eco por API) más fondo compartido por bioma.
- No ejecutar comandos `--remote` de D1 ni `wrangler pages deploy` sin autorización explícita de Sam.

## 8. Plan por fases (ventanas de 1 a 3 h)

1. **Renderer con assets mock**: `CardScene`, `layout.json`, un marco, pop-out con *Tyrannosaurus imperator*. Valida el efecto sin gastar API. Es lo más arriesgado y lo más valioso, va primero.
2. Script de matting y **una especie completa** en vertical (disciplina "una especie completa antes de escalar").
3. Composition Editor.
4. Biome Studio y Creature Studio (UI sobre los scripts existentes).
5. Bake, export e integración en Ecodex y Descubrir.
6. FX Eco por Fractae.

## 9. Criterios de aceptación

- Pop-out sin artefactos con inclinación de ±15 grados.
- 60 fps en un móvil de gama media con una carta viva.
- Baked y vivo coinciden en reposo (diff visual).
- Ninguna clave en el bundle de producción.
- Regalo y Ecodex sirven `baked.webp` sin llamadas de generación.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Desajuste de luz entre fondo y criatura | Mismo bloque de estilo, `lightDir` del bioma en el prompt, sombra de contacto y tinte en runtime. El estilo cel-shading lo tolera bien. |
| Halos en el recorte | Descontaminación de borde y rechazo manual en el Studio. |
| `preserve-3d` aplanado en Safari | Recorte solo por capa, probar en iOS real desde el paso 1. |
| Biomas demasiado genéricos | Empezar con pocos y bien curados; añadir más con las oleadas de especies. |

## 11. Cambios necesarios en el world bible

- Sección 15.4: las anclas pasan a ser 3 capas más baked, formato vertical. `IMAGE_SIZE` de `generate-species-art.mjs` pasa de 1536x1024 a 1024x1536.
- Sección 15.4 y "Ways of working": se decidió "scripts offline, no paneles in-app". Este spec define el Art Studio como herramienta **solo dev**, compatible con esa decisión; reflejarlo.
- Sección 18.2: `Card.tsx`, `CardScene.tsx`, `cardCapture.ts` y `dinoCutout.ts` se recablean o sustituyen según este spec.
- Sección 18.3: añadir `species.biome_id` y la tabla estática de biomas.
