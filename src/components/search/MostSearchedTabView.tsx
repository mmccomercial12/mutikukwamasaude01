import React, { useState, useMemo } from 'react';
import {
  Flame,
  Search,
  Building2,
  SlidersHorizontal,
  Navigation,
  Pill,
  Stethoscope,
  Microscope,
  Package,
  Crown,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShoppingCart,
  Bookmark,
  Sparkles,
  Info,
  Layers,
  Phone,
  Star,
  ArrowRight,
  Clock,
  Award,
  Camera,
} from 'lucide-react';
import { supabaseData } from '../../services/supabase';
import { HealthUnit, MostSearchedItem, PlanType } from '../../types';
import { formatAOA } from '../common/MedicalSearchResultCard';

interface MostSearchedTabViewProps {
  onSelectUnit: (unit: HealthUnit) => void;
  onAddToCart: (item: any, type: string, unit: HealthUnit) => void;
  onBookService?: (service: any, unit?: HealthUnit) => void;
  onBookExam?: (exam: any, unit?: HealthUnit) => void;
  onOpenRouteModal: (unit: HealthUnit) => void;
  userLocation: { lat: number; lng: number } | null;
  gpsActive: boolean;
  onActivateGPS: () => void;
  savedItemIds: Set<string>;
  onToggleSave: (id: string, isSaved: boolean) => void;
  selectedProvince?: string;
  selectedMunicipality?: string;
}

export const MostSearchedTabView: React.FC<MostSearchedTabViewProps> = ({
  onSelectUnit,
  onAddToCart,
  onBookService,
  onBookExam,
  onOpenRouteModal,
  userLocation,
  gpsActive,
  onActivateGPS,
  savedItemIds,
  onToggleSave,
  selectedProvince = 'all',
  selectedMunicipality = 'all',
}) => {
  // Main view toggle: 'units' (Unidades Mais Procuradas) vs 'items' (Produtos & Serviços)
  const [viewMode, setViewMode] = useState<'units' | 'items'>('units');
  const [internalQuery, setInternalQuery] = useState('');
  const [unitTypeFilter, setUnitTypeFilter] = useState<
    'all' | 'farmacia' | 'clinica' | 'hospital' | 'centro_medico' | 'veterinaria' | 'consultorio' | 'laboratorio'
  >('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'medicamento' | 'servico' | 'exame'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'avancado' | 'medio' | 'basico'>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price_low' | 'price_high' | 'distance' | 'rating'>('popular');

  // Fetch Most Searched Units with strict priority for Plano Avançado Ativo
  const unitsData = useMemo(() => {
    return supabaseData.getMostSearchedUnits({
      query: internalQuery,
      province: selectedProvince,
      municipality: selectedMunicipality,
      unitTypeFilter,
      planFilter,
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
      sortBy: sortBy === 'rating' ? 'rating' : sortBy === 'distance' ? 'distance' : 'popular',
    });
  }, [
    internalQuery,
    selectedProvince,
    selectedMunicipality,
    unitTypeFilter,
    planFilter,
    userLocation,
    sortBy,
  ]);

  // Fetch Catalog Items dynamically through active plan quotas (Avançado: 100, Médio: 50, Básico: 10)
  const catalogData = useMemo(() => {
    return supabaseData.getMostSearchedCatalog({
      query: internalQuery,
      province: selectedProvince,
      municipality: selectedMunicipality,
      unitTypeFilter,
      itemType: itemTypeFilter,
      planFilter,
      userLat: userLocation?.lat,
      userLng: userLocation?.lng,
      sortBy: sortBy === 'rating' ? 'popular' : sortBy,
    });
  }, [
    internalQuery,
    selectedProvince,
    selectedMunicipality,
    unitTypeFilter,
    itemTypeFilter,
    planFilter,
    userLocation,
    sortBy,
  ]);

  const { units, stats: unitStats } = unitsData;
  const { items, stats: itemStats } = catalogData;

  const handleUnitWhatsApp = (unit: HealthUnit) => {
    const phone = unit.whatsapp || unit.telefone || '+244923000111';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const planName = unit.plano_tipo.toUpperCase();
    const text = encodeURIComponent(
      `Olá ${unit.nome}! Encontrei a vossa unidade na lista das Unidades Mais Procuradas no MUTIKUKWAMA (Plano ${planName} Ativo). Gostaria de mais informações sobre serviços, exames ou medicamentos disponíveis.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handleWhatsAppInquiry = (item: MostSearchedItem) => {
    const phone = item.unidade.whatsapp || item.unidade.telefone || '+244923000111';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Olá ${item.unidade.nome}! Vi o item "${item.nome}" no catálogo dos Mais Procurados do MUTIKUKWAMA (Plano ${item.plano_tipo.toUpperCase()}). Gostaria de confirmar a disponibilidade e o valor de ${formatAOA(item.preco)}.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Active Plan Rules */}
      <div className="bg-gradient-to-br from-[#123B7A] via-[#1a4a94] to-[#0c2854] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-400/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 text-xs font-black rounded-full uppercase tracking-wider mb-3 border border-amber-400/30">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Unidades Mais Procuradas • Planos Ativos</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-white">
            Unidades de Saúde Mais Procuradas
          </h2>
          <p className="text-slate-200 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
            Classificação oficial das unidades por pesquisas orgânicas e relevância no MUTIKUKWAMA SAÚDE. 
            <strong className="text-amber-300 ml-1 font-black">
              Unidades com Plano Avançado ativo aparecem no topo em primeiro lugar
            </strong>, seguidas pelos planos Médio e Básico com cotas de catálogo ampliadas.
          </p>

          {/* Quota Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <div className="bg-amber-500/20 border border-amber-400/40 rounded-2xl p-3 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-black uppercase">
                <Crown className="w-3.5 h-3.5" />
                <span>Plano Avançado</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">Top #1 Prioridade</div>
              <p className="text-[10px] text-amber-100 font-bold">1º Lugar + Cota 100 itens</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-sky-300 text-[11px] font-black uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plano Médio</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">50 Itens</div>
              <p className="text-[10px] text-slate-300 font-medium">Cota standard por unidade</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-black uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Plano Básico</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">10 Itens</div>
              <p className="text-[10px] text-slate-300 font-medium">Cota inicial por unidade</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-rose-300 text-[11px] font-black uppercase">
                <Package className="w-3.5 h-3.5" />
                <span>Depósitos B2B</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white mt-0.5">Grossistas</div>
              <p className="text-[10px] text-slate-300 font-medium">Apenas planos ativos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mode Switcher: Unidades vs Produtos */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('units')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              viewMode === 'units'
                ? 'bg-[#123B7A] text-white shadow-md'
                : 'text-slate-600 hover:text-[#123B7A] hover:bg-white/80'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>🏥 Unidades Mais Procuradas ({units.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('items')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              viewMode === 'items'
                ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md'
                : 'text-slate-600 hover:text-rose-700 hover:bg-white/80'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>💊 Produtos & Serviços ({items.length})</span>
          </button>
        </div>

        <div className="text-[11px] font-bold text-slate-500 px-3 flex items-center gap-1.5">
          <Crown className="w-3.5 h-3.5 text-amber-500" />
          <span>Plano Avançado ordenado em 1º lugar</span>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Search Input & Sorter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative flex items-center bg-slate-50 border border-slate-200 focus-within:border-[#123B7A] focus-within:bg-white rounded-xl px-3.5 py-2.5 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={internalQuery}
              onChange={(e) => setInternalQuery(e.target.value)}
              placeholder={
                viewMode === 'units'
                  ? 'Filtrar unidades (ex: Farmácia Luanda Saúde, Sagrada Esperança, Maianga, Talatona...)'
                  : 'Filtrar nos produtos mais procurados (ex: Paracetamol, Coartem, Ultrassom, Vacina...)'
              }
              className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            {internalQuery && (
              <button
                type="button"
                onClick={() => setInternalQuery('')}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 px-2 py-0.5 rounded-full bg-slate-200 cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="md:col-span-4 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 shrink-0">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-transparent text-xs font-black text-[#123B7A] focus:outline-none cursor-pointer"
            >
              <option value="popular">🔥 Mais Procurados (Avançado em 1º)</option>
              <option value="distance">📍 Mais Próximo de Mim (GPS)</option>
              <option value="rating">⭐ Melhor Avaliação</option>
              {viewMode === 'items' && (
                <>
                  <option value="price_low">💰 Menor Preço (AOA)</option>
                  <option value="price_high">💎 Maior Preço (AOA)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Multi-tier Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Establishment type selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tipo de Unidade:</span>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                unitTypeFilter === 'all'
                  ? 'bg-[#123B7A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({viewMode === 'units' ? unitStats.total : itemStats.total})
            </button>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('farmacia')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                unitTypeFilter === 'farmacia'
                  ? 'bg-[#00A878] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Farmácias ({viewMode === 'units' ? unitStats.farmaciaCount : itemStats.farmaciaCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('clinica')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                unitTypeFilter === 'clinica'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Clínicas ({viewMode === 'units' ? unitStats.clinicaCount : itemStats.clinicaCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('hospital')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                unitTypeFilter === 'hospital'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Hospitais ({viewMode === 'units' ? unitStats.hospitalCount : itemStats.hospitalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('centro_medico')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                unitTypeFilter === 'centro_medico'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Centros Médicos ({viewMode === 'units' ? unitStats.centroMedicoCount : itemStats.centroMedicoCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('consultorio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                unitTypeFilter === 'consultorio'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Consultórios ({viewMode === 'units' ? unitStats.consultorioCount : itemStats.consultorioCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('laboratorio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                unitTypeFilter === 'laboratorio'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>Laboratórios ({viewMode === 'units' ? unitStats.laboratorioCount : itemStats.laboratorioCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setUnitTypeFilter('veterinaria')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                unitTypeFilter === 'veterinaria'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>🐾</span>
              <span>Veterinárias ({viewMode === 'units' ? unitStats.veterinariaCount : itemStats.veterinariaCount})</span>
            </button>
          </div>

          {/* Plan Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Plano:</span>
            <button
              type="button"
              onClick={() => setPlanFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                planFilter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setPlanFilter('avancado')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                planFilter === 'avancado'
                  ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Crown className="w-3 h-3 text-amber-500" />
              <span>🏆 Avançado ({viewMode === 'units' ? unitStats.avancadoCount : itemStats.avancadoCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanFilter('medio')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                planFilter === 'medio'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Médio ({viewMode === 'units' ? unitStats.medioCount : itemStats.medioCount})
            </button>
            <button
              type="button"
              onClick={() => setPlanFilter('basico')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                planFilter === 'basico'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Básico ({viewMode === 'units' ? unitStats.basicoCount : itemStats.basicoCount})
            </button>
          </div>

          {/* Item Category (only in items view) */}
          {viewMode === 'items' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Categoria:</span>
              <button
                type="button"
                onClick={() => setItemTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  itemTypeFilter === 'all'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setItemTypeFilter('medicamento')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  itemTypeFilter === 'medicamento'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Pill className="w-3 h-3" /> Medicamentos
              </button>
              <button
                type="button"
                onClick={() => setItemTypeFilter('servico')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  itemTypeFilter === 'servico'
                    ? 'bg-sky-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Stethoscope className="w-3 h-3" /> Consultas
              </button>
              <button
                type="button"
                onClick={() => setItemTypeFilter('exame')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  itemTypeFilter === 'exame'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Microscope className="w-3 h-3" /> Exames
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
          {viewMode === 'units' ? (
            <span>
              A exibir <strong className="text-[#123B7A] font-black">{units.length}</strong> unidades de saúde mais procuradas (com planos ativos)
            </span>
          ) : (
            <span>
              A exibir <strong className="text-[#123B7A] font-black">{items.length}</strong> itens mais procurados em unidades com planos ativos
            </span>
          )}
          {selectedProvince !== 'all' && <span> • Província de {selectedProvince}</span>}
          {selectedMunicipality !== 'all' && <span> ({selectedMunicipality})</span>}
        </div>
        {!gpsActive && (
          <button
            type="button"
            onClick={onActivateGPS}
            className="text-[11px] font-black text-[#123B7A] hover:text-[#00A878] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Navigation className="w-3.5 h-3.5 text-[#00A878]" />
            Ativar GPS para ordenar por proximidade
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: UNIDADES MAIS PROCURADAS (Avançado em 1º Lugar)        */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'units' && (
        <>
          {units.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {units.map((unit, index) => {
                const isAvancado = unit.plano_tipo === 'avancado';
                const isMedio = unit.plano_tipo === 'medio';

                const planBadgeColor = isAvancado
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400 shadow-xs'
                  : isMedio
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                const planBadgeLabel = isAvancado
                  ? '🏆 Plano Avançado Ativo • Top Prioridade'
                  : isMedio
                  ? '⭐ Plano Médio Ativo'
                  : '🛡️ Plano Básico Ativo';

                const unitTypeBadge =
                  unit.tipo === 'farmacia'
                    ? '🏥 Farmácia'
                    : unit.tipo === 'clinica'
                    ? '🏥 Clínica'
                    : unit.tipo === 'hospital'
                    ? '🏨 Hospital'
                    : unit.tipo === 'centro_medico'
                    ? '🏢 Centro Médico'
                    : unit.tipo === 'veterinaria'
                    ? '🐾 Veterinária'
                    : unit.tipo === 'consultorio'
                    ? '🩺 Consultório'
                    : unit.tipo === 'laboratorio'
                    ? '🔬 Laboratório'
                    : '🏥 Unidade de Saúde';

                return (
                  <div
                    key={unit.id}
                    className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between overflow-hidden relative group hover:shadow-lg ${
                      isAvancado
                        ? 'border-amber-400/80 shadow-md ring-2 ring-amber-300/40'
                        : 'border-slate-200/90 shadow-xs hover:border-slate-300'
                    }`}
                  >
                    {/* Top Ribbon for Plano Avançado */}
                    {isAvancado && (
                      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-900 py-1 px-4 text-[10px] font-black uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 fill-slate-900" />
                          <span>Destaque Oficial • Plano Avançado</span>
                        </span>
                        <span className="font-extrabold bg-white/40 px-2 py-0.2 rounded-full">
                          Cota 100 Itens
                        </span>
                      </div>
                    )}

                    {/* Cover Banner / Foto da Fachada se fornecida pela unidade */}
                    {unit.banner_url && (
                      <div className="h-32 w-full relative overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={unit.banner_url}
                          alt={unit.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <span className="absolute bottom-2 right-2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-xs flex items-center gap-1">
                          <Camera className="w-2.5 h-2.5" />
                          <span>Foto Oficial</span>
                        </span>
                      </div>
                    )}

                    {/* Card Content */}
                    <div className={`p-5 pb-3 ${unit.banner_url ? 'pt-3.5' : ''}`}>
                      {/* Badges Row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Rank Badge */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                              index === 0
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : index < 3
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                            <span>Top #{index + 1} Mais Procurada</span>
                          </span>

                          {/* Plan Badge */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${planBadgeColor}`}>
                            {planBadgeLabel}
                          </span>
                        </div>

                        {unit.verificada && (
                          <span
                            className="text-[10px] font-bold text-[#00A878] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                            title="Unidade com certificado verificado pelo MINSA"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>MINSA</span>
                          </span>
                        )}
                      </div>

                      {/* Header: Logo & Title */}
                      <div className="flex items-start gap-3 mt-2">
                        <img
                          src={unit.logo_url || 'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200'}
                          alt={unit.nome}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 bg-slate-50 shadow-inner shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {unitTypeBadge}
                          </span>
                          <h3
                            onClick={() => onSelectUnit(unit)}
                            className="text-base font-black text-[#123B7A] uppercase leading-tight line-clamp-2 hover:text-[#00A878] transition-colors cursor-pointer"
                          >
                            {unit.nome}
                          </h3>
                        </div>
                      </div>

                      {/* Description */}
                      {unit.descricao && (
                        <p className="text-xs text-slate-600 font-medium mt-2.5 line-clamp-2 leading-relaxed">
                          {unit.descricao}
                        </p>
                      )}

                      {/* Location & Schedule */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-[#00A878] shrink-0" />
                          <span className="truncate">
                            {unit.bairro}, {unit.municipio} ({unit.provincia})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="flex items-center gap-1 text-slate-500 font-bold">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="truncate">{unit.horario_funcionamento || 'Horário Comercial'}</span>
                          </span>

                          {unit.aberto_agora && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[10px] border border-emerald-200">
                              Aberto Agora
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metrics: Searches, Rating, Distance */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Buscas</span>
                          <span className="text-xs font-black text-[#123B7A] flex items-center justify-center gap-0.5">
                            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {unit.visualizacoes.toLocaleString()}
                          </span>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Avaliação</span>
                          <span className="text-xs font-black text-amber-600 flex items-center justify-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {unit.avaliacao ? unit.avaliacao.toFixed(1) : '4.8'}
                          </span>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Distância</span>
                          {unit.distancia_km !== undefined ? (
                            <span className="text-xs font-black text-[#00A878]">
                              {unit.distancia_km < 1
                                ? `${Math.round(unit.distancia_km * 1000)} m`
                                : `${unit.distancia_km.toFixed(1)} km`}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={onActivateGPS}
                              className="text-[10px] font-bold text-sky-600 hover:underline cursor-pointer"
                            >
                              Calcular KM
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 grid grid-cols-12 gap-2">
                      {/* Ver Unidade / Catálogo */}
                      <button
                        type="button"
                        onClick={() => onSelectUnit(unit)}
                        className="col-span-5 bg-[#123B7A] hover:bg-[#0c2854] text-white py-2 px-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Ver Perfil</span>
                      </button>

                      {/* Ver Rota GPS (Draws the blue path route) */}
                      <button
                        type="button"
                        onClick={() => onOpenRouteModal(unit)}
                        className="col-span-4 bg-sky-600 hover:bg-sky-700 text-white py-2 px-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer active:scale-95"
                        title="Desenhar Rota em Azul até esta unidade"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Ver Rota</span>
                      </button>

                      {/* WhatsApp Direct */}
                      <button
                        type="button"
                        onClick={() => handleUnitWhatsApp(unit)}
                        className="col-span-3 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-1.5 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer active:scale-95"
                        title="Contactar no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Flame className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#123B7A] uppercase">
                Nenhuma unidade encontrada com os filtros selecionados
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Tente limpar os filtros de província, plano ou termo de busca para visualizar todas as unidades com planos ativos.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInternalQuery('');
                  setUnitTypeFilter('all');
                  setPlanFilter('all');
                }}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#123B7A] text-white font-black text-xs uppercase tracking-wider hover:bg-[#0c2854] transition-all cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: PRODUTOS & SERVIÇOS MAIS PROCURADOS                   */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'items' && (
        <>
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item, index) => {
                const isSaved = savedItemIds.has(item.id);
                const isAvancado = item.plano_tipo === 'avancado';
                const planBadgeColor = isAvancado
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : item.plano_tipo === 'medio'
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200';

                const planBadgeLabel = isAvancado
                  ? '🏆 Plano Avançado (100)'
                  : item.plano_tipo === 'medio'
                  ? '⭐ Plano Médio (50)'
                  : '🛡️ Plano Básico (10)';

                const unitTypeBadge =
                  item.unidade.tipo === 'farmacia'
                    ? '🏥 Farmácia'
                    : item.unidade.tipo === 'clinica'
                    ? '🏥 Clínica'
                    : item.unidade.tipo === 'hospital'
                    ? '🏨 Hospital'
                    : item.unidade.tipo === 'centro_medico'
                    ? '🏢 Centro Médico'
                    : item.unidade.tipo === 'veterinaria'
                    ? '🐾 Veterinária'
                    : item.unidade.tipo === 'consultorio'
                    ? '🩺 Consultório'
                    : item.unidade.tipo === 'laboratorio'
                    ? '🔬 Laboratório'
                    : '🏥 Unidade de Saúde';

                return (
                  <div
                    key={`${item.id}-${item.unidade_id}-${index}`}
                    className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative group hover:shadow-md ${
                      isAvancado ? 'border-amber-300 shadow-xs' : 'border-slate-200/90 shadow-xs'
                    }`}
                  >
                    {/* Card Top / Header Badges */}
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Popularity Rank Badge */}
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black uppercase tracking-wider border border-rose-200/80 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                            <span>Top #{index + 1} • {item.visualizacoes.toLocaleString()} buscas</span>
                          </span>

                          {/* Plan Quota Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${planBadgeColor}`}>
                            {planBadgeLabel}
                          </span>
                        </div>

                        {/* Bookmark */}
                        <button
                          type="button"
                          onClick={() => onToggleSave(item.id, !isSaved)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSaved ? 'text-amber-500 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                          }`}
                          title={isSaved ? 'Remover dos guardados' : 'Guardar item'}
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-amber-500' : ''}`} />
                        </button>
                      </div>

                      {/* Title & Category */}
                      <h3 className="text-base font-black text-[#123B7A] leading-tight line-clamp-2">
                        {item.nome}
                      </h3>
                      {item.nome_generico && item.nome_generico !== item.nome && (
                        <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                          Substância: {item.nome_generico}
                        </p>
                      )}

                      <p className="text-xs text-slate-600 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                        {item.descricao}
                      </p>

                      {/* Price & Stock Section */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Preço oficial</span>
                          <div className="text-lg font-black text-[#00A878]">
                            {formatAOA(item.preco)}
                          </div>
                        </div>

                        <div className="text-right">
                          {item.item_type === 'medicamento' ? (
                            item.disponivel ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Em stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                Esgotado
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                              Disponível
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Unit Attribution & Location */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <div
                          onClick={() => onSelectUnit(item.unidade)}
                          className="flex items-center gap-1.5 cursor-pointer hover:text-[#00A878] transition-colors truncate max-w-[70%]"
                        >
                          <Building2 className="w-3.5 h-3.5 text-[#123B7A] shrink-0" />
                          <span className="font-bold truncate">{item.unidade.nome}</span>
                        </div>

                        {item.distancia_km !== undefined ? (
                          <span className="text-[11px] font-black text-[#00A878] shrink-0">
                            📍 {item.distancia_km < 1
                              ? `${Math.round(item.distancia_km * 1000)} m`
                              : `${item.distancia_km.toFixed(1)} km`}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={onActivateGPS}
                            className="text-[10px] font-bold text-sky-600 hover:underline shrink-0 cursor-pointer"
                          >
                            Calcular KM
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-3 bg-white border-t border-slate-100 grid grid-cols-12 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.item_type === 'medicamento') {
                            onAddToCart(item, 'medicamento', item.unidade);
                          } else if (item.item_type === 'servico' && onBookService) {
                            onBookService(item, item.unidade);
                          } else if (item.item_type === 'exame' && onBookExam) {
                            onBookExam(item, item.unidade);
                          } else {
                            onAddToCart(item, item.item_type, item.unidade);
                          }
                        }}
                        className="col-span-6 bg-[#00A878] hover:bg-[#008f66] active:scale-95 text-white py-2 px-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>
                          {item.item_type === 'medicamento'
                            ? 'Pedir'
                            : item.item_type === 'servico'
                            ? 'Marcar'
                            : 'Agendar'}
                        </span>
                      </button>

                      {/* Route / GPS */}
                      <button
                        type="button"
                        onClick={() => onOpenRouteModal(item.unidade)}
                        className="col-span-3 bg-sky-50 hover:bg-sky-100 text-[#123B7A] border border-sky-100 py-2 px-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Ver Rota / GPS até esta unidade"
                      >
                        <Navigation className="w-3.5 h-3.5 text-sky-600" />
                        <span>GPS</span>
                      </button>

                      {/* WhatsApp Direct */}
                      <button
                        type="button"
                        onClick={() => handleWhatsAppInquiry(item)}
                        className="col-span-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2 px-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Contactar unidade no WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Flame className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#123B7A] uppercase">
                Nenhum item mais procurado com os filtros atuais
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Tente remover os filtros de província, categoria ou termo de busca para visualizar os itens das unidades com planos ativos.
              </p>
              <button
                type="button"
                onClick={() => {
                  setInternalQuery('');
                  setUnitTypeFilter('all');
                  setItemTypeFilter('all');
                  setPlanFilter('all');
                }}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#123B7A] text-white font-black text-xs uppercase tracking-wider hover:bg-[#0c2854] transition-all cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </>
      )}

      {/* Regulatory Footnote */}
      <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#123B7A] shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <span className="font-bold text-[#123B7A]">Política de Transparência e Cotas de Planos Ativos:</span>
          <p>
            Apenas unidades de saúde e depósitos com subscrição rigorosamente <strong className="text-emerald-700">ATIVA</strong> integram a aba dos mais procurados. 
            A ordenação prioriza o <strong className="text-amber-700">Plano Avançado (Top #1)</strong> com cota máxima de 100 itens, seguido pelo Plano Médio (50 itens) e Plano Básico (10 itens), refletindo o volume de pesquisas orgânicas e confiabilidade institucional no MUTIKUKWAMA.
          </p>
        </div>
      </div>
    </div>
  );
};
