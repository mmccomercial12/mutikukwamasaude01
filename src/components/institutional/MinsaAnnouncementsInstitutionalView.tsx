import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Radio,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Trash2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  Users,
  Eye,
  Info,
  Layers,
  Paperclip,
  UploadCloud,
} from 'lucide-react';
import { MinsaAnnouncement, MinsaAnnouncementCategory, MinsaAnnouncementPriority, HealthUnit } from '../../types';
import { supabaseData } from '../../services/supabase';
import { PROVINCES_ANGOLA } from '../../services/mockData';
import { useToast } from '../../context/ToastContext';
import { downloadAnnouncementDocument, formatFileSize } from '../../utils/minsaDocumentDownload';

interface MinsaAnnouncementsInstitutionalViewProps {
  onAnnouncementCreated?: () => void;
}

export const MinsaAnnouncementsInstitutionalView: React.FC<MinsaAnnouncementsInstitutionalViewProps> = ({
  onAnnouncementCreated,
}) => {
  const { success, error, info } = useToast();

  const [announcements, setAnnouncements] = useState<MinsaAnnouncement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedTerritory, setSelectedTerritory] = useState<string>('all');

  // Modal State for New Announcement
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<MinsaAnnouncement | null>(null);

  // Form State
  const [formOficio, setFormOficio] = useState('');
  const [formTitulo, setFormTitulo] = useState('');
  const [formResumo, setFormResumo] = useState('');
  const [formConteudo, setFormConteudo] = useState('');
  const [formCategoria, setFormCategoria] = useState<MinsaAnnouncementCategory>('alerta_sanitario');
  const [formPrioridade, setFormPrioridade] = useState<MinsaAnnouncementPriority>('alta');
  const [formEmissor, setFormEmissor] = useState('Ministério da Saúde — Direcção Nacional de Medicamentos e Equipamentos (DNME)');
  const [formSignatario, setFormSignatario] = useState('Dr. Manuel dos Santos Chaves');
  const [formCargoSignatario, setFormCargoSignatario] = useState('Director Nacional da DNME / Inspecção Geral de Saúde');
  const [formAmbito, setFormAmbito] = useState('Nacional');
  const [formPublicoAlvo, setFormPublicoAlvo] = useState<string[]>(['todas']);
  const [formAnexoNome, setFormAnexoNome] = useState('despacho_oficial_minsa.pdf');
  const [formVigenciaFim, setFormVigenciaFim] = useState('2026-12-31');

  // File Upload State
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileDataUrl, setFormFileDataUrl] = useState<string | null>(null);
  const [formFilePreviewName, setFormFilePreviewName] = useState<string>('');
  const [formFileSize, setFormFileSize] = useState<string>('');
  const [formFileType, setFormFileType] = useState<string>('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Load announcements
  const loadData = () => {
    const list = supabaseData.getAnnouncements();
    setAnnouncements(list);
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
  }, []);

  // Filter announcements
  const filteredAnnouncements = announcements.filter((ann) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchOficio = ann.numero_oficio.toLowerCase().includes(q);
      const matchTitulo = ann.titulo.toLowerCase().includes(q);
      const matchResumo = ann.resumo.toLowerCase().includes(q);
      const matchSignatario = ann.signatario.toLowerCase().includes(q);
      if (!matchOficio && !matchTitulo && !matchResumo && !matchSignatario) {
        return false;
      }
    }

    if (selectedCategory !== 'all' && ann.categoria !== selectedCategory) {
      return false;
    }

    if (selectedPriority !== 'all' && ann.prioridade !== selectedPriority) {
      return false;
    }

    if (selectedTerritory !== 'all' && ann.ambito_territorial.toLowerCase() !== selectedTerritory.toLowerCase()) {
      return false;
    }

    return true;
  });

  // Category Badges & Names
  const getCategoryMeta = (cat: MinsaAnnouncementCategory) => {
    switch (cat) {
      case 'alerta_sanitario':
        return { label: 'Alerta Sanitário', bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: AlertTriangle };
      case 'recolha_lote':
        return { label: 'Recolha de Lote', bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: ShieldAlert };
      case 'circular_normativa':
        return { label: 'Circular Normativa', bg: 'bg-blue-50 text-blue-800 border-blue-200', icon: FileText };
      case 'farmacovigilancia':
        return { label: 'Farmacovigilância', bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: ShieldCheck };
      case 'directriz_clinica':
        return { label: 'Directriz Clínica', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
      default:
        return { label: 'Comunicado Geral', bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Info };
    }
  };

  const getPriorityBadge = (prio: MinsaAnnouncementPriority) => {
    switch (prio) {
      case 'critica_urgente':
        return { label: 'Urgência Máxima / Crítica', bg: 'bg-rose-600 text-white', dot: 'bg-white animate-ping' };
      case 'alta':
        return { label: 'Prioridade Alta', bg: 'bg-amber-600 text-white', dot: 'bg-white' };
      default:
        return { label: 'Ordinário', bg: 'bg-slate-600 text-white', dot: 'bg-slate-300' };
    }
  };

  const handleOpenNewModal = () => {
    // Generate next sequential reference
    const nextNum = Math.floor(Math.random() * 80) + 25;
    setFormOficio(`CIRCULAR-MINSA-DNME-Nº 0${nextNum}/2026`);
    setFormTitulo('');
    setFormResumo('');
    setFormConteudo('');
    setFormCategoria('alerta_sanitario');
    setFormPrioridade('alta');
    setFormAmbito('Nacional');
    setFormPublicoAlvo(['todas']);
    setFormAnexoNome(`despacho_minsa_0${nextNum}_2026.pdf`);
    setFormFile(null);
    setFormFileDataUrl(null);
    setFormFilePreviewName('');
    setFormFileSize('');
    setFormFileType('');
    setIsDraggingFile(false);
    setIsNewModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      error('O ficheiro ultrapassa o limite máximo de 25 MB.');
      return;
    }
    setFormFile(file);
    setFormFilePreviewName(file.name);
    setFormFileSize(formatFileSize(file.size));
    setFormFileType(file.type || 'application/pdf');
    setFormAnexoNome(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setFormFileDataUrl(reader.result as string);
      success(`Documento "${file.name}" anexado com sucesso!`);
    };
    reader.onerror = () => {
      error('Falha ao processar o ficheiro anexado.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFormFile(null);
    setFormFileDataUrl(null);
    setFormFilePreviewName('');
    setFormFileSize('');
    setFormFileType('');
    setFormAnexoNome('despacho_oficial_minsa.pdf');
    info('Anexo removido.');
  };

  const handleSubmitNewAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitulo.trim() || !formConteudo.trim()) {
      error('Por favor preencha o título e o conteúdo oficial do comunicado.');
      return;
    }

    const created = supabaseData.createAnnouncement({
      numero_oficio: formOficio || `CIRCULAR-MINSA-DNME-Nº 0${Date.now().toString().slice(-2)}/2026`,
      titulo: formTitulo.trim(),
      resumo: formResumo.trim() || formTitulo.trim().slice(0, 140),
      conteudo: formConteudo.trim(),
      categoria: formCategoria,
      prioridade: formPrioridade,
      emissor: formEmissor,
      signatario: formSignatario,
      cargo_signatario: formCargoSignatario,
      data_publicacao: new Date().toISOString().split('T')[0],
      data_vigencia_fim: formVigenciaFim,
      ambito_territorial: formAmbito,
      publico_alvo: formPublicoAlvo as any,
      anexo_nome: formFile ? formFile.name : (formAnexoNome.trim() || 'despacho_oficial_minsa.pdf'),
      anexo_tamanho: formFile ? formFileSize : '1.4 MB',
      anexo_url: formFileDataUrl || undefined,
      anexo_tipo: formFileType || (formFile?.type) || 'application/pdf',
    });

    setIsNewModalOpen(false);
    loadData();
    success(`Comunicado oficial "${created.numero_oficio}" publicado com sucesso! Foi transmitido para todas as unidades activas do país.`);
    if (onAnnouncementCreated) onAnnouncementCreated();
  };

  const handleDeleteAnnouncement = (id: string, oficio: string) => {
    if (window.confirm(`Tem a certeza que deseja revogar / eliminar o comunicado oficial "${oficio}"?`)) {
      supabaseData.deleteAnnouncement(id);
      loadData();
      success(`Comunicado "${oficio}" revogado com sucesso.`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Institutional Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E3B] via-[#102B52] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-lg border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-amber-300 border border-white/10">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Gabinete de Comunicação Regulamentar & Farmacovigilância DNME</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Comunicados, Circulares & Informações Oficiais do MINSA
            </h2>
            <p className="text-xs lg:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Emita despachos com valor regulamentar vinculativo. Todas as publicações são transmitidas
              directamente para o painel de gestão das farmácias, depósitos grossistas, hospitais e clínicas
              em Angola, com rastreio digital compulsório de confirmação de leitura.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenNewModal}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Emitir Novo Comunicado Oficial</span>
            </button>
          </div>
        </div>

        {/* 4 Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-slate-300 text-xs font-medium">Total de Circulares Emitidas</div>
            <div className="mt-1 text-2xl font-black text-white">{announcements.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Activas na rede sanitária</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-rose-300 text-xs font-medium">Alertas / Recolhas Críticas</div>
            <div className="mt-1 text-2xl font-black text-rose-400">
              {announcements.filter((a) => a.prioridade === 'critica_urgente').length}
            </div>
            <div className="text-[11px] text-rose-200/70 mt-0.5">Cumprimento imediato</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-emerald-300 text-xs font-medium">Leituras Confirmadas</div>
            <div className="mt-1 text-2xl font-black text-emerald-400">
              {announcements.reduce((acc, a) => acc + (a.confirmacoes_leitura?.length || 0), 0)}
            </div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">Assinaturas técnicas pelas unidades</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="text-sky-300 text-xs font-medium">Âmbito de Cobertura</div>
            <div className="mt-1 text-2xl font-black text-sky-400">100%</div>
            <div className="text-[11px] text-sky-200/70 mt-0.5">Transmissão em tempo real</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Query */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nº de ofício, assunto, signatário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              <option value="alerta_sanitario">Alertas Sanitários</option>
              <option value="recolha_lote">Recolhas Preventivas de Lote</option>
              <option value="circular_normativa">Circulares Normativas</option>
              <option value="farmacovigilancia">Farmacovigilância</option>
              <option value="directriz_clinica">Directrizes Clínicas</option>
              <option value="comunicado_geral">Comunicados Gerais</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="critica_urgente">Crítica / Urgência Máxima</option>
              <option value="alta">Prioridade Alta</option>
              <option value="normal">Ordinário / Normal</option>
            </select>
          </div>

          {/* Territory Filter */}
          <div>
            <select
              value={selectedTerritory}
              onChange={(e) => setSelectedTerritory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Âmbito Territorial: Todos</option>
              <option value="Nacional">Âmbito Nacional</option>
              {PROVINCES_ANGOLA.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div>
            A apresentar <strong className="text-slate-900 font-bold">{filteredAnnouncements.length}</strong> comunicados
          </div>
          {(searchQuery || selectedCategory !== 'all' || selectedPriority !== 'all' || selectedTerritory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedPriority('all');
                setSelectedTerritory('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Nenhum comunicado encontrado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Não existem despachos ou circulares correspondentes aos filtros aplicados.
            </p>
          </div>
        )}

        {filteredAnnouncements.map((ann) => {
          const catMeta = getCategoryMeta(ann.categoria);
          const prioMeta = getPriorityBadge(ann.prioridade);
          const CatIcon = catMeta.icon;
          const readCount = ann.confirmacoes_leitura?.length || 0;

          return (
            <div
              key={ann.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition-all space-y-4"
            >
              {/* Header: Office Number & Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-slate-900 text-white tracking-wide">
                    {ann.numero_oficio}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${catMeta.bg}`}
                  >
                    <CatIcon className="w-3 h-3" />
                    <span>{catMeta.label}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${prioMeta.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${prioMeta.dot}`} />
                    <span>{prioMeta.label}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Publicado em <strong>{ann.data_publicacao}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Âmbito: <strong className="text-slate-700">{ann.ambito_territorial}</strong></span>
                </div>
              </div>

              {/* Title & Summary */}
              <div className="space-y-2">
                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {ann.titulo}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  {ann.resumo}
                </p>
              </div>

              {/* Signer & Scope details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                <div>
                  <span className="text-slate-400 block text-[10px]">Entidade Emissora:</span>
                  <span className="font-bold text-slate-800">{ann.emissor}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Signatário Oficial:</span>
                  <span className="font-bold text-slate-800">{ann.signatario}</span>
                  <span className="text-slate-500 block text-[10px]">{ann.cargo_signatario}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Público Alvo Obrigatório:</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {ann.publico_alvo.join(', ')}
                  </span>
                </div>
              </div>

              {/* Reading Confirmations Banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-900 font-bold">
                    {readCount} {readCount === 1 ? 'estabelecimento confirmou' : 'estabelecimentos confirmaram'} a recepção e conformidade desta directriz
                  </span>
                </div>

                {readCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedAnnouncement(ann);
                      setIsDetailModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                  >
                    Ver assinaturas ({readCount})
                  </button>
                )}
              </div>

              {/* Document Attachment & Download Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0 shadow-xs">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate text-[11px]">
                      {ann.anexo_nome || 'documento_oficial_minsa.pdf'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Documento Oficial Anexo • {ann.anexo_tamanho || '1.4 MB'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    downloadAnnouncementDocument(ann);
                    success(`A descarregar "${ann.anexo_nome || 'documento_minsa.doc'}"...`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xs transition-all cursor-pointer shrink-0"
                  title="Descarregar ficheiro anexo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Documento</span>
                </button>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedAnnouncement(ann);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0B1E3B] hover:bg-[#102B52] text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Despacho Integral</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    title="Imprimir certidão do despacho"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteAnnouncement(ann.id, ann.numero_oficio)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Revogar / Excluir comunicado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NEW OFFICIAL ANNOUNCEMENT */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Emitir Comunicado Oficial / Circular MINSA
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Direcção Nacional de Medicamentos e Equipamentos (DNME)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewAnnouncement} className="space-y-4 text-xs">
              {/* Reference & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Número de Ofício / Registo Ministerial:
                  </label>
                  <input
                    type="text"
                    required
                    value={formOficio}
                    onChange={(e) => setFormOficio(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nível de Urgência:
                  </label>
                  <select
                    value={formPrioridade}
                    onChange={(e) => setFormPrioridade(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="critica_urgente">Crítica / Urgência Máxima (Notificação Compulsória)</option>
                    <option value="alta">Prioridade Alta (Prazo até 48h)</option>
                    <option value="normal">Ordinário (Cumprimento Regular)</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Título / Assunto Principal:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alerta de Farmacovigilância: Recolha Preventiva do Lote..."
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Category, Territory & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Categoria:
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="alerta_sanitario">Alerta Sanitário</option>
                    <option value="recolha_lote">Recolha de Lote</option>
                    <option value="circular_normativa">Circular Normativa</option>
                    <option value="farmacovigilancia">Farmacovigilância</option>
                    <option value="directriz_clinica">Directriz Clínica</option>
                    <option value="comunicado_geral">Comunicado Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Âmbito Territorial:
                  </label>
                  <select
                    value={formAmbito}
                    onChange={(e) => setFormAmbito(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="Nacional">Nacional (Todo o País)</option>
                    {PROVINCES_ANGOLA.map((p) => (
                      <option key={p} value={p}>
                        Província de {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Data Limite / Vigência:
                  </label>
                  <input
                    type="date"
                    value={formVigenciaFim}
                    onChange={(e) => setFormVigenciaFim(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Resumo Executivo (Exibido nas notificações):
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Breve descrição da medida sanitária a implementar..."
                  value={formResumo}
                  onChange={(e) => setFormResumo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Texto Integral do Despacho / Directriz:
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Descreva as instruções normativas, orientações técnicas, penalidades e procedimentos obrigatórios..."
                  value={formConteudo}
                  onChange={(e) => setFormConteudo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Signer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Signatário Oficial:
                  </label>
                  <input
                    type="text"
                    value={formSignatario}
                    onChange={(e) => setFormSignatario(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cargo do Signatário:
                  </label>
                  <input
                    type="text"
                    value={formCargoSignatario}
                    onChange={(e) => setFormCargoSignatario(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Document Attachment Upload Field */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Anexar Documento Oficial (PDF, Word, Imagem ou Ficha Técnica):
                  </label>
                  {formFile ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Documento Carregado
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">
                      Opcional (As unidades poderão descarregá-lo)
                    </span>
                  )}
                </div>

                {!formFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) processFile(file);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer ${
                      isDraggingFile
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-300'
                        : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 hover:border-slate-300'
                    }`}
                    onClick={() => document.getElementById('minsa-file-upload-input')?.click()}
                  >
                    <input
                      id="minsa-file-upload-input"
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
                        <UploadCloud className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        Clique para anexar documento ou arraste o ficheiro para aqui
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Formatos aceites: <strong>PDF, Word (.doc/.docx), Imagens ou Planilhas</strong> (Até 25 MB)
                      </div>
                      <div className="text-[10px] text-slate-400 italic mt-0.5">
                        As unidades de saúde poderão descarregar este ficheiro directamente nos seus respectivos painéis.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                        <Paperclip className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-amber-950 truncate">
                          {formFilePreviewName}
                        </div>
                        <div className="text-[11px] text-amber-800 flex items-center gap-2">
                          <span>Tamanho: <strong>{formFileSize}</strong></span>
                          <span>•</span>
                          <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 font-bold">
                            {formFileType.split('/')[1] || 'Ficheiro'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (formFileDataUrl) {
                            const a = document.createElement('a');
                            a.href = formFileDataUrl;
                            a.download = formFilePreviewName;
                            a.click();
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Verificar anexo"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Descarregar</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Remover anexo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publicar e Transmitir às Unidades</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ANNOUNCEMENT DETAIL & READ RECEIPTS */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-800 font-mono font-black text-xs shrink-0">
                  MINSA
                </div>
                <div>
                  <span className="font-mono font-black text-xs text-blue-900 block">
                    {selectedAnnouncement.numero_oficio}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Documento Oficial Vinculativo
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <h3 className="text-base font-black text-slate-900">
                {selectedAnnouncement.titulo}
              </h3>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-line text-xs font-normal">
                {selectedAnnouncement.conteudo}
              </div>

              <div className="p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-[11px] space-y-1">
                <div><strong>Emissor:</strong> {selectedAnnouncement.emissor}</div>
                <div><strong>Signatário:</strong> {selectedAnnouncement.signatario} ({selectedAnnouncement.cargo_signatario})</div>
                <div><strong>Data de Publicação:</strong> {selectedAnnouncement.data_publicacao}</div>
                <div><strong>Âmbito:</strong> {selectedAnnouncement.ambito_territorial}</div>
              </div>

              {/* Document Attachment in Detail Modal */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-amber-950 truncate">
                      {selectedAnnouncement.anexo_nome || 'despacho_oficial_minsa.pdf'}
                    </div>
                    <div className="text-[11px] text-amber-800">
                      Documento Oficial Anexo ({selectedAnnouncement.anexo_tamanho || '1.4 MB'})
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    downloadAnnouncementDocument(selectedAnnouncement);
                    success(`A descarregar "${selectedAnnouncement.anexo_nome || 'documento_minsa.doc'}"...`);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Documento</span>
                </button>
              </div>

              {/* Read Receipts List */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Assinaturas de Recepção & Conformidade ({selectedAnnouncement.confirmacoes_leitura?.length || 0})
                  </span>
                </h4>

                {(!selectedAnnouncement.confirmacoes_leitura || selectedAnnouncement.confirmacoes_leitura.length === 0) ? (
                  <p className="text-slate-400 italic text-[11px]">
                    Nenhuma unidade confirmou a leitura até ao momento. O aviso encontra-se activo nos painéis.
                  </p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {selectedAnnouncement.confirmacoes_leitura.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px]"
                      >
                        <div>
                          <div className="font-bold text-emerald-950">{rec.unidade_nome}</div>
                          <div className="text-emerald-700 text-[10px]">{rec.responsavel}</div>
                        </div>
                        <div className="text-right text-[10px] text-emerald-800">
                          {new Date(rec.data_leitura).toLocaleString('pt-AO')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Despacho</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
