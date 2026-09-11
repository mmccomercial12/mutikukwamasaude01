import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Flame,
  Star,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Sparkles,
  Phone,
  MessageCircle,
  Camera,
  Search,
  Pill,
  Stethoscope,
  Microscope,
  ExternalLink,
} from 'lucide-react';
import { HealthUnit } from '../../types';
import { supabaseData } from '../../services/supabase';

interface MostSearchedUnitsCarouselProps {
  onSelectUnit: (unit: HealthUnit) => void;
  onOpenRouteModal?: (unit: HealthUnit) => void;
  userLocation?: { lat: number; lng: number } | null;
  gpsActive?: boolean;
  selectedProvince?: string;
  selectedMunicipality?: string;
  onQuickSearch?: (term: string) => void;
}

export const MostSearchedUnitsCarousel: React.FC<MostSearchedUnitsCarouselProps> = ({
  onSelectUnit,
  onOpenRouteModal,
  userLocation,
  gpsActive = false,
  selectedProvince = 'all',
  selectedMunicipality = 'all',
  onQuickSearch,
}) => {
  // Fetch units ranked by relevance (Plano Avançado > Médio > Básico, ratings and views)
  const { units, stats } = useMemo(() => {
    return supabaseData.getMostSearchedUnits({
      province: selectedProvince,
      municipality: selectedMunicipality,
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
      includeDepots: false,
    });
  }, [selectedProvince, selectedMunicipality, userLocation]);

  // Current Slide Index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [cardsPerView, setCardsPerView] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive Cards Per View Detection
  useEffect(() => {
    const updateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCardsPerView(1);
      } else if (width < 1024) {
        setCardsPerView(2);
      } else {
        setCardsPerView(3);
      }
    };

    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  const maxIndex = Math.max(0, units.length - cardsPerView);

  // Reset index when units or cards per view changes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(0);
    }
  }, [maxIndex, currentIndex]);

  // Autoplay timer
  useEffect(() => {
    if (!isAutoplay || isHovered || units.length <= cardsPerView) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4500);

    return () => clearInterval(interval);
  }, [isAutoplay, isHovered, maxIndex, units.length, cardsPerView]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  const handleWhatsApp = (unit: HealthUnit) => {
    const phone = unit.whatsapp || unit.telefone;
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '244923000000';
    const msg = `Olá! Encontrei a sua unidade de saúde "${unit.nome}" no portal MUTIKUKWAMA SAÚDE. Gostaria de consultar informações sobre medicamentos e serviços disponíveis.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Popular search suggestions to encourage immediate patient search
  const popularSearches = [
    { label: 'Paracetamol 500mg', icon: Pill, type: 'med' },
    { label: 'Amoxicilina', icon: Pill, type: 'med' },
    { label: 'Coartem (Malária)', icon: Pill, type: 'med' },
    { label: 'Consulta de Pediatria', icon: Stethoscope, type: 'serv' },
    { label: 'Medicina Geral', icon: Stethoscope, type: 'serv' },
    { label: 'Cardiologia', icon: Stethoscope, type: 'serv' },
    { label: 'Hemograma Completo', icon: Microscope, type: 'exam' },
    { label: 'Ecografia Obstétrica', icon: Microscope, type: 'exam' },
    { label: 'Ibuprofeno', icon: Pill, type: 'med' },
  ];

  if (units.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center my-6">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-black text-[#123B7A] text-lg uppercase">Nenhuma unidade encontrada</h3>
        <p className="text-slate-500 text-sm mt-1">Ajuste os filtros de província ou município para visualizar as unidades mais procuradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 my-2">
      {/* ========================================================================= */}
      {/* SEARCH CALLOUT & QUICK SEARCH CHIPS */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#123B7A]/5 via-[#00A878]/5 to-sky-50/60 border border-[#123B7A]/15 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#123B7A] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-[#123B7A] uppercase tracking-tight">
                  Pesquise um Medicamento, Consulta ou Exame
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#00A878]/15 text-[#00A878] text-[10px] font-black uppercase tracking-wider">
                  Em Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed max-w-2xl">
                Digite no campo de busca acima o nome do medicamento ou serviço para consultar o stock, comparar preços em Kwanzas e verificar a disponibilidade imediata nas unidades.
              </p>
            </div>
          </div>

          {/* Quick Suggestions Chips */}
          {onQuickSearch && (
            <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Sugestões Frequentes:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                {popularSearches.slice(0, 5).map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => onQuickSearch(s.label)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-[#00A878] text-slate-700 hover:text-white border border-slate-200 hover:border-[#00A878] text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer group active:scale-95"
                    >
                      <Icon className="w-3 h-3 text-[#00A878] group-hover:text-white transition-colors" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAROUSEL HEADER WITH CONTROLS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#123B7A] uppercase tracking-tight">
                Unidades de Saúde Mais Procuradas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Ordem de Relevância
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Ordenadas por plano prioritário oficial, verificação MINSA e procura em Angola ({units.length} estabelecimentos em destaque)
            </p>
          </div>
        </div>

        {/* Navigation & Autoplay Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Autoplay Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoplay((prev) => !prev)}
            className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isAutoplay
                ? 'bg-[#E8F5F1] text-[#00A878] border-[#00A878]/30 hover:bg-[#d5eee5]'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title={isAutoplay ? 'Pausar passagem automática' : 'Iniciar passagem automática'}
          >
            {isAutoplay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[11px] hidden sm:inline">{isAutoplay ? 'Automático' : 'Pausado'}</span>
          </button>

          {/* Indicator text */}
          <span className="text-xs font-bold text-slate-400 px-1">
            {currentIndex + 1} / {maxIndex + 1}
          </span>

          {/* Prev Button */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={units.length <= cardsPerView}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            title="Unidades anteriores"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Next Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={units.length <= cardsPerView}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            title="Próximas unidades"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CAROUSEL SLIDER TRACK */}
      {/* ========================================================================= */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative overflow-hidden rounded-3xl"
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
          }}
        >
          {units.map((unit, index) => {
            const isAvancado = unit.plano_tipo === 'avancado' && unit.plano_status === 'ativo';
            const isMedio = unit.plano_tipo === 'medio' && unit.plano_status === 'ativo';

            // Plan Badge info
            let planBadge = {
              label: 'Plano Básico',
              color: 'bg-slate-100 text-slate-700 border-slate-200',
            };
            if (isAvancado) {
              planBadge = {
                label: 'Plano Avançado ⭐',
                color: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-2xs',
              };
            } else if (isMedio) {
              planBadge = {
                label: 'Plano Médio ✨',
                color: 'bg-sky-100 text-sky-800 border-sky-300',
              };
            }

            // Typology label
            const typeLabels: Record<string, string> = {
              farmacia: 'Farmácia',
              clinica: 'Clínica Médica',
              hospital: 'Hospital Geral',
              centro_medico: 'Centro Médico',
              veterinaria: 'Clínica Veterinária',
              consultorio: 'Consultório',
              laboratorio: 'Laboratório',
            };
            const typeLabel = typeLabels[unit.tipo] || 'Unidade de Saúde';

            // Rank visual styling
            const rank = index + 1;
            const isTop1 = rank === 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={unit.id}
                className="shrink-0 p-2"
                style={{ width: `${100 / cardsPerView}%` }}
              >
                <div className={`bg-white border rounded-3xl overflow-hidden h-full flex flex-col justify-between transition-all duration-300 group hover:-translate-y-1 hover:shadow-lg ${
                  isAvancado
                    ? 'border-amber-300/80 ring-2 ring-amber-200/50 shadow-sm'
                    : isMedio
                    ? 'border-sky-200 shadow-xs'
                    : 'border-slate-200 shadow-xs'
                }`}>
                  {/* Top Image: Banner or Cover */}
                  <div className="relative h-36 w-full overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={
                        unit.banner_url ||
                        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={unit.nome}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Rank Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm backdrop-blur-xs ${
                          isTop1
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-white font-black'
                            : isTop3
                            ? 'bg-rose-500 text-white font-black'
                            : 'bg-slate-900/80 text-white'
                        }`}
                      >
                        <Flame className="w-3 h-3 fill-current" />
                        <span>#{rank} Relevância</span>
                      </span>
                    </div>

                    {/* Plan & MINSA Badges Top Right */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${planBadge.color}`}>
                        {planBadge.label}
                      </span>
                      {unit.verificada && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs backdrop-blur-xs">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          MINSA
                        </span>
                      )}
                    </div>

                    {/* Floating Logo Badge overlapping banner */}
                    <div className="absolute -bottom-4 left-4 z-10">
                      <div className="w-14 h-14 rounded-2xl bg-white p-1 shadow-md border border-slate-200 overflow-hidden">
                        <img
                          src={
                            unit.logo_url ||
                            'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200'
                          }
                          alt={unit.nome}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      </div>
                    </div>

                    {/* Status badge bottom right */}
                    <div className="absolute bottom-2 right-3">
                      {unit.aberto_agora ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          Aberto Agora
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-white font-bold text-[9px] uppercase tracking-wider">
                          {unit.horario_funcionamento || 'Horário Comercial'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 pt-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#00A878]">
                          {typeLabel}
                        </span>

                        {/* Distance if GPS active */}
                        {unit.distancia_km !== undefined && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{unit.distancia_km} km</span>
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => onSelectUnit(unit)}
                        className="text-base font-black text-[#123B7A] uppercase leading-tight line-clamp-1 hover:text-[#00A878] transition-colors cursor-pointer"
                        title={unit.nome}
                      >
                        {unit.nome}
                      </h3>

                      {unit.descricao && (
                        <p className="text-xs text-slate-500 font-medium mt-1 line-clamp-2 leading-relaxed">
                          {unit.descricao}
                        </p>
                      )}

                      {/* Address info */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-[#00A878] shrink-0 mt-0.5" />
                        <span className="truncate">
                          {unit.bairro ? `${unit.bairro}, ` : ''}{unit.municipio} ({unit.provincia})
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectUnit(unit)}
                          className="w-full py-2 px-2.5 rounded-xl bg-[#123B7A] hover:bg-[#0d2a59] text-white font-black text-xs uppercase tracking-wider transition-colors text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <span>Ver Catálogo</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleWhatsApp(unit)}
                          className="w-full py-2 px-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider transition-colors text-center cursor-pointer shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                          title="Falar no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>

                      {onOpenRouteModal && unit.latitude && unit.longitude && (
                        <button
                          type="button"
                          onClick={() => onOpenRouteModal(unit)}
                          className="w-full py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-[#123B7A] text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3 text-[#00A878]" />
                          <span>Como Chegar (Calcular Rota GPS)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 pt-1">
        {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all cursor-pointer ${
              currentIndex === idx
                ? 'w-7 bg-[#123B7A]'
                : 'w-2 bg-slate-300 hover:bg-slate-400'
            }`}
            title={`Ir para o slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
