import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  X,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Printer,
  ChevronRight,
  Scale,
} from 'lucide-react';

export type LegalDocumentType = 'termos' | 'privacidade' | 'proteccao_dados';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: LegalDocumentType;
  onAcceptTerms?: () => void;
  showAcceptButton?: boolean;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialDoc = 'termos',
  onAcceptTerms,
  showAcceptButton = false,
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocumentType>(initialDoc);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="legal-modal-backdrop"
      className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="legal-modal-card"
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Conformidade Legal & Termos Oficiais
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                  República de Angola
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Plataforma Nacional MUTIKUKWAMA • Versão Jurídica v1.2-2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="legal-print-btn"
              onClick={handlePrint}
              title="Imprimir documento"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors hidden sm:flex items-center gap-1.5 text-xs font-medium"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              id="legal-close-btn"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 pt-3">
          <button
            id="tab-legal-termos"
            onClick={() => setActiveDoc('termos')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeDoc === 'termos'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Termos de Utilização
          </button>

          <button
            id="tab-legal-privacidade"
            onClick={() => setActiveDoc('privacidade')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeDoc === 'privacidade'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Política de Privacidade
          </button>

          <button
            id="tab-legal-proteccao"
            onClick={() => setActiveDoc('proteccao_dados')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 ${
              activeDoc === 'proteccao_dados'
                ? 'bg-white border-emerald-600 text-emerald-700 shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-4 h-4" />
            Protecção de Dados (Lei 22/11)
          </button>
        </div>

        {/* Modal Body: Document Content */}
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[60vh] text-slate-700 text-sm leading-relaxed space-y-6">
          {activeDoc === 'termos' && (
            <article className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-900">
                <FileText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold">Resumo dos Termos de Utilização</p>
                  <p className="text-emerald-800 mt-1">
                    Estes termos regem o acesso à plataforma MUTIKUKWAMA para busca de medicamentos, agendamento de serviços clínicos, encomendas e localização de unidades de saúde em território angolano.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">1. Objecto e Âmbito de Aplicação</h3>
                <p className="mt-1.5 text-slate-600">
                  A plataforma <strong>MUTIKUKWAMA</strong> disponibiliza um ecossistema digital integrado para conectar utentes, farmácias comunitárias, clínicas, hospitais e depósitos grossistas farmacêuticos em todas as 21 províncias da República de Angola. Ao utilizar a plataforma, o utilizador concorda expressamente em vincular-se a estes Termos de Utilização.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">2. Natureza Informativa e Prescrições Médicas</h3>
                <p className="mt-1.5 text-slate-600">
                  As informações de medicamentos e exames fornecidas têm carácter informativo. A dispensa de medicamentos sujeitos a receita médica é estritamente condicionada à apresentação da respectiva prescrição médica original emitida por profissional habilitado em Angola, cumprindo as directrizes da <strong>ARMED (Agência Reguladora de Medicamentos e Tecnologias de Saúde)</strong> e do <strong>Ministério da Saúde (MINSA)</strong>.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">3. Obrigações e Cadastro do Utilizador</h3>
                <p className="mt-1.5 text-slate-600">
                  O utilizador compromete-se a fornecer informações exactas, actuais e verdadeiras durante o registo. É expressamente vedado o uso de identidades falsas, a apropriação indevida de credenciais institucionais ou qualquer tentativa de violar a integridade técnica da plataforma.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">4. Pagamentos e Reservas de Medicamentos</h3>
                <p className="mt-1.5 text-slate-600">
                  Transacções realizadas através do Multicaixa Express ou transferência bancária seguem os regulamentos da EMIS e do Banco Nacional de Angola (BNA). A unidade de saúde é a responsável final pela integridade e garantia do acondicionamento farmacológico dos produtos dispensados.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">5. Actualização dos Termos e Foro Jurídico</h3>
                <p className="mt-1.5 text-slate-600">
                  A MUTIKUKWAMA reserva-se o direito de actualizar estes termos com aviso prévio nas plataformas digitais. Para a resolução de qualquer litígio resultante deste acordo, é competente o Tribunal da Comarca de Luanda, com expressa renúncia a qualquer outro.
                </p>
              </div>
            </article>
          )}

          {activeDoc === 'privacidade' && (
            <article className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900">
                <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold">Política de Privacidade MUTIKUKWAMA</p>
                  <p className="text-blue-800 mt-1">
                    Garantimos a total privacidade das suas pesquisas e comunicações de saúde com encriptação de ponta a ponta e auditoria de acessos.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">1. Dados Recolhidos</h3>
                <p className="mt-1.5 text-slate-600">
                  Recolhemos apenas os dados indispensáveis para prestar os nossos serviços de saúde digital:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 text-xs sm:text-sm">
                  <li><strong>Dados de Identificação:</strong> Nome completo, endereço de correio electrónico e número de telefone (+244).</li>
                  <li><strong>Dados de Localização:</strong> Província, município e coordenadas GPS (apenas quando consentido para indicar farmácias mais próximas).</li>
                  <li><strong>Dados de Transacção:</strong> Histórico de pedidos e confirmações de levantamento de medicamentos.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">2. Finalidades do Tratamento</h3>
                <p className="mt-1.5 text-slate-600">
                  Os dados são tratados com o propósito estrito de facilitar a localização de medicamentos disponíveis, confirmação de pedidos farmacêuticos, comunicação entre utente e farmácia credenciada e geração de relatórios estatísticos anónimos para planeamento de saúde pública do MINSA.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">3. Partilha com Terceiros</h3>
                <p className="mt-1.5 text-slate-600">
                  <strong>Não comercializamos nem cedemos dados pessoais a terceiros para efeitos publicitários.</strong> Os dados de um pedido são transmitidos única e exclusivamente à farmácia ou clínica selecionada pelo utente para a concretização do serviço médico ou farmacêutico.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">4. Segurança da Informação</h3>
                <p className="mt-1.5 text-slate-600">
                  Implementamos rigorosos controlos de cibersegurança, incluindo cifra TLS 1.3 em trânsito, controlo de acesso baseado em funções (RBAC), e registo de auditoria inviolável de eventos do sistema.
                </p>
              </div>
            </article>
          )}

          {activeDoc === 'proteccao_dados' && (
            <article className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-emerald-900">
                <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm">
                  <p className="font-semibold">Conformidade com a Lei n.º 22/11 de 17 de Junho</p>
                  <p className="text-emerald-800 mt-1">
                    Regime Geral de Protecção de Dados Pessoais da República de Angola e Agência de Protecção de Dados (APD).
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">1. Princípios Fundamentais (Artigos 4.º e 5.º)</h3>
                <p className="mt-1.5 text-slate-600">
                  Em cumprimento estrito da legislação angolana, todo o tratamento de dados pessoais na MUTIKUKWAMA rege-se pelos princípios da licitude, lealdade, transparência, limitação das finalidades, exactidão e minimização dos dados recolhidos.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">2. Protecção Especial a Dados Sensíveis de Saúde (Artigo 12.º)</h3>
                <p className="mt-1.5 text-slate-600">
                  Os dados relativos à saúde, prescrições e exames clínicos gozam de estatuto de dados sensíveis reforçado. O seu tratamento é sujeito a segredo profissional rigoroso, apenas acessível por farmacêuticos ou clínicos credenciados vinculados a deveres deontológicos estritos.
                </p>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">3. Direitos dos Titulares dos Dados</h3>
                <p className="mt-1.5 text-slate-600">
                  Ao titular dos dados é garantido o exercício irrestrito dos seguintes direitos legalmente consagrados:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="font-semibold text-xs text-slate-900">Direito de Acesso & Informação</p>
                    <p className="text-xs text-slate-600 mt-0.5">Saber quais dados pessoais estão a ser tratados e com que finalidade.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="font-semibold text-xs text-slate-900">Direito de Rectificação</p>
                    <p className="text-xs text-slate-600 mt-0.5">Corrigir a qualquer momento dados inexactos ou desactualizados.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="font-semibold text-xs text-slate-900">Direito de Eliminação (Esquecimento)</p>
                    <p className="text-xs text-slate-600 mt-0.5">Solicitar a remoção definitiva da sua conta e registros pessoais.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="font-semibold text-xs text-slate-900">Direito de Oposição</p>
                    <p className="text-xs text-slate-600 mt-0.5">Opor-se a tratamentos específicos nos termos da lei angolana.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">4. Contacto do Encarregado de Protecção de Dados (DPO)</h3>
                <p className="mt-1.5 text-slate-600">
                  Para exercer os seus direitos ou submeter pedidos formais à equipa de conformidade, contacte: <strong>privacidade@mutikukwama.ao</strong> ou através do nosso canal de apoio oficial em Luanda, Angola.
                </p>
              </div>
            </article>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Última actualização oficial: <strong>Fevereiro de 2026</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="legal-footer-close-btn"
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Fechar
            </button>

            {showAcceptButton && onAcceptTerms && (
              <button
                id="legal-footer-accept-btn"
                type="button"
                onClick={() => {
                  onAcceptTerms();
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Li e Aceito estes Termos
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
