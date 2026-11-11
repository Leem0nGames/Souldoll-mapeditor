/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  WORLD_REGIONS,
  FAST_TRAVEL_POINTS,
  LANDMARK_POIS,
  NAVIGABLE_ROUTES,
  WorldRegion,
  FastTravelPoint,
  LandmarkPOI,
  NavigableRoute,
  getRegionAt,
} from '../data/regions';
import { GrassPatch } from '../types';
import { audioManager } from '../audio/audioManager';
import { BrandPanel, BrandButton, BrandSectionTitle } from './ui/BrandKit';

interface WorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: { x: number; z: number; rotation: number };
  grassPatches?: GrassPatch[];
  discoveredGrass?: number[];
  discoveredWaypoints?: string[];
  unlockedFogCells?: number[];
  onFastTravel: (waypoint: FastTravelPoint) => void;
}

type MapFilter = 'all' | 'routes' | 'waypoints' | 'landmarks' | 'grass';

export const WorldMapModal: React.FC<WorldMapModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  grassPatches = [],
  discoveredGrass = [],
  discoveredWaypoints = ['fountain_villa'],
  unlockedFogCells = [],
  onFastTravel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedWaypoint, setSelectedWaypoint] = useState<FastTravelPoint | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<LandmarkPOI | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<NavigableRoute | null>(null);
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragMovedDistRef = useRef(0);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const pinchDistRef = useRef<number | null>(null);

  const currentRegion = useMemo(() => getRegionAt(playerPos.x, playerPos.z), [playerPos.x, playerPos.z]);

  // Connected routes for selected waypoint
  const connectedRoutes = useMemo(() => {
    if (!selectedWaypoint) return [];
    return NAVIGABLE_ROUTES.filter(
      (r) => r.fromId === selectedWaypoint.id || r.toId === selectedWaypoint.id
    );
  }, [selectedWaypoint]);

  // Count active fully connected routes
  const activeRoutesCount = useMemo(() => {
    return NAVIGABLE_ROUTES.filter(
      (r) => discoveredWaypoints.includes(r.fromId) && discoveredWaypoints.includes(r.toId)
    ).length;
  }, [discoveredWaypoints]);

  // Calculate exploration percentage based on unlocked fog cells (400 total cells in a 20x20 grid)
  const explorationPercent = useMemo(() => {
    const totalCells = 400;
    const explored = unlockedFogCells.length;
    return Math.min(100, Math.round((explored / totalCells) * 100));
  }, [unlockedFogCells]);

  // Close on ESC or KeyM
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyM') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Map coordinate transformation functions
  const MAP_SIZE = 520;
  const WORLD_MIN = -200;
  const WORLD_MAX = 200;
  const WORLD_SPAN = WORLD_MAX - WORLD_MIN;

  const worldToMap = useCallback((wx: number, wz: number) => {
    const rawX = ((wx - WORLD_MIN) / WORLD_SPAN) * MAP_SIZE;
    const rawY = ((wz - WORLD_MIN) / WORLD_SPAN) * MAP_SIZE;
    const centerX = MAP_SIZE / 2;
    const centerY = MAP_SIZE / 2;

    const zoomedX = centerX + (rawX - centerX) * zoomLevel + panOffset.x;
    const zoomedY = centerY + (rawY - centerY) * zoomLevel + panOffset.y;
    return { x: zoomedX, y: zoomedY };
  }, [zoomLevel, panOffset]);

  const mapToWorld = useCallback((mx: number, my: number) => {
    const centerX = MAP_SIZE / 2;
    const centerY = MAP_SIZE / 2;
    const unzoomedX = (mx - centerX - panOffset.x) / zoomLevel + centerX;
    const unzoomedY = (my - centerY - panOffset.y) / zoomLevel + centerY;

    const wx = (unzoomedX / MAP_SIZE) * WORLD_SPAN + WORLD_MIN;
    const wz = (unzoomedY / MAP_SIZE) * WORLD_SPAN + WORLD_MIN;
    return { wx, wz };
  }, [zoomLevel, panOffset]);

  // Distance helper for route line hit detection
  const distToSegment = useCallback((
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }, []);

  // Canvas redraw loop with smooth animation for route flow and pulsing waypoints
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = MAP_SIZE;
    canvas.height = MAP_SIZE;

    let isRunning = true;
    let animId = 0;

    const render = () => {
      if (!isRunning) return;

      const now = Date.now();
      ctx.imageSmoothingEnabled = false;

      // 1. Arcane Map Background
      ctx.fillStyle = '#0b0816';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

      // 2. Draw Regions Base Geometry (Color tint blocks)
      WORLD_REGIONS.forEach((region) => {
        ctx.save();
        if (region.bounds.type === 'circle') {
          const center = worldToMap(region.bounds.centerX, region.bounds.centerZ);
          const radius = (region.bounds.radius / WORLD_SPAN) * MAP_SIZE * zoomLevel;
          ctx.fillStyle = region.badgeBg;
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `${region.color}40`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (region.bounds.type === 'box') {
          const topLeft = worldToMap(region.bounds.minX, region.bounds.minZ);
          const botRight = worldToMap(region.bounds.maxX, region.bounds.maxZ);
          const w = botRight.x - topLeft.x;
          const h = botRight.y - topLeft.y;

          ctx.fillStyle = region.badgeBg;
          ctx.fillRect(topLeft.x, topLeft.y, w, h);

          ctx.strokeStyle = `${region.color}35`;
          ctx.lineWidth = 1;
          ctx.strokeRect(topLeft.x, topLeft.y, w, h);
        }
        ctx.restore();
      });

      // 3. Coordinate Navigation Grid
      ctx.strokeStyle = '#1b142d';
      ctx.lineWidth = 1;
      const gridStep = 40; // Every 40 world units
      for (let w = WORLD_MIN; w <= WORLD_MAX; w += gridStep) {
        const p1 = worldToMap(w, WORLD_MIN);
        const p2 = worldToMap(w, WORLD_MAX);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const p3 = worldToMap(WORLD_MIN, w);
        const p4 = worldToMap(WORLD_MAX, w);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }

      // 4. Lake Esmeralda Water Body
      const lakeCenter = worldToMap(100, -80);
      const lakeRadius = (26 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      ctx.save();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(lakeCenter.x, lakeCenter.y, lakeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // South Pier Lake
      const southWater = worldToMap(0, -32);
      const southRadius = (16 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      ctx.save();
      ctx.fillStyle = '#0369a1';
      ctx.beginPath();
      ctx.arc(southWater.x, southWater.y, southRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Cobblestone Roads & Pathways (Villa Marioneta Main Axis)
      ctx.save();
      ctx.fillStyle = '#372d47';
      // Central Plaza
      const plazaP = worldToMap(-14, -13);
      const plazaW = (28 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      const plazaH = (26 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      ctx.fillRect(plazaP.x, plazaP.y, plazaW, plazaH);

      // North-South Boulevard
      const nsRoadP = worldToMap(-4.5, -24);
      const nsRoadW = (9 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      const nsRoadH = (72 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      ctx.fillRect(nsRoadP.x, nsRoadP.y, nsRoadW, nsRoadH);

      // East-West Avenue
      const ewRoadP = worldToMap(-34, -5.25);
      const ewRoadW = (68 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      const ewRoadH = (10.5 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      ctx.fillRect(ewRoadP.x, ewRoadP.y, ewRoadW, ewRoadH);

      // Regional Roads & Base Trails
      const drawBaseTrail = (points: { x: number; z: number }[], color: string, width: number) => {
        if (points.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(2, (width / WORLD_SPAN) * MAP_SIZE * zoomLevel);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const start = worldToMap(points[0].x, points[0].z);
        ctx.moveTo(start.x, start.y);
        for (let i = 1; i < points.length; i++) {
          const pt = worldToMap(points[i].x, points[i].z);
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      };

      // Route 1 (Senda de los Susurros)
      drawBaseTrail(
        [{ x: 0, z: 43 }, { x: 0, z: 58 }, { x: 3, z: 76 }, { x: -4, z: 98 }, { x: 6, z: 122 }, { x: 2, z: 148 }, { x: -3, z: 172 }, { x: 0, z: 196 }],
        '#78350f',
        5.2
      );
      // Forest Trail
      drawBaseTrail(
        [{ x: 3, z: 76 }, { x: -18, z: 72 }, { x: -38, z: 58 }, { x: -52, z: 34 }, { x: -58, z: 4 }, { x: -60, z: -32 }, { x: -64, z: -62 }, { x: -88, z: -82 }, { x: -114, z: -100 }, { x: -140, z: -118 }],
        '#4c1d95',
        4.6
      );
      // Fulgor Trail
      drawBaseTrail(
        [{ x: 3, z: 76 }, { x: 24, z: 70 }, { x: 45, z: 54 }, { x: 65, z: 32 }, { x: 82, z: 8 }, { x: 105, z: -2 }, { x: 130, z: 16 }, { x: 158, z: 42 }],
        '#713f12',
        4.8
      );
      // Lake Trail
      drawBaseTrail(
        [{ x: 0, z: -26 }, { x: 0, z: -30 }, { x: 18, z: -42 }, { x: 42, z: -56 }, { x: 68, z: -70 }, { x: 88, z: -78 }, { x: 108, z: -64 }, { x: 126, z: -78 }, { x: 120, z: -102 }],
        '#075985',
        4.4
      );
      ctx.restore();

      // 6. Grass Patches (Tall grass for soul encounters)
      if (filter === 'all' || filter === 'grass') {
        grassPatches.forEach((patch, idx) => {
          const isDiscovered = discoveredGrass.includes(idx);
          const p = worldToMap(patch.x, patch.z);
          const r = Math.max(3, (patch.radius / WORLD_SPAN) * MAP_SIZE * zoomLevel);

          ctx.save();
          ctx.fillStyle = isDiscovered ? 'rgba(34, 197, 94, 0.45)' : 'rgba(21, 128, 61, 0.25)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = isDiscovered ? '#22c55e' : '#15803d';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        });
      }

      // 7. Fog of War Overlay (20x20 Grid = 400 Cells)
      const cellSize = (20 / WORLD_SPAN) * MAP_SIZE * zoomLevel;
      const unlockedSet = new Set(unlockedFogCells);

      for (let gx = 0; gx < 20; gx++) {
        for (let gz = 0; gz < 20; gz++) {
          const cellIndex = gx * 20 + gz;
          const isUnlocked = unlockedSet.has(cellIndex);

          if (!isUnlocked) {
            const worldCellX = WORLD_MIN + gx * 20;
            const worldCellZ = WORLD_MIN + gz * 20;
            const mapCell = worldToMap(worldCellX, worldCellZ);

            ctx.save();
            ctx.fillStyle = 'rgba(7, 5, 14, 0.88)';
            ctx.fillRect(mapCell.x, mapCell.y, cellSize + 0.5, cellSize + 0.5);

            if ((gx + gz) % 4 === 0 && zoomLevel >= 0.9) {
              ctx.fillStyle = 'rgba(147, 112, 219, 0.15)';
              ctx.font = '7px monospace';
              ctx.fillText('✦', mapCell.x + cellSize * 0.4, mapCell.y + cellSize * 0.6);
            }
            ctx.restore();
          }
        }
      }

      // 8. Landmarks & POIs
      if (filter === 'all' || filter === 'landmarks') {
        LANDMARK_POIS.forEach((poi) => {
          const p = worldToMap(poi.x, poi.z);
          const isHovered = hoveredInfo === poi.name;
          const isSelected = selectedPOI?.id === poi.id;

          ctx.save();
          ctx.fillStyle = isSelected ? '#fbbf24' : isHovered ? '#fef08a' : '#c084fc';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#1e1430';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (zoomLevel >= 1.0) {
            ctx.font = '6px "Press Start 2P", monospace';
            ctx.fillStyle = '#e2e8f0';
            ctx.textAlign = 'center';
            ctx.fillText(poi.name.split(' ')[0], p.x, p.y - 7);
          }
          ctx.restore();
        });
      }

      // 8.5. CONNECTED NAVIGABLE ROUTES BETWEEN DISCOVERED WAYPOINTS
      // (Pierces clearly through the map to visualize navigable routes connecting regions)
      if (filter === 'all' || filter === 'routes' || filter === 'waypoints') {
        const dashOffset = -(now / 70) % 24;

        NAVIGABLE_ROUTES.forEach((route) => {
          const isFromDiscovered = discoveredWaypoints.includes(route.fromId);
          const isToDiscovered = discoveredWaypoints.includes(route.toId);
          const isConnected = isFromDiscovered && isToDiscovered;
          const isPartiallyConnected = isFromDiscovered || isToDiscovered;
          const isSelected =
            selectedRoute?.id === route.id ||
            selectedWaypoint?.id === route.fromId ||
            selectedWaypoint?.id === route.toId;
          const isHovered = hoveredInfo === route.name || hoveredInfo === `Ruta Conectada: ${route.name}`;

          // Skip completely undiscovered routes
          if (!isPartiallyConnected) return;

          // A. Subtle Navigable Road Line tracing the ground road path
          ctx.save();
          if (isConnected) {
            // Subtle glowing route line
            ctx.strokeStyle = isSelected || isHovered ? route.color : route.glowColor;
            ctx.lineWidth = Math.max(1.8, (isSelected ? 3.4 : 2.2) * zoomLevel);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([7, 5]);
            ctx.lineDashOffset = dashOffset;
            ctx.shadowColor = route.color;
            ctx.shadowBlur = isSelected || isHovered ? 12 : 5;

            ctx.beginPath();
            const start = worldToMap(route.pathPoints[0].x, route.pathPoints[0].z);
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < route.pathPoints.length; i++) {
              const pt = worldToMap(route.pathPoints[i].x, route.pathPoints[i].z);
              ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();

            // Traveling luminous soul spark drifting along the route
            const totalPoints = route.pathPoints.length;
            const cycleP = ((now + Math.abs(route.pathPoints[0].x) * 120) / 4200) % 1.0;
            const segmentIndex = Math.floor(cycleP * (totalPoints - 1));
            const segP = (cycleP * (totalPoints - 1)) - segmentIndex;
            const p1 = route.pathPoints[segmentIndex];
            const p2 = route.pathPoints[segmentIndex + 1] || p1;
            const orbWorldX = p1.x + (p2.x - p1.x) * segP;
            const orbWorldZ = p1.z + (p2.z - p1.z) * segP;
            const orbMap = worldToMap(orbWorldX, orbWorldZ);

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = route.color;
            ctx.shadowBlur = 9;
            ctx.beginPath();
            ctx.arc(orbMap.x, orbMap.y, (isSelected ? 3.2 : 2.2) * zoomLevel, 0, Math.PI * 2);
            ctx.fill();

            // B. Subtle Arcane Direct Connecting Arc between waypoints
            const fromWp = FAST_TRAVEL_POINTS.find((w) => w.id === route.fromId);
            const toWp = FAST_TRAVEL_POINTS.find((w) => w.id === route.toId);
            if (fromWp && toWp && (zoomLevel >= 0.75 || isSelected || isHovered)) {
              const pFrom = worldToMap(fromWp.x, fromWp.z);
              const pTo = worldToMap(toWp.x, toWp.z);
              const midX = (pFrom.x + pTo.x) * 0.5;
              const midY = (pFrom.y + pTo.y) * 0.5;
              const dx = pTo.x - pFrom.x;
              const dy = pTo.y - pFrom.y;
              const dist = Math.hypot(dx, dy);

              if (dist > 2) {
                const perpX = -dy / dist;
                const perpY = dx / dist;
                const curvature = Math.min(22, dist * 0.12);
                const ctrlX = midX + perpX * curvature;
                const ctrlY = midY + perpY * curvature;

                ctx.save();
                ctx.strokeStyle = isSelected || isHovered ? route.color : 'rgba(95, 227, 210, 0.32)';
                ctx.lineWidth = isSelected || isHovered ? 2.0 : 1.2;
                ctx.setLineDash([3, 4]);
                ctx.lineDashOffset = dashOffset * 0.6;
                ctx.beginPath();
                ctx.moveTo(pFrom.x, pFrom.y);
                ctx.quadraticCurveTo(ctrlX, ctrlY, pTo.x, pTo.y);
                ctx.stroke();
                ctx.restore();

                // Route Name Badge on arc center if selected or hovered
                if (isSelected || isHovered) {
                  ctx.save();
                  ctx.font = '6px "Press Start 2P", monospace';
                  ctx.fillStyle = '#fef08a';
                  ctx.textAlign = 'center';
                  ctx.shadowColor = '#000000';
                  ctx.shadowBlur = 4;
                  ctx.fillText(`↔ ${route.name}`, ctrlX, ctrlY - 4);
                  ctx.restore();
                }
              }
            }
          } else if (isPartiallyConnected) {
            // Faint exploration frontier guide dashes pointing toward undiscovered territory
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 1.3;
            ctx.setLineDash([2, 5]);
            ctx.beginPath();
            const start = worldToMap(route.pathPoints[0].x, route.pathPoints[0].z);
            ctx.moveTo(start.x, start.y);
            for (let i = 1; i < route.pathPoints.length; i++) {
              const pt = worldToMap(route.pathPoints[i].x, route.pathPoints[i].z);
              ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
          }
          ctx.restore();
        });
      }

      // 9. Fast Travel Waypoints (Resonance Fountains)
      if (filter === 'all' || filter === 'waypoints' || filter === 'routes') {
        FAST_TRAVEL_POINTS.forEach((wp) => {
          const p = worldToMap(wp.x, wp.z);
          const isDiscovered = discoveredWaypoints.includes(wp.id);
          const isSelected = selectedWaypoint?.id === wp.id;

          ctx.save();
          // Pulsing ring if discovered
          if (isDiscovered) {
            const pulse = (Math.sin(now / 300) + 1) * 2;
            ctx.strokeStyle = 'rgba(95, 227, 210, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7 + pulse, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Diamond Icon
          ctx.fillStyle = isSelected
            ? '#fef08a'
            : isDiscovered
            ? '#5fe3d2'
            : '#64748b';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 6);
          ctx.lineTo(p.x + 6, p.y);
          ctx.lineTo(p.x, p.y + 6);
          ctx.lineTo(p.x - 6, p.y);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#090710';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Waypoint name label
          ctx.font = '7px "Press Start 2P", monospace';
          ctx.fillStyle = isDiscovered ? '#5fe3d2' : '#94a3b8';
          ctx.textAlign = 'center';
          ctx.fillText(wp.name.split(' ')[0], p.x, p.y + 14);
          ctx.restore();
        });
      }

      // 10. Player Position & Orientation Pointer
      const playerM = worldToMap(playerPos.x, playerPos.z);
      ctx.save();
      ctx.shadowColor = '#5fe3d2';
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(95, 227, 210, 0.25)';
      ctx.beginPath();
      ctx.arc(playerM.x, playerM.y, 9, 0, Math.PI * 2);
      ctx.fill();

      // Directional Arrow
      ctx.translate(playerM.x, playerM.y);
      ctx.rotate(-playerPos.rotation + Math.PI);
      ctx.fillStyle = '#ffe066';
      ctx.strokeStyle = '#0a0714';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 7);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // 11. Region Name Watermarks in Background
      if (zoomLevel >= 0.8) {
        ctx.save();
        ctx.font = 'bold 9px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 240, 180, 0.25)';

        const villaP = worldToMap(0, 3);
        ctx.fillText('VILLA MARIONETA', villaP.x, villaP.y);

        const lakeP = worldToMap(100, -80);
        ctx.fillText('LAGO ESMERALDA', lakeP.x, lakeP.y);

        const northP = worldToMap(0, 90);
        ctx.fillText('RUTA 1 NORTE', northP.x, northP.y);

        const forestP = worldToMap(-110, -80);
        ctx.fillText('BOSQUE UMBRÍO', forestP.x, forestP.y);

        const highP = worldToMap(110, 80);
        ctx.fillText('TIERRAS ALTAS', highP.x, highP.y);
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [
    isOpen,
    playerPos,
    grassPatches,
    discoveredGrass,
    discoveredWaypoints,
    unlockedFogCells,
    filter,
    zoomLevel,
    panOffset,
    selectedWaypoint,
    selectedPOI,
    selectedRoute,
    hoveredInfo,
    worldToMap,
  ]);

  // Unified point selection (mouse click or clean touch tap) with generous finger hitboxes
  const selectMapAtClientPoint = useCallback(
    (clientX: number, clientY: number, isTouch: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = ((clientX - rect.left) / rect.width) * MAP_SIZE;
      const clickY = ((clientY - rect.top) / rect.height) * MAP_SIZE;

      const wpHitRadius = isTouch ? 24 : 15;
      const poiHitRadius = isTouch ? 20 : 13;
      const routeHitRadius = isTouch ? 14 : 8;

      // 1. Check Fast Travel Waypoints (nearest match within radius)
      let foundWaypoint: FastTravelPoint | null = null;
      let bestWpDist = wpHitRadius;
      FAST_TRAVEL_POINTS.forEach((wp) => {
        const p = worldToMap(wp.x, wp.z);
        const dist = Math.hypot(p.x - clickX, p.y - clickY);
        if (dist <= bestWpDist) {
          bestWpDist = dist;
          foundWaypoint = wp;
        }
      });

      if (foundWaypoint) {
        setSelectedWaypoint(foundWaypoint);
        setSelectedPOI(null);
        setSelectedRoute(null);
        audioManager.playSelect();
        return;
      }

      // 2. Check Landmarks / POIs
      let foundPOI: LandmarkPOI | null = null;
      let bestPoiDist = poiHitRadius;
      LANDMARK_POIS.forEach((poi) => {
        const p = worldToMap(poi.x, poi.z);
        const dist = Math.hypot(p.x - clickX, p.y - clickY);
        if (dist <= bestPoiDist) {
          bestPoiDist = dist;
          foundPOI = poi;
        }
      });

      if (foundPOI) {
        setSelectedPOI(foundPOI);
        setSelectedWaypoint(null);
        setSelectedRoute(null);
        audioManager.playSelect();
        return;
      }

      // 3. Check Navigable Routes
      let foundRoute: NavigableRoute | null = null;
      NAVIGABLE_ROUTES.forEach((route) => {
        const isConnected =
          discoveredWaypoints.includes(route.fromId) &&
          discoveredWaypoints.includes(route.toId);
        if (!isConnected) return;
        for (let i = 0; i < route.pathPoints.length - 1; i++) {
          const p1 = worldToMap(route.pathPoints[i].x, route.pathPoints[i].z);
          const p2 = worldToMap(route.pathPoints[i + 1].x, route.pathPoints[i + 1].z);
          if (distToSegment(clickX, clickY, p1.x, p1.y, p2.x, p2.y) <= routeHitRadius) {
            foundRoute = route;
            break;
          }
        }
      });

      if (foundRoute) {
        setSelectedRoute(foundRoute);
        setSelectedWaypoint(null);
        setSelectedPOI(null);
        audioManager.playSelect();
        return;
      }

      // Deselect if tapped empty space
      setSelectedWaypoint(null);
      setSelectedPOI(null);
      setSelectedRoute(null);
    },
    [discoveredWaypoints, distToSegment, worldToMap]
  );

  // Handle canvas mouse click (skip if user was dragging)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragMovedDistRef.current > 8) return;
    selectMapAtClientPoint(e.clientX, e.clientY, false);
  };

  // Mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragMovedDistRef.current = 0;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) {
      // Hover detection
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * MAP_SIZE;
      const mouseY = ((e.clientY - rect.top) / rect.height) * MAP_SIZE;

      let hoverText: string | null = null;
      FAST_TRAVEL_POINTS.forEach((wp) => {
        const p = worldToMap(wp.x, wp.z);
        if (Math.hypot(p.x - mouseX, p.y - mouseY) <= 14) {
          hoverText = wp.name;
        }
      });

      if (!hoverText) {
        LANDMARK_POIS.forEach((poi) => {
          const p = worldToMap(poi.x, poi.z);
          if (Math.hypot(p.x - mouseX, p.y - mouseY) <= 12) {
            hoverText = poi.name;
          }
        });
      }

      if (!hoverText) {
        NAVIGABLE_ROUTES.forEach((route) => {
          const isConnected =
            discoveredWaypoints.includes(route.fromId) &&
            discoveredWaypoints.includes(route.toId);
          if (!isConnected) return;
          for (let i = 0; i < route.pathPoints.length - 1; i++) {
            const p1 = worldToMap(route.pathPoints[i].x, route.pathPoints[i].z);
            const p2 = worldToMap(route.pathPoints[i + 1].x, route.pathPoints[i + 1].z);
            if (distToSegment(mouseX, mouseY, p1.x, p1.y, p2.x, p2.y) <= 8) {
              hoverText = `Ruta Conectada: ${route.name}`;
              break;
            }
          }
        });
      }

      setHoveredInfo(hoverText);
      return;
    }

    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    dragMovedDistRef.current += Math.hypot(dx, dy);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch gestures: 1-finger pan, 2-finger pinch-to-zoom, and clean tap selection
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragMovedDistRef.current = 0;
      pinchDistRef.current = null;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      dragMovedDistRef.current = 999; // prevent tap selection after pinch
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const deltaScale = (newDist - pinchDistRef.current) * 0.006;
      pinchDistRef.current = newDist;
      setZoomLevel((prev) => Math.min(2.2, Math.max(0.7, prev + deltaScale)));
      return;
    }

    if (e.touches.length === 1 && isDraggingRef.current) {
      const canvas = canvasRef.current;
      const rect = canvas?.getBoundingClientRect();
      const scaleFactor = rect && rect.width > 0 ? MAP_SIZE / rect.width : 1;
      const dx = e.touches[0].clientX - lastMousePosRef.current.x;
      const dy = e.touches[0].clientY - lastMousePosRef.current.y;
      dragMovedDistRef.current += Math.hypot(dx, dy);
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setPanOffset((prev) => ({
        x: prev.x + dx * scaleFactor,
        y: prev.y + dy * scaleFactor,
      }));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 0) {
      if (isDraggingRef.current && dragMovedDistRef.current <= 10 && e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        selectMapAtClientPoint(t.clientX, t.clientY, true);
      }
      isDraggingRef.current = false;
      pinchDistRef.current = null;
    }
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(2.2, Math.max(0.7, prev + delta)));
  };

  const handleResetView = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleTriggerFastTravel = () => {
    if (!selectedWaypoint) return;
    const isDiscovered = discoveredWaypoints.includes(selectedWaypoint.id);
    if (!isDiscovered) return;

    onFastTravel(selectedWaypoint);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-black/92 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl bg-[#100b1b] border-2 border-[#b4862a] rounded-xs shadow-[0_0_50px_rgba(0,0,0,0.9),0_0_20px_rgba(180,134,42,0.3)] flex flex-col h-[96dvh] sm:h-auto sm:max-h-[94dvh] overflow-hidden font-pixel">
        
        {/* MODAL HEADER */}
        <div className="px-3 sm:px-4 py-2 bg-[#191129] border-b border-[#3b2a5c] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-lg shrink-0">🗺️</span>
            <div className="min-w-0">
              <h2 className="text-[10px] sm:text-sm font-bold text-[#fef08a] tracking-wider truncate">
                ATLAS DE LUMINATI
              </h2>
              <p className="text-[6.5px] sm:text-[8px] text-[#94a3b8] truncate">
                 Exploración: <span className="text-[#5fe3d2]">{explorationPercent}%</span> · Rutas: <span className="text-[#fef08a]">{activeRoutesCount}/{NAVIGABLE_ROUTES.length}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Close Button (>= 40x40px touch hitbox) */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 bg-[#25173e] active:bg-[#3d2666] border border-[#6b4c9a] text-[#f1f5f9] rounded-xs text-[10px] transition cursor-pointer flex items-center justify-center touch-manipulation"
              aria-label="Cerrar Atlas"
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR (Horizontally scrollable single-line strip on mobile) */}
        <div className="px-2.5 py-1.5 bg-[#140e24] border-b border-[#2b1f40] flex items-center justify-between gap-2 text-[7px] sm:text-[8px] shrink-0">
          {/* Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            {(
              [
                { id: 'all', label: 'Todo' },
                { id: 'routes', label: `Rutas (${activeRoutesCount})` },
                { id: 'waypoints', label: 'Fuentes' },
                { id: 'landmarks', label: 'Lugares' },
                { id: 'grass', label: 'Hierba' },
              ] as const
            ).map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-xs transition cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
                  filter === f.id
                    ? 'bg-[#b4862a] text-[#0d0917] font-bold'
                    : 'bg-[#1e1533] text-[#cbd5e1] active:bg-[#2e204d] border border-[#392959]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Zoom & Centering tools */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleZoom(0.25)}
              className="min-h-[36px] min-w-[36px] px-2 py-1 bg-[#1e1533] active:bg-[#2e204d] border border-[#392959] text-[#f1f5f9] rounded-xs cursor-pointer flex items-center justify-center touch-manipulation text-[10px]"
              aria-label="Acercar mapa"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => handleZoom(-0.25)}
              className="min-h-[36px] min-w-[36px] px-2 py-1 bg-[#1e1533] active:bg-[#2e204d] border border-[#392959] text-[#f1f5f9] rounded-xs cursor-pointer flex items-center justify-center touch-manipulation text-[10px]"
              aria-label="Alejar mapa"
            >
              -
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="min-h-[36px] px-2.5 py-1 bg-[#1e1533] active:bg-[#2e204d] border border-[#392959] text-[#cbd5e1] rounded-xs cursor-pointer whitespace-nowrap touch-manipulation"
              aria-label="Centrar mapa"
            >
              Centrar
            </button>
          </div>
        </div>

        {/* MAIN BODY: MAP CANVAS + BOTTOM/SIDE INSPECTOR */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* MAP CANVAS CONTAINER */}
          <div className="relative bg-[#090613] overflow-hidden flex items-center justify-center p-1.5 sm:p-2 h-[38dvh] min-h-[210px] md:h-auto md:flex-1 shrink-0">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              className="max-w-full max-h-full md:max-h-[68dvh] aspect-square block border border-[#2c1e45] rounded-xs cursor-grab active:cursor-grabbing shadow-inner touch-none"
            />

            {/* Hover Tooltip Overlay */}
            {hoveredInfo && (
              <div className="absolute bottom-3 left-3 pointer-events-none px-2.5 py-1 bg-[#160f29]/95 border border-[#b4862a] text-[#fef08a] rounded-xs text-[7.5px] shadow-lg">
                ✦ {hoveredInfo}
              </div>
            )}

            {/* Minimap compass legend */}
            <div className="absolute top-3 right-3 pointer-events-none bg-[#120c22]/90 border border-[#32234f] rounded-xs px-2 py-1 text-[7px] text-[#cbd5e1] flex flex-col items-center">
              <span className="text-[#fef08a] font-bold">N</span>
              <span className="text-[6px] text-[#64748b]">▲</span>
            </div>
          </div>

          {/* SIDE / BOTTOM PANEL: LOCATION INSPECTOR & FAST TRAVEL */}
          <div className="flex-1 md:flex-none w-full md:w-80 bg-[#140e24] border-t md:border-t-0 md:border-l border-[#2e1f47] p-3 flex flex-col justify-between overflow-y-auto min-h-0">
            <div className="flex flex-col gap-3">
              
              {/* CURRENT PLAYER LOCATION CARD */}
              <div className="p-2.5 bg-[#0e091a] border border-[#3b2a5c] rounded-xs">
                <div className="text-[7px] uppercase tracking-wider text-[#94a3b8] mb-1">
                  Tu Ubicación Actual
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentRegion.color }}
                  />
                  <div className="text-[10px] font-bold text-[#fef9c3]">
                    {currentRegion.name}
                  </div>
                </div>
                <div className="text-[7px] text-[#94a3b8] leading-relaxed mb-2">
                  {currentRegion.subtitle} · {currentRegion.recommendedLevel}
                </div>
                <div className="flex items-center justify-between text-[7px] text-[#64748b] border-t border-[#1e1533] pt-1.5">
                  <span>Coordenadas:</span>
                  <span className="font-mono text-[#cbd5e1]">
                    X: {Math.round(playerPos.x)}, Z: {Math.round(playerPos.z)}
                  </span>
                </div>
              </div>

              {/* INSPECTED SELECTION CARD */}
              {selectedRoute ? (
                <BrandPanel variant="inset" className="border-[#b4862a]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base">🛤️</span>
                    <span
                      className={`text-[7px] px-1.5 py-0.5 rounded-xs border ${
                        discoveredWaypoints.includes(selectedRoute.fromId) &&
                        discoveredWaypoints.includes(selectedRoute.toId)
                          ? 'bg-[#0d9488]/20 border-[#14b8a6] text-[#5fe3d2]'
                          : 'bg-[#b45309]/20 border-[#f59e0b] text-[#fde68a]'
                      }`}
                    >
                      {discoveredWaypoints.includes(selectedRoute.fromId) &&
                      discoveredWaypoints.includes(selectedRoute.toId)
                        ? 'Ruta Activa'
                        : 'En Exploración'}
                    </span>
                  </div>

                  <h3 className="text-[10px] font-bold text-[#fef08a] mb-1">
                    {selectedRoute.name}
                  </h3>
                  <p className="text-[7px] text-[#cbd5e1] leading-relaxed mb-2.5">
                    {selectedRoute.description}
                  </p>

                  {/* Route endpoints */}
                  <div className="space-y-1 bg-[#0f0a1c] p-2 rounded-xs border border-[#2a1d42] mb-2 text-[7px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Origen:</span>
                      <span className="text-[#cbd5e1]">
                        {FAST_TRAVEL_POINTS.find((w) => w.id === selectedRoute.fromId)?.name.split(' ')[0] || 'Origen'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#94a3b8]">Destino:</span>
                      <span className="text-[#cbd5e1]">
                        {FAST_TRAVEL_POINTS.find((w) => w.id === selectedRoute.toId)?.name.split(' ')[0] || 'Destino'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[7px] text-[#94a3b8] flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: selectedRoute.color }}
                    />
                    <span>Camino con sendero y luces de guía</span>
                  </div>
                </BrandPanel>
              ) : selectedWaypoint ? (
                <BrandPanel variant="inset" className="border-[#5fe3d2]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-base">{selectedWaypoint.icon}</span>
                    <span
                      className={`text-[7px] px-1.5 py-0.5 rounded-xs border ${
                        discoveredWaypoints.includes(selectedWaypoint.id)
                          ? 'bg-[#0d9488]/20 border-[#14b8a6] text-[#5fe3d2]'
                          : 'bg-[#475569]/20 border-[#64748b] text-[#94a3b8]'
                      }`}
                    >
                      {discoveredWaypoints.includes(selectedWaypoint.id)
                        ? 'Sintonizado'
                        : 'No Descubierto'}
                    </span>
                  </div>

                  <h3 className="text-[10px] font-bold text-[#fef08a] mb-1">
                    {selectedWaypoint.name}
                  </h3>
                  <p className="text-[7px] text-[#cbd5e1] leading-relaxed mb-2.5">
                    {selectedWaypoint.description}
                  </p>

                  {/* Connected Routes to this waypoint */}
                  {connectedRoutes.length > 0 && (
                    <div className="mb-2.5 pt-2 border-t border-[#2e1f47]">
                      <div className="text-[7px] text-[#94a3b8] uppercase mb-1">
                        Rutas Conectadas:
                      </div>
                      <div className="space-y-1">
                        {connectedRoutes.map((cr) => {
                          const otherWpId = cr.fromId === selectedWaypoint.id ? cr.toId : cr.fromId;
                          const otherWp = FAST_TRAVEL_POINTS.find((w) => w.id === otherWpId);
                          const isOtherDiscovered = discoveredWaypoints.includes(otherWpId);
                          return (
                            <BrandButton
                              key={cr.id}
                              variant="secondary"
                              onClick={() => setSelectedRoute(cr)}
                              className="w-full text-left px-1.5 py-1 text-[7px] flex items-center justify-between"
                            >
                              <span className="truncate">↔ {otherWp?.name.split(' ')[0] || cr.name}</span>
                              <span
                                className={`text-[6px] px-1 py-0.5 rounded-xs ${
                                  isOtherDiscovered ? 'text-[#5fe3d2]' : 'text-[#94a3b8]'
                                }`}
                              >
                                {isOtherDiscovered ? 'Activa' : 'Inexplorada'}
                              </span>
                            </BrandButton>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fast Travel Action Button */}
                  {discoveredWaypoints.includes(selectedWaypoint.id) ? (
                    <BrandButton
                      variant="ki"
                      onClick={handleTriggerFastTravel}
                      className="w-full min-h-[44px] py-2.5 font-bold text-[9px] tracking-wider"
                    >
                      ⚡ VIAJE RÁPIDO
                    </BrandButton>
                  ) : (
                    <div className="text-[7px] text-center text-[#f87171] bg-[#450a0a]/40 border border-[#7f1d1d] py-2 rounded-xs">
                      Visita este lugar a pie para sintonizarlo
                    </div>
                  )}
                </BrandPanel>
                ) : selectedPOI ? (
                <div className="p-2.5 bg-[#1b1230] border border-[#c084fc] rounded-xs animate-in fade-in">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{selectedPOI.icon}</span>
                    <h3 className="text-[10px] font-bold text-[#fef08a]">
                      {selectedPOI.name}
                    </h3>
                  </div>
                  <p className="text-[7px] text-[#cbd5e1] leading-relaxed mb-2">
                    {selectedPOI.description}
                  </p>
                  <div className="text-[7px] text-[#94a3b8] font-mono">
                    Posición: X: {selectedPOI.x}, Z: {selectedPOI.z}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#0d0917] border border-[#241738] rounded-xs text-center text-[7px] text-[#94a3b8] leading-relaxed">
                  Toca una fuente ⛲, sendero 🛤️ o lugar del mapa para ver detalles y viajar rápidamente.
                </div>
              )}

              {/* REGION BESTIARY & RESOURCES SUMMARY */}
              <div className="p-2.5 bg-[#0e091a] border border-[#2b1f40] rounded-xs space-y-2">
                <div>
                  <div className="flex items-center justify-between text-[7px] uppercase tracking-wider text-[#94a3b8] mb-1.5">
                    <span>Almas Autóctonas</span>
                    <span className="text-[#5fe3d2]">{currentRegion.dominantBiome}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentRegion.nativeSoulTypes.map((type) => (
                      <span
                        key={type}
                        className="px-1.5 py-0.5 rounded-xs bg-[#1f1535] border border-[#3b2a5c] text-[7px] text-[#fef08a]"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                {currentRegion.resources && currentRegion.resources.length > 0 && (
                  <div className="pt-1.5 border-t border-[#1e1533]">
                    <div className="text-[7px] uppercase tracking-wider text-[#94a3b8] mb-1">
                      Recursos Regionales
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentRegion.resources.map((res) => (
                        <span
                          key={res}
                          className="px-1.5 py-0.5 rounded-xs bg-[#122229] border border-[#1f4754] text-[7px] text-[#7dd3fc]"
                        >
                          ✦ {res}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM INSTRUCTIONS */}
            <div className="mt-3 pt-2 border-t border-[#23173a] text-[6.5px] sm:text-[7px] text-[#64748b] text-center">
              Arrastra o pellizca para explorar el mapa · Toca ✕ para volver
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
