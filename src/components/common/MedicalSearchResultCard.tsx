import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  ShoppingCart,
  ExternalLink,
  MessageCircle,
  Bookmark,
  Building2,
  Check,
  Star,
  Clock,
  Package,
} from 'lucide-react';

export interface MedicalSearchResultCardProps {
  id: string;
  badgeType: 'SERVIÇO' | 'MEDICAMENTO' | 'EXAME' | 'LOTE GROSSISTA' | string;
  title: string;
  subtitle: string;
  isAvailable?: boolean;
  statusLabel?: string;
  durationOrQuantityLabel?: string;
  durationOrQuantityValue?: string;
  price: number;
  unit: {
    id: string;
    nome: string;
    tipo: string;
    bairro: string;
    municipio: string;
    provincia: string;
    endereco_completo?: string;
    telefone?: string;
    whatsapp?: string;
    latitude?: number;
    longitude?: number;
    selo_premium?: boolean;
    logo_url?: string;
  };
  distanceKm?: number;
  userCoords?: { lat: number; lng: number } | null;
  onActivateGPS?: () => void;
  onViewLocation?: () => void;
  onViewRoute?: () => void;
  onBookOrAdd?: () => void;
  bookActionLabel?: string;
  onOrder?: () => void;
  orderActionLabel?: string;
  onWhatsApp?: () => void;
  onToggleSave?: (id: string, isSaved: boolean) => void;
  isSavedInitial?: boolean;
}

export const formatAOA = (amount: number): string => {
  const formatted = new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `AOA ${formatted}`;
};

export const MedicalSearchResultCard: React.FC<MedicalSearchResultCardProps> = ({
  id,
  badgeType = 'SERVIÇO',
  title,
  subtitle,
  isAvailable = true,
  statusLabel,
  durationOrQuantityLabel = 'DURAÇÃO',
  durationOrQuantityValue = '— min',
  price,
  unit,
  distanceKm,
  userCoords,
  onActivateGPS,
  onViewLocation,
  onViewRoute,
  onBookOrAdd,
  bookActionLabel,
  onOrder,
  orderActionLabel = 'Fazer Pedido',
  onWhatsApp,
  onToggleSave,
  isSavedInitial = false,
}) => {
  const [isSaved, setIsSaved] = useState(isSavedInitial);

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    if (onToggleSave) {
      onToggleSave(id, nextSaved);
    }
  };

  // Determine book action label if not provided
  const defaultBookLabel =
    badgeType === 'SERVIÇO' || badgeType === 'CONSULTA'
      ? 'Marcar Consulta'
      : badgeType === 'EXAME'
      ? 'Marcar Exame'
      : badgeType === 'LOTE GROSSISTA'
      ? 'Pedir Cotação'
      : 'Adicionar ao Carrinho';

  const resolvedBookLabel = bookActionLabel || defaultBookLabel;

  // Unit display name and type
  const unitTypeName =
    unit.tipo === 'clinica'
      ? 'Clínica'
      : unit.tipo === 'farmacia'
      ? 'Farmácia'
      : unit.tipo === 'hospital'
      ? 'Hospital'
      : unit.tipo === 'laboratorio'
      ? 'Laboratório'
      : unit.tipo === 'deposito'
      ? 'Depósito Grossista'
      : 'Unidade de Saúde';

  // Distance string or GPS prompt
  const hasCoordinates = !!(unit.latitude && unit.longitude);
  const displayDistance =
    distanceKm !== undefined
      ? `A ${distanceKm} km de si`
      : userCoords && hasCoordinates
      ? `Aprox. Luanda Centro`
      : 'Ative o GPS para ver a distância';

  return (
    <div
      id={`result-card-${id}`}
      className="bg-white border border-slate-200/90 rounded-[28px] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
    >
      <div>
        {/* Top Header Row: Badge | Guardar & Disponível */}
        <div className="flex items-center justify-between gap-2">
          {/* Badge (SERVIÇO / MEDICAMENTO / EXAME / LOTE GROSSISTA) */}
          <span className="px-3 py-1 rounded-full bg-[#E8F5F1] text-[#00A878] text-[11px] font-black uppercase tracking-wider border border-[#00A878]/30">
            {badgeType}
          </span>

          {/* Right Group: Guardar & Status */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveClick}
              className={`flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                isSaved
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={isSaved ? 'Item guardado nos favoritos' : 'Guardar nos favoritos'}
            >
              <Bookmark
                className={`w-3.5 h-3.5 ${
                  isSaved ? 'fill-white text-white' : 'text-slate-600'
                }`}
              />
              <span>{isSaved ? 'Guardado' : 'Guardar'}</span>
            </button>

            <span className="px-3 py-1 rounded-full bg-[#E8F5F1] text-[#00A878] text-[11px] font-black uppercase tracking-wider border border-[#00A878]/30">
              {statusLabel || (isAvailable ? 'DISPONÍVEL' : 'SOB CONSULTA')}
            </span>
          </div>
        </div>

        {/* Card Title & Subtitle */}
        <div className="mt-3.5">
          <h3 className="font-black text-slate-900 text-xl tracking-tight uppercase leading-snug">
            {title}
          </h3>
          <p className="text-slate-600 text-sm font-medium mt-1">
            {subtitle}
          </p>
        </div>

        {/* Inner Establishment Box */}
        <div className="mt-4 rounded-2xl border border-slate-200/90 bg-white p-4 space-y-3 shadow-2xs">
          {/* Establishment Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center shrink-0 border border-[#00A878]/20">
              {unit.tipo === 'deposito' ? (
                <Package className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-slate-900 text-sm uppercase truncate leading-tight">
                {unit.nome}
              </div>
              <div className="text-slate-500 text-xs font-medium mt-0.5">
                {unitTypeName}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Address Line */}
          <div className="flex items-start gap-2.5 text-xs">
            <MapPin className="w-4 h-4 text-[#00A878] shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-semibold text-slate-700 truncate">{unit.nome}</div>
              <div className="text-slate-500 text-[11px] truncate">
                {unit.bairro} · {unit.municipio} · {unit.provincia}
              </div>
            </div>
          </div>

          {/* GPS Distance Row */}
          <div
            onClick={onActivateGPS}
            className={`flex items-center gap-2 text-xs font-semibold ${
              onActivateGPS ? 'cursor-pointer hover:text-[#00A878]' : ''
            } text-slate-700 transition-colors`}
            title={distanceKm !== undefined ? 'Distância calculada' : 'Clique para calcular a distância pelo GPS'}
          >
            <Navigation className="w-4 h-4 text-[#00A878] shrink-0" />
            <span>{displayDistance}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row: Duração / Estoque & Preço */}
      <div className="mt-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {durationOrQuantityLabel}
            </div>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {durationOrQuantityValue}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              PREÇO
            </div>
            <div className="text-2xl font-black text-[#C53030] tracking-tight mt-0.5 leading-none">
              {formatAOA(price)}
            </div>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="mt-4 space-y-2">
          {/* Row 1: Ver Localização & Ver Rota */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onViewLocation}
              className="w-full bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <MapPin className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="truncate">Ver Localização</span>
            </button>

            <button
              type="button"
              onClick={onViewRoute}
              className="w-full bg-[#E8F5F1] text-[#00A878] border border-[#00A878]/30 hover:bg-[#d4efe5] text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Navigation className="w-4 h-4 text-[#00A878] shrink-0" />
              <span className="truncate">Ver Rota</span>
            </button>
          </div>

          {/* Row 2: Marcar Consulta / Adicionar ao Carrinho & Fazer Pedido */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onBookOrAdd}
              className="w-full bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ShoppingCart className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="truncate">{resolvedBookLabel}</span>
            </button>

            <button
              type="button"
              onClick={onOrder}
              className="w-full bg-[#007A58] hover:bg-[#006246] text-white text-xs font-bold py-2.5 px-3 rounded-2xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-white shrink-0" />
              <span className="truncate">{orderActionLabel}</span>
            </button>
          </div>

          {/* Row 3: WhatsApp Full-width */}
          <button
            type="button"
            onClick={onWhatsApp}
            className="w-full bg-white border border-[#00A878]/60 text-[#00A878] hover:bg-[#E8F5F1] text-xs font-bold py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-75 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
