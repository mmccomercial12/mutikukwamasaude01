import React, { useState } from 'react';
import {
  Star,
  X,
  CheckCircle2,
  Building2,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { supabaseData } from '../../services/supabase';
import { useToast } from '../../context/ToastContext';
import { HealthUnit, Order } from '../../types';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: {
    id: string;
    nome: string;
    logo_url?: string;
    tipo?: string;
  };
  order?: Order | null;
  appointment?: {
    id: string;
    titulo: string;
    medico_ou_tecnico?: string;
    tipo: 'consulta' | 'exame';
  } | null;
  patientName?: string;
  patientId?: string;
  patientAvatar?: string;
  onSuccess?: () => void;
}

const STAR_LABELS: Record<number, { label: string; desc: string; color: string }> = {
  1: { label: 'Muito Fraco', desc: 'Experiência insatisfatória ou atraso excessivo', color: 'text-rose-500' },
  2: { label: 'Fraco', desc: 'Atendimento abaixo do esperado', color: 'text-amber-600' },
  3: { label: 'Razoável', desc: 'Atendimento normal, cumpriu o básico', color: 'text-amber-500' },
  4: { label: 'Muito Bom', desc: 'Atendimento rápido e atencioso', color: 'text-emerald-500' },
  5: { label: 'Excelente / Exemplar', desc: 'Serviço perfeito, profissionais impecáveis!', color: 'text-amber-400' },
};

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  unit,
  order,
  appointment,
  patientName = 'Manuel Domingos Pereira',
  patientId = 'user-paciente',
  patientAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  onSuccess,
}) => {
  const { success, error } = useToast();
  const [stars, setStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentDisplayStars = hoveredStars || stars;
  const starInfo = STAR_LABELS[currentDisplayStars] || STAR_LABELS[5];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stars < 1 || stars > 5) {
      error('Por favor, selecione entre 1 e 5 estrelas.');
      return;
    }

    setIsSubmitting(true);
    try {
      supabaseData.rateUnit({
        unidade_id: unit.id,
        estrelas: stars,
        comentario: comment.trim(),
        paciente_id: patientId,
        paciente_nome: patientName,
        paciente_avatar: patientAvatar,
        pedido_id: order?.id,
        consulta_id: appointment?.id,
        tipo_atendimento: order ? 'pedido' : appointment ? appointment.tipo : 'geral',
      });

      success(`Avaliação enviada com sucesso! Atribuiu ${stars} estrelas a ${unit.nome}.`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      error('Erro ao registar a avaliação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div
        className={`bg-white border border-slate-200 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          isFullScreen
            ? 'fixed inset-0 w-full h-full rounded-none z-50'
            : 'w-full max-w-xl max-h-[94vh] rounded-3xl my-auto animate-in zoom-in-95'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          {/* Fixed Sticky Header */}
          <div className="shrink-0 bg-gradient-to-r from-[#123B7A] via-[#1a4a94] to-[#0c2854] text-white p-5 sm:p-6 relative shadow-md">
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? 'Reduzir janela' : 'Modo Full Screen'}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Fechar"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3.5 pr-16">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <Building2 className="w-6 h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <span className="px-2.5 py-0.5 rounded-full bg-[#00A878]/30 border border-[#00A878]/40 text-[#00E5A3] text-[10px] font-black uppercase tracking-wider inline-block mb-1">
                  Avaliação do Utente
                </span>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase truncate">
                  {unit.nome}
                </h3>
                {order && (
                  <p className="text-xs text-slate-300 font-medium">
                    Referente ao Pedido <span className="font-mono font-bold text-amber-300">{order.codigo_pedido}</span>
                  </p>
                )}
                {appointment && (
                  <p className="text-xs text-slate-300 font-medium truncate">
                    {appointment.titulo} {appointment.medico_ou_tecnico ? `• ${appointment.medico_ou_tecnico}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-white">
            {/* Star Selection Section */}
            <div className="text-center space-y-3 bg-slate-50/80 p-5 rounded-3xl border border-slate-100">
              <label className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                Como classifica o atendimento recebido?
              </label>

              {/* Interactive Stars Row */}
              <div className="flex items-center justify-center gap-2 py-1">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = starValue <= currentDisplayStars;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setStars(starValue)}
                      onMouseEnter={() => setHoveredStars(starValue)}
                      onMouseLeave={() => setHoveredStars(0)}
                      className="p-1.5 sm:p-2 rounded-2xl hover:scale-125 transition-transform duration-150 focus:outline-none cursor-pointer"
                      aria-label={`Atribuir ${starValue} estrela(s)`}
                    >
                      <Star
                        className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                          isFilled
                            ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                            : 'text-slate-300 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Qualitative Rating Label */}
              <div className="flex flex-col items-center justify-center pt-1">
                <span className={`text-base font-black ${starInfo.color} transition-colors`}>
                  {currentDisplayStars} de 5 Estrelas — {starInfo.label}
                </span>
                <span className="text-xs text-slate-500 font-medium mt-0.5">
                  {starInfo.desc}
                </span>
              </div>
            </div>

            {/* Quick Predefined Compliments Chips */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Destaques do Atendimento (opcional):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Atendimento Rápido ⚡',
                  'Profissionais Simpáticos 😊',
                  'Medicamentos Disponíveis 💊',
                  'Local Limpo e Organizado ✨',
                  'Explicação Clara da Receita 📋',
                  'Preço Justo 💰',
                ].map((chip) => {
                  const isSelected = comment.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setComment(comment.replace(chip, '').replace(/,\s*,/g, ',').trim());
                        } else {
                          setComment((prev) => (prev ? `${prev}, ${chip}` : chip));
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#123B7A] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment Text Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Deixe um comentário ou elogio detalhado:</span>
                <span className="text-[10px] text-slate-400">Opcional</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: Fui atendido pelo farmacêutico que me explicou com paciência os horários corretos dos comprimidos..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00A878] focus:bg-white transition-all resize-none"
              />
            </div>

            {/* Information Notice */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-[#00A878] shrink-0 mt-0.5" />
              <span>
                A sua avaliação será contabilizada na reputação pública e no ranking da unidade, ajudando outros cidadãos angolanos a encontrar os melhores serviços de saúde.
              </span>
            </div>
          </div>

          {/* Fixed Sticky Footer Actions */}
          <div className="shrink-0 p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-xs font-black text-amber-700">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{stars} Estrelas Selecionadas</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#00A878] hover:bg-[#008f66] text-white px-5 sm:px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'A submeter...' : 'Confirmar & Atribuir Estrelas'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

