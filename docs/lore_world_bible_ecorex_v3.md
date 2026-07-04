# LORE / WORLD BIBLE v3 — ECOREX

> Esta versión sustituye a `lore_world_bible_eco-fractura_v2.md` como documento de referencia. Mantiene íntegro todo lo válido de la v2 (mito fundacional, sistema de Fractae, fases, rareza, operaciones, grietas, trading, cartas de resonancia) y añade las decisiones tomadas en la sesión de cierre de naming, arquitectura de app y modelo de producción del bestiario. Donde haya conflicto entre v2 y v3, v3 tiene prioridad.

---

## 0. NOMBRE DEL UNIVERSO/MARCA (CERRADO)

El nombre final del proyecto es **Ecorex**.

Decisión clave de esta sesión: el universo/marca usa **un único nombre, sin doble capa científico/común**. El patrón de doble nombre (científico + popular) se reserva exclusivamente para:

- Los **Fractae individuales** (ej. Lumen/Alegría, Ira/Furia) — ver sección 4.
- Las **especies de dinosaurio** (ej. *Tyrannosaurus imperator* / "Rex de Fuego") — ver sección 14.

**Razón de la decisión:** el nombre del universo funciona como marca (icono, App Store, portada), no como elemento de UI que el usuario vea repetido en dos registros dentro de cada carta. Forzar una doble capa ahí resuelve un problema que no existe a ese nivel — el criterio correcto es un nombre único que suene bien tanto en boca de un niño de 5 años como en una portada de coleccionable para adulto.

**Candidatos descartados en el proceso:** CHRONEX (demasiado burocrático/técnico), Eco-Fractura (nombre de trabajo, registro fonético pesado), Eco-Fractae (colisiona semánticamente con el término "Fractae" ya usado internamente para el núcleo emocional de cada carta), Almasaurios (fuerte pero con posible carga religiosa en algunos mercados), Latidosaurios (válido pero descartado a favor de Ecorex), Fractura Viva, Vestigio, Resonancia, El Despertar, Grieta, Primordia.

---

## 1. PREMISA DEL UNIVERSO

*(heredado de v2, sin cambios)*

Los **Fractae** son fuerzas emocionales puras. No son criaturas por sí mismas — necesitan un **portador** físico para manifestarse en el plano material.

En este universo, **el único portador es el dinosaurio**. No hay puertas abiertas a otras especies por ahora: foco total.

---

## 2. MITO FUNDACIONAL — LA FRACTURA

*(heredado de v2, sin cambios — "La Fractura" sigue siendo el nombre del evento mítico dentro de la narrativa, aunque ya no sea el nombre de marca del universo)*

Hace 66 millones de años, el impacto que extinguió a los dinosaurios no solo acabó con especies físicamente: generó la mayor descarga de trauma emocional colectivo de la historia del planeta — terror, pérdida, furia, sorpresa, todo a la vez, en cada ser vivo.

Esa emoción no se disipó. Quedó atrapada, fragmentada, dormida durante millones de años — como fósiles, pero emocionales.

Algo reciente ha vuelto a agrietar esa barrera. Por eso los Fractae están resurgiendo ahora.

Los dinosaurios no "resucitan" literalmente. Son la forma que toma la emoción atrapada al manifestarse — el portador, no el animal en sí.

**Tono confirmado:** este mito funciona tal cual para la capa de 5 años, sin necesidad de suavizarlo más.

### El rol del jugador

El explorador (el usuario) no es un científico de un consorcio burocrático. Es alguien con la sensibilidad para **percibir** lo que la mayoría no puede ver — conecta directamente con la regla heredada de Fractae original: *"no todos perciben Fractae"*.

---

## 3. ESTRUCTURA UNIVERSAL DE CARTA

*(heredado de v2, sin cambios)*

```
Fractae (núcleo emocional)
+ Especie portadora (el dinosaurio)
+ Fase (Calma / Furia / Eco)
+ Rareza (eje independiente, ver sección 6)
```

### Ejemplo aplicado

```
Fractae:             Furia (Ira)
Especie portadora:   Tyrannosaurus imperator — "T-Rex del Magma"
Fase:                Furia
Rareza:               Épica
Operación:           IGNEA
Discovery ID:        DX-VOL-F7K
```

---

## 4. SISTEMA DE FRACTAE (8 tipos)

*(heredado de v2, sin cambios)*

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

*(heredado de v2, sin cambios)*

| Fase original | Fase Ecorex | Significado |
|---|---|---|
| Equilibrio | **Calma** | estable, forma base |
| Exceso | **Furia** | desbordado, intensificado |
| Residuo | **Eco** | versión tenue, casi fantasmal |

**Regla:** Fase ≠ Intensidad, y por extensión, Fase ≠ Rareza.

### Cómo se obtiene cada fase

1. **Calma** → flujo principal (generador por atributos). Siempre disponible.
2. **Furia** → se desbloquea por acumulación: rachas de uso, duplicados de la misma especie, o completar una Operación entera.
3. **Eco** → exclusiva del minijuego de grietas. No es una especie nueva — es el eco de una especie ya descubierta.

---

## 6. RAREZA × FASES (ejes independientes)

*(heredado de v2, sin cambios)*

Rareza y Fase son ejes ortogonales. Matriz de 5 rarezas × 3 fases = 15 estados posibles por especie. El Discovery ID (`DX-HAB-DSC`) incluye un carácter adicional para codificar la fase.

---

## 7. OPERACIONES (expediciones temáticas)

*(heredado de v2, sin cambios)*

| Operación | Fractae dominante |
|---|---|
| IGNEA | Furia (Ira) |
| ABISAL | Miedo (Pavor) / Asco (Fastidium) |
| GLACIAR | Tristeza (Tristitia) |
| UMBRA | Sorpresa (Stupor) / Curiosidad (Spes) |

**Modelo de expansión geográfica (híbrido, confirmado):** la mayoría del contenido es accesible para todos. Algunas variantes Eco especialmente raras se desbloquean solo en ubicaciones reales con resonancia temática.

**NUEVO en v3 — Las Operaciones como motor de expansión del bestiario:** cada Operación mensual no solo sesga qué Fractae aparecen más — ahora es también el vehículo narrativo por el que se **añaden especies nuevas al bestiario** (ver sección 15, Modelo de Producción). Esto convierte cada lanzamiento mensual en un evento de contenido real, no solo un cambio de probabilidades.

---

## 8. MINIJUEGO DE GRIETAS (pseudo-AR)

*(heredado de v2, sin cambios)*

Mecánica ligera de exploración, no-batalla. Overlay simple (SVG/CSS) sobre el feed de cámara, sin tracking real de superficie — pseudo-AR ligera para MVP, sin WebXR.

- **Disparador:** vinculado a Operaciones activas y, parcialmente, a ubicación real.
- **Recompensa:** acceso a fase Eco de especies ya descubiertas (nunca especies nuevas).
- **Requisito de acceso (NUEVO v3):** la sección de Grietas solo está activa si el usuario ya tiene al menos una especie en fase Calma. Si no, aparece bloqueada/vacía con mensaje contextual.

---

## 9. TRADING ENTRE USUARIOS — "REGALO"

*(heredado de v2, sin cambios)*

Modelo unidireccional: generar código/enlace de una carta concreta, canjeable una sola vez por el receptor. Sin negociación, sin matchmaking. Trading bidireccional con D1 queda como posible v2.

---

## 10. CARTAS DE RESONANCIA

*(heredado de v2, sin cambios)*

Serie especial de 8 cartas, una por Fractae, sin dinosaurio — solo la energía pura representada de forma abstracta. Pull ultra-raro, objetivo de coleccionismo serio para el adulto.

---

## 11. DECISIONES LINGÜÍSTICAS

*(heredado de v2, sin cambios)*

- Idioma base: español.
- Naming de tipos (Fractae): latín pleno para el registro científico.
- Copy externalizado como datos desde el inicio, preparado para internacionalización futura.

---

## 12. ARQUITECTURA DE APP (NUEVO EN v3)

Tras evaluar tres direcciones (A — Diario del Explorador / B — Mapa Vivo / C — Doble Capa Física), se selecciona:

### Alternativa elegida: A — "El Diario del Explorador"

El generador es el home. Navegación por tab bar inferior de 4 secciones:

**1. Explorar (home)**
- Banner de la Operación activa.
- Botón central de generación ("Descubre").
- Recordatorio de progreso ("Llevas 7 especies. Te faltan 3 de esta Operación").
- Al generar: flujo de atributos enmarcado como protocolo de expedición → animación de revelación a pantalla completa → momento de compartir → email gate post-reveal (no antes).

**2. Mi Colección (el Pokédex)**
- Grid de especies activas del bestiario.
- No descubiertas → silueta misteriosa.
- Descubiertas → imagen ancla canónica + indicador de fases obtenidas (Calma/Furia/Eco).
- Al tocar una especie descubierta → entra al **álbum de esa especie** (ver sección 13).

**3. Grietas**
- Overlay pseudo-AR, solo activo si hay al menos una especie en Calma.
- Acceso a fase Eco de especies ya descubiertas.

**4. Yo (perfil)**
- Rango de explorador, progreso de Operación, regalos pendientes, gestión de cuenta/email.

### Decisión sobre capas de audiencia (NUEVO en v3)

**Un único layout, adaptativo, sin modos separados.** Se descarta la idea de un "Modo Explorador Pequeño" completamente distinto del "Modo Coleccionista" (Alternativa C) para esta primera versión. Mismo layout, mismo lenguaje visual (iconos + texto), accesible para todas las edades a la vez — evita duplicar UI, lógica de estado y testing en una v1. Un modo separado queda como posible mejora de v2, condicionado a datos de uso real, no a suposición previa.

---

## 13. MODELO DE DATOS DEL BESTIARIO: POKÉDEX vs. ÁLBUM (NUEVO EN v3)

Se establecen dos estructuras de datos distintas y complementarias:

### Pokédex / Bestiario (nivel especie)

- Catálogo objetivo, igual para todos los usuarios.
- Cada entrada muestra la **imagen ancla canónica** de la especie+fase — nunca la variante personal de un usuario. Esto es así para mantener el Pokédex como referencia consistente, no personalizada.
- Las especies no descubiertas se muestran como **silueta misteriosa**, generada automáticamente a partir de la imagen ancla ya aprobada (filtro/CSS, sin coste de diseño adicional).
- Uso principal: mostrar progreso de colección ("23/40"), vista "limpia" y compartible.

### Álbum / Colección personal (nivel instancia)

- Lista completa de **todas las cartas individuales** que el usuario ha descubierto, duplicados incluidos.
- Cada instancia tiene su propia variante visual (cuando aplica, ver sección 15), su propio Discovery ID, fecha y rareza concreta de esa captura.
- Aquí vive la opción de "Regalar" sobre una carta específica.
- Uso principal: vista "presumir", valor real del coleccionismo (duplicados no son ruido, son moneda social).

---

## 14. ESPECIES Y NAMING (heredado de v2, recordatorio)

Patrón de doble capa para cada dinosaurio, igual que en v2:

- Nombre científico (latín) → registro adulto/coleccionista, visible en la carta.
- Nombre común (palabra niño) → registro principal de interacción.

Ejemplo: *Tyrannosaurus imperator* / "Rex de Fuego".

---

## 15. MODELO DE PRODUCCIÓN DEL BESTIARIO (NUEVO EN v3 — sección completa)

Esta sección formaliza cómo se generan y gestionan las imágenes del bestiario, resuelto en la sesión de cierre de naming/arquitectura.

### 15.1 Naturaleza híbrida (confirmada)

El bestiario **no es puramente generativo**. Existe un catálogo fijo de **Base Species** (rango recomendado 40–60, número exacto aún pendiente de cierre) sobre el que se generan variantes visuales por IA. Esto resuelve a la vez el problema de progresión/coleccionismo (catálogo completable, como un Pokédex) y evita que todo el contenido esté disponible sin restricción desde el día uno.

### 15.2 Unidad real de diseño: specs de texto, no ilustraciones

El trabajo de diseño humano por especie **no es ilustrar a mano**. Es redactar una **ficha-spec** estructurada por especie (ejemplo):

```
Especie: Tyrannosaurus imperator
Nombre niño: "Rex de Fuego"
Fractae asociado: Furia (Ira)
Rasgos físicos fijos: cuerpo robusto, cresta dorsal, mandíbula prominente
Paleta base: rojos/naranjas/negros
Silueta distintiva: bípedo, cola larga, brazos cortos
```

Esta ficha actúa como prompt-semilla para GPT Image 2, garantizando que la misma especie sea reconociblemente consistente entre distintos usuarios.

### 15.3 Modificadores de fase (reutilizables, no por especie)

Las 3 fases **no multiplican la carga de diseño por especie**. Se definen una sola vez como modificadores de prompt reutilizables sobre las 40+ fichas:

```
Calma → forma estable, postura serena, brillo suave
Furia → forma intensificada, postura agresiva, brillo ardiente, grietas de energía
Eco → forma translúcida, casi fantasmal, partículas dispersándose
```

Carga real de diseño de contenido: **40 fichas-spec + 3 modificadores de fase**, no 120 piezas independientes.

### 15.4 Imágenes ancla: generación, curación y consistencia

Decisión confirmada: **imagen ancla por especie+fase, generada con image-to-image y curada manualmente** (no se confía en generación libre por texto cada vez, para garantizar consistencia visual entre usuarios).

- Por cada especie: se genera la imagen ancla de Calma a partir de la ficha-spec, se revisa y aprueba.
- A partir de esa ancla Calma, se generan (vía image-to-image + modificador de fase) las anclas de Furia y Eco.
- **Las tres fases se curan manualmente antes de aprobarse** — no se confía en el resultado automático del modificador sin revisión, dado que el producto tiene como usuario principal a un niño de 5 años y el margen de error visual debe ser mínimo.
- Carga real de producción visual: **120 imágenes ancla a curar** (40 especies × 3 fases) antes de tener el bestiario completo activo.

### 15.5 Estrategia de lanzamiento: oleadas, no bestiario completo

Dado el volumen de curación (120 anclas), el MVP **no lanza con las 40+ especies activas**. Lanza con un **subconjunto reducido y curado (orientativamente 10–15 especies)**, y el resto del bestiario se construye y libera en oleadas mensuales, alineadas a las Operaciones activas. Esto convierte la ampliación del bestiario en contenido de marketing recurrente: cada Operación mensual no solo cambia probabilidades, también introduce especies nuevas reales al mundo.

### 15.6 Generación por usuario: ancla vs. variante única, ligada a rareza

En el momento del descubrimiento por parte de un usuario, el sistema decide automáticamente (de forma invisible para el usuario) si:

- (a) sirve directamente la **imagen ancla** ya curada (sin coste de generación adicional), o
- (b) genera una **variante visual única** vía image-to-image sobre el ancla correspondiente (con coste de API).

Esta probabilidad está **ligada al tier de rareza de la captura**, no es fija ni uniforme. Tabla de referencia (ajustable):

| Tier | Prob. de servir ancla | Prob. de generar variante única |
|---|---|---|
| Especie Registrada (común) | ~90% | ~10% |
| Especie Notable | ~70% | ~30% |
| Especie Singular | ~40% | ~60% |
| Especie Épica | ~15% | ~85% |
| Especie Primordial (legendaria) | ~0% | 100% |

**Justificación doble:**
- **Económica:** el ahorro de coste de API se concentra donde hay más volumen de tráfico (tiers comunes), mientras que el gasto en generación única se concentra donde más valor aporta (tiers altos).
- **Narrativa:** refuerza el sistema de rareza ya existente — lo común puede repetirse visualmente entre usuarios sin problema (es coherente con ser común), mientras que lo legendario es garantizadamente único, como un "shiny" — la pieza más codiciada de la colección no solo es rara por probabilidad de aparición, también es visualmente irrepetible.

**Nota:** que dos usuarios reciban exactamente la misma imagen ancla en tiers bajos es una consecuencia aceptada y coherente del sistema, no un bug a corregir.

---

## 16. ESTADO DEL PROYECTO (actualizado a v3)

### Completado en esta sesión (sobre lo ya cerrado en v2)

- Nombre final del universo/marca: **Ecorex** (sección 0).
- Arquitectura de app seleccionada: Alternativa A, Diario del Explorador, con navegación de 4 tabs (sección 12).
- Decisión de capas de audiencia: layout único adaptativo, sin modos separados para v1 (sección 12).
- Modelo de datos del bestiario: separación formal entre Pokédex (nivel especie, ancla canónica) y Álbum (nivel instancia, con duplicados) (sección 13).
- Modelo de producción completo del bestiario: fichas-spec, modificadores de fase reutilizables, anclas curadas manualmente, estrategia de lanzamiento por oleadas (sección 15).
- Sistema de probabilidad ancla vs. variante única, ligado al sistema de rareza existente (sección 15.6).

### Pendiente

- Cerrar el número exacto de Base Species (rango recomendado 40–60) y decidir cuáles forman el subconjunto de lanzamiento (10–15).
- Redactar las 40+ fichas-spec de especie.
- Generar y curar las imágenes ancla del subconjunto de lanzamiento.
- Completar la rueda de fortalezas/vulnerabilidades de los 8 Fractae si se decide construir el sistema TCG de comparación.
- Decidir si el niño accede al minijuego de grietas de forma acompañada o si queda fuera de su capa de experiencia.
- Diseñar el texto de lore de las 8 Cartas de Resonancia.
- Desarrollar el detalle pantalla por pantalla (wireframes en texto) de la Alternativa A.
