import React, { useState } from 'react';
import {
  Check,
  Crown,
  Sparkles,
  Building2,
  CreditCard,
  Phone,
  ShieldCheck,
  Star,
  FileSpreadsheet,
  Package,
  Layers,
  ArrowRight,
  Upload,
  X,
  BadgeCheck,
} from 'lucide-react';
import { PLANS_DEFINITIONS } from '../../services/mockData';
import { supabaseData } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PlanType, PlanPeriodicity, PaymentMethod } from '../../types';

interface PlansAndPricingViewProps {
  onPlanSelected?: (planId: PlanType) => void;
}

export const PlansAndPricingView: React.FC<PlansAndPricingViewProps> = ({ onPlanSelected }) => {
  const [periodicity, setPeriodicity] = useState<PlanPeriodicity>('anual');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<PlanType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('multicaixa_express');
  const [mcxPhone, setMcxPhone] = useState('+244 923 000 111');
  const [unitName, setUnitName] = useState('Farmácia Central de Luanda');
  const [comprovativoFileName, setComprovativoFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { currentUser, isUnit, isDepot } = useAuth();
  const { success, warning } = useToast();
  const config = supabaseData.getConfig();

  const getDiscountPercentage = (planType: PlanType, p: PlanPeriodicity): number => {
    const plan = PLANS_DEFINITIONS.find((x) => x.id === planType);
    if (!plan) return 0;
    return plan.descontos[p] || 0;
  };

  const calculateFinalPrice = (planType: PlanType, p: PlanPeriodicity): { monthly: number; total: number; savings: number } => {
    const plan = PLANS_DEFINITIONS.find((x) => x.id === planType);
    if (!plan) return { monthly: 0, total: 0, savings: 0 };

    const discount = getDiscountPercentage(planType, p);
    let months = 1;
    if (p === 'trimestral') months = 3;
    if (p === 'semestral') months = 6;
    if (p === 'anual') months = 12;

    const baseTotal = plan.preco_base_mensal * months;
    const discountedTotal = baseTotal * (1 - discount / 100);
    const effectiveMonthly = discountedTotal / months;

    return {
      monthly: Math.round(effectiveMonthly),
      total: Math.round(discountedTotal),
      savings: Math.round(baseTotal - discountedTotal),
    };
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForCheckout) return;

    const priceInfo = calculateFinalPrice(selectedPlanForCheckout, periodicity);
    const discount = getDiscountPercentage(selectedPlanForCheckout, periodicity);

    setIsSubmitting(true);
    try {
      const transaction = supabaseData.submitPayment({
        unidade_id: currentUser?.unidade_id || 'unit-demo-' + Date.now(),
        unidade_nome: unitName,
        plano_tipo: selectedPlanForCheckout,
        periodicidade: periodicity,
        valor: priceInfo.total,
        desconto_aplicado: discount,
        metodo: paymentMethod,
        referencia_mcx: paymentMethod === 'multicaixa_express' ? 'MCX-' + Math.floor(100000 + Math.random() * 900000) : undefined,
        comprovativo_url: comprovativoFileName || 'comprovativo_bancario_transferencia.pdf',
        status: 'pendente',
      });

      success(
        `Solicitação de subscrição do Plano ${selectedPlanForCheckout.toUpperCase()} enviada com sucesso! O Administrador irá validar o pagamento.`,
        'Pagamento Submetido'
      );
      setSelectedPlanForCheckout(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] text-[#1e293b] min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F5F1] text-[#00A878] text-xs font-black uppercase tracking-wider border border-[#00A878]/20">
            <Crown className="w-4 h-4 text-[#00A878]" />
            <span>Planos SaaS de Subscrição Profissional</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#123B7A] tracking-tight uppercase">
            Potencialize a Sua Unidade de Saúde em Toda Angola
          </h1>

          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Divulgue o seu stock para milhares de utentes diariamente, receba pedidos directos e adquira no atacado com acesso aos Depósitos Grossistas credenciados pelo MINSA.
          </p>

          {/* Periodicity Cycle Toggle */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-2">
            <div className="p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-sm">
              {(['mensal', 'trimestral', 'semestral', 'anual'] as PlanPeriodicity[]).map((cycle) => {
                const maxDiscount = cycle === 'trimestral' ? '5% a 10%' : cycle === 'semestral' ? '10% a 20%' : cycle === 'anual' ? 'Até 30% Desconto' : '';
                return (
                  <button
                    key={cycle}
                    onClick={() => setPeriodicity(cycle)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                      periodicity === cycle
                        ? 'bg-[#123B7A] text-white shadow-sm'
                        : 'text-slate-600 hover:text-[#123B7A] hover:bg-white/80'
                    }`}
                  >
                    <span className="capitalize">{cycle}</span>
                    {maxDiscount && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        periodicity === cycle
                          ? 'bg-[#00A878] text-white'
                          : 'bg-[#E8F5F1] text-[#00A878]'
                      }`}>
                        {maxDiscount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {PLANS_DEFINITIONS.map((plan) => {
            const pricing = calculateFinalPrice(plan.id, periodicity);
            const discount = getDiscountPercentage(plan.id, periodicity);
            const isAdvanced = plan.id === 'avancado';
            const isMedium = plan.id === 'medio';

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-7 flex flex-col justify-between transition-all duration-200 relative shadow-sm hover:shadow-md ${
                  isAdvanced
                    ? 'bg-white border-2 border-[#00A878] shadow-lg lg:scale-105'
                    : isMedium
                    ? 'bg-white border-2 border-[#123B7A]/40'
                    : 'bg-white border border-slate-200/90'
                }`}
              >
                {/* Top Badge */}
                {plan.destaque_badge && (
                  <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-[#00A878] text-white font-black text-[11px] shadow-sm uppercase tracking-wider border border-white">
                      {plan.destaque_badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-black text-[#123B7A] uppercase flex items-center gap-2 tracking-tight">
                      {isAdvanced && <Crown className="w-5 h-5 text-[#00A878]" />}
                      {plan.nome}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 font-medium min-h-[36px] leading-relaxed">
                    {plan.descricao}
                  </p>

                  {/* Price Box */}
                  <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      {periodicity === 'mensal' ? 'Pagamento Mensal' : `Total ${periodicity.toUpperCase()}`}
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-[#123B7A] tracking-tight">
                        {pricing.total.toLocaleString()}
                      </span>
                      <span className="text-xs font-bold text-slate-400">AOA</span>
                    </div>

                    {discount > 0 && (
                      <div className="text-xs text-[#00A878] font-black mt-1.5 flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Equivalente a {pricing.monthly.toLocaleString()} AOA/mês (Poupou {pricing.savings.toLocaleString()} AOA)</span>
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-6">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Recursos Incluídos:
                    </div>
                    {plan.recursos.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-semibold">
                        <div className="w-4 h-4 rounded-full bg-[#E8F5F1] text-[#00A878] flex items-center justify-center shrink-0 mt-0.5 border border-[#00A878]/20">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Select Button */}
                <button
                  type="button"
                  onClick={() => setSelectedPlanForCheckout(plan.id)}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                    isAdvanced
                      ? 'bg-[#00A878] hover:bg-[#008f66] text-white'
                      : isMedium
                      ? 'bg-[#123B7A] hover:bg-[#0d2a59] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-[#123B7A]'
                  }`}
                >
                  <span>Subscrever {plan.nome}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Banking and Multicaixa Transparency Box */}
        <div className="mt-16 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 max-w-4xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123B7A] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#123B7A]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#123B7A] uppercase tracking-tight">
                Canais Oficiais de Pagamento em Angola
              </h3>
              <p className="text-xs text-slate-500 font-medium">Liquidação 100% segura através do sistema bancário nacional (EMIS / BAI)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700">
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#123B7A] text-sm uppercase flex items-center gap-2">
                  Multicaixa Express (MCX)
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px] uppercase">
                  Activação Imediata
                </span>
              </div>
              <div className="text-xs font-semibold">Entidade Oficial: <strong className="text-slate-900 font-bold">{config.multicaixa_entidade}</strong></div>
              <div className="text-xs font-semibold">Número de Apoio / MCX: <strong className="text-[#00A878] font-bold">{config.multicaixa_express_numero}</strong></div>
              <div className="text-slate-500 text-[11px] font-medium leading-relaxed">Validação automática por cruzamento do número de envio ou ID de transacção.</div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-[#123B7A] text-sm uppercase flex items-center gap-2">
                  Transferência BAI ({config.banco_nome})
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#123B7A] font-black text-[10px] uppercase">
                  Bancário
                </span>
              </div>
              <div className="text-xs font-semibold">Titular: <strong className="text-slate-900 font-bold">{config.banco_titular}</strong></div>
              <div className="text-xs font-semibold">IBAN: <strong className="font-mono text-[#00A878] font-bold text-xs">{config.banco_iban}</strong></div>
              <div className="text-xs font-semibold">SWIFT: <strong className="font-mono text-slate-700">{config.banco_swift}</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Checkout Modal */}
      {selectedPlanForCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-slate-800 animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-[#123B7A] uppercase flex items-center gap-2 tracking-tight">
                  <Crown className="w-5 h-5 text-[#00A878]" />
                  Finalizar Subscrição ({selectedPlanForCheckout.toUpperCase()})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Ciclo seleccionado: <strong className="capitalize text-[#00A878]">{periodicity}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedPlanForCheckout(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 font-bold" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="mt-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nome da Farmácia ou Unidade de Saúde *</label>
                <input
                  type="text"
                  required
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#123B7A] focus:bg-white rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none transition-all"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Método de Liquidação em Angola *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('multicaixa_express')}
                    className={`p-3.5 rounded-2xl border font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'multicaixa_express'
                        ? 'bg-[#E8F5F1] border-[#00A878] text-[#00A878] shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-black text-xs uppercase tracking-wider">Multicaixa Express</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transferencia_bancaria')}
                    className={`p-3.5 rounded-2xl border font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'transferencia_bancaria'
                        ? 'bg-blue-50 border-[#123B7A] text-[#123B7A] shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-black text-xs uppercase tracking-wider">Transferência BAI</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'multicaixa_express' ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-slate-700 font-semibold">
                    Efectue o pagamento MCX para o telemóvel: <strong className="text-[#00A878]">{config.multicaixa_express_numero}</strong>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500 font-medium">O seu Telemóvel MCX que fez o envio:</label>
                    <input
                      type="tel"
                      value={mcxPhone}
                      onChange={(e) => setMcxPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 font-mono">
                  <div className="text-[#00A878] font-black text-sm">{config.banco_iban}</div>
                  <div className="text-[11px] text-slate-500 font-sans font-medium">Titular: {config.banco_titular}</div>
                </div>
              )}

              {/* Upload Comprovativo */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Comprovativo de Pagamento (Opcional para agilizar aprovação)</label>
                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer flex items-center gap-1.5 font-bold transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Comprovativo</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setComprovativoFileName(e.target.files[0].name);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium truncate">
                    {comprovativoFileName || 'Nenhum ficheiro seleccionado'}
                  </span>
                </div>
              </div>

              {/* Price Summary */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex justify-between items-center text-sm">
                <span className="font-bold text-[#123B7A]">Valor Total da Subscrição:</span>
                <strong className="text-[#00A878] text-base font-black">
                  {calculateFinalPrice(selectedPlanForCheckout, periodicity).total.toLocaleString()} AOA
                </strong>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForCheckout(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider text-xs shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all active:scale-95"
                >
                  <span>Submeter Subscrição</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
