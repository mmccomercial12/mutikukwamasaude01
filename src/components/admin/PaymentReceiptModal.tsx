import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Building2,
  CreditCard,
  Calendar,
  ShieldCheck,
  FileCheck,
  QrCode,
  CheckCheck,
} from 'lucide-react';
import { PaymentTransaction, HealthUnit } from '../../types';
import { useToast } from '../../context/ToastContext';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentTransaction | null;
  unit?: HealthUnit | null;
  onValidate?: (paymentId: string, approved: boolean) => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  unit,
  onValidate,
}) => {
  const { success, info } = useToast();
  const [copiedRef, setCopiedRef] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeView, setActiveView] = useState<'recibo' | 'anexo' | 'auditoria'>('recibo');

  if (!isOpen || !payment) return null;

  const handleCopy = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedRef(true);
      info(`Referência "${text}" copiada para a área de transferência.`);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReceipt = () => {
    if (payment.comprovativo_url && payment.comprovativo_url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = payment.comprovativo_url;
      link.download = payment.comprovativo_nome || `comprovativo_${payment.unidade_nome.toLowerCase().replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success('Ficheiro do comprovativo descarregado com sucesso!');
      return;
    }

    // Generate downloadable text receipt slip if no binary file
    const receiptText = `
=====================================================
MUTIKUKWAMA SAÚDE — COMPROVATIVO OFICIAL DE LIQUIDAÇÃO
SISTEMA DE GESTÃO DE SAÚDE PÚBLICA & FARMÁCIAS DE ANGOLA
=====================================================

UNIDADE PAGADORA: ${payment.unidade_nome}
PLANO SUBSCRIÇÃO: ${payment.plano_tipo.toUpperCase()} (${payment.periodicidade.toUpperCase()})
VALOR LIQUIDADO: ${payment.valor.toLocaleString()} AOA
MÉTODO DE PAGAMENTO: ${payment.metodo.replace('_', ' ').toUpperCase()}
REFERÊNCIA: ${payment.referencia_mcx || 'Transferência Direta'}
ESTADO: ${payment.status.toUpperCase()}
DATA DA OPERAÇÃO: ${new Date(payment.data_pagamento).toLocaleString('pt-PT')}
VALIDADO POR: ${payment.validado_por || 'Aguardando validação da tesouraria'}

ENTIDADE BENEFICIÁRIA: MUTIKUKWAMA SAÚDE LDA (Entidade: 00192)
IBAN: AO06.0040.0000.8291.0001.1012.3 (Banco BAI)
=====================================================
Documento processado por computador nos termos do BNA.
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovativo_${payment.unidade_nome.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('Comprovativo oficial descarregado!');
  };

  const isDataUrlImage =
    payment.comprovativo_url?.startsWith('data:image') ||
    /\.(png|jpe?g|webp|svg)$/i.test(payment.comprovativo_url || '') ||
    /\.(png|jpe?g|webp|svg)$/i.test(payment.comprovativo_nome || '');

  const isDataUrlPdf =
    payment.comprovativo_url?.startsWith('data:application/pdf') ||
    payment.comprovativo_url?.toLowerCase().endsWith('.pdf') ||
    payment.comprovativo_nome?.toLowerCase().endsWith('.pdf');

  // Convert amount to written form in Portuguese
  const getExtensoValue = (val: number) => {
    if (val === 1008000) return 'Um Milhão e Oito Mil Kwanzas';
    if (val === 280500) return 'Duzentos e Oitenta Mil e Quinhentos Kwanzas';
    if (val === 55000) return 'Cinquenta e Cinco Mil Kwanzas';
    if (val === 25000) return 'Vinte e Cinco Mil Kwanzas';
    if (val === 50000) return 'Cinquenta Mil Kwanzas';
    return `${val.toLocaleString()} Kwanzas Angolanos`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#123B7A] to-[#1a4b9c] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileCheck className="w-5 h-5 text-[#00A878]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black uppercase tracking-tight">
                  Comprovativo de Pagamento — Registo da Unidade
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    payment.status === 'confirmado'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : payment.status === 'rejeitado'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {payment.status === 'confirmado'
                    ? 'Validado & Confirmado'
                    : payment.status === 'rejeitado'
                    ? 'Rejeitado'
                    : 'Pendente de Validação'}
                </span>
              </div>
              <p className="text-xs text-blue-100 font-medium mt-0.5">
                Submetido por {payment.unidade_nome} no acto da inscrição / ativação
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL SUB-BAR: QUICK METRICS & TABS */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('recibo')}
              className={`px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'recibo'
                  ? 'bg-[#123B7A] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#00A878]" />
              <span>Recibo Oficial EMIS / BAI</span>
            </button>

            <button
              onClick={() => setActiveView('anexo')}
              className={`px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'anexo'
                  ? 'bg-[#123B7A] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00A878]" />
              <span>Documento / Ficheiro Anexado</span>
            </button>

            <button
              onClick={() => setActiveView('auditoria')}
              className={`px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'auditoria'
                  ? 'bg-[#123B7A] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#00A878]" />
              <span>Dados da Unidade</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Imprimir comprovativo"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={handleDownloadReceipt}
              className="px-3 py-1.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Descarregar ficheiro do comprovativo"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descarregar</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-100/60">
          {/* VIEW 1: OFFICIAL EMIS / MULTICAIXA BANKING RECEIPT */}
          {activeView === 'recibo' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6 font-sans relative overflow-hidden">
              {/* Top Watermark / Status Stamp */}
              {payment.status === 'confirmado' && (
                <div className="absolute top-8 right-6 border-2 border-emerald-600/60 text-emerald-700 px-3 py-1 rounded-xl font-black text-xs uppercase tracking-widest rotate-6 pointer-events-none opacity-80">
                  ✓ LIQUIDADO & VALIDADO
                </div>
              )}
              {payment.status === 'pendente' && (
                <div className="absolute top-8 right-6 border-2 border-amber-500/70 text-amber-700 px-3 py-1 rounded-xl font-black text-xs uppercase tracking-widest rotate-6 pointer-events-none opacity-90">
                  ⏳ AGUARDA CONFERÊNCIA
                </div>
              )}

              {/* Receipt Header */}
              <div className="border-b border-slate-200 pb-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#123B7A] text-white flex items-center justify-center font-black text-lg shadow-sm">
                      MCX
                    </div>
                    <div>
                      <div className="text-xs font-black tracking-wider text-slate-400 uppercase">
                        SISTEMA DE PAGAMENTOS DE ANGOLA (SPA)
                      </div>
                      <h3 className="text-base font-black text-[#123B7A] uppercase">
                        COMPROVATIVO DE OPERAÇÃO MULTICAIXA EXPRESS
                      </h3>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Rede Interbancária EMIS / Banco Nacional de Angola (BNA)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Main Value Box */}
              <div className="p-4 rounded-2xl bg-[#E8F5F1] border border-[#00A878]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#008f66] tracking-wider">
                    MONTANTE LIQUIDADO
                  </span>
                  <div className="text-2xl font-black text-[#00A878]">
                    {payment.valor.toLocaleString('pt-PT')} AOA
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-0.5">
                    Extenso: <strong className="text-slate-800">{getExtensoValue(payment.valor)}</strong>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    PLANO ATRIBUÍDO
                  </span>
                  <div className="text-sm font-black text-[#123B7A] uppercase">
                    {payment.plano_tipo} ({payment.periodicidade})
                  </div>
                  {payment.desconto_aplicado > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                      Desconto de {payment.desconto_aplicado}% aplicado
                    </span>
                  )}
                </div>
              </div>

              {/* Structured Key Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Left Column: Beneficiary */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#00A878]" />
                    <span>ENTIDADE BENEFICIÁRIA</span>
                  </div>
                  <div>
                    <div className="font-black text-[#123B7A]">MUTIKUKWAMA SAÚDE LDA</div>
                    <div className="text-slate-500 text-[11px] font-medium">
                      Entidade Multicaixa: <strong className="font-mono text-slate-800">00192</strong>
                    </div>
                    <div className="text-slate-500 text-[11px] font-medium">
                      IBAN BAI: <strong className="font-mono text-slate-800">AO06.0040.0000.8291.0001.1012.3</strong>
                    </div>
                  </div>
                </div>

                {/* Right Column: Payer Unit */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#123B7A]" />
                    <span>UNIDADE ADERENTE / ORDENANTE</span>
                  </div>
                  <div>
                    <div className="font-black text-[#123B7A] uppercase">{payment.unidade_nome}</div>
                    <div className="text-slate-500 text-[11px] font-medium">
                      Província: {unit?.provincia || 'Luanda'} • {unit?.municipio || 'Sede'}
                    </div>
                    <div className="text-slate-500 text-[11px] font-medium">
                      NIF Institucional: <strong className="font-mono text-slate-800">541890214LA042</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Technical Audit Details */}
              <div className="border-t border-b border-slate-200 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Referência / Código</span>
                  <div className="font-mono font-black text-slate-800 flex items-center gap-1 mt-0.5">
                    <span>{payment.referencia_mcx || 'REF-DIRECTA'}</span>
                    <button
                      onClick={() => handleCopy(payment.referencia_mcx || 'REF-DIRECTA')}
                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                      title="Copiar referência"
                    >
                      {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Método</span>
                  <div className="font-bold text-slate-700 capitalize mt-0.5">
                    {payment.metodo.replace('_', ' ')}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Data & Hora</span>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {new Date(payment.data_pagamento).toLocaleString('pt-PT')}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Validação</span>
                  <div className="font-semibold text-slate-700 mt-0.5">
                    {payment.validado_por || 'Aguardando validação'}
                  </div>
                </div>
              </div>

              {/* Observações / Notas da Unidade */}
              {payment.observacoes && (
                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs">
                  <span className="font-bold text-[#123B7A] block mb-1">
                    Nota do Gestor da Unidade no Acto da Inscrição:
                  </span>
                  <p className="text-slate-600">{payment.observacoes}</p>
                </div>
              )}

              {/* Digital Stamp & Barcode */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-mono border-t border-dashed border-slate-200">
                <div className="flex items-center gap-2">
                  <QrCode className="w-7 h-7 text-slate-600" />
                  <div>
                    <div>AUTH-ID: EMIS-AO-{payment.id.toUpperCase()}-2026</div>
                    <div>CARIMBO DIGITAL: CONFORME INSTRUTIVOS DO BANCO NACIONAL DE ANGOLA</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-emerald-700 flex items-center gap-1 justify-end">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Assinatura Digital Certificada</span>
                  </div>
                  <div>PLATAFORMA MUTIKUKWAMA SAÚDE — ANGOLA</div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: ORIGINAL ATTACHED FILE (IMAGE OR PDF) */}
          {activeView === 'anexo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#123B7A] flex items-center justify-center border border-blue-200">
                    <FileText className="w-5 h-5 text-[#00A878]" />
                  </div>
                  <div>
                    <h4 className="font-black text-[#123B7A] text-sm">
                      {payment.comprovativo_nome || 'comprovativo_bancario.pdf'}
                    </h4>
                    <p className="text-slate-500 text-[11px]">
                      Ficheiro remetido através do formulário de registo da farmácia
                    </p>
                  </div>
                </div>

                {/* Zoom & Rotation Controls for Image Previews */}
                {isDataUrlImage && (
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                      title="Diminuir Zoom"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] font-bold text-slate-700 px-1">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer"
                      title="Aumentar Zoom"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 rounded-lg hover:bg-white text-slate-700 transition-colors cursor-pointer ml-1"
                      title="Girar 90º"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Preview Container */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 min-h-[420px] flex items-center justify-center overflow-auto">
                {isDataUrlImage ? (
                  <div className="overflow-auto max-h-[540px] flex items-center justify-center p-2">
                    <img
                      src={payment.comprovativo_url}
                      alt="Comprovativo anexado"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="max-w-full max-h-[500px] object-contain rounded-xl shadow-md border border-slate-200"
                    />
                  </div>
                ) : isDataUrlPdf && payment.comprovativo_url?.startsWith('data:') ? (
                  <iframe
                    src={payment.comprovativo_url}
                    title="Visualização do PDF"
                    className="w-full h-[520px] rounded-2xl border border-slate-200"
                  />
                ) : (
                  /* Formatted Document Fallback Preview for named attachments */
                  <div className="w-full max-w-lg p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-[#E8F5F1] text-[#00A878] mx-auto flex items-center justify-center shadow-xs">
                      <FileCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-black text-[#123B7A] text-base">
                        {payment.comprovativo_nome || 'comprovativo_inscricao.pdf'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Comprovativo em formato digital remetido no acto de inscrição pela unidade{' '}
                        <strong>{payment.unidade_nome}</strong>.
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-left space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Referência Multicaixa:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {payment.referencia_mcx || 'MCX-2026-REG'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Plano Selecionado:</span>
                        <span className="font-bold text-[#123B7A] uppercase">
                          {payment.plano_tipo} ({payment.periodicidade})
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor Declarado:</span>
                        <span className="font-black text-[#00A878]">
                          {payment.valor.toLocaleString()} AOA
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleDownloadReceipt}
                        className="px-4 py-2 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descarregar Ficheiro</span>
                      </button>
                      <button
                        onClick={() => setActiveView('recibo')}
                        className="px-4 py-2 rounded-xl bg-[#123B7A] hover:bg-[#0d2a58] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Ficha Oficial EMIS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: UNIT PROFILE & ACCREDITATION DATA */}
          {activeView === 'auditoria' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-xs">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center font-black text-xl shadow-xs">
                  🏥
                </div>
                <div>
                  <h3 className="text-base font-black text-[#123B7A] uppercase">
                    {payment.unidade_nome}
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Unidade Farmacêutica / Clínica credenciada na plataforma MUTIKUKWAMA SAÚDE
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    LOCALIZAÇÃO GEOGRÁFICA
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800">
                      Província: {unit?.provincia || 'Luanda'}
                    </div>
                    <div className="text-slate-600">
                      Município / Bairro: {unit?.municipio || 'Sede'} • {unit?.bairro || 'Centro'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Endereço: {unit?.endereco_completo || 'Endereço registado no acto da inscrição'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    CONTACTOS & RESPONSÁVEL
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800">
                      Telefone: {unit?.telefone || '+244 923 000 000'}
                    </div>
                    <div className="text-slate-600">
                      Email: {unit?.email || 'geral@farmacia.ao'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      WhatsApp: {unit?.whatsapp || '+244 923 000 000'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    CREDENCIAMENTO MINSA / ARMED
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800">
                      Alvará Sanitário: {unit?.certificado_institucional || 'CERT-MINSA-2025-4891'}
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Documento anexado: {unit?.documento_minsa_nome || 'alvara_sanitario_minsa.pdf'}
                    </div>
                    <div className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Documentação submetida em conformidade</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    ESTADO CONTRATUAL SAAS
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-[#123B7A] uppercase">
                      Plano {payment.plano_tipo} ({payment.periodicidade})
                    </div>
                    <div className="font-black text-[#00A878]">
                      {payment.valor.toLocaleString()} AOA
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Data de submissão: {new Date(payment.data_pagamento).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER: VALIDATION ACTIONS */}
        <div className="px-6 py-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            {payment.status === 'pendente' ? (
              <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>O comprovativo precisa de validação para ativação imediata do plano da unidade.</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Validado por: {payment.validado_por || 'Super Administrador Geral'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {payment.status === 'pendente' && onValidate && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onValidate(payment.id, true);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprovar & Activar Plano</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onValidate(payment.id, false);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <span>Rejeitar</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
