import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Clock,
  Printer,
  X,
  ExternalLink,
  Eye,
  Info,
  Building2,
  Send,
  AlertCircle,
  Download,
  Paperclip,
} from 'lucide-react';
import { MinsaAnnouncement, HealthUnit } from '../../types';
import { supabaseData } from '../../services/supabase';
import { useToast } from '../../context/ToastContext';
import { downloadAnnouncementDocument } from '../../utils/minsaDocumentDownload';

interface UnitMinsaAnnouncementsViewProps {
  unit: HealthUnit;
}

export const UnitMinsaAnnouncementsView: React.FC<UnitMinsaAnnouncementsViewProps> = ({ unit }) => {
  const { success, error, info } = useToast();

  const [announcementsData, setAnnouncementsData] = useState<
    { announcement: MinsaAnnouncement; isRead: boolean }[]
  >([]);
  const [selectedItem, setSelectedItem] = useState<{
    announcement: MinsaAnnouncement;
    isRead: boolean;
  } | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'critical'>('all');
  const [signerName, setSignerName] = useState(unit.responsavel_nome || 'Dr(a). Direcção Técnica');

  // Load announcements for this specific unit
  const loadData = () => {
    const list = supabaseData.getUnitAnnouncements(unit.id, unit.tipo, unit.provincia);
    setAnnouncementsData(list);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('mutikukwama_announcement_published', handleUpdate);
    window.addEventListener('mutikukwama_announcement_read', handleUpdate);

    return () => {
      window.removeEventListener('mutikukwama_announcement_published', handleUpdate);
      window.removeEventListener('mutikukwama_announcement_read', handleUpdate);
    };
  }, [unit.id, unit.tipo, unit.provincia]);

  const unreadCount = useMemo(() => {
    return announcementsData.filter((item) => !item.isRead).length;
  }, [announcementsData]);

  const criticalUnreadCount = useMemo(() => {
    return announcementsData.filter(
      (item) => !item.isRead && item.announcement.prioridade === 'critica_urgente'
    ).length;
  }, [announcementsData]);

  const handleConfirmRead = (announcement: MinsaAnnouncement) => {
    const name = signerName.trim() || unit.responsavel_nome || 'Responsável Técnico';
    supabaseData.markAnnouncementRead(announcement.id, unit.id, unit.nome, name);
    loadData();
    if (selectedItem && selectedItem.announcement.id === announcement.id) {
      setSelectedItem({ ...selectedItem, isRead: true });
    }
    success(`Leitura e conformidade do ofício "${announcement.numero_oficio}" confirmadas com sucesso perante o MINSA!`);
  };

  const filteredItems = useMemo(() => {
    return announcementsData.filter((item) => {
      if (filterMode === 'unread') return !item.isRead;
      if (filterMode === 'critical') return item.announcement.prioridade === 'critica_urgente';
      return true;
    });
  }, [announcementsData, filterMode]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E3B] via-[#102B52] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-lg border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-amber-300 border border-white/10">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Canal Oficial de Ligação com o MINSA / DNME</span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              Comunicados, Despachos & Circulares Regulamentares
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Aqui são recebidas as notificações oficiais e alertas de farmacovigilância emitidos pelo
              Ministério da Saúde para <strong>{unit.nome}</strong>. O cumprimento e a confirmação
              digital de leitura são de carácter obrigatório para a conformidade sanitária.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {unreadCount > 0 ? (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>{unreadCount} {unreadCount === 1 ? 'pendente de leitura' : 'pendentes de leitura'}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Todas as directrizes em dia</span>
              </div>
            )}
          </div>
        </div>

        {/* Critical alert bar if any */}
        {criticalUnreadCount > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
              <span>
                <strong>Atenção Obrigatória:</strong> Existem {criticalUnreadCount} despacho(s) de urgência máxima (ex: recolha preventiva de lote) com leitura pendente.
              </span>
            </div>
            <button
              onClick={() => setFilterMode('critical')}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 cursor-pointer"
            >
              Ver Despachos Urgentes
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Todos ({announcementsData.length})
          </button>
          <button
            onClick={() => setFilterMode('unread')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'unread'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Pendentes ({unreadCount})
          </button>
          <button
            onClick={() => setFilterMode('critical')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterMode === 'critical'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Alertas Críticos
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-medium px-3 hidden sm:block">
          Responsável Registado: <strong>{signerName}</strong>
        </div>
      </div>

      {/* List of Announcements */}
      <div className="space-y-4">
        {filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-xs space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Nenhum comunicado pendente neste filtro</h3>
            <p className="text-xs text-slate-500">
              Todas as circulares e alertas correspondentes a este filtro foram lidos ou não existem registos.
            </p>
          </div>
        )}

        {filteredItems.map(({ announcement: ann, isRead }) => {
          const isCritical = ann.prioridade === 'critica_urgente';

          return (
            <div
              key={ann.id}
              className={`bg-white rounded-2xl p-5 shadow-xs border transition-all space-y-3.5 ${
                !isRead
                  ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/20'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Header: Office reference & status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-slate-900 text-white">
                    {ann.numero_oficio}
                  </span>

                  {isCritical && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Urgência Máxima
                    </span>
                  )}

                  {isRead ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Leitura Confirmada</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300 animate-pulse">
                      <Clock className="w-3 h-3 text-amber-700" />
                      <span>Pendente de Confirmação</span>
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500">
                  Publicado em: <strong>{ann.data_publicacao}</strong>
                </div>
              </div>

              {/* Title & Summary */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-slate-900 leading-snug">
                  {ann.titulo}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {ann.resumo}
                </p>
              </div>

              {/* Scope & Signer info */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400">Emissor:</span>{' '}
                  <strong className="text-slate-800">{ann.emissor}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Signatário:</span>{' '}
                  <strong className="text-slate-800">{ann.signatario}</strong> ({ann.cargo_signatario})
                </div>
              </div>

              {/* Document Attachment & Download for Unit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 shadow-xs">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate text-[11px]">
                      {ann.anexo_nome || 'documento_oficial_minsa.pdf'}
                    </div>
                    <div className="text-[10px] text-amber-800">
                      Documento Oficial Anexo • {ann.anexo_tamanho || '1.4 MB'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    downloadAnnouncementDocument(ann);
                    success(`A descarregar documento oficial "${ann.anexo_nome || 'documento_minsa.doc'}"...`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer shrink-0"
                  title={`Baixar anexo: ${ann.anexo_nome || 'Documento Oficial'}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Documento</span>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <button
                  onClick={() => setSelectedItem({ announcement: ann, isRead })}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ler Directriz Completa & Detalhes</span>
                </button>

                <div className="flex items-center gap-2">
                  {!isRead ? (
                    <button
                      onClick={() => handleConfirmRead(ann)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Leitura & Conformidade</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Conformidade registada no Gabinete do MINSA</span>
                    </div>
                  )}

                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    title="Imprimir"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: FULL ANNOUNCEMENT DETAIL & CONFIRMATION */}
      {/* ========================================================================= */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono font-black text-xs text-blue-900 block">
                  {selectedItem.announcement.numero_oficio}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {selectedItem.announcement.titulo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-line text-xs">
                {selectedItem.announcement.conteudo}
              </div>

              <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-[11px] space-y-1">
                <div><strong>Entidade Emissora:</strong> {selectedItem.announcement.emissor}</div>
                <div><strong>Signatário:</strong> {selectedItem.announcement.signatario} ({selectedItem.announcement.cargo_signatario})</div>
                <div><strong>Data:</strong> {selectedItem.announcement.data_publicacao}</div>
                <div><strong>Vigência:</strong> {selectedItem.announcement.data_vigencia_fim || 'Indeterminada'}</div>
              </div>

              {/* Document Attachment in Modal */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-amber-950 truncate">
                      {selectedItem.announcement.anexo_nome || 'despacho_oficial_minsa.pdf'}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Documento Oficial Regulamentar Anexado ({selectedItem.announcement.anexo_tamanho || '1.4 MB'})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    downloadAnnouncementDocument(selectedItem.announcement);
                    success(`A descarregar documento "${selectedItem.announcement.anexo_nome || 'documento_minsa.doc'}"...`);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Documento</span>
                </button>
              </div>

              {/* Responsible Signer input if not confirmed */}
              {!selectedItem.isRead && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <label className="block text-[11px] font-bold text-amber-950">
                    Nome do Responsável Técnico / Farmacêutico que confirma:
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Ex: Dra. Maria Antónia (Directora Técnica)"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-amber-300 font-bold text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-amber-800 leading-normal">
                    Ao confirmar, esta unidade atesta perante o Ministério da Saúde que tomou conhecimento integral do conteúdo desta circular e cumprirá as directrizes indicadas.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadAnnouncementDocument(selectedItem.announcement);
                    success(`A descarregar "${selectedItem.announcement.anexo_nome || 'documento_minsa.doc'}"...`);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Documento</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Fechar
                </button>

                {!selectedItem.isRead && (
                  <button
                    type="button"
                    onClick={() => handleConfirmRead(selectedItem.announcement)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Leitura Oficial</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
