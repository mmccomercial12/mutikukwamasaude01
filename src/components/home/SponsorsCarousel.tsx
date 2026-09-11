import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Phone,
  Sparkles,
  HeartHandshake,
  CheckCircle,
} from 'lucide-react';
import { SponsorPartner } from '../../types';
import { supabaseData } from '../../services/supabase';

interface SponsorsCarouselProps {
  onNavigatePlans?: () => void;
}

export const SponsorsCarousel: React.FC<SponsorsCarouselProps> = ({ onNavigatePlans }) => {
  const [sponsors, setSponsors] = useState<SponsorPartner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const timerRef = useRef<any>(null);

  // Load active sponsors chosen by Super Admin
  const loadSponsors = () => {
    const active = supabaseData.getSponsors(true);
    setSponsors(active);
    if (currentIndex >= active.length && active.length > 0) {
      setCurrentIndex(0);
    }
  };

  useEffect(() => {
    loadSponsors();

    // Listen to custom event or storage changes if updated in another tab/component
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mutikukwama_sponsors_v1') {
        loadSponsors();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (sponsors.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sponsors.length);
    }, 4000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sponsors.length, isPaused]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sponsors.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + sponsors.length) % sponsors.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sponsors.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % sponsors.length);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'diamante':
        return {
          bg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black',
          label: 'Patrocínio Diamante',
        };
      case 'ouro':
        return {
          bg: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold',
          label: 'Patrocínio Ouro',
        };
      case 'institucional':
        return {
          bg: 'bg-[#E8F5F1] text-[#00A878] border border-[#00A878]/30 font-black',
          label: 'Apoio Institucional',
        };
      case 'estrategico':
        return {
          bg: 'bg-blue-100 text-blue-900 border border-blue-300 font-bold',
          label: 'Parceiro Estratégico',
        };
      case 'tecnologico':
        return {
          bg: 'bg-purple-100 text-purple-900 border border-purple-300 font-bold',
          label: 'Apoio Tecnológico',
        };
      default:
        return {
          bg: 'bg-white/20 text-white border border-white/30 font-semibold',
          label: 'Apoiante Oficial',
        };
    }
  };

  // Fallback if super admin disabled all sponsors
  if (sponsors.length === 0) {
    return (
      <div className="bg-[#123B7A] rounded-[32px] p-6 text-white overflow-hidden relative group shadow-md mt-2 border border-white/10">
        <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 pointer-events-none">
          <Phone className="w-32 h-32" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[#00A878] animate-pulse"></span>
          <h5 className="text-xs font-black uppercase tracking-[0.2em] text-[#00A878]">
            Apoio ao Cidadão & SOS
          </h5>
        </div>
        <p className="text-base sm:text-lg font-bold mb-4 leading-tight">
          Dificuldade em encontrar um medicamento específico em Angola?
        </p>
        <button
          onClick={() => onNavigatePlans && onNavigatePlans()}
          className="w-full bg-white text-[#123B7A] py-3 rounded-2xl font-black uppercase text-xs sm:text-sm tracking-widest hover:bg-[#00A878] hover:text-white transition-colors shadow-sm cursor-pointer"
        >
          Ligar SOS Mutikukwama (+244 923 000 111)
        </button>
      </div>
    );
  }

  const currentSponsor = sponsors[currentIndex] || sponsors[0];
  const tierInfo = getTierBadge(currentSponsor.tier);

  return (
    <div
      id="sponsors-carousel-card"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="bg-gradient-to-br from-[#123B7A] via-[#0e2f63] to-[#123B7A] rounded-[32px] p-5 sm:p-6 text-white overflow-hidden relative shadow-lg mt-2 border border-white/15 transition-all"
    >
      {/* Subtle Background Watermark */}
      <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-3 -translate-y-3 pointer-events-none">
        <Building2 className="w-36 h-36" />
      </div>

      {/* Top Bar: Title & Navigation Controls */}
      <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#00A878]/20 flex items-center justify-center border border-[#00A878]/40">
            <HeartHandshake className="w-3.5 h-3.5 text-[#00A878]" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00A878] block">
              Empresas Apoiantes & Patrocinadoras
            </span>
            <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">
              Parceiros Oficiais Escolhidos pela Administração
            </span>
          </div>
        </div>

        {/* Counter & Nav Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
            {currentIndex + 1} / {sponsors.length}
          </span>
          <button
            onClick={handlePrev}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Anterior"
            aria-label="Anterior patrocinador"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Seguinte"
            aria-label="Seguinte patrocinador"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Slide Content */}
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 backdrop-blur-xs min-h-[115px]">
          {/* Company Logo / Avatar */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20">
            {!imageErrors[currentSponsor.id] && currentSponsor.logo_url ? (
              <img
                src={currentSponsor.logo_url}
                alt={currentSponsor.nome}
                className="w-full h-full object-cover rounded-xl"
                onError={() => {
                  setImageErrors((prev) => ({ ...prev, [currentSponsor.id]: true }));
                }}
              />
            ) : (
              <Building2 className="w-8 h-8 text-[#123B7A]" />
            )}
          </div>

          {/* Info Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider ${tierInfo.bg}`}>
                {tierInfo.label}
              </span>
              <span className="text-[10px] text-slate-300 font-semibold truncate max-w-[200px]">
                {currentSponsor.categoria}
              </span>
            </div>

            <h4 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight truncate">
              {currentSponsor.nome}
            </h4>

            <p className="text-xs text-slate-200 font-normal leading-relaxed line-clamp-2 mt-1">
              {currentSponsor.descricao}
            </p>
          </div>
        </div>

        {/* Action Buttons inside Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3.5">
          {currentSponsor.website_url ? (
            <a
              href={currentSponsor.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#00A878] hover:bg-[#009166] text-white py-2.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Conhecer Empresa</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div className="w-full bg-white/10 text-white/80 py-2.5 px-4 rounded-xl font-bold uppercase text-[11px] tracking-wider flex items-center justify-center gap-1.5 border border-white/10">
              <CheckCircle className="w-3.5 h-3.5 text-[#00A878]" />
              <span>Parceiro Homologado</span>
            </div>
          )}

          <button
            onClick={() => onNavigatePlans && onNavigatePlans()}
            className="w-full bg-white/10 hover:bg-white text-white hover:text-[#123B7A] py-2.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider transition-colors border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-[#00A878]" />
            <span>SOS Mutikukwama (+244 923 000 111)</span>
          </button>
        </div>
      </div>

      {/* Pagination Dots */}
      {sponsors.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3.5 pt-2 border-t border-white/10 relative z-10">
          {sponsors.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'w-6 bg-[#00A878]'
                  : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
              title={`Ir para ${s.nome}`}
              aria-label={`Patrocinador ${idx + 1}: ${s.nome}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
