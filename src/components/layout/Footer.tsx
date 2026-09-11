import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CreditCard,
  Building2,
  Lock,
  Globe2,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { supabaseData } from '../../services/supabase';
import { SystemConfig } from '../../types';

interface FooterProps {
  onNavigate: (view: 'home' | 'search' | 'plans' | 'unit-dashboard' | 'admin-dashboard' | 'institutional' | 'login') => void;
  onOpenPrescriptionAI?: () => void;
  onOpenLegalDoc?: (doc: 'termos' | 'privacidade' | 'proteccao_dados') => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenPrescriptionAI,
  onOpenLegalDoc,
}) => {
  const { t } = useLanguage();
  const [config, setConfig] = useState<SystemConfig>(() => supabaseData.getConfig());

  useEffect(() => {
    const handleConfigUpdated = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        setConfig(supabaseData.getConfig());
      }
    };

    window.addEventListener('mutikukwama:config-updated', handleConfigUpdated);
    return () => {
      window.removeEventListener('mutikukwama:config-updated', handleConfigUpdated);
    };
  }, []);

  return (
    <footer className="bg-[#123B7A] text-blue-100 border-t border-blue-900/60 pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Column 1: Brand & National Vision */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#00A878] flex items-center justify-center text-white shadow-sm">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="leading-none">
                <span className="font-black text-2xl text-white tracking-tight uppercase">
                  {config.nome_plataforma || 'MUTIKUKWAMA'}
                </span>
                <span className="block text-[10px] font-black tracking-[0.2em] text-[#00A878] uppercase mt-0.5">
                  {config.subtitulo || 'Saúde Nacional'}
                </span>
              </div>
            </div>

            <p className="text-xs text-blue-100/80 leading-relaxed max-w-md font-medium">
              {config.descricao_plataforma ||
                'Plataforma digital nacional de saúde de Angola que conecta cidadãos a farmácias, clínicas, hospitais, laboratórios e depósitos de medicamentos em todas as 21 províncias. Informação de stock em tempo real, localização e leitura inteligente de receitas.'}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white font-bold border border-white/10">
                <ShieldCheck className="w-4 h-4 text-[#00A878]" />
                <span>{config.selo_conformidade_minsa || 'Normas Sanitárias MINSA'}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white font-bold border border-white/10">
                <Lock className="w-4 h-4 text-blue-200" />
                <span>{config.selo_proteccao_dados || 'Protecção de Dados'}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Cidadãos e Pacientes */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Pacientes & Utentes
            </h4>
            <ul className="space-y-2 text-xs font-bold">
              <li>
                <button
                  onClick={() => onNavigate('search')}
                  className="text-blue-100/90 hover:text-[#00A878] transition-colors cursor-pointer"
                >
                  Pesquisar Medicamentos
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search')}
                  className="text-blue-100/90 hover:text-[#00A878] transition-colors cursor-pointer"
                >
                  Farmácias 24 Horas
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('search')}
                  className="text-blue-100/90 hover:text-[#00A878] transition-colors cursor-pointer"
                >
                  Consultas e Exames Laboratoriais
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('plans')}
                  className="text-blue-100/90 hover:text-[#00A878] transition-colors cursor-pointer"
                >
                  Registo Gratuito de Pacientes
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Unidades de Saúde & B2B */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Unidades & Farmácias
            </h4>
            <ul className="space-y-2 text-xs font-bold">
              <li>
                <button
                  onClick={() => onNavigate('plans')}
                  className="text-blue-100/90 hover:text-[#00A878] transition-colors cursor-pointer"
                >
                  Planos de Subscrição SaaS
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('unit-dashboard')}
                  className="text-blue-100/90 hover:text-[#00A878] transition-colors cursor-pointer"
                >
                  Portal da Farmácia / Unidade
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('unit-dashboard')}
                  className="text-blue-100/90 hover:text-[#00A878] transition-colors cursor-pointer"
                >
                  Importação de Stock em Lote (Excel)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('unit-dashboard')}
                  className="text-[#00A878] hover:text-white transition-colors font-black cursor-pointer"
                >
                  Acesso B2B aos Depósitos Grossistas
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Contactos & Pagamentos em Angola */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Contactos & Pagamentos
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#00A878]" />
                <span>{config.telefone_suporte || '+244 923 000 111 (Luanda)'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#00A878]" />
                <span>{config.email_suporte || 'suporte@mutikukwama.ao'}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                <span>{config.endereco_institucional || 'Mutamba, Luanda - Angola'}</span>
              </li>
            </ul>

            <div className="pt-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-blue-200 mb-1.5">
                {config.rotulo_metodos_pagamento || 'Métodos de Pagamento em Angola:'}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-amber-300 border border-white/10">
                  {config.metodo_pagamento_1 || 'Multicaixa Express (MCX)'}
                </span>
                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-sky-200 border border-white/10">
                  {config.metodo_pagamento_2 || 'Transferência BAI (IBAN)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Banner */}
        <div className="bg-white/10 border border-white/15 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-white">
                {config.linhas_emergencia_titulo || 'Linhas de Emergência Médica em Angola'}
              </div>
              <div className="text-xs text-blue-100 font-medium mt-0.5">
                {config.linhas_emergencia_texto || (
                  <>
                    INEM / Serviços de Ambulância: <strong>112</strong> ou <strong>111</strong> | CISP: <strong>111</strong>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-xs text-blue-100 font-black uppercase tracking-wider text-center sm:text-right">
            <span>{config.horario_operacao_nota || 'Operação contínua 24h em todas as capitais provinciais'}</span>
          </div>
        </div>

        {/* Bottom Legal Disclaimer */}
        <div className="pt-6 border-t border-blue-800/80 text-[11px] text-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="font-semibold text-white">
              {config.copyright_texto || '© MUTIKUKWAMA. Todos os direitos reservados.'}
            </span>
            <span className="hidden sm:inline text-blue-400">•</span>
            <div className="flex items-center gap-3 text-blue-200 font-medium text-xs">
              <button
                type="button"
                id="footer-link-privacy"
                onClick={() => onOpenLegalDoc?.('privacidade')}
                className="hover:text-emerald-400 underline-offset-2 hover:underline transition-colors cursor-pointer"
              >
                Política de Privacidade
              </button>
              <span>•</span>
              <button
                type="button"
                id="footer-link-data-protection"
                onClick={() => onOpenLegalDoc?.('proteccao_dados')}
                className="hover:text-emerald-400 underline-offset-2 hover:underline transition-colors cursor-pointer"
              >
                Protecção de Dados
              </button>
              <span>•</span>
              <button
                type="button"
                id="footer-link-terms"
                onClick={() => onOpenLegalDoc?.('termos')}
                className="hover:text-emerald-400 underline-offset-2 hover:underline transition-colors cursor-pointer"
              >
                Termos de Utilização
              </button>
            </div>
          </div>
          <div className="text-center sm:text-right max-w-lg text-[10px] text-blue-300/90 font-medium leading-relaxed">
            {config.disclaimer_saude ||
              'Aviso de Saúde: A plataforma MUTIKUKWAMA é um sistema tecnológico de conexão e busca informativa em conformidade com a ARMED e o MINSA. Consulte sempre um médico ou farmacêutico habilitado.'}
          </div>
        </div>
      </div>
    </footer>
  );
};
