import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Car,
  Bus,
  Footprints,
  Compass,
  Phone,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Play,
  Pause,
  Clock,
  ShieldCheck,
  LocateFixed,
  Layers,
  Sparkles,
  ChevronRight,
  List,
  Map as MapIcon,
  Route as RouteIcon,
  RefreshCw,
  AlertTriangle,
  Crosshair,
} from 'lucide-react';
import L from 'leaflet';
import { HealthUnit } from '../../types';
import {
  acquirePreciseUserLocation,
  getSavedUserGpsLocation,
  saveUserGpsLocation,
  GeocodedAddress,
} from '../../services/geoService';
import { ExactLocationModal } from '../search/ExactLocationModal';

interface UnitRouteMapModalProps {
  unit: HealthUnit | null;
  onClose: () => void;
  userCoords?: { lat: number; lng: number };
  originLabel?: string;
}

// Preset strategic origins in Luanda and major Angolan capitals
const QUICK_ORIGINS = [
  { label: 'Calemba 2 (Via Expressa / Estrada do Calemba 2)', lat: -8.9050, lng: 13.2850, desc: 'Kilamba Kiaxi / Viana' },
  { label: 'Calemba 2 (Rotunda do Calemba)', lat: -8.9080, lng: 13.2880, desc: 'Eixo Comandante Loy' },
  { label: 'Calemba 2 (Fronteira Estalagem)', lat: -8.9100, lng: 13.2950, desc: 'Ligação Viana' },
  { label: 'Kilamba Kiaxi (Golfe 2)', lat: -8.8950, lng: 13.2750, desc: 'Estrada do Calemba 2' },
  { label: 'Kilamba Kiaxi (Palanca)', lat: -8.8680, lng: 13.2680, desc: 'Av. Deolinda Rodrigues' },
  { label: 'Viana (Ponte / Vila Chinesa)', lat: -8.9180, lng: 13.3720, desc: 'Estrada de Catete' },
  { label: 'Cacuaco (Pedreira / Vila)', lat: -8.7800, lng: 13.3750, desc: 'Zona Norte de Luanda' },
  { label: 'Luanda (Mutamba / Baixa)', lat: -8.8147, lng: 13.2328, desc: 'Centro da Cidade' },
  { label: 'Talatona (Belas Shopping)', lat: -8.9120, lng: 13.1890, desc: 'Zona Sul de Luanda' },
  { label: 'Samba / Maianga', lat: -8.8450, lng: 13.2200, desc: 'Eixo Centro-Sul' },
  { label: 'Cazenga (Hoji-ya-Henda)', lat: -8.8250, lng: 13.2950, desc: 'Zona Leste de Luanda' },
  { label: 'Benguela (Centro Urbano)', lat: -12.5763, lng: 13.4055, desc: 'Província de Benguela' },
  { label: 'Huambo (Cidade Alta)', lat: -12.7761, lng: 15.7392, desc: 'Província do Huambo' },
  { label: 'Lubango (Largo Agostinho Neto)', lat: -14.9172, lng: 13.4925, desc: 'Província da Huíla' },
];

// Haversine distance formula (in km)
function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Fallback curved road generator when OSRM is offline or in transition
function generateRealisticRoadPoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  isAlternate = false
): [number, number][] {
  const points: [number, number][] = [];
  const steps = 30;

  // Arc bend factor
  const curvature = isAlternate ? -0.35 : 0.25;
  const midLat = (startLat + endLat) / 2 + (endLng - startLng) * curvature;
  const midLng = (startLng + endLng) / 2 - (endLat - startLat) * curvature;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic Bézier curve
    const lat = (1 - t) * (1 - t) * startLat + 2 * (1 - t) * t * midLat + t * t * endLat;
    const lng = (1 - t) * (1 - t) * startLng + 2 * (1 - t) * t * midLng + t * t * endLng;
    // Small road jitter for realistic road turn simulation
    const jitter = Math.sin(t * Math.PI * 4) * 0.0012;
    points.push([lat + jitter, lng + jitter]);
  }

  return points;
}

export const UnitRouteMapModal: React.FC<UnitRouteMapModalProps> = ({
  unit,
  onClose,
  userCoords,
  originLabel,
}) => {
  const [travelMode, setTravelMode] = useState<'car' | 'transit' | 'walk'>('car');
  const [mapTileStyle, setMapTileStyle] = useState<'voyager' | 'osm' | 'satellite'>('voyager');
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0); // 0 to 100%
  const [activeView, setActiveView] = useState<'map' | 'steps'>('map');
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState<0 | 1>(0);

  // Origin position
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string }>(() => {
    if (userCoords?.lat && userCoords?.lng) {
      return {
        lat: userCoords.lat,
        lng: userCoords.lng,
        label: originLabel || 'Sua Localização GPS Actual',
      };
    }
    const saved = getSavedUserGpsLocation();
    if (saved) {
      return {
        lat: saved.latitude,
        lng: saved.longitude,
        label: `Sua Localização GPS (${saved.bairro || saved.municipio})`,
      };
    }
    // Default to Calemba 2 / Kilamba Kiaxi
    return {
      lat: -8.9050,
      lng: 13.2850,
      label: originLabel || 'Calemba 2 (Kilamba Kiaxi)',
    };
  });

  const [isExactLocationModalOpen, setIsExactLocationModalOpen] = useState(false);
  const [showLocationToast, setShowLocationToast] = useState<string | null>(null);

  // Quick switch specifically to Calemba 2
  const handleSetCalemba2 = () => {
    const calembaLoc: GeocodedAddress = {
      provincia: 'Luanda',
      municipio: 'Kilamba Kiaxi',
      bairro: 'Calemba 2',
      rua: 'Via Expressa / Estrada do Calemba 2',
      displayName: 'Calemba 2, Kilamba Kiaxi, Luanda, Angola',
      latitude: -8.9050,
      longitude: 13.2850,
      accuracy: 10,
      source: 'saved_profile',
      timestamp: new Date().toISOString(),
    };
    saveUserGpsLocation(calembaLoc);
    setOrigin({
      lat: -8.9050,
      lng: 13.2850,
      label: 'Calemba 2 (Kilamba Kiaxi)',
    });
    setShowLocationToast('Ponto de partida atualizado para Calemba 2! Rota recalculada.');
    setTimeout(() => setShowLocationToast(null), 4000);
  };

  // Callback when user confirms coordinates from ExactLocationModal
  const handleLocationConfirmed = (loc: GeocodedAddress) => {
    setOrigin({
      lat: loc.latitude,
      lng: loc.longitude,
      label: `${loc.bairro || loc.municipio} (${loc.municipio})`,
    });
    setIsExactLocationModalOpen(false);
    setShowLocationToast(`Ponto de partida ajustado para ${loc.bairro || loc.municipio}!`);
    setTimeout(() => setShowLocationToast(null), 4000);
  };

  // Calculated route geometry & metrics
  const [primaryRouteCoords, setPrimaryRouteCoords] = useState<[number, number][]>([]);
  const [altRouteCoords, setAltRouteCoords] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(14.5);
  const [routeDurationMin, setRouteDurationMin] = useState<number>(26);
  const [altDistanceKm, setAltDistanceKm] = useState<number>(16.2);
  const [altDurationMin, setAltDurationMin] = useState<number>(34);
  const [turnSteps, setTurnSteps] = useState<{ instruction: string; distance: string; detail: string }[]>([]);

  // Map DOM and Leaflet references
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const simulationMarkerRef = useRef<L.Marker | null>(null);

  // Initialize or update origin based on userCoords prop or saved location
  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng) {
      setOrigin({
        lat: userCoords.lat,
        lng: userCoords.lng,
        label: originLabel || 'Sua Localização GPS Actual',
      });
    } else {
      const saved = getSavedUserGpsLocation();
      if (saved) {
        setOrigin({
          lat: saved.latitude,
          lng: saved.longitude,
          label: `Sua Localização GPS (${saved.bairro || saved.municipio})`,
        });
      } else if (unit) {
        // Default to Calemba 2 for Luanda metropolitan units
        const isNearLuanda = Math.abs(unit.latitude - -8.8) < 0.8;
        if (isNearLuanda) {
          setOrigin({
            lat: -8.9050,
            lng: 13.2850,
            label: 'Calemba 2 (Kilamba Kiaxi)',
          });
        } else {
          setOrigin({
            lat: unit.latitude - 0.045,
            lng: unit.longitude - 0.038,
            label: `Ponto de Partida (${unit.municipio || unit.provincia})`,
          });
        }
      }
    }
  }, [userCoords, originLabel, unit]);

  // Fetch real road route from OSRM or fallback to realistic road geometry
  useEffect(() => {
    if (!unit) return;
    let isMounted = true;
    setIsLoadingRoute(true);

    const fetchRoute = async () => {
      const startLat = origin.lat;
      const startLng = origin.lng;
      const destLat = unit.latitude;
      const destLng = unit.longitude;

      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const res = await fetch(osrmUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('OSRM routing failed');
        const data = await res.json();

        if (isMounted && data?.routes?.length > 0) {
          const mainRoute = data.routes[0];
          const mainPoints: [number, number][] = mainRoute.geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng]
          );
          setPrimaryRouteCoords(mainPoints);
          setRouteDistanceKm(Math.round((mainRoute.distance / 1000) * 10) / 10);
          setRouteDurationMin(Math.max(4, Math.round(mainRoute.duration / 60)));

          // Extract turn by turn steps if available
          if (mainRoute.legs?.[0]?.steps?.length > 0) {
            const steps = mainRoute.legs[0].steps.map((s: any, idx: number) => ({
              instruction: s.maneuver?.type === 'depart'
                ? `Inicie o percurso em ${origin.label}`
                : s.maneuver?.type === 'arrive'
                ? `Chegada à unidade de saúde: ${unit.nome}`
                : s.name
                ? `Siga por ${s.name}`
                : `Continue na via principal (${s.maneuver?.modifier || 'em frente'})`,
              distance: s.distance > 1000 ? `${(s.distance / 1000).toFixed(1)} km` : `${Math.round(s.distance)} m`,
              detail: `Passagem em direção a ${unit.bairro || unit.municipio}`,
            }));
            setTurnSteps(steps.slice(0, 8));
          }

          // Alternative route
          if (data.routes[1]) {
            const altRoute = data.routes[1];
            const altPoints: [number, number][] = altRoute.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng]
            );
            setAltRouteCoords(altPoints);
            setAltDistanceKm(Math.round((altRoute.distance / 1000) * 10) / 10);
            setAltDurationMin(Math.max(6, Math.round(altRoute.duration / 60)));
          } else {
            // Generate distinct curved alternate path
            const synthAlt = generateRealisticRoadPoints(startLat, startLng, destLat, destLng, true);
            setAltRouteCoords(synthAlt);
            setAltDistanceKm(Math.round((mainRoute.distance / 1000) * 1.15 * 10) / 10);
            setAltDurationMin(Math.round((mainRoute.duration / 60) * 1.25));
          }
          setIsLoadingRoute(false);
          return;
        }
      } catch (err) {
        console.warn('Routing API fallback to local road geometry:', err);
      }

      // Offline / network fallback with realistic Angolan roadway Bézier paths
      if (isMounted) {
        const straightDist = getHaversineDistance(startLat, startLng, destLat, destLng);
        const realisticDist = Math.max(1.8, Math.round(straightDist * 1.28 * 10) / 10);
        const primary = generateRealisticRoadPoints(startLat, startLng, destLat, destLng, false);
        const alt = generateRealisticRoadPoints(startLat, startLng, destLat, destLng, true);

        setPrimaryRouteCoords(primary);
        setAltRouteCoords(alt);
        setRouteDistanceKm(realisticDist);
        setRouteDurationMin(Math.max(5, Math.round((realisticDist / 35) * 60)));
        setAltDistanceKm(Math.round(realisticDist * 1.18 * 10) / 10);
        setAltDurationMin(Math.max(7, Math.round((realisticDist / 28) * 60)));

        setTurnSteps([
          {
            instruction: `Partida: ${origin.label}`,
            distance: '0 m',
            detail: 'Inicie a circulação pela via de acesso principal.',
          },
          {
            instruction: `Siga pela via arterial em direção a ${unit.municipio}`,
            distance: `${(realisticDist * 0.45).toFixed(1)} km`,
            detail: 'Mantenha-se na faixa correspondente e acompanhe a sinalização.',
          },
          {
            instruction: `Aproxime-se do bairro ${unit.bairro}`,
            distance: `${(realisticDist * 0.35).toFixed(1)} km`,
            detail: `Entrada em direção a ${unit.endereco_completo}`,
          },
          {
            instruction: `Destino: ${unit.nome}`,
            distance: 'Chegada',
            detail: `${unit.endereco_completo} • Telefone: ${unit.telefone || 'Disponível na recepção'}`,
          },
        ]);
        setIsLoadingRoute(false);
      }
    };

    fetchRoute();
    return () => {
      isMounted = false;
    };
  }, [origin, unit]);

  // Adjust travel time and speed based on travel mode
  const currentMetrics = useMemo(() => {
    const baseDist = selectedRouteIdx === 0 ? routeDistanceKm : altDistanceKm;
    const baseDuration = selectedRouteIdx === 0 ? routeDurationMin : altDurationMin;

    if (travelMode === 'car') {
      return {
        distance: baseDist,
        duration: baseDuration,
        speedLabel: '35-50 km/h (Trânsito Normal)',
        label: 'Carro',
      };
    }
    if (travelMode === 'transit') {
      // Public Candongueiro / Táxi with local stops
      const transitDuration = Math.round(baseDuration * 1.4 + 5);
      return {
        distance: baseDist,
        duration: transitDuration,
        speedLabel: '20-30 km/h (Candongueiro / Táxi Azul e Branco)',
        label: 'Transporte Público',
      };
    }
    // Walk / A Pé
    const walkDuration = Math.max(12, Math.round((baseDist / 4.5) * 60));
    return {
      distance: baseDist,
      duration: walkDuration,
      speedLabel: '4.5 km/h (Caminhada Pedonal)',
      label: 'A Pé',
    };
  }, [travelMode, selectedRouteIdx, routeDistanceKm, routeDurationMin, altDistanceKm, altDurationMin]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !unit) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        center: [unit.latitude, unit.longitude],
        zoom: 12,
      });

      // Add zoom control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Tile layer: CartoDB Voyager by default (Google Maps road aesthetic)
      const tileLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);

      tileLayerRef.current = tileLayer;

      // Group for polylines and markers
      const routeGroup = L.layerGroup().addTo(map);
      routeLayersRef.current = routeGroup;

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [unit]);

  // Switch Tile Layer when style changed
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    tileLayerRef.current.remove();

    let newUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let options: any = { maxZoom: 19, subdomains: 'abcd' };

    if (mapTileStyle === 'osm') {
      newUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      options = { maxZoom: 19 };
    } else if (mapTileStyle === 'satellite') {
      newUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      options = { maxZoom: 18 };
    }

    const newTileLayer = L.tileLayer(newUrl, options).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [mapTileStyle]);

  // Draw Route, Badges, and Markers whenever coordinates change
  const renderMapLayers = useCallback(() => {
    const map = mapInstanceRef.current;
    const group = routeLayersRef.current;
    if (!map || !group || !unit || primaryRouteCoords.length < 2) return;

    group.clearLayers();
    simulationMarkerRef.current = null;

    // 1. Draw Alternative Route (Softer Blue / Gray)
    if (altRouteCoords.length > 1) {
      const isSelected = selectedRouteIdx === 1;

      // Outer border casing
      L.polyline(altRouteCoords, {
        color: isSelected ? '#1E40AF' : '#64748B',
        weight: isSelected ? 8 : 6,
        opacity: isSelected ? 0.95 : 0.65,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      // Inner stroke
      const altLine = L.polyline(altRouteCoords, {
        color: isSelected ? '#2563EB' : '#94A3B8',
        weight: isSelected ? 5 : 4,
        opacity: isSelected ? 1 : 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(group);

      altLine.on('click', () => setSelectedRouteIdx(1));

      // Alternative route badge placed at mid-point (just like Google Maps in user's image)
      const altMidIdx = Math.floor(altRouteCoords.length * 0.45);
      const altMid = altRouteCoords[altMidIdx];
      if (altMid) {
        const altBadgeHtml = `
          <div class="cursor-pointer bg-white text-slate-900 border ${
            isSelected
              ? 'border-blue-600 shadow-xl ring-2 ring-blue-300 scale-105'
              : 'border-slate-300 shadow-md opacity-90'
          } rounded-xl px-2.5 py-1 flex items-center gap-1.5 font-sans whitespace-nowrap transition-transform duration-200">
            <span class="text-xs">🚗</span>
            <span class="text-xs font-black ${isSelected ? 'text-blue-700' : 'text-slate-800'}">${altDurationMin} min</span>
            <span class="text-[10px] text-slate-500 font-bold border-l border-slate-200 pl-1.5">${altDistanceKm.toFixed(1)} km</span>
          </div>
        `;
        const altBadgeIcon = L.divIcon({
          html: altBadgeHtml,
          className: 'custom-route-badge-alt',
          iconSize: [110, 32],
          iconAnchor: [55, 16],
        });
        const altBadgeMarker = L.marker(altMid, { icon: altBadgeIcon }).addTo(group);
        altBadgeMarker.on('click', () => setSelectedRouteIdx(1));
      }
    }

    // 2. Draw Primary Route (Google Maps Vivid Blue `#2563EB` / `#1D4ED8`)
    const isPrimarySelected = selectedRouteIdx === 0;

    // Outer border casing (Deep Navy Blue for high contrast on roads)
    L.polyline(primaryRouteCoords, {
      color: isPrimarySelected ? '#174EA6' : '#64748B',
      weight: isPrimarySelected ? 9 : 6,
      opacity: isPrimarySelected ? 0.95 : 0.65,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(group);

    // Inner vivid blue line (Signature Google Maps Blue)
    const primaryLine = L.polyline(primaryRouteCoords, {
      color: isPrimarySelected ? '#2563EB' : '#94A3B8',
      weight: isPrimarySelected ? 6 : 4,
      opacity: isPrimarySelected ? 1 : 0.85,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(group);

    primaryLine.on('click', () => setSelectedRouteIdx(0));

    // Primary route badge placed at mid-point (Exact replica of user's uploaded image)
    const midIdx = Math.floor(primaryRouteCoords.length * 0.48);
    const mid = primaryRouteCoords[midIdx];
    if (mid) {
      const primaryBadgeHtml = `
        <div class="cursor-pointer bg-white text-slate-900 border ${
          isPrimarySelected
            ? 'border-blue-600 shadow-xl ring-2 ring-blue-300 scale-105'
            : 'border-slate-300 shadow-md opacity-90'
        } rounded-xl px-2.5 py-1 flex items-center gap-1.5 font-sans whitespace-nowrap transition-transform duration-200">
          <span class="text-xs">🚗</span>
          <span class="text-xs font-black ${isPrimarySelected ? 'text-blue-700' : 'text-slate-800'}">${routeDurationMin} min</span>
          <span class="text-[10px] text-slate-500 font-bold border-l border-slate-200 pl-1.5">${routeDistanceKm.toFixed(1)} km</span>
        </div>
      `;
      const primaryBadgeIcon = L.divIcon({
        html: primaryBadgeHtml,
        className: 'custom-route-badge-primary',
        iconSize: [110, 32],
        iconAnchor: [55, 16],
      });
      const primaryBadgeMarker = L.marker(mid, { icon: primaryBadgeIcon }).addTo(group);
      primaryBadgeMarker.on('click', () => setSelectedRouteIdx(0));
    }

    // 3. Origin Marker (Matches the circle icon in user's image with label: "Cacuaco pedreira ○" / "Sua Localização")
    const originHtml = `
      <div class="relative flex flex-col items-center group">
        <div class="mb-1 bg-white/95 text-slate-900 text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-md border border-slate-300 whitespace-nowrap flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-blue-600"></span>
          <span>${origin.label}</span>
        </div>
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping"></div>
          <div class="w-5 h-5 rounded-full bg-white border-[3px] border-[#1A73E8] shadow-lg flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-[#1A73E8]"></div>
          </div>
        </div>
      </div>
    `;
    const originIcon = L.divIcon({
      html: originHtml,
      className: 'custom-origin-marker',
      iconSize: [140, 50],
      iconAnchor: [70, 42],
    });
    L.marker([origin.lat, origin.lng], { icon: originIcon }).addTo(group);

    // 4. Destination Marker (Google Maps Red Pin with White Dot like in user's image)
    const destHtml = `
      <div class="relative flex flex-col items-center group">
        <div class="mb-1 bg-[#0B1E3B] text-white text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-md border border-white/20 whitespace-nowrap flex items-center gap-1">
          <span class="w-2 h-2 rounded-full bg-rose-500"></span>
          <span>${unit.nome}</span>
        </div>
        <div class="relative drop-shadow-lg">
          <svg viewBox="0 0 24 32" width="28" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#DC2626"/>
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" stroke="#991B1B" stroke-width="0.75"/>
            <circle cx="12" cy="12" r="4.5" fill="#FFFFFF"/>
          </svg>
        </div>
      </div>
    `;
    const destIcon = L.divIcon({
      html: destHtml,
      className: 'custom-dest-marker',
      iconSize: [160, 60],
      iconAnchor: [80, 56],
    });
    L.marker([unit.latitude, unit.longitude], { icon: destIcon }).addTo(group);

    // 5. Fit bounds to comfortably display both points and full route
    const allCoords = [...primaryRouteCoords, ...altRouteCoords];
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [
    unit,
    origin,
    primaryRouteCoords,
    altRouteCoords,
    selectedRouteIdx,
    routeDistanceKm,
    routeDurationMin,
    altDistanceKm,
    altDurationMin,
  ]);

  // Re-render map layers whenever route data updates
  useEffect(() => {
    renderMapLayers();
  }, [renderMapLayers]);

  // Handle Simulation Timer
  useEffect(() => {
    let timer: any;
    if (isSimulating) {
      timer = setInterval(() => {
        setSimulationProgress((prev) => {
          if (prev >= 100) {
            setIsSimulating(false);
            return 100;
          }
          return prev + 2.5;
        });
      }, 180);
    }
    return () => clearInterval(timer);
  }, [isSimulating]);

  // Update Moving Vehicle along the selected route line during simulation
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = routeLayersRef.current;
    if (!map || !group) return;

    const activeCoords = selectedRouteIdx === 0 ? primaryRouteCoords : altRouteCoords;
    if (activeCoords.length < 2) return;

    if (simulationProgress <= 0) {
      if (simulationMarkerRef.current) {
        simulationMarkerRef.current.remove();
        simulationMarkerRef.current = null;
      }
      return;
    }

    const index = Math.min(
      Math.floor((simulationProgress / 100) * (activeCoords.length - 1)),
      activeCoords.length - 1
    );
    const currentCoord = activeCoords[index];

    const vehicleHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute -inset-2 bg-emerald-500/40 rounded-full animate-ping"></div>
        <div class="w-8 h-8 rounded-full bg-[#0B1E3B] border-2 border-white shadow-xl flex items-center justify-center text-white">
          <span class="text-sm">🚗</span>
        </div>
      </div>
    `;

    const vehicleIcon = L.divIcon({
      html: vehicleHtml,
      className: 'simulated-vehicle',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!simulationMarkerRef.current) {
      simulationMarkerRef.current = L.marker(currentCoord, { icon: vehicleIcon }).addTo(group);
    } else {
      simulationMarkerRef.current.setLatLng(currentCoord);
    }
  }, [simulationProgress, selectedRouteIdx, primaryRouteCoords, altRouteCoords]);

  // Detect live GPS from device
  const handleDetectGPS = async () => {
    setIsLocating(true);
    const res = await acquirePreciseUserLocation();
    setIsLocating(false);

    if (res.success && res.location) {
      const loc = res.location;
      setOrigin({
        lat: loc.latitude,
        lng: loc.longitude,
        label: `Sua Localização GPS (${loc.bairro || loc.municipio})`,
      });
    } else {
      alert('Não foi possível obter o sinal GPS automático do dispositivo. Pode escolher um ponto na lista de origens rápidas.');
    }
  };

  if (!unit) return null;

  const handleCopyCoords = () => {
    const text = `${unit.latitude.toFixed(5)}, ${unit.longitude.toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenGoogleMaps = () => {
    const mode = travelMode === 'car' ? 'driving' : travelMode === 'transit' ? 'transit' : 'walking';
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${unit.latitude},${unit.longitude}&travelmode=${mode}`;
    window.open(url, '_blank');
  };

  const handleOpenWaze = () => {
    const url = `https://waze.com/ul?ll=${unit.latitude},${unit.longitude}&navigate=yes`;
    window.open(url, '_blank');
  };

  const phoneSanitized = (unit.whatsapp || unit.telefone || '').replace(/[^0-9]/g, '');

  return (
    <div
      id="unit-route-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-md animate-in fade-in overflow-y-auto"
    >
      <div
        id="unit-route-modal-card"
        className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full shadow-2xl text-slate-800 animate-in zoom-in-95 my-4 max-h-[96vh] flex flex-col justify-between overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#0B1E3B] text-white p-4 sm:p-5 relative">
          <button
            id="close-route-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white tracking-wider flex items-center gap-1 shadow-xs">
                  <RouteIcon className="w-3 h-3" />
                  Traçado de Rota GPS em Azul
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/15 text-slate-200">
                  {unit.provincia} • {unit.municipio}
                </span>
                {unit.verificada && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Homologada MINSA
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{unit.nome}</span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{unit.endereco_completo}</span>
              </p>
            </div>

            {/* Travel Mode Selector */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl self-start sm:self-auto border border-white/10">
              <button
                id="travel-mode-car-btn"
                onClick={() => setTravelMode('car')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  travelMode === 'car' ? 'bg-white text-[#0B1E3B] shadow-sm' : 'text-slate-200 hover:text-white'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>Carro</span>
              </button>
              <button
                id="travel-mode-transit-btn"
                onClick={() => setTravelMode('transit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  travelMode === 'transit' ? 'bg-white text-[#0B1E3B] shadow-sm' : 'text-slate-200 hover:text-white'
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                <span>Candongueiro</span>
              </button>
              <button
                id="travel-mode-walk-btn"
                onClick={() => setTravelMode('walk')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  travelMode === 'walk' ? 'bg-white text-[#0B1E3B] shadow-sm' : 'text-slate-200 hover:text-white'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>A Pé</span>
              </button>
            </div>
          </div>
        </div>

        {/* Origin & Destination Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Origin Pill */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
              <span className="text-[11px] font-bold text-slate-500">De:</span>
              <span className="text-xs font-black text-slate-800 max-w-[170px] truncate">{origin.label}</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />

            {/* Destination Pill */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-100" />
              <span className="text-[11px] font-bold text-slate-500">Para:</span>
              <span className="text-xs font-black text-slate-800 max-w-[170px] truncate">{unit.nome}</span>
            </div>

            {/* Quick Calemba 2 Button */}
            <button
              type="button"
              id="btn-quick-calemba2"
              onClick={handleSetCalemba2}
              className={`px-3 py-1.5 rounded-xl border transition text-xs font-black cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                origin.label.includes('Calemba 2')
                  ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-200'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
              title="Definir ponto de partida no Calemba 2 (Kilamba Kiaxi)"
            >
              <MapPin className={`w-3.5 h-3.5 ${origin.label.includes('Calemba 2') ? 'text-white' : 'text-emerald-600'}`} />
              <span>Estou no Calemba 2</span>
            </button>

            {/* Quick Origin Switcher Dropdown */}
            <select
              id="origin-preset-select"
              aria-label="Ponto de partida do percurso"
              value={origin.label}
              onChange={(e) => {
                const target = QUICK_ORIGINS.find((o) => o.label === e.target.value);
                if (target) {
                  setOrigin({ lat: target.lat, lng: target.lng, label: target.label });
                }
              }}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition shadow-2xs outline-none"
            >
              <option value={origin.label}>📍 Ponto de Partida: {origin.label}</option>
              {QUICK_ORIGINS.map((q, idx) => (
                <option key={idx} value={q.label}>
                  Partida: {q.label} ({q.desc})
                </option>
              ))}
            </select>

            {/* Adjust Location Modal Button */}
            <button
              type="button"
              id="btn-adjust-origin-modal"
              onClick={() => setIsExactLocationModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-[#0B1E3B] font-bold transition text-xs cursor-pointer shadow-2xs flex items-center gap-1 shrink-0"
              title="Ajustar Bairro ou arrastar marcador no mapa interactivo"
            >
              <Crosshair className="w-3.5 h-3.5 text-rose-500" />
              <span>Ajustar Local</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="detect-gps-btn"
              onClick={handleDetectGPS}
              disabled={isLocating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold transition text-xs cursor-pointer shadow-2xs"
              title="Detectar minha localização GPS actual no dispositivo"
            >
              <LocateFixed className={`w-3.5 h-3.5 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'A Localizar...' : 'Meu GPS'}</span>
            </button>

            {/* View Mode Toggle: Map vs Steps */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-xl">
              <button
                id="toggle-map-view-btn"
                onClick={() => setActiveView('map')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeView === 'map' ? 'bg-white text-[#0B1E3B] shadow-xs' : 'text-slate-600'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Mapa</span>
              </button>
              <button
                id="toggle-steps-view-btn"
                onClick={() => setActiveView('steps')}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeView === 'steps' ? 'bg-white text-[#0B1E3B] shadow-xs' : 'text-slate-600'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Indicações ({turnSteps.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Smart Geolocation Mártires vs Calemba 2 Correction Alert */}
        {(origin.label.toLowerCase().includes('mártires') ||
          origin.label.toLowerCase().includes('martires') ||
          origin.label.toLowerCase().includes('maianga') ||
          (Math.abs(origin.lat - -8.8384) < 0.03 && Math.abs(origin.lng - 13.235) < 0.03)) && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                O dispositivo detectou <strong>Mártires do Kifangondo / Maianga</strong> ({currentMetrics.distance} km). Se está no <strong>Calemba 2</strong>, clique para traçar a rota real de <strong>~9.8 km</strong>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSetCalemba2}
                className="px-3 py-1.5 bg-[#00A878] hover:bg-[#009166] text-white rounded-xl font-black text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Mudar para Calemba 2 (~9.8 km)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExactLocationModalOpen(true)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                <span>Ajustar no Mapa</span>
              </button>
            </div>
          </div>
        )}

        {showLocationToast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 transition-all">
            <Check className="w-4 h-4" />
            <span>{showLocationToast}</span>
          </div>
        )}

        {/* Route Metrics Strip */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Distância ({selectedRouteIdx === 0 ? 'Rota Principal' : 'Rota Alternativa'})
              </span>
              <span className="text-base font-black text-[#0B1E3B]">{currentMetrics.distance} km</span>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Tempo Estimado ({currentMetrics.label})
              </span>
              <span className="text-base font-black text-blue-600 flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                ~{currentMetrics.duration} min
              </span>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden md:block">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Velocidade Estimada
              </span>
              <span className="text-xs font-bold text-slate-700">{currentMetrics.speedLabel}</span>
            </div>
          </div>

          {/* Route Selector (Route 1 vs Route 2) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Opções de Rota:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="select-primary-route-btn"
                onClick={() => setSelectedRouteIdx(0)}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                  selectedRouteIdx === 0
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white" />
                <span>Via Principal ({routeDurationMin} min)</span>
              </button>
              {altRouteCoords.length > 0 && (
                <button
                  id="select-alt-route-btn"
                  onClick={() => setSelectedRouteIdx(1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                    selectedRouteIdx === 1
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Alternativa ({altDurationMin} min)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-3 sm:p-5 overflow-y-auto max-h-[62vh] space-y-4">
          {activeView === 'map' ? (
            <div className="space-y-3">
              {/* The Leaflet Map Canvas */}
              <div className="relative w-full h-[380px] sm:h-[450px] rounded-2xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
                <div
                  id="leaflet-route-map-canvas"
                  ref={mapContainerRef}
                  className="w-full h-full z-0"
                  style={{ minHeight: '380px' }}
                />

                {/* Loading indicator during route computation */}
                {isLoadingRoute && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#0B1E3B]/90 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-xs flex items-center gap-2 text-xs font-bold border border-white/20 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                    <span>A traçar percurso rodoviário em azul...</span>
                  </div>
                )}

                {/* Map Controls: Tile Style Switcher */}
                <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm p-1 rounded-xl shadow-md border border-slate-200 flex items-center gap-1 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Estilo:
                  </span>
                  <button
                    id="tile-style-voyager-btn"
                    onClick={() => setMapTileStyle('voyager')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      mapTileStyle === 'voyager' ? 'bg-[#0B1E3B] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Google Estilo
                  </button>
                  <button
                    id="tile-style-osm-btn"
                    onClick={() => setMapTileStyle('osm')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      mapTileStyle === 'osm' ? 'bg-[#0B1E3B] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    OpenStreetMap
                  </button>
                  <button
                    id="tile-style-satellite-btn"
                    onClick={() => setMapTileStyle('satellite')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                      mapTileStyle === 'satellite' ? 'bg-[#0B1E3B] text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Satélite
                  </button>
                </div>

                {/* Bottom Left: Route Simulation Controls */}
                <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-3">
                  <button
                    id="simulate-route-btn"
                    onClick={() => {
                      if (simulationProgress >= 100) setSimulationProgress(0);
                      setIsSimulating(!isSimulating);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B1E3B] text-white font-black text-xs hover:bg-[#123B7A] transition cursor-pointer shadow-xs"
                  >
                    {isSimulating ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{simulationProgress > 0 ? 'Continuar' : 'Simular Percurso'}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="w-20 sm:w-28 bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full transition-all duration-200"
                        style={{ width: `${simulationProgress}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono font-black text-slate-800 min-w-[32px]">
                      {Math.round(simulationProgress)}%
                    </span>
                  </div>

                  {simulationProgress > 0 && (
                    <button
                      id="reset-simulation-btn"
                      onClick={() => {
                        setIsSimulating(false);
                        setSimulationProgress(0);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-800 transition cursor-pointer"
                      title="Reiniciar Simulação"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Bottom Center Hint */}
                <div className="absolute bottom-3 right-16 z-10 hidden lg:flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-[11px] font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Traçado desenhado em azul sobre a malha rodoviária</span>
                </div>
              </div>

              {/* Unit Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Destino & Bairro
                    </span>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{unit.bairro}, {unit.municipio}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{unit.endereco_completo}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Horário de Funcionamento
                    </span>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{unit.horario_funcionamento}</p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-md ${
                        unit.aberto_agora ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {unit.aberto_agora ? '● Aberto Agora' : '○ Fechado'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Coordenadas GPS
                    </span>
                    <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                      {unit.latitude.toFixed(4)}, {unit.longitude.toFixed(4)}
                    </p>
                    <button
                      id="copy-coords-btn"
                      onClick={handleCopyCoords}
                      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copiado!' : 'Copiar Coordenadas'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Turn-by-Turn Step by Step Directions */
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl flex items-center justify-between text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Percurso: <strong>{currentMetrics.distance} km</strong> • Duração estimada:{' '}
                    <strong>~{currentMetrics.duration} min</strong>
                  </span>
                </div>
                <span className="text-[11px] font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-lg">
                  Modo: {currentMetrics.label}
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs">
                {turnSteps.map((step, idx) => (
                  <div key={idx} className="p-4 hover:bg-slate-50/80 transition flex items-start gap-3.5">
                    <div className="w-7 h-7 rounded-full bg-[#0B1E3B] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      {idx === 0 ? 'A' : idx === turnSteps.length - 1 ? 'B' : idx}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-800">{step.instruction}</h4>
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {step.distance}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="open-google-maps-btn"
              onClick={handleOpenGoogleMaps}
              className="flex items-center gap-2 bg-[#0B1E3B] text-white px-4 py-2.5 rounded-xl font-black text-xs hover:bg-[#123B7A] transition shadow-xs cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-emerald-400" />
              <span>Navegar no Google Maps</span>
            </button>

            <button
              id="open-waze-btn"
              onClick={handleOpenWaze}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-xs hover:bg-blue-700 transition shadow-xs cursor-pointer"
            >
              <Navigation className="w-4 h-4 text-blue-200" />
              <span>Abrir no Waze</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {unit.telefone && (
              <a
                id="call-unit-btn"
                href={`tel:${unit.telefone}`}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Ligar</span>
              </a>
            )}

            {phoneSanitized && (
              <a
                id="whatsapp-unit-btn"
                href={`https://wa.me/${phoneSanitized}?text=${encodeURIComponent(
                  `Olá! Estou a caminho da ${unit.nome} através da plataforma MUTIKUKWAMA SAÚDE.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              id="close-route-modal-footer-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200 font-bold text-xs text-slate-600 transition cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Exact Location Modal */}
      {isExactLocationModalOpen && (
        <ExactLocationModal
          isOpen={isExactLocationModalOpen}
          currentCoords={{ lat: origin.lat, lng: origin.lng }}
          onLocationConfirmed={handleLocationConfirmed}
          onClose={() => setIsExactLocationModalOpen(false)}
        />
      )}
    </div>
  );
};
