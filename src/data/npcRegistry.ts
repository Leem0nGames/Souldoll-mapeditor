/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NPCGender, NPCSpriteRef, NPC } from '../types';

export interface NPCRegistryEntry {
  id: string;
  name: string;
  gender: NPCGender;
  frameIndex: number; // 0..15 in its respective gender sheet
  globalIndex: number; // 0..15 female, 16..31 male
  role: string;
  region: 'villa_marioneta' | 'bosque_sombra' | 'gran_lago' | 'desierto' | 'templo' | 'reserva';
  isStoryActive: boolean;
  defaultDialogue: string[];
  questId?: string;
}

/**
 * Large Master NPC Registry indexing all 32 frontal sprites (16 Female + 16 Male).
 * Active story NPCs are placed in Villa Marioneta.
 * The remaining catalogued NPCs are available to expand quests, zones, and narrative encounters.
 */
export const NPC_REGISTRY: Record<string, NPCRegistryEntry> = {
  // ==========================================
  // CORE STORY-ESSENTIAL NPCS (VILLA MARIONETA)
  // ==========================================
  kaelen: {
    id: 'npc-elder',
    name: 'Anciano Kaelen',
    gender: 'male',
    frameIndex: 0,
    globalIndex: 16, // male frame 0
    role: 'Sabio de Almas & Mentor',
    region: 'villa_marioneta',
    isStoryActive: true,
    questId: 'water_soul_quest',
    defaultDialogue: [
      '¡Saludos, joven Marionetista! He dedicado mi vida a estudiar los lazos entre las almas y nuestros muñecos.',
      'Misión: En el Gran Lago al este habitan almas de Agua puras como Aquelle. ¡Captura una para consagrar el santuario y te daré 3 Cristales Superiores!',
      'Ten presente la regla de oro: si destruyes el Torso de una Doll rival, su alma queda expuesta para ser capturada o purificada.',
    ],
  },

  mira: {
    id: 'npc-alchemist',
    name: 'Alquimista Mira',
    gender: 'female',
    frameIndex: 0,
    globalIndex: 0, // female frame 0
    role: 'Alquimista de la Fuente Sagrada',
    region: 'villa_marioneta',
    isStoryActive: true,
    defaultDialogue: [
      '¡Bienvenido a la plaza de Villa Marioneta! Esta Fuente Sagrada bendice y restaura el HP de todas tus almas.',
      'Acércate a sus aguas y pulsa [E] cuando tu equipo necesite reponerse de la batalla.',
      'Recuerda cuidar la Estabilidad de tu Doll: baja con los impactos fuertes. ¡Si llega a 0, la muñeca se desarma!',
    ],
  },

  selene: {
    id: 'npc-selene',
    name: 'Selene la Rival',
    gender: 'female',
    frameIndex: 5,
    globalIndex: 5, // female frame 5
    role: 'Rival Marionetista',
    region: 'villa_marioneta',
    isStoryActive: true,
    defaultDialogue: [
      '¡Vaya, si es Robin! ¿Aún estás calibrando tu primera muñeca en el taller?',
      '¡Mi Doll de Fuego está casi lista para la marcha! ¡Veamos quién purifica primero al Jefe del Templo!',
    ],
  },

  tobias: {
    id: 'npc-apprentice',
    name: 'Tobías el Marionetista',
    gender: 'male',
    frameIndex: 2,
    globalIndex: 18, // male frame 2
    role: 'Artesano del Taller',
    region: 'villa_marioneta',
    isStoryActive: true,
    defaultDialogue: [
      '¡Hola vecino! Qué buen día para afinar engranajes y tallar madera sagrada.',
      'En el Taller ensamblamos las Dolls por partes: Cabeza para precisión, Torso para resistencia, Brazos para ataque y Piernas para velocidad.',
      '¡Si una parte del rival cae a 0 en combate, pierde esa función por completo!',
    ],
  },

  thorne: {
    id: 'npc-guard',
    name: 'Guardia Thorne',
    gender: 'male',
    frameIndex: 3,
    globalIndex: 19, // male frame 3
    role: 'Centinela de la Ruta 1',
    region: 'villa_marioneta',
    isStoryActive: true,
    defaultDialogue: [
      '¡Alto ahí, caminante! Más allá de este arco comienza la Ruta 1 del Bosque Sombra.',
      'Si caminas por la hierba alta, las almas salvajes te desafiarán a combate por turnos.',
      'Aprovecha las debilidades elementales: Fuego quema Planta, Planta absorbe Agua, Agua apaga Fuego (+50% de daño).',
    ],
  },

  // ==========================================
  // EXPANSION CATALOG: FEMALE ROSTER (NPC06)
  // Ready to be assigned to new quests / areas
  // ==========================================
  f_lyanna: {
    id: 'npc-f-lyanna',
    name: 'Herbolaria Lyanna',
    gender: 'female',
    frameIndex: 1,
    globalIndex: 1,
    role: 'Botánica del Bosque',
    region: 'bosque_sombra',
    isStoryActive: false,
    defaultDialogue: ['Recolecto esencias medicinales en la orilla del bosque.'],
  },
  f_vanya: {
    id: 'npc-f-vanya',
    name: 'Cazadora Vanya',
    gender: 'female',
    frameIndex: 2,
    globalIndex: 2,
    role: 'Rastreadora del Desierto',
    region: 'desierto',
    isStoryActive: false,
    defaultDialogue: ['En las dunas del sur, las almas de Fuego son rápidas e implacables.'],
  },
  f_nia: {
    id: 'npc-f-nia',
    name: 'Aprendiz Nia',
    gender: 'female',
    frameIndex: 3,
    globalIndex: 3,
    role: 'Artesana de Botellas',
    region: 'villa_marioneta',
    isStoryActive: false,
    defaultDialogue: ['Fabricar una Soul Bottle requiere cristal puro y alineación lunar.'],
  },
  f_ren: {
    id: 'npc-f-ren',
    name: 'Domadora Ren',
    gender: 'female',
    frameIndex: 4,
    globalIndex: 4,
    role: 'Instructora de Ki',
    region: 'reserva',
    isStoryActive: false,
    defaultDialogue: ['El Ki es el pulso de la batalla. Acumúlalo con paciencia.'],
  },
  f_yuki: {
    id: 'npc-f-yuki',
    name: 'Vidente Yuki',
    gender: 'female',
    frameIndex: 6,
    globalIndex: 6,
    role: 'Oráculo de Cristal',
    region: 'templo',
    isStoryActive: false,
    defaultDialogue: ['Las sombras se agitan en el Templo... prepárate bien.'],
  },
  f_elena: {
    id: 'npc-f-elena',
    name: 'Tejedora Elena',
    gender: 'female',
    frameIndex: 7,
    globalIndex: 7,
    role: 'Sastrería Arcana',
    region: 'villa_marioneta',
    isStoryActive: false,
    defaultDialogue: ['Telas encantadas para amortiguar el desgaste de las Dolls.'],
  },
  f_astrid: {
    id: 'npc-f-astrid',
    name: 'Guardián Astrid',
    gender: 'female',
    frameIndex: 8,
    globalIndex: 8,
    role: 'Centinela de Hielo',
    region: 'bosque_sombra',
    isStoryActive: false,
    defaultDialogue: ['El frío endurece el metal y serena el espíritu.'],
  },
  f_talia: {
    id: 'npc-f-talia',
    name: 'Mercader Talia',
    gender: 'female',
    frameIndex: 9,
    globalIndex: 9,
    role: 'Buhonera Nómade',
    region: 'desierto',
    isStoryActive: false,
    defaultDialogue: ['¡Traigo especias y gemas de las lejanas tierras del sol!'],
  },
  f_freya: {
    id: 'npc-f-freya',
    name: 'Sacerdotisa Freya',
    gender: 'female',
    frameIndex: 10,
    globalIndex: 10,
    role: 'Clériga del Templo',
    region: 'templo',
    isStoryActive: false,
    defaultDialogue: ['Purificar un alma libera su memoria del rencor corrupto.'],
  },
  f_morrigan: {
    id: 'npc-f-morrigan',
    name: 'Erudita Morrigan',
    gender: 'female',
    frameIndex: 11,
    globalIndex: 11,
    role: 'Archivista Antigua',
    region: 'templo',
    isStoryActive: false,
    defaultDialogue: ['Los códices antiguos detallan los 100 espíritus originales.'],
  },
  f_chloe: {
    id: 'npc-f-chloe',
    name: 'Exploradora Chloe',
    gender: 'female',
    frameIndex: 12,
    globalIndex: 12,
    role: 'Guía de Expedición',
    region: 'gran_lago',
    isStoryActive: false,
    defaultDialogue: ['Las aguas del Gran Lago esconden pasadizos sumergidos.'],
  },
  f_silvia: {
    id: 'npc-f-silvia',
    name: 'Alquimista Silvia',
    gender: 'female',
    frameIndex: 13,
    globalIndex: 13,
    role: 'Destiladora de Éter',
    region: 'reserva',
    isStoryActive: false,
    defaultDialogue: ['Un frasco de éter puede avivar el Ki en los momentos críticos.'],
  },
  f_nadia: {
    id: 'npc-f-nadia',
    name: 'Herrera Nadia',
    gender: 'female',
    frameIndex: 14,
    globalIndex: 14,
    role: 'Armera de Precisión',
    region: 'villa_marioneta',
    isStoryActive: false,
    defaultDialogue: ['Engranajes templados en aceite espiritual para mayor agilidad.'],
  },
  f_kassandra: {
    id: 'npc-f-kassandra',
    name: 'Sombría Kassandra',
    gender: 'female',
    frameIndex: 15,
    globalIndex: 15,
    role: 'Espía de la Noche',
    region: 'bosque_sombra',
    isStoryActive: false,
    defaultDialogue: ['Las sombras se mueven mejor cuando nadie las observa.'],
  },

  // ==========================================
  // EXPANSION CATALOG: MALE ROSTER (NPC09)
  // Ready to be assigned to new quests / areas
  // ==========================================
  m_corvus: {
    id: 'npc-m-corvus',
    name: 'Maestro Corvus',
    gender: 'male',
    frameIndex: 1,
    globalIndex: 17,
    role: 'Forjador Mayor',
    region: 'villa_marioneta',
    isStoryActive: false,
    defaultDialogue: ['El bronce y el acero forjan el destino de cada muñeca.'],
  },
  m_finn: {
    id: 'npc-m-finn',
    name: 'Pescador Finn',
    gender: 'male',
    frameIndex: 4,
    globalIndex: 20,
    role: 'Pescador del Muelle',
    region: 'gran_lago',
    isStoryActive: false,
    defaultDialogue: ['En las noches calmas, las almas de Agua saltan como peces de plata.'],
  },
  m_shin: {
    id: 'npc-m-shin',
    name: 'Monje Shin',
    gender: 'male',
    frameIndex: 5,
    globalIndex: 21,
    role: 'Guardián del Santuario',
    region: 'templo',
    isStoryActive: false,
    defaultDialogue: ['La serenidad de espíritu es la mejor defensa ante la corrupción.'],
  },
  m_zephyr: {
    id: 'npc-m-zephyr',
    name: 'Mercader Zephyr',
    gender: 'male',
    frameIndex: 6,
    globalIndex: 22,
    role: 'Buhonero Itinerante',
    region: 'reserva',
    isStoryActive: false,
    defaultDialogue: ['¡Botellas de almas, cristales y talismanes a buen precio!'],
  },
  m_eric: {
    id: 'npc-m-eric',
    name: 'Cartógrafo Eric',
    gender: 'male',
    frameIndex: 7,
    globalIndex: 23,
    role: 'Explorador de Ruinas',
    region: 'gran_lago',
    isStoryActive: false,
    defaultDialogue: ['He cartografiado las rutas secretas entre el lago y las montañas.'],
  },
  m_aric: {
    id: 'npc-m-aric',
    name: 'Custodio Aric',
    gender: 'male',
    frameIndex: 8,
    globalIndex: 24,
    role: 'Guardián de Memorias',
    region: 'templo',
    isStoryActive: false,
    defaultDialogue: ['La Memoria acumulada por un alma despierta talentos dormidos.'],
  },
  m_dante: {
    id: 'npc-m-dante',
    name: 'Caballero Dante',
    gender: 'male',
    frameIndex: 9,
    globalIndex: 25,
    role: 'Paladín Veterano',
    region: 'bosque_sombra',
    isStoryActive: false,
    defaultDialogue: ['Una Doll con armadura de placas protege a su invocador.'],
  },
  m_roland: {
    id: 'npc-m-roland',
    name: 'Cazador Roland',
    gender: 'male',
    frameIndex: 10,
    globalIndex: 26,
    role: 'Tirador de Almas',
    region: 'desierto',
    isStoryActive: false,
    defaultDialogue: ['Apunta siempre a la articulación más débil del adversario.'],
  },
  m_garrick: {
    id: 'npc-m-garrick',
    name: 'Tabernero Garrick',
    gender: 'male',
    frameIndex: 11,
    globalIndex: 27,
    role: 'Posadero',
    region: 'villa_marioneta',
    isStoryActive: false,
    defaultDialogue: ['Toma asiento y bebe un caldo caliente tras un largo combate.'],
  },
  m_valen: {
    id: 'npc-m-valen',
    name: 'Mago Valen',
    gender: 'male',
    frameIndex: 12,
    globalIndex: 28,
    role: 'Encantador Rúnico',
    region: 'templo',
    isStoryActive: false,
    defaultDialogue: ['Las runas canalizan el Ki residual hacia los ataques mágicos.'],
  },
  m_cedric: {
    id: 'npc-m-cedric',
    name: 'Guardabosques Cedric',
    gender: 'male',
    frameIndex: 13,
    globalIndex: 29,
    role: 'Vigía Forestal',
    region: 'bosque_sombra',
    isStoryActive: false,
    defaultDialogue: ['El musgo brillante indica la cercanía de almas místicas.'],
  },
  m_lucian: {
    id: 'npc-m-lucian',
    name: 'Sabio Lucian',
    gender: 'male',
    frameIndex: 14,
    globalIndex: 30,
    role: 'Astrónomo Real',
    region: 'templo',
    isStoryActive: false,
    defaultDialogue: ['La alineación de las lunas influye en el poder de las almas.'],
  },
  m_bruno: {
    id: 'npc-m-bruno',
    name: 'Minero Bruno',
    gender: 'male',
    frameIndex: 15,
    globalIndex: 31,
    role: 'Extractor de Minerales',
    region: 'desierto',
    isStoryActive: false,
    defaultDialogue: ['Las vetas de obsidiana son ideales para muñecos indestructibles.'],
  },
};

/**
 * Returns only the active story NPCs to be rendered in the current build
 */
export function getStoryNPCs(): NPC[] {
  return [
    {
      id: NPC_REGISTRY.kaelen.id,
      name: NPC_REGISTRY.kaelen.name,
      x: 14.5,
      z: -17.0,
      spriteRef: { sheet: 'male', frameIndex: NPC_REGISTRY.kaelen.frameIndex },
      spriteIndex: NPC_REGISTRY.kaelen.globalIndex,
      dialogue: NPC_REGISTRY.kaelen.defaultDialogue,
      questGiven: NPC_REGISTRY.kaelen.questId,
      questCompleted: false,
    },
    {
      id: NPC_REGISTRY.mira.id,
      name: NPC_REGISTRY.mira.name,
      x: -4.5,
      z: -4.0,
      spriteRef: { sheet: 'female', frameIndex: NPC_REGISTRY.mira.frameIndex },
      spriteIndex: NPC_REGISTRY.mira.globalIndex,
      dialogue: NPC_REGISTRY.mira.defaultDialogue,
    },
    {
      id: NPC_REGISTRY.selene.id,
      name: NPC_REGISTRY.selene.name,
      x: 22.0,
      z: 19.0,
      spriteRef: { sheet: 'female', frameIndex: NPC_REGISTRY.selene.frameIndex },
      spriteIndex: NPC_REGISTRY.selene.globalIndex,
      dialogue: NPC_REGISTRY.selene.defaultDialogue,
    },
    {
      id: NPC_REGISTRY.tobias.id,
      name: NPC_REGISTRY.tobias.name,
      x: 24.5,
      z: -2.5,
      spriteRef: { sheet: 'male', frameIndex: NPC_REGISTRY.tobias.frameIndex },
      spriteIndex: NPC_REGISTRY.tobias.globalIndex,
      dialogue: NPC_REGISTRY.tobias.defaultDialogue,
    },
    {
      id: NPC_REGISTRY.thorne.id,
      name: NPC_REGISTRY.thorne.name,
      x: 3.5,
      z: 38.0,
      spriteRef: { sheet: 'male', frameIndex: NPC_REGISTRY.thorne.frameIndex },
      spriteIndex: NPC_REGISTRY.thorne.globalIndex,
      dialogue: NPC_REGISTRY.thorne.defaultDialogue,
    },
  ];
}

/**
 * Retrieves an NPC registry entry by ID or key
 */
export function getNPCRegistryEntry(idOrKey: string): NPCRegistryEntry | undefined {
  if (NPC_REGISTRY[idOrKey]) return NPC_REGISTRY[idOrKey];
  return Object.values(NPC_REGISTRY).find(e => e.id === idOrKey);
}
