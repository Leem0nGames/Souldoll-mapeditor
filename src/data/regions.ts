/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SoulType } from '../types';
import { sampleBiomeAt } from '../world/proceduralTerrain';

export interface WorldRegion {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  recommendedLevel: string;
  levelRange: [number, number];
  dominantBiome: string;
  nativeSoulTypes: SoulType[];
  resources: string[];
  poiIds: string[];
  biome: 'village' | 'forest' | 'water' | 'mountains' | 'mystic';
  // Bounding check: either a rectangle or a circular radius
  bounds: {
    type: 'box';
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | {
    type: 'circle';
    centerX: number;
    centerZ: number;
    radius: number;
  };
}

export interface FastTravelPoint {
  id: string;
  name: string;
  regionId: string;
  x: number;
  z: number;
  description: string;
  icon: string;
  isFountain?: boolean;
}

export interface LandmarkPOI {
  id: string;
  name: string;
  category: 'house' | 'shop' | 'lab' | 'landmark' | 'water';
  x: number;
  z: number;
  description: string;
  icon: string;
}

/**
 * Master Registry of World Regions in Luminati.
 * Modular, clean, and easily extensible.
 */
export const WORLD_REGIONS: WorldRegion[] = [
  {
    id: 'villa_marioneta',
    name: 'Villa Marioneta',
    subtitle: 'Cuna de Marionetistas',
    description: 'Poblado histórico de artesanos donde descansan los espíritus protectores y se forjan las almas.',
    color: '#e2ba66',
    badgeBg: 'rgba(226, 186, 102, 0.15)',
    badgeBorder: '#e2ba66',
    recommendedLevel: 'Zona Segura',
    levelRange: [1, 2],
    dominantBiome: 'Aldea Artesanal',
    nativeSoulTypes: ['Luz'],
    resources: ['Madera Noble', 'Cristal de Alma'],
    poiIds: ['poi_statue', 'poi_workshop', 'poi_lab', 'poi_market', 'poi_hero_house', 'poi_rival_house', 'poi_archway'],
    biome: 'village',
    bounds: {
      type: 'box',
      minX: -42,
      maxX: 42,
      minZ: -38,
      maxZ: 42,
    },
  },
  {
    id: 'lago_esmeralda',
    name: 'Lago Esmeralda',
    subtitle: 'Aguas Profundas de Aqualis',
    description: 'Cuenca mística de aguas curativas alimentada por las corrientes subterráneas del mundo de las almas.',
    color: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    badgeBorder: '#38bdf8',
    recommendedLevel: 'Niv. 3 - 6',
    levelRange: [3, 6],
    dominantBiome: 'Lago y Ribera',
    nativeSoulTypes: ['Agua', 'Luz'],
    resources: ['Perla Acuática', 'Rocío Esmeralda'],
    poiIds: ['poi_lake_dock'],
    biome: 'water',
    bounds: {
      type: 'circle',
      centerX: 100,
      centerZ: -80,
      radius: 48,
    },
  },
  {
    id: 'ruta_1_norte',
    name: 'Ruta 1 — Pradera y Río Celeste',
    subtitle: 'Valle Floreciente y Templo del Alba',
    description: 'Camino abierto tras el Gran Arco que cruza la pradera de colinas suaves, el puente del Río Celeste y el Templo Solar del Alba.',
    color: '#4ade80',
    badgeBg: 'rgba(74, 222, 128, 0.15)',
    badgeBorder: '#4ade80',
    recommendedLevel: 'Niv. 2 - 5',
    levelRange: [2, 5],
    dominantBiome: 'Pradera',
    nativeSoulTypes: ['Planta', 'Fuego', 'Luz', 'Agua'],
    resources: ['Brote Solar', 'Ámbar del Alba'],
    poiIds: ['poi_river_bridge', 'poi_rest_stop', 'poi_sun_temple'],
    biome: 'forest',
    bounds: {
      type: 'box',
      minX: -80,
      maxX: 80,
      minZ: 42,
      maxZ: 190,
    },
  },
  {
    id: 'bosque_sombrio',
    name: 'Bosque Umbrío',
    subtitle: 'Arboleda de Sombras Antiguas',
    description: 'Bosque denso donde la luz apenas penetra. Almas oscuras y espíritus errantes habitan en la penumbra.',
    color: '#a855f7',
    badgeBg: 'rgba(168, 85, 247, 0.15)',
    badgeBorder: '#a855f7',
    recommendedLevel: 'Niv. 4 - 8',
    levelRange: [4, 8],
    dominantBiome: 'Bosque',
    nativeSoulTypes: ['Sombra', 'Planta', 'Fuego'],
    resources: ['Resina Umbría', 'Hongo Luminiscente'],
    poiIds: ['poi_sanctuary'],
    biome: 'forest',
    bounds: {
      type: 'box',
      minX: -190,
      maxX: -42,
      minZ: -190,
      maxZ: 40,
    },
  },
  {
    id: 'tierras_altas_trueno',
    name: 'Tierras Altas del Fulgor',
    subtitle: 'Picos de Resonancia Eléctrica',
    description: 'Elevaciones rocosas coronadas por monolitos y la Cueva de Cristal Ancestral que canalizan tempestades de éter.',
    color: '#eab308',
    badgeBg: 'rgba(234, 179, 8, 0.15)',
    badgeBorder: '#eab308',
    recommendedLevel: 'Niv. 5 - 9',
    levelRange: [5, 9],
    dominantBiome: 'Montaña',
    nativeSoulTypes: ['Rayo', 'Luz', 'Fuego'],
    resources: ['Cuarzo de Fulgor', 'Mineral Astral'],
    poiIds: ['poi_monolith', 'poi_cave'],
    biome: 'mountains',
    bounds: {
      type: 'box',
      minX: 42,
      maxX: 190,
      minZ: -20,
      maxZ: 120,
    },
  },
  {
    id: 'cumbres_heladas',
    name: 'Cumbres Heladas',
    subtitle: 'Altas Agujas del Invierno Perpetuo',
    description: 'Picos alpinos cubiertos de nieve eterna donde la ventisca custodia a las almas gélidas.',
    color: '#93c5fd',
    badgeBg: 'rgba(147, 197, 253, 0.15)',
    badgeBorder: '#93c5fd',
    recommendedLevel: 'Niv. 8 - 12',
    levelRange: [8, 12],
    dominantBiome: 'Región Nevada',
    nativeSoulTypes: ['Luz', 'Agua'],
    resources: ['Esquirla Glacial', 'Flor de Escarcha'],
    poiIds: [],
    biome: 'mountains',
    bounds: {
      type: 'box',
      minX: 55,
      maxX: 195,
      minZ: 120,
      maxZ: 195,
    },
  },
  {
    id: 'cienaga_esmeralda',
    name: 'Ciénaga Esmeralda',
    subtitle: 'Marismas de las Aguas Estancadas',
    description: 'Tierras bajas húmedas y pantanosas donde la niebla reposa sobre ciénagas sombrías.',
    color: '#84cc16',
    badgeBg: 'rgba(132, 204, 22, 0.15)',
    badgeBorder: '#84cc16',
    recommendedLevel: 'Niv. 4 - 7',
    levelRange: [4, 7],
    dominantBiome: 'Pantano',
    nativeSoulTypes: ['Agua', 'Planta', 'Sombra'],
    resources: ['Lirio del Pantano', 'Savia Purificadora'],
    poiIds: [],
    biome: 'water',
    bounds: {
      type: 'box',
      minX: -190,
      maxX: -25,
      minZ: -190,
      maxZ: -40,
    },
  },
  {
    id: 'paramo_espectral',
    name: 'Páramo Espectral',
    subtitle: 'Grieta y Cripta del Abismo',
    description: 'Tierras agrietadas con vapores violetas donde se alza la Cripta del Abismo custodiada por el Hueco Corrupto.',
    color: '#c084fc',
    badgeBg: 'rgba(192, 132, 252, 0.15)',
    badgeBorder: '#c084fc',
    recommendedLevel: 'Niv. 8 - 14 (Jefe Nv. 25)',
    levelRange: [8, 14],
    dominantBiome: 'Zona Espectral',
    nativeSoulTypes: ['Sombra', 'Fuego', 'Luz'],
    resources: ['Fragmento Abisal', 'Ceniza Espectral'],
    poiIds: ['poi_spectral_crypt'],
    biome: 'mystic',
    bounds: {
      type: 'box',
      minX: 25,
      maxX: 190,
      minZ: -190,
      maxZ: -65,
    },
  },
  {
    id: 'tierras_fronterizas',
    name: 'Costas de Luminati',
    subtitle: 'Litorales y Confines del Continente',
    description: 'Playas doradas y acantilados costeros bañados por el Mar Astral que rodea el continente.',
    color: '#cbd5e1',
    badgeBg: 'rgba(203, 213, 225, 0.15)',
    badgeBorder: '#cbd5e1',
    recommendedLevel: 'Niv. 7 - 12',
    levelRange: [7, 12],
    dominantBiome: 'Costa y Llanuras',
    nativeSoulTypes: ['Fuego', 'Agua', 'Planta', 'Rayo', 'Sombra', 'Luz'],
    resources: ['Coral Lumínico', 'Éter Salvaje'],
    poiIds: [],
    biome: 'mystic',
    bounds: {
      type: 'box',
      minX: -260,
      maxX: 260,
      minZ: -260,
      maxZ: 260,
    },
  },
];

export interface NavigableRoute {
  id: string;
  name: string;
  fromId: string;
  toId: string;
  pathPoints: { x: number; z: number }[];
  color: string;
  glowColor: string;
  description: string;
}

/**
 * Resonance Waypoints for Fast Travel.
 * Matches the actual fountains and key hubs placed in worldGen.
 */
export const FAST_TRAVEL_POINTS: FastTravelPoint[] = [
  {
    id: 'fountain_villa',
    name: 'Fuente de la Plaza Marioneta',
    regionId: 'villa_marioneta',
    x: 0,
    z: -5.5,
    description: 'Manantial sagrado en el corazón de Villa Marioneta. Restaura toda la vitalidad del equipo.',
    icon: '⛲',
    isFountain: true,
  },
  {
    id: 'fountain_tower',
    name: 'Monolito del Fulgor',
    regionId: 'tierras_altas_trueno',
    x: 82,
    z: 8,
    description: 'Pilar resonante en las alturas orientales. Canaliza chispas celestes.',
    icon: '⚡',
    isFountain: true,
  },
  {
    id: 'fountain_altar',
    name: 'Santuario del Bosque Umbrío',
    regionId: 'bosque_sombrio',
    x: -64,
    z: -62,
    description: 'Altar recóndito entre la maleza oscura. Guarda el reposo de las almas fatigadas.',
    icon: '🔮',
    isFountain: true,
  },
  {
    id: 'waypoint_dock',
    name: 'Muelle del Lago Marioneta',
    regionId: 'villa_marioneta',
    x: 0,
    z: -26,
    description: 'Embarcadero de madera sobre la orilla sur que conecta con el Lago Esmeralda.',
    icon: '⚓',
    isFountain: false,
  },
  {
    id: 'waypoint_rest',
    name: 'Descanso de la Ruta 1',
    regionId: 'ruta_1_norte',
    x: 6,
    z: 122,
    description: 'Refugio con bancos y farola para caminantes en el corazón de la Ruta 1.',
    icon: '⛺',
    isFountain: false,
  },
  {
    id: 'waypoint_sun_temple',
    name: 'Templo Solar del Alba',
    regionId: 'ruta_1_norte',
    x: -38,
    z: 136,
    description: 'Santuario de columnas clásicas y prisma dorado sobre la colina occidental de la Ruta 1.',
    icon: '☀️',
    isFountain: false,
  },
  {
    id: 'waypoint_lake_dock',
    name: 'Embarcadero del Lago',
    regionId: 'lago_esmeralda',
    x: 88,
    z: -78,
    description: 'Muelle de pescadores sobre las aguas cristalinas del Lago Esmeralda.',
    icon: '⛵',
    isFountain: false,
  },
  {
    id: 'waypoint_cave',
    name: 'Cueva de Cristal Ancestral',
    regionId: 'tierras_altas_trueno',
    x: 74,
    z: 54,
    description: 'Pórtico monumental y entrada a la caverna arcana en la ladera oriental.',
    icon: '💎',
    isFountain: false,
  },
  {
    id: 'waypoint_spectral_crypt',
    name: 'Cripta del Abismo Espectral',
    regionId: 'paramo_espectral',
    x: 68,
    z: -128,
    description: 'Mausoleo gótico sellado en el Páramo Espectral, custodiado por el Hueco Corrupto.',
    icon: '💀',
    isFountain: false,
  },
];

/**
 * Navigable Route Network connecting regional waypoints and hubs in Luminati.
 * Traces actual terrain roads and trails built with Catmull-Rom ribbons.
 */
export const NAVIGABLE_ROUTES: NavigableRoute[] = [
  {
    id: 'route_villa_dock',
    name: 'Avenida del Muelle Sur',
    fromId: 'fountain_villa',
    toId: 'waypoint_dock',
    pathPoints: [
      { x: 0, z: -5.5 },
      { x: 0, z: -15 },
      { x: 0, z: -26 },
    ],
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.45)',
    description: 'Avenida pavimentada de piedra que une la Plaza con el Embarcadero de Villa Marioneta.',
  },
  {
    id: 'route_villa_rest',
    name: 'Ruta 1 — Senda de los Susurros',
    fromId: 'fountain_villa',
    toId: 'waypoint_rest',
    pathPoints: [
      { x: 0, z: -5.5 },
      { x: 0, z: 20 },
      { x: 0, z: 43 },
      { x: 0, z: 58 },
      { x: 3, z: 76 },
      { x: -4, z: 98 },
      { x: 6, z: 122 },
    ],
    color: '#4ade80',
    glowColor: 'rgba(74, 222, 128, 0.45)',
    description: 'Gran calzada del norte que cruza el Monumental Arco de Piedra hacia el Alto del Caminante.',
  },
  {
    id: 'route_villa_altar',
    name: 'Sendero del Bosque Umbrío',
    fromId: 'fountain_villa',
    toId: 'fountain_altar',
    pathPoints: [
      { x: 0, z: -5.5 },
      { x: 0, z: 43 },
      { x: 3, z: 76 },
      { x: -18, z: 72 },
      { x: -38, z: 58 },
      { x: -52, z: 34 },
      { x: -58, z: 4 },
      { x: -60, z: -32 },
      { x: -64, z: -62 },
    ],
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.45)',
    description: 'Camino sinuoso que penetra la arboleda oscura hacia el Manantial Sagrado del Altar.',
  },
  {
    id: 'route_villa_tower',
    name: 'Sendero del Fulgor',
    fromId: 'fountain_villa',
    toId: 'fountain_tower',
    pathPoints: [
      { x: 0, z: -5.5 },
      { x: 0, z: 43 },
      { x: 3, z: 76 },
      { x: 24, z: 70 },
      { x: 45, z: 54 },
      { x: 65, z: 32 },
      { x: 82, z: 8 },
    ],
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.45)',
    description: 'Senda rocosa ascendente hacia los picos donde resuena la furia del Monolito del Fulgor.',
  },
  {
    id: 'route_dock_lake',
    name: 'Sendero del Lago Esmeralda',
    fromId: 'waypoint_dock',
    toId: 'waypoint_lake_dock',
    pathPoints: [
      { x: 0, z: -26 },
      { x: 0, z: -30 },
      { x: 18, z: -42 },
      { x: 42, z: -56 },
      { x: 68, z: -70 },
      { x: 88, z: -78 },
    ],
    color: '#0284c7',
    glowColor: 'rgba(2, 132, 199, 0.45)',
    description: 'Paseo ribereño sobre las orillas de arena que conduce al muelle de pescadores de Aqualis.',
  },
  {
    id: 'route_rest_temple',
    name: 'Senda del Templo Solar',
    fromId: 'waypoint_rest',
    toId: 'waypoint_sun_temple',
    pathPoints: [
      { x: 6, z: 122 },
      { x: -4, z: 98 },
      { x: -20, z: 114 },
      { x: -38, z: 136 },
    ],
    color: '#fde047',
    glowColor: 'rgba(253, 224, 71, 0.45)',
    description: 'Calzada sagrada que asciende desde el Puente del Río Celeste hasta el Templo Solar del Alba.',
  },
  {
    id: 'route_lake_crypt',
    name: 'Senda de la Grieta Espectral',
    fromId: 'waypoint_lake_dock',
    toId: 'waypoint_spectral_crypt',
    pathPoints: [
      { x: 88, z: -78 },
      { x: 68, z: -70 },
      { x: 42, z: -56 },
      { x: 56, z: -92 },
      { x: 68, z: -128 },
    ],
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    description: 'Senda pedregosa que desciende hacia el Páramo Espectral y la Cripta del Abismo.',
  },
];

/**
 * Key Landmark Points of Interest for Atlas & Exploration.
 */
export const LANDMARK_POIS: LandmarkPOI[] = [
  {
    id: 'poi_statue',
    name: 'Estatua del Artesano Primigenio',
    category: 'landmark',
    x: 0,
    z: 4.5,
    description: 'Monumento central erigido a los primeros maestros que infundieron madera con almas puras.',
    icon: '🗿',
  },
  {
    id: 'poi_workshop',
    name: 'Taller de Valerius',
    category: 'shop',
    x: -30,
    z: -6,
    description: 'Gran gremio de marionetas de madera noble, engranajes y forja.',
    icon: '🔨',
  },
  {
    id: 'poi_lab',
    name: 'Laboratorio de Almas',
    category: 'lab',
    x: 25,
    z: -22,
    description: 'Complejo arcano de la Profesora Aurelia para consagración y síntesis de SoulDolls.',
    icon: '🧪',
  },
  {
    id: 'poi_market',
    name: 'Mercado de Villa Marioneta',
    category: 'shop',
    x: 28,
    z: -4,
    description: 'Puestos de suministros, cristales de captura y elixires mágicos.',
    icon: '🏪',
  },
  {
    id: 'poi_hero_house',
    name: 'Casa de Robin',
    category: 'house',
    x: -27,
    z: 24,
    description: 'Hogar del protagonista en el barrio suroeste.',
    icon: '🏡',
  },
  {
    id: 'poi_rival_house',
    name: 'Casa de Selene',
    category: 'house',
    x: 27,
    z: 24,
    description: 'Residencia de tu rival de entrenamiento en el barrio sureste.',
    icon: '🏠',
  },
  {
    id: 'poi_archway',
    name: 'Gran Arco de Piedra',
    category: 'landmark',
    x: 0,
    z: 43,
    description: 'Portal monumental custodiado por braseros que da paso a la Ruta 1 Norte.',
    icon: '⛩️',
  },
  {
    id: 'poi_river_bridge',
    name: 'Puente del Río Celeste',
    category: 'landmark',
    x: -4,
    z: 98,
    description: 'Robusto puente de madera que cruza las aguas cristalinas del río que desciende de las cumbres.',
    icon: '🌉',
  },
  {
    id: 'poi_rest_stop',
    name: 'Descanso de la Ruta 1',
    category: 'landmark',
    x: 6,
    z: 122,
    description: 'Refugio arbolado con bancos y farola para caminantes en el ecuador de la Ruta 1.',
    icon: '⛺',
  },
  {
    id: 'poi_sanctuary',
    name: 'Santuario del Bosque Umbrío',
    category: 'landmark',
    x: -64,
    z: -62,
    description: 'Altar recóndito con pilares de mampostería y manantial de sanación.',
    icon: '🔮',
  },
  {
    id: 'poi_monolith',
    name: 'Monolito del Fulgor',
    category: 'landmark',
    x: 82,
    z: 8,
    description: 'Monumento electromagnético ancestral que vibra con rayos celestes.',
    icon: '⚡',
  },
  {
    id: 'poi_lake_dock',
    name: 'Embarcadero del Lago',
    category: 'water',
    x: 88,
    z: -78,
    description: 'Muelle de pescadores sobre las aguas cristalinas del Lago Esmeralda.',
    icon: '⛵',
  },
  {
    id: 'poi_cave',
    name: 'Cueva de Cristal Ancestral',
    category: 'landmark',
    x: 74,
    z: 54,
    description: 'Pórtico monumental tallado en la roca con cristales resonantes y ecos de almas primigenias.',
    icon: '💎',
  },
  {
    id: 'poi_sun_temple',
    name: 'Templo Solar del Alba',
    category: 'landmark',
    x: -38,
    z: 136,
    description: 'Santuario clásico coronado por un prisma solar levitante en las colinas del norte.',
    icon: '☀️',
  },
  {
    id: 'poi_spectral_crypt',
    name: 'Cripta del Abismo Espectral',
    category: 'landmark',
    x: 68,
    z: -128,
    description: 'Mausoleo sellado y arena del guardián Hueco Corrupto (Nv. 25) en el Páramo Espectral.',
    icon: '💀',
  },
];

/**
 * Evaluates the player's world position and returns the matching Region.
 * Evaluates specific regions first before falling back to Frontier lands.
 */
export function getRegionAt(x: number, z: number): WorldRegion {
  for (const region of WORLD_REGIONS) {
    if (region.id === 'tierras_fronterizas') continue;

    if (region.bounds.type === 'circle') {
      const dist = Math.hypot(x - region.bounds.centerX, z - region.bounds.centerZ);
      if (dist <= region.bounds.radius) {
        return region;
      }
    } else if (region.bounds.type === 'box') {
      const { minX, maxX, minZ, maxZ } = region.bounds;
      if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
        return region;
      }
    }
  }

  // Fallback to Frontier lands
  return WORLD_REGIONS.find(r => r.id === 'tierras_fronterizas') || WORLD_REGIONS[0];
}

/**
 * Returns the appropriate elemental encounter pool for tall grass based on mathematical biome.
 */
export function getEncounterTypesForPosition(
  x: number,
  z: number,
  heightAt?: (x: number, z: number) => number
): SoulType[] {
  const sample = sampleBiomeAt(x, z, heightAt);
  switch (sample.biome) {
    case 'snow':
      return ['Luz', 'Agua'];
    case 'swamp':
      return ['Agua', 'Planta', 'Sombra'];
    case 'spectral':
      return ['Sombra', 'Fuego', 'Luz'];
    case 'mountain':
      return ['Rayo', 'Fuego', 'Luz'];
    case 'forest':
      return ['Planta', 'Sombra'];
    case 'meadow':
      return ['Planta', 'Luz', 'Fuego'];
    case 'river':
    case 'lake':
      return ['Agua', 'Luz'];
    case 'coast':
      return ['Agua', 'Luz', 'Rayo'];
    case 'village':
      return ['Luz'];
    default: {
      const reg = getRegionAt(x, z);
      return reg.nativeSoulTypes && reg.nativeSoulTypes.length > 0
        ? reg.nativeSoulTypes
        : ['Planta', 'Fuego', 'Agua'];
    }
  }
}
