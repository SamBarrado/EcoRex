// Pure pieces of ficha-spec generation (no I/O, no network): the Fractae table,
// the prompt and the parsing of the model's JSON answer. Shared by the CLI
// (tools/species/generate-species-spec.mjs) and Ecorex Admin so both build
// EXACTLY the same prompt. The API call itself stays in each caller.

export const FRACTAE = {
  alegria: { name: 'Alegría', latin: 'Lumen', color: 'amarillo/dorado', opposite: 'Tristeza (Tristitia)' },
  tristeza: { name: 'Tristeza', latin: 'Tristitia', color: 'azul', opposite: 'Alegría (Lumen)' },
  furia: { name: 'Furia', latin: 'Ira', color: 'rojo', opposite: 'Miedo (Pavor)' },
  miedo: { name: 'Miedo', latin: 'Pavor', color: 'morado', opposite: 'Furia (Ira)' },
  confianza: { name: 'Confianza', latin: 'Fides', color: 'verde', opposite: 'Asco (Fastidium)' },
  asco: { name: 'Asco', latin: 'Fastidium', color: 'verde oscuro', opposite: 'Confianza (Fides)' },
  sorpresa: { name: 'Sorpresa', latin: 'Stupor', color: 'naranja', opposite: 'Curiosidad (Spes)' },
  curiosidad: { name: 'Curiosidad', latin: 'Spes', color: 'lila', opposite: 'Sorpresa (Stupor)' },
};

function normalizeKey(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function resolveFractae(input) {
  const f = FRACTAE[normalizeKey(input)];
  if (!f) {
    throw new Error(
      `Fractae "${input}" no reconocido. Usa uno de: ${Object.values(FRACTAE).map((f) => f.name).join(', ')}`
    );
  }
  return f;
}

export function buildPrompt(especie, fractae, realData, group = null) {
  const realDataBlock = realData
    ? `\nDATOS REALES VERIFICADOS (usa esto como fuente de verdad por encima de tu propio conocimiento — si hay conflicto, estos datos ganan):\n${realData}\n`
    : `\n(No se encontraron datos verificados de esta especie en las bases de datos consultadas — usa tu mejor conocimiento general, pero sé conservador y no inventes detalles muy específicos.)\n`;

  const groupBlock = group && !group.dinosaur ? groupNotice(group) : '';

  return `Eres el equipo de lore/diseño de bestiario de ECOREX. Cada criatura es la manifestación
física de un Fractae (núcleo emocional puro) a través de una especie portadora (dinosaurio), en
una de tres Fases: Balance, Exceso o Eco (Fase ≠ Rareza, son ejes independientes; no asignes rareza).

Datos de entrada:
- Especie base (nombre científico real o parcial de dinosaurio): ${especie}
- Fractae asociado: ${fractae.name} (${fractae.latin}), color canónico: ${fractae.color}
${realDataBlock}${groupBlock}
Deriva TODO lo demás:
- scientificName: nombre científico completo y plausible (género + epíteto en latín), coherente
  con la especie base dada y con el Fractae.
- commonName: apodo corto en español, evocador, tono épico/misterioso (NO infantil-tierno, NO
  cursi), coherente con especie + Fractae.
- traits: 3-5 rasgos físicos fijos y concretos. Si hay datos reales verificados arriba, básalos
  en la taxonomía/forma corporal/dieta real (ej. si dice "Ornithopoda, walked on four legs",
  refleja eso); si no hay datos, usa tu mejor conocimiento general de la anatomía real de la
  especie base. Estilízalos para encajar con el Fractae, pero sin contradecir la anatomía/
  comportamiento real (ej. no le des garras de ataque a un herbívoro de pico de pato).
- habitat: el hábitat/ecología REAL y concreto de la especie base (terrestre árido, semi-acuático
  fluvial, marino, boscoso templado, polar, etc.) — usa el periodo/países/tipo de hábitat de los
  datos reales si están disponibles. Esto es clave: es lo que hará que la Fase Eco de esta especie
  no se parezca a la de otra especie con el mismo Fractae (docs/lore_world_bible_ecorex_v4.md §15.3).
  No lo generalices como "prehistórico": sé específico sobre el tipo de terreno/agua/clima.
- palette: colores ligados al color canónico del Fractae (${fractae.color}) combinados con tonos
  naturales de la especie.
- silhouette: una frase sobre postura/tipo de cuerpo, coherente con la locomoción/forma corporal
  real si hay datos disponibles (bípedo/cuadrúpedo, depredador/herbívoro, etc.).
- closestFamousRelative: el dinosaurio MUY conocido (T-Rex, Triceratops, Velociraptor,
  Stegosaurus, Brachiosaurus, Ankylosaurus, Parasaurolophus, etc.) cuyo plan corporal general
  (postura, proporciones, tipo bípedo/cuadrúpedo, silueta) se parece más a esta especie base. Si
  hay datos reales de taxonomía arriba (ej. "Thyreophora,Stegosauria"), úsalos para elegir el
  pariente correcto con criterio real, no solo por intuición. Esto es clave para especies poco
  conocidas: sirve de ancla anatómica en el prompt de imagen, porque el modelo de imagen tiene un
  prior visual mucho más fuerte para los dinosaurios famosos y tiende a "derivar" hacia ellos
  (normalmente hacia un terópodo tipo raptor) si no se le da esta ancla explícita. Si la especie
  base YA es uno de los famosos, pon el mismo nombre.
- distinguishingFromRelative: CRÍTICO — nombrar solo el pariente famoso es peligroso, porque el
  modelo de imagen puede copiarle rasgos icónicos que esta especie NO tiene (ej. decir "como un
  Parasaurolophus" puede hacer que le añada la cresta tubular a un Telmatosaurus, que no la tiene).
  Aquí debes listar explícitamente, usando tu conocimiento paleontológico real (no las bases de
  datos, que no llegan a este nivel de detalle): (a) qué rasgo(s) icónico(s) del pariente famoso
  esta especie NO tiene y hay que excluir explícitamente, y (b) qué la diferencia concretamente
  (tamaño, cresta o ausencia de ella, forma del cráneo, armadura, etc.). Sé concreto y factual, no
  inventes si no lo sabes con razonable certeza — en ese caso di "sin diferencias craneales
  notables conocidas" en vez de inventar.
- lorePhrase: una línea de lore, tono épico/misterioso.

Responde SOLO con un objeto JSON, sin texto adicional, sin markdown, con esta forma exacta:
{"scientificName": "...", "commonName": "...", "traits": "...", "habitat": "...", "palette": "...", "silhouette": "...", "closestFamousRelative": "...", "distinguishingFromRelative": "...", "lorePhrase": "..."}`;
}

/** Strips optional ```json fences and parses the model's answer. Throws on invalid JSON. */
export function parseModelJson(text) {
  const jsonText = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(jsonText);
}

// Only for species outside Dinosauria. The default prompt (no group / dinosaurs) is unchanged.
function groupNotice(group) {
  const examples = group.relatives?.length ? ` (por ejemplo: ${group.relatives.join(', ')})` : '';
  return `
AVISO DE GRUPO: esta especie NO es un dinosaurio; pertenece a «${group.label}». Donde estas instrucciones digan «dinosaurio», entiéndelo como este grupo de reptiles prehistóricos. Reglas adicionales:
- closestFamousRelative debe ser un animal MUY conocido de ESTE MISMO grupo${examples}, nunca un dinosaurio.
- No le atribuyas rasgos de dinosaurios ni de otros grupos (p. ej. no es un terópodo ni un saurópodo); mantén su anatomía y locomoción reales (vuelo, natación, etc.).
- distinguishingFromRelative debe seguir las mismas reglas, comparando con ese pariente del mismo grupo.
`;
}
