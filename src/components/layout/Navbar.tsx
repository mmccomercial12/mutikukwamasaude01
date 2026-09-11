import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Search,
  ShoppingCart,
  Sparkles,
  User,
  Menu,
  X,
  ShieldCheck,
  Building2,
  Package,
  Activity,
  Layers,
  Crown,
  Globe,
  ChevronDown,
  LogOut,
  Landmark,
  Building,
  Lock,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { supabaseData } from '../../services/supabase';
import { LanguageCode, UserRole, SystemConfig } from '../../types';

interface NavbarProps {
  onOpenSearch?: () => void;
  onOpenPrescriptionAI: () => void;
  onOpenCart: () => void;
  onOpenAuth?: () => void;
  onOpenRegisterUnit?: () => void;
  onNavigate: (view: 'home' | 'search' | 'plans' | 'unit-dashboard' | 'admin' | 'admin-dashboard' | 'institutional' | 'utente-dashboard' | 'login') => void;
  activeView?: string;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenPrescriptionAI,
  onOpenCart,
  onOpenAuth,
  onOpenRegisterUnit,
  onNavigate,
  activeView,
  currentView,
}) => {
  const currentActive = activeView || currentView || 'home';
  const { language, setLanguage, t } = useLanguage();
  const { currentUser, isPatient, isUnit, isDepot, isAdmin, isSuperAdmin, isInstitutional, logout, switchRole, demoUsers } = useAuth();
  const { totalItemsCount } = useCart();
  const [config, setConfig] = useState<SystemConfig>(() => supabaseData.getConfig());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

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

  const languages: { code: LanguageCode; shortLabel: string; label: string; flag: string; countryCode: string }[] = [
    { code: 'pt', shortLabel: 'PT', label: 'Português', flag: '🇦🇴', countryCode: 'AO' },
    { code: 'en', shortLabel: 'EN', label: 'English', flag: '🇬🇧', countryCode: 'GB' },
    { code: 'fr', shortLabel: 'FR', label: 'Français', flag: '🇫🇷', countryCode: 'FR' },
    { code: 'es', shortLabel: 'ES', label: 'Español', flag: '🇪🇸', countryCode: 'ES' },
    { code: 'zh', shortLabel: 'ZH', label: '中文', flag: '🇨🇳', countryCode: 'CN' },
  ];

  const currentLangObj = languages.find((l) => l.code === language) || languages[0];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 text-[#1e293b] transition-all shadow-xs">
      {/* Top Header Row: Logo & Quick Utility Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-b border-slate-100">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#123B7A] rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200 text-white">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <div className="leading-none">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#123B7A] uppercase">
                {config.nome_plataforma || 'MUTIKUKWAMA'}
              </h1>
              <span className="text-[10px] sm:text-[11px] font-black tracking-[0.2em] text-[#00A878] uppercase block mt-0.5">
                {config.subtitulo || 'Saúde Nacional'}
              </span>
            </div>
          </div>

          {/* Right Header Controls (Prescription AI, Cart, Profile Simulator, Mobile Toggle) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* National Certification Badge (Desktop) */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200/70 text-slate-600 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#00A878] animate-pulse"></span>
              <span>{t('nav.national_network', 'Rede Nacional MINSA')}</span>
            </div>

            {/* AI Prescription OCR Button */}
            <button
              onClick={onOpenPrescriptionAI}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-[#E8F5F1] hover:bg-[#d1ece4] text-[#00A878] border border-[#00A878]/30 font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">{t('action.send_prescription', 'Enviar Receita IA')}</span>
              <span className="sm:hidden">{t('nav.prescription_short', 'Receita')}</span>
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#123B7A] transition-colors border border-slate-200 active:scale-95 cursor-pointer"
              aria-label={t('cart.title', 'Abrir Carrinho')}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-[#00A878] text-white font-black text-[11px] flex items-center justify-center shadow">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* User Session / Role Button */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setRoleSwitcherOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
                  title="Ver Contas Disponíveis"
                >
                  <User className="w-3.5 h-3.5 text-[#00A878]" />
                  <span className="capitalize">{currentUser.role.replace('_', ' ')}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                <button
                  onClick={() => {
                    logout();
                    onNavigate('login');
                  }}
                  className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                  title="Terminar Sessão em Todas as Contas (Log Off)"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('login')}
                className="inline-flex items-center gap-1.5 bg-[#EBF2FC] hover:bg-blue-100 text-[#123B7A] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-200 shadow-2xs"
                title="Iniciar Sessão com Senha"
              >
                <Lock className="w-3.5 h-3.5 text-[#00A878]" />
                <span>Entrar com Senha</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#123B7A] cursor-pointer"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-[#123B7A]" />}
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Header Navigation Bar: Exact replica of the user request menu layout */}
      <div className="hidden lg:block bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 text-sm font-semibold text-slate-700">
            {/* Left Menu Items: Pesquisar | Unidades | Depósitos | Ministério | Utente | Admin | Planos */}
            <nav className="flex items-center gap-6 xl:gap-8">
              <button
                onClick={() => onNavigate('search')}
                className={`py-1.5 transition-colors cursor-pointer ${
                  currentActive === 'search'
                    ? 'text-[#123B7A] font-bold border-b-2 border-[#123B7A]'
                    : 'text-slate-700 hover:text-[#123B7A]'
                }`}
              >
                {t('nav.search', 'Pesquisar')}
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    onNavigate('login');
                  } else {
                    onNavigate('unit-dashboard');
                  }
                }}
                className={`py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentActive === 'unit-dashboard' && !isDepot
                    ? 'text-[#123B7A] font-bold border-b-2 border-[#123B7A]'
                    : 'text-slate-700 hover:text-[#123B7A]'
                }`}
              >
                {t('nav.units', 'Unidades')}
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    onNavigate('login');
                  } else {
                    onNavigate('unit-dashboard');
                  }
                }}
                className={`py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentActive === 'unit-dashboard' && isDepot
                    ? 'text-[#123B7A] font-bold border-b-2 border-[#123B7A]'
                    : 'text-slate-700 hover:text-[#123B7A]'
                }`}
              >
                <Building className="w-4 h-4 text-slate-500" />
                <span>{t('nav.deposits', 'Depósitos')}</span>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    onNavigate('login');
                  } else {
                    onNavigate('institutional');
                  }
                }}
                className={`py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentActive === 'institutional'
                    ? 'text-[#123B7A] font-bold border-b-2 border-[#123B7A]'
                    : 'text-slate-700 hover:text-[#123B7A]'
                }`}
              >
                <Landmark className="w-4 h-4 text-slate-500" />
                <span>{t('nav.ministry', 'Ministério')}</span>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    onNavigate('login');
                  } else {
                    onNavigate('utente-dashboard');
                  }
                }}
                className={`py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentActive === 'utente-dashboard'
                    ? 'text-[#123B7A] font-bold border-b-2 border-[#123B7A]'
                    : 'text-slate-700 hover:text-[#123B7A]'
                }`}
              >
                <HeartPulse className="w-4 h-4 text-rose-500" />
                <span>{t('nav.utente', 'Utente')}</span>
              </button>

              <button
                onClick={() => {
                  if (!currentUser) {
                    onNavigate('login');
                  } else {
                    onNavigate('admin-dashboard');
                  }
                }}
                className={`py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentActive === 'admin-dashboard' || currentActive === 'admin'
                    ? 'text-[#123B7A] font-bold border-b-2 border-[#123B7A]'
                    : 'text-slate-700 hover:text-[#123B7A]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>{t('nav.admin', 'Admin')}</span>
              </button>

              <button
                onClick={() => onNavigate('plans')}
                className={`py-1.5 transition-colors cursor-pointer ${
                  currentActive === 'plans'
                    ? 'text-[#123B7A] font-bold border-b-2 border-[#123B7A]'
                    : 'text-slate-700 hover:text-[#123B7A]'
                }`}
              >
                {t('nav.plans', 'Planos')}
              </button>
            </nav>

            {/* Right Menu Items: PT Português (Pill) | Entrar | Registar Unidade (Green Button) */}
            <div className="flex items-center gap-4">
              {/* Language Selector Pill */}
              <div className="relative">
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50/80 hover:bg-slate-100 rounded-2xl text-xs font-semibold text-slate-700 border border-slate-200/90 shadow-2xs transition-colors cursor-pointer"
                  aria-label="Definição de Língua"
                >
                  <Globe className="w-4 h-4 text-slate-500" />
                  <div className="flex flex-col text-left leading-tight">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{currentLangObj.shortLabel}</span>
                    <span className="text-xs font-bold text-slate-800">{currentLangObj.label}</span>
                  </div>
                </button>

                {langMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setLangMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in">
                      <div className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        {t('nav.lang_definition', 'DEFINIÇÃO DE LÍNGUAS')}
                      </div>
                      {languages.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => {
                            setLanguage(l.code);
                            setLangMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                            language === l.code
                              ? 'bg-[#E8F5F1] text-[#00A878] font-black'
                              : 'text-slate-700 hover:bg-slate-50 font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-black tracking-wide w-5 ${language === l.code ? 'text-[#00A878]' : 'text-slate-900'}`}>
                              {l.countryCode}
                            </span>
                            <span className={language === l.code ? 'font-black' : 'font-semibold'}>
                              {l.label}
                            </span>
                          </div>
                          <span className={`text-[10px] uppercase font-bold ${language === l.code ? 'text-[#00A878]/70' : 'text-slate-400'}`}>
                            {l.shortLabel}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Entrar / Login / Logout Button */}
              {currentUser ? (
                <button
                  onClick={() => {
                    logout();
                    onNavigate('login');
                  }}
                  className="px-3 py-1.5 text-sm font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Terminar Sessão em Todas as Contas (Log Off)"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('nav.logout', 'Sair')}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (onOpenAuth) {
                      onOpenAuth();
                    } else {
                      onNavigate('login');
                    }
                  }}
                  className={`px-3 py-1.5 text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    currentActive === 'login'
                      ? 'text-[#00A878] font-black'
                      : 'text-slate-800 hover:text-[#123B7A]'
                  }`}
                  title="Aceder à Página de Início de Sessão"
                >
                  <Lock className="w-3.5 h-3.5 text-[#00A878]" />
                  <span>{t('nav.login', 'Entrar')}</span>
                </button>
              )}

              {/* Registar Unidade (Green Button as shown in the image) */}
              <button
                onClick={onOpenRegisterUnit || onOpenAuth}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-bold text-sm shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Building2 className="w-4 h-4" />
                <span>{t('action.register_unit', 'Registar Unidade')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 pt-3 pb-6 space-y-2 shadow-lg max-h-[80vh] overflow-y-auto">
          {/* Main Navigation Items */}
          <button
            onClick={() => {
              onNavigate('search');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold text-[#123B7A] hover:bg-gray-50"
          >
            <Search className="w-5 h-5 text-[#00A878]" />
            <span>{t('nav.search_meds_services', 'Pesquisar Medicamentos & Serviços')}</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                onNavigate('login');
              } else {
                onNavigate('unit-dashboard');
              }
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold text-slate-700 hover:bg-gray-50"
          >
            <Building2 className="w-5 h-5 text-[#123B7A]" />
            <span>{t('nav.unit_portal', 'Portal da Unidade (Farmácia / Clínica)')}</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                onNavigate('login');
              } else {
                onNavigate('unit-dashboard');
              }
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold text-slate-700 hover:bg-gray-50"
          >
            <Building className="w-5 h-5 text-amber-600" />
            <span>{t('nav.depots_b2b', 'Depósitos Grossistas (B2B)')}</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                onNavigate('login');
              } else {
                onNavigate('institutional');
              }
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold text-slate-700 hover:bg-gray-50"
          >
            <Landmark className="w-5 h-5 text-blue-600" />
            <span>{t('nav.ministry_reports', 'Ministério (MINSA Relatórios)')}</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                onNavigate('login');
              } else {
                onNavigate('utente-dashboard');
              }
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold text-slate-700 hover:bg-gray-50 cursor-pointer"
          >
            <HeartPulse className="w-5 h-5 text-rose-500" />
            <span>{t('nav.utente_portal', 'Portal do Utente')}</span>
          </button>

          <button
            onClick={() => {
              if (!currentUser) {
                onNavigate('login');
              } else {
                onNavigate('admin-dashboard');
              }
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold text-slate-700 hover:bg-gray-50"
          >
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <span>{t('nav.admin_panel', 'Painel Admin')}</span>
          </button>

          <button
            onClick={() => {
              onNavigate('plans');
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-bold text-slate-700 hover:bg-gray-50"
          >
            <Crown className="w-5 h-5 text-amber-500" />
            <span>{t('nav.plans_saas', 'Planos e Preços SaaS')}</span>
          </button>

          {/* Quick Actions in Mobile */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              onClick={() => {
                if (onOpenRegisterUnit) onOpenRegisterUnit();
                else if (onOpenAuth) onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#00A878] text-white font-bold text-sm shadow-sm cursor-pointer"
            >
              <Building2 className="w-5 h-5" />
              <span>{t('action.register_unit', 'Registar Unidade')}</span>
            </button>

            {currentUser ? (
              <button
                onClick={() => {
                  logout();
                  onNavigate('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-sm border border-rose-200 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Terminar Sessão (Log Off Geral)</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onNavigate('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#123B7A] text-white font-bold text-sm cursor-pointer shadow-sm"
              >
                <Lock className="w-4 h-4" />
                <span>Entrar com Senha</span>
              </button>
            )}

            {/* Language Selector Mobile */}
            <div className="pt-2">
              <div className="text-[11px] font-black uppercase text-slate-400 px-1 mb-1">
                {t('nav.lang_definition', 'Língua / Language')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.code);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold ${
                      language === l.code
                        ? 'bg-[#E8F5F1] border-[#00A878] text-[#00A878]'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Switcher Modal (Allows testing all roles effortlessly) */}
      {roleSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-[#123B7A] uppercase flex items-center gap-2 tracking-tight">
                  <User className="w-5 h-5 text-[#00A878]" />
                  Simulador de Perfis de Utilizador
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Experimente a plataforma sob a perspectiva de cada interveniente no ecossistema de saúde em Angola
                </p>
              </div>
              <button
                onClick={() => setRoleSwitcherOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
              <div className="text-xs text-rose-800 font-medium">
                Sessão atual: <strong>{currentUser ? `${currentUser.nome} (${currentUser.role})` : 'Nenhuma (Desconectado)'}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setRoleSwitcherOpen(false);
                  onNavigate('login');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                title="Desconectar todas as contas para exigir senha"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Off Geral</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 my-3">
              {demoUsers.map((user) => {
                const isSelected = currentUser?.id === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => {
                      setRoleSwitcherOpen(false);
                      onNavigate('login');
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF2FC] border-[#123B7A] text-[#123B7A] shadow-sm'
                        : 'bg-slate-50/80 border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                          user.role === 'super_admin'
                            ? 'bg-red-100 text-red-700'
                            : user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : user.role === 'unidade'
                            ? 'bg-blue-100 text-[#123B7A]'
                            : user.role === 'deposito'
                            ? 'bg-amber-100 text-amber-700'
                            : user.role === 'institucional'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        {user.role === 'super_admin' && <ShieldCheck className="w-5 h-5" />}
                        {user.role === 'admin' && <Layers className="w-5 h-5" />}
                        {user.role === 'unidade' && <Building2 className="w-5 h-5" />}
                        {user.role === 'deposito' && <Package className="w-5 h-5" />}
                        {user.role === 'institucional' && <Activity className="w-5 h-5" />}
                        {user.role === 'paciente' && <User className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="font-black text-sm text-[#123B7A] flex items-center gap-2">
                          <span>{user.nome}</span>
                          <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{user.email}</div>
                        <div className="text-[11px] text-slate-600 font-mono mt-0.5 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Senha: <strong>{user.senha_provisoria || 'Mutiku@2026'}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isSelected ? (
                        <span className="text-xs font-black text-[#00A878] bg-[#E8F5F1] px-3 py-1 rounded-full uppercase tracking-wider border border-[#00A878]/20">
                          Activo
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[#123B7A] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                          Entrar com Senha
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRoleSwitcherOpen(false)}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

