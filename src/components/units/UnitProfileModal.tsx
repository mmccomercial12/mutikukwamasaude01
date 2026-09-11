import React, { useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  Star,
  Pill,
  Stethoscope,
  Microscope,
  ShoppingCart,
  ExternalLink,
  Navigation,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { HealthUnit, ProductItem, ServiceItem, ExamItem, UnitReview } from '../../types';
import { supabaseData } from '../../services/supabase';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { UnitRouteMapModal } from './UnitRouteMapModal';
import { MinsaDocumentModal } from '../minsa/MinsaDocumentModal';
import { RatingModal } from '../utente/RatingModal';
import { getSavedUserGpsLocation } from '../../services/geoService';

interface UnitProfileModalProps {
  unit: HealthUnit | null;
  onClose: () => void;
}

export const UnitProfileModal: React.FC<UnitProfileModalProps> = ({ unit, onClose }) => {
  const { addItem } = useCart();
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'medicamentos' | 'servicos' | 'exames' | 'avaliacoes'>('medicamentos');
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showMinsaDocModal, setShowMinsaDocModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<HealthUnit | null>(unit);
  const [reviews, setReviews] = useState<UnitReview[]>(() => {
    return unit ? supabaseData.getReviews(unit.id) : [];
  });

  if (!unit || !currentUnit) return null;

  const refreshReviewsAndUnit = () => {
    const updated = supabaseData.getUnitById(unit.id);
    if (updated) setCurrentUnit(updated);
    setReviews(supabaseData.getReviews(unit.id));
  };

  const products = supabaseData.getProducts().filter((p) => p.unidade_id === unit.id);
  const services = supabaseData.getServices().filter((s) => s.unidade_id === unit.id);
  const exams = supabaseData.getExams().filter((e) => e.unidade_id === unit.id);

  const handleAddProduct = (p: ProductItem) => {
    addItem({
      item_id: p.id,
      tipo_item: p.categoria,
      nome: p.nome,
      preco: p.preco,
      quantidade: 1,
      unidade_id: unit.id,
      unidade_nome: unit.nome,
    });
  };

  const handleOpenMap = () => {
    if (unit.latitude && unit.longitude) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${unit.latitude},${unit.longitude}`,
        '_blank'
      );
    }
  };

  const handleOpenWhatsApp = () => {
    const phone = (unit.whatsapp || unit.telefone).replace(/[^0-9]/g, '');
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        `Olá! Estou a contactar a partir da plataforma MUTIKUKWAMA SAÚDE para obter informações sobre a ${unit.nome}.`
      )}`,
      '_blank'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white border border-gray-100 rounded-[32px] max-w-4xl w-full shadow-2xl text-gray-800 animate-in zoom-in-95 my-8 max-h-[92vh] flex flex-col justify-between overflow-hidden">
        {/* Banner and Header */}
        <div className="relative">
          <img
            src={unit.banner_url || 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200'}
            alt={unit.nome}
            className="w-full h-44 sm:h-56 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/80 hover:bg-white text-gray-800 shadow-md backdrop-blur-sm transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Unit Info overlay */}
          <div className="absolute bottom-4 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src={unit.logo_url || 'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200'}
                alt={unit.nome}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white bg-white shadow-xl"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    {unit.nome}
                  </h2>
                  {unit.selo_premium && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3 fill-slate-950" /> Premium
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-200 mt-1 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#00A878]" />
                    {unit.bairro}, {unit.municipio} ({unit.provincia})
                  </span>
                  {unit.verificada && (
                    <span className="flex items-center gap-1 text-[#00A878] font-bold bg-white/90 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" />
                      MINSA Verificada
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenWhatsApp}
                className="px-4 py-2 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md"
              >
                <Phone className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
              {unit.latitude && unit.longitude && (
                <button
                  onClick={() => setShowRouteModal(true)}
                  className="px-4 py-2 rounded-2xl bg-[#123B7A] hover:bg-[#0d2a59] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>Ver Rota / Mapa</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Details & Catalog Tabs */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-[#F8FAFC]">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white border border-gray-100 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-[#00A878] shrink-0" />
              <div>
                <div className="text-gray-400 font-bold uppercase text-[10px]">Horário:</div>
                <div className="font-bold text-gray-800">{unit.horario_funcionamento}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-[#123B7A] shrink-0" />
              <div>
                <div className="text-gray-400 font-bold uppercase text-[10px]">Contacto Directo:</div>
                <div className="font-bold text-gray-800">{unit.telefone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="text-gray-400 font-bold uppercase text-[10px]">Licenciamento:</div>
                <div className="font-bold text-gray-800">{unit.certificado_institucional || 'Certificado Sanitário'}</div>
              </div>
            </div>
          </div>

          {/* Official MINSA Registration & Document Banner */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                <FileText className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase text-amber-950 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Nº de Alvará Sanitário / Registo MINSA
                </div>
                <div className="font-mono text-xs font-black text-slate-900 tracking-wide mt-0.5">
                  {unit.certificado_institucional || 'CERT-MINSA-2025-4891'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowMinsaDocModal(true)}
              className="px-4 py-2 rounded-xl bg-[#0B1E3B] hover:bg-[#123B7A] text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Ver Documento MINSA</span>
            </button>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed font-medium bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            {unit.descricao}
          </p>

          {/* Catalog Tab Navigation */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-3">
            <button
              onClick={() => setActiveTab('medicamentos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'medicamentos'
                  ? 'bg-[#00A878] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medicamentos em Stock ({products.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('servicos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'servicos'
                  ? 'bg-[#123B7A] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Consultas Médicas ({services.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('exames')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'exames'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Microscope className="w-3.5 h-3.5" />
              <span>Exames ({exams.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('avaliacoes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'avaliacoes'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Avaliações & Estrelas ({reviews.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'medicamentos' && (
            <div className="space-y-3">
              {products.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 font-medium bg-white rounded-2xl p-6 border border-gray-100">
                  Nenhum produto cadastrado no catálogo digital desta unidade.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="font-black text-[#123B7A] text-xs sm:text-sm uppercase truncate">{p.nome}</h4>
                        <div className="text-[11px] text-gray-500 font-medium truncate">{p.forma_farmaceutica || p.dosagem}</div>
                        <div className="text-xs font-black text-[#00A878] mt-1">
                          {p.preco.toLocaleString()} AOA
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddProduct(p)}
                        className="px-3.5 py-2 rounded-xl bg-[#123B7A] hover:bg-[#0d2a59] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'servicos' && (
            <div className="space-y-3">
              {services.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 font-medium bg-white rounded-2xl p-6 border border-gray-100">
                  Esta unidade não possui consultas ativas cadastradas.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-50 text-[#123B7A] font-black uppercase">
                          {s.especialidade}
                        </span>
                        <span className="text-xs font-black text-[#00A878]">{s.preco.toLocaleString()} AOA</span>
                      </div>
                      <h4 className="font-black text-[#123B7A] text-xs sm:text-sm uppercase">{s.nome}</h4>
                      <p className="text-[11px] text-gray-500 font-medium line-clamp-2">{s.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'exames' && (
            <div className="space-y-3">
              {exams.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 font-medium bg-white rounded-2xl p-6 border border-gray-100">
                  Nenhum exame cadastrado no momento para esta unidade.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {exams.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-black uppercase tracking-wider">
                          {ex.tipo_exame}
                        </span>
                        <span className="text-xs font-black text-purple-700">{ex.preco.toLocaleString()} AOA</span>
                      </div>
                      <h4 className="font-black text-[#123B7A] text-xs sm:text-sm uppercase">{ex.nome}</h4>
                      <p className="text-[11px] text-gray-500 font-medium line-clamp-2">{ex.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'avaliacoes' && (
            <div className="space-y-4">
              {/* Rating Summary Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex flex-col items-center justify-center shadow-md">
                    <span className="text-2xl font-black">{currentUnit.avaliacao.toFixed(1)}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-2.5 h-2.5 fill-white" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-800 uppercase">
                      Classificação dos Utentes
                    </h4>
                    <p className="text-xs text-slate-600 font-medium">
                      Baseada em {currentUnit.total_avaliacoes || reviews.length} avaliações reais de cidadãos angolanos
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRatingModal(true)}
                  className="px-5 py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-white" />
                  <span>Atribuir Estrelas / Avaliar</span>
                </button>
              </div>

              {/* Reviews List */}
              {reviews.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl p-6 border border-gray-100 text-xs text-gray-500">
                  <p className="font-bold text-slate-700 mb-1">Ainda não há avaliações para esta unidade.</p>
                  <p>Seja o primeiro utente a atribuir estrelas a este estabelecimento!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 rounded-2xl bg-white border border-gray-100 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={rev.paciente_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt={rev.paciente_nome}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <div className="text-xs font-black text-slate-800">
                              {rev.paciente_nome}
                            </div>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold uppercase">
                              Utente Verificado
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= rev.estrelas ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-black text-amber-900 ml-1">
                            {rev.estrelas}.0
                          </span>
                        </div>
                      </div>

                      {rev.comentario && (
                        <p className="text-xs text-slate-700 bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                          "{rev.comentario}"
                        </p>
                      )}

                      <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between pt-1">
                        <span>Atendimento: {rev.tipo_atendimento.toUpperCase()}</span>
                        <span>{new Date(rev.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>

      {showRouteModal && (
        <UnitRouteMapModal
          unit={unit}
          onClose={() => setShowRouteModal(false)}
          userCoords={
            getSavedUserGpsLocation()
              ? {
                  lat: getSavedUserGpsLocation()!.latitude,
                  lng: getSavedUserGpsLocation()!.longitude,
                }
              : undefined
          }
          originLabel={
            getSavedUserGpsLocation()?.bairro
              ? `Sua Localização (${getSavedUserGpsLocation()!.bairro})`
              : undefined
          }
        />
      )}

      {showMinsaDocModal && (
        <MinsaDocumentModal
          isOpen={showMinsaDocModal}
          unit={unit}
          onClose={() => setShowMinsaDocModal(false)}
        />
      )}

      {showRatingModal && (
        <RatingModal
          isOpen={showRatingModal}
          unit={{
            id: currentUnit.id,
            nome: currentUnit.nome,
            tipo: currentUnit.tipo,
            logo_url: currentUnit.logo_url,
          }}
          onClose={() => setShowRatingModal(false)}
          onSuccess={refreshReviewsAndUnit}
        />
      )}
    </div>
  );
};
