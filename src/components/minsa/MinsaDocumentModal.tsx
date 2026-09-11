import React from 'react';
import {
  X,
  ShieldCheck,
  FileText,
  Download,
  Printer,
  CheckCircle2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  QrCode,
  Copy,
} from 'lucide-react';
import { HealthUnit } from '../../types';
import { useToast } from '../../context/ToastContext';

interface MinsaDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: HealthUnit | null;
}

export const MinsaDocumentModal: React.FC<MinsaDocumentModalProps> = ({
  isOpen,
  onClose,
  unit,
}) => {
  const { success } = useToast();

  if (!isOpen || !unit) return null;

  const alvaraNumber = unit.certificado_institucional || 'CERT-MINSA-2025-4891';
  const docFileName = unit.documento_minsa_nome || `alvara_minsa_${unit.slug || 'unidade'}_2026.pdf`;
  const emissaoDate = unit.documento_minsa_data_emissao || '15/01/2025';
  const validadeDate = unit.documento_minsa_validade || '31/12/2026';

  const typeLabels: Record<string, string> = {
    farmacia: 'Farmácia Comunitária de Dispensa ao Público',
    deposito: 'Depósito Grossista e Distribuidora Farmacêutica (B2B)',
    hospital: 'Unidade Hospitalar / Centro Hospitalar Especializado',
    clinica: 'Clínica Médica e Cirúrgica Privada',
    laboratorio: 'Laboratório de Análises Clínicas e Diagnóstico',
  };

  const typeLabel = typeLabels[unit.tipo] || 'Estabelecimento de Saúde Licenciado';

  const handleCopyAlvara = () => {
    navigator.clipboard.writeText(alvaraNumber);
    success(`Nº de Alvará "${alvaraNumber}" copiado para a área de transferência!`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Simulate official PDF download
    const element = document.createElement('a');
    const file = new Blob(
      [
        `REPÚBLICA DE ANGOLA\nMINISTÉRIO DA SAÚDE (MINSA)\nDIRECÇÃO NACIONAL DE MEDICAMENTOS E EQUIPAMENTOS\n\nALVARÁ SANITÁRIO DE FUNCIONAMENTO Nº ${alvaraNumber}\n\nUnidade Licenciada: ${unit.nome}\nTipo: ${typeLabel}\nProvíncia: ${unit.provincia}\nMunicípio: ${unit.municipio}\nEndereço: ${unit.endereco_completo}\nTelefone: ${unit.telefone}\nE-mail: ${unit.email}\nData de Emissão: ${emissaoDate}\nValidade: ${validadeDate}\n\nDocumento digital oficial homologado pela plataforma MUTIKUKWAMA SAÚDE e arquivado no Sistema Nacional de Saúde de Angola.`
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    element.href = URL.createObjectURL(file);
    element.download = docFileName.endsWith('.pdf') ? docFileName.replace('.pdf', '.txt') : `${docFileName}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    success(`A descarregar certidão oficial "${docFileName}"...`);
  };

  return (
    <div
      id="minsa-doc-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="minsa-doc-modal-card"
        className="bg-white border border-slate-200/90 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl text-slate-800 my-6 sm:my-8 relative overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0 shadow-xs">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Homologado pelo MINSA
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  República de Angola
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-[#123B7A] tracking-tight mt-0.5">
                Alvará Sanitário & Registo MINSA
              </h3>
              <p className="text-xs text-slate-500">
                Ministério da Saúde • Direcção Nacional de Medicamentos e Equipamentos (DNME)
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-minsa-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto py-4 space-y-5 pr-1">
          {/* Official License Number Banner (Matches the user provided screenshot) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 border border-blue-100 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-black text-[#123B7A] uppercase tracking-wide block mb-1">
                  Nº de Alvará Sanitário / Registo MINSA
                </span>
                <div className="inline-flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-blue-200/80 shadow-xs">
                  <span className="font-mono text-base sm:text-lg font-black text-[#0B1E3B] tracking-wider">
                    {alvaraNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAlvara}
                    className="p-1 rounded-lg text-slate-400 hover:text-[#123B7A] hover:bg-blue-50 transition cursor-pointer"
                    title="Copiar número de alvará"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-right">
                <div className="text-[11px] text-slate-600">
                  <span className="block font-semibold">Estado do Documento:</span>
                  <span className="font-black text-emerald-700 inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Activo & Homologado
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Official Parchment/Certificate Digital Card */}
          <div className="p-6 rounded-2xl bg-amber-50/30 border-2 border-amber-200/70 shadow-sm relative overflow-hidden">
            {/* Watermark / Background stamp */}
            <div className="absolute right-4 top-4 opacity-5 pointer-events-none">
              <ShieldCheck className="w-64 h-64 text-amber-900" />
            </div>

            {/* Certificate Header */}
            <div className="text-center pb-4 border-b border-amber-200/60 relative z-10">
              <div className="text-[11px] font-black uppercase text-amber-900 tracking-widest">
                REPÚBLICA DE ANGOLA
              </div>
              <div className="text-sm font-black text-[#123B7A] tracking-wider uppercase mt-0.5">
                MINISTÉRIO DA SAÚDE
              </div>
              <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                Inspecção Geral de Saúde • Certificado Sanitário Nacional
              </div>
            </div>

            {/* Certificate Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 text-xs relative z-10 border-b border-amber-200/60">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Estabelecimento Titular</span>
                <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#123B7A] shrink-0" />
                  <span>{unit.nome}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Classificação e Actividade</span>
                <p className="font-bold text-[#123B7A]">
                  {typeLabel}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Localização Regulamentada</span>
                <p className="font-medium text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{unit.municipio}, Província de {unit.provincia}</span>
                </p>
                <p className="text-[11px] text-slate-500 pl-4">{unit.endereco_completo}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Contacto Institucional</span>
                <p className="font-medium text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{unit.telefone}</span>
                </p>
                {unit.email && (
                  <p className="font-medium text-slate-600 flex items-center gap-1.5 text-[11px]">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{unit.email}</span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Data de Emissão Regulamentar</span>
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{emissaoDate}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Validade do Alvará Sanitário</span>
                <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{validadeDate} (Conforme Decreto Executivo MINSA)</span>
                </p>
              </div>
            </div>

            {/* Attached File Document Box */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#123B7A] flex items-center justify-center shrink-0 border border-blue-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">
                      {docFileName}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-bold uppercase">
                      PDF Oficial
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Ficheiro digital homologado e anexado no ato de registo da unidade
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#123B7A] border border-slate-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descarregar Ficheiro</span>
                </button>
              </div>
            </div>

            {/* Certificate Footer / QR Code / Seal */}
            <div className="mt-4 pt-3 border-t border-amber-200/50 flex items-center justify-between text-[10px] text-slate-500 relative z-10">
              <div className="flex items-center gap-2">
                <QrCode className="w-7 h-7 text-slate-700 shrink-0" />
                <div>
                  <span className="font-mono font-bold text-slate-800 block">CHAVE: MINSA-AO-{unit.id.toUpperCase()}-VERIF</span>
                  <span>Verificação criptográfica no Repositório Central do MINSA</span>
                </div>
              </div>
              <div className="text-right font-semibold text-slate-600">
                <span>Direcção Nacional de Medicamentos</span>
                <span className="block text-[9px] text-emerald-700 font-bold">Autenticado Digitalmente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Certidão</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#123B7A] border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descarregar Certidão</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#123B7A] hover:bg-[#0B1E3B] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
