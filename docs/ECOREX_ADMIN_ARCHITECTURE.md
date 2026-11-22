# Ecorex Admin & Art Studio
## Especificación funcional, técnica y plan de implementación

**Versión:** 1.1  
**Fecha:** 22 de noviembre de 2026  
**Fuente canónica:** `docs/lore_world_bible_ecorex_v6.md`  
**Fuente operativa complementaria:** README del pipeline `tools/species/`  
**Destino de implementación:** repositorio `ecorex-project`, trabajando con VS Code y Claude Code

---

## 0. Cómo utilizar este documento

Este documento es la especificación de referencia para construir el entorno privado de administración y producción de contenido de Ecorex. Está escrito para que una persona y Claude Code puedan trabajar sobre el mismo contrato.

### Jerarquía de fuentes

Esta jerarquía replica el contrato de autoridad definido en la sección 0.1 de la World Bible v6:

1. **Canon del universo y reglas de producto:** `docs/lore_world_bible_ecorex_v6.md`. Es la autoridad normativa para lore, Fractae, fases, naming, vocabulario, mecánicas, especies y reglas visuales. Admin debe implementarla, nunca redefinirla.
2. **Hechos paleontológicos:** fuentes científicas trazables consultadas por Species Discovery (PBDB, NHM Dino Directory y otras referencias registradas). Sustentan los hechos científicos de las especies; no deciden lore, Fractae ni mecánicas. Las discrepancias e incertidumbres deben conservarse.
3. **Estado realmente implementado:** código, migraciones, esquema y datos del repositorio. Son la autoridad para describir qué funciona hoy, pero no sustituyen al canon. Las desviaciones respecto a World Bible v6 se registran y resuelven explícitamente.
4. **Procedimientos operativos:** README de `tools/species/` y scripts existentes. Describen cómo funciona el tooling; no pueden contradecir el canon.
5. **Esta arquitectura:** especifica cómo implementar Admin y Art Studio respetando World Bible v6. Las propuestas técnicas no se convierten automáticamente en canon ni en funcionalidad implementada.
6. **Versiones anteriores:** v5 y anteriores son histórico y trazabilidad, no fuentes vigentes. No recuperar de ellas reglas retiradas o completar silenciosamente huecos de v6.

**Regla de conflicto:** identificar primero el dominio de la afirmación y consultar la fuente que tiene autoridad en ese dominio. Si existe una discrepancia dentro del mismo dominio o no hay evidencia suficiente, registrarla como pendiente; no resolverla por inferencia silenciosa. Un cambio de canon exige nueva versión de World Bible y posterior sincronización de Admin, fichas-spec, prompts, tooling y código afectados.

### Etiquetas usadas

- **[CANÓNICO v6]** Regla explícita de la World Bible v6.
- **[EXISTENTE según README y estado descrito en World Bible v6; verificar en código]** Funcionalidad descrita como existente; debe comprobarse en el código antes de integrarla.
- **[DECISIÓN]** Decisión arquitectónica recomendada para el proyecto.
- **[PROPUESTA]** Diseño recomendado pendiente de validación técnica.
- **[VERIFICAR]** Punto que Claude Code debe comprobar en el repositorio.

### Objetivo

Construir una consola privada que permita gestionar el ciclo de vida del bestiario:

**descubrimiento paleontológico → ficha-spec → aprobación editorial → identidad visual → Creature Bible Sheet → arte Balance/Exceso/Eco → QA → aprobación → publicación en Ecorex.**

El sistema no debe interferir con la experiencia pública del jugador ni alterar mecánicas de juego existentes.

---

# PARTE I — VISIÓN Y ARQUITECTURA

## 1. Visión del producto

Ecorex Admin es el entorno interno desde el que se administra y produce el contenido del universo Ecorex. Tendrá dos módulos principales:

1. **Species Discovery:** descubrir géneros/especies reales, contrastar fuentes paleontológicas, preparar y revisar fichas-spec, asignar Fractae y edición.
2. **Ecorex Art Studio:** convertir una ficha-spec aprobada en una identidad visual documentada y producir las imágenes ancla de sus fases.

Los módulos comparten catálogo, identificadores, contratos de datos y estados de producción, pero mantienen responsabilidades separadas.

### Principios

- El juego público consume contenido aprobado; no participa en su producción.
- Discovery no publica automáticamente especies en el juego.
- Art Studio no publica automáticamente generaciones.
- Toda publicación requiere una acción explícita y autorizada.
- Los activos aprobados son inmutables: una revisión crea una nueva versión.
- Las decisiones paleontológicas y de lore no se delegan ciegamente al modelo generativo.
- La IA propone; el administrador valida.
- Los scripts locales existentes se conservan durante la migración.
- No se duplica el catálogo de especies, Fractae ni las anclas existentes.

## 2. Decisión arquitectónica

**[DECISIÓN] Un único repositorio Git, tres áreas de ejecución y dos superficies de aplicación.**

| Área | Responsabilidad | Acceso |
|---|---|---|
| Ecorex PWA | Juego y experiencia de jugadores | Público |
| Ecorex Admin | Discovery, gestión del bestiario y Art Studio | Privado |
| Production Tooling | Scripts locales, mantenimiento y operaciones de contenido | Local/CLI |

### Superficies y despliegues

- PWA: mantiene su despliegue actual en Cloudflare Pages.
- Admin: aplicación privada, desplegable de forma independiente; destino conceptual `admin.ecorex.org`.
- Tooling: se ejecuta desde la raíz del repositorio, sin URL pública.

La URL `admin.ecorex.org` es una propuesta, no un despliegue existente ni una decisión de DNS ya ejecutada.

### Por qué un monorepo

Discovery y Art Studio comparten entidades, tipos, reglas de validación, catálogo, Fractae, ediciones, almacenamiento e historial. Separarlos ahora en repositorios distintos duplicaría contratos y elevaría el coste de sincronización.

La separación se consigue mediante aplicaciones, módulos, límites de importación, permisos y despliegues; no hace falta separar repositorios.

### Diagrama lógico

```text
                         ECOREX PROJECT (monorepo)
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  PUBLIC APP                         PRIVATE ADMIN                   │
│  ┌──────────────────────┐          ┌─────────────────────────────┐  │
│  │ Ecorex PWA           │          │ Ecorex Admin                │  │
│  │ React + Vite + PWA   │          │                             │  │
│  │                      │          │  ┌───────────────────────┐  │  │
│  │ Inicio               │          │  │ Species Discovery     │  │  │
│  │ Percibir             │          │  │ PBDB / NHM / sources  │  │  │
│  │ EcoDex               │          │  │ ficha-spec / review   │  │  │
│  │ Yo                   │          │  └───────────────────────┘  │  │
│  │ Fusión               │          │  ┌───────────────────────┐  │  │
│  │ Notificaciones       │          │  │ Ecorex Art Studio     │  │  │
│  └──────────┬───────────┘          │  │ reference sheets      │  │  │
│             │                      │  │ generation / QA       │  │  │
│             │                      │  │ approval / publishing │  │  │
│             │                      │  └───────────────────────┘  │  │
│             │                      └──────────────┬──────────────┘  │
│             │                                     │                 │
│             └─────────────────┬───────────────────┘                 │
│                               ▼                                     │
│                    Shared server-side services                     │
│                 Pages Functions / Admin API / D1 / KV              │
│                               │                                     │
│                    Approved production content                     │
│                               │                                     │
│  LOCAL TOOLING                ▼                                     │
│  ┌──────────────────────┐  Public assets / D1 catalog               │
│  │ tools/species        │                                         │
│  │ PBDB discovery       │                                         │
│  │ spec generation      │                                         │
│  │ art scripts          │                                         │
│  │ sync / maintenance   │                                         │
│  └──────────────────────┘                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Stack existente y restricciones

**[CANÓNICO v6, §18]**

- Cloudflare Pages.
- Cloudflare Pages Functions.
- Cloudflare D1 (SQL).
- Cloudflare KV.
- Frontend React + Vite.
- PWA mediante `vite-plugin-pwa`.

R2 fue retirado el 16-11-2026 junto con la mecánica de variantes visuales únicas. No debe asumirse que R2 está disponible o configurado.

**[DECISIÓN]** No migrar de stack para construir Admin. La aplicación Admin puede tener su propia build y despliegue, reutilizando la infraestructura existente donde sea seguro y apropiado.

**[VERIFICAR]** Claude Code debe inspeccionar `package.json`, configuración Vite, `wrangler`, `functions/`, `migrations/`, auth, bindings y pipelines antes de proponer rutas o carpetas definitivas.

### Restricción de importación

El README del pipeline establece que `tools/species/` es tooling local: nada de esa carpeta se despliega ni lo importa la app (`src/`, `functions/`, `workers/`). Mantener esta frontera durante la primera integración.

No importar directamente scripts de CLI con efectos secundarios desde Pages Functions. Extraer lógica pura compartida solo después de inspeccionar dependencias y efectos secundarios.

---

# PARTE II — SPECIES DISCOVERY

## 4. Función y alcance

Species Discovery es el punto de entrada de nuevas especies al bestiario. Su misión es apoyar decisiones editoriales con datos paleontológicos reales y producir fichas-spec revisables.

No es un generador libre de dinosaurios ficticios: los portadores de los Fractae son dinosaurios y la especie debe tener base paleontológica.

### Fuentes documentadas en el pipeline

- Paleobiology Database (PBDB): búsqueda de géneros y registros.
- NHM Dino Directory.
- dinosaurpictures.org.

El README indica que `generate-species-spec.mjs` genera una ficha con grounding en NHM, dinosaurpictures.org y PBDB; `lookup-species.mjs` muestra las respuestas de las tres fuentes; `discover-species-pbdb.mjs` ofrece una herramienta web local para buscar candidatos en PBDB y generar/guardar su ficha.

La disponibilidad, cobertura, términos de uso y fiabilidad de cada fuente deben seguir mostrándose con transparencia. No inventar datos ausentes.

## 5. Flujo Discovery

1. Buscar un género por nombre científico o filtrar candidatos.
2. Consultar registros paleontológicos en PBDB.
3. Aplicar filtros disponibles (por ejemplo, grupo, época, país y mínimo de ocurrencias/fósiles, según la interfaz existente).
4. Verificar si ya existe en el proyecto y en qué edición/Fractae.
5. Abrir el candidato y consultar datos de NHM, dinosaurpictures.org y PBDB.
6. Generar una ficha-spec mediante Anthropic con los datos recuperados como grounding.
7. Guardar como borrador en el catálogo de trabajo.
8. Revisar hechos, incertidumbres, nomenclatura y lore.
9. Aprobar editorialmente.
10. Solo después, habilitar su paso al catálogo de producción y al Art Studio.

### Estados recomendados

- `candidate`: candidato encontrado.
- `researching`: investigación en curso.
- `spec_draft`: ficha generada, pendiente de revisión.
- `needs_revision`: requiere correcciones.
- `approved`: ficha aprobada.
- `rejected`: descartada.
- `promoted`: incorporada al catálogo de producción.

Estos estados son una propuesta de workflow; no asumir que ya existen en D1.

## 6. Ficha-spec como contrato entre módulos

La ficha-spec aprobada es el contrato principal entre Discovery y Art Studio.

**[CANÓNICO v6, §18.3]** La tabla `species` ya representa especie/ficha-spec y contiene, entre otros, `physical_traits`, `base_palette` y `silhouette`.

**[VERIFICAR]** El esquema exacto del JSON en `tools/species/lote.json`, `species.example.json`, `scripts/seed.sql` y migraciones debe leerse desde el repositorio. No crear un nuevo formato incompatible.

### Principios del contrato

- Mantener los campos canónicos actuales.
- Preservar los nombres científicos y populares.
- Mantener el vínculo con Fractae.
- Mantener `edition` como oleada/edición según el README.
- Mantener `habitatSlug` y el catálogo canónico de hábitats documentado en World Bible v6.
- Incorporar procedencia de fuentes y grado de certeza sin sobrescribir hechos paleontológicos.
- Diferenciar datos científicos, interpretación creativa y decisiones de diseño.
- Validar el JSON con un schema versionado (por ejemplo, Zod/JSON Schema) tras verificar las dependencias ya instaladas.

### Datos de procedencia recomendados

Por cada afirmación paleontológica importante, conservar cuando sea posible:
- fuente,
- URL o identificador de registro,
- dato observado,
- fecha de consulta,
- nivel de confianza o nota de incertidumbre.

Si el pipeline actual no puede asociar una fuente a cada campo, empezar guardando las respuestas originales y un resumen de fuentes por ficha. No fabricar citas campo a campo.

### Catálogo de trabajo y producción

El README documenta:
- `tools/species/lote.json`: 54 fichas-spec.
- `tools/species/species.wave1.json`: descrito en README como cinco fichas de Wave 1 duplicadas en `lote.json`.

World Bible v6 aclara que `species.wave1.json` está vacío de entradas. Esta discrepancia documental debe verificarse directamente antes de migrar o sincronizar. No asumir que la descripción antigua del README refleja el archivo actual.

**[DECISIÓN]** `lote.json` puede seguir siendo fuente de trabajo durante la primera fase, pero no debe convertirse indefinidamente en una base de datos multiusuario. La interfaz debe guardar borradores, versiones y aprobaciones en un almacenamiento adecuado cuando se defina la migración.

## 7. Integración de scripts existentes

| Script/archivo | Función documentada | Decisión |
|---|---|---|
| `discover-species-pbdb.mjs` | UI local PBDB + candidatos + ficha | Reutilizar; integrar progresivamente |
| `lookup-species.mjs` | Consulta de tres fuentes | Reutilizar |
| `generate-species-spec.mjs` | Ficha-spec con grounding; Anthropic | Reutilizar y encapsular |
| `lote.json` | Catálogo de 54 fichas | Mantener como legado/fuente de trabajo inicial |
| `species.wave1.json` | Wave 1; estado discrepante | Verificar antes de usar |
| `generate-species-art.mjs` | Arte de fases; pipeline escena plana vigente | Mantener |
| `print-species-prompt.mjs` | Imprime prompt sin generar | Integrar como herramienta de inspección |
| `sync-species-db.mjs` | Sincroniza carpetas de arte a seed/D1 local | Mantener, revisar idempotencia |
| `convert-species-art-to-webp.mjs` | PNG a WebP | Mantener |
| `generate-species-art-layered.mjs` | Pipeline experimental de dos capas | No usar como pipeline vigente |
| `composite-species-art.mjs` | Composición/QA de dos capas | No confundir con publicación vigente |

### Advertencias operativas documentadas

- `generate-species-art.mjs` tiene un guard de `main()`. Importarlo como módulo; ejecutarlo con argumentos inesperados puede disparar una generación de pago.
- `scripts/seed.sql` utiliza `INSERT OR IGNORE`; no actualiza registros existentes.
- `discoveries.image_url` es una copia por usuario, no una referencia viva. Cambiar rutas de imagen de especies ya publicadas requiere migrar también `discoveries` en local y remoto.
- `db:seed:remote` debe seguir siendo una acción manual, explícita y consciente.
- Las claves `OPENAI_API_KEY` y `ANTHROPIC_API_KEY` se leen del entorno o `.dev.vars`; nunca exponerlas al cliente.

---

# PARTE III — ECOREX ART STUDIO

## 8. Función y filosofía

Art Studio transforma una ficha-spec aprobada en una identidad visual controlada y en activos artísticos aptos para el juego.

La unidad de trabajo es la especie, no una generación aislada.

Cada especie debe reunir:
- ficha-spec aprobada,
- Creature Bible Sheet,
- ancla Balance,
- ancla Exceso,
- ancla Eco,
- historial de generación y revisión,
- estado de publicación.

La IA genera propuestas. La aprobación canónica siempre es humana.

## 9. Creature Bible Sheet — hoja de referencia visual

La hoja de referencia es el contrato visual de una criatura. Se inspira en la lámina proporcionada por el usuario (ejemplo: Esmeraldón): vistas anatómicas limpias, detalle de cabeza, ilustración ambiental, paleta extraída y rasgos que nunca cambian.

No es una única imagen generada que se acepta sin revisar. Debe ser una composición de activos independientes, editables y versionados.

### Componentes

1. **Perfil izquierdo:** silueta lateral y proporciones.
2. **Vista frontal:** anchura, simetría, orientación de extremidades y cuello/cabeza.
3. **Vista trasera:** cola, cadera, extremidades y placas/ornamentos.
4. **Vista tres cuartos:** volumen y relación entre planos.
5. **Cabeza en perfil o tres cuartos:** hocico, ojos, cráneo, pico/dentición y rasgos diagnósticos.
6. **Detalles anatómicos:** placas, cuernos, garras, piel, escamas, crestas u otros elementos propios.
7. **Paleta cromática:** muestras con valores HEX y función (base, sombra, luz, marcas, acento, energía).
8. **Ilustración ambiental:** representación de la criatura en su hábitat, útil para tono, escala y relación con entorno.
9. **Rasgos invariables:** lista textual explícita de características que no pueden cambiar.

### Datos que acompañan a cada vista

- tipo de vista,
- imagen original,
- versión,
- prompt,
- modelo y parámetros,
- referencias utilizadas,
- fecha,
- estado (candidate/review/approved/rejected),
- comentarios de revisión.

### Construcción recomendada

1. Crear un brief a partir de la ficha-spec.
2. Generar/subir una primera imagen de diseño (normalmente Balance) y revisarla.
3. Usarla como referencia de identidad para producir vistas individuales.
4. Generar cada vista por separado cuando se necesite precisión anatómica; no depender de una única generación de nueve paneles para validar todas las vistas.
5. Revisar correspondencia entre vistas: mismo número de dedos, placas, proporciones, marcas, colores y rasgos.
6. Extraer paleta como propuesta; permitir corrección manual.
7. Escribir y aprobar los rasgos invariables.
8. Componer la lámina a partir de los activos aprobados.
9. Congelar la versión aprobada. Cualquier cambio genera una versión nueva.

### Regla crítica

La hoja de referencia no sustituye a la ficha-spec ni a la imagen ancla de fase. La ficha-spec documenta especie/lore; la hoja documenta identidad visual; las anclas son los activos que consume el juego.

## 10. Dirección artística y anatomía

La dirección artística debe respetar las reglas vigentes de World Bible v6 y los prompts reales del repositorio. No sustituirlas por una guía estética inventada.

Las preferencias visuales previamente definidas para el proyecto incluyen una ilustración TCG de influencia anime, contorno marcado, sombreado por planos, acabado mate y volumen estilizado, evitando el fotorrealismo. Claude Code debe extraer y conservar el prompt maestro exacto desde `print-species-prompt.mjs` y la documentación vigente antes de codificar una segunda versión.

### Jerarquía de restricciones

1. Anatomía y silueta paleontológicamente plausibles.
2. Rasgos diagnósticos de la especie.
3. Identidad del Fractae y su expresión.
4. Diferenciación de fase.
5. Dirección artística global.
6. Pose, cámara, entorno e iluminación.

Una variación de pose no puede modificar la identidad anatómica. Los rasgos invariables aprobados en la Creature Bible Sheet tienen prioridad en los prompts posteriores.

## 11. Fases canónicas y generación de anclas

**[CANÓNICO v6, §5]** Las fases son:
- **Balance:** forma estable/base.
- **Exceso:** forma desbordada/intensificada.
- **Eco:** forma tenue, casi fantasmal.

No usar “Furia” como nombre de fase: Furia es un Fractae (Ira), y la fase se llama Exceso.

### Flujo canónico

**Balance**
- Diseñado y aprobado como identidad raíz.
- En el pipeline actual, Balance se genera manualmente en ChatGPT con el prompt de `print-species-prompt`.
- Se incorpora al repositorio como activo fuente y se revisa.

**Exceso**
- Se genera mediante image-to-image desde el Balance aprobado.
- Debe expresar intensificación/desbordamiento, no cambiar de especie.
- Debe conservar anatomía, paleta/rasgos de identidad y lectura de la criatura.

**Eco**
- Se genera mediante image-to-image desde el mismo Balance aprobado.
- Debe ser tenue/casi fantasmal, sin perder identidad de especie.
- No debe generarse encadenando Exceso.

**Regla de independencia:** Exceso y Eco parten del mismo Balance aprobado. No generar Eco desde Exceso ni Exceso desde Eco.

El README indica que el script `generate-species-art.mjs` es el pipeline vigente de escena plana y que Balance se genera manualmente, mientras Exceso y Eco usan `npm run species:art`. Verificar el comportamiento exacto del script antes de integrarlo.

### No confundir fases con obtención del jugador

El Art Studio produce y publica anclas. No implementa la lógica de cómo el jugador obtiene fases:
- Balance: flujo principal de Percibir.
- Exceso: cinco cartas Balance de la misma especie se fusionan en el Altar de Fusión.
- Eco: drop raro del 5 % en Percibir, solo para especies cuyo Balance el usuario ya registró; lo decide el servidor.

Estas mecánicas pertenecen al juego y su estado se conserva en la fotografía de implementación heredada por World Bible v6. No modificarlas al construir el panel de producción sin una decisión explícita.

## 12. Pipeline de generación

### Bloques de prompt recomendados

- Species Identity: taxón, morfología y rasgos.
- Anatomy Lock: anatomía y proporciones invariables.
- Fractae Identity: emoción y manifestación correspondiente.
- Phase Modifier: Balance/Exceso/Eco.
- Habitat & Ecology: hábitat y contexto.
- Master Art Direction: estilo aprobado.
- Composition & Camera: encuadre, escala, pose.
- Figure-Ground: separación visual criatura/fondo.
- Negative Constraints: errores anatómicos/estéticos a evitar.

Cada bloque debe poder inspeccionarse y versionarse. El prompt final completo debe guardarse con cada job.

### Registro mínimo de una generación

- ID de job.
- especie y fase,
- tipo de activo (ancla, vista de hoja, detalle, ambiente),
- prompt exacto,
- versión de plantilla,
- modelo/proveedor,
- parámetros de generación,
- referencias y sus versiones,
- usuario que lanzó el job,
- timestamps,
- estado,
- resultado(s),
- error si existe,
- coste/uso reportado por proveedor si está disponible.

### Estados de job

`queued → running → succeeded | failed | cancelled`

No lanzar operaciones costosas por doble clic. Usar idempotency key o mecanismo equivalente. Mostrar confirmación antes de iniciar trabajos que facturen.

### Proveedor de imágenes

El README actual menciona OpenAI para el pipeline de arte, pero el modelo/API concreto debe verificarse al implementar. No codificar nombres de modelos, endpoints o tamaños por suposición. Centralizar el proveedor en un adaptador server-side.

Las claves deben vivir en secretos del entorno de servidor. Nunca en variables `VITE_*`, bundle frontend, logs públicos ni repositorio.

## 13. QA y revisión humana

El QA asistido puede evaluar:
- fidelidad anatómica,
- identidad de especie,
- identidad Fractae,
- identidad de fase,
- correspondencia con la Creature Bible Sheet,
- dirección artística,
- composición,
- separación figura/fondo,
- formato/dimensiones.

Los scores son orientativos. No deben aprobar automáticamente activos canónicos.

### Revisión humana

Acciones:
- Aprobar.
- Rechazar.
- Solicitar cambios.
- Regenerar con instrucciones.
- Comparar con versiones anteriores.
- Consultar prompt y referencias.

Un activo aprobado no se sobrescribe. Se crea una versión nueva y se conserva la anterior.

## 14. Asset Library y publicación

Separar claramente:
- originales,
- borradores,
- propuestas,
- vistas de referencia,
- hojas compuestas,
- anclas aprobadas,
- activos publicados.

La publicación debe ser una operación transaccional o recuperable:
1. comprobar permisos,
2. validar que existe la ficha-spec aprobada,
3. validar los activos aprobados requeridos,
4. validar formato y rutas,
5. publicar/copiarlos a la ubicación de producción,
6. actualizar `species_phase_anchors`,
7. verificar URLs y lecturas,
8. registrar quién publicó y qué versión,
9. permitir rollback controlado.

**[CANÓNICO v6, §18.3]** `species_phase_anchors` utiliza `species_id`, `phase`, `image_url`. El esquema actual contempla una imagen por especie/fase.

El pipeline de dos capas (fondo + recorte) existe como experimento, pero World Bible v6 conserva la constatación de v5 de que no está implementado en el schema ni es el pipeline activo. No rediseñar el modelo para dos capas en el MVP sin una decisión explícita.

---

# PARTE IV — DATOS, SEGURIDAD Y OPERACIÓN

## 15. Modelo de datos: extensión sin duplicación

Las entidades de producto ya existentes deben reutilizarse:
- `species`
- `fractae`
- `operations`
- `species_phase_anchors`
- y las tablas actuales del juego.

**[CANÓNICO v6, §18.3]** La rareza se sortea independientemente en cada captura; no es atributo fijo de especie ni de fase. No añadir rareza fija a `species` o `species_phase_anchors`.

### Entidades administrativas propuestas

Estas son propuestas de diseño, no tablas que se afirme que existen.

| Entidad propuesta | Propósito |
|---|---|
| `species_research` o equivalente | Consultas y fuentes del proceso Discovery |
| `species_spec_versions` | Versiones de la ficha-spec y estados editoriales |
| `creature_reference_sheets` | Versiones de Creature Bible Sheet |
| `creature_reference_assets` | Vistas, detalles, muestras y ambiente |
| `art_generation_jobs` | Cola e historial de generaciones |
| `art_assets` | Metadatos y localización de activos |
| `art_reviews` | Revisiones, comentarios y decisiones |
| `art_prompt_templates` | Plantillas y versiones de prompts |
| `admin_audit_log` | Registro de acciones sensibles |

No crear estas tablas sin comprobar si el proyecto ya dispone de estructuras equivalentes.

### Versionado

- Cada versión debe tener ID estable.
- No editar un aprobado en el sitio.
- Mantener relación con la versión de ficha-spec y hoja visual utilizadas.
- Registrar las referencias exactas usadas para cada generación.
- Permitir identificar qué versión está publicada actualmente.

## 16. Almacenamiento

Distinguir:
1. D1: metadatos, estados, relaciones, historial.
2. Almacenamiento de ficheros: imágenes originales, drafts, vistas y exportaciones.
3. Public assets: imágenes públicas aprobadas que consume la PWA.

R2 figura como retirado de la arquitectura actual en el estado documentado por World Bible v6 (heredado de v5). La alternativa persistente para borradores y originales está **pendiente de decisión**. Evaluar almacenamiento compatible con Cloudflare u otro proveedor, coste, acceso privado, URLs firmadas, retención y backup. No asumir que el filesystem local o `public/` es almacenamiento privado persistente del Admin desplegado.

Para el MVP local, puede mantenerse un flujo basado en archivos del repositorio, pero debe documentarse como etapa temporal y evitar guardar secretos o datos sensibles en Git.

## 17. Seguridad y roles

### Acceso

Ecorex Admin debe estar separado de la PWA pública y protegido en backend.

Roles iniciales propuestos:
- `admin`: todo el entorno, aprobaciones y publicación.
- `art_editor`: hojas visuales, generaciones y revisiones de arte.
- `content_editor`: Discovery, fichas-spec y revisión editorial.

Inicialmente puede existir solo el administrador principal. Diseñar roles para ampliación futura, sin sobreingeniería.

### Requisitos

- Comprobar autorización en cada endpoint.
- No confiar en ocultar botones en frontend.
- Reutilizar el sistema de autenticación existente solo tras verificar que satisface el modelo de acceso administrativo.
- Separar sesiones/roles de administración si es necesario.
- Proteger contra CSRF según el patrón de sesión usado.
- Validar inputs y limitar tamaño/tipo de ficheros.
- Rate limit en operaciones sensibles.
- Registrar publicación, borrado, aprobación y cambios de permisos.
- Secretos solo server-side.
- Nunca loggear claves o prompts con datos privados innecesarios.

## 18. Costes y resiliencia

Las llamadas a Anthropic y OpenAI pueden tener coste. Cada operación debe mostrar qué va a ejecutar y, cuando sea posible, una estimación.

Registrar:
- proveedor/modelo,
- número de imágenes,
- resolución,
- duración,
- tokens/unidades/coste si el proveedor los devuelve,
- estado y reintentos.

Añadir:
- límites configurables,
- cancelación cuando sea posible,
- reintentos controlados,
- backoff,
- idempotencia,
- tratamiento de jobs huérfanos,
- recuperación ante fallos,
- no reemplazar activos aprobados ante un error.

---

# PARTE V — EXPERIENCIA ADMINISTRATIVA

## 19. Navegación propuesta

Ecorex Admin tendrá una única consola con navegación común:

1. Dashboard.
2. Species Discovery.
3. Bestiary / Species Manager.
4. Ecorex Art Studio.
5. Review Queue.
6. Asset Library.
7. Settings.

### Dashboard

Indicadores:
- candidatos por revisar,
- fichas-spec en borrador,
- fichas aprobadas,
- Creature Bible Sheets incompletas,
- anclas Balance/Exceso/Eco pendientes,
- generaciones en cola/fallidas,
- especies listas para publicar,
- especies activas en el juego.

Los números deben salir de datos reales; no hardcodear cifras.

### Species Workspace

Cada especie tiene un workspace único con:
- Overview,
- ficha-spec,
- fuentes paleontológicas,
- Creature Bible Sheet,
- Balance,
- Exceso,
- Eco,
- historial,
- publicación.

El estado de producción debe ser visible sin navegar por carpetas.

### Discovery UI

Reutilizar la interfaz local existente de PBDB donde sea viable:
- búsqueda por nombre,
- filtros paleontológicos disponibles,
- candidatos,
- indicación de presencia en el proyecto,
- Fractae/edición,
- consulta de fuentes,
- generación de ficha,
- revisión y aprobación.

### Reference Sheet Editor

- Vista de cada panel.
- Subida manual.
- Generación individual.
- Comparación de versiones.
- Edición de paleta y rasgos invariables.
- Composición de lámina.
- Aprobación y congelación de versión.

### Generation Studio

- Especie y fase.
- Tipo de activo.
- Referencias.
- Prompt modular editable.
- Modelo y parámetros autorizados.
- Número de propuestas.
- Confirmación de coste.
- Historial y resultados.

### Review Queue

- Imagen y comparación.
- Referencias y prompt.
- Scores de QA.
- comentarios,
- aprobar/rechazar/solicitar cambios.

---

# PARTE VI — WORKFLOW COMPLETO

## 20. Ciclo de vida de una especie

```text
PBDB candidate
    ↓
Research / source lookup
    ↓
Ficha-spec draft
    ↓
Editorial review
    ↓
Ficha-spec approved
    ↓
Species Manager / Art Studio
    ↓
Balance concept
    ↓
Creature Bible Sheet
    ↓
Reference Sheet approved
    ↓
Balance anchor approved
    ├───────────────┐
    ↓               ↓
Exceso from       Eco from
same Balance     same Balance
    ↓               ↓
Review            Review
    └───────┬───────┘
            ↓
All phase anchors approved
            ↓
Explicit publishing action
            ↓
D1 species_phase_anchors + public assets
            ↓
Ecorex PWA consumes approved content
```

## 21. Estados de producción unificados

Propuesta de estado por dimensión (evitar un único estado monolítico):

- Discovery: candidate / researching / spec_draft / needs_revision / approved / rejected.
- Species: draft / approved / active / archived (verificar estados existentes).
- Reference sheet: not_started / in_progress / review / approved.
- Cada fase: missing / generating / review / approved / published.
- Publicación: unpublished / publishing / published / failed / rolled_back.

El dashboard deriva el progreso a partir de estas dimensiones. Una especie puede tener ficha aprobada y arte pendiente; no debe bloquear el trabajo de otras especies.

## 22. Piloto de validación

World Bible v6 confirma:
- 54 fichas-spec en `tools/species/lote.json`.
- Solo 6 carpetas de arte en `public/species-art/`, coincidentes con las seis especies `is_active=1` descritas.
- El cuello de botella principal es producir/curar el arte de las 48 restantes, no volver a diseñar 54 fichas.

Por tanto, el piloto del Art Studio debe priorizar especies con fichas existentes. No rehacer Discovery como prerequisito para probar Art Studio.

**Piloto sugerido:** tres especies con morfologías contrastadas:
- un terópodo bípedo,
- un tireóforo cuadrúpedo con armadura,
- un hadrosaurio.

Los ejemplos concretos (p. ej. Tyrannosaurus imperator, Huayangosaurus inquisitus y Telmatosaurus mirus) son sugerencias de validación; confirmar su estado actual en los datos.

Criterio: completar Creature Bible Sheet + Balance/Exceso/Eco + revisión + publicación controlada para cada especie piloto.

---

# PARTE VII — IMPLEMENTACIÓN CON CLAUDE CODE

## 23. Estrategia de implementación

No pedir a Claude Code que construya todo en una única tarea. Trabajar por fases, revisar diffs y ejecutar pruebas tras cada entrega.

### Fase 0 — Auditoría sin cambios

- Leer World Bible v6 completa.
- Leer README de `tools/species/`.
- Inspeccionar scripts mencionados.
- Inspeccionar `lote.json`, `species.wave1.json`, `species.example.json`.
- Inspeccionar `package.json`, Vite, Pages, Functions, D1, migraciones, KV y auth.
- Inspeccionar `public/species-art/`, `scripts/seed.sql` y cómo la PWA consume `species_phase_anchors`.
- Confirmar qué existe realmente.
- No modificar archivos ni instalar dependencias.

**Salida:** informe de arquitectura real, diferencias y propuesta concreta.

### Fase 1 — Contratos y diseño

- Definir contrato de ficha-spec usando JSON real existente.
- Definir schemas y validaciones.
- Diseñar estados de workflow.
- Diseñar límites de importación CLI/API.
- Diseñar modelo de permisos.
- Diseñar estrategia de almacenamiento.
- No duplicar tablas de producto.

### Fase 2 — Shell de Admin

- Crear build/ruta de aplicación Admin según el patrón más sencillo compatible con el repo.
- Login y protección de rutas.
- Navegación vacía.
- Autorización server-side.
- Pruebas de acceso.
- No tocar mecánicas de juego.

### Fase 3 — Species Discovery

- Integrar búsqueda PBDB.
- Integrar lookup de fuentes.
- Generar ficha-spec.
- Mostrar procedencia.
- Guardar borradores e historial.
- Revisar/aprobar.
- Migrar progresivamente desde `lote.json`, con export/backup y sin pérdida de datos.

### Fase 4 — Species Manager

- Listado y búsqueda.
- Estado por especie.
- Vista ficha-spec.
- Fuentes y edición.
- Estado de arte por fase.
- Historial.

### Fase 5 — Creature Bible Sheet Builder

- Brief a partir de ficha aprobada.
- Gestión de paneles/vistas.
- Subida y generación individual.
- Paleta editable.
- Rasgos invariables.
- Composición de la hoja.
- Versionado y aprobación.

### Fase 6 — Generation Engine

- Adaptador de proveedor server-side.
- Prompt builder.
- Generación y edición.
- Jobs, estados, reintentos.
- Guardado de referencias y resultados.
- Registro de costes.

### Fase 7 — Phase Anchor workflow

- Balance manual/subida y aprobación.
- Exceso desde Balance aprobado.
- Eco desde el mismo Balance aprobado.
- QA y revisión.
- No implementar lógica de obtención del jugador aquí.

### Fase 8 — Publishing

- Validación de activos.
- Actualización de `species_phase_anchors`.
- Actualización segura de rutas.
- Compatibilidad con `discoveries.image_url` copiada por usuario.
- Publicación auditada y rollback.

### Fase 9 — Escalado y operaciones

- Batch processing con límites.
- Métricas.
- Backup.
- Roles adicionales.
- Automatización de tareas repetitivas.
- Optimización de almacenamiento.

## 24. Criterios de aceptación del MVP

- [ ] Admin inaccesible a usuarios no autorizados.
- [ ] Admin no altera rutas ni navegación de la PWA pública.
- [ ] Discovery busca candidatos con datos de PBDB.
- [ ] El lookup muestra fuentes reales y no inventa datos ausentes.
- [ ] La ficha-spec generada se valida contra el contrato existente.
- [ ] El borrador puede revisarse y aprobarse.
- [ ] Una especie aprobada aparece en Species Manager.
- [ ] Puede crearse una Creature Bible Sheet versionada.
- [ ] Las vistas se gestionan individualmente.
- [ ] Paleta y rasgos invariables son editables.
- [ ] Balance puede subirse y aprobarse.
- [ ] Exceso y Eco parten del mismo Balance aprobado.
- [ ] Se conserva el prompt y las referencias de cada generación.
- [ ] Los activos aprobados no se sobrescriben.
- [ ] La publicación requiere permiso y acción explícita.
- [ ] `species_phase_anchors` se actualiza correctamente.
- [ ] La PWA consume las anclas publicadas.
- [ ] Cambios de URL consideran `discoveries.image_url`.
- [ ] Tests cubren autorización, validación y publicación.
- [ ] Hay backup y rollback documentados.

---

# PARTE VIII — PROMPTS PARA CLAUDE CODE

## 25. Prompt 0 — Auditoría del repositorio

```text
Quiero construir Ecorex Admin dentro del repositorio existente.

Lee íntegramente:
- docs/lore_world_bible_ecorex_v6.md
- README.md de tools/species/

La World Bible v6 es la fuente canónica del lore y las reglas de producto; no debe confundirse con una auditoría del estado actual del código.
El README de tools/species documenta el pipeline local actual.

Antes de modificar archivos, audita:
1. Stack real y package.json.
2. React/Vite/PWA y configuración de build.
3. Pages Functions, workers y rutas API.
4. D1, migraciones, tablas y seed.
5. Autenticación, sesiones, adminAuth y permisos.
6. Scripts de tools/species y sus efectos secundarios.
7. lote.json, species.wave1.json y species.example.json.
8. public/species-art y especies activas.
9. species_phase_anchors y cómo la PWA consume image_url.
10. sincronización local/remota.
11. almacenamiento y secretos.

Confirma especialmente la discrepancia entre README y World Bible sobre
species.wave1.json. Verifica el estado real de los archivos.

No modifiques archivos, no instales dependencias y no ejecutes operaciones
que generen imágenes o consuman APIs de pago.

Entrega:
- arquitectura actual,
- inventario de componentes reutilizables,
- diferencias entre estado real y documentación,
- riesgos,
- propuesta de Ecorex Admin en el mismo monorepo,
- opciones de despliegue separado,
- contrato de ficha-spec recomendado,
- modelo de datos mínimo,
- estrategia de almacenamiento,
- plan incremental.

No empieces a implementar hasta recibir aprobación.
```

## 26. Prompt 1 — Diseño técnico aprobado

```text
Implementa el diseño técnico de Ecorex Admin aprobado en el informe anterior.

Decisiones:
- Un solo repositorio ecorex-project.
- PWA pública sin cambios de comportamiento.
- Aplicación Admin privada e independiente en build/despliegue.
- Módulos Species Discovery y Ecorex Art Studio.
- tools/species continúa como tooling local durante la migración.
- No duplicar species, fractae ni species_phase_anchors.
- No migrar el stack.
- No modificar mecánicas del jugador.

Primero implementa solo la base:
- estructura de aplicación Admin,
- navegación,
- autenticación/autorización server-side,
- tipos y contratos compartidos,
- tests de acceso.

No implementes todavía llamadas de generación ni publicación.
Mantén el diff acotado y explica cada decisión.
```

## 27. Prompt 2 — Species Discovery

```text
Integra el pipeline actual de tools/species como módulo Species Discovery.

Reutiliza:
- discover-species-pbdb.mjs
- lookup-species.mjs
- generate-species-spec.mjs
- clientes de tools/species/lib/

No importes scripts CLI con efectos secundarios directamente en Pages Functions.
Extrae lógica pura si hace falta y conserva adaptadores separados para CLI y API.

Funcionalidades:
- buscar candidatos en PBDB,
- filtrar y consultar registros,
- consultar NHM y dinosaurpictures.org,
- detectar especies ya presentes,
- asignar Fractae y edición,
- generar ficha-spec con Anthropic,
- guardar borrador,
- revisar y aprobar,
- mantener procedencia e historial.

Valida contra el formato real existente. No inventes campos canónicos.
No sincronices automáticamente con producción.
No ejecutes llamadas de pago sin confirmación explícita.
```

## 28. Prompt 3 — Creature Bible Sheet

```text
Implementa el Creature Bible Sheet Builder de Ecorex Art Studio.

La hoja de referencia debe inspirarse en la lámina de personaje proporcionada:
perfil izquierdo, frontal, trasera, tres cuartos, cabeza, detalles,
paleta cromática, ilustración ambiental y rasgos invariables.

La hoja es una composición de activos independientes:
- cada vista tiene su propio archivo, versión, prompt, referencias y estado;
- las vistas pueden subirse o generarse individualmente;
- la paleta es editable;
- los rasgos invariables son texto estructurado revisable;
- la composición se genera a partir de activos aprobados;
- aprobar una hoja congela su versión;
- cualquier cambio crea otra versión.

La ficha-spec aprobada es el punto de partida.
No inventes anatomía ni sustituyas datos de la ficha por inferencias del modelo.
No uses una única generación multipanel como única prueba anatómica.
```

## 29. Prompt 4 — Generation Engine

```text
Implementa el motor de generación del Art Studio usando el proveedor y modelo
que se hayan verificado y aprobado para este repositorio.

Requisitos:
- llamadas solo server-side,
- secretos fuera del frontend,
- adaptador de proveedor,
- prompt modular y versionado,
- guardar prompt exacto, modelo, parámetros y referencias,
- jobs con estados y errores,
- reintentos e idempotencia,
- registro de coste/uso si el proveedor lo devuelve,
- confirmación antes de operaciones de pago,
- almacenamiento de originales y resultados,
- no sobrescribir activos aprobados.

Respeta el prompt maestro vigente del proyecto y la anatomía de la especie.
No inventes nombres de modelos ni endpoints.
```

## 30. Prompt 5 — Fases, QA y publicación

```text
Implementa el workflow de anclas de fase.

Balance:
- carga/diseño manual,
- revisión y aprobación,
- se convierte en referencia raíz.

Exceso:
- image-to-image desde Balance aprobado.

Eco:
- image-to-image desde ese mismo Balance aprobado.

Nunca encadenes Eco desde Exceso.
No modifiques la lógica de obtención de fases del jugador.
No implementes variantes únicas por rareza: esa mecánica está retirada del código.

Añade QA asistido sin aprobación automática.
La aprobación es humana.
La publicación requiere permiso, validación y acción explícita.
Actualiza species_phase_anchors de forma segura y registra auditoría.
Ten en cuenta que discoveries.image_url es una copia por usuario.
Implementa rollback y tests.
```

---

# PARTE IX — DECISIONES PENDIENTES

## 31. No dar por cerrados estos puntos

1. **Almacenamiento privado:** R2 está retirado. Seleccionar destino persistente para originales, drafts y hojas.
2. **Despliegue Admin:** confirmar si se desplegará como segundo proyecto Cloudflare Pages o con otra configuración dentro de la cuenta.
3. **Autenticación Admin:** verificar si el sistema de cuentas actual permite separar adecuadamente usuarios jugadores y administradores.
4. **Persistencia de Discovery:** decidir cuándo migrar `lote.json` a D1 u otro almacenamiento de trabajo.
5. **Modelo de versionado:** confirmar si se requiere versionado de ficha-spec en base de datos desde la primera versión.
6. **Proveedor/modelos de imagen:** verificar la API y modelos vigentes en el momento de implementación.
7. **Composición de Creature Bible Sheet:** elegir librería o render de servidor/cliente compatible con el stack.
8. **Roles:** comenzar con un administrador o habilitar desde el inicio roles de editor.
9. **Política de costes:** definir presupuesto, límites por usuario y límites por lote.
10. **Publicación de imágenes:** definir si el destino inicial sigue siendo `public/species-art/` y cómo se automatiza el commit/deploy.
11. **Fuentes paleontológicas:** revisar límites, atribución y disponibilidad de cada API/sitio.
12. **Sincronización remota:** mantenerla manual hasta contar con una publicación auditada y pruebas.

---

# PARTE X — REGLAS NO NEGOCIABLES PARA CLAUDE CODE

## 32. Guardrails del proyecto

- La World Bible v6 prevalece sobre v5, v4 y documentos antiguos.
- No llamar “Furia” a la fase: se llama Exceso.
- Furia (Ira) es uno de los ocho Fractae.
- Las ocho identidades Fractae son Alegría/Lumen, Tristeza/Tristitia, Furia/Ira, Miedo/Pavor, Confianza/Fides, Asco/Fastidium, Sorpresa/Stupor y Curiosidad/Spes.
- Las fases son Balance, Exceso y Eco.
- No confundir rareza con fase.
- No asignar rareza fija a especie o ancla.
- No reintroducir variantes visuales únicas por usuario/rareza: la mecánica está retirada.
- No tratar el pipeline layered como el pipeline vigente.
- No cambiar las mecánicas de Percibir, Fusión, Eco o energía al construir Admin.
- No duplicar el catálogo ni las tablas existentes.
- No publicar automáticamente fichas ni imágenes.
- No ejecutar llamadas de pago sin confirmación.
- No exponer secretos.
- No sobrescribir activos aprobados.
- No asumir que la documentación sustituye la inspección del código.
- Mantener los scripts CLI seguros y evitar ejecutar accidentalmente `main()` al importarlos.

## 33. Resultado esperado

Al finalizar el MVP, el administrador podrá:

1. Descubrir un género dinosauriano real y consultar sus fuentes.
2. Generar una ficha-spec con grounding.
3. Revisar y aprobar la ficha.
4. Abrir la especie en Art Studio.
5. Construir una Creature Bible Sheet con vistas independientes y paleta.
6. Aprobar la identidad visual.
7. cargar/aprobar Balance.
8. Generar Exceso y Eco desde Balance.
9. Revisar y aprobar las tres anclas.
10. Publicar de forma segura.
11. Verificar que Ecorex PWA consume las anclas publicadas.
12. Consultar el historial y recuperar versiones anteriores.

**La meta no es tener un generador de imágenes con un dashboard. La meta es disponer de un sistema de dirección artística, trazabilidad y producción del bestiario Ecorex.**
