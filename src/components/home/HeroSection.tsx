import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Sparkles,
  Building2,
  ShieldCheck,
  Star,
  Clock,
  Phone,
  ArrowRight,
  Stethoscope,
  Pill,
  Microscope,
  Flame,
  CheckCircle2,
  Navigation,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PROVINCES_ANGOLA } from '../../services/mockData';
import { reverseGeocodeCoordinates, saveUserGpsLocation, acquirePreciseUserLocation } from '../../services/geoService';
import { supabaseData } from '../../services/supabase';
import { HealthUnit } from '../../types';
import { SponsorsCarousel } from './SponsorsCarousel';

interface HeroSectionProps {
  onSearchSubmit?: (query: string, province: string, categoryOrMunicipality?: string) => void;
  onSearch?: (query: string, province: string, categoryOrMunicipality?: string) => void;
  onOpenPrescriptionAI: () => void;
  onSelectUnit: (unit: HealthUnit) => void;
  onNavigatePlans?: () => void;
  onViewPlans?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onSearchSubmit,
  onSearch,
  onOpenPrescriptionAI,
  onSelectUnit,
  onNavigatePlans,
  onViewPlans,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('Luanda');
  const [isGettingGps, setIsGettingGps] = useState(false);

  const doSearch = (q: string, prov: string, cat?: string) => {
    if (onSearchSubmit) onSearchSubmit(q, prov, cat);
    else if (onSearch) onSearch(q, prov, cat);
  };

  const doNavigatePlans = () => {
    if (onNavigatePlans) onNavigatePlans();
    else if (onViewPlans) onViewPlans();
  };

  // Featured units (Advanced plan / Premium units)
  const featuredUnits = supabaseData.getUnits(false).filter((u) => u.destaque_visual).slice(0, 3);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(searchQuery, selectedProvince);
  };

  const handleGpsSearch = async () => {
    setIsGettingGps(true);
    const res = await acquirePreciseUserLocation();
    setIsGettingGps(false);

    if (res.success && res.location) {
      const geo = res.location;
      saveUserGpsLocation(geo);
      setSelectedProvince(geo.provincia);
      doSearch(searchQuery, geo.provincia, geo.municipio);
    } else {
      doSearch(searchQuery, selectedProvince);
    }
  };

  const quickPills = [
    { label: 'Ibuprofeno 400mg', query: 'Ibuprofeno' },
    { label: 'Coartem (Antimalárico)', query: 'Coartem' },
    { label: 'Paracetamol 500mg', query: 'Paracetamol' },
    { label: 'Amoxicilina 875mg', query: 'Amoxicilina' },
    { label: 'Hemograma Completo', query: 'Hemograma' },
    { label: 'Consulta Pediatria', query: 'Pediatria' },
  ];

  return (
    <div className="w-full bg-[#F8FAFC]">
      {/* Top Banner Notice for National Health */}
      <div className="bg-white border-b border-gray-100 py-2.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5F1] text-[#00A878] font-black uppercase text-[10px] tracking-wider">
              21 Províncias de Angola
            </span>
            <span className="text-gray-500 hidden sm:inline">Stock de medicamentos e exames atualizado em tempo real</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1 text-[#123B7A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00A878]" />
              Farmácias Credenciadas MINSA
            </span>
          </div>
        </div>
      </div>

      {/* Main Hero Split Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left Section: Bold Typography & Main Search */}
        <section className="lg:col-span-7 p-6 sm:p-12 flex flex-col justify-center bg-white border-b lg:border-b-0 lg:border-r border-gray-100">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-[#E8F5F1] text-[#00A878] text-xs font-black rounded-full uppercase tracking-widest mb-6">
              Cobertura Nacional Angola
            </span>

            <h2 className="text-[44px] sm:text-[68px] lg:text-[76px] leading-[0.88] font-black text-[#123B7A] tracking-tighter mb-6 uppercase">
              SAÚDE PERTO<br />
              <span className="text-[#00A878]">DE SI.</span>
            </h2>

            <p className="text-base sm:text-lg text-gray-500 font-medium mb-8 leading-relaxed max-w-xl">
              Encontre medicamentos, serviços médicos e laboratórios em todo o país. Conectamos pacientes a unidades de saúde de forma rápida e segura.
            </p>

            {/* Indicativo Onde Pesquisar & Aviso Ativar GPS Primeiro */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#123B7A]">
                <span className="w-2 h-2 rounded-full bg-[#00A878] animate-ping" />
                <ArrowDown className="w-3.5 h-3.5 text-[#00A878] animate-bounce" />
                <span>Onde Pesquisar: Digite o medicamento ou serviço</span>
              </div>
              <button
                type="button"
                onClick={handleGpsSearch}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/90 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Ativar GPS para encontrar unidades próximas"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Aviso: Ative o GPS primeiro ("Perto de Mim")</span>
              </button>
            </div>

            {/* Glowing Pill Search Box */}
            <div className="relative group mb-4">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#123B7A] to-[#00A878] rounded-[32px] blur opacity-25 group-hover:opacity-40 transition duration-500 pointer-events-none" />
              <form
                onSubmit={handleSearch}
                className="relative flex flex-col sm:flex-row items-center bg-white border-2 border-gray-100 rounded-[28px] p-2 shadow-xl gap-2"
              >
                {/* Province Dropdown */}
                <div className="w-full sm:w-44 flex items-center bg-gray-50 rounded-[20px] px-3 py-3 border border-gray-100">
                  <MapPin className="w-4 h-4 text-[#00A878] shrink-0 mr-1.5" />
                  <select
                    value={selectedProvince}
                    onChange={(e) => setSelectedProvince(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-[#123B7A] focus:outline-none cursor-pointer"
                  >
                    <option value="all">Todas as Províncias</option>
                    {PROVINCES_ANGOLA.map((prov) => (
                      <option key={prov} value={prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Text Input */}
                <div className="flex-1 w-full flex items-center px-3 py-2">
                  <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ibuprofeno, Malária, Rx Tórax..."
                    className="w-full outline-none text-base font-semibold text-gray-800 placeholder-gray-400"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    type="button"
                    id="btn-hero-gps"
                    onClick={handleGpsSearch}
                    disabled={isGettingGps}
                    className="p-3.5 sm:px-4 bg-sky-50 hover:bg-sky-100 text-[#123B7A] rounded-[22px] font-black text-xs uppercase tracking-wider transition-colors shrink-0 border border-sky-100 flex items-center gap-1.5 cursor-pointer"
                    title="Ativar GPS para pesquisar perto de si"
                  >
                    <Navigation className={`w-4 h-4 text-[#00A878] ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isGettingGps ? 'GPS...' : 'Perto de Mim'}</span>
                  </button>

                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial bg-[#00A878] text-white px-8 py-3.5 rounded-[22px] font-black text-base hover:bg-[#008f66] transition-colors shrink-0 shadow-sm cursor-pointer"
                  >
                    Pesquisar
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1 mr-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Populares:
              </span>
              {quickPills.slice(0, 4).map((pill) => (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => {
                    setSearchQuery(pill.query);
                    doSearch(pill.query, selectedProvince);
                  }}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-xs font-bold text-[#123B7A] rounded-full transition-colors"
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Quick Action Badges */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-6 sm:gap-8 items-center">
              <button
                type="button"
                onClick={onOpenPrescriptionAI}
                className="flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 bg-[#F1F5F9] group-hover:bg-[#E8F5F1] rounded-2xl flex items-center justify-center transition-colors">
                  <Sparkles className="w-6 h-6 text-[#123B7A] group-hover:text-[#00A878] transition-colors" />
                </div>
                <span className="text-xs sm:text-sm font-bold leading-tight text-gray-700">
                  Leitura de Receitas<br />
                  <span className="text-[#00A878] font-black uppercase text-[10px] tracking-wider">Powered by AI</span>
                </span>
              </button>

              <div className="h-8 w-px bg-gray-200 hidden sm:block" />

              <button
                type="button"
                onClick={() => doSearch('', selectedProvince, 'mais_procurados')}
                className="flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 bg-amber-50 group-hover:bg-amber-100 rounded-2xl flex items-center justify-center transition-colors">
                  <Flame className="w-6 h-6 text-amber-500 fill-amber-500 transition-colors" />
                </div>
                <span className="text-xs sm:text-sm font-bold leading-tight text-gray-700">
                  Unidades Mais Procuradas<br />
                  <span className="text-amber-600 font-black uppercase text-[10px] tracking-wider">Planos Ativos</span>
                </span>
              </button>

              <div className="h-8 w-px bg-gray-200 hidden sm:block" />

              <button
                type="button"
                onClick={() => doSearch('', 'Luanda')}
                className="flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-12 h-12 bg-[#F1F5F9] group-hover:bg-[#EBF2FC] rounded-2xl flex items-center justify-center transition-colors">
                  <Navigation className="w-6 h-6 text-[#123B7A] group-hover:text-[#123B7A] transition-colors" />
                </div>
                <span className="text-xs sm:text-sm font-bold leading-tight text-gray-700">
                  Geolocalização<br />
                  <span className="text-[#123B7A] font-black uppercase text-[10px] tracking-wider">Farmácias Próximas</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Section: Featured Units & Support Box */}
        <section className="lg:col-span-5 bg-[#F1F5F9] p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                Unidades em Destaque
              </h3>
              <button
                onClick={() => onSearchSubmit('', 'all')}
                className="text-xs font-bold text-[#123B7A] hover:underline uppercase tracking-wider"
              >
                Ver todas ({supabaseData.getUnits(false).length}) →
              </button>
            </div>

            {/* Featured Cards Stack */}
            <div className="flex flex-col gap-3.5">
              {featuredUnits.map((unit) => {
                const initials = unit.nome
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={unit.id}
                    onClick={() => onSelectUnit(unit)}
                    className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer group"
                  >
                    {unit.selo_premium && (
                      <div className="absolute top-0 right-0 bg-[#00A878] text-white text-[10px] font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-tighter">
                        ⭐ Premium
                      </div>
                    )}

                    {unit.logo_url ? (
                      <img
                        src={unit.logo_url}
                        alt={unit.nome}
                        className="w-14 h-14 rounded-2xl object-cover border border-gray-200 shrink-0 bg-white shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#123B7A] font-black text-lg border border-gray-100 shrink-0">
                        {initials || 'FC'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0 pr-12">
                      <h4 className="font-black text-[#123B7A] uppercase text-base leading-snug truncate group-hover:text-[#00A878] transition-colors">
                        {unit.nome}
                      </h4>
                      <p className="text-xs text-gray-500 font-bold mb-2 truncate">
                        {unit.provincia} • {unit.municipio}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="bg-blue-50 text-[#123B7A] text-[10px] font-bold px-2 py-0.5 rounded">
                          Stock: +500 Itens
                        </span>
                        {unit.aberto_agora && (
                          <span className="bg-green-50 text-[#00A878] text-[10px] font-bold px-2 py-0.5 rounded">
                            Aberta Agora
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empresas Apoiantes & Patrocinadoras (Carrossel Gerido pelo Super Admin) */}
          <SponsorsCarousel onNavigatePlans={onNavigatePlans} />
        </section>
      </div>

      {/* Live National Metrics Bar */}
      <div className="border-t border-b border-gray-200/80 bg-white py-8 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-2">
            <div className="text-3xl sm:text-4xl font-black text-[#123B7A] tracking-tight">1.200+</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Unidades Credenciadas</div>
          </div>
          <div className="p-2">
            <div className="text-3xl sm:text-4xl font-black text-[#00A878] tracking-tight">21</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Províncias de Angola</div>
          </div>
          <div className="p-2">
            <div className="text-3xl sm:text-4xl font-black text-[#123B7A] tracking-tight">45.000+</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Medicamentos em Stock</div>
          </div>
          <div className="p-2">
            <div className="text-3xl sm:text-4xl font-black text-amber-500 tracking-tight">24/7</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Atendimento Contínuo</div>
          </div>
        </div>
      </div>
    </div>
  );
};
