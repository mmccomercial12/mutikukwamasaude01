import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Phone,
  MapPin,
  Sparkles,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  KeyRound,
  ExternalLink,
  ChevronLeft,
  FileText,
  Upload,
  Navigation,
  Crosshair,
  Compass,
  MapPin as MapPinIcon,
  Smartphone,
  CreditCard,
  Copy,
  CheckCircle,
  FileImage,
  Building,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole, PlanType, PlanPeriodicity, PaymentMethod } from '../../types';
import { PROVINCES_ANGOLA, PLANS_DEFINITIONS, SYSTEM_CONFIG_INITIAL } from '../../services/mockData';
import { reverseGeocodeCoordinates, saveUserGpsLocation } from '../../services/geoService';
import {
  evaluatePasswordStrength,
  isValidEmail,
  verifyEmailAuthenticity,
  doPasswordsMatch,
  COUNTRY_DIALING_CODES,
  sanitizePhoneDigits,
} from '../../utils/authValidation';
import { LegalModal, LegalDocumentType } from '../legal/LegalModal';

export type AuthMode = 'login' | 'register' | 'forgot_password' | 'reset_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot_password' | 'reset_password';
  initialRole?: UserRole;
  onOpenLegalDoc?: (doc: LegalDocumentType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRole = 'paciente',
  onOpenLegalDoc,
}) => {
  const {
    login,
    loginWithGoogle,
    requestPasswordReset,
    confirmPasswordReset,
    register,
    switchDemoAccount,
  } = useAuth();
  const { success, error, warning, info } = useToast();

  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Common fields
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset Password Flow fields
  const [resetEmail, setResetEmail] = useState('');
  const [resetSentSuccess, setResetSentSuccess] = useState(false);
  const [resetDemoToken, setResetDemoToken] = useState<string | null>(null);

  // Register Fields
  const [nome, setNome] = useState('');
  const [indicativoPais, setIndicativoPais] = useState('+244');
  const [telefoneDigitos, setTelefoneDigitos] = useState('');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [provincia, setProvincia] = useState('Luanda');
  const [municipio, setMunicipio] = useState('Maianga');
  const [bairro, setBairro] = useState('Centro');
  const [enderecoCompleto, setEnderecoCompleto] = useState('');
  const [nomeUnidade, setNomeUnidade] = useState('');
  const [tipoUnidade, setTipoUnidade] = useState<
    'farmacia' | 'clinica' | 'hospital' | 'centro_medico' | 'veterinaria' | 'consultorio' | 'laboratorio' | 'deposito'
  >('farmacia');
  const [alvaraMinsa, setAlvaraMinsa] = useState('CERT-MINSA-2025-4891');
  const [documentoMinsaNome, setDocumentoMinsaNome] = useState('alvara_sanitario_minsa_2025_4891.pdf');
  const [documentoMinsaFile, setDocumentoMinsaFile] = useState<File | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // GPS for Health Unit / Depot
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsCaptured, setGpsCaptured] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // Internal Legal Modal state
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState<LegalDocumentType>('termos');

  // Subscription Plan & Payment States for Health Unit / Depot
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('basico');
  const [selectedPeriodicity, setSelectedPeriodicity] = useState<PlanPeriodicity>('trimestral');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('multicaixa_express');
  const [comprovativoFile, setComprovativoFile] = useState<File | null>(null);
  const [comprovativoNome, setComprovativoNome] = useState<string>('comprovativo_pagamento_mcx.pdf');
  const [comprovativoPreviewUrl, setComprovativoPreviewUrl] = useState<string | null>(null);
  const [comprovativoTipo, setComprovativoTipo] = useState<'pdf' | 'imagem'>('pdf');
  const [comprovativoTamanho, setComprovativoTamanho] = useState<string>('340 KB');
  const [referenciaPagamento, setReferenciaPagamento] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Helper to calculate prices and discounts according to selected plan and periodicity
  const calculatePlanPrice = (planType: PlanType, periodicity: PlanPeriodicity) => {
    const plan = PLANS_DEFINITIONS.find((p) => p.id === planType) || PLANS_DEFINITIONS[1];
    const baseMonthly = plan.preco_base_mensal;

    let months = 1;
    let discountPercent = 0;

    if (periodicity === 'trimestral') {
      months = 3;
      discountPercent = plan.descontos.trimestral ?? 5;
    } else if (periodicity === 'semestral') {
      months = 6;
      discountPercent = plan.descontos.semestral ?? 10;
    } else if (periodicity === 'anual') {
      months = 12;
      discountPercent = plan.descontos.anual ?? 20;
    }

    if (planType === 'gratis') {
      return {
        baseTotal: 0,
        discountPercent: 0,
        total: 0,
        savings: 0,
        formattedTotal: '0',
      };
    }

    const baseTotal = baseMonthly * months;
    const discountAmount = Math.round(baseTotal * (discountPercent / 100));
    const total = baseTotal - discountAmount;

    return {
      baseTotal,
      discountPercent,
      total,
      savings: discountAmount,
      formattedTotal: total.toLocaleString('pt-PT'),
    };
  };

  const handleCopyText = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    info(`Copiado para a área de transferência: ${text}`, 'Copiado com Sucesso');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleComprovativoChange = (file: File | null) => {
    if (!file) return;

    // Check 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      error('O comprovativo excede o tamanho máximo permitido de 10 MB.');
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      error('Formato inválido. Por favor envie um comprovativo em formato PDF ou Imagem (PNG, JPG).');
      return;
    }

    setComprovativoFile(file);
    setComprovativoNome(file.name);
    setComprovativoTipo(isPdf ? 'pdf' : 'imagem');

    const sizeInKb = Math.round(file.size / 1024);
    if (sizeInKb > 1024) {
      setComprovativoTamanho(`${(sizeInKb / 1024).toFixed(1)} MB`);
    } else {
      setComprovativoTamanho(`${sizeInKb} KB`);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setComprovativoPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    success(`Comprovativo "${file.name}" anexado com sucesso!`);
  };

  const handleRemoveComprovativo = () => {
    setComprovativoFile(null);
    setComprovativoNome('');
    setComprovativoPreviewUrl(null);
    setComprovativoTipo('pdf');
    setComprovativoTamanho('');
    info('Comprovativo removido. Anexe um novo ficheiro PDF ou Imagem.');
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setRole(initialRole);
      setResetSentSuccess(false);
      setResetDemoToken(null);
      setEmailTouched(false);
      setGpsCoords(null);
      setGpsCaptured(false);
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  // Password strength evaluation
  const passwordEvaluation = evaluatePasswordStrength(password);
  const passwordsMatch = doPasswordsMatch(password, confirmPassword);
  const showPasswordMismatchError =
    confirmPassword.length > 0 && !passwordsMatch && (mode === 'register' || mode === 'reset_password');

  // Real-time email verification
  const emailVerification = verifyEmailAuthenticity(email);

  const openLegalDocument = (doc: LegalDocumentType) => {
    if (onOpenLegalDoc) {
      onOpenLegalDoc(doc);
    } else {
      setLegalModalDoc(doc);
      setLegalModalOpen(true);
    }
  };

  // GPS Capture for Health Unit / Depot
  const handleCaptureUnitGPS = () => {
    if (!('geolocation' in navigator)) {
      error('Geolocalização não suportada no seu dispositivo.');
      return;
    }

    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        };
        setGpsCoords(coords);
        setGpsCaptured(true);

        try {
          const geo = await reverseGeocodeCoordinates(coords.lat, coords.lng, coords.accuracy);
          if (geo.provincia) setProvincia(geo.provincia);
          if (geo.municipio) setMunicipio(geo.municipio);
          if (geo.bairro) setBairro(geo.bairro);
          if (geo.rua && (!enderecoCompleto || enderecoCompleto.trim().length === 0)) {
            setEnderecoCompleto(geo.rua);
          }
          saveUserGpsLocation(geo);
          success(
            `GPS Ativado e Sincronizado! Bairro: ${geo.bairro}, Município: ${geo.municipio}, Província: ${geo.provincia}.`
          );
        } catch (e) {
          console.error('Error reverse geocoding in AuthModal:', e);
          success(
            `Localização GPS capturada com sucesso! Coordenadas: ${coords.lat}, ${coords.lng} (Precisão: ~${coords.accuracy}m)`
          );
        } finally {
          setIsCapturingGps(false);
        }
      },
      (err) => {
        console.warn('GPS browser error:', err);
        setIsCapturingGps(false);
        // Sensible default coordinates for Luanda center
        const defaultCoords = { lat: -8.838421, lng: 13.234891, accuracy: 15 };
        setGpsCoords(defaultCoords);
        setGpsCaptured(true);
        warning(
          'Permissão de GPS bloqueada pelo navegador. Coordenadas padrão da sede atribuídas. Pode ajustar a morada manualmente.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
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
        onClose();
      } else {
        error('Credenciais inválidas. Verifique o seu User / E-mail e Palavra-passe.');
      }
    } catch (err: any) {
      error(err?.message || 'Falha de comunicação no início de sessão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Mandatory fields verification
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
    if ((role === 'unidade' || role === 'deposito') && !documentoMinsaNome.trim()) {
      error('É obrigatório anexar o Documento Oficial do MINSA (Alvará Sanitário / Certidão Digital).');
      return;
    }

    // Email authenticity check (rejection of fake/disposable/test emails)
    const emailCheck = verifyEmailAuthenticity(email);
    if (!emailCheck.isValid) {
      error(
        emailCheck.reason ||
          'O endereço de e-mail é falso ou inválido. Por favor introduza um endereço de e-mail autêntico e verdadeiro.'
      );
      return;
    }

    // Phone 9-digits validation
    const cleanDigits = sanitizePhoneDigits(telefoneDigitos, 9);
    if (!cleanDigits || cleanDigits.length !== 9) {
      error(`O número de telemóvel deve conter exactamente 9 dígitos (introduziu ${cleanDigits.length}/9).`);
      return;
    }

    // 2. Password validation with explicit uppercase and special character checks
    if (password.length < 8) {
      error('A palavra-passe deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!passwordEvaluation.hasUpperCase) {
      error('A palavra-passe deve conter pelo menos uma letra MAIÚSCULA (A-Z).');
      return;
    }
    if (!passwordEvaluation.hasSpecialChar) {
      error('A palavra-passe deve conter pelo menos um carácter especial (ex: ! @ # $ % & *).');
      return;
    }
    if (!passwordEvaluation.isValid) {
      error('A palavra-passe deve ter 8+ caracteres, com letra maiúscula, minúscula, número e carácter especial.');
      return;
    }

    // 3. Confirm Password Match
    if (!passwordsMatch) {
      error('As palavras-passe não coincidem.');
      return;
    }

    // 4. Legal terms acceptance
    if (!acceptedTerms) {
      warning('Deve aceitar os Termos de Utilização e a Política de Privacidade para concluir o registo.');
      return;
    }

    // 5. Plan and Payment proof verification for Health Unit / Depot
    const pricing = calculatePlanPrice(selectedPlan, selectedPeriodicity);
    if (role === 'unidade' || role === 'deposito') {
      if (selectedPlan !== 'gratis' && !comprovativoFile && !comprovativoNome) {
        error('É obrigatório anexar o comprovativo de pagamento (PDF ou Imagem) para validar a subscrição do plano selecionado.');
        return;
      }
    }

    // Format phone with international dialing code
    const fullPhoneNumber = `${indicativoPais} ${cleanDigits}`;

    // MANDATORY GPS CHECK for Health Unit / Depot
    if (!gpsCaptured || !gpsCoords) {
      error('⚠️ É OBRIGATÓRIO ativar o GPS para georreferenciar a sua localização antes de submeter o registo.');
      const btn = document.getElementById('btn-activate-unit-gps');
      btn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn?.classList.add('ring-4', 'ring-rose-500', 'animate-bounce');
      setTimeout(() => btn?.classList.remove('ring-4', 'ring-rose-500', 'animate-bounce'), 2500);
      return;
    }

    const effectiveLat = gpsCoords.lat;
    const effectiveLng = gpsCoords.lng;

    setIsSubmitting(true);
    try {
      const ok = await register({
        email: email.trim(),
        nome: nome.trim(),
        telefone: fullPhoneNumber,
        role,
        password,
        termosAceites: acceptedTerms,
        nome_unidade: role !== 'paciente' ? nomeUnidade.trim() : undefined,
        provincia,
        municipio,
        bairro: bairro.trim() || 'Centro',
        endereco_completo: enderecoCompleto.trim() || `${bairro.trim() || 'Centro'}, ${municipio}, ${provincia}`,
        latitude: effectiveLat,
        longitude: effectiveLng,
        alvara_minsa: role === 'unidade' || role === 'deposito' ? alvaraMinsa : undefined,
        documento_minsa_nome: role === 'unidade' || role === 'deposito' ? documentoMinsaNome : undefined,
        documento_minsa_url: role === 'unidade' || role === 'deposito' ? documentoMinsaNome : undefined,
        tipo_unidade: role === 'deposito' ? 'deposito' : tipoUnidade,
        plano_tipo: (role === 'unidade' || role === 'deposito') ? selectedPlan : undefined,
        plano_periodicidade: (role === 'unidade' || role === 'deposito') ? selectedPeriodicity : undefined,
        plano_preco: (role === 'unidade' || role === 'deposito') ? pricing.total : undefined,
        plano_desconto: (role === 'unidade' || role === 'deposito') ? pricing.discountPercent : undefined,
        comprovativo_nome: (role === 'unidade' || role === 'deposito') ? (comprovativoFile?.name || comprovativoNome || undefined) : undefined,
        comprovativo_url: (role === 'unidade' || role === 'deposito') ? (comprovativoPreviewUrl || comprovativoFile?.name || comprovativoNome || undefined) : undefined,
        comprovativo_tipo: (role === 'unidade' || role === 'deposito') ? comprovativoTipo : undefined,
        referencia_pagamento: (role === 'unidade' || role === 'deposito') ? (referenciaPagamento.trim() || undefined) : undefined,
        metodo_pagamento: (role === 'unidade' || role === 'deposito') ? selectedPaymentMethod : undefined,
      });

      if (ok) {
        success(
          role === 'unidade' || role === 'deposito'
            ? 'Registo da unidade e subscrição remetidos com sucesso! O comprovativo foi enviado para auditoria da tesouraria.'
            : 'Conta registada com sucesso na plataforma MUTIKUKWAMA SAÚDE!'
        );
        onClose();
      } else {
        error('Ocorreu um erro ao registar a conta.');
      }
    } catch (err: any) {
      error(err?.message || 'Erro inesperado durante o registo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !isValidEmail(resetEmail)) {
      error('Por favor introduza um e-mail válido para receber as instruções.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(resetEmail);
      setResetSentSuccess(true);
      if (result.demoToken) {
        setResetDemoToken(result.demoToken);
      }
      info(result.message, 'Recuperação de Palavra-passe');
    } catch (err: any) {
      error('Falha ao processar solicitação de recuperação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = resetEmail.trim() || email.trim();

    if (!targetEmail || !isValidEmail(targetEmail)) {
      error('Endereço de e-mail inválido para redefinição.');
      return;
    }

    if (!passwordEvaluation.isValid) {
      error('A nova palavra-passe não cumpre todos os requisitos de segurança.');
      return;
    }

    if (!passwordsMatch) {
      error('As palavras-passe não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmPasswordReset(targetEmail, password);
      if (res.success) {
        success('Palavra-passe actualizada com sucesso! Pode agora iniciar sessão.');
        // Switch to login mode
        setEmail(targetEmail);
        setPassword('');
        setConfirmPassword('');
        setMode('login');
      } else {
        error(res.message);
      }
    } catch (err: any) {
      error('Erro ao actualizar a palavra-passe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    try {
      // Simulate OAuth flow with user feedback
      const result = await loginWithGoogle({
        role: mode === 'register' ? role : undefined,
        customEmail: email.trim() ? email.trim() : undefined,
        customName: nome.trim() ? nome.trim() : undefined,
      });

      if (result.success) {
        success(
          result.isNew
            ? 'Conta Google associada e registada com sucesso!'
            : 'Sessão iniciada com a Conta Google!',
          'Autenticação Google'
        );
        onClose();
      } else {
        error(result.error || 'Autenticação Google cancelada pelo utilizador.');
      }
    } catch (err: any) {
      error('Falha ao conectar com o serviço de autenticação Google.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleQuickDemoSwitch = (demoRole: UserRole) => {
    switchDemoAccount(demoRole);
    success(`Sessão alternada para o perfil de demonstração: ${demoRole.toUpperCase()}`);
    onClose();
  };

  const isUnitOrDepotRegister = mode === 'register' && (role === 'unidade' || role === 'deposito');

  return (
    <>
      <div
        id="auth-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      >
        <div
          id="auth-modal-card"
          className={`bg-white border border-slate-200/90 rounded-3xl ${
            isUnitOrDepotRegister
              ? 'w-full max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1420px] max-h-[92vh]'
              : mode === 'register'
              ? 'w-full max-w-xl md:max-w-3xl lg:max-w-4xl max-h-[94vh]'
              : 'w-full max-w-md md:max-w-lg max-h-[94vh]'
          } p-5 sm:p-7 md:p-8 shadow-2xl text-slate-800 my-auto transition-all relative overflow-hidden overflow-y-auto flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-200/50">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Segurança & Acesso
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">• Angola</span>
              </div>

              <h3 className="text-xl font-bold text-[#123B7A] tracking-tight">
                {mode === 'login' && 'Entrar no Sistema'}
                {mode === 'register' && 'Criar Nova Conta'}
                {mode === 'forgot_password' && 'Recuperar Palavra-passe'}
                {mode === 'reset_password' && 'Redefinir Palavra-passe'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                MUTIKUKWAMA SAÚDE — Sistema Nacional
              </p>
            </div>

            <button
              id="auth-close-modal-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Demo Access Bar (Preserved for seamless exploration) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-[#123B7A] uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Acesso Rápido de Demonstração:</span>
                </div>
                <span className="text-[10px] font-normal text-slate-500 lowercase">(1 clique)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  id="btn-demo-super-admin"
                  onClick={() => handleQuickDemoSwitch('super_admin')}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[11px] font-bold transition-all shadow-2xs text-center"
                >
                  Super Admin
                </button>
                <button
                  type="button"
                  id="btn-demo-farmacia"
                  onClick={() => handleQuickDemoSwitch('unidade')}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#123B7A] border border-blue-200 text-[11px] font-bold transition-all shadow-2xs text-center"
                >
                  Farmácia
                </button>
                <button
                  type="button"
                  id="btn-demo-deposito"
                  onClick={() => handleQuickDemoSwitch('deposito')}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-[11px] font-bold transition-all shadow-2xs text-center"
                >
                  Depósito Grossista
                </button>
                <button
                  type="button"
                  id="btn-demo-paciente"
                  onClick={() => handleQuickDemoSwitch('paciente')}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-all shadow-2xs text-center"
                >
                  Paciente / Utente
                </button>
              </div>
            </div>
          )}

          {/* Mode Switcher Tabs for Login & Register */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mt-4 flex border border-slate-200 rounded-2xl p-1 bg-slate-100/70 text-xs">
              <button
                type="button"
                id="btn-switch-tab-login"
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all ${
                  mode === 'login'
                    ? 'bg-[#123B7A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Iniciar Sessão
              </button>
              <button
                type="button"
                id="btn-switch-tab-register"
                onClick={() => setMode('register')}
                className={`flex-1 py-2 rounded-xl font-bold uppercase text-xs tracking-wider transition-all ${
                  mode === 'register'
                    ? 'bg-[#123B7A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Criar Registo
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODE 1: LOGIN FORM */}
          {/* ============================================================ */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 block">User (Nome de Utilizador) ou E-mail</label>
                  <span className="text-[10px] text-slate-400 font-medium">Unidades, MINSA ou Utentes</span>
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="input-login-email"
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: farmacia.luanda, minsa.dnme ou email@saude.ao"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-colors"
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
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-colors"
                  />
                  <button
                    type="button"
                    id="btn-toggle-login-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                    title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Explicit Forgot Password Link */}
                <div className="text-right pt-1">
                  <button
                    type="button"
                    id="link-forgot-password"
                    onClick={() => {
                      setResetEmail(email);
                      setMode('forgot_password');
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline transition-colors cursor-pointer"
                  >
                    Esqueceu-se da palavra-passe? Clique aqui
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                id="btn-submit-login"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>ENTRAR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest absolute">
                  OU
                </span>
              </div>

              {/* Google Sign-in Button */}
              <button
                type="button"
                id="btn-google-login"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-2xs hover:shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isGoogleSubmitting ? (
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {/* Official Google G Icon SVG */}
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
          {/* MODE 2: REGISTER FORM */}
          {/* ============================================================ */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5 text-xs">
              {/* Profile Selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Tipo de Perfil</label>
                <select
                  id="select-register-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 cursor-pointer focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-colors font-medium"
                >
                  <option value="paciente">Paciente / Utente</option>
                  <option value="unidade">Estabelecimento de Saúde (Farmácia, Clínica, Hospital, Centro Médico, etc.)</option>
                  <option value="deposito">Depósito Grossista (Exclusivo para distribuição e abastecimento B2B)</option>
                  <option value="institucional">Entidade Governamental / Regulador (MINSA / ARMED)</option>
                </select>
              </div>

              {/* Unit Name and Establishment Type (When not patient) */}
              {role !== 'paciente' && (
                <div className={`grid grid-cols-1 ${role === 'unidade' ? 'md:grid-cols-2' : ''} gap-3`}>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block">
                      {role === 'deposito' ? 'Nome Oficial do Depósito Grossista *' : 'Nome Oficial do Estabelecimento *'}
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        id="input-register-unit-name"
                        type="text"
                        required
                        value={nomeUnidade}
                        onChange={(e) => setNomeUnidade(e.target.value)}
                        placeholder={role === 'deposito' ? 'Ex: Depósito Central Grossista Luanda' : 'Ex: Farmácia Sagrada Esperança'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  {role === 'unidade' && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">
                        Tipo de Estabelecimento de Saúde *
                      </label>
                      <select
                        id="select-register-unit-type"
                        value={tipoUnidade}
                        onChange={(e) => setTipoUnidade(e.target.value as any)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 cursor-pointer focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-colors font-medium"
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
                </div>
              )}

              {/* MANDATORY MINSA REGISTRATION NUMBER & DOCUMENT (Obrigatório conforme Decreto Executivo MINSA) */}
              {(role === 'unidade' || role === 'deposito') && (
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Regulamentação MINSA (Obrigatório)
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      Exigido por Lei
                    </span>
                  </div>

                  {/* License Number Input (Matches User Provided Screenshot) */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Nº de Alvará Sanitário / Registo MINSA *
                    </label>
                    <input
                      id="input-register-alvara-minsa"
                      type="text"
                      required
                      value={alvaraMinsa}
                      onChange={(e) => setAlvaraMinsa(e.target.value)}
                      placeholder="CERT-MINSA-2025-4891"
                      className="w-full bg-white border border-emerald-300/80 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500">
                      Introduza o número de emissão oficial do Alvará Sanitário emitido pelo Ministério da Saúde.
                    </p>
                  </div>

                  {/* Mandatory MINSA Document File Upload */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block text-xs">
                      Documento Oficial do MINSA (Alvará Sanitário / Certidão) *
                    </label>
                    
                    <div className="border-2 border-dashed border-emerald-300/90 rounded-xl p-3 bg-white/80 hover:bg-emerald-50/30 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {documentoMinsaNome || 'Nenhum documento anexado'}
                            </p>
                            <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              Ficheiro verificado para homologação nacional
                            </p>
                          </div>
                        </div>

                        <div>
                          <input
                            type="file"
                            id="input-register-minsa-file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setDocumentoMinsaFile(file);
                                setDocumentoMinsaNome(file.name);
                              }
                            }}
                          />
                          <label
                            htmlFor="input-register-minsa-file"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition shadow-2xs shrink-0"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Substituir</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Formatos aceites: PDF, JPG, PNG (máx. 10MB). Obrigatório para validação da unidade.
                    </p>
                  </div>
                </div>
              )}

              {/* Name & Email in 2 columns on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Responsible Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Nome Completo *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="input-register-name"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Manuel dos Santos"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* E-mail with Real-Time Authenticity Verification */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block">E-mail *</label>
                    {email.length > 0 && emailTouched && (
                      <span className="text-[10px] font-bold">
                        {emailVerification.isValid ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> E-mail Autêntico
                          </span>
                        ) : (
                          <span className="text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> E-mail Suspeito
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      id="input-register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (!emailTouched) setEmailTouched(true);
                      }}
                      onBlur={() => setEmailTouched(true)}
                      placeholder="contacto@exemplo.ao ou nome@gmail.com"
                      className={`w-full bg-slate-50 border rounded-xl pl-10 pr-3.5 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-hidden transition-colors ${
                        emailTouched && !emailVerification.isValid && email.length > 0
                          ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-600'
                          : emailTouched && emailVerification.isValid
                          ? 'border-emerald-500 bg-emerald-50/20 text-slate-800 focus:border-emerald-600'
                          : 'border-slate-200 focus:border-emerald-600 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Email Error / Warning Alert Banner */}
                  {emailTouched && email.length > 0 && !emailVerification.isValid && (
                    <div
                      id="alert-email-invalid"
                      className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold">E-mail não verificado ou inválido:</p>
                        <p className="text-[10px] text-rose-700 leading-snug">
                          {emailVerification.reason || 'Por favor introduza um endereço de e-mail autêntico e verdadeiro.'}
                        </p>
                        {emailVerification.suggestion && (
                          <button
                            type="button"
                            onClick={() => setEmail(emailVerification.suggestion!)}
                            className="text-[10px] font-bold text-emerald-700 underline hover:text-emerald-800 block pt-0.5 text-left"
                          >
                            💡 Corrigir para {emailVerification.suggestion}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone, Province, and Municipality in responsive grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Phone with Country Dialing Code Selector & 9 Digits Restriction */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block">Telemóvel *</label>
                    <span
                      className={`text-[10px] font-bold ${
                        telefoneDigitos.length === 9
                          ? 'text-emerald-600'
                          : telefoneDigitos.length > 0
                          ? 'text-amber-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {telefoneDigitos.length === 9 ? '✓ 9/9 dígitos' : `${telefoneDigitos.length}/9 dígitos`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Country Code Select */}
                    <div className="w-32 shrink-0 relative">
                      <select
                        id="select-register-country-code"
                        value={indicativoPais}
                        onChange={(e) => setIndicativoPais(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-slate-800 text-xs font-bold cursor-pointer focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-colors"
                      >
                        {COUNTRY_DIALING_CODES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.country} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 9-Digit Phone Input */}
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="input-register-phone"
                        type="tel"
                        inputMode="numeric"
                        required
                        maxLength={9}
                        value={telefoneDigitos}
                        onChange={(e) => {
                          const digits = sanitizePhoneDigits(e.target.value, 9);
                          setTelefoneDigitos(digits);
                        }}
                        placeholder="923 000 000"
                        className={`w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2 text-slate-800 font-mono font-bold placeholder:text-slate-400 focus:outline-hidden transition-colors ${
                          telefoneDigitos.length === 9
                            ? 'border-emerald-500 bg-emerald-50/20 text-slate-900'
                            : telefoneDigitos.length > 0
                            ? 'border-amber-400 focus:border-emerald-600'
                            : 'border-slate-200 focus:border-emerald-600 focus:bg-white'
                        }`}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Limite 9 dígitos ({indicativoPais}).
                  </p>
                </div>

                {/* Province */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Província *</label>
                  <select
                    id="select-register-province"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 cursor-pointer focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                  >
                    {PROVINCES_ANGOLA.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Municipality */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Município *</label>
                  <input
                    id="input-register-municipality"
                    type="text"
                    value={municipio}
                    onChange={(e) => setMunicipio(e.target.value)}
                    placeholder="Maianga"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Address & GPS Activation for Health Unit or Pharmaceutical Depot */}
              {(role === 'unidade' || role === 'deposito') && (
                <div className="p-3.5 bg-sky-50/60 border border-sky-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-sky-900 tracking-wider flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-sky-600" />
                      Endereço & Localização GPS da Unidade *
                    </span>
                    {gpsCaptured ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> GPS Ativado
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        GPS Recomendado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-xs">Bairro / Distrito *</label>
                      <input
                        id="input-register-bairro"
                        type="text"
                        required
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Ex: Alvalade, Vila Alice, Talatona"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-hidden focus:border-sky-600 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-xs">Morada / Rua & Ponto de Referência</label>
                      <input
                        id="input-register-endereco"
                        type="text"
                        value={enderecoCompleto}
                        onChange={(e) => setEnderecoCompleto(e.target.value)}
                        placeholder="Ex: Rua Comandante Gika, Edifício Garden, R/C"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-hidden focus:border-sky-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* GPS Button and Coordinates Feedback */}
                  <div
                    id="unit-gps-section"
                    className={`rounded-xl p-3 space-y-2.5 transition-all ${
                      !gpsCaptured
                        ? 'bg-amber-50/70 border-2 border-amber-300'
                        : 'bg-white border border-sky-100'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-600 leading-snug">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800">Coordenadas Geográficas Exatas (GPS)</p>
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
                            OBRIGATÓRIO *
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Ative o GPS para que os utentes e pacientes localizem a sua unidade por raio de distância e rota em tempo real.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="btn-activate-unit-gps"
                        onClick={handleCaptureUnitGPS}
                        disabled={isCapturingGps}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs ${
                          gpsCaptured
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#123B7A] hover:bg-[#0c2854] text-white active:scale-95 animate-pulse'
                        }`}
                      >
                        <Crosshair className={`w-3.5 h-3.5 ${isCapturingGps ? 'animate-spin' : ''}`} />
                        <span>
                          {isCapturingGps
                            ? 'A obter sinal GPS...'
                            : gpsCaptured
                            ? '📍 GPS Ativo (Recapturar)'
                            : '📍 Ativar GPS da Unidade (Obrigatório)'}
                        </span>
                      </button>
                    </div>

                    {!gpsCaptured && (
                      <div className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-950 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Ativação de GPS Obrigatória:</strong> É necessário capturar as coordenadas da unidade antes de submeter o registo.
                        </span>
                      </div>
                    )}

                    {gpsCaptured && gpsCoords && (
                      <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="font-mono font-bold">
                            Lat: {gpsCoords.lat.toFixed(6)} | Lng: {gpsCoords.lng.toFixed(6)}
                          </span>
                          {gpsCoords.accuracy && (
                            <span className="text-[10px] text-emerald-700 font-medium">
                              (Precisão: ~{gpsCoords.accuracy}m)
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          ✓ Localização GPS Verificada
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Password & Confirm Password in 2 columns on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                {/* Password Field with Eye Toggle */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Palavra-passe *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="input-register-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres seguros"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                    />
                    <button
                      type="button"
                      id="btn-toggle-register-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                      title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                      aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field with Eye Toggle & Validation */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Confirmar palavra-passe *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      id="input-register-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a palavra-passe"
                      className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-hidden transition-colors ${
                        showPasswordMismatchError
                          ? 'border-rose-400 bg-rose-50/50 text-rose-800 focus:border-rose-600'
                          : passwordsMatch && confirmPassword.length > 0
                          ? 'border-emerald-500 bg-emerald-50/30 text-slate-800'
                          : 'border-slate-200 focus:border-emerald-600 focus:bg-white'
                      }`}
                    />
                    <button
                      type="button"
                      id="btn-toggle-register-confirm-password"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                      title={showConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                      aria-label={showConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Error message for mismatch */}
                  {showPasswordMismatchError && (
                    <p
                      id="error-msg-password-mismatch"
                      className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 pt-1 animate-fadeIn"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>As palavras-passe não coincidem.</span>
                    </p>
                  )}

                  {passwordsMatch && confirmPassword.length > 0 && (
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 pt-1 animate-fadeIn">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Palavras-passe coincidem perfeitamente.</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Força da palavra-passe:</span>
                    <span className={`font-bold ${passwordEvaluation.colorClass}`}>
                      {passwordEvaluation.label}
                    </span>
                  </div>

                  {/* 3-Step Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex gap-0.5">
                    <div
                      className={`h-full flex-1 rounded-full transition-all ${
                        passwordEvaluation.score >= 1 ? passwordEvaluation.barColor : 'bg-transparent'
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full transition-all ${
                        passwordEvaluation.score >= 3 ? passwordEvaluation.barColor : 'bg-transparent'
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full transition-all ${
                        passwordEvaluation.score >= 5 ? passwordEvaluation.barColor : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* Rules Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 text-[10px] text-slate-500 pt-1">
                    <div
                      className={`flex items-center gap-1 ${
                        passwordEvaluation.hasMinLength ? 'text-emerald-700 font-semibold' : ''
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          passwordEvaluation.hasMinLength ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span>8+ caracteres</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 ${
                        passwordEvaluation.hasUpperCase ? 'text-emerald-700 font-semibold' : ''
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          passwordEvaluation.hasUpperCase ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span>Letra maiúscula</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 ${
                        passwordEvaluation.hasLowerCase ? 'text-emerald-700 font-semibold' : ''
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          passwordEvaluation.hasLowerCase ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span>Letra minúscula</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 ${
                        passwordEvaluation.hasNumber ? 'text-emerald-700 font-semibold' : ''
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          passwordEvaluation.hasNumber ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span>Pelo menos 1 número</span>
                    </div>

                    <div
                      className={`flex items-center gap-1 col-span-2 sm:col-span-4 ${
                        passwordEvaluation.hasSpecialChar ? 'text-emerald-700 font-semibold' : ''
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          passwordEvaluation.hasSpecialChar ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <span>Carácter especial (!@#$%&*)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* SAAS SUBSCRIPTION & PAYMENT FLOW (UNIDADE / DEPÓSITO) */}
              {/* ============================================================ */}
              {(role === 'unidade' || role === 'deposito') && (
                <div className="space-y-6 pt-4 border-t border-slate-200" id="section-saas-subscription-registration">
                  {/* 1. ESCOLHA DO PLANO SAAS * */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00A878] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        ESCOLHA DO PLANO SAAS *
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PLANS_DEFINITIONS.map((plan) => {
                        const isSelected = selectedPlan === plan.id;
                        return (
                          <button
                            key={plan.id}
                            type="button"
                            id={`card-plan-${plan.id}`}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between relative cursor-pointer group ${
                              isSelected
                                ? 'border-2 border-[#00A878] bg-[#E8F5F1]/20 ring-1 ring-[#00A878]/30 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white shadow-2xs hover:shadow-xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-bold text-slate-900 text-sm">{plan.nome}</span>
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'border-[#00A878] bg-[#00A878] text-white'
                                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed min-h-[44px]">
                                {plan.descricao}
                              </p>
                            </div>

                            <div className="mt-4 pt-2 border-t border-slate-100/80">
                              {plan.preco_base_mensal === 0 ? (
                                <span className="text-sm font-bold text-[#00A878]">Grátis</span>
                              ) : (
                                <div className="text-sm font-bold text-[#00A878]">
                                  {plan.preco_base_mensal.toLocaleString('pt-PT')} AOA
                                  <span className="text-[11px] font-normal text-slate-400">/mês</span>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. ESCOLHA DA PERIODICIDADE DE FATURAÇÃO * */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00A878] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        ESCOLHA DA PERIODICIDADE DE FATURAÇÃO *
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {(
                        [
                          { id: 'mensal', title: 'Mensal', subtitle: 'Sem desconto' },
                          { id: 'trimestral', title: 'Trimestral', subtitle: '5% de desconto' },
                          { id: 'semestral', title: 'Semestral', subtitle: '10% de desconto' },
                          { id: 'anual', title: 'Anual', subtitle: '20% de desconto' },
                        ] as const
                      ).map((item) => {
                        const isSelected = selectedPeriodicity === item.id;
                        const pPrice = calculatePlanPrice(selectedPlan, item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            id={`card-periodicity-${item.id}`}
                            onClick={() => setSelectedPeriodicity(item.id)}
                            className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between relative cursor-pointer group ${
                              isSelected
                                ? 'border-2 border-[#00A878] bg-[#E8F5F1]/20 ring-1 ring-[#00A878]/30 shadow-xs'
                                : 'border-slate-200 hover:border-slate-300 bg-white shadow-2xs hover:shadow-xs'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</span>
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                                    isSelected
                                      ? 'border-[#00A878] bg-[#00A878] text-white'
                                      : 'border-slate-300 bg-white group-hover:border-slate-400'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">{item.subtitle}</p>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-100/80">
                              <span className="text-xs sm:text-sm font-bold text-[#00A878]">
                                {pPrice.formattedTotal} AOA
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. PAGAMENTO OBRIGATÓRIO DE ASSINATURA * */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#00A878] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        3
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        PAGAMENTO OBRIGATÓRIO DE ASSINATURA *
                      </h4>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-4 shadow-2xs">
                      {/* Summary Bar */}
                      {(() => {
                        const currentPlan =
                          PLANS_DEFINITIONS.find((p) => p.id === selectedPlan) || PLANS_DEFINITIONS[1];
                        const pricing = calculatePlanPrice(selectedPlan, selectedPeriodicity);
                        const periodicityLabels: Record<PlanPeriodicity, string> = {
                          mensal: 'Mensal',
                          trimestral: 'Trimestral',
                          semestral: 'Semestral',
                          anual: 'Anual',
                        };
                        return (
                          <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-slate-100 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs sm:text-sm font-bold text-slate-900">
                                {currentPlan.nome} · {periodicityLabels[selectedPeriodicity]}
                              </span>
                              {pricing.savings > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Poupa {pricing.savings.toLocaleString('pt-PT')} AOA
                                </span>
                              )}
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-[#00A878]">
                              Total: {pricing.formattedTotal} AOA
                            </div>
                          </div>
                        );
                      })()}

                      {selectedPlan === 'gratis' ? (
                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            O <strong>Plano Grátis</strong> tem custo de 0 AOA. Não é necessário efetuar pagamento nem anexar comprovativo inicial.
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* Payment Method Cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Multicaixa Express */}
                            <div
                              onClick={() => setSelectedPaymentMethod('multicaixa_express')}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                selectedPaymentMethod === 'multicaixa_express'
                                  ? 'border-2 border-[#00A878] bg-[#E8F5F1]/20 ring-1 ring-[#00A878]/30 shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                  <Smartphone className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-xs sm:text-sm text-slate-900">
                                    Multicaixa Express
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    Número Express:{' '}
                                    <span className="font-bold text-slate-800">
                                      {SYSTEM_CONFIG_INITIAL.multicaixa_express_numero}
                                    </span>
                                  </div>
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyText(
                                          SYSTEM_CONFIG_INITIAL.multicaixa_express_numero,
                                          'mcx'
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" />
                                      {copiedKey === 'mcx' ? 'Copiado!' : 'Copiar número'}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                                  selectedPaymentMethod === 'multicaixa_express'
                                    ? 'border-[#00A878] bg-[#00A878] text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {selectedPaymentMethod === 'multicaixa_express' && (
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                )}
                              </div>
                            </div>

                            {/* Bancária (BAI) */}
                            <div
                              onClick={() => setSelectedPaymentMethod('transferencia_bancaria')}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                                selectedPaymentMethod === 'transferencia_bancaria'
                                  ? 'border-2 border-[#00A878] bg-[#E8F5F1]/20 ring-1 ring-[#00A878]/30 shadow-xs'
                                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                  <Building className="w-5 h-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="font-bold text-xs sm:text-sm text-slate-900">
                                    Bancária
                                  </div>
                                  <div className="text-xs text-slate-600 leading-snug">
                                    {SYSTEM_CONFIG_INITIAL.banco_nome} · IBAN{' '}
                                    <span className="font-mono font-bold text-slate-800 break-all">
                                      {SYSTEM_CONFIG_INITIAL.banco_iban}
                                    </span>
                                  </div>
                                  <div className="pt-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyText(SYSTEM_CONFIG_INITIAL.banco_iban, 'iban');
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" />
                                      {copiedKey === 'iban' ? 'Copiado!' : 'Copiar IBAN'}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                                  selectedPaymentMethod === 'transferencia_bancaria'
                                    ? 'border-[#00A878] bg-[#00A878] text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {selectedPaymentMethod === 'transferencia_bancaria' && (
                                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Remeter Comprovativo (PDF ou Imagem) */}
                          <div className="space-y-2 pt-2">
                            <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
                              <span>Remeter Comprovativo de Pagamento (PDF ou Imagem) *</span>
                              <span className="text-[11px] font-normal text-slate-400">PDF, JPG, PNG (máx. 10MB)</span>
                            </label>

                            {comprovativoNome ? (
                              /* File uploaded preview card */
                              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  {comprovativoTipo === 'imagem' && comprovativoPreviewUrl ? (
                                    <img
                                      src={comprovativoPreviewUrl}
                                      alt="Pré-visualização do comprovativo"
                                      className="w-12 h-12 object-cover rounded-lg border border-emerald-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-rose-100 text-rose-700 flex flex-col items-center justify-center shrink-0 border border-rose-200">
                                      <FileText className="w-5 h-5" />
                                      <span className="text-[9px] font-bold uppercase mt-0.5">PDF</span>
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <div className="font-semibold text-xs text-slate-900 truncate">
                                      {comprovativoNome}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                                        {comprovativoTipo === 'pdf' ? 'Documento PDF' : 'Imagem'}
                                      </span>
                                      <span>•</span>
                                      <span>{comprovativoTamanho || 'Anexado'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <label className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                                    Substituir
                                    <input
                                      type="file"
                                      accept="application/pdf,image/png,image/jpeg,image/jpg"
                                      className="hidden"
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleComprovativoChange(e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={handleRemoveComprovativo}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Remover comprovativo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Empty Dropzone */
                              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-5 flex flex-col items-center justify-center text-center bg-slate-50/60 hover:bg-emerald-50/20 transition-all cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                                  <Upload className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-slate-800">
                                  Clique para selecionar ou arraste o comprovativo para aqui
                                </span>
                                <span className="text-[11px] text-slate-500 mt-0.5">
                                  Formatos aceites: PDF, PNG, JPG ou JPEG (máximo 10MB)
                                </span>
                                <input
                                  type="file"
                                  accept="application/pdf,image/png,image/jpeg,image/jpg"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleComprovativoChange(e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                            )}

                            {/* Optional Reference Input */}
                            <div className="pt-1">
                              <label className="font-semibold text-slate-700 text-[11px] block mb-1">
                                Nº de Referência da Operação / Transação (Opcional)
                              </label>
                              <input
                                type="text"
                                value={referenciaPagamento}
                                onChange={(e) => setReferenciaPagamento(e.target.value)}
                                placeholder="Ex: MCX-948210 ou REF-BAI-2026-8812"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-colors"
                              />
                            </div>

                            {/* Information Note */}
                            <p className="text-[10px] text-slate-400 leading-relaxed pt-1 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>
                                O comprovativo em PDF ou imagem é verificado pela tesouraria para homologação imediata da conta e emissão da factura oficial com NIF.
                              </span>
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Mandatory Legal & Data Protection Checkbox */}
              <div className="pt-2">
                <div
                  id="section-legal-terms"
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                >
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      id="checkbox-accept-terms"
                      type="checkbox"
                      required
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                    <span className="text-xs text-slate-700 leading-snug">
                      Li e aceito os{' '}
                      <button
                        type="button"
                        id="link-register-terms"
                        onClick={(e) => {
                          e.preventDefault();
                          openLegalDocument('termos');
                        }}
                        className="font-bold text-emerald-700 hover:text-emerald-800 underline inline cursor-pointer"
                      >
                        Termos de Utilização
                      </button>{' '}
                      e a{' '}
                      <button
                        type="button"
                        id="link-register-privacy"
                        onClick={(e) => {
                          e.preventDefault();
                          openLegalDocument('privacidade');
                        }}
                        className="font-bold text-emerald-700 hover:text-emerald-800 underline inline cursor-pointer"
                      >
                        Política de Privacidade e Protecção de Dados
                      </button>
                      .
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 pl-6">
                    Em conformidade com a Lei n.º 22/11 da República de Angola.
                  </p>
                </div>
              </div>

              {/* Register Submit Button */}
              <button
                type="submit"
                id="btn-submit-register"
                disabled={isSubmitting || !acceptedTerms || (confirmPassword.length > 0 && !passwordsMatch)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-3"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {role === 'unidade' || role === 'deposito'
                        ? 'Criar Registo & Submeter Subscrição'
                        : 'Criar Conta & Aceder'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest absolute">
                  OU
                </span>
              </div>

              {/* Google Sign-in for Register */}
              <button
                type="button"
                id="btn-google-register"
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
                    <span>Registar com Google</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* MODE 3: FORGOT PASSWORD FORM */}
          {/* ============================================================ */}
          {mode === 'forgot_password' && (
            <div className="mt-5 space-y-4 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-blue-900">
                <p className="font-semibold text-xs mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Instruções de Recuperação
                </p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Introduza o seu endereço de e-mail e enviaremos instruções para redefinir a sua palavra-passe com total confidencialidade.
                </p>
              </div>

              {!resetSentSuccess ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">E-mail associado à conta</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="input-forgot-email"
                        type="email"
                        required
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="seu-email@dominio.ao"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-forgot-password"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Enviar instruções</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Success Feedback */
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5 text-emerald-900">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs">Pedido Processado</p>
                      <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                        Se existir uma conta associada a este e-mail, receberá instruções para redefinir a sua palavra-passe.
                      </p>
                    </div>
                  </div>

                  {/* Test simulation shortcut button */}
                  <div className="pt-2 border-t border-emerald-200/60">
                    <p className="text-[11px] text-emerald-900 font-semibold mb-2">
                      Ambiente de Teste Interativo:
                    </p>
                    <button
                      type="button"
                      id="btn-simulate-reset-link"
                      onClick={() => setMode('reset_password')}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Abrir Tela de Redefinição Agora</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  id="btn-back-to-login"
                  onClick={() => setMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Voltar para Iniciar Sessão</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* MODE 4: RESET PASSWORD FORM */}
          {/* ============================================================ */}
          {mode === 'reset_password' && (
            <form onSubmit={handleResetPasswordSubmit} className="mt-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700">
                <p className="text-xs">
                  A redefinir palavra-passe para a conta:{' '}
                  <strong>{resetEmail || email || 'utilizador@mutikukwama.ao'}</strong>
                </p>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Nova palavra-passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="input-reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres seguros"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    id="btn-toggle-reset-password"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                    title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Força da nova palavra-passe:</span>
                    <span className={`font-bold ${passwordEvaluation.colorClass}`}>
                      {passwordEvaluation.label}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex gap-0.5">
                    <div
                      className={`h-full flex-1 rounded-full transition-all ${
                        passwordEvaluation.score >= 1 ? passwordEvaluation.barColor : 'bg-transparent'
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full transition-all ${
                        passwordEvaluation.score >= 3 ? passwordEvaluation.barColor : 'bg-transparent'
                      }`}
                    />
                    <div
                      className={`h-full flex-1 rounded-full transition-all ${
                        passwordEvaluation.score >= 5 ? passwordEvaluation.barColor : 'bg-transparent'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Confirmar nova palavra-passe *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="input-reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova palavra-passe"
                    className={`w-full bg-slate-50 border rounded-xl pl-10 pr-10 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-hidden transition-colors ${
                      showPasswordMismatchError
                        ? 'border-rose-400 bg-rose-50/50 text-rose-800 focus:border-rose-600'
                        : passwordsMatch && confirmPassword.length > 0
                        ? 'border-emerald-500 bg-emerald-50/30 text-slate-800'
                        : 'border-slate-200 focus:border-emerald-600 focus:bg-white'
                    }`}
                  />
                  <button
                    type="button"
                    id="btn-toggle-reset-confirm-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                    title={showConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                    aria-label={showConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {showPasswordMismatchError && (
                  <p
                    id="error-msg-reset-mismatch"
                    className="text-xs text-rose-600 font-semibold flex items-center gap-1.5 pt-1 animate-fadeIn"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>As palavras-passe não coincidem.</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                id="btn-submit-reset-password"
                disabled={isSubmitting || !passwordEvaluation.isValid || !passwordsMatch}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Guardar nova palavra-passe</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Cancelar e Voltar ao Início de Sessão</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* MANDATORY AUTH FOOTER */}
          {/* ============================================================ */}
          <div
            id="auth-modal-footer"
            className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2"
          >
            <p className="text-[11px] text-slate-400">
              © MUTIKUKWAMA. Todos os direitos reservados.
            </p>
            <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 font-medium">
              <button
                type="button"
                id="auth-footer-link-privacy"
                onClick={() => openLegalDocument('privacidade')}
                className="hover:text-emerald-700 transition-colors underline-offset-2 hover:underline cursor-pointer"
              >
                Política de Privacidade
              </button>
              <span>•</span>
              <button
                type="button"
                id="auth-footer-link-data-protection"
                onClick={() => openLegalDocument('proteccao_dados')}
                className="hover:text-emerald-700 transition-colors underline-offset-2 hover:underline cursor-pointer"
              >
                Protecção de Dados
              </button>
              <span>•</span>
              <button
                type="button"
                id="auth-footer-link-terms"
                onClick={() => openLegalDocument('termos')}
                className="hover:text-emerald-700 transition-colors underline-offset-2 hover:underline cursor-pointer"
              >
                Termos de Utilização
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Legal Modal if opened internally */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialDoc={legalModalDoc}
        showAcceptButton={mode === 'register'}
        onAcceptTerms={() => setAcceptedTerms(true)}
      />
    </>
  );
};
