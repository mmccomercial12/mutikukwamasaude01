import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  MapPin,
  Filter,
  ShoppingCart,
  Phone,
  ShieldCheck,
  Star,
  Clock,
  Sparkles,
  AlertCircle,
  Building2,
  Stethoscope,
  Pill,
  Microscope,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  Navigation,
  Crosshair,
  Compass,
  Flame,
  ArrowDown,
  ArrowRight,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { PROVINCES_ANGOLA, MUNICIPALITIES_LUANDA } from '../../services/mockData';
import {
  reverseGeocodeCoordinates,
  saveUserGpsLocation,
  getSavedUserGpsLocation,
  resolveAngolaOfflineGIS,
  acquirePreciseUserLocation,
  GeocodedAddress,
} from '../../services/geoService';
import { supabaseData } from '../../services/supabase';
import { ProductItem, HealthUnit, ServiceItem, ExamItem } from '../../types';
import { MedicalSearchResultCard } from '../common/MedicalSearchResultCard';
import { UnitRouteMapModal } from '../units/UnitRouteMapModal';
import { ExactLocationModal } from './ExactLocationModal';
import { MostSearchedTabView } from './MostSearchedTabView';
import { MostSearchedUnitsCarousel } from './MostSearchedUnitsCarousel';

// Haversine distance formula (in km)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

interface SearchAndResultsViewProps {
  initialQuery?: string;
  initialProvince?: string;
  initialMunicipality?: string;
  initialBairro?: string;
  initialCategory?: 'all' | 'medicamento' | 'servico' | 'exame' | 'unidades' | 'mais_procurados';
  onSelectUnit: (unit: HealthUnit) => void;
  onOpenPrescriptionAI: () => void;
  onOpenCart?: () => void;
}

export const SearchAndResultsView: React.FC<SearchAndResultsViewProps> = ({
  initialQuery = '',
  initialProvince = 'all',
  initialMunicipality = 'all',
  initialBairro = 'all',
  initialCategory = 'all',
  onSelectUnit,
  onOpenPrescriptionAI,
  onOpenCart,
}) => {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const { success, warning, info } = useToast();

  const [query, setQuery] = useState(initialQuery);
  const [selectedProvince, setSelectedProvince] = useState(initialProvince);
  const [selectedMunicipality, setSelectedMunicipality] = useState(initialMunicipality);
  const [selectedBairro, setSelectedBairro] = useState(initialBairro);
  const [detectedAddress, setDetectedAddress] = useState<GeocodedAddress | null>(() => getSavedUserGpsLocation());
  const [activeCategory, setActiveCategory] = useState<'all' | 'medicamento' | 'servico' | 'exame' | 'unidades' | 'mais_procurados'>(initialCategory);
  const [selectedUnitType, setSelectedUnitType] = useState<
    'all' | 'farmacia' | 'clinica' | 'hospital' | 'centro_medico' | 'veterinaria' | 'consultorio' | 'laboratorio'
  >('all');
  const [inStockOnly, setInStockOnly] = useState(true);
  const [sortBy, setSortBy] = useState<'relevance' | 'price_low' | 'price_high' | 'distance'>('relevance');

  // Count of items in active plans for the Mais Procurados tab
  const mostSearchedTotalCount = useMemo(() => {
    try {
      const res = supabaseData.getMostSearchedCatalog({
        province: selectedProvince,
        municipality: selectedMunicipality,
      });
      return res.stats.total;
    } catch {
      return 0;
    }
  }, [selectedProvince, selectedMunicipality]);

  // Count of units with active plans for the Unidades Mais Procuradas tab
  const mostSearchedUnitsCount = useMemo(() => {
    try {
      const res = supabaseData.getMostSearchedUnits({
        province: selectedProvince,
        municipality: selectedMunicipality,
      });
      return res.stats.total;
    } catch {
      return 0;
    }
  }, [selectedProvince, selectedMunicipality]);

  // Search Input Ref & Focus State for guiding the user
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Check whether the user has typed an active search query
  const hasUserSearched = query.trim().length > 0;

  // Dynamic search placeholder depending on active category
  const searchPlaceholder = useMemo(() => {
    if (activeCategory === 'medicamento') return 'Pesquisar medicamento (ex: Paracetamol, Coartem, Amoxicilina, Ibuprofeno...)';
    if (activeCategory === 'servico') return 'Pesquisar consulta ou especialidade (ex: Pediatria, Cardiologia, Geral...)';
    if (activeCategory === 'exame') return 'Pesquisar exame clínico ou laboratorial (ex: Hemograma, Ecografia, Raio-X...)';
    return 'Ex: Paracetamol, Consulta de Pediatria, Hemograma, Ecografia...';
  }, [activeCategory]);

  // User GPS Location & State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = getSavedUserGpsLocation();
    if (saved) return { lat: saved.latitude, lng: saved.longitude };
    return null;
  });
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [isExactLocationModalOpen, setIsExactLocationModalOpen] = useState(false);
  const [gpsActive, setGpsActive] = useState(() => !!getSavedUserGpsLocation());
  const [userGpsAccuracy, setUserGpsAccuracy] = useState<number | null>(() => {
    const saved = getSavedUserGpsLocation();
    return saved?.accuracy ?? null;
  });

  // Modal for Turn-by-Turn Route / Map Navigation
  const [selectedUnitForRoute, setSelectedUnitForRoute] = useState<HealthUnit | null>(null);

  // Synchronize GPS location from local persistence and cross-component updates
  React.useEffect(() => {
    const saved = getSavedUserGpsLocation();
    if (saved) {
      setUserLocation({ lat: saved.latitude, lng: saved.longitude });
      setUserGpsAccuracy(saved.accuracy ?? null);
      setGpsActive(true);
      setDetectedAddress(saved);
      if (initialProvince === 'all') {
        setSelectedProvince(saved.provincia);
        setSelectedMunicipality(saved.municipio);
      }
    }

    const handleLocationUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<GeocodedAddress>;
      const geo = customEvent.detail;
      if (geo) {
        setUserLocation({ lat: geo.latitude, lng: geo.longitude });
        setUserGpsAccuracy(geo.accuracy ?? null);
        setGpsActive(true);
        setDetectedAddress(geo);
        setSelectedProvince(geo.provincia);
        setSelectedMunicipality(geo.municipio);
        setSortBy('distance');
      }
    };

    window.addEventListener('mutikukwama:location-updated', handleLocationUpdate);
    return () => {
      window.removeEventListener('mutikukwama:location-updated', handleLocationUpdate);
    };
  }, [initialProvince]);

  // Saved items persistence (Guardar / Bookmark)
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('mutikukwama_saved_items');
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
    return new Set<string>();
  });

  const handleToggleSave = (id: string, isSaved: boolean) => {
    setSavedItemIds((prev) => {
      const next = new Set(prev);
      if (isSaved) {
        next.add(id);
        success('Item guardado com sucesso nos seus favoritos!');
      } else {
        next.delete(id);
        success('Item removido dos favoritos.');
      }
      try {
        localStorage.setItem('mutikukwama_saved_items', JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Utente GPS Activation: captures real device coords with multi-pass precision and fallback
  const handleActivateGPS = async () => {
    setIsLocatingUser(true);
    const res = await acquirePreciseUserLocation();
    setIsLocatingUser(false);

    if (res.success && res.location) {
      const geo = res.location;
      setUserLocation({ lat: geo.latitude, lng: geo.longitude });
      setUserGpsAccuracy(geo.accuracy || 15);
      setGpsActive(true);
      setSortBy('distance');
      setDetectedAddress(geo);
      if (geo.provincia) setSelectedProvince(geo.provincia);
      if (geo.municipio) setSelectedMunicipality(geo.municipio);

      const precisionLabel = geo.accuracy ? ` (~${geo.accuracy}m)` : '';
      success(
        `GPS Sincronizado com sucesso! Bairro: ${geo.bairro}, Município: ${geo.municipio}${precisionLabel}. Resultados atualizados.`
      );
      setTimeout(() => searchInputRef.current?.focus(), 300);
    } else {
      // If browser GPS is denied, unavailable or timed out, open the interactive exact location selector
      setIsExactLocationModalOpen(true);
      warning(
        'Não foi possível aceder ao GPS automático do dispositivo. Selecione o seu Bairro ou clique no mapa para posicionamento exato.'
      );
    }
  };

  const handleLocationConfirmed = (geo: GeocodedAddress) => {
    setUserLocation({ lat: geo.latitude, lng: geo.longitude });
    setUserGpsAccuracy(geo.accuracy || 10);
    setGpsActive(true);
    setSortBy('distance');
    setDetectedAddress(geo);
    if (geo.provincia) setSelectedProvince(geo.provincia);
    if (geo.municipio) setSelectedMunicipality(geo.municipio);
    success(`Localização Exata confirmada: ${geo.bairro}, ${geo.municipio}. Resultados atualizados.`);
    setTimeout(() => searchInputRef.current?.focus(), 300);
  };

  const handleQuickSetCalemba2 = () => {
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
    setUserLocation({ lat: -8.9050, lng: 13.2850 });
    setUserGpsAccuracy(10);
    setDetectedAddress(calembaLoc);
    setSelectedProvince('Luanda');
    setSelectedMunicipality('Kilamba Kiaxi');
    setSelectedBairro('Calemba 2');
    setGpsActive(true);
    setSortBy('distance');
    success('Localização definida para Calemba 2 (Kilamba Kiaxi)! Distâncias atualizadas.');
  };

  const searchResults = useMemo(() => {
    let res = supabaseData.searchCatalog({
      query,
      category: activeCategory === 'unidades' ? 'all' : activeCategory,
      province: selectedProvince,
      municipality: selectedMunicipality,
      inStockOnly,
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
      sortBy,
      isB2BSearch: false, // Public search strictly excludes wholesale depots
    });

    if (selectedBairro && selectedBairro !== 'all') {
      const bLower = selectedBairro.toLowerCase().trim();
      const filteredProducts = res.products.filter(
        (p) => p.unidade_bairro && p.unidade_bairro.toLowerCase().includes(bLower)
      );
      const filteredServices = res.services.filter(
        (s) => s.unidade_bairro && s.unidade_bairro.toLowerCase().includes(bLower)
      );
      const filteredExams = res.exams.filter(
        (e) => e.unidade_bairro && e.unidade_bairro.toLowerCase().includes(bLower)
      );
      res = {
        ...res,
        products: filteredProducts,
        services: filteredServices,
        exams: filteredExams,
        totalCount: filteredProducts.length,
      };
    }

    return res;
  }, [query, selectedProvince, selectedMunicipality, selectedBairro, activeCategory, inStockOnly, userLocation, sortBy]);

  const baseHealthUnits = useMemo(() => {
    let units = supabaseData.getUnits(false);
    if (selectedProvince !== 'all') {
      units = units.filter((u) => u.provincia === selectedProvince);
    }
    if (selectedMunicipality !== 'all') {
      units = units.filter((u) => u.municipio === selectedMunicipality);
    }
    if (selectedBairro && selectedBairro !== 'all') {
      const bLower = selectedBairro.toLowerCase().trim();
      units = units.filter((u) => u.bairro && u.bairro.toLowerCase().includes(bLower));
    }
    if (query) {
      const q = query.toLowerCase();
      units = units.filter((u) => u.nome.toLowerCase().includes(q) || u.bairro.toLowerCase().includes(q));
    }
    return units;
  }, [selectedProvince, selectedMunicipality, selectedBairro, query]);

  const unitTypeCounts = useMemo(() => {
    return {
      all: baseHealthUnits.length,
      farmacia: baseHealthUnits.filter((u) => u.tipo === 'farmacia').length,
      clinica: baseHealthUnits.filter((u) => u.tipo === 'clinica').length,
      hospital: baseHealthUnits.filter((u) => u.tipo === 'hospital').length,
      centro_medico: baseHealthUnits.filter((u) => u.tipo === 'centro_medico').length,
      veterinaria: baseHealthUnits.filter((u) => u.tipo === 'veterinaria').length,
      consultorio: baseHealthUnits.filter((u) => u.tipo === 'consultorio').length,
      laboratorio: baseHealthUnits.filter((u) => u.tipo === 'laboratorio').length,
    };
  }, [baseHealthUnits]);

  const unitsList = useMemo(() => {
    let units = baseHealthUnits;
    if (selectedUnitType !== 'all') {
      units = units.filter((u) => u.tipo === selectedUnitType);
    }

    // Attach calculated distance for each unit
    const unitsWithDistance = units.map((u) => {
      let dist: number | undefined = undefined;
      if (userLocation && u.latitude && u.longitude) {
        dist = getDistanceKm(userLocation.lat, userLocation.lng, u.latitude, u.longitude);
      }
      return { ...u, calculatedDistance: dist };
    });

    if (sortBy === 'distance' && userLocation) {
      unitsWithDistance.sort((a, b) => (a.calculatedDistance ?? 9999) - (b.calculatedDistance ?? 9999));
    } else {
      // Prioritize units with Plano Avançado ativo (300) > Médio (200) > Básico (100)
      unitsWithDistance.sort((a, b) => {
        const getScore = (u: HealthUnit) => {
          if (u.plano_status === 'ativo') {
            if (u.plano_tipo === 'avancado') return 300;
            if (u.plano_tipo === 'medio') return 200;
            if (u.plano_tipo === 'basico') return 100;
          }
          return 0;
        };
        const scoreA = getScore(a);
        const scoreB = getScore(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (b.visualizacoes || 0) - (a.visualizacoes || 0);
      });
    }

    return unitsWithDistance;
  }, [selectedProvince, selectedMunicipality, query, userLocation, sortBy]);

  const handleAddToCart = (product: ProductItem) => {
    const unit = supabaseData.getUnitById(product.unidade_id);
    addItem({
      item_id: product.id,
      tipo_item: product.categoria,
      nome: product.nome,
      preco: product.preco,
      quantidade: 1,
      unidade_id: product.unidade_id,
      unidade_nome: unit?.nome || 'Farmácia',
    });
    success(`"${product.nome}" adicionado ao carrinho!`);
  };

  const handleItemWhatsApp = (item: { nome: string; preco: number }, unit: HealthUnit, type: string) => {
    const phone = unit.whatsapp || unit.telefone;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '244923000000';
    const formattedPrice = new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2 }).format(item.preco);
    const msg = `Olá! Encontrei o ${type.toLowerCase()} "${item.nome}" (AOA ${formattedPrice}) na unidade "${unit.nome}" através da plataforma MUTIKUKWAMA SAÚDE. Gostaria de confirmar disponibilidade e procedimento.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDirectOrder = (item: { id: string; nome: string; preco: number; categoria?: string }, unit: HealthUnit, type: string) => {
    const added = addItem({
      item_id: item.id,
      tipo_item: (item.categoria || type.toLowerCase()) as any,
      nome: item.nome,
      preco: item.preco,
      quantidade: 1,
      unidade_id: unit.id,
      unidade_nome: unit.nome,
    });
    if (added) {
      success(`"${item.nome}" adicionado! A abrir o carrinho para finalizar o pedido...`);
      if (onOpenCart) {
        onOpenCart();
      }
    }
  };

  const handleBookService = (serv: ServiceItem, unit?: HealthUnit) => {
    if (!unit) return;
    addItem({
      item_id: serv.id,
      tipo_item: 'servico',
      nome: serv.nome,
      preco: serv.preco,
      quantidade: 1,
      unidade_id: unit.id,
      unidade_nome: unit.nome,
    });
    success(`Consulta "${serv.nome}" marcada para agendamento!`);
  };

  const handleBookExam = (ex: ExamItem, unit?: HealthUnit) => {
    if (!unit) return;
    addItem({
      item_id: ex.id,
      tipo_item: 'exame',
      nome: ex.nome,
      preco: ex.preco,
      quantidade: 1,
      unidade_id: unit.id,
      unidade_nome: unit.nome,
    });
    success(`Exame "${ex.nome}" adicionado para agendamento!`);
  };

  return (
    <div className="bg-[#F8FAFC] text-[#1e293b] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search Header Banner */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8F5F1] text-[#00A878] text-[10px] font-black rounded-full uppercase tracking-widest mb-3 border border-[#00A878]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A878] animate-pulse"></span>
              Directório Oficial de Angola
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#123B7A] tracking-tight uppercase">
              Catálogo Nacional de Saúde & Farmácias
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
              Pesquise medicamentos, consultas médicas e exames laboratoriais em tempo real com disponibilidade de stock verificada em todas as províncias de Angola.
            </p>
          </div>

          {/* Guia do Utente: Indicativo de Pesquisa & Aviso de Ativação do GPS */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-blue-500/5 to-emerald-500/10 border border-slate-200/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#123B7A] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Compass className="w-5 h-5 text-[#00A878]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#123B7A]">
                      Como Encontrar Farmácias Perto de Si:
                    </span>
                    {!gpsActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-black uppercase flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        1º Ativar GPS Primeiro
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        GPS Ativo • Pronto
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {!gpsActive ? (
                      <>
                        <strong className="text-amber-800">Aviso importante:</strong> Ative primeiro o seu GPS para calcularmos a distância real (km) e indicar a farmácia mais próxima. Em seguida, digite o medicamento no campo abaixo.
                      </>
                    ) : (
                      <>
                        <strong className="text-emerald-700">✓ GPS Sincronizado:</strong> A plataforma está calibrada para o seu raio de proximidade. Digite agora o que procura no campo assinalado abaixo.
                      </>
                    )}
                  </p>
                </div>
              </div>

              {!gpsActive ? (
                <button
                  type="button"
                  id="btn-quick-activate-gps-notice"
                  onClick={handleActivateGPS}
                  disabled={isLocatingUser}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow cursor-pointer active:scale-95 shrink-0"
                >
                  <Crosshair className={`w-4 h-4 ${isLocatingUser ? 'animate-spin' : ''}`} />
                  <span>{isLocatingUser ? 'A Obter GPS...' : '📍 Ativar GPS Primeiro'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => searchInputRef.current?.focus()}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-[#123B7A] border border-slate-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                >
                  <span>Ir para Pesquisa</span>
                  <ArrowDown className="w-3.5 h-3.5 text-[#00A878]" />
                </button>
              )}
            </div>
          </div>

          {/* Search Inputs Bar */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
            {/* Query input with direct visual indicator */}
            <div className="sm:col-span-2 md:col-span-5 relative">
              {/* Indicativo Onde Pesquisar */}
              <div className="flex items-center justify-between mb-1.5 px-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#123B7A]">
                  <span className="w-2 h-2 rounded-full bg-[#00A878] animate-ping" />
                  <ArrowDown className="w-3.5 h-3.5 text-[#00A878] animate-bounce" />
                  <span>Onde Pesquisar: Digite aqui</span>
                </div>
                {!gpsActive ? (
                  <button
                    type="button"
                    onClick={handleActivateGPS}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                    title="Ativar GPS antes de pesquisar"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Ative o GPS primeiro</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>GPS pronto para pesquisar</span>
                  </span>
                )}
              </div>

              <div
                className={`relative flex items-center rounded-2xl px-4 py-3 transition-all ${
                  !gpsActive
                    ? 'bg-white border-2 border-[#00A878] ring-4 ring-[#00A878]/15 shadow-sm'
                    : 'bg-white border-2 border-emerald-400 ring-2 ring-emerald-100 shadow-sm'
                }`}
              >
                <Search className="w-5 h-5 text-[#00A878] mr-2.5 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-0.5 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Helpful Tooltip Reminder if GPS is inactive */}
              {!gpsActive && isSearchFocused && (
                <div className="absolute left-0 -bottom-9 z-20 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-medium shadow-lg flex items-center gap-2 border border-slate-800">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Dica: Ative o GPS no botão abaixo para ordenar da farmácia mais próxima à mais distante.</span>
                </div>
              )}
            </div>

            {/* Province */}
            <div className="md:col-span-2 relative flex flex-col justify-end">
              <div className="mb-1.5 px-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Província:
              </div>
              <div className="relative flex items-center bg-slate-50/80 hover:bg-slate-50 border border-slate-200 focus-within:border-[#123B7A] focus-within:bg-white rounded-2xl px-3.5 py-3 transition-all">
                <MapPin className="w-4 h-4 text-[#00A878] mr-1.5 shrink-0" />
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedMunicipality('all');
                    setSelectedBairro('all');
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-[#123B7A] focus:outline-none cursor-pointer truncate"
                >
                  <option value="all">Todas as Províncias</option>
                  {PROVINCES_ANGOLA.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Municipality (Luanda filter support) */}
            <div className="md:col-span-2 relative flex flex-col justify-end">
              <div className="mb-1.5 px-1 text-xs font-bold text-slate-500 uppercase tracking-wider">
                Município:
              </div>
              <div className="relative flex items-center bg-slate-50/80 hover:bg-slate-50 border border-slate-200 focus-within:border-[#123B7A] focus-within:bg-white rounded-2xl px-3.5 py-3 transition-all">
                <select
                  value={selectedMunicipality}
                  onChange={(e) => {
                    setSelectedMunicipality(e.target.value);
                    setSelectedBairro('all');
                  }}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-[#123B7A] focus:outline-none cursor-pointer disabled:opacity-50 truncate"
                  disabled={selectedProvince !== 'Luanda' && selectedProvince !== 'all'}
                >
                  <option value="all">
                    {selectedProvince === 'Luanda' ? 'Todos os Municípios' : 'Todos'}
                  </option>
                  {MUNICIPALITIES_LUANDA.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bairro / Zona Filter (Auto-populated by GPS or manual) */}
            <div className="sm:col-span-2 md:col-span-3 relative flex flex-col justify-end">
              <div className="mb-1.5 px-1 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Bairro / Zona:</span>
                {selectedBairro !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedBairro('all')}
                    className="text-[10px] text-red-600 hover:underline font-bold"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="relative flex items-center bg-slate-50/80 hover:bg-slate-50 border border-slate-200 focus-within:border-[#123B7A] focus-within:bg-white rounded-2xl px-3.5 py-3 transition-all">
                <Building2 className="w-4 h-4 text-[#00A878] mr-2 shrink-0" />
                <input
                  type="text"
                  value={selectedBairro === 'all' ? '' : selectedBairro}
                  onChange={(e) => setSelectedBairro(e.target.value ? e.target.value : 'all')}
                  placeholder={detectedAddress?.bairro ? `Ex: ${detectedAddress.bairro}` : 'Ex: Alvalade, Viana...'}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-[#123B7A] placeholder-slate-400 focus:outline-none"
                />
                {detectedAddress?.bairro && selectedBairro !== detectedAddress.bairro && (
                  <button
                    type="button"
                    onClick={() => setSelectedBairro(detectedAddress.bairro)}
                    title={`Usar bairro detectado pelo GPS (${detectedAddress.bairro})`}
                    className="text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded shrink-0 cursor-pointer ml-1"
                  >
                    Usar GPS
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Utente GPS Location Activation Bar with Aviso Ativar GPS Primeiro */}
          <div
            className={`mt-4 p-3.5 sm:p-4 rounded-2xl flex flex-col gap-3 transition-all ${
              !gpsActive
                ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-slate-50 border-2 border-amber-300/80 shadow-xs'
                : 'bg-gradient-to-r from-sky-50 via-emerald-50/40 to-slate-50 border border-sky-100/90 shadow-2xs'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    gpsActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-amber-500 text-white shadow-sm'
                  }`}
                >
                  <Navigation className={`w-5 h-5 ${isLocatingUser ? 'animate-spin' : ''}`} />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-[#123B7A] uppercase tracking-tight">
                      {!gpsActive
                        ? '⚠️ Aviso: Ative o GPS Primeiro (Localização Exata do Utente)'
                        : 'Localização Georreferenciada e Sincronizada'}
                    </span>
                    {gpsActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> GPS Sincronizado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider animate-pulse">
                        Ativação Recomendada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-snug">
                    {gpsActive && userLocation
                      ? `Coordenadas: ${userLocation.lat.toFixed(5)}, ${userLocation.lng.toFixed(5)} ${
                          userGpsAccuracy ? `(Precisão: ~${userGpsAccuracy}m)` : ''
                        } • Bairro, Município e Província identificados automaticamente.`
                      : 'Ative o botão GPS primeiro para detectar o seu Bairro, Município e Província automaticamente e obter a distância exata até à unidade mais próxima.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  id="btn-activate-user-gps"
                  onClick={handleActivateGPS}
                  disabled={isLocatingUser}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer ${
                    gpsActive
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                      : 'bg-[#00A878] hover:bg-[#008f66] text-white active:scale-95 shadow-md'
                  }`}
                >
                  <Crosshair className={`w-4 h-4 ${isLocatingUser ? 'animate-spin' : ''}`} />
                  <span>
                    {isLocatingUser
                      ? 'A Sincronizar GPS...'
                      : gpsActive
                      ? '📍 GPS Ativo (Recapturar)'
                      : '📍 Ativar GPS Automático'}
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-quick-calemba2-search"
                  onClick={handleQuickSetCalemba2}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border cursor-pointer shadow-2xs ${
                    detectedAddress?.bairro?.includes('Calemba 2')
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}
                  title="Definir diretamente a sua localização no Calemba 2"
                >
                  <MapPin className={`w-3.5 h-3.5 ${detectedAddress?.bairro?.includes('Calemba 2') ? 'text-white' : 'text-emerald-700'}`} />
                  <span>Estou no Calemba 2</span>
                </button>

                <button
                  type="button"
                  id="btn-open-exact-location-modal"
                  onClick={() => setIsExactLocationModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border border-slate-300 bg-white hover:bg-slate-100 text-[#123B7A] shadow-2xs cursor-pointer"
                  title="Ajustar Bairro, Município ou coordenadas exatas no mapa"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{gpsActive ? 'Ajustar Localização' : 'Definir Bairro / Mapa'}</span>
                </button>
              </div>
            </div>

            {/* If GPS is active: Display detected location breakdown & quick filter chips */}
            {gpsActive && (
              <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
                  <span className="font-bold text-[#123B7A]">📍 Localização Exata:</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-bold text-emerald-900 shadow-2xs">
                    Bairro: {detectedAddress?.bairro || (selectedBairro !== 'all' ? selectedBairro : 'Detectado')}
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-bold text-emerald-900 shadow-2xs">
                    Município: {selectedMunicipality !== 'all' ? selectedMunicipality : detectedAddress?.municipio || 'Luanda'}
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-bold text-emerald-900 shadow-2xs">
                    Província: {selectedProvince !== 'all' ? selectedProvince : detectedAddress?.provincia || 'Luanda'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsExactLocationModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer bg-white hover:bg-slate-100 text-[#123B7A] border border-slate-300 flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3 text-rose-500" />
                    <span>Mudar Localização Exata</span>
                  </button>
                  {detectedAddress?.bairro && (
                    <button
                      type="button"
                      onClick={() => setSelectedBairro(detectedAddress.bairro)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                        selectedBairro === detectedAddress.bairro
                          ? 'bg-[#123B7A] text-white shadow-xs'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {selectedBairro === detectedAddress.bairro ? '✓ No Bairro' : `Filtrar no Bairro (${detectedAddress.bairro})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedBairro('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                      selectedBairro === 'all' && selectedMunicipality !== 'all'
                        ? 'bg-[#123B7A] text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    Todo o Município
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBairro('all');
                      setSelectedMunicipality('all');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all cursor-pointer ${
                      selectedBairro === 'all' && selectedMunicipality === 'all'
                        ? 'bg-[#123B7A] text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                    }`}
                  >
                    Toda a Província
                  </button>
                </div>
              </div>
            )}

            {/* Smart notice if detected location is Mártires do Kifangondo */}
            {gpsActive &&
              (detectedAddress?.bairro?.toLowerCase().includes('mártires') ||
                detectedAddress?.bairro?.toLowerCase().includes('martires') ||
                detectedAddress?.bairro?.toLowerCase().includes('maianga')) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950 mt-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      O GPS detectou <strong>Mártires do Kifangondo / Maianga</strong>. Se está fisicamente no <strong>Calemba 2</strong>, clique para corrigir as distâncias:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickSetCalemba2}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Corrigir para Calemba 2</span>
                  </button>
                </div>
              )}
          </div>

          {/* Quick AI Prescriptions Banner */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 font-medium">
              <div className="w-6 h-6 rounded-full bg-[#E8F5F1] text-[#00A878] flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>Tem uma receita médica em papel ou no telemóvel? Encontre tudo em segundos.</span>
            </div>
            <button
              onClick={onOpenPrescriptionAI}
              className="px-4 py-2 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs transition-all shadow-sm flex items-center gap-2 active:scale-95 uppercase tracking-wider"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
              <span>Digitalizar Receita com IA</span>
            </button>
          </div>
        </div>

        {/* Category Filter Tabs & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/80 border border-slate-200/60 rounded-2xl">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                activeCategory === 'all'
                  ? 'bg-[#123B7A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#123B7A] hover:bg-white/80'
              }`}
            >
              Todos {hasUserSearched ? `(${searchResults.totalCount})` : ''}
            </button>

            <button
              onClick={() => {
                setActiveCategory('medicamento');
                if (!hasUserSearched) searchInputRef.current?.focus();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                activeCategory === 'medicamento'
                  ? 'bg-[#00A878] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#00A878] hover:bg-white/80'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medicamentos {hasUserSearched ? `(${searchResults.products.length})` : ''}</span>
            </button>

            <button
              onClick={() => {
                setActiveCategory('servico');
                if (!hasUserSearched) searchInputRef.current?.focus();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                activeCategory === 'servico'
                  ? 'bg-[#123B7A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#123B7A] hover:bg-white/80'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Consultas {hasUserSearched ? `(${searchResults.services.length})` : ''}</span>
            </button>

            <button
              onClick={() => {
                setActiveCategory('exame');
                if (!hasUserSearched) searchInputRef.current?.focus();
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                activeCategory === 'exame'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-purple-700 hover:bg-white/80'
              }`}
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>Exames {hasUserSearched ? `(${searchResults.exams.length})` : ''}</span>
            </button>

            <button
              onClick={() => setActiveCategory('unidades')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                activeCategory === 'unidades'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-amber-700 hover:bg-white/80'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Estabelecimentos de Saúde ({baseHealthUnits.length})</span>
            </button>

            <button
              onClick={() => setActiveCategory('mais_procurados')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                activeCategory === 'mais_procurados'
                  ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 text-white shadow-sm ring-2 ring-amber-300'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>🔥 UNIDADES MAIS PROCURADAS ({mostSearchedUnitsCount})</span>
            </button>
          </div>

          {/* Sort and Filters */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#00A878] focus:ring-0 cursor-pointer w-4 h-4"
              />
              <span className="text-slate-700 font-bold">Apenas em Stock</span>
            </label>

            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-sm">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 font-medium">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[#123B7A] font-black focus:outline-none cursor-pointer"
              >
                <option value="relevance">Relevância / ⭐ Premium</option>
                <option value="price_low">Menor Preço (AOA)</option>
                <option value="price_high">Maior Preço (AOA)</option>
                <option value="distance">Mais Próximo (KM)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter & Sync Status Indicator */}
        {(selectedProvince !== 'all' || selectedMunicipality !== 'all' || (selectedBairro && selectedBairro !== 'all') || gpsActive) && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-slate-100/90 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-700">
              <span className="font-bold text-[#123B7A] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#00A878]" />
                Filtro Geográfico:
              </span>
              {selectedBairro && selectedBairro !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-300 font-bold text-slate-800 shadow-2xs">
                  Bairro: {selectedBairro}
                  <button
                    type="button"
                    onClick={() => setSelectedBairro('all')}
                    className="text-slate-400 hover:text-red-600 ml-0.5 font-bold cursor-pointer"
                    title="Remover filtro de Bairro"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedMunicipality !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-300 font-bold text-slate-800 shadow-2xs">
                  Município: {selectedMunicipality}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMunicipality('all');
                      setSelectedBairro('all');
                    }}
                    className="text-slate-400 hover:text-red-600 ml-0.5 font-bold cursor-pointer"
                    title="Remover filtro de Município"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedProvince !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-slate-300 font-bold text-slate-800 shadow-2xs">
                  Província: {selectedProvince}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvince('all');
                      setSelectedMunicipality('all');
                      setSelectedBairro('all');
                    }}
                    className="text-slate-400 hover:text-red-600 ml-0.5 font-bold cursor-pointer"
                    title="Remover filtro de Província"
                  >
                    ×
                  </button>
                </span>
              )}
              {gpsActive && (
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-[11px] flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sincronizado com GPS
                </span>
              )}
            </div>

            {(selectedProvince !== 'all' || selectedMunicipality !== 'all' || (selectedBairro && selectedBairro !== 'all')) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProvince('all');
                  setSelectedMunicipality('all');
                  setSelectedBairro('all');
                }}
                className="text-[11px] text-slate-500 hover:text-red-600 font-bold underline cursor-pointer"
              >
                Limpar filtros de localização
              </button>
            )}
          </div>
        )}

        {/* Results Container */}
        {activeCategory === 'mais_procurados' ? (
          <MostSearchedTabView
            onSelectUnit={onSelectUnit}
            onAddToCart={handleAddToCart}
            onBookService={handleBookService}
            onBookExam={handleBookExam}
            onOpenRouteModal={(unit) => setSelectedUnitForRoute(unit)}
            userLocation={userLocation}
            gpsActive={gpsActive}
            onActivateGPS={handleActivateGPS}
            savedItemIds={savedItemIds}
            onToggleSave={handleToggleSave}
            selectedProvince={selectedProvince}
            selectedMunicipality={selectedMunicipality}
          />
        ) : activeCategory === 'unidades' ? (
          /* Units View with dedicated Health Establishment Filters */
          <div className="space-y-6">
            {/* Filter Bar for Health Unit Typologies */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-sm flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider px-2">Tipo:</span>
              <button
                type="button"
                onClick={() => setSelectedUnitType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedUnitType === 'all'
                    ? 'bg-[#123B7A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({unitTypeCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnitType('farmacia')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedUnitType === 'farmacia'
                    ? 'bg-[#00A878] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>Farmácias ({unitTypeCounts.farmacia})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnitType('clinica')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedUnitType === 'clinica'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Clínicas ({unitTypeCounts.clinica})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnitType('hospital')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedUnitType === 'hospital'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Hospitais ({unitTypeCounts.hospital})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnitType('centro_medico')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedUnitType === 'centro_medico'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Centros Médicos ({unitTypeCounts.centro_medico})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnitType('consultorio')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedUnitType === 'consultorio'
                    ? 'bg-blue-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Consultórios ({unitTypeCounts.consultorio})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnitType('laboratorio')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedUnitType === 'laboratorio'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Microscope className="w-3.5 h-3.5" />
                <span>Laboratórios ({unitTypeCounts.laboratorio})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnitType('veterinaria')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedUnitType === 'veterinaria'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>🐾</span>
                <span>Veterinárias ({unitTypeCounts.veterinaria})</span>
              </button>
            </div>

            {unitsList.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-black text-slate-700 text-lg uppercase mb-1">Nenhum estabelecimento encontrado</h3>
                <p className="text-slate-500 text-sm">Tente selecionar outro tipo de estabelecimento de saúde ou ajustar os filtros de localização.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unitsList.map((unit) => (
              <div
                key={unit.id}
                onClick={() => onSelectUnit(unit)}
                className="bg-white border border-slate-200/80 hover:border-[#123B7A]/40 rounded-3xl p-6 transition-all duration-200 cursor-pointer group shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <img
                      src={unit.logo_url || 'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200'}
                      alt={unit.nome}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-100 bg-slate-50 shadow-inner"
                    />
                    <div className="flex flex-col items-end gap-1">
                      {unit.selo_premium && (
                        <span className="px-2.5 py-1 rounded-full bg-[#E8F5F1] text-[#00A878] font-black text-[10px] uppercase tracking-wider flex items-center gap-1 border border-[#00A878]/20">
                          <Star className="w-3 h-3 fill-[#00A878] text-[#00A878]" /> Premium
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#123B7A] font-black text-[10px] uppercase tracking-wider border border-blue-100">
                        {unit.tipo}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-black text-[#123B7A] uppercase text-base leading-snug group-hover:text-[#00A878] transition-colors">
                    {unit.nome}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#00A878] shrink-0" />
                    <span>{unit.bairro}, {unit.municipio} ({unit.provincia})</span>
                  </div>

                  {/* Geolocation & Distance Info */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {unit.calculatedDistance !== undefined ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[#00A878] font-black text-[10px] flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-[#00A878]" />
                        ~{unit.calculatedDistance} km de si
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium text-[10px] flex items-center gap-1">
                        <Compass className="w-3 h-3 text-slate-400" />
                        GPS: {unit.latitude.toFixed(3)}, {unit.longitude.toFixed(3)}
                      </span>
                    )}

                    {unit.endereco_completo && (
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]" title={unit.endereco_completo}>
                        {unit.endereco_completo}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 font-medium mt-2.5 line-clamp-2 leading-relaxed">
                    {unit.descricao}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <span className="flex items-center gap-1 text-amber-500 font-black shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {unit.avaliacao} ({unit.total_avaliacoes})
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id={`btn-route-${unit.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUnitForRoute(unit);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#123B7A] font-black text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors border border-sky-100/80 cursor-pointer"
                      title="Ver rota e localização exata no mapa"
                    >
                      <Navigation className="w-3 h-3 text-[#00A878]" />
                      <span>Ver Rota / GPS</span>
                    </button>

                    <span className="text-[#123B7A] font-black uppercase text-[11px] group-hover:text-[#00A878] flex items-center gap-0.5 transition-colors shrink-0">
                      Catálogo →
                    </span>
                  </div>
                </div>
              </div>
                ))}
              </div>
            )}
          </div>
        ) : !hasUserSearched ? (
          /* Products and services only appear upon user search. In their place, a carousel of most searched units in order of relevance is displayed */
          <MostSearchedUnitsCarousel
            onSelectUnit={onSelectUnit}
            onOpenRouteModal={(unit) => setSelectedUnitForRoute(unit)}
            userLocation={userLocation}
            gpsActive={gpsActive}
            selectedProvince={selectedProvince}
            selectedMunicipality={selectedMunicipality}
            onQuickSearch={(term) => {
              setQuery(term);
              searchInputRef.current?.focus();
            }}
          />
        ) : (
          /* Products, Services, Exams View (Only displayed when user has typed a search query) */
          <div className="space-y-8">
            {/* Active Search Feedback Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Search className="w-4 h-4 text-[#00A878]" />
                <span>
                  Resultados da pesquisa para: <span className="text-[#123B7A] font-black underline">"{query}"</span>
                </span>
                <span className="text-slate-400 font-medium">({searchResults.totalCount} itens encontrados)</span>
              </div>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-[#00A878] hover:text-[#008f66] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors px-3 py-1.5 rounded-xl bg-[#E8F5F1] hover:bg-[#d5eee5]"
                title="Limpar pesquisa e regressar ao carrossel de unidades"
              >
                <span>Voltar ao Carrossel de Unidades</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Products Grid */}
            {(activeCategory === 'all' || activeCategory === 'medicamento') && searchResults.products.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-black uppercase tracking-wider text-[#123B7A] flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center">
                      <Pill className="w-4 h-4" />
                    </div>
                    <span>Medicamentos Disponíveis ({searchResults.products.length})</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {searchResults.products.map((prod) => {
                    const unit = supabaseData.getUnitById(prod.unidade_id);
                    return (
                      <MedicalSearchResultCard
                        key={prod.id}
                        id={prod.id}
                        badgeType="MEDICAMENTO"
                        title={prod.nome}
                        subtitle={
                          prod.nome_generico
                            ? `Genérico: ${prod.nome_generico} · ${prod.forma_farmaceutica || 'Pronta Entrega'}`
                            : prod.descricao || 'Medicamento · Pronta entrega nas farmácias parceiras.'
                        }
                        isAvailable={prod.quantidade_stock > 0}
                        statusLabel={prod.quantidade_stock > 0 ? 'DISPONÍVEL' : 'ESGOTADO'}
                        durationOrQuantityLabel="STOCK"
                        durationOrQuantityValue={`${prod.quantidade_stock} un`}
                        price={prod.preco}
                        unit={{
                          id: unit?.id || prod.unidade_id,
                          nome: unit?.nome || prod.unidade_nome || 'Farmácia Parceira',
                          tipo: unit?.tipo || 'farmacia',
                          bairro: unit?.bairro || prod.unidade_bairro || 'Luanda',
                          municipio: unit?.municipio || prod.unidade_municipio || 'Luanda',
                          provincia: unit?.provincia || 'Luanda',
                          latitude: unit?.latitude,
                          longitude: unit?.longitude,
                          telefone: unit?.telefone,
                          whatsapp: unit?.whatsapp,
                          selo_premium: unit?.selo_premium,
                        }}
                        distanceKm={prod.distancia_km}
                        userCoords={userLocation}
                        onActivateGPS={handleActivateGPS}
                        onViewLocation={() => unit && onSelectUnit(unit)}
                        onViewRoute={() => unit && setSelectedUnitForRoute(unit)}
                        onBookOrAdd={() => handleAddToCart(prod)}
                        bookActionLabel="Adicionar ao Carrinho"
                        onOrder={() => unit && handleDirectOrder(prod, unit, 'Medicamento')}
                        orderActionLabel="Fazer Pedido"
                        onWhatsApp={() => unit && handleItemWhatsApp(prod, unit, 'Medicamento')}
                        onToggleSave={handleToggleSave}
                        isSavedInitial={savedItemIds.has(prod.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Services Grid */}
            {(activeCategory === 'all' || activeCategory === 'servico') && searchResults.services.length > 0 && (
              <div className="pt-2">
                <h2 className="text-base font-black uppercase tracking-wider text-[#123B7A] mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-50 text-[#123B7A] flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <span>Consultas e Procedimentos Clínicos ({searchResults.services.length})</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {searchResults.services.map((serv) => {
                    const unit = supabaseData.getUnitById(serv.unidade_id);
                    return (
                      <MedicalSearchResultCard
                        key={serv.id}
                        id={serv.id}
                        badgeType="SERVIÇO"
                        title={serv.nome}
                        subtitle={serv.descricao || 'Consulta · Marcação disponível.'}
                        isAvailable={serv.disponivel}
                        statusLabel={serv.disponivel ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
                        durationOrQuantityLabel="DURAÇÃO"
                        durationOrQuantityValue={serv.duracao_minutos ? `${serv.duracao_minutos} min` : '— min'}
                        price={serv.preco}
                        unit={{
                          id: unit?.id || serv.unidade_id,
                          nome: unit?.nome || serv.unidade_nome || 'Clínica Parceira',
                          tipo: unit?.tipo || 'clinica',
                          bairro: unit?.bairro || 'Vila Sede',
                          municipio: unit?.municipio || 'Viana',
                          provincia: unit?.provincia || 'Luanda',
                          latitude: unit?.latitude,
                          longitude: unit?.longitude,
                          telefone: unit?.telefone,
                          whatsapp: unit?.whatsapp,
                          selo_premium: unit?.selo_premium,
                        }}
                        userCoords={userLocation}
                        onActivateGPS={handleActivateGPS}
                        onViewLocation={() => unit && onSelectUnit(unit)}
                        onViewRoute={() => unit && setSelectedUnitForRoute(unit)}
                        onBookOrAdd={() => handleBookService(serv, unit)}
                        bookActionLabel="Marcar Consulta"
                        onOrder={() => unit && handleDirectOrder(serv, unit, 'Serviço')}
                        orderActionLabel="Fazer Pedido"
                        onWhatsApp={() => unit && handleItemWhatsApp(serv, unit, 'Serviço')}
                        onToggleSave={handleToggleSave}
                        isSavedInitial={savedItemIds.has(serv.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Exams Grid */}
            {(activeCategory === 'all' || activeCategory === 'exame') && searchResults.exams.length > 0 && (
              <div className="pt-2">
                <h2 className="text-base font-black uppercase tracking-wider text-[#123B7A] mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Microscope className="w-4 h-4" />
                  </div>
                  <span>Exames Laboratoriais e Diagnóstico ({searchResults.exams.length})</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {searchResults.exams.map((ex) => {
                    const unit = supabaseData.getUnitById(ex.unidade_id);
                    return (
                      <MedicalSearchResultCard
                        key={ex.id}
                        id={ex.id}
                        badgeType="EXAME"
                        title={ex.nome}
                        subtitle={
                          ex.preparacao_necessaria
                            ? `${ex.descricao || 'Exame de diagnóstico'} · Nota: ${ex.preparacao_necessaria}`
                            : ex.descricao || 'Exame Laboratorial · Marcação disponível.'
                        }
                        isAvailable={ex.disponivel}
                        statusLabel={ex.disponivel ? 'DISPONÍVEL' : 'INDISPONÍVEL'}
                        durationOrQuantityLabel="RESULTADO"
                        durationOrQuantityValue={ex.tempo_resultado_horas ? `${ex.tempo_resultado_horas}h` : '— min'}
                        price={ex.preco}
                        unit={{
                          id: unit?.id || ex.unidade_id,
                          nome: unit?.nome || ex.unidade_nome || 'Laboratório de Análises',
                          tipo: unit?.tipo || 'laboratorio',
                          bairro: unit?.bairro || 'Ingombota',
                          municipio: unit?.municipio || 'Luanda',
                          provincia: unit?.provincia || 'Luanda',
                          latitude: unit?.latitude,
                          longitude: unit?.longitude,
                          telefone: unit?.telefone,
                          whatsapp: unit?.whatsapp,
                          selo_premium: unit?.selo_premium,
                        }}
                        userCoords={userLocation}
                        onActivateGPS={handleActivateGPS}
                        onViewLocation={() => unit && onSelectUnit(unit)}
                        onViewRoute={() => unit && setSelectedUnitForRoute(unit)}
                        onBookOrAdd={() => handleBookExam(ex, unit)}
                        bookActionLabel="Marcar Exame"
                        onOrder={() => unit && handleDirectOrder(ex, unit, 'Exame')}
                        orderActionLabel="Fazer Pedido"
                        onWhatsApp={() => unit && handleItemWhatsApp(ex, unit, 'Exame')}
                        onToggleSave={handleToggleSave}
                        isSavedInitial={savedItemIds.has(ex.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {searchResults.totalCount === 0 && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-slate-200/60">
                  <Search className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-[#123B7A] uppercase tracking-tight">Nenhum resultado encontrado</h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5 leading-relaxed">
                  Não encontramos produtos ou serviços correspondentes a "{query}" na província seleccionada. Experimente buscar pelo princípio activo genérico ou limpar os filtros.
                </p>
                <button
                  onClick={() => {
                    setQuery('');
                  }}
                  className="mt-5 px-6 py-2.5 rounded-full bg-[#123B7A] hover:bg-[#0d2a59] text-white font-black text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                >
                  Voltar ao Carrossel de Unidades
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Turn-by-Turn Route / Map Navigation Modal */}
      {selectedUnitForRoute && (
        <UnitRouteMapModal
          unit={selectedUnitForRoute}
          onClose={() => setSelectedUnitForRoute(null)}
          userCoords={gpsActive && userLocation ? userLocation : undefined}
        />
      )}

      {/* Exact Location Adjustment / Picker Modal */}
      <ExactLocationModal
        isOpen={isExactLocationModalOpen}
        onClose={() => setIsExactLocationModalOpen(false)}
        currentLocation={detectedAddress}
        onLocationConfirmed={handleLocationConfirmed}
      />
    </div>
  );
};
