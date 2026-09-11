import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  KeyRound,
  FileText,
  Upload,
  Check,
  Building,
  RotateCcw,
  Landmark,
  HeartPulse,
  Copy,
  Trash2,
  Clock,
  CreditCard,
  Package,
  Navigation,
  Loader2,
  MapPin,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabaseData } from '../../services/supabase';
import { UserRole, PlanType, PlanPeriodicity, PaymentMethod } from '../../types';
import { PROVINCES_ANGOLA, PLANS_DEFINITIONS } from '../../services/mockData';
import { reverseGeocodeCoordinates, saveUserGpsLocation } from '../../services/geoService';
import { getHomeDashboardForRole } from '../../utils/rbac';
import {
  evaluatePasswordStrength,
  isValidEmail,
  verifyEmailAuthenticity,
  COUNTRY_DIALING_CODES,
  sanitizePhoneDigits,
} from '../../utils/authValidation';
import { LegalDocumentType } from '../legal/LegalModal';

interface LoginPageProps {
  onNavigateHome: () => void;
  onNavigateView?: (view: any) => void;
  onNavigateRegisterUnit?: () => void;
  onOpenLegalDoc?: (doc: LegalDocumentType) => void;
  initialTab?: 'login' | 'register';
  initialRole?: UserRole;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateHome,
  onNavigateView,
  onNavigateRegisterUnit,
  onOpenLegalDoc,
  initialTab = 'login',
  initialRole = 'unidade',
}) => {
  const {
    login,
    loginWithGoogle,
    requestPasswordReset,
    confirmPasswordReset,
    register,
    switchDemoAccount,
    currentUser,
    logout,
    demoUsers,
  } = useAuth();
  const { success, error, warning, info } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot_password'>(initialTab);

  // Sync with prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [generatedResetCode, setGeneratedResetCode] = useState<string | null>(null);

  // Register Form State - Defaulting to institutional unit registration
  const [role, setRole] = useState<UserRole>(initialRole || 'unidade');

  useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

  const [nome, setNome] = useState('');
  const [nomeUnidade, setNomeUnidade] = useState('');
  const [tipoUnidade, setTipoUnidade] = useState<
    'farmacia' | 'clinica' | 'hospital' | 'centro_medico' | 'veterinaria' | 'consultorio' | 'laboratorio'
  >('farmacia');
  const [indicativoPais, setIndicativoPais] = useState('+244');
  const [telefoneDigitos, setTelefoneDigitos] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [provincia, setProvincia] = useState('Luanda');
  const [municipio, setMunicipio] = useState('Maianga');
  const [bairro, setBairro] = useState('Centro');
  const [enderecoRua, setEnderecoRua] = useState('');

  // GPS State
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [nif, setNif] = useState('');
  const [alvaraMinsa, setAlvaraMinsa] = useState('');
  const [documentoMinsaNome, setDocumentoMinsaNome] = useState('');
  const [documentoMinsaBase64, setDocumentoMinsaBase64] = useState('');
  const [documentoMinsaTamanho, setDocumentoMinsaTamanho] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('basico');
  const [selectedPeriodicity, setSelectedPeriodicity] = useState<PlanPeriodicity>('mensal');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('multicaixa_express');
  const [telefoneExpress, setTelefoneExpress] = useState('');
  const [referenciaPagamento, setReferenciaPagamento] = useState('');
  const [comprovativoNome, setComprovativoNome] = useState('');
  const [comprovativoBase64, setComprovativoBase64] = useState('');
  const [comprovativoTamanho, setComprovativoTamanho] = useState('');
  const [comprovativoTipo, setComprovativoTipo] = useState<'pdf' | 'imagem'>('pdf');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [systemConfig, setSystemConfig] = useState(() => supabaseData.getConfig());
  const [pendingActivationUnit, setPendingActivationUnit] = useState<any | null>(null);

  useEffect(() => {
    const handleConfigUpdate = (e?: any) => {
      setSystemConfig(e?.detail || supabaseData.getConfig());
    };
    window.addEventListener('mutikukwama:config-updated', handleConfigUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mutikukwama_system_config') handleConfigUpdate();
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('mutikukwama:config-updated', handleConfigUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Password evaluation for registration
  const passwordEvaluation = evaluatePasswordStrength(regPassword);
  const passwordsMatch = regPassword.length > 0 && regPassword === confirmPassword;

  // Calculate Plan Pricing & Periodicity Discounts dynamically
  const getPricingDetails = () => {
    const prices = systemConfig.precos_planos || { basico: 15000, medio: 35000, avancado: 75000 };
    const monthlyPrice = (prices as any)[selectedPlan] || (selectedPlan === 'avancado' ? 75000 : selectedPlan === 'medio' ? 35000 : 15000);
    const months = selectedPeriodicity === 'anual' ? 12 : selectedPeriodicity === 'trimestral' ? 3 : 1;
    const discountPercent =
      selectedPeriodicity === 'anual'
        ? ((systemConfig.descontos_config?.anual as any)?.[selectedPlan] ?? 20)
        : selectedPeriodicity === 'trimestral'
        ? ((systemConfig.descontos_config?.trimestral as any)?.[selectedPlan] ?? 5)
        : 0;
    const baseTotal = monthlyPrice * months;
    const discountAmount = Math.round((baseTotal * discountPercent) / 100);
    const finalTotal = baseTotal - discountAmount;
    return { monthlyPrice, months, discountPercent, baseTotal, discountAmount, finalTotal };
  };

  const pricing = getPricingDetails();

  // File Upload Handlers with Base64 Conversion
  const handleMinsaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      error('O ficheiro do MINSA não pode exceder 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDocumentoMinsaBase64(reader.result as string);
      setDocumentoMinsaNome(file.name);
      setDocumentoMinsaTamanho((file.size / 1024).toFixed(1) + ' KB');
      success(`Documento do MINSA "${file.name}" anexado com sucesso!`);
    };
    reader.readAsDataURL(file);
  };

  const handleProofFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      error('O comprovativo de pagamento não pode exceder 10MB.');
      return;
    }
    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = () => {
      setComprovativoBase64(reader.result as string);
      setComprovativoNome(file.name);
      setComprovativoTamanho((file.size / 1024).toFixed(1) + ' KB');
      setComprovativoTipo(isImg ? 'imagem' : 'pdf');
      success(`Comprovativo de pagamento "${file.name}" anexado com sucesso!`);
    };
    reader.readAsDataURL(file);
  };

  // GPS Activation Handler
  const handleActivateGps = () => {
    if (!navigator.geolocation) {
      const msg = 'O seu navegador ou dispositivo não suporta geolocalização por GPS.';
      setGpsError(msg);
      warning(msg);
      return;
    }

    setIsLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsLatitude(latitude);
        setGpsLongitude(longitude);
        setGpsAccuracy(accuracy);
        setGpsActive(true);

        try {
          const geo = await reverseGeocodeCoordinates(latitude, longitude, accuracy);
          if (geo.provincia) setProvincia(geo.provincia);
          if (geo.municipio) setMunicipio(geo.municipio);
          if (geo.bairro) setBairro(geo.bairro);
          if (geo.rua && (!enderecoRua || enderecoRua.trim().length === 0)) {
            setEnderecoRua(geo.rua);
          }

          // Save and broadcast location so search and whole app is synchronized
          saveUserGpsLocation(geo);

          success(
            `GPS Ativado e Sincronizado! Bairro: ${geo.bairro}, Município: ${geo.municipio}, Província: ${geo.provincia}.`
          );
        } catch (e) {
          console.error('Error reverse geocoding:', e);
          success(`GPS Ativado! Coordenadas capturadas: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocatingGps(false);
        }
      },
      (err) => {
        setIsLocatingGps(false);
        let msg = 'Não foi possível obter a sua localização por GPS.';
        if (err.code === 1) {
          msg = 'Acesso à localização recusado. Por favor autorize o GPS no navegador.';
        } else if (err.code === 2) {
          msg = 'Sinal de GPS indisponível no momento.';
        } else if (err.code === 3) {
          msg = 'Tempo limite excedido ao obter o sinal de GPS.';
        }
        setGpsError(msg);
        warning(msg, 'Aviso de GPS');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // --- Handlers ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIdent = email.trim();
    if (!cleanIdent) {
      error('Por favor introduza o seu User (Nome de Utilizador) ou E-mail.');
      return;
    }
    if (cleanIdent.includes('@')) {
      if (!isValidEmail(cleanIdent)) {
        warning('Por favor introduza um endereço de e-mail válido.');
        return;
      }
    } else if (cleanIdent.length < 3) {
      warning('O nome de utilizador (User) deve conter pelo menos 3 caracteres.');
      return;
    }
    if (!password) {
      error('Por favor introduza a sua palavra-passe.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await login(cleanIdent, password);
      if (ok) {
        success('Sessão iniciada com sucesso!', 'Bem-vindo');
        const user = supabaseData.getCurrentUser();
        const targetView = getHomeDashboardForRole(user?.role);
        if (onNavigateView) {
          onNavigateView(targetView);
        } else {
          onNavigateHome();
        }
      } else {
        error('Credenciais inválidas. Verifique o seu User / E-mail e Palavra-passe.');
      }
    } catch (err: any) {
      error(err?.message || 'Falha de comunicação no início de sessão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        success('Autenticação Google concluída com sucesso!');
        const user = supabaseData.getCurrentUser();
        const targetView = getHomeDashboardForRole(user?.role);
        if (onNavigateView) {
          onNavigateView(targetView);
        } else {
          onNavigateHome();
        }
      }
    } catch (err: any) {
      error('Não foi possível autenticar com a Conta Google.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleQuickDemoSwitch = (roleName: UserRole) => {
    setActiveTab('login');
    setPendingActivationUnit(null);
    const demo = demoUsers.find((u) => u.role === roleName);
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.senha_provisoria || 'Mutiku@2026');
      info(
        `Credenciais preenchidas para "${demo.nome}". Palavra-passe: ${demo.senha_provisoria}. Clique em "Entrar na Plataforma" para autenticar.`,
        'Entrar com Senha'
      );
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !isValidEmail(resetEmail)) {
      warning('Introduza um endereço de e-mail válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset(resetEmail);
      if (res.success) {
        setGeneratedResetCode(res.demoToken || 'MCX-RESET-8921');
        setResetStep('confirm');
        success('Código de recuperação gerado!', 'Verificação');
      } else {
        error(res.message || 'Não foi possível solicitar a recuperação.');
      }
    } catch (err: any) {
      error('Erro ao comunicar com o serviço de autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      warning('Introduza o código de recuperação.');
      return;
    }
    if (newPassword.length < 8) {
      error('A nova palavra-passe deve ter pelo menos 8 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmPasswordReset(resetToken, newPassword);
      if (res.success) {
        success('Palavra-passe redefinida com sucesso! Pode agora iniciar sessão.');
        setActiveTab('login');
        setPassword(newPassword);
        setEmail(resetEmail);
      } else {
        error(res.message || 'Código de recuperação inválido ou expirado.');
      }
    } catch (err: any) {
      error('Erro ao redefinir a palavra-passe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      error('Por favor introduza o nome completo.');
      return;
    }
    if (role !== 'paciente' && !nomeUnidade.trim()) {
      error('Por favor introduza o nome oficial da unidade de saúde.');
      return;
    }
    if ((role === 'unidade' || role === 'deposito') && !alvaraMinsa.trim()) {
      error('O Nº de Alvará Sanitário / Registo MINSA é obrigatório para registar a unidade.');
      return;
    }
    if ((role === 'unidade' || role === 'deposito') && !nif.trim()) {
      error('O NIF da entidade é obrigatório para efeitos de conformidade regulatória e fiscal.');
      return;
    }
    if ((role === 'unidade' || role === 'deposito') && !documentoMinsaNome) {
      error('É obrigatório anexar o Documento Oficial do MINSA (Alvará Sanitário ou Licença).');
      return;
    }
    if ((role === 'unidade' || role === 'deposito') && !comprovativoNome) {
      error('É obrigatório anexar o comprovativo de pagamento (Multicaixa Express ou Transferência Bancária).');
      return;
    }

    const emailCheck = verifyEmailAuthenticity(email);
    if (!emailCheck.isValid) {
      error(emailCheck.reason || 'O endereço de e-mail é inválido. Por favor introduza um e-mail verdadeiro.');
      return;
    }

    const cleanDigits = sanitizePhoneDigits(telefoneDigitos, 9);
    if (!cleanDigits || cleanDigits.length !== 9) {
      error(`O número de telemóvel deve conter exactamente 9 dígitos (introduziu ${cleanDigits.length}/9).`);
      return;
    }

    if (regPassword.length < 8) {
      error('A palavra-passe deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!passwordEvaluation.hasUpperCase) {
      error('A palavra-passe deve conter pelo menos uma letra maiúscula.');
      return;
    }
    if (!passwordEvaluation.hasSpecialChar) {
      error('A palavra-passe deve conter pelo menos um carácter especial.');
      return;
    }
    if (!passwordsMatch) {
      error('As palavras-passe não coincidem.');
      return;
    }
    if (!acceptedTerms) {
      warning('Deve aceitar os Termos de Utilização e a Política de Privacidade para concluir o registo.');
      return;
    }

    // MANDATORY GPS CHECK: Activation of GPS is strictly required
    if (!gpsActive || gpsLatitude === null || gpsLongitude === null) {
      error('⚠️ É OBRIGATÓRIO ativar o GPS para georreferenciar a sua localização antes de concluir o registo.');
      setGpsError('Ativação do GPS obrigatória. Por favor, clique no botão "Ativar GPS" para georreferenciar.');
      const btn = document.getElementById('btn-activate-gps');
      btn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn?.classList.add('ring-4', 'ring-rose-500', 'animate-bounce');
      setTimeout(() => btn?.classList.remove('ring-4', 'ring-rose-500', 'animate-bounce'), 2500);
      return;
    }

    const fullPhoneNumber = `${indicativoPais} ${cleanDigits}`;
    const pricingData = getPricingDetails();

    setIsSubmitting(true);
    try {
      const ok = await register({
        email: email.trim(),
        nome: nome.trim(),
        telefone: fullPhoneNumber,
        role,
        password: regPassword,
        termosAceites: acceptedTerms,
        nome_unidade: role !== 'paciente' ? nomeUnidade.trim() : undefined,
        provincia,
        municipio,
        bairro: bairro.trim() || 'Centro',
        endereco_completo: enderecoRua.trim()
          ? `${enderecoRua.trim()}, ${bairro.trim() || 'Centro'}, ${municipio}, ${provincia}`
          : `${bairro.trim() || 'Centro'}, ${municipio}, ${provincia}`,
        latitude: gpsLatitude ?? (role === 'unidade' || role === 'deposito' ? -8.83833 : undefined),
        longitude: gpsLongitude ?? (role === 'unidade' || role === 'deposito' ? 13.23444 : undefined),
        nif: role === 'unidade' || role === 'deposito' ? nif.trim() : undefined,
        alvara_minsa: role === 'unidade' || role === 'deposito' ? alvaraMinsa.trim() : undefined,
        documento_minsa_nome: role === 'unidade' || role === 'deposito' ? documentoMinsaNome : undefined,
        documento_minsa_base64: role === 'unidade' || role === 'deposito' ? documentoMinsaBase64 : undefined,
        documento_minsa_url: role === 'unidade' || role === 'deposito' ? (documentoMinsaBase64 || documentoMinsaNome) : undefined,
        tipo_unidade: role === 'deposito' ? 'deposito' : tipoUnidade,
        plano_tipo: role === 'unidade' || role === 'deposito' ? selectedPlan : undefined,
        plano_periodicidade: role === 'unidade' || role === 'deposito' ? selectedPeriodicity : undefined,
        plano_preco: role === 'unidade' || role === 'deposito' ? pricingData.finalTotal : undefined,
        plano_desconto: role === 'unidade' || role === 'deposito' ? pricingData.discountPercent : undefined,
        metodo_pagamento: role === 'unidade' || role === 'deposito' ? paymentMethod : undefined,
        referencia_pagamento:
          role === 'unidade' || role === 'deposito'
            ? referenciaPagamento.trim() ||
              (paymentMethod === 'multicaixa_express'
                ? `MCX-${telefoneExpress.replace(/\D/g, '') || cleanDigits}`
                : `TRF-${Date.now().toString().slice(-6)}`)
            : undefined,
        comprovativo_nome: role === 'unidade' || role === 'deposito' ? comprovativoNome : undefined,
        comprovativo_base64: role === 'unidade' || role === 'deposito' ? comprovativoBase64 : undefined,
        comprovativo_url: role === 'unidade' || role === 'deposito' ? (comprovativoBase64 || comprovativoNome) : undefined,
        comprovativo_tipo: role === 'unidade' || role === 'deposito' ? comprovativoTipo : undefined,
      });

      if (ok) {
        if (role === 'unidade' || role === 'deposito') {
          setPendingActivationUnit({
            unitName: nomeUnidade.trim(),
            responsavel: nome.trim(),
            nif: nif.trim(),
            alvara: alvaraMinsa.trim(),
            minsaDoc: documentoMinsaNome,
            plano: selectedPlan,
            periodicidade: selectedPeriodicity,
            valor: pricingData.finalTotal,
            desconto: pricingData.discountPercent,
            metodo: paymentMethod,
            comprovativo: comprovativoNome,
            email: email.trim(),
            telefone: fullPhoneNumber,
            endereco: enderecoRua.trim()
              ? `${enderecoRua.trim()}, ${bairro.trim() || 'Centro'}, ${municipio}, ${provincia}`
              : `${bairro.trim() || 'Centro'}, ${municipio}, ${provincia}`,
            gps:
              gpsLatitude && gpsLongitude
                ? `${gpsLatitude.toFixed(5)}, ${gpsLongitude.toFixed(5)}`
                : undefined,
          });
          info('Registo remetido com sucesso! A conta aguarda ativação pelo Super Administrador.');
        } else {
          success('Conta criada com sucesso! Bem-vindo à plataforma MUTIKUKWAMA SAÚDE.');
          onNavigateHome();
        }
      }
    } catch (err: any) {
      error(err?.message || 'Falha ao processar o registo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#F8FAFC] via-slate-50 to-[#E8F5F1]/30 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="w-full max-w-xl">
        {/* Top Back to Home Button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            id="btn-login-back-home"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#123B7A] transition-colors cursor-pointer bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#00A878]" />
            <span>Voltar à Página Inicial</span>
          </button>

          <span className="text-[11px] font-bold text-[#00A878] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00A878] animate-pulse"></span>
            Acesso Seguro Nacional
          </span>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Card Header Branding */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-[#123B7A] to-[#1a4b9c] text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-sm text-white">
                <HeartPulse className="w-6 h-6 text-[#00A878]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                  MUTIKUKWAMA SAÚDE
                </h1>
                <p className="text-xs text-blue-100 font-medium mt-0.5">
                  Plataforma Nacional de Gestão de Saúde & Farmácias de Angola
                </p>
              </div>
            </div>

            {/* Current Active User notification if already logged in */}
            {currentUser && (
              <div className="mt-4 p-3 rounded-2xl bg-white/10 border border-white/15 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span>
                    Sessão ativa como: <strong>{currentUser.nome}</strong> ({currentUser.role})
                  </span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setEmail('');
                    setPassword('');
                    success('Todas as contas foram desconectadas com sucesso.');
                  }}
                  className="text-xs font-bold text-rose-200 hover:text-white underline cursor-pointer flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Terminar Sessão (Log Off)</span>
                </button>
              </div>
            )}

            {!currentUser && (
              <div className="mt-4 p-3 rounded-2xl bg-white/10 border border-white/15 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  <span className="text-blue-100">
                    Sessão: <strong>Desconectado</strong> (Introduza a sua palavra-passe)
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Acesso Protegido
                </span>
              </div>
            )}
          </div>

          {/* Quick Demo Access Pills */}
          <div className="px-6 sm:px-8 pt-5 pb-4 bg-slate-50 border-b border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#123B7A] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#00A878]" />
                Preencher Credenciais Oficiais (Entrar com Senha):
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Contas Oficiais</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                id="btn-demo-superadmin-card"
                onClick={() => handleQuickDemoSwitch('super_admin')}
                className="px-2 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all shadow-2xs text-center cursor-pointer"
                title="Preencher credenciais de Super Administrador (Acesso Global)"
              >
                Super Admin
              </button>
              <button
                type="button"
                id="btn-demo-farmacia-card"
                onClick={() => handleQuickDemoSwitch('unidade')}
                className="px-2 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#123B7A] border border-blue-200 text-xs font-bold transition-all shadow-2xs text-center cursor-pointer"
                title="Preencher credenciais de Farmácia (Bloqueado em Super Admin e MINSA)"
              >
                Farmácia
              </button>
              <button
                type="button"
                id="btn-demo-deposito-card"
                onClick={() => handleQuickDemoSwitch('deposito')}
                className="px-2 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs text-center cursor-pointer"
                title="Preencher credenciais de Depósito Grossista B2B (Bloqueado em Super Admin e MINSA)"
              >
                Depósito
              </button>
              <button
                type="button"
                id="btn-demo-minsa-card"
                onClick={() => handleQuickDemoSwitch('institucional')}
                className="px-2 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold transition-all shadow-2xs text-center cursor-pointer"
                title="Preencher credenciais do Ministério da Saúde MINSA (Bloqueado em Depósito, Unidade e Super Admin)"
              >
                Ministério (MINSA)
              </button>
              <button
                type="button"
                id="btn-demo-paciente-card"
                onClick={() => handleQuickDemoSwitch('paciente')}
                className="px-2 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition-all shadow-2xs text-center cursor-pointer"
                title="Preencher credenciais de Utente / Paciente (Portal do Utente)"
              >
                Utente
              </button>
            </div>

            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
              <span className="text-slate-500 font-medium">
                Precisa de sair de todas as contas?
              </span>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setEmail('');
                  setPassword('');
                  success('Log off realizado! Todas as contas estão desconectadas.');
                }}
                className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Desconectar Todas as Contas (Log Off)</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-6 sm:px-8 pt-5">
            <div className="flex border border-slate-200 rounded-2xl p-1 bg-slate-100/70 text-xs">
              <button
                type="button"
                id="tab-login-btn"
                onClick={() => {
                  setPendingActivationUnit(null);
                  setActiveTab('login');
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer ${
                  activeTab === 'login' && !pendingActivationUnit
                    ? 'bg-[#123B7A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Iniciar Sessão
              </button>
              <button
                type="button"
                id="tab-register-btn"
                onClick={() => {
                  setPendingActivationUnit(null);
                  setActiveTab('register');
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer ${
                  activeTab === 'register' && !pendingActivationUnit
                    ? 'bg-[#123B7A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>
          </div>

          {/* Main Content Body */}
          <div className="p-6 sm:p-8">
            {/* ============================================================ */}
            {/* VIEW 0: PENDING SUPER ADMIN ACTIVATION CONFIRMATION */}
            {/* ============================================================ */}
            {pendingActivationUnit ? (
              <div className="space-y-6 text-center py-2 animate-in fade-in">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
                  <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-2 border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Aguardando Ativação pelo Super Admin
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-[#123B7A] tracking-tight">
                    Inscrição Remetida com Sucesso!
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 max-w-md mx-auto leading-relaxed">
                    O registo de <strong>{pendingActivationUnit.unitName}</strong> foi submetido com toda a documentação legal e comprovativo de pagamento.
                  </p>
                </div>

                {/* Detailed Summary Card */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 text-left text-xs space-y-3 shadow-2xs">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold">Estabelecimento:</span>
                    <span className="font-black text-[#123B7A]">{pendingActivationUnit.unitName}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold">NIF Institucional:</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {pendingActivationUnit.nif}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold">Alvará & Doc. MINSA:</span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {pendingActivationUnit.minsaDoc || pendingActivationUnit.alvara}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold">Plano & Período:</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {pendingActivationUnit.plano} ({pendingActivationUnit.periodicidade})
                      {pendingActivationUnit.desconto > 0 && (
                        <span className="ml-1 text-[10px] text-emerald-700 bg-emerald-100 px-1 rounded">
                          -{pendingActivationUnit.desconto}%
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                    <span className="text-slate-500 font-semibold">Valor da Subscrição:</span>
                    <span className="font-black text-sm text-[#123B7A]">
                      {pendingActivationUnit.valor.toLocaleString()} AOA
                    </span>
                  </div>

                  {pendingActivationUnit.endereco && (
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                      <span className="text-slate-500 font-semibold">Endereço:</span>
                      <span className="font-medium text-slate-800 text-right max-w-[65%] truncate">
                        {pendingActivationUnit.endereco}
                      </span>
                    </div>
                  )}

                  {pendingActivationUnit.gps && (
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
                      <span className="text-slate-500 font-semibold">Localização GPS:</span>
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        {pendingActivationUnit.gps}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Comprovativo de Pagamento:</span>
                    <span className="font-bold text-amber-900 flex items-center gap-1.5 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                      <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                      {pendingActivationUnit.comprovativo}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl text-left text-xs text-blue-900 leading-relaxed space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-blue-950">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    Processo de Auditoria e Ativação:
                  </p>
                  <p className="text-[11px] text-blue-800">
                    O Super Administrador foi notificado e procederá à conferência do seu Alvará Sanitário e do comprovativo de liquidação financeira. A sua conta permanecerá no estado <strong>"Pendente de Ativação"</strong> até à aprovação formal.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingActivationUnit(null);
                      setActiveTab('login');
                      setEmail(pendingActivationUnit.email);
                    }}
                    className="flex-1 py-3 rounded-xl bg-[#123B7A] hover:bg-[#0e2c5d] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Ir para o Início de Sessão</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="py-3 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Página Inicial
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ============================================================ */}
                {/* VIEW 1: LOGIN FORM */}
                {/* ============================================================ */}
                {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block">User (Nome de Utilizador) ou E-mail</label>
                    <span className="text-[10px] text-slate-400 font-medium">Unidades, MINSA ou Utentes</span>
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="page-input-login-email"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ex: farmacia.luanda, minsa.dnme ou email@saude.ao"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#00A878] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block">Palavra-passe</label>
                  </div>

                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="page-input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#00A878] focus:bg-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer"
                      title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="text-right pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email);
                        setActiveTab('forgot_password');
                      }}
                      className="text-xs font-semibold text-[#00A878] hover:underline cursor-pointer"
                    >
                      Esqueceu-se da palavra-passe?
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  id="page-btn-submit-login"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>ENTRAR NA PLATAFORMA</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Separator */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest absolute">
                    OU
                  </span>
                </div>

                {/* Google Sign-in */}
                <button
                  type="button"
                  id="page-btn-google-login"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-2xs hover:shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {isGoogleSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continuar com Google</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ============================================================ */}
            {/* VIEW 2: FORGOT PASSWORD FORM */}
            {/* ============================================================ */}
            {activeTab === 'forgot_password' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Recuperação de Palavra-passe
                  </h3>
                </div>

                {resetStep === 'request' ? (
                  <form onSubmit={handleForgotPasswordRequest} className="space-y-3.5">
                    <p className="text-slate-500">
                      Introduza o e-mail associado à sua conta para receber o código de recuperação.
                    </p>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">E-mail Registado</label>
                      <input
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="exemplo@mutikukwama.ao"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:border-[#00A878]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Enviar Código de Recuperação
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                    {generatedResetCode && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                        Código de demonstração: <strong>{generatedResetCode}</strong>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Código Recebido</label>
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Ex: MCX-RESET-8921"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono focus:bg-white focus:border-[#00A878]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Nova Palavra-passe</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:bg-white focus:border-[#00A878]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-[#123B7A] hover:bg-[#0d2a58] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Redefinir Palavra-passe
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* VIEW 3: REGISTER FORM */}
            {/* ============================================================ */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
                {/* Visual Role Selector Cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-slate-800 block text-xs uppercase tracking-wider">
                      Tipo de Registo / Perfil *
                    </label>
                    <span className="text-[11px] text-[#00A878] font-bold">
                      {role === 'unidade'
                        ? 'Estabelecimento de Saúde'
                        : role === 'deposito'
                        ? 'Depósito Grossista B2B'
                        : 'Paciente / Utente'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      id="role-btn-unidade"
                      onClick={() => setRole('unidade')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        role === 'unidade'
                          ? 'border-[#00A878] bg-[#E8F5F1] shadow-xs ring-1 ring-[#00A878]'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-1.5 rounded-xl bg-white shadow-xs text-[#00A878]">
                          <Building2 className="w-4 h-4" />
                        </span>
                        {role === 'unidade' ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#00A878]" />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-xs leading-tight">
                          Estabelecimento de Saúde
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Farmácia, Clínica, Hospital, Centro Médico
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="role-btn-deposito"
                      onClick={() => setRole('deposito')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        role === 'deposito'
                          ? 'border-indigo-600 bg-indigo-50 shadow-xs ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-1.5 rounded-xl bg-white shadow-xs text-indigo-600">
                          <Package className="w-4 h-4" />
                        </span>
                        {role === 'deposito' ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-xs leading-tight">
                          Depósito Grossista
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Distribuição B2B exclusiva
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      id="role-btn-paciente"
                      onClick={() => setRole('paciente')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        role === 'paciente'
                          ? 'border-blue-600 bg-blue-50 shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-1.5 rounded-xl bg-white shadow-xs text-blue-600">
                          <User className="w-4 h-4" />
                        </span>
                        {role === 'paciente' ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        ) : null}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-xs leading-tight">
                          Paciente / Utente
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          Cidadão particular
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Specific Health Unit Type (When role is unidade) */}
                {role === 'unidade' && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      Tipo de Estabelecimento de Saúde *
                    </label>
                    <select
                      id="page-select-register-unit-type"
                      value={tipoUnidade}
                      onChange={(e) => setTipoUnidade(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 cursor-pointer focus:border-[#00A878] focus:bg-white font-medium"
                    >
                      <option value="farmacia">Farmácia (Comunitária ou Hospitalar)</option>
                      <option value="clinica">Clínica (Médica / Policlínica)</option>
                      <option value="hospital">Hospital (Geral / Provincial / Privado)</option>
                      <option value="centro_medico">Centro Médico (Centro Médico / Posto de Saúde)</option>
                      <option value="veterinaria">Veterinária (Clínica ou Farmácia Veterinária)</option>
                      <option value="consultorio">Consultório (Médico / Dentário / Especialidades Clínicas)</option>
                      <option value="laboratorio">Laboratório (Análises Clínicas e Diagnóstico)</option>
                    </select>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Nome Completo do Responsável *</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Dr. António Manuel Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-[#00A878] focus:bg-white"
                  />
                </div>

                {/* Unit Name if not patient */}
                {role !== 'paciente' && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      {role === 'deposito' ? 'Nome Oficial do Depósito Grossista *' : 'Nome Oficial do Estabelecimento de Saúde *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={nomeUnidade}
                      onChange={(e) => setNomeUnidade(e.target.value)}
                      placeholder={role === 'deposito' ? 'Ex: Depósito Central Grossista Luanda' : 'Ex: Farmácia Sagrada Esperança'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-[#00A878] focus:bg-white"
                    />
                  </div>
                )}

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">E-mail Profissional / Pessoal *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@mutikukwama.ao"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-[#00A878] focus:bg-white"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Telemóvel (9 dígitos) *</label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600">
                      +244
                    </span>
                    <input
                      type="tel"
                      required
                      value={telefoneDigitos}
                      onChange={(e) => setTelefoneDigitos(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      placeholder="923 000 000"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-[#00A878] focus:bg-white"
                    />
                  </div>
                </div>

                {/* Location & GPS Activation Button Section */}
                <div
                  id="gps-activation-section"
                  className={`space-y-3 p-3.5 rounded-2xl transition-all ${
                    !gpsActive
                      ? 'bg-amber-50/70 border-2 border-amber-300 shadow-2xs'
                      : 'bg-slate-50 border border-slate-200/90'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-[#00A878]" />
                          <span>Endereço e Ativação de Localização por GPS</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                          OBRIGATÓRIO *
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                        {role === 'paciente'
                          ? 'A ativação do GPS é obrigatória para georreferenciar a sua residência e calcular farmácias próximas.'
                          : 'A ativação do GPS é obrigatória para georreferenciar com exatidão a sua unidade no mapa oficial de Angola.'}
                      </p>
                    </div>

                    {/* BOTÃO GPS */}
                    <button
                      type="button"
                      id="btn-activate-gps"
                      onClick={handleActivateGps}
                      disabled={isLocatingGps}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0 ${
                        gpsActive
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#00A878] hover:bg-[#008f66] text-white active:scale-95 ring-2 ring-[#00A878]/30 shadow-md animate-pulse'
                      }`}
                      title="Ativar coordenadas GPS do dispositivo (Obrigatório)"
                    >
                      {isLocatingGps ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>A obter sinal GPS...</span>
                        </>
                      ) : gpsActive ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>GPS ATIVADO ✓</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4" />
                          <span>📍 Ativar GPS (Obrigatório)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Warning when GPS is not yet active */}
                  {!gpsActive && (
                    <div className="p-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Ativação de GPS Obrigatória para Concluir o Registo</span>
                      </div>
                      <p className="text-amber-800 leading-snug">
                        Clique no botão verde <strong>"📍 Ativar GPS (Obrigatório)"</strong> acima. O sistema irá capturar as coordenadas exatas e preencher automaticamente o <strong>Bairro</strong>, <strong>Município</strong> e <strong>Província</strong>.
                      </p>
                    </div>
                  )}

                  {/* GPS Active Feedback Banner */}
                  {gpsActive && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-black text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Localização Georreferenciada com Sucesso!</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleActivateGps}
                          disabled={isLocatingGps}
                          className="text-[10px] text-emerald-800 underline font-bold hover:text-emerald-950 cursor-pointer shrink-0"
                        >
                          Recalcular
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-emerald-900">
                        <span className="font-bold">📍 Sincronizado:</span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-bold text-emerald-800">
                          Bairro: {bairro || 'Detetado'}
                        </span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-bold text-emerald-800">
                          {municipio}
                        </span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 font-bold text-emerald-800">
                          {provincia}
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700">
                        Coordenadas: {gpsLatitude?.toFixed(5)}, {gpsLongitude?.toFixed(5)}{' '}
                        {gpsAccuracy ? `(Precisão: ±${Math.round(gpsAccuracy)}m)` : ''} • Bairro, Município e Província preenchidos automaticamente.
                      </div>
                    </div>
                  )}

                  {/* GPS Error Feedback Banner */}
                  {gpsError && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{gpsError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleActivateGps}
                        className="text-[10px] text-amber-800 underline font-bold hover:text-amber-950 cursor-pointer shrink-0"
                      >
                        Tentar Novamente
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">Província *</label>
                      <select
                        value={provincia}
                        onChange={(e) => setProvincia(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-[#00A878]"
                      >
                        {PROVINCES_ANGOLA.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">Município *</label>
                      <input
                        type="text"
                        required
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:border-[#00A878]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">Bairro / Zona *</label>
                      <input
                        type="text"
                        required
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Ex: Maianga, Alvalade, Ingombota, Talatona..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">Rua / Ponto de Referência *</label>
                      <input
                        type="text"
                        required
                        value={enderecoRua}
                        onChange={(e) => setEnderecoRua(e.target.value)}
                        placeholder="Ex: Rua Comandante Gika, junto ao Banco BAI"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:border-[#00A878]"
                      />
                    </div>
                  </div>
                </div>

                {/* Institutional Compliance & Subscription for Health Units and Depots */}
                {(role === 'unidade' || role === 'deposito') && (
                  <div className="space-y-4 pt-1">
                    {/* 1. NIF Field */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 block">
                          NIF (Número de Identificação Fiscal) *
                        </label>
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Obrigatório
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={nif}
                        onChange={(e) => setNif(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        placeholder="Ex: 5417082910"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono font-bold focus:border-[#00A878] focus:bg-white"
                      />
                      <p className="text-[11px] text-slate-500">
                        Obrigatório para emissão de faturas e validação regulatória em Angola.
                      </p>
                    </div>

                    {/* 2. MINSA Regulation & Document Attachment */}
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Regulamentação MINSA (Obrigatório)
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                          Alvará Oficial
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-xs">
                          Nº de Alvará Sanitário / Licença MINSA *
                        </label>
                        <input
                          type="text"
                          required
                          value={alvaraMinsa}
                          onChange={(e) => setAlvaraMinsa(e.target.value)}
                          placeholder="Ex: CERT-MINSA-2026-4891"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2 text-slate-800 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-xs">
                          Anexar Documento do MINSA (PDF, JPG, PNG) *
                        </label>
                        {!documentoMinsaNome ? (
                          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-white rounded-xl cursor-pointer transition-all hover:bg-emerald-50/40">
                            <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                            <span className="text-xs font-bold text-emerald-800">
                              Clique para anexar o Alvará Sanitário / Documento MINSA
                            </span>
                            <span className="text-[10px] text-slate-500 mt-0.5">
                              Formatos aceites: PDF, JPG, PNG (Máx. 10MB)
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              className="hidden"
                              onChange={handleMinsaFileUpload}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-3 bg-white border border-emerald-300 rounded-xl shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-800 truncate">{documentoMinsaNome}</p>
                                <p className="text-[10px] text-emerald-700 font-medium">
                                  Documento anexado {documentoMinsaTamanho ? `(${documentoMinsaTamanho})` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDocumentoMinsaBase64('');
                                setDocumentoMinsaNome('');
                                setDocumentoMinsaTamanho('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Remover ficheiro"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Choose Subscription Plan */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 block text-xs">
                          Escolha o Plano de Subscrição *
                        </label>
                        <span className="text-[10px] text-slate-500">Valores definidos no Super Admin</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Básico */}
                        <div
                          onClick={() => setSelectedPlan('basico')}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedPlan === 'basico'
                              ? 'border-[#00A878] bg-emerald-50/50 shadow-xs ring-1 ring-[#00A878]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs uppercase tracking-tight text-slate-800">Básico</span>
                            {selectedPlan === 'basico' && <CheckCircle2 className="w-4 h-4 text-[#00A878]" />}
                          </div>
                          <div className="text-sm font-black text-[#123B7A]">
                            {((systemConfig.precos_planos as any)?.basico || 15000).toLocaleString()} AOA
                            <span className="text-[10px] font-normal text-slate-500 block">/mês</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                            Catálogo essencial de medicamentos e stock local.
                          </p>
                        </div>

                        {/* Médio */}
                        <div
                          onClick={() => setSelectedPlan('medio')}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                            selectedPlan === 'medio'
                              ? 'border-[#00A878] bg-emerald-50/50 shadow-xs ring-1 ring-[#00A878]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="absolute top-0 right-0 bg-[#00A878] text-white text-[8px] font-black px-1.5 py-0.2 rounded-bl-md uppercase">
                            Recomendado
                          </span>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs uppercase tracking-tight text-slate-800">Médio</span>
                            {selectedPlan === 'medio' && <CheckCircle2 className="w-4 h-4 text-[#00A878]" />}
                          </div>
                          <div className="text-sm font-black text-[#123B7A]">
                            {((systemConfig.precos_planos as any)?.medio || 35000).toLocaleString()} AOA
                            <span className="text-[10px] font-normal text-slate-500 block">/mês</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                            Destaque nas pesquisas e gestão de encomendas online.
                          </p>
                        </div>

                        {/* Avançado */}
                        <div
                          onClick={() => setSelectedPlan('avancado')}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                            selectedPlan === 'avancado'
                              ? 'border-[#123B7A] bg-blue-50/50 shadow-xs ring-1 ring-[#123B7A]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <span className="absolute top-0 right-0 bg-[#123B7A] text-white text-[8px] font-black px-1.5 py-0.2 rounded-bl-md uppercase">
                            Completo
                          </span>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs uppercase tracking-tight text-slate-800">Avançado</span>
                            {selectedPlan === 'avancado' && <CheckCircle2 className="w-4 h-4 text-[#123B7A]" />}
                          </div>
                          <div className="text-sm font-black text-[#123B7A]">
                            {((systemConfig.precos_planos as any)?.avancado || 75000).toLocaleString()} AOA
                            <span className="text-[10px] font-normal text-slate-500 block">/mês</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                            Acesso B2B aos Depósitos Grossistas e apoio prioritário.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 4. Choose Periodicity & Applied Discounts */}
                    <div className="space-y-2 pt-1">
                      <label className="font-bold text-slate-700 block text-xs">
                        Período de Pagamento (Com Desconto Oficial) *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPeriodicity('mensal')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedPeriodicity === 'mensal'
                              ? 'bg-[#123B7A] text-white border-[#123B7A] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block font-black text-xs">Mensal</span>
                          <span className="text-[10px] opacity-80">Preço Base</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPeriodicity('trimestral')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                            selectedPeriodicity === 'trimestral'
                              ? 'bg-[#00A878] text-white border-[#00A878] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block font-black text-xs">Trimestral (3m)</span>
                          <span className="inline-block text-[9px] font-black px-1.5 py-0.2 rounded bg-white/20">
                            -5% Desconto
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPeriodicity('anual')}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer relative ${
                            selectedPeriodicity === 'anual'
                              ? 'bg-[#00A878] text-white border-[#00A878] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block font-black text-xs">Anual (12m)</span>
                          <span className="inline-block text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-400 text-slate-900">
                            -20% Desconto
                          </span>
                        </button>
                      </div>

                      {/* Summary Calculation */}
                      <div className="p-3 bg-slate-100/90 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <span className="text-slate-600 font-medium">
                            Subtotal {selectedPeriodicity === 'anual' ? '(12 meses)' : selectedPeriodicity === 'trimestral' ? '(3 meses)' : '(1 mês)'}:
                          </span>
                          {pricing.discountPercent > 0 && (
                            <span className="ml-1.5 text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Poupa {pricing.discountAmount.toLocaleString()} AOA ({pricing.discountPercent}%)
                            </span>
                          )}
                        </div>
                        <div className="text-right font-black text-sm text-[#123B7A]">
                          {pricing.finalTotal.toLocaleString()} AOA
                        </div>
                      </div>
                    </div>

                    {/* 5. Payment Method & Coordinates */}
                    <div className="space-y-2 pt-1">
                      <label className="font-bold text-slate-700 block text-xs">
                        Opção de Pagamento Oficial *
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* Multicaixa Express */}
                        <div
                          onClick={() => setPaymentMethod('multicaixa_express')}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            paymentMethod === 'multicaixa_express'
                              ? 'border-[#00A878] bg-emerald-50/50 ring-1 ring-[#00A878]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#00A878]" />
                              Multicaixa Express
                            </span>
                            {paymentMethod === 'multicaixa_express' && (
                              <CheckCircle2 className="w-4 h-4 text-[#00A878]" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            Envio direto para o número Express oficial da plataforma.
                          </p>
                        </div>

                        {/* Transferência Bancária */}
                        <div
                          onClick={() => setPaymentMethod('transferencia_bancaria')}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            paymentMethod === 'transferencia_bancaria'
                              ? 'border-[#00A878] bg-emerald-50/50 ring-1 ring-[#00A878]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs text-slate-800 flex items-center gap-1.5">
                              <Landmark className="w-3.5 h-3.5 text-[#123B7A]" />
                              Transferência Bancária
                            </span>
                            {paymentMethod === 'transferencia_bancaria' && (
                              <CheckCircle2 className="w-4 h-4 text-[#00A878]" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 leading-tight">
                            Transferência via IBAN interbancário (BAI / BFA).
                          </p>
                        </div>
                      </div>

                      {/* Payment Instructions Container */}
                      {paymentMethod === 'multicaixa_express' ? (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="text-[11px] text-slate-700 leading-relaxed">
                            Transfira o valor exato de <strong>{pricing.finalTotal.toLocaleString()} AOA</strong> via <strong>Multicaixa Express</strong> para o terminal móvel oficial:
                            <div className="mt-1 font-mono font-black text-sm text-[#00A878] flex items-center gap-2">
                              <span>{systemConfig.multicaixa_express_numero || '+244 927 042 499'}</span>
                              <span className="text-[10px] font-bold text-slate-500">(MUTIKUKWAMA SAÚDE)</span>
                            </div>
                          </div>
                          <div className="space-y-1 pt-1">
                            <label className="font-bold text-slate-700 text-xs">Telemóvel do Pagador (Express) *</label>
                            <input
                              type="text"
                              value={telefoneExpress}
                              onChange={(e) => setTelefoneExpress(e.target.value)}
                              placeholder="Ex: 923 000 000"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="text-[11px] text-slate-700 space-y-1">
                            <p><strong>Banco:</strong> {systemConfig.banco_nome || 'BAI — Banco Angolano de Investimentos'}</p>
                            <p><strong>Titular:</strong> {systemConfig.banco_titular || 'MUTIKUKWAMA SAÚDE TECNOLOGIAS LDA'}</p>
                            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 mt-1.5">
                              <span className="font-mono font-bold text-xs text-slate-800 truncate">
                                {systemConfig.banco_iban || 'AO06 0040 0000 1234 5678 9012 3'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(systemConfig.banco_iban || 'AO06 0040 0000 1234 5678 9012 3');
                                  setCopiedIban(true);
                                  info('IBAN copiado!');
                                  setTimeout(() => setCopiedIban(false), 2000);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-[#00A878] hover:underline cursor-pointer ml-2 shrink-0"
                              >
                                {copiedIban ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedIban ? 'Copiado' : 'Copiar IBAN'}</span>
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1 pt-1">
                            <label className="font-bold text-slate-700 text-xs">Nº do Talão / Referência Bancária</label>
                            <input
                              type="text"
                              value={referenciaPagamento}
                              onChange={(e) => setReferenciaPagamento(e.target.value)}
                              placeholder="Ex: TRF-BAI-892147"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 6. Proof of Payment Upload */}
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-amber-600" />
                          Anexar Comprovativo de Pagamento (Obrigatório) *
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          Auditoria Super Admin
                        </span>
                      </div>

                      {!comprovativoNome ? (
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-300 hover:border-amber-500 bg-white rounded-xl cursor-pointer transition-all hover:bg-amber-50/40">
                          <Upload className="w-6 h-6 text-amber-600 mb-1" />
                          <span className="text-xs font-bold text-amber-900">
                            Clique para carregar o Comprovativo de Pagamento
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            Formatos aceites: PDF, JPG, PNG (Talão de transferência ou captura Express)
                          </span>
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={handleProofFileUpload}
                          />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-white border border-amber-300 rounded-xl shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-800 truncate">{comprovativoNome}</p>
                              <p className="text-[10px] text-amber-800 font-medium">
                                Comprovativo anexado {comprovativoTamanho ? `(${comprovativoTamanho})` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setComprovativoBase64('');
                              setComprovativoNome('');
                              setComprovativoTamanho('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remover ficheiro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Password & Confirmation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Palavra-passe *</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="8+ carateres"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-[#00A878]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">Confirmar Palavra-passe *</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repetir palavra-passe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:border-[#00A878]"
                    />
                  </div>
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="page-check-terms"
                    required
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#00A878] rounded border-slate-300 focus:ring-[#00A878]"
                  />
                  <label htmlFor="page-check-terms" className="text-slate-600 leading-tight">
                    Declaro que li e aceito os{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc?.('termos')}
                      className="text-[#00A878] font-bold hover:underline"
                    >
                      Termos de Utilização
                    </button>{' '}
                    e a{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc?.('privacidade')}
                      className="text-[#00A878] font-bold hover:underline"
                    >
                      Política de Privacidade
                    </button>{' '}
                    de Angola.
                  </label>
                </div>

                {!gpsActive && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="font-bold">Atenção: É obrigatório ativar o GPS para concluir o registo.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const btn = document.getElementById('btn-activate-gps');
                        btn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        btn?.classList.add('ring-4', 'ring-[#00A878]', 'animate-bounce');
                        setTimeout(() => btn?.classList.remove('ring-4', 'ring-[#00A878]', 'animate-bounce'), 2000);
                        handleActivateGps();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#00A878] hover:bg-[#008f66] text-white text-[10px] font-black uppercase tracking-wider shrink-0 cursor-pointer shadow-xs text-center"
                    >
                      📍 Ativar GPS Agora
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>A processar registo...</span>
                    </>
                  ) : role === 'unidade' || role === 'deposito' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submeter Registo & Aguardar Ativação pelo Super Admin</span>
                    </>
                  ) : (
                    <span>CONCLUIR REGISTO</span>
                  )}
                </button>
              </form>
            )}
            </>
            )}
          </div>

          {/* Security & Regulatory Footer Banner */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00A878]" />
              <span>Conforme Lei da Protecção de Dados de Angola (Lei n.º 22/11)</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenLegalDoc?.('termos')}
                className="hover:underline text-slate-600"
              >
                Termos
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegalDoc?.('privacidade')}
                className="hover:underline text-slate-600"
              >
                Privacidade
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onOpenLegalDoc?.('minsa')}
                className="hover:underline text-slate-600"
              >
                MINSA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
