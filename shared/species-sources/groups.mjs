// Taxonomic groups Species Discovery can search. PBDB covers all fossil life, not only
// dinosaurs; this list is the scope WE choose. Adding a group = adding an entry here.
//
// Canon: World Bible v7 §1 — any real prehistoric creature can carry a Fractae (and invented
// creatures may come in the future). `dinosaur: false` is informational (it changes the
// prompt wording and labels the draft), NOT a restriction. A future "invented creature" flow
// would not use PBDB at all and is not implemented.
export const GROUPS = {
  dinosaurios: {
    label: 'Dinosaurios',
    baseNames: ['Dinosauria'],
    dinosaur: true,
    relatives: [],
  },
  pterosaurios: {
    label: 'Pterosaurios',
    baseNames: ['Pterosauria'],
    dinosaur: false,
    relatives: ['Pteranodon', 'Quetzalcoatlus', 'Pterodactylus'],
  },
  'reptiles-marinos': {
    label: 'Reptiles marinos (plesiosaurios, ictiosaurios, mosasaurios)',
    baseNames: ['Plesiosauria', 'Ichthyosauria', 'Mosasauridae'],
    dinosaur: false,
    relatives: ['Mosasaurus', 'Plesiosaurus', 'Ichthyosaurus'],
  },
  cocodrilomorfos: {
    label: 'Cocodrilomorfos',
    baseNames: ['Crocodylomorpha'],
    dinosaur: false,
    relatives: ['Sarcosuchus', 'Deinosuchus'],
  },
};

export const DEFAULT_GROUP = 'dinosaurios';

/** Returns the group for a key, or null when the key is unknown (never trust client input). */
export function resolveGroup(key) {
  return Object.prototype.hasOwnProperty.call(GROUPS, key ?? DEFAULT_GROUP) ? { key: key ?? DEFAULT_GROUP, ...GROUPS[key ?? DEFAULT_GROUP] } : null;
}
