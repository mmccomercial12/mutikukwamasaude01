import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Pill,
  Loader2,
  HelpCircle,
  Building2,
  MapPin,
} from 'lucide-react';
import { processPrescriptionWithAI } from '../../services/geminiPrescription';
import { AIPrescriptionResult, AIPrescriptionExtractedItem } from '../../types';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { supabaseData } from '../../services/supabase';

interface PrescriptionAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSearch: (query: string) => void;
}

export const PrescriptionAIModal: React.FC<PrescriptionAIModalProps> = ({
  isOpen,
  onClose,
  onNavigateSearch,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textNotes, setTextNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<AIPrescriptionResult | null>(null);

  const { addItem } = useCart();
  const { success, error, warning } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAiResult(null);
    }
  };

  const handleLoadDemoSample = (sampleType: 'malaria' | 'infection') => {
    // Generate simulated prescription image representation
    setPreviewUrl(
      sampleType === 'malaria'
        ? 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80'
    );
    setSelectedFile(null);
    setTextNotes(
      sampleType === 'malaria'
        ? 'Prescrição Clínica: Coartem 20/120mg (tomar conforme posologia) + Paracetamol 500mg se febre > 38.5C'
        : 'Prescrição Consulta Externa: Amoxicilina 875mg + Ácido Clavulânico 125mg (1 comp de 12 em 12 horas por 7 dias)'
    );
    setAiResult(null);
  };

  const handleProcessPrescription = async () => {
    if (!selectedFile && !previewUrl && !textNotes) {
      warning('Por favor carregue uma foto da receita ou utilize um exemplo de demonstração.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processPrescriptionWithAI(selectedFile || previewUrl || '', textNotes);
      setAiResult(result);
      success('Receita analisada com sucesso pelo modelo de IA da MUTIKUKWAMA.');
    } catch (err: any) {
      console.error(err);
      error('Ocorreu um erro ao processar a imagem da receita.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddExtractedItemToCart = (item: AIPrescriptionExtractedItem) => {
    if (!item.matched_product) {
      warning(`O medicamento ${item.name} não foi encontrado em stock direto. Redirecionando para a busca geral.`);
      onNavigateSearch(item.name);
      onClose();
      return;
    }

    const unit = supabaseData.getUnitById(item.matched_product.unidade_id);
    addItem({
      item_id: item.matched_product.id,
      tipo_item: item.matched_product.categoria,
      nome: item.matched_product.nome,
      preco: item.matched_product.preco,
      quantidade: 1,
      unidade_id: item.matched_product.unidade_id,
      unidade_nome: unit?.nome || 'Farmácia',
    });
  };

  const handleAddAllAvailableToCart = () => {
    if (!aiResult || !aiResult.items) return;
    let addedCount = 0;
    aiResult.items.forEach((item) => {
      if (item.matched_product) {
        const unit = supabaseData.getUnitById(item.matched_product.unidade_id);
        const ok = addItem({
          item_id: item.matched_product.id,
          tipo_item: item.matched_product.categoria,
          nome: item.matched_product.nome,
          preco: item.matched_product.preco,
          quantidade: 1,
          unidade_id: item.matched_product.unidade_id,
          unidade_nome: unit?.nome || 'Farmácia',
        });
        if (ok) addedCount++;
      }
    });

    if (addedCount > 0) {
      success(`${addedCount} itens da receita foram adicionados ao seu carrinho!`);
    } else {
      warning('Nenhum item com correspondência de stock imediata pôde ser adicionado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white border border-gray-100 rounded-[32px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-gray-800 animate-in zoom-in-95 my-8 max-h-[90vh] flex flex-col justify-between overflow-y-auto">
        {/* Modal Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-[#00A878]" />
              </div>
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-[#E8F5F1] text-[#00A878] text-[10px] font-black rounded-full uppercase tracking-wider mb-1">
                  Visão Computacional IA
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  Leitor de Receita Médica
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Digitalização inteligente para identificação instantânea de medicamentos em Angola
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Area & Controls */}
          {!aiResult ? (
            <div className="mt-6 space-y-5">
              {/* Dropzone */}
              <label
                htmlFor="prescription-upload-input"
                className="border-2 border-dashed border-gray-200 hover:border-[#00A878] rounded-[24px] p-6 text-center cursor-pointer bg-gray-50 hover:bg-gray-100/70 transition-all flex flex-col items-center justify-center gap-3 group"
              >
                {previewUrl ? (
                  <div className="relative w-full max-h-48 overflow-hidden rounded-2xl border border-gray-200">
                    <img
                      src={previewUrl}
                      alt="Pré-visualização da receita"
                      className="w-full h-48 object-cover rounded-2xl"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-black uppercase tracking-wider text-white bg-[#123B7A] px-4 py-2 rounded-xl shadow-md">
                        Alterar Fotografia
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-[#123B7A] uppercase tracking-tight">
                        Tire uma foto ou carregue a receita médica
                      </div>
                      <div className="text-xs text-gray-500 font-medium mt-0.5">
                        Suporta ficheiros JPG, PNG, WEBP ou PDF clínico
                      </div>
                    </div>
                  </>
                )}
                <input
                  id="prescription-upload-input"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Demo Pre-load buttons for testing */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                <span className="text-gray-600 font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#123B7A]" /> Testar com exemplo rápido:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadDemoSample('malaria')}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-[#123B7A] font-bold text-xs border border-gray-200 shadow-sm transition-colors"
                  >
                    Coartem / Malária
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadDemoSample('infection')}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-[#123B7A] font-bold text-xs border border-gray-200 shadow-sm transition-colors"
                  >
                    Amoxicilina
                  </button>
                </div>
              </div>

              {/* Action Submit */}
              <button
                type="button"
                onClick={handleProcessPrescription}
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>A processar com Inteligência Artificial...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-200" />
                    <span>Analisar e Localizar nas Farmácias</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Results Presentation */
            <div className="mt-6 space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#E8F5F1] border border-[#00A878]/30 text-[#00A878] text-xs font-bold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00A878] shrink-0" />
                  <span>Identificados <strong>{aiResult.items.length}</strong> itens prescritos</span>
                </div>
                <button
                  onClick={() => setAiResult(null)}
                  className="text-[11px] text-[#123B7A] hover:underline font-black uppercase"
                >
                  Nova Receita
                </button>
              </div>

              {/* Extracted Items List */}
              <div className="space-y-3">
                {aiResult.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-[#00A878]" />
                        <span className="font-black text-[#123B7A] uppercase text-sm">{item.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-[#123B7A] font-bold">
                          {Math.round(item.confidence * 100)}% confiança
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-medium">
                        <strong>Posologia:</strong> {item.dosage || 'Conforme indicação médica'}
                      </div>
                      {item.matched_product ? (
                        <div className="text-xs text-[#00A878] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Em stock na {item.matched_product.unidade_nome} — <strong>{item.matched_product.preco.toLocaleString()} AOA</strong></span>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-600 flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Sem correspondência de stock imediata</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {item.matched_product ? (
                        <button
                          onClick={() => handleAddExtractedItemToCart(item)}
                          className="px-4 py-2 rounded-xl bg-[#123B7A] hover:bg-[#0d2a59] text-white font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-sm"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onNavigateSearch(item.name);
                            onClose();
                          }}
                          className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-[#123B7A] text-xs font-black uppercase tracking-wider"
                        >
                          Buscar Alternativas
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bulk Add Button */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={handleAddAllAvailableToCart}
                  className="w-full py-3.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Adicionar Itens Disponíveis ao Carrinho</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mandatory Health Disclaimer */}
        <div className="mt-6 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-4 rounded-b-[32px] text-[11px] text-gray-500 font-medium flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-gray-700">Aviso Legal de Saúde:</strong> A funcionalidade de leitura de receita é um assistente de conveniência baseado em visão computacional. Não substitui a conferência física nem a avaliação clínica de um médico ou farmacêutico credenciado. Medicamentos sujeitos a receita médica só serão dispensados mediante apresentação do documento original na farmácia.
          </div>
        </div>
      </div>
    </div>
  );
};
