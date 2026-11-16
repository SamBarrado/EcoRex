# LORE / WORLD BIBLE v5 — ECOREX

> Esta versión sustituye a `lore_world_bible_ecorex_v4.md` (archivada en `docs/archive/`) como documento de referencia. Mantiene íntegro todo lo válido de v4 (mito fundacional, sistema de Fractae, fases, rareza, operaciones, grietas, trading, cartas de resonancia, arquitectura de app, modelo de producción del bestiario, alcance del MVP) y añade una mecánica implementada tras el cierre de v4 que no estaba documentada: el **Altar de Fusión** (sección 5.1), que es la forma real —no la vaga "acumulación" descrita en v4— de obtener la fase Exceso. También actualiza el estado del proyecto (sección 19) con el resto de sistemas ya construidos desde v4 (energía, EcoDex con progreso, notificaciones, ritual de subida de nivel, herramienta de discovery vía PBDB). Donde haya conflicto entre v4 y v5, v5 tiene prioridad.

---

## 0. NOMBRE DEL UNIVERSO/MARCA (CERRADO)

*(heredado de v3, sin cambios)*

El nombre final del proyecto es **Ecorex**.

Decisión clave: el universo/marca usa **un único nombre, sin doble capa científico/común**. El patrón de doble nombre (científico + popular) se reserva exclusivamente para:

- Los **Fractae individuales** (ej. Lumen/Alegría, Ira/Furia) — ver sección 4.
- Las **especies de dinosaurio** (ej. *Tyrannosaurus imperator* / "Rex de Fuego") — ver sección 14.

**Razón de la decisión:** el nombre del universo funciona como marca (icono, App Store, portada), no como elemento de UI que el usuario vea repetido en dos registros dentro de cada carta.

**Candidatos descartados:** CHRONEX, Eco-Fractura, Eco-Fractae, Almasaurios, Latidosaurios, Fractura Viva, Vestigio, Resonancia, El Despertar, Grieta, Primordia.

---

## 1. PREMISA DEL UNIVERSO

*(heredado de v2/v3, sin cambios)*

Los **Fractae** son fuerzas emocionales puras. No son criaturas por sí mismas — necesitan un **portador** físico para manifestarse en el plano material.

En este universo, **el único portador es el dinosaurio**. No hay puertas abiertas a otras especies por ahora: foco total.

---

## 2. MITO FUNDACIONAL — LA FRACTURA

*(heredado de v2/v3, sin cambios)*

Hace 66 millones de años, el impacto que extinguió a los dinosaurios no solo acabó con especies físicamente: generó la mayor descarga de trauma emocional colectivo de la historia del planeta — terror, pérdida, furia, sorpresa, todo a la vez, en cada ser vivo.

Esa emoción no se disipó. Quedó atrapada, fragmentada, dormida durante millones de años — como fósiles, pero emocionales.

Algo reciente ha vuelto a agrietar esa barrera. Por eso los Fractae están resurgiendo ahora.

Los dinosaurios no "resucitan" literalmente. Son la forma que toma la emoción atrapada al manifestarse — el portador, no el animal en sí.

**Tono confirmado:** este mito funciona tal cual para la capa de 5 años, sin necesidad de suavizarlo más.

### El rol del jugador

El explorador (el usuario) no es un científico de un consorcio burocrático. Es alguien con la sensibilidad para **percibir** lo que la mayoría no puede ver.

**Quién es el usuario real (cerrado en v4):** el usuario de la cuenta es el propio niño, no un tutor que gestiona la cuenta en su nombre — misma lógica de cuentas que una app de coleccionables tipo Pokémon (registro directo, sin capa de perfil "padre/hijo" separada en esta fase). Ver sección 18 para las implicaciones técnicas de esta decisión.

---

## 3. ESTRUCTURA UNIVERSAL DE CARTA

*(heredado de v2/v3, sin cambios)*

```
Fractae (núcleo emocional)
+ Especie portadora (el dinosaurio)
+ Fase (Balance / Exceso / Eco)
+ Rareza (eje independiente, ver sección 6)
```

### Ejemplo aplicado

```
Fractae:             Furia (Ira)
Especie portadora:   Tyrannosaurus imperator — "T-Rex del Magma"
Fase:                Exceso
Rareza:               Épica
Operación:           IGNEA
Discovery ID:        DX-VOL-F7K
```

---

## 4. SISTEMA DE FRACTAE (8 tipos)

*(heredado de v2/v3, sin cambios)*

| Fractae | Nombre científico (latín) | Palabra niño | Icono / color |
|---|---|---|---|
| Alegría | Lumen | Alegría | sol, amarillo |
| Tristeza | Tristitia | Tristeza | gota, azul |
| Furia | Ira | Furia | llama, rojo |
| Miedo | Pavor | Miedo | ojo en sombra, morado |
| Confianza | Fides | Confianza | escudo, verde |
| Asco | Fastidium | Asco | mancha, verde oscuro |
| Sorpresa | Stupor | Sorpresa | estrella, naranja |
| Curiosidad | Spes | Curiosidad | lupa, lila |

### Oposiciones

- Alegría (Lumen) ↔ Tristeza (Tristitia)
- Furia (Ira) ↔ Miedo (Pavor)
- Confianza (Fides) ↔ Asco (Fastidium)
- Sorpresa (Stupor) ↔ Curiosidad (Spes)

### Fortalezas / vulnerabilidades conocidas (parcial, pendiente de completar la rueda)

- **Furia (Ira)** → fuerte contra Miedo (Pavor)
- **Miedo (Pavor)** → fuerte contra Sorpresa (Stupor); débil contra Furia (Ira)
- **Alegría (Lumen)** → fuerte contra Tristeza (Tristitia); débil contra Asco (Fastidium)
- **Confianza (Fides)** → fuerte contra Furia (Ira)

---

## 5. FASES

*(heredado de v2/v3, con una corrección de nombre en v4 — ver nota debajo)*

| Fase original | Fase Ecorex | Significado |
|---|---|---|
| Equilibrio | **Balance** | estable, forma base |
| Exceso | **Exceso** | desbordado, intensificado |
| Residuo | **Eco** | versión tenue, casi fantasmal |

**Corrección de nombre (validado en esta sesión):** la Fase intermedia se llamaba antes "Furia" como nombre-niño de "Exceso", pero eso colisionaba con el Fractae **Furia (Ira)** (sección 4) — una criatura de Fractae Miedo en fase "Furia" sonaba como si fuera del Fractae Furia. Se revierte al nombre original del concepto, **Exceso**, que ya no colisiona con ningún Fractae. Afecta al `CHECK` de `phase` en `schema.sql`, a todo el código/scripts que usan el literal `'furia'` como fase, y a los nombres de archivo (`exceso.png`).

**Regla:** Fase ≠ Intensidad, y por extensión, Fase ≠ Rareza.

### Cómo se obtiene cada fase

1. **Balance** → flujo principal de descubrimiento (elección de especie del catálogo, ver sección 12). Siempre disponible.
2. **Exceso** → se obtiene fusionando duplicados de Balance de la misma especie en el **Altar de Fusión** (ver sección 5.1). La formulación de v4 ("rachas de uso, duplicados, o completar una Operación entera") queda sustituida por este mecanismo concreto ya implementado — duplicados es la parte que sobrevivió, rachas/Operación no se llegaron a construir.
3. **Eco** → exclusiva del minijuego de grietas. No es una especie nueva — es el eco de una especie ya descubierta.

### 5.1 Altar de Fusión (NUEVO EN v5)

Mecanismo real por el que un usuario consigue la fase Exceso de una especie: fusionar **5 copias de esa especie en fase Balance** (duplicados que ya tenía en su Álbum) en una única carta de fase Exceso.

- **Umbral fijo:** 5 duplicados de Balance sin fusionar previamente (`FUSE_THRESHOLD = 5`, `functions/api/fuse/index.ts`). El altar muestra qué especies han alcanzado ese umbral (`GET /api/fuse/eligible`).
- **Coste:** ninguno en energía — la Fusión es independiente del sistema de energía de la sección 5.2 (Percibir sí consume energía; fusionar no). El único "coste" es haber acumulado los 5 duplicados por el camino normal de descubrimiento.
- **Resultado:** se sortea una rareza para la nueva carta Exceso (igual que en un descubrimiento normal, sección 6), se resuelve/genera su imagen, y se inserta como una fila nueva en `discoveries` con `phase = 'exceso'`. Las 5 filas de Balance usadas no se borran — quedan marcadas como **consumidas** (`consumed_at`), de forma que el historial de esa captura se conserva pero deja de contar como duplicado activo. Otorga XP (bonus de fusión + bonus de "Fractae completo" si con esa fusión el usuario reúne las 3 fases de la especie).
- **Primera vez:** la primera especie que alcanza el umbral dispara un modal de desbloqueo de la función ("Altar de Fusión") una única vez por usuario.
- **Consecuencia narrativa:** fusionar consume literalmente la forma estable de la criatura para producir su versión desbordada — coherente con que Exceso (sección 5, antes "Furia") es la forma intensificada, no una especie distinta.
- **Nota técnica (para no repetir el bug ya corregido):** el EcoDex y el reveal de "especie nueva" deben basarse en la existencia histórica de cualquier descubrimiento de esa especie+fase, no solo en las filas no consumidas — de lo contrario, fusionar todos los duplicados de una fase hace que esa fase "desaparezca" del EcoDex o que se repita la animación de descubrimiento al volver a conseguirla.

### 5.2 Energía (reemplaza el rate-limit silencioso de v4)

El flujo de Percibir (descubrimiento, sección 12) ya no está limitado por un rate-limit invisible de infraestructura, sino por un sistema de **energía visible al jugador**: 2 usos cada 12 horas, mostrado como recurso en la barra de navegación. Forma parte del juego (recurso a gestionar), no solo protección técnica — aunque también cumple esa función.

---

## 6. RAREZA × FASES (ejes independientes)

*(heredado de v2/v3, sin cambios — confirmado además por la implementación técnica, ver sección 18)*

Rareza y Fase son ejes ortogonales. Matriz de 5 rarezas × 3 fases = 15 estados posibles por especie. El Discovery ID (`DX-HAB-DSC`) incluye un carácter adicional para codificar la fase.

**Confirmado en v4:** la rareza no es una propiedad fija de la especie ni de la fase — se sortea de forma independiente en cada captura (ver `rarity_tiers.drop_weight`, sección 18.3).

---

## 7. OPERACIONES (expediciones temáticas)

*(heredado de v2/v3, sin cambios)*

| Operación | Fractae dominante |
|---|---|
| IGNEA | Furia (Ira) |
| ABISAL | Miedo (Pavor) / Asco (Fastidium) |
| GLACIAR | Tristeza (Tristitia) |
| UMBRA | Sorpresa (Stupor) / Curiosidad (Spes) |

**Modelo de expansión geográfica (híbrido, confirmado):** la mayoría del contenido es accesible para todos. Algunas variantes Eco especialmente raras se desbloquean solo en ubicaciones reales con resonancia temática.

**Las Operaciones como motor de expansión del bestiario:** cada Operación mensual no solo sesga qué Fractae aparecen más — es también el vehículo narrativo por el que se **añaden especies nuevas al bestiario**.

**Aclaración añadida en v4:** por ahora el juego arranca en un **modo base sin Operación activa**, con una distribución de rareza única y global (`rarity_tiers.drop_weight`, ver sección 18.3). Cuando se cree la primera Operación real, esa Operación podrá traer su propia distribución de rareza (más probabilidad de tiers altos durante el evento, por ejemplo) — el mecanismo exacto (columna en `operations`, tabla de override, etc.) queda **pendiente de diseño**, no bloquea el MVP actual.

---

## 8. MINIJUEGO DE GRIETAS (pseudo-AR)

*(heredado de v2/v3, sin cambios)*

Mecánica ligera de exploración, no-batalla. Overlay simple (SVG/CSS) sobre el feed de cámara, sin tracking real de superficie — pseudo-AR ligera para MVP, sin WebXR.

- **Disparador:** vinculado a Operaciones activas y, parcialmente, a ubicación real.
- **Recompensa:** acceso a fase Eco de especies ya descubiertas (nunca especies nuevas).
- **Requisito de acceso:** la sección de Grietas solo está activa si el usuario ya tiene al menos una especie en fase Balance. Si no, aparece bloqueada/vacía con mensaje contextual.

**Fuera de alcance del MVP actual** (ver sección 17) — se construye después de cerrar cuentas + colección + perfil.

---

## 9. TRADING ENTRE USUARIOS — "REGALO"

*(heredado de v2/v3, con matiz añadido en v4)*

Modelo unidireccional descrito originalmente: generar código/enlace de una carta concreta, canjeable una sola vez por el receptor. Sin negociación, sin matchmaking.

**Intención a futuro confirmada en v4 (no implementada aún):** el regalo debería evolucionar a **bidireccional**, con intercambio de cartas sobrantes (con o sin negociación explícita), y el sistema social debería crecer hacia leaderboards y lista de amigos. Se confirma explícitamente que **es pronto para esto** — queda fuera de alcance hasta después de cerrar cuentas + colección + perfil/stats (ver sección 17). La tabla `gifts` ya existe en el schema (modelo unidireccional, `redeemed_by_user_id` nullable) como base de partida, pero el diseño bidireccional/social queda **pendiente**.

**Precisión de v5 (más atrás de lo que sugería v4):** a día de hoy ni siquiera existe el endpoint unidireccional. `functions/lib/xp.ts` marca explícitamente `GIFT_REDEEMED_XP_BONUS` como "not wired up anywhere yet — functions/api/gifts/* doesn't exist". La tabla `gifts` está en el schema pero no hay ninguna ruta que la use todavía — Regalo sigue siendo diseño de datos sin backend, no una función "casi lista" a la espera del giro bidireccional.

---

## 10. CARTAS DE RESONANCIA

*(heredado de v2/v3, sin cambios)*

Serie especial de 8 cartas, una por Fractae, sin dinosaurio — solo la energía pura representada de forma abstracta. Pull ultra-raro, objetivo de coleccionismo serio para el adulto.

---

## 11. DECISIONES LINGÜÍSTICAS

*(heredado de v2/v3, sin cambios)*

- Idioma base: español.
- Naming de tipos (Fractae): latín pleno para el registro científico.
- Copy externalizado como datos desde el inicio, preparado para internacionalización futura.

---

## 12. ARQUITECTURA DE APP (ACTUALIZADO EN v5 — la tab bar real ya no coincide con v3/v4)

**Corrección de v5:** la tab bar descrita en v3/v4 ("Explorar / EcoDex / Grietas / Yo") no es la que existe hoy en el código. El layout de 4 tabs se mantiene, pero **"Explorar" ya no existe** como nombre ni como pantalla — se dividió en dos tabs separadas (Inicio y Percibir) con roles distintos, y aparecieron dos piezas nuevas (Fusión, Notificaciones) que viven **fuera** de la tab bar. Mapeo real (`src/components/BottomNav.tsx`, `src/App.tsx`):

**1. Inicio** (`/inicio`, `src/pages/InicioPage.tsx`)
- Dashboard de progreso, no un selector de especie: perfil, energía disponible, recordatorio de progreso de colección.
- Detecta elegibilidad de Fusión (sección 5.1) y dispara el modal de desbloqueo la primera vez.
- Badge numérico en la tab (`inicioCount`).

**2. Percibir** (`/percibir`, `src/pages/PercibirPage.tsx`)
- Es el flujo real de descubrimiento que v3/v4 llamaba "Explorar" — selección de especie del catálogo activo y resolución de fase/rareza/ancla-vs-variante (sección 18.3), a través del gesto de swipe-up (`PercibirRitual`, ver sección 5.2 para el coste en energía).
- Al descubrir: animación de revelación a pantalla completa. **Sigue sin email-gate post-reveal** (sección 17.2, sin cambios).
- Badge booleano en la tab (`percibirActive`) cuando hay energía disponible.

**3. EcoDex** (`/coleccion`, `src/pages/ColeccionPage.tsx`)
- Grid de especies activas del bestiario, sin cambios de concepto respecto a v4.
- No descubiertas → silueta misteriosa; descubiertas → imagen ancla + fases obtenidas (Balance/Exceso/Eco), con la corrección de la sección 5.1 (una fase fusionada del todo sigue contando como descubierta).
- Badge booleano en la tab (`ecodexActive`).

**4. Yo** (`/perfil`, `src/pages/PerfilPage.tsx`)
- Ya no es "parte pendiente del MVP" (así lo describía v4, sección 17.3) — está implementado y en uso: rango de explorador, progreso de colección (`progressPct`, `speciesTotalCount`), logout.
- Regalos pendientes siguen sin implementar (ver sección 9 / 17.4, sin cambios: ni siquiera existe el endpoint todavía).

### Piezas fuera de la tab bar (nuevo en v5)

- **Altar de Fusión** (`/fusion`, `src/pages/FusionPage.tsx`) — no es una tab; se entra desde el modal de desbloqueo en Inicio o desde una notificación `fusion_ready`. Ver sección 5.1.
- **Notificaciones** — no es una pantalla ni ruta propia, es un dropdown flotante dentro de un FAB (`src/components/ActionFab.tsx`, `src/lib/NotificationsContext.tsx`). Al pulsar una notificación navega a `/fusion` (`fusion_ready`) o dispara la pantalla de subida de nivel (`level_up`, `LevelUpScreen`).
- **Grietas** — sigue sin ningún archivo/ruta/tabla en el código. Confirmado fuera de alcance, sin cambios respecto a v4.

### Decisión sobre capas de audiencia

**Un único layout, adaptativo, sin modos separados.** Mismo layout, mismo lenguaje visual (iconos + texto), accesible para todas las edades a la vez.

---

## 13. MODELO DE DATOS DEL BESTIARIO: POKÉDEX vs. ÁLBUM

*(heredado de v3, confirmado por la implementación — ver sección 18)*

### Pokédex / Bestiario (nivel especie)

- Catálogo objetivo, igual para todos los usuarios.
- Cada entrada muestra la **imagen ancla canónica** de la especie+fase — nunca la variante personal de un usuario.
- Las especies no descubiertas se muestran como **silueta misteriosa**, generada a partir de la imagen ancla ya aprobada.
- Uso principal: mostrar progreso de colección, vista "limpia" y compartible.

### Álbum / Colección personal (nivel instancia)

- Lista completa de **todas las cartas individuales** que el usuario ha descubierto, duplicados incluidos.
- Cada instancia tiene su propia variante visual (cuando aplica), su propio Discovery ID, fecha y rareza concreta de esa captura.
- Aquí vive la opción de "Regalar" sobre una carta específica (futuro, ver sección 9).
- Uso principal: vista "presumir", valor real del coleccionismo (duplicados no son ruido, son moneda social).

**Mapeo técnico (v4):** Pokédex = `species` + `species_phase_anchors`; Álbum = `discoveries` (una fila por captura, con `user_id`, `rarity_tier_id`, `image_url` propio e `is_unique_variant`).

**Estado real de implementación (aclarado en v5):** el schema soporta el modelo completo, pero el frontend/API todavía no exponen la vista "álbum de una especie" (entrar a una especie descubierta y ver todas sus copias/variantes individuales) tal como la describe esta sección. `functions/api/collection/dex.ts` agrupa por `species_id + phase` y solo devuelve un `representative` (la copia más reciente) + `count`; `src/pages/ColeccionPage.tsx` abre un modal de preview de esa carta representativa, no una lista multi-variante. Es decir: el concepto de "duplicados como moneda social visible" está en los datos pero aún no en la UI.

---

## 14. ESPECIES Y NAMING

*(heredado de v2/v3, sin cambios)*

Patrón de doble capa para cada dinosaurio:

- Nombre científico (latín) → registro adulto/coleccionista, visible en la carta.
- Nombre común (palabra niño) → registro principal de interacción.

Ejemplo: *Tyrannosaurus imperator* / "Rex de Fuego".

---

## 15. MODELO DE PRODUCCIÓN DEL BESTIARIO

*(heredado de v3, con corrección de estado real en 15.5)*

### 15.1 Naturaleza híbrida (confirmada)

El bestiario **no es puramente generativo**. Existe un catálogo fijo de **Base Species** (rango recomendado 40–60 a largo plazo) sobre el que se generan variantes visuales por IA.

### 15.2 Unidad real de diseño: specs de texto, no ilustraciones

El trabajo de diseño humano por especie es redactar una **ficha-spec** estructurada (ejemplo):

```
Especie: Tyrannosaurus imperator
Nombre niño: "Rex de Fuego"
Fractae asociado: Furia (Ira)
Rasgos físicos fijos: cuerpo robusto, cresta dorsal, mandíbula prominente
Hábitat/ecología: llanuras y bosques semiáridos costeros, depredador terrestre ápice
Paleta base: rojos/naranjas/negros
Silueta distintiva: bípedo, cola larga, brazos cortos
```

**`Hábitat/ecología` (añadido en esta revisión)** es un campo obligatorio de la ficha, no decorativo: alimenta directamente el diseño de la Fase Eco (ver §15.3). Debe ser concreto (terrestre árido, semi-acuático fluvial, marino, boscoso templado, polar...), no un genérico "prehistórico".

Esta ficha actúa como prompt-semilla para GPT Image 2, garantizando que la misma especie sea reconociblemente consistente entre distintos usuarios.

### 15.3 Modificadores de fase

```
Balance → forma estable, postura serena, brillo suave
Exceso → forma intensificada, postura agresiva, brillo ardiente, grietas de energía
```

Balance y Exceso son modificadores reutilizables, iguales para todas las especies (solo cambia la intensidad/textura sobre la anatomía de cada una).

**Eco es distinto: NO es un modificador universal.** Corrección respecto a versiones anteriores de este documento, que lo describían como "forma translúcida, casi fantasmal, partículas dispersándose" igual para todas las especies — en la práctica esto hacía que todas las Ecos parecieran la misma silueta fantasma genérica, perdiendo el propósito narrativo de la fase.

**Definición correcta:** Eco es el Fractae de la especie llevado a su extremo emocional absoluto, manifestado a través de la anatomía y el **hábitat concreto** de esa especie en particular — no de un efecto visual fijo. Dos especies del mismo Fractae deben producir Ecos visualmente distintos entre sí (p. ej. la Furia extrema de un depredador terrestre no se ve igual que la Furia extrema de un reptil marino).

Arquetipos conceptuales por Fractae (qué le hace la emoción a la criatura en su punto de ruptura, deliberadamente sin prescribir mecanismo visual ni entorno — eso lo aporta la especie):

| Fractae | Arquetipo del extremo emocional |
|---|---|
| Alegría (Lumen) | Desbordada por un júbilo tan absoluto que pierde el control de su propia forma física; euforia que la vuelve casi ingrávida y radiante |
| Tristeza (Tristitia) | Hundida en un duelo tan profundo que pierde la capacidad de sostenerse a sí misma; se disuelve cediendo su forma a su propio dolor |
| Furia (Ira) | Consumida por su propia rabia hasta el punto de autodestrucción; energía descontrolada que fractura su cuerpo desde dentro |
| Miedo (Pavor) | Devorada por el pánico hasta la disolución total; el instante final antes de desaparecer, cediendo ante un vacío que la consume |
| Confianza (Fides) | Su convicción se vuelve absoluta e inamovible; se transforma en un monumento viviente, anclado para siempre a aquello en lo que cree |
| Asco (Fastidium) | Su propio rechazo la corroe desde dentro; se descompone en tiempo real, consumida por aquello que ella misma repudia |
| Sorpresa (Stupor) | El asombro la paraliza en un instante que se congela para siempre; fragmentada a mitad de un movimiento que nunca llega a completarse |
| Curiosidad (Spes) | Su obsesión por comprender la disuelve en incontables fragmentos que siguen buscando respuestas por separado |

El mecanismo visual concreto (fuego, vapor, hielo, descomposición orgánica, dispersión de plumas al viento, colapso de roca, etc.) se decide combinando este arquetipo con el `Hábitat/ecología` y los `Rasgos físicos fijos` de la ficha-spec de cada especie — nunca es la misma solución para dos especies distintas, aunque compartan Fractae. Implementado en `scripts/generate-species-art.mjs` (`FRACTAE_EXTREME` + `buildEcoPrompt`).

### 15.4 Imágenes ancla: generación, curación y consistencia

Decisión confirmada: **imagen ancla por especie+fase, generada con image-to-image y curada manualmente** (no se confía en generación libre por texto cada vez, para garantizar consistencia visual entre usuarios).

- Por cada especie: se genera la imagen ancla de Balance a partir de la ficha-spec, se revisa y aprueba.
- A partir de esa ancla Balance, se generan (vía image-to-image + modificador de fase) las anclas de Exceso y Eco.
- **Las tres fases se curan manualmente antes de aprobarse** — el margen de error visual debe ser mínimo, dado que el usuario principal es un niño.

**Definición operativa (aclarada en v4):** una "imagen ancla" es la imagen curada y aprobada de una combinación especie+fase concreta (`species_phase_anchors.image_url`) — la que ve todo el mundo por defecto en el Pokédex/Álbum salvo que a una captura le toque generar variante única (sección 18.3).

**Convención de carpetas (fijada en esta sesión, dos carpetas con propósitos distintos, no intercambiables):**

- **`especies_design/`** — carpeta de trabajo/diseño. Aquí viven los diseños preliminares, pruebas, alternativas descartadas y experimentos (incluye `especies_design/generated/` para las pruebas del script y `especies_design/Wave 1/` etc. para organizar por oleada). Nada de lo que hay aquí se sirve en la app.
- **`public/species-art/{slug}/{phase}.png`** — carpeta de **producción**, la única que la app realmente sirve (referenciada por `species_phase_anchors.image_url` en D1 y resuelta por `functions/api/discover.ts`). Solo se copian aquí las 3 fases ya curadas y aprobadas como definitivas de una especie. `{slug}` es el nombre científico en kebab-case (ej. `tyrannosaurus-imperator`).

Regla práctica: iterar y probar SIEMPRE en `especies_design/`; solo cuando una especie+fase queda aprobada como definitiva se copia (no se mueve, para conservar el histórico) a `public/species-art/`.

#### 15.4.1 Flujo de producción confirmado (validado en esta sesión)

Generar Balance directamente por texto vía la API (`images/generations`) es **poco fiable**: el modelo tiende al fotorrealismo por defecto y no converge bien en el estilo ilustrado deseado, incluso con instrucciones de estilo detalladas en el prompt. En cambio, Exceso y Eco generados por **image-to-image** (`images/edits`) sobre un ancla de Balance ya buena sí heredan el estilo correctamente. Por eso el flujo real es:

1. **Balance se diseña a mano en ChatGPT** (gratis, dentro de la suscripción), iterando con instrucciones cortas de estilo ("dale un punto menos realista a esto") hasta conseguir el resultado deseado. Usar el prompt de la sección 15.4.2 como plantilla, rellenando los campos de la ficha-spec de la especie.
2. El PNG elegido se guarda como el ancla Balance de esa especie.
3. **Exceso y Eco se generan automáticamente** (`scripts/generate-species-art.mjs`, de pago vía API) por image-to-image sobre esa ancla ya validada — no se regenera Balance por script.
4. Las tres fases se curan manualmente antes de aprobarse, como ya establece esta sección.

**Corrección de moderación visual (validado en esta sesión):** las primeras pruebas de Exceso y Eco vía script salieron con colores demasiado saturados/quemados (Exceso) y con la composición sobrecargada de fragmentos/partículas (Eco, especialmente notorio en el T-Rex). Los prompts de `buildExcesoPrompt`/`buildEcoPrompt` en `scripts/generate-species-art.mjs` ahora piden explícitamente contraste y saturación controlados en Exceso (el brillo debe concentrarse en grietas/puntos clave, no inundar todo el encuadre), y composición limpia y contenida en Eco (la silueta de la criatura debe seguir siendo el foco legible, con el efecto concentrado en 1-2 puntos, no disperso por todo el fondo). Esta misma moderación aplica también al prompt manual de Balance (sección 15.4.2).

**Corrección de separación figura/fondo (validado en esta sesión):** el problema anterior no era solo de saturación — dino y entorno compartían la misma densidad de textura/grietas y se fundían en un solo ruido visual, sin importar cuánto se moderase el color. La solución no es un halo/contorno pegado a la criatura, sino técnica real de ilustración: la criatura debe ser el elemento más nítido y de mayor contraste, y el entorno debe alejarse con perspectiva atmosférica (bordes más suaves, menos contraste, más desaturado cuanto más al fondo), sin repetir la misma densidad de grietas/brillo del cuerpo en el terreno o el cielo. Añadido como bloque compartido `FIGURE_GROUND_SEPARATION` en `scripts/generate-species-art.mjs` (aplicado a Balance, Exceso y Eco) y como párrafo aparte en el prompt manual de Balance (sección 15.4.2).

**Formato panorámico (validado en esta sesión):** las anclas bien valoradas (ej. el nuevo ancla de T-Rex Imperator) se diseñaron en formato panorámico **1536×1024** (aprox. 3:2), no cuadrado. Todas las generaciones —ancla manual y Exceso/Eco automatizadas— deben usar este mismo formato panorámico para mantener consistencia. `scripts/generate-species-art.mjs` usa la constante `IMAGE_SIZE = '1536x1024'` para las tres llamadas a la API (`images/generations` y `images/edits`).

**Corrección de Exceso poco diferenciada (validado en esta sesión):** una primera corrección de saturación hizo que Exceso quedase casi indistinguible de Balance — misma pose de pie, mismo encuadre, solo con la boca abierta; no se leía como una escalada real de intensidad. El fallo era de **pose/encuadre**, no de color: `buildExcesoPrompt` ahora exige explícitamente una postura genuinamente más agresiva y dinámica que la de Balance (agachada, embistiendo, garras o extremidades en ataque) y un encuadre/ángulo de cámara distinto (más cercano, más bajo o más diagonal, no el mismo plano general de perfil) — la boca abierta por sí sola queda marcada como un detalle menor, no como el cambio principal. La intensidad de brillo/energía debe seguir siendo claramente mayor que en Balance, de forma que se note al instante al alternar entre ambas imágenes.

**La misma corrección aplica a Eco:** Eco tampoco puede ser "la pose de Balance con un efecto encima" — es el momento emocional más extremo de la criatura, así que también necesita pose/encuadre propios (colapsando, retrayéndose, convulsionando, congelada a media acción... lo que pida el arquetipo de esa emoción para esa especie concreta), no solo partículas o grietas superpuestas sobre la postura de reposo. La energía/iluminación debe ser claramente distinta de Balance y Exceso, y **no siempre más brillante**: si el arquetipo es de Miedo (devorada por la oscuridad hasta desaparecer), Eco debe ser más oscura/tenue que las otras dos fases, no más luminosa — la dirección (más brillante o más oscura) depende del arquetipo del Fractae en cuestión (sección 15.3), nunca por defecto "más brillo".

**Pivote de estilo visual — de "criatura de cristal" a "ilustración gráfica tipo anime/TCG" (validado en esta sesión, sustituye el estilo anterior):** el estilo "concept-art pintado con escamas facetadas de cristal" se abandona. A partir de mockups de cartas de referencia aprobados por el usuario, el estilo objetivo es **ilustración gráfica de línea de tinta gruesa, estilo anime/manga o carta TCG (Magic/Pokémon)**: contorno de tinta negra marcado en la silueta Y en el borde de cada escama/placa individual, relleno de color en bloques semi-planos tipo cel-shading (2-3 tonos por superficie: sombra/medio/luz, no degradados fotográficos continuos), brillo especular reducido al mínimo (superficies mate/pintadas, no brillantes ni "mojadas"). El brillo/grietas de energía del color del Fractae ya NO se aplican al cuerpo entero por defecto — solo donde el tema lo justifique (ej. grietas de lava en una especie ígnea) o sobre rasgos fijos ya definidos como cristalinos en la ficha-spec (ej. una gorguera de cristal). El resto de la piel/escamas debe ser material de criatura natural, con el mismo tratamiento gráfico de línea gruesa. Corrección iterativa: el primer intento de estilo "naturalista/pictórico" salió demasiado fotorrealista (render 3D/CGI); el ajuste real no era "menos cristal" sino "más línea de tinta gráfica y menos brillo/degradado fotográfico". Aplicado en `BASE_STYLE` y `PHASE_MODIFIERS.exceso` de `scripts/generate-species-art.mjs`.

**Corrección de pose plana de perfil (validado en esta sesión):** las tres fases estaban resultando en una silueta de cuerpo entero de perfil, casi como una lámina de referencia zoológica — correcta en anatomía y estilo, pero sin dinamismo ni conexión con el jugador. La criatura debe estar **actuando hacia el espectador**: ángulo de tres cuartos o más confrontacional (no perfil plano), mirada/lenguaje corporal orientados hacia cámara, realizando su acción en dirección al espectador. Añadido como bloque compartido `TOWARD_VIEWER_ENGAGEMENT` en `scripts/generate-species-art.mjs` y `generate-species-art-layered.mjs` (en el flujo en capas, el recorte sigue posicionándose hacia el lado del encuadre que deja libre el fondo, pero el ángulo/pose en sí ya no es de perfil plano), y como párrafo aparte en el prompt manual de Balance (sección 15.4.2).

**Corrección de deriva anatómica en especies poco conocidas (validado en esta sesión):** para especies muy famosas (T-Rex, Triceratops, Stegosaurus) el modelo de imagen tiene un prior visual fuerte y mantiene la anatomía correcta incluso con cambios de pose grandes. Para especies menos icónicas (Telmatosaurus, Huayangosaurus, Ceratosaurus...) el modelo "rellena huecos" derivando hacia el dinosaurio genérico que mejor conoce — casi siempre un terópodo tipo raptor — especialmente cuando el texto de la fase pide una pose de "ataque" (garras, embestida) que no encaja con el comportamiento real de la especie (ej. un herbívoro de pico de pato no ataca con garras). Dos causas identificadas y corregidas:

1. **El texto de fase asumía por defecto una pose de depredador atacando** ("crouched and lunging forward... claws/limbs raised or striking") aplicada igual a todas las especies. Para una especie no depredadora esto entra en conflicto directo con su anatomía real, y el modelo "resuelve" el conflicto reinterpretando la criatura como un depredador. Corregido: la instrucción de pose ahora es condicional al comportamiento real de la especie (depredador → ataque; no depredador → carga defensiva, alarde territorial, huida explosiva, nunca zarpazo con garras que no tiene).
2. **Repetir los rasgos físicos no bastaba como ancla** — hacía falta anclar el **plan corporal completo** (cabeza, torso, extremidades, postura, cola), no solo la lista de rasgos distintivos, y sobre todo anclarlo a un **pariente famoso conocido** cuando exista uno cercano (ej. "el plan corporal de este animal es idéntico al de un Stegosaurus, con estas diferencias concretas: ..."). Esto aprovecha el prior fuerte del modelo para el dinosaurio famoso y solo le pide aplicar las diferencias, en vez de "recordar" una anatomía poco conocida desde cero.

Implementado como nuevo campo **`closestFamousRelative`** en la ficha-spec (generado por `scripts/generate-species-spec.mjs`, aún pendiente de rellenar retroactivamente en las 54 fichas existentes de `scripts/lote.json`) y la función compartida `relativeAnchorLine()` en `scripts/generate-species-art.mjs` / `generate-species-art-layered.mjs`. Alternativa complementaria (no implementada aún, más fiable pero más laboriosa): en vez de generar la Calma/Balance desde texto puro, partir de una reconstrucción paleontológica real (ej. Wikimedia Commons) como imagen de entrada y pedir una edición de "restyle manteniendo la anatomía idéntica" en vez de una generación desde cero.

#### 15.4.2 Prompt maestro para generar Balance a mano

```
Genera una ilustración de personaje/criatura para un bestiario de videojuego de fantasía.

FORMATO (obligatorio): panorámico/apaisado, ratio aproximado 3:2 (1536x1024), NO cuadrado.

ESTILO (obligatorio): ILUSTRACIÓN GRÁFICA CON INFLUENCIA ANIME/MANGA y línea de tinta gruesa —
NO una fotografía, NO un render 3D/CGI fotorrealista, NO pintura suave difuminada tipo aerógrafo.
Tiene que parecer arte de carta de videojuego gacha/TCG o ilustración de dinosaurio estilo anime:
un CONTORNO DE TINTA NEGRA grueso y visible traza la silueta Y el borde de cada escama, placa y
segmento de superficie importante en todo el cuerpo — la línea es la estructura visual dominante,
no un degradado suave. El color se rellena en bloques gráficos semi-planos tipo cel-shading
dentro de esos contornos (solo 2-3 tonos por superficie: sombra, medio, luz — no degradados
fotográficos continuos). Reduce el brillo especular: las superficies deben verse mate/pintadas,
no brillantes ni "mojadas". Ilumina con contraluz dramático y gradación de color por encima de
esa base plana/gráfica. Si los rasgos físicos fijos de la ficha-spec mencionan explícitamente
partes cristalinas/facetadas (ej. una gorguera o cuernos de cristal), renderiza exactamente esas
partes como cristal facetado brillante — pero el resto del cuerpo (piel, escamas) debe ser
material de criatura natural con la misma técnica gráfica de línea gruesa, nunca una
transformación de cuerpo entero en cristal/vidrio. Por separado, si el Fractae/hábitat de la
especie es elemental o intenso (fuego, rayos, descomposición...), pueden aparecer grietas/vetas
brillantes del color del Fractae como acentos gráficos sobre la piel — pero solo si el tema lo
justifica, nunca como efecto universal aplicado igual a todas las especies. Pose dinámica e
imponente apoyada sobre el terreno propio de su hábitat (roca, agua, barro, rama, hielo,
arena... lo que corresponda), entorno completo y dramático coherente con el hábitat, pintado en
el mismo estilo gráfico, con profundidad real (primer plano/plano medio/fondo). Sin texto, sin
marcas de agua, sin marco de carta.

ACTUANDO HACIA EL ESPECTADOR (obligatorio): la criatura NO puede ser una silueta plana de
cuerpo entero de perfil (tipo lámina de museo o sprite de ciclo de andar) — eso se lee como
estática/sin vida por muy dramática que sea la luz. Usa un ángulo de tres cuartos o un ángulo de
cámara más confrontacional/dinámico (ligeramente contrapicado, o un ángulo que muestre
profundidad del cuerpo en vez de una elevación lateral plana). La mirada y el lenguaje corporal
de la criatura deben orientarse hacia el espectador/cámara, como si reaccionara a la presencia
del jugador — mirando directamente hacia fuera del encuadre, embistiendo hacia cámara, o
realizando su acción (rugir, acechar, retraerse) en dirección al espectador en vez de en
paralelo al plano de la imagen. Debe transmitir peso y movimiento reales, no una postura
posada/inerte.

SEPARACIÓN FIGURA/FONDO (obligatorio): la criatura debe ser el elemento más nítido, de mayor
contraste y más detallado del cuadro. Aleja el fondo con perspectiva atmosférica — bordes más
suaves, menos contraste, más desaturado cuanto más al fondo. NO renderices el entorno de fondo
(roca, follaje, agua, cielo) con la misma densidad de detalle fino que la superficie de la
criatura — debe sentirse como una capa pintada distinta que retrocede, no como si compitiera en
detalle o contraste. La silueta de la criatura debe reconocerse de un vistazo frente a su
entorno.

DATOS DE LA ESPECIE:
- Especie (nombre científico): {{ESPECIE_CIENTIFICA}}
- Nombre niño: "{{NOMBRE_NIÑO}}"
- Fractae asociado: {{FRACTAE_NOMBRE}} ({{FRACTAE_LATIN}}) — el entorno y las vetas brillantes deben leerse como este elemento
- Hábitat/ecología: {{HABITAT}}
- Rasgos físicos fijos: {{RASGOS}}
- Paleta base: {{PALETA}}
- Silueta distintiva: {{SILUETA}}

FASE A GENERAR: Balance — forma estable, postura serena pero imponente, brillo suave (no agresiva, no rugiendo; es la forma base/de reposo de la criatura).

Genera la imagen ahora.
```

Los placeholders (`{{ESPECIE_CIENTIFICA}}`, `{{NOMBRE_NIÑO}}`, `{{FRACTAE_NOMBRE}}`, `{{FRACTAE_LATIN}}`, `{{HABITAT}}`, `{{RASGOS}}`, `{{PALETA}}`, `{{SILUETA}}`) se rellenan con los campos de la ficha-spec de cada especie (`scripts/lote.json` / `species.wave1.json` / generadas vía `scripts/generate-species-spec.mjs`).

#### 15.4.3 Arquitectura en dos capas: fondo de hábitat + recorte de criatura (confirmado en esta sesión)

**Decisión confirmada:** en vez de generar una única escena plana (criatura + entorno fundidos en una sola imagen), el arte de producción se genera y almacena en **dos capas separadas** que se componen en tiempo de render dentro de la app (no se sirve una imagen pre-compuesta):

1. **Fondo de hábitat** — una ilustración de entorno sin ninguna criatura, generada una vez por combinación hábitat+fase y **reutilizada por todas las especies que comparten ese hábitat** (ej. varias especies volcánicas comparten el mismo fondo de lava). Vive en `especies_design/backgrounds/{habitatSlug}/{fase}.png`.
2. **Recorte de criatura** — la ilustración de la criatura sola, iluminada para que combine con el hábitat/fase de destino, generada sobre un fondo chroma-key verde plano (`#00FF00`) porque `gpt-image-2` no soporta un parámetro de fondo transparente real vía API. Vive en `especies_design/cutouts/{especieSlug}/{fase}.png`.

**Por qué este cambio (motivo original):** permite reutilizar fondos entre especies del mismo bioma (ahorro de coste y coherencia visual), resuelve gratis el problema de separación figura/fondo que costó varias iteraciones de prompt en el enfoque de escena plana (al ser capas distintas, no pueden fundirse visualmente), y permite recomponer la misma criatura sobre tratamientos de fondo distintos (ej. el full-art de Eco) sin regenerar la escena entera.

**Pipeline:**
- Generación: `scripts/generate-species-art-layered.mjs` (`npm run species:art:layered`) — genera el fondo (si no existe ya para ese hábitat+fase) y el recorte por separado, vía `images/generations` normal (no `images/edits`, ya que aquí no hay un ancla Balance sobre la que hacer image-to-image — cada capa se genera de forma independiente por fase, con las mismas reglas de diferenciación de pose que el flujo plano).
- Composición de previsualización/QA: `scripts/composite-species-art.mjs <cutout.png> <background.png> <out.png>` — quita el chroma-key (con `sharp`, detectando y haciendo transparentes los píxeles donde el verde domina claramente sobre rojo/azul, con des-halo de verde residual en los bordes) y pega el recorte sobre el fondo con escala/posición configurables. Es una herramienta de QA, no parte del pipeline de producción — la app real compone las capas en el cliente (imagen de fondo + `<img>` del recorte posicionado encima vía CSS), no sirve una imagen pre-compuesta.
- `habitatSlug`: campo corto opcional en la ficha-spec (ej. `"volcanico"`) para nombrar la carpeta de fondo compartido; si no está presente, se deriva con `slugify(habitat)` (puede dar nombres de carpeta largos si el texto de hábitat es descriptivo — se recomienda añadir `habitatSlug` explícito para especies que deban compartir fondo).

**Pendiente de decidir/documentar en el futuro:** cómo se resuelve exactamente la compra en la app (¿la especie referencia un `habitatSlug` en el schema para saber qué fondo usar, o cada `species_phase_anchors` guarda dos URLs — una de recorte y otra de fondo?) — de momento el schema (`species_phase_anchors.image_url`, campo único) sigue pensado para el flujo de escena plana; adaptar el schema a dos capas queda fuera del alcance de esta sesión.

**Confirmado en v5: este pendiente sigue sin resolverse, y en la práctica el pipeline de dos capas no es el que está en uso.** `species_phase_anchors` sigue con un único `image_url`, sin columnas de fondo/recorte separadas. El script que se sigue tocando activamente es el de escena plana (`scripts/generate-species-art.mjs`, con `IMAGE_SIZE='1536x1024'`, modificado más recientemente que el de dos capas); `scripts/generate-species-art-layered.mjs` existe pero no es el pipeline de producción vigente, y `scripts/composite-species-art.mjs` sigue siendo solo herramienta de QA. Esta sección (15.4.3) describe una decisión de arquitectura que se tomó pero que a día de hoy no gobierna la generación real de arte — tratarla como diseño de referencia/futuro, no como el pipeline activo.

#### 15.4.4 Catálogo fijo de hábitats canónicos (`habitatSlug`, validado en esta sesión)

El texto libre del campo `habitat` de cada ficha-spec (generado automáticamente, distinto en matiz para cada especie aunque el bioma sea el mismo) **no sirve para agrupar fondos reutilizables** — hace falta un campo aparte, `habitatSlug`, que asigna cada especie a uno de un catálogo fijo y pequeño de hábitats de diseño. Analizadas las 54 fichas de `scripts/lote.json`, el catálogo resultante es:

| `habitatSlug` | Nº especies (lote actual) | Descripción de diseño |
|---|---|---|
| `bosque-abierto-templado` | 16 | Bosque abierto/de coníferas, luz de día templada, claros entre árboles |
| `matorral-arido` | 9 | Matorral semiárido, terreno reseco y agrietado, vegetación escasa |
| `riberas-humedales` | 7 | Riberas de río, deltas y humedales fluviales, agua en calma, vegetación densa |
| `desierto-dunas` | 6 | Desierto de dunas, cielo despejado, calor visible |
| `pantano-oscuro` | 3 | Pantano/humedal boscoso brumoso y oscuro — para especies de Miedo/Asco (terror, putrefacción) |
| `pantano-dorado` | 3 | Pantano/marisma al atardecer, aguas estancadas doradas, luces flotantes — para especies de Sorpresa/Confianza |
| `llanura-abierta` | 3 | Llanura abierta/sabana semiárida, horizonte despejado |
| `costa-litoral` | 2 | Llanura costera o isla, acantilados, mar de fondo |
| `bosque-boreal-frio` | 2 | Bosque boreal/polar nevado, luz fría, clima gélido |
| `volcanico` | 1 | Tierras volcánicas y páramos de ceniza en erupción permanente |
| `valle-helado-cristal` | 1 | Valle montañoso helado, cascadas, cuevas de cristal, pterosaurios |
| `oceano-profundo` | 1 | Mar profundo/fosa oceánica, oscuridad abisal |

**Nota sobre `pantano-oscuro` / `pantano-dorado` (corregido en esta sesión):** un primer clustering automático agrupó las 6 especies de pantano en un único `pantano-crepuscular`, pero el terreno compartido escondía estados de ánimo (y Fractae) muy distintos — Miedo/Asco (terror, putrefacción) frente a Sorpresa/Confianza (asombro dorado). Un solo fondo por bioma habría forzado el mismo mood visual en especies que narrativamente piden lo contrario. Se dividió en dos sub-hábitats con el mismo terreno base pero paleta/luz de diseño distinta.

**Con 3 fases por hábitat, esto implica ~36 fondos totales para cubrir las 54 especies actuales** (en vez de 54×3=162 si se generase uno por especie) — ahorro de coste y consistencia visual entre especies del mismo bioma.

`habitatSlug` ya está rellenado en las 54 fichas de `scripts/lote.json` (y sincronizado en `scripts/species.wave1.json`). Al añadir especies nuevas, hay que asignarles uno de estos 12 slugs existentes (reutilizar, no crear uno nuevo salvo que el hábitat **y** el mood narrativo sean genuinamente distintos a los ya cubiertos).

### 15.5 Estrategia de lanzamiento: estado real (DESACTUALIZADO EN v4, corregido en v5 — contradecía a la propia sección 15.4.4 del documento)

~~Estado real a fecha de esta versión: solo 3 especies tienen ficha-spec y anclas diseñadas... se arranca con un subconjunto de validación de ~5 especies... 5 × 3 = 15 imágenes ancla pendientes de generar/curar~~. Esto ya estaba obsoleto en v4: la sección 15.4.4 del mismo documento habla de "las 54 fichas de `scripts/lote.json`", cifra que confirma la auditoría de v5 — `scripts/lote.json` contiene realmente **54 especies con ficha-spec**, no 3. `scripts/species.wave1.json` está vacío de entradas.

**Estado real confirmado en v5:** el diseño de ficha-spec del bestiario (texto/spec, sección 15.2) ya cubre 54 especies. Lo que sigue siendo limitado es el **arte curado y activo en producción**: solo hay **6 carpetas en `public/species-art/`** (ceratosaurus-pavonius, euoplocephalus-nauseabundus, huayangosaurus-inquisitus, telmatosaurus-mirus, triceratops-umbra, tyrannosaurus-imperator), que coinciden con las 6 especies marcadas `is_active=1` en `scripts/seed.sql`. Es decir: el cuello de botella ya no es "diseñar fichas-spec" (resuelto, 54 fichas) sino generar/curar las anclas de arte de las 48 especies restantes.

El resto del bestiario (hasta 40-60 especies) se sigue planteando en oleadas mensuales alineadas a Operaciones, tal como en v3 — pero eso es horizonte post-validación, no parte del MVP actual.

### 15.6 Generación por usuario: ancla vs. variante única, ligada a rareza

En el momento del descubrimiento, el sistema decide automáticamente si:

- (a) sirve directamente la **imagen ancla** ya curada (sin coste de generación adicional), o
- (b) genera una **variante visual única** vía image-to-image sobre el ancla correspondiente (con coste de API).

Tabla de referencia (ajustable, ya sembrada como `anchor_probability` en `rarity_tiers`):

| Tier | Slug | Prob. de servir ancla | Prob. de generar variante única |
|---|---|---|---|
| Especie Común | `registrada` | ~90% | ~10% |
| Especie Poco Común | `notable` | ~70% | ~30% |
| Especie Rara | `singular` | ~40% | ~60% |
| Especie Épica | `epica` | ~15% | ~85% |
| Especie Legendaria | `primordial` | ~0% | 100% |

**Justificación doble:** económica (el ahorro de coste se concentra en tiers comunes de alto volumen) y narrativa (lo legendario es garantizadamente único, como un "shiny").

**Nota:** que dos usuarios reciban exactamente la misma imagen ancla en tiers bajos es una consecuencia aceptada y coherente del sistema, no un bug a corregir.

**DESACTUALIZADO EN v5 — la tabla no refleja el seed real:** `scripts/seed.sql` siembra `anchor_probability = 1` (100%) para los 5 tiers por igual, sin la escala 90/70/40/15/0 descrita arriba. Hoy, en la práctica, siempre se sirve la imagen ancla curada y nunca se genera variante única en el momento del descubrimiento (`drop_weight` sí coincide con el diseño: 0.55/0.27/0.12/0.05/0.01). La tabla de esta sección sigue siendo el diseño objetivo, pero el dato sembrado en producción todavía no lo aplica — probablemente porque generar variantes únicas de las 48 especies pendientes de arte (sección 15.5) no tiene sentido antes de tener sus anclas base.

---

## 16. CARTAS DE RESONANCIA, GRIETAS Y REGALO — RECORDATORIO DE ALCANCE

Estas tres piezas (secciones 8, 9, 10) siguen siendo parte del lore completo del universo, pero **quedan explícitamente fuera del MVP en construcción ahora mismo** (ver sección 17). No se elimina nada del diseño, solo se pospone su implementación.

---

## 17. ALCANCE DEL MVP ACTUAL (NUEVO EN v4)

Bloque cerrado en la sesión de arranque técnico, para que quede registrado qué se está construyendo ahora mismo y en qué orden.

### 17.1 Ya implementado

- **Cuentas de usuario reales** sobre D1 (`users`, `sessions`) — registro con email+contraseña (PBKDF2), login, logout, cookies de sesión `HttpOnly`.
- **Colección personal** (`GET /api/collection/mine`) — el Álbum completo del usuario (sección 13), join `discoveries` → `species` → `fractae` → `rarity_tiers`.
- **Descubrimiento** (`POST /api/discover`) — recibe `speciesId` + `phase`, exige sesión activa, sortea rareza por `drop_weight`, decide ancla-vs-variante por `anchor_probability` de esa rareza, genera variante única vía OpenAI image-to-image cuando toca, inserta la captura en `discoveries`.
- **Rate limiting** por KV (hash SHA-256 del identificador, ventana de 1h, TTL igual al tiempo restante de ventana) aplicado a auth y a discover.

### 17.2 Decisión: ya no hace falta email-gate

Al haber cuentas reales, el email se captura **en el registro**, no en un gate post-descubrimiento como en el prototipo `DinoDiscovery`. Desde la base de datos se puede exportar a Kit (u otra herramienta de email marketing) cuando se decida activar comunicaciones — pendiente definir si hace falta un checkbox de consentimiento explícito en el registro antes de usar esos emails para marketing (no bloqueante para el MVP funcional, sí relevante antes de mandar el primer email real).

### 17.3 Siguiente bloque a construir (DESACTUALIZADO EN v4, cerrado en v5)

~~Perfil/stats de usuario — confirmado como el mínimo de MVP que falta antes de considerar la base "cerrada"~~. **Ya implementado:** `src/pages/PerfilPage.tsx` + `getMyProfile()` sirven rango de explorador y progreso de colección (`progressPct`, `speciesTotalCount`). También se construyó, sin haber quedado registrado en v4, el **sistema de energía** (sección 5.2), el **Altar de Fusión** (sección 5.1) y un **sistema de niveles/XP** (`functions/lib/xp.ts`): curva triangular `xpForLevel`/`levelFromXp`, `MAX_LEVEL = 50`, XP por rareza (`RARITY_XP`: 10/20/40/80/150 según tier), bonus de fusión (`FUSION_XP_BONUS = 50`) y de completar las 3 fases de una especie (`SPECIES_COMPLETE_XP_BONUS = 200`). Existe también `GIFT_REDEEMED_XP_BONUS = 25` ya definido en código pero sin efecto real, a la espera de que exista el endpoint de Regalo (sección 9).

**Siguiente bloque real a construir (v5):** Grietas, Regalo (que ni siquiera tiene endpoint todavía, sección 9), Cartas de Resonancia, leaderboards/amigos — en ese orden aproximado, sin fecha cerrada.

### 17.4 Fuera de alcance por ahora (explícito)

- Regalo bidireccional, leaderboards, lista de amigos (sección 9/16).
- Minijuego de Grietas / fase Eco (sección 8/16).
- Cartas de Resonancia (sección 10/16).
- Verificación de email, recuperación de contraseña, login social — deseables a futuro, no bloqueantes para el MVP actual (email+contraseña es suficiente por ahora).
- Distribución del sistema de rareza por Operación (sección 7) — el modo base usa una única distribución global; el mecanismo de override por Operación queda sin diseñar.

---

## 18. STACK TÉCNICO Y MAPEO LORE → IMPLEMENTACIÓN (NUEVO EN v4)

### 18.1 Stack elegido

**Cloudflare Pages + Pages Functions + D1 (SQL) + KV + R2**, gratuito en el rango de uso actual. Frontend: **React + Vite**, con capa **PWA** (`vite-plugin-pwa`: manifest + service worker) para instalación en móvil/tablet sin pasar por tienda de apps. Si en el futuro se quiere presencia en App Store/Play Store, la vía es envolver la misma build con **Capacitor** (no reescritura) — **React Native quedaría descartado** salvo necesidad real de APIs nativas profundas, que no se prevé para este producto.

### 18.2 Origen del código base

Gran parte de la capa de infraestructura (`rateLimit.ts`, `cache.ts`, `hash.ts`, `r2.ts`, `origin.ts`, `requestBody.ts`, `adminAuth.ts`, `images/[key].ts`) se portó tal cual desde el prototipo `DinoDiscovery` (github.com/melinDross/DinoDiscovery), ya probado en producción. La capa de negocio (wizard de atributos libres, `speciesHash.ts` de rareza por puntos, email-gate) **no se reutiliza** — el modelo de datos de Ecorex (catálogo fijo de especies + cuentas D1) es incompatible con el modelo de generación libre del prototipo. La capa visual (`Card.tsx`, `CardScene.tsx`, `cardCapture.ts`, `dinoCutout.ts`) está pendiente de portar y recablear a los datos reales de `discoveries`.

### 18.3 Mapeo schema.sql ↔ conceptos de lore

| Concepto de lore | Tabla / columna |
|---|---|
| Fractae (sección 4) | `fractae` |
| Operación (sección 7) | `operations` |
| Especie / ficha-spec (sección 15.2) | `species` (`physical_traits`, `base_palette`, `silhouette`) |
| Imagen ancla especie+fase (sección 15.4) | `species_phase_anchors` (`species_id`, `phase`, `image_url`) |
| Tier de rareza + su probabilidad ancla-vs-variante (sección 15.6) | `rarity_tiers.anchor_probability` |
| **Probabilidad de que salga cada tier en una captura** (sorteo independiente, sección 6) | `rarity_tiers.drop_weight` — **columna añadida en esta sesión**, no existía en v3 |
| Álbum / captura individual (sección 13) | `discoveries` (`user_id`, `species_id`, `phase`, `rarity_tier_id`, `image_url`, `is_unique_variant`, `discovery_code`) |
| Regalo (sección 9, futuro) | `gifts` (modelo unidireccional ya en schema, endpoint aún sin implementar) |
| Cartas de Resonancia (sección 10, futuro) | `resonance_cards` / `user_resonance_cards` |
| Notificaciones (sección 12, nuevo en v5) | `notifications` — inbox genérico (`type` texto libre, ej. `fusion_ready`/`level_up`, `payload` JSON, `read_at`) |
| Energía / nivel / rango de explorador (secciones 5.2 y 17.3, nuevo en v5) | `users` (`energy_count`, `energy_window_start`, `unlimited_energy`, `xp`, `explorer_rank`) |

**Faltaba en el mapeo de v4:** las dos filas anteriores (`notifications`, columnas de energía/XP en `users`) ya existían en el schema pero no estaban recogidas aquí.

**Aclaración importante confirmada en v4:** ni `species` ni `species_phase_anchors` tienen (ni deben tener) una columna de rareza fija — la rareza se sortea por captura, independientemente de qué especie/fase sea, tal como exige el eje ortogonal de la sección 6. `rarity_tiers.drop_weight` guarda esa distribución para el modo base (sin Operación activa); cuando exista una Operación con distribución propia, su mecanismo de override queda pendiente de diseño (sección 17.4).

---

## 19. ESTADO DEL PROYECTO (actualizado a v5)

### Completado desde v4 (nuevo en v5)

- **Altar de Fusión** (sección 5.1): mecanismo real de obtención de fase Exceso, sustituye la descripción vaga de v4.
- **Sistema de energía visible** (sección 5.2): 2 usos/12h para Percibir, sustituye el rate-limit silencioso de v4.
- **EcoDex con progreso real**: contador de especies registradas, badge de duplicados por fase, silueta/desbloqueo corregidos para no perder fases al fusionar.
- **Nav bar inferior persistente** con badges de notificaciones, energía y especies nuevas (evoluciona la sección 12).
- **Ritual de subida de nivel** a pantalla completa y sincronización de notificaciones en tiempo real.
- **Herramienta local de discovery de especies vía PBDB** (`npm run species:discover`, ver README) — no es lore de producto, es tooling de producción de contenido, pero cierra el hueco de grounding paleontológico mencionado en la sección 15.

### Correcciones de secciones desactualizadas (auditoría completa v4→v5)

- **Sección 12** (arquitectura): reescrita, "Explorar" no existe, tabs reales son Inicio/Percibir/EcoDex/Yo + Fusión/Notificaciones fuera de la nav.
- **Sección 17.3**: Perfil/stats ya no es "pendiente", está implementado.
- **Sección 9**: el endpoint de Regalo ni siquiera existe todavía (más atrás de lo que sugería v4).
- **Sección 13**: la vista "álbum de una especie" (multi-variante) sigue sin existir en frontend/API, aunque el schema la soporta.
- **Sección 15.4.3** (dos capas fondo+recorte): sigue sin implementarse en schema; el pipeline de arte activo hoy es el de escena plana (`generate-species-art.mjs`), no el de dos capas.
- **Sección 15.5**: contradecía a la propia sección 15.4.4 del documento — no son 3-5 especies, son **54 fichas-spec** ya diseñadas; el cuello de botella real es el arte curado (solo 6 especies activas con arte en `public/species-art/`).
- **Sección 15.6**: la tabla de `anchor_probability` por tier es el diseño objetivo, pero el seed real siembra 100% en los 5 tiers — hoy nunca se genera variante única en descubrimiento normal.
- **Sección 18**: añadidas `notifications` y las columnas de energía/XP/rango de `users` al mapeo, que faltaban.
- **Secciones 6, 7, 8, 14**: verificadas, siguen coincidiendo con el código sin cambios.

### Completado hasta v4

- Nombre final del universo/marca: **Ecorex** (sección 0).
- Arquitectura de app: 4 tabs, layout único adaptativo (sección 12).
- Modelo de datos del bestiario: Pokédex vs. Álbum (sección 13), ya implementado en D1.
- Modelo de producción del bestiario: fichas-spec, modificadores de fase, anclas curadas manualmente (sección 15).
- Sistema de probabilidad ancla vs. variante única (sección 15.6), implementado en `discover.ts`.
- **Stack técnico cerrado y en marcha**: Cloudflare Pages/Functions/D1/KV/R2, React+Vite+PWA para frontend (sección 18).
- **Cuentas de usuario, colección y descubrimiento ya implementados y probados** (sección 17.1).
- **Sorteo de rareza independiente de especie/fase** formalizado y resuelto técnicamente (`drop_weight`, sección 18.3) — hueco detectado y cerrado en esta sesión.

### Pendiente

- Diseñar las 2 especies adicionales (hasta llegar a 5) y generar/curar sus 15 anclas totales (sección 15.5).
- Construir el frontend React+Vite/PWA, empezando por **perfil/stats de usuario** (sección 17.3).
- Portar y recablear `Card.tsx`/`CardScene.tsx`/`cardCapture.ts` al modelo de datos real de `discoveries`.
- Diseñar el mecanismo de distribución de rareza por Operación (sección 7/18.3).
- Diseñar el regalo bidireccional, leaderboards y lista de amigos (sección 9/17.4) — explícitamente pospuesto.
- Decidir si hace falta checkbox de consentimiento de marketing antes de exportar emails a Kit (sección 17.2).
- Completar la rueda de fortalezas/vulnerabilidades de los 8 Fractae si se decide construir el sistema TCG de comparación.
- Diseñar el texto de lore de las 8 Cartas de Resonancia.
- Cerrar el número exacto de Base Species a largo plazo (rango orientativo 40–60) — no bloquea el MVP de validación con 5.
