import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Crosshair,
  Check,
  X,
  Navigation,
  Search,
  Sparkles,
  Info,
  ChevronRight,
  Compass,
} from 'lucide-react';
import L from 'leaflet';
import {
  GeocodedAddress,
  saveUserGpsLocation,
  acquirePreciseUserLocation,
  reverseGeocodeCoordinates,
  resolveAngolaOfflineGIS,
  ANGOLA_COMMON_LOCATIONS,
} from '../../services/geoService';
import { PROVINCES_ANGOLA, MUNICIPALITIES_LUANDA } from '../../services/mockData';

interface ExactLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: GeocodedAddress | null;
  onLocationConfirmed: (location: GeocodedAddress) => void;
}

export const ExactLocationModal: React.FC<ExactLocationModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onLocationConfirmed,
}) => {
  const [selectedProvince, setSelectedProvince] = useState<string>(
    currentLocation?.provincia || 'Luanda'
  );
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>(
    currentLocation?.municipio || 'Viana'
  );
  const [selectedBairro, setSelectedBairro] = useState<string>(
    currentLocation?.bairro || 'Vila Sede'
  );

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation?.latitude || -8.9038,
    lng: currentLocation?.longitude || 13.3732,
  });

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [detectionFeedback, setDetectionFeedback] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Leaflet Map Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Filtered preset locations
  const filteredPresets = ANGOLA_COMMON_LOCATIONS.filter((loc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.nome.toLowerCase().includes(q) ||
      loc.municipio.toLowerCase().includes(q) ||
      loc.ref.toLowerCase().includes(q)
    );
  });

  // Sync coords from selected preset
  const handleSelectPreset = async (preset: (typeof ANGOLA_COMMON_LOCATIONS)[0]) => {
    setSelectedProvince(preset.provincia);
    setSelectedMunicipality(preset.municipio);
    setSelectedBairro(preset.nome);
    setCoords({ lat: preset.lat, lng: preset.lng });
    setDetectionFeedback(`Localização definida: ${preset.nome}`);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([preset.lat, preset.lng], 15, { animate: true });
      if (markerRef.current) {
        markerRef.current.setLatLng([preset.lat, preset.lng]);
      }
    }
  };

  // Run hardware or network GPS detection
  const handleDetectHardwareGps = async () => {
    setIsDetectingGps(true);
    setDetectionFeedback('A contactar sensores GPS e triangulação de rede...');

    const res = await acquirePreciseUserLocation();
    setIsDetectingGps(false);

    if (res.success && res.location) {
      const loc = res.location;
      setSelectedProvince(loc.provincia);
      setSelectedMunicipality(loc.municipio);
      setSelectedBairro(loc.bairro);
      setCoords({ lat: loc.latitude, lng: loc.longitude });

      const typeLabel =
        res.sourceType === 'device_high_accuracy'
          ? 'Satélite GPS de Alta Precisão'
          : res.sourceType === 'device_network'
          ? 'Rede Celular / Wi-Fi'
          : 'Geolocalização IP';

      setDetectionFeedback(`✅ GPS Sincronizado via ${typeLabel}! Precisão: ~${loc.accuracy || 15}m`);

      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([loc.latitude, loc.longitude], 16, { animate: true });
        if (markerRef.current) {
          markerRef.current.setLatLng([loc.latitude, loc.longitude]);
        }
      }
    } else {
      setDetectionFeedback(
        '⚠️ Não foi possível obter o sinal GPS automático. Selecione o seu Bairro na lista abaixo ou clique no mapa.'
      );
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = coords.lat;
      const initialLng = coords.lng;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
        center: [initialLat, initialLng],
        zoom: 14,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Custom Pin Marker
      const pinHtml = `
        <div class="relative flex flex-col items-center group -mt-2">
          <div class="mb-1 bg-[#123B7A] text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md border border-white/20 whitespace-nowrap">
            Sua Posição Exata
          </div>
          <div class="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white ring-4 ring-emerald-400/30 animate-pulse">
            <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'custom-exact-marker',
        iconSize: [120, 50],
        iconAnchor: [60, 48],
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);

      // Marker drag event
      marker.on('dragend', async () => {
        const pos = marker.getLatLng();
        const newLat = parseFloat(pos.lat.toFixed(6));
        const newLng = parseFloat(pos.lng.toFixed(6));
        setCoords({ lat: newLat, lng: newLng });

        const resolved = resolveAngolaOfflineGIS(newLat, newLng);
        setSelectedProvince(resolved.provincia);
        setSelectedMunicipality(resolved.municipio);
        setSelectedBairro(resolved.bairro);
        setDetectionFeedback(`Ponto fixado: ${resolved.bairro}, ${resolved.municipio}`);
      });

      // Map click event
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(6));
        const newLng = parseFloat(e.latlng.lng.toFixed(6));
        setCoords({ lat: newLat, lng: newLng });
        marker.setLatLng([newLat, newLng]);

        const resolved = resolveAngolaOfflineGIS(newLat, newLng);
        setSelectedProvince(resolved.provincia);
        setSelectedMunicipality(resolved.municipio);
        setSelectedBairro(resolved.bairro);
        setDetectionFeedback(`Posição ajustada no mapa: ${resolved.bairro}, ${resolved.municipio}`);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Clean up map when modal unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const offlineGeo = resolveAngolaOfflineGIS(coords.lat, coords.lng);
    const finalLocation: GeocodedAddress = {
      provincia: selectedProvince || offlineGeo.provincia,
      municipio: selectedMunicipality || offlineGeo.municipio,
      bairro: selectedBairro || offlineGeo.bairro,
      rua: offlineGeo.rua || `Zona Urbana de ${selectedMunicipality}`,
      displayName: `${selectedBairro || offlineGeo.bairro}, ${selectedMunicipality || offlineGeo.municipio}, ${
        selectedProvince || offlineGeo.provincia
      }`,
      latitude: coords.lat,
      longitude: coords.lng,
      accuracy: 10,
      source: 'angola_gis_offline',
      timestamp: new Date().toISOString(),
    };

    saveUserGpsLocation(finalLocation);
    onLocationConfirmed(finalLocation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-[#123B7A] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#00A878] border border-white/10">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Definir Localização Exata</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00A878] text-white uppercase tracking-wider">
                  GPS do Utente
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Garanta que as distâncias até às farmácias e hospitais calculam a partir do seu bairro real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* Quick Hardware GPS trigger button */}
          <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-black uppercase text-[#123B7A] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#00A878]" />
                Captura Automática pelo Dispositivo
              </span>
              <p className="text-xs text-slate-600">
                Se estiver no telemóvel ou tiver GPS ativado, tente detectar as coordenadas automaticamente.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDetectHardwareGps}
              disabled={isDetectingGps}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-sm cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Crosshair className={`w-4 h-4 ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'A Detectar...' : 'Detectar Meu GPS'}</span>
            </button>
          </div>

          {detectionFeedback && (
            <div className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 text-[#123B7A] border border-slate-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00A878] shrink-0" />
              <span>{detectionFeedback}</span>
            </div>
          )}

          {/* Interactive Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Toque no Mapa ou Arraste o Marcador para a sua rua:</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            </div>

            <div
              ref={mapContainerRef}
              className="w-full h-52 sm:h-60 rounded-2xl border border-slate-300 shadow-inner overflow-hidden z-10"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 italic">
              💡 Pode aproximar (zoom) e clicar directamente no seu quarteirão ou bairro para precisão de 10 metros.
            </p>
          </div>

          {/* Quick Select Preset Bairros in Angola */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#00A878]" />
                <span>Ou Selecione o seu Bairro / Município Rápido:</span>
              </label>
              <span className="text-[11px] text-slate-500">{filteredPresets.length} zonas disponíveis</span>
            </div>

            {/* Quick Search */}
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome (ex: Calemba 2, Viana, Zango, Palanca, Cacuaco, Talatona...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#123B7A] outline-none"
              />
            </div>

            {/* Popular Shortcut Chips including Calemba 2 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2">
              <span className="text-[11px] font-bold text-slate-500 shrink-0">Mais procurados:</span>
              <button
                type="button"
                onClick={() =>
                  handleSelectPreset({
                    nome: 'Calemba 2 (Via Expressa)',
                    municipio: 'Kilamba Kiaxi',
                    provincia: 'Luanda',
                    lat: -8.9050,
                    lng: 13.2850,
                    ref: 'Via Expressa / Estrada do Calemba 2',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-300 text-xs font-black shrink-0 transition flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>📍 Calemba 2</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSelectPreset({
                    nome: 'Viana - Vila Sede (Centro)',
                    municipio: 'Viana',
                    provincia: 'Luanda',
                    lat: -8.9038,
                    lng: 13.3732,
                    ref: 'Estrada de Catete',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold shrink-0 transition cursor-pointer"
              >
                <span>Viana Vila</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSelectPreset({
                    nome: 'Kilamba Kiaxi - Palanca',
                    municipio: 'Kilamba Kiaxi',
                    provincia: 'Luanda',
                    lat: -8.8680,
                    lng: 13.2550,
                    ref: 'Unidade Operativa / Palanca',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold shrink-0 transition cursor-pointer"
              >
                <span>Palanca</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleSelectPreset({
                    nome: 'Talatona - Belas Shopping / Centro',
                    municipio: 'Talatona',
                    provincia: 'Luanda',
                    lat: -8.9192,
                    lng: 13.1895,
                    ref: 'Via AL15 / Centro Financeiro',
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold shrink-0 transition cursor-pointer"
              >
                <span>Talatona</span>
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50/50">
              {filteredPresets.map((preset, idx) => {
                const isSelected =
                  Math.abs(coords.lat - preset.lat) < 0.005 && Math.abs(coords.lng - preset.lng) < 0.005;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200 text-[#123B7A]'
                        : 'bg-white border-slate-200/80 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="font-bold truncate">{preset.nome}</div>
                    <div className="text-[10px] text-slate-500 truncate">{preset.ref}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-[#123B7A]">Localização Selecionada: </span>
            <span>
              {selectedBairro}, {selectedMunicipality} ({selectedProvince})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-[#123B7A] hover:bg-[#0d2a59] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#00A878]" />
              <span>Confirmar Localização Exata</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
