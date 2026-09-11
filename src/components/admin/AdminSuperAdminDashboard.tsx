import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  CreditCard,
  Layers,
  FileText,
  Settings,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Search,
  Lock,
  DollarSign,
  TrendingUp,
  Activity,
  Code,
  Copy,
  Plus,
  Edit,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Key,
  KeyRound,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  X,
  UserPlus,
  Landmark,
  User,
  Share2,
  MessageSquare,
  Sliders,
  ExternalLink,
  Send,
  HeartHandshake,
  HeartPulse,
  Award,
  Globe,
  ToggleLeft,
  ToggleRight,
  Upload,
  Image as ImageIcon,
  FileImage,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabaseData } from '../../services/supabase';
import { PRODUCTION_SUPABASE_SQL } from '../../services/sqlSchema';
import { PROVINCES_ANGOLA, MUNICIPALITIES_LUANDA, PLANS_DEFINITIONS } from '../../services/mockData';
import {
  HealthUnit,
  PaymentTransaction,
  SystemConfig,
  UserProfile,
  PlanType,
  PlanPeriodicity,
  UnitType,
  UserRole,
  SponsorPartner,
  SponsorTier,
} from '../../types';
import { SponsorsCarousel } from '../home/SponsorsCarousel';
import { MinsaDocumentModal } from '../minsa/MinsaDocumentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';

export const AdminSuperAdminDashboard: React.FC = () => {
  const { currentUser, isSuperAdmin, isAdmin, switchRole, demoUsers } = useAuth();
  const { success, error, info, warning } = useToast();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'unidades'
    | 'pagamentos'
    | 'usuarios'
    | 'depositos'
    | 'patrocinadores'
    | 'logs'
    | 'configuracoes'
    | 'sql'
  >('overview');

  // Search & Filter states
  const [unitSearch, setUnitSearch] = useState('');
  const [unitProvinceFilter, setUnitProvinceFilter] = useState('all');
  const [unitTypeFilter, setUnitTypeFilter] = useState('all');
  const [unitStatusFilter, setUnitStatusFilter] = useState('all');

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'pendente' | 'confirmado' | 'rejeitado'>('all');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const [logSearch, setLogSearch] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState('all');

  // Sponsor Search & Filter states
  const [sponsorSearch, setSponsorSearch] = useState('');
  const [sponsorTierFilter, setSponsorTierFilter] = useState('all');
  const [sponsorStatusFilter, setSponsorStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<HealthUnit | null>(null);
  const [renewUnitModalTarget, setRenewUnitModalTarget] = useState<HealthUnit | null>(null);
  const [renewDays, setRenewDays] = useState(30);
  const [renewPlan, setRenewPlan] = useState<PlanType>('medio');

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [isManualPaymentModalOpen, setIsManualPaymentModalOpen] = useState(false);
  const [viewingPaymentProof, setViewingPaymentProof] = useState<PaymentTransaction | null>(null);

  // Sponsor Modal State
  const [isAddSponsorModalOpen, setIsAddSponsorModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsorPartner | null>(null);
  const [sponsorForm, setSponsorForm] = useState({
    nome: '',
    categoria: 'Patrocinador Oficial',
    tier: 'ouro' as SponsorTier,
    descricao: '',
    logo_url: '',
    website_url: '',
    telefone: '+244 ',
    email: '',
    ativo: true,
    em_destaque: false,
    ordem: 1,
  });
  const [sponsorLogoFileName, setSponsorLogoFileName] = useState<string>('');
  const [isDraggingSponsorLogo, setIsDraggingSponsorLogo] = useState(false);
  const sponsorFileInputRef = React.useRef<HTMLInputElement>(null);

  const [configLogoFileName, setConfigLogoFileName] = useState<string>('');
  const [isDraggingConfigLogo, setIsDraggingConfigLogo] = useState(false);
  const configFileInputRef = React.useRef<HTMLInputElement>(null);

  // Quick Reset Password Modal State
  const [resetPasswordModalTarget, setResetPasswordModalTarget] = useState<{
    id: string;
    name: string;
    email: string;
    type: 'unit' | 'user';
    role?: string;
    currentPassword?: string;
  } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showUnitPassword, setShowUnitPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [minsaDocModalUnit, setMinsaDocModalUnit] = useState<HealthUnit | null>(null);
  const [selectedPaymentForProof, setSelectedPaymentForProof] = useState<PaymentTransaction | null>(null);

  // Action Confirmation & Prompt Modals (replaces native browser prompts/confirms that fail in iframes)
  const [unitToDelete, setUnitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [unitToReject, setUnitToReject] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('Documentação regulamentar incompleta ou não conforme as normas do MINSA.');
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [sponsorToDelete, setSponsorToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isResetDbModalOpen, setIsResetDbModalOpen] = useState(false);
  const [isResetConfigModalOpen, setIsResetConfigModalOpen] = useState(false);
  const [isResetSponsorsModalOpen, setIsResetSponsorsModalOpen] = useState(false);

  // System Config State
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => supabaseData.getConfig());
  const [configSubTab, setConfigSubTab] = useState<'geral_rodape' | 'patrocinadores' | 'pagamentos'>('geral_rodape');

  // Form states for New Unit
  const [unitForm, setUnitForm] = useState({
    nome: '',
    tipo: 'farmacia' as UnitType,
    provincia: 'Luanda',
    municipio: 'Maianga',
    bairro: 'Alvalade',
    endereco_completo: '',
    telefone: '+244 923 ',
    whatsapp: '+244923',
    email: '',
    nova_senha: '',
    horario_funcionamento: 'Aberto 24 Horas',
    certificado_institucional: 'CERT-MINSA-2025-4891',
    documento_minsa_nome: 'alvara_sanitario_minsa_2025_4891.pdf',
    documento_minsa_url: 'alvara_sanitario_minsa_2025_4891.pdf',
    plano_tipo: 'medio' as PlanType,
    plano_periodicidade: 'mensal' as PlanPeriodicity,
    aberto_agora: true,
  });

  // Form state for New User / Access Management (Unidades, Ministério, Admins)
  const [userForm, setUserForm] = useState({
    accessCategory: 'unidade' as 'unidade' | 'institucional' | 'outro',
    nome: '',
    username: '',
    email: '',
    telefone: '+244 923 ',
    whatsapp: '+244923',
    nova_senha: '',
    role: 'unidade' as UserRole,
    unidade_id: '',
    departamento: 'Direcção Nacional de Medicamentos e Equipamentos (DNME)',
    cargo: 'Delegado Técnico / Inspector',
  });

  // Modal to display newly created credentials with 1-click copy & WhatsApp sharing
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    isOpen: boolean;
    tipo: 'unidade' | 'institucional' | 'outro';
    nome: string;
    username: string;
    email: string;
    password: string;
    entidadeNome: string;
    role: UserRole;
    telefone?: string;
  } | null>(null);

  // Form state for Manual Payment
  const [manualPayForm, setManualPayForm] = useState({
    unidade_id: '',
    plano_tipo: 'medio' as PlanType,
    periodicidade: 'mensal' as PlanPeriodicity,
    valor: 55000,
    metodo: 'transferencia_bancaria' as const,
    referencia_mcx: 'DEPÓSITO DIRECTO BAI',
    observacoes: 'Subscrição regularizada presencialmente',
  });

  // Data Refresh
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1);

  // Data fetching
  const allUnits = supabaseData.getAllUnits();
  const allPayments = supabaseData.getPayments();
  const allLogs = supabaseData.getLogs();
  const allUsers = supabaseData.getUsers();
  const allProducts = supabaseData.getProducts();
  const allSponsors = supabaseData.getAllSponsors();

  const activeSponsors = allSponsors.filter((s) => s.ativo);
  const pendingPayments = allPayments.filter((p) => p.status === 'pendente');
  const confirmedPayments = allPayments.filter((p) => p.status === 'confirmado');
  const totalRevenue = confirmedPayments.reduce((acc, p) => acc + p.valor, 0);

  const pendingUnits = allUnits.filter(
    (u) => (u as any).status_aprovacao === 'pendente' || u.plano_status === 'pendente'
  );
  const wholesaleUnits = allUnits.filter((u) => u.tipo === 'deposito');
  const pharmaciesCount = allUnits.filter((u) => u.tipo === 'farmacia').length;
  const activeUnitsCount = allUnits.filter((u) => u.plano_status === 'ativo').length;

  // Handlers
  const handleToggleSponsorActive = (id: string) => {
    const updated = supabaseData.toggleSponsorActive(id);
    if (updated) {
      triggerRefresh();
      success(
        `Empresa "${updated.nome}": ${updated.ativo ? 'ACTIVADA no carrossel da Home' : 'OCULTADA do carrossel'}.`
      );
    }
  };

  const handleToggleSponsorHighlight = (id: string) => {
    const updated = supabaseData.toggleSponsorHighlight(id);
    if (updated) {
      triggerRefresh();
      info(`Destaque de "${updated.nome}" ${updated.em_destaque ? 'activado' : 'desactivado'}.`);
    }
  };

  const handleSponsorLogoFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
      error('Por favor, selecione um arquivo de imagem válido (.png, .jpg, .jpeg, .webp, .svg).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('A imagem excede 5MB. Por favor, selecione uma imagem com menos de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSponsorForm((prev) => ({ ...prev, logo_url: result }));
        const sizeKb = Math.round(file.size / 1024);
        setSponsorLogoFileName(`${file.name} (${sizeKb} KB)`);
        success(`Logótipo "${file.name}" carregado com sucesso do computador!`);
      }
    };
    reader.onerror = () => {
      error('Falha ao ler a imagem do computador. Tente novamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleConfigLogoFileUpload = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
      error('Por favor, selecione um arquivo de imagem válido (.png, .jpg, .jpeg, .webp, .svg).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error('A imagem excede 5MB. Por favor, selecione uma imagem com menos de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setSystemConfig((prev) => ({ ...prev, logo_url: result }));
        const sizeKb = Math.round(file.size / 1024);
        setConfigLogoFileName(`${file.name} (${sizeKb} KB)`);
        success(`Logótipo institucional "${file.name}" carregado com sucesso do computador!`);
      }
    };
    reader.onerror = () => {
      error('Falha ao ler a imagem do computador. Tente novamente.');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAddSponsor = () => {
    setEditingSponsor(null);
    setSponsorLogoFileName('');
    setSponsorForm({
      nome: '',
      categoria: 'Patrocinador Oficial',
      tier: 'ouro' as SponsorTier,
      descricao: '',
      logo_url: '',
      website_url: '',
      telefone: '+244 ',
      email: '',
      ativo: true,
      em_destaque: false,
      ordem: allSponsors.length + 1,
    });
    setIsAddSponsorModalOpen(true);
  };

  const handleOpenEditSponsor = (sponsor: SponsorPartner) => {
    setEditingSponsor(sponsor);
    setSponsorLogoFileName(
      sponsor.logo_url?.startsWith('data:image') ? 'Imagem carregada do computador' : ''
    );
    setSponsorForm({
      nome: sponsor.nome,
      categoria: sponsor.categoria,
      tier: sponsor.tier,
      descricao: sponsor.descricao,
      logo_url: sponsor.logo_url,
      website_url: sponsor.website_url || '',
      telefone: sponsor.telefone || '+244 ',
      email: sponsor.email || '',
      ativo: sponsor.ativo,
      em_destaque: sponsor.em_destaque || false,
      ordem: sponsor.ordem,
    });
    setIsAddSponsorModalOpen(true);
  };

  const handleSaveSponsor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorForm.nome.trim()) {
      error('Por favor, indique o nome da empresa patrocinadora ou apoiante.');
      return;
    }

    if (editingSponsor) {
      supabaseData.updateSponsor(editingSponsor.id, {
        ...sponsorForm,
        ordem: Number(sponsorForm.ordem) || 1,
      });
      success(`Patrocinador "${sponsorForm.nome}" actualizado com sucesso!`);
    } else {
      supabaseData.createSponsor({
        ...sponsorForm,
        ordem: Number(sponsorForm.ordem) || (allSponsors.length + 1),
      });
      success(`Nova empresa "${sponsorForm.nome}" adicionada ao catálogo de patrocinadores!`);
    }

    setIsAddSponsorModalOpen(false);
    setEditingSponsor(null);
    triggerRefresh();
  };

  const handleDeleteSponsor = (id: string, name: string) => {
    setSponsorToDelete({ id, name });
  };

  const confirmDeleteSponsor = () => {
    if (!sponsorToDelete) return;
    supabaseData.deleteSponsor(sponsorToDelete.id);
    triggerRefresh();
    success(`Empresa "${sponsorToDelete.name}" removida com sucesso.`);
    setSponsorToDelete(null);
  };

  const handleResetSponsors = () => {
    setIsResetSponsorsModalOpen(true);
  };

  const confirmResetSponsors = () => {
    supabaseData.resetSponsors();
    triggerRefresh();
    success('Lista de patrocinadores restaurada para o padrão oficial.');
    setIsResetSponsorsModalOpen(false);
  };

  const handleToggleUnit = (unitId: string, currentStatus: string) => {
    const isCurrentlyActive = currentStatus === 'ativo';
    const updated = supabaseData.toggleUnitStatus(unitId, !isCurrentlyActive);
    if (updated) {
      triggerRefresh();
      success(`Unidade "${updated.nome}" alterada para ${updated.plano_status.toUpperCase()}.`);
    }
  };

  const handleApproveUnit = (unitId: string, unitName: string) => {
    const updated = supabaseData.approveUnit(unitId, currentUser?.nome || 'Super Administrador Geral');
    if (updated) {
      triggerRefresh();
      success(`Conta de "${unitName}" aprovada e activada com sucesso! Acesso concedido à plataforma.`);
    } else {
      error(`Não foi possível aprovar a unidade "${unitName}".`);
    }
  };

  const handleRejectUnit = (unitId: string, unitName: string) => {
    setUnitToReject({ id: unitId, name: unitName });
    setRejectReason('Documentação regulamentar incompleta ou não conforme as normas do MINSA.');
  };

  const confirmRejectUnit = () => {
    if (!unitToReject) return;
    const updated = supabaseData.rejectUnit(unitToReject.id, rejectReason, currentUser?.nome || 'Super Administrador Geral');
    if (updated) {
      triggerRefresh();
      warning(`A conta de "${unitToReject.name}" foi rejeitada/bloqueada.`);
    }
    setUnitToReject(null);
  };

  const handleDeleteUnit = (unitId: string, unitName: string) => {
    setUnitToDelete({ id: unitId, name: unitName });
  };

  const confirmDeleteUnit = () => {
    if (!unitToDelete) return;
    const { id, name } = unitToDelete;
    const ok = supabaseData.deleteUnit(id);
    if (ok) {
      triggerRefresh();
      success(`Unidade "${name}" eliminada com sucesso da plataforma.`);
    } else {
      error(`Não foi possível eliminar a unidade "${name}".`);
    }
    setUnitToDelete(null);
  };

  // Password Helpers
  const generateSecurePassword = (prefix = 'Mutiku') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%';
    let rand = '';
    for (let i = 0; i < 5; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const year = new Date().getFullYear();
    return `${prefix}@${year}!${rand}`;
  };

  const handleCopyCredentials = (
    email: string,
    password: string,
    entityName: string,
    roleLabel = 'Acesso Autorizado',
    username?: string
  ) => {
    const creds = `🏥 *MUTIKUKWAMA SAÚDE - CREDENCIAIS DE ACESSO*\n` +
      `-----------------------------------------\n` +
      `🏢 *Entidade / Nome:* ${entityName}\n` +
      `🛡️ *Perfil / Nível:* ${roleLabel}\n` +
      `👤 *User (Login):* ${username || email}\n` +
      `📧 *E-mail:* ${email}\n` +
      `🔑 *Password:* ${password}\n` +
      `🌐 *Portal de Acesso:* ${window.location.origin}\n` +
      `-----------------------------------------\n` +
      `*Aviso de Segurança:* Inicie sessão e altere a sua palavra-passe no primeiro acesso se desejar.`;
    navigator.clipboard.writeText(creds);
    success('Credenciais completas (User e Password) copiadas com sucesso!');
  };

  const handleShareViaWhatsApp = (phone: string | undefined, text: string) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(text);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  const handleOpenCreateUnitAccess = (targetUnitId?: string) => {
    setEditingUser(null);
    const suggestedPassword = generateSecurePassword('Farmacia');
    const selectedUnit = targetUnitId
      ? allUnits.find((u) => u.id === targetUnitId)
      : allUnits[0];

    const slug = selectedUnit?.slug || selectedUnit?.nome?.toLowerCase().replace(/[^a-z0-9]/g, '.').substring(0, 20) || 'unidade.saude';
    const cleanSlug = slug.replace(/^farmacia\./, '');

    setUserForm({
      accessCategory: 'unidade',
      nome: selectedUnit ? `Gestor (${selectedUnit.nome})` : 'Gestor de Farmácia',
      username: `farmacia.${cleanSlug}`,
      email: selectedUnit?.email || `farmacia.${cleanSlug}@saude.ao`,
      telefone: selectedUnit?.telefone || '+244 923 ',
      whatsapp: selectedUnit?.whatsapp || '+244923',
      nova_senha: suggestedPassword,
      role: selectedUnit?.tipo === 'deposito' ? 'deposito' : 'unidade',
      unidade_id: selectedUnit?.id || '',
      departamento: '',
      cargo: 'Responsável Técnico / Gestor de Farmácia',
    });
    setIsAddUserModalOpen(true);
  };

  const handleOpenCreateMinistryAccess = () => {
    setEditingUser(null);
    const suggestedPassword = generateSecurePassword('Minsa');
    setUserForm({
      accessCategory: 'institucional',
      nome: 'Dr. Delegado Institucional',
      username: 'minsa.dnme',
      email: 'minsa.dnme@saude.gov.ao',
      telefone: '+244 222 334 455',
      whatsapp: '+244922334455',
      nova_senha: suggestedPassword,
      role: 'institucional',
      unidade_id: '',
      departamento: 'Direcção Nacional de Medicamentos e Equipamentos (DNME)',
      cargo: 'Inspector Farmacêutico / Delegado Regulatório',
    });
    setIsAddUserModalOpen(true);
  };

  const handleExecuteResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordModalTarget) return;

    const pwd = newPasswordInput.trim() || generateSecurePassword(resetPasswordModalTarget.type === 'unit' ? 'Farmacia' : 'Mutiku');

    if (resetPasswordModalTarget.type === 'unit') {
      const res = supabaseData.resetUnitPassword(resetPasswordModalTarget.id, resetPasswordModalTarget.email, pwd);
      if (res.success) {
        success(`Senha da unidade "${resetPasswordModalTarget.name}" redefinida para: ${pwd}`);
        handleCopyCredentials(resetPasswordModalTarget.email, pwd, resetPasswordModalTarget.name);
      }
    } else {
      const res = supabaseData.resetUserPassword(resetPasswordModalTarget.id, pwd);
      if (res.success) {
        success(`Senha do utilizador "${resetPasswordModalTarget.name}" redefinida para: ${pwd}`);
        handleCopyCredentials(resetPasswordModalTarget.email, pwd, resetPasswordModalTarget.name);
      }
    }

    setResetPasswordModalTarget(null);
    setNewPasswordInput('');
    triggerRefresh();
  };

  const handleSaveUnitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.nome.trim()) {
      error('O nome da unidade é obrigatório.');
      return;
    }
    if (!unitForm.email.trim()) {
      error('O e-mail cadastrado da unidade é obrigatório para autenticação.');
      return;
    }

    if (editingUnit) {
      const updated: HealthUnit = {
        ...editingUnit,
        nome: unitForm.nome,
        tipo: unitForm.tipo,
        provincia: unitForm.provincia,
        municipio: unitForm.municipio,
        bairro: unitForm.bairro,
        endereco_completo: unitForm.endereco_completo || `${unitForm.bairro}, ${unitForm.municipio}, ${unitForm.provincia}`,
        telefone: unitForm.telefone,
        whatsapp: unitForm.whatsapp,
        email: unitForm.email,
        horario_funcionamento: unitForm.horario_funcionamento,
        certificado_institucional: unitForm.certificado_institucional,
        documento_minsa_nome: unitForm.documento_minsa_nome || editingUnit.documento_minsa_nome || 'alvara_minsa.pdf',
        documento_minsa_url: unitForm.documento_minsa_url || editingUnit.documento_minsa_url || 'alvara_minsa.pdf',
        plano_tipo: unitForm.plano_tipo,
        plano_periodicidade: unitForm.plano_periodicidade,
        aberto_agora: unitForm.aberto_agora,
        updated_at: new Date().toISOString(),
      };

      if (unitForm.nova_senha && unitForm.nova_senha.trim()) {
        updated.senha_provisoria = unitForm.nova_senha.trim();
        updated.ultima_redefinicao_senha = new Date().toISOString();
        supabaseData.resetUnitPassword(updated.id, unitForm.email, unitForm.nova_senha.trim());
      }

      supabaseData.saveUnit(updated);
      success(`Unidade "${updated.nome}" atualizada com sucesso!`);
    } else {
      const newUnit = supabaseData.createUnit({
        ...unitForm,
        endereco_completo: unitForm.endereco_completo || `${unitForm.bairro}, ${unitForm.municipio}, ${unitForm.provincia}`,
      });
      if (unitForm.nova_senha && unitForm.nova_senha.trim()) {
        supabaseData.resetUnitPassword(newUnit.id, unitForm.email, unitForm.nova_senha.trim());
      }
      success(`Nova unidade "${unitForm.nome}" credenciada no sistema!`);
    }

    setIsAddUnitModalOpen(false);
    setEditingUnit(null);
    triggerRefresh();
  };

  const handleRenewSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewUnitModalTarget) return;

    const res = supabaseData.extendUnitSubscription(renewUnitModalTarget.id, renewDays, renewPlan);
    if (res) {
      success(`Subscrição de "${res.nome}" estendida por +${renewDays} dias! Nova expiração: ${res.plano_data_expiracao}`);
    }
    setRenewUnitModalTarget(null);
    triggerRefresh();
  };

  const handleValidatePayment = (paymentId: string, approved: boolean) => {
    const res = supabaseData.validatePayment(paymentId, approved, currentUser?.nome || 'Super Administrador Geral');
    if (res) {
      triggerRefresh();
      if (approved) {
        success(`Pagamento ${res.id} aprovado com sucesso! Plano de ${res.unidade_nome} activado imediatamente.`);
      } else {
        info(`Pagamento ${res.id} rejeitado.`);
      }
    }
  };

  const handleCreateManualPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUnit = allUnits.find((u) => u.id === manualPayForm.unidade_id);
    if (!targetUnit) {
      error('Por favor seleccione uma unidade de saúde.');
      return;
    }

    supabaseData.createManualPayment({
      unidade_id: targetUnit.id,
      unidade_nome: targetUnit.nome,
      plano_tipo: manualPayForm.plano_tipo,
      periodicidade: manualPayForm.periodicidade,
      valor: manualPayForm.valor,
      metodo: manualPayForm.metodo,
      referencia_mcx: manualPayForm.referencia_mcx,
      observacoes: manualPayForm.observacoes,
    });

    setIsManualPaymentModalOpen(false);
    triggerRefresh();
    success(`Pagamento de ${manualPayForm.valor.toLocaleString()} AOA creditado para ${targetUnit.nome}!`);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.nome.trim()) {
      error('Por favor introduza o nome do responsável ou titular.');
      return;
    }

    // Determine clean username and password
    const rawUser = userForm.username.trim();
    const rawEmail = userForm.email.trim();

    if (!rawUser && !rawEmail) {
      error('Por favor indique pelo menos um User (Nome de Utilizador) ou E-mail para acesso.');
      return;
    }

    const finalUsername = (rawUser || rawEmail.split('@')[0] || `user.${Date.now()}`).toLowerCase().replace(/[^a-z0-9._-]/g, '');
    const finalEmail = rawEmail || `${finalUsername}@mutikukwama.ao`;
    const finalPassword = userForm.nova_senha && userForm.nova_senha.trim()
      ? userForm.nova_senha.trim()
      : generateSecurePassword(
          userForm.accessCategory === 'institucional' ? 'Minsa' : userForm.accessCategory === 'unidade' ? 'Farmacia' : 'Mutiku'
        );

    let assignedRole: UserRole = userForm.role;
    let assignedUnidadeId = userForm.unidade_id || undefined;
    let entidadeNome = userForm.nome;

    if (userForm.accessCategory === 'institucional') {
      assignedRole = 'institucional';
      assignedUnidadeId = undefined;
      entidadeNome = `Ministério da Saúde - ${userForm.departamento}`;
    } else if (userForm.accessCategory === 'unidade') {
      if (userForm.unidade_id) {
        const u = allUnits.find((un) => un.id === userForm.unidade_id);
        if (u) {
          assignedRole = u.tipo === 'deposito' ? 'deposito' : 'unidade';
          entidadeNome = u.nome;
        }
      }
    }

    if (editingUser) {
      const updated: UserProfile = {
        ...editingUser,
        nome: userForm.nome,
        username: finalUsername,
        email: finalEmail,
        telefone: userForm.telefone,
        whatsapp: userForm.whatsapp,
        role: assignedRole,
        unidade_id: assignedUnidadeId,
        departamento: userForm.accessCategory === 'institucional' ? userForm.departamento : undefined,
        cargo: userForm.cargo,
        senha_provisoria: finalPassword,
        ultima_redefinicao_senha: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      supabaseData.saveUser(updated);
      supabaseData.resetUserPassword(updated.id, finalPassword);
      success(`Acesso do utilizador "${updated.nome}" actualizado com sucesso!`);
    } else {
      const newUser = supabaseData.createUser({
        nome: userForm.nome,
        username: finalUsername,
        email: finalEmail,
        telefone: userForm.telefone,
        whatsapp: userForm.whatsapp,
        role: assignedRole,
        unidade_id: assignedUnidadeId,
        departamento: userForm.accessCategory === 'institucional' ? userForm.departamento : undefined,
        cargo: userForm.cargo,
        senha_provisoria: finalPassword,
      });
      supabaseData.resetUserPassword(newUser.id, finalPassword);

      // Open credentials confirmation slip
      setCreatedCredentialsModal({
        isOpen: true,
        tipo: userForm.accessCategory,
        nome: userForm.nome,
        username: finalUsername,
        email: finalEmail,
        password: finalPassword,
        entidadeNome,
        role: assignedRole,
        telefone: userForm.whatsapp || userForm.telefone,
      });

      success(`Novo acesso criado! User: ${finalUsername} | Palavra-passe atribuída.`);
    }

    setIsAddUserModalOpen(false);
    setEditingUser(null);
    triggerRefresh();
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
  };

  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    supabaseData.deleteUser(userToDelete.id);
    triggerRefresh();
    success(`Utilizador "${userToDelete.name}" removido do sistema.`);
    setUserToDelete(null);
  };

  const handleSaveConfig = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    supabaseData.saveConfig(systemConfig);
    success('Configurações institucionais, dados do rodapé e parâmetros salvos com sucesso!');
  };

  const handleResetConfig = () => {
    setIsResetConfigModalOpen(true);
  };

  const confirmResetConfig = () => {
    const res = supabaseData.resetConfig();
    setSystemConfig(res);
    success('Configurações institucionais e do rodapé restauradas para o padrão oficial.');
    setIsResetConfigModalOpen(false);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(PRODUCTION_SUPABASE_SQL);
    success('Esquema SQL copiado para a área de transferência!');
  };

  const handleDownloadSQL = () => {
    const blob = new Blob([PRODUCTION_SUPABASE_SQL], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mutikukwama_supabase_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
    success('Ficheiro mutikukwama_supabase_schema.sql descarregado!');
  };

  const handleResetDatabase = () => {
    setIsResetDbModalOpen(true);
  };

  const confirmResetDatabase = () => {
    setIsResetDbModalOpen(false);
    supabaseData.resetDatabase();
    success('Base de dados restaurada com sucesso! Recarregando...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  // Filtered Units
  const filteredUnits = allUnits.filter((u) => {
    if (unitSearch) {
      const q = unitSearch.toLowerCase();
      const matchName = u.nome.toLowerCase().includes(q);
      const matchMun = u.municipio.toLowerCase().includes(q);
      const matchProv = u.provincia.toLowerCase().includes(q);
      const matchCert = u.certificado_institucional?.toLowerCase().includes(q);
      const matchNif = (u as any).nif?.toLowerCase().includes(q);
      if (!matchName && !matchMun && !matchProv && !matchCert && !matchNif) return false;
    }
    if (unitProvinceFilter !== 'all' && u.provincia !== unitProvinceFilter) return false;
    if (unitTypeFilter !== 'all' && u.tipo !== unitTypeFilter) return false;
    if (unitStatusFilter !== 'all') {
      if (unitStatusFilter === 'pendente') {
        const isPending = u.plano_status === 'pendente' || (u as any).status_aprovacao === 'pendente';
        if (!isPending) return false;
      } else {
        if (u.plano_status !== unitStatusFilter) return false;
      }
    }
    return true;
  });

  // Filtered Payments
  const filteredPayments = allPayments.filter((p) => {
    if (paymentSearch) {
      const q = paymentSearch.toLowerCase();
      const matchUnit = p.unidade_nome.toLowerCase().includes(q);
      const matchRef = p.referencia_mcx?.toLowerCase().includes(q);
      if (!matchUnit && !matchRef) return false;
    }
    if (paymentStatusFilter !== 'all' && p.status !== paymentStatusFilter) return false;
    return true;
  });

  // Filtered Users
  const filteredUsers = allUsers.filter((u) => {
    if (userSearch) {
      const q = userSearch.toLowerCase();
      const matchName = u.nome.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchUser = u.username?.toLowerCase().includes(q);
      const matchDept = u.departamento?.toLowerCase().includes(q);
      const matchTel = u.telefone?.includes(q);
      if (!matchName && !matchEmail && !matchUser && !matchDept && !matchTel) return false;
    }
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    return true;
  });

  // Filtered Logs
  const filteredLogs = allLogs.filter((log) => {
    if (logSearch) {
      const q = logSearch.toLowerCase();
      const matchAcao = log.acao.toLowerCase().includes(q);
      const matchUser = log.usuario_nome.toLowerCase().includes(q);
      const matchDetails = log.detalhes.toLowerCase().includes(q);
      if (!matchAcao && !matchUser && !matchDetails) return false;
    }
    if (logCategoryFilter !== 'all' && log.categoria !== logCategoryFilter) return false;
    return true;
  });

  // Filtered Sponsors
  const filteredSponsors = allSponsors.filter((s) => {
    if (sponsorSearch) {
      const q = sponsorSearch.toLowerCase();
      const matchName = s.nome.toLowerCase().includes(q);
      const matchCat = s.categoria.toLowerCase().includes(q);
      const matchDesc = s.descricao.toLowerCase().includes(q);
      if (!matchName && !matchCat && !matchDesc) return false;
    }
    if (sponsorTierFilter !== 'all' && s.tier !== sponsorTierFilter) return false;
    if (sponsorStatusFilter === 'active' && !s.ativo) return false;
    if (sponsorStatusFilter === 'inactive' && s.ativo) return false;
    return true;
  });

  return (
    <div className="bg-[#F8FAFC] text-slate-800 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* ========================================================================= */}
        {/* SUPER ADMIN IDENTITY BANNER (MATCHES USER ATTACHED SCREENSHOT EXACTLY) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Identity Card Component matching image */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0 shadow-sm text-red-600">
                <ShieldCheck className="w-7 h-7 text-red-600" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-lg sm:text-xl font-black text-[#123B7A] tracking-tight">
                    Super Administrador Geral <span className="text-[#123B7A]/80 font-bold">(Nível Máximo)</span>
                  </h1>

                  <span className="px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-wider border border-slate-200/60">
                    SUPER ADMIN
                  </span>

                  <span className="px-3.5 py-0.5 rounded-full bg-[#E8F5F1] text-[#00A878] font-black text-[10px] uppercase tracking-wider border border-[#00A878]/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00A878] animate-pulse"></span>
                    ACTIVO
                  </span>
                </div>

                <div className="text-xs sm:text-sm text-slate-500 font-semibold mt-1 flex items-center gap-2">
                  <span>superadmin@mutikukwama.ao</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 font-medium">Controlo Nacional de Saúde em Angola</span>
                </div>
              </div>
            </div>

            {/* Platform Quick Badges & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Servidor Nacional Online (Luanda)</span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#E8F5F1] border border-[#00A878]/20 text-xs font-black text-[#00A878]">
                <ShieldCheck className="w-4 h-4" />
                <span>Normas Sanitárias MINSA 2026</span>
              </div>

              <button
                onClick={triggerRefresh}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Actualizar dados em tempo real"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUPER ADMIN NAVIGATION TABS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#123B7A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Métricas Nacionais</span>
          </button>

          <button
            onClick={() => setActiveTab('unidades')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'unidades'
                ? 'bg-[#123B7A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Unidades & Farmácias ({allUnits.length})</span>
            {pendingUnits.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black animate-pulse">
                {pendingUnits.length} pendente{pendingUnits.length > 1 ? 's' : ''}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pagamentos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pagamentos'
                ? 'bg-[#00A878] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Subscrições & Multicaixa ({pendingPayments.length} Pendentes)</span>
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'usuarios'
                ? 'bg-[#123B7A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Utilizadores & RBAC ({allUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('depositos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'depositos'
                ? 'bg-[#123B7A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Depósitos Grossistas ({wholesaleUnits.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('configuracoes');
              setConfigSubTab('patrocinadores');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              (activeTab === 'patrocinadores' || (activeTab === 'configuracoes' && configSubTab === 'patrocinadores'))
                ? 'bg-[#00A878] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Patrocinadores & Apoio ({activeSponsors.length}/{allSponsors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'logs'
                ? 'bg-[#123B7A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Auditoria & Logs ({allLogs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('configuracoes');
              if (configSubTab === 'patrocinadores') {
                setConfigSubTab('geral_rodape');
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'configuracoes' && configSubTab !== 'patrocinadores'
                ? 'bg-[#123B7A] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações Globais</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sql'
                ? 'bg-[#00A878] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Esquema SQL Supabase</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW & NATIONAL METRICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Unidades Credenciadas</span>
                  <Building2 className="w-5 h-5 text-[#123B7A]" />
                </div>
                <div className="text-3xl font-black text-[#123B7A] mt-2">
                  {allUnits.length}
                </div>
                <div className="text-[11px] text-[#00A878] font-bold mt-1">
                  {activeUnitsCount} com plano activo ({pharmaciesCount} farmácias)
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Receita SaaS Liquidada</span>
                  <CreditCard className="w-5 h-5 text-[#00A878]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#00A878] mt-2">
                  {totalRevenue.toLocaleString()} <span className="text-xs font-bold">AOA</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Multicaixa Express & BAI confirmados
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Fila de Pagamentos</span>
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-3xl font-black text-amber-600 mt-2">
                  {pendingPayments.length}
                </div>
                <div className="text-[11px] text-amber-700 font-bold mt-1">
                  {pendingPayments.length > 0 ? 'Requerem validação do Super Admin' : 'Todas as subscrições conferidas'}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Catálogo Nacional de Stock</span>
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="text-3xl font-black text-[#123B7A] mt-2">
                  {allProducts.length}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Itens sincronizados em Angola
                </div>
              </div>
            </div>

            {/* Quick Action Queue for Pending Subscriptions */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#00A878]" />
                    <span>Fila de Subscrições Multicaixa Express / BAI a Validar</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Aprovação imediata de comprovativos bancários para ativação de planos SaaS
                  </p>
                </div>

                <button
                  onClick={() => setIsManualPaymentModalOpen(true)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00A878]" />
                  <span>Registar Pagamento Manual</span>
                </button>
              </div>

              {pendingPayments.length === 0 ? (
                <div className="py-10 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-[#00A878] mx-auto mb-2" />
                  <div className="text-sm font-black text-[#123B7A]">Nenhum pagamento pendente no momento</div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Todos os comprovativos submetidos foram conferidos e validados.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-black text-[#123B7A] uppercase text-sm flex items-center gap-2">
                          <span>{p.unidade_nome}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                            Pendente
                          </span>
                        </div>
                        <div className="text-slate-600 font-medium">
                          Plano: <strong className="uppercase text-[#123B7A]">{p.plano_tipo}</strong> ({p.periodicidade}) —{' '}
                          <strong className="text-[#00A878] font-black">{p.valor.toLocaleString()} AOA</strong>
                        </div>
                        <div className="text-slate-500 text-[11px] font-medium flex flex-wrap items-center gap-3">
                          <span>Método: {p.metodo.replace('_', ' ').toUpperCase()}</span>
                          <span>•</span>
                          <span>Ref: {p.referencia_mcx || 'Comprovativo Anexo'}</span>
                          <span>•</span>
                          <span>Data: {new Date(p.data_pagamento).toLocaleString()}</span>
                          <span>•</span>
                          <span className="text-[#123B7A] font-bold flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 text-[#00A878]" />
                            <span>{p.comprovativo_nome || 'Comprovativo Anexado'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedPaymentForProof(p)}
                          className="px-3.5 py-2 rounded-xl bg-blue-50 text-[#123B7A] border border-blue-200 hover:bg-blue-100 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Inspecionar comprovativo bancário enviado pela unidade"
                        >
                          <Eye className="w-4 h-4 text-[#00A878]" />
                          <span>Ver Comprovativo</span>
                        </button>
                        <button
                          onClick={() => handleValidatePayment(p.id, true)}
                          className="px-4 py-2 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aprovar & Activar</span>
                        </button>
                        <button
                          onClick={() => handleValidatePayment(p.id, false)}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Rejeitar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Provincial Distribution Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#123B7A] uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00A878]" />
                  <span>Cobertura por Províncias de Angola</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  {PROVINCES_ANGOLA.slice(0, 6).map((prov) => {
                    const count = allUnits.filter((u) => u.provincia === prov).length;
                    const pct = Math.min(100, Math.round((count / Math.max(1, allUnits.length)) * 100));
                    return (
                      <div key={prov} className="space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-700">
                          <span>{prov}</span>
                          <span className="text-slate-500">{count} unidades ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#123B7A] rounded-full"
                            style={{ width: `${Math.max(5, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* System Security & Integrity */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-[#123B7A] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00A878]" />
                  <span>Políticas de Segurança e Regulação MINSA</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#00A878] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-[#123B7A]">Isolamento de Depósitos Grossistas (B2B)</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Depósitos de medicamentos são estritamente ocultados da visualização pública de utentes.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#00A878] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-[#123B7A]">Bloqueio Automático de Planos Expirados</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Triggers SQL bloqueiam imediatamente edição de stock e novos pedidos quando a anuidade expira.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                    <Check className="w-4 h-4 text-[#00A878] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-[#123B7A]">Auditoria Contínua com Carimbo de Tempo</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Todos os acessos e transações administrativas são registados na tabela de auditoria permanente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: HEALTH UNITS & PHARMACIES FULL CRUD */}
        {/* ========================================================================= */}
        {activeTab === 'unidades' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#00A878]" />
                  <span>Gestão Nacional de Unidades de Saúde & Farmácias</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Registo, actualização cadastral, extensão de anuidades e bloqueio operacional
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingUnit(null);
                  setUnitForm({
                    nome: '',
                    tipo: 'farmacia',
                    provincia: 'Luanda',
                    municipio: 'Maianga',
                    bairro: 'Alvalade',
                    endereco_completo: '',
                    telefone: '+244 923 ',
                    whatsapp: '+244923',
                    email: '',
                    horario_funcionamento: 'Aberto 24 Horas',
                    certificado_institucional: 'CERT-MINSA-2025-4891',
                    documento_minsa_nome: 'alvara_sanitario_minsa_2025_4891.pdf',
                    documento_minsa_url: 'alvara_sanitario_minsa_2025_4891.pdf',
                    plano_tipo: 'medio',
                    plano_periodicidade: 'mensal',
                    aberto_agora: true,
                  });
                  setIsAddUnitModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Credenciar Nova Unidade</span>
              </button>
            </div>

            {/* Search & Filters Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Pesquisar por nome, província, município ou cert. MINSA..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
                />
              </div>

              <select
                value={unitTypeFilter}
                onChange={(e) => setUnitTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
              >
                <option value="all">Todos os Tipos de Unidades</option>
                <option value="farmacia">Farmácia Comunitária / Hospitalar</option>
                <option value="clinica">Clínica Médica / Policlínica</option>
                <option value="hospital">Hospital (Geral / Provincial / Privado)</option>
                <option value="centro_medico">Centro Médico / Posto de Saúde</option>
                <option value="veterinaria">Veterinária (Clínica ou Farmácia Veterinária)</option>
                <option value="consultorio">Consultório (Médico / Dentário / Especialidades)</option>
                <option value="laboratorio">Laboratório de Análises Clínicas</option>
                <option value="deposito">Depósito Grossista (Distribuição B2B)</option>
              </select>

              <select
                value={unitProvinceFilter}
                onChange={(e) => setUnitProvinceFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
              >
                <option value="all">Todas as Províncias</option>
                {PROVINCES_ANGOLA.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={unitStatusFilter}
                onChange={(e) => setUnitStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
              >
                <option value="all">Todos os Estados</option>
                <option value="ativo">Activos</option>
                <option value="expirado">Expirados / Bloqueados</option>
                <option value="pendente">Pendentes</option>
              </select>
            </div>

            {/* Pending Units Alert Banner */}
            {allUnits.some((u) => (u as any).status_aprovacao === 'pendente' || u.plano_status === 'pendente') && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-amber-950">
                      {allUnits.filter((u) => (u as any).status_aprovacao === 'pendente' || u.plano_status === 'pendente').length} Unidade(s) Aguardando Ativação e Conferência
                    </h4>
                    <p className="text-xs text-amber-800">
                      Verifique o NIF, documento oficial do MINSA e o comprovativo de pagamento bancário/express para validar a ativação.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnitStatusFilter('pendente')}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs shrink-0"
                >
                  Filtrar Pendentes
                </button>
              </div>
            )}

            {/* Units Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 pl-2">Unidade</th>
                    <th className="pb-3">Tipo</th>
                    <th className="pb-3">Alvará & Documento MINSA</th>
                    <th className="pb-3">Localização</th>
                    <th className="pb-3">Plano SaaS</th>
                    <th className="pb-3">Expiração</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right pr-2">Ações Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUnits.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-2 font-black text-[#123B7A] uppercase">
                        <div className="flex items-center gap-2">
                          <span>{u.nome}</span>
                          {u.selo_premium && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-black">
                              PREMIUM
                            </span>
                          )}
                          {((u as any).status_aprovacao === 'pendente' || u.plano_status === 'pendente') && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black animate-pulse">
                              NOVO REGISTO
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal flex flex-wrap items-center gap-1.5 mt-0.5">
                          {(u as any).nif && (
                            <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              NIF: {(u as any).nif}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#00A878] shrink-0" />
                            <span className="font-medium text-slate-600">{u.email}</span>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>{u.telefone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 font-bold text-xs">
                        <span className={`px-2.5 py-1 rounded-lg inline-flex items-center gap-1 ${
                          u.tipo === 'deposito'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : u.tipo === 'hospital'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : u.tipo === 'clinica'
                            ? 'bg-sky-50 text-sky-800 border border-sky-200'
                            : u.tipo === 'centro_medico'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : u.tipo === 'veterinaria'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : u.tipo === 'consultorio'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : u.tipo === 'laboratorio'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {u.tipo === 'farmacia' ? 'Farmácia' :
                           u.tipo === 'clinica' ? 'Clínica' :
                           u.tipo === 'hospital' ? 'Hospital' :
                           u.tipo === 'centro_medico' ? 'Centro Médico' :
                           u.tipo === 'veterinaria' ? 'Veterinária' :
                           u.tipo === 'consultorio' ? 'Consultório' :
                           u.tipo === 'laboratorio' ? 'Laboratório' :
                           u.tipo === 'deposito' ? 'Depósito B2B' : u.tipo}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-950 font-mono text-[11px] font-bold tracking-wide">
                            <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{u.certificado_institucional || 'CERT-MINSA-2025-4891'}</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setMinsaDocModalUnit(u)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#123B7A] hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                              title="Visualizar Certidão Oficial e Documento Anexo do MINSA"
                            >
                              <FileText className="w-3 h-3 text-emerald-600" />
                              <span>Ver Documento MINSA</span>
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">
                        {u.municipio}, {u.provincia}
                      </td>
                      <td className="py-3.5 uppercase font-black text-amber-700">
                        {u.plano_tipo}
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">
                        {u.plano_data_expiracao}
                      </td>
                      <td className="py-3.5">
                        {((u as any).status_aprovacao === 'pendente' || u.plano_status === 'pendente') ? (
                          <span className="px-2.5 py-1 rounded-full font-black text-[10px] uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>Pendente Ativação</span>
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                              u.plano_status === 'ativo'
                                ? 'bg-[#E8F5F1] text-[#00A878] border border-[#00A878]/30'
                                : 'bg-rose-50 text-rose-600 border border-rose-200'
                            }`}
                          >
                            {u.plano_status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View MINSA Document button */}
                          <button
                            type="button"
                            onClick={() => setMinsaDocModalUnit(u)}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                            title="Consultar Documento Oficial do MINSA"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password button */}
                          <button
                            onClick={() => {
                              setResetPasswordModalTarget({
                                id: u.id,
                                name: u.nome,
                                email: u.email,
                                type: 'unit',
                                currentPassword: u.senha_provisoria,
                              });
                              setNewPasswordInput('');
                              setShowNewPassword(false);
                            }}
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                            title="Redefinir Senha da Unidade"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Renew / Extend Subscription button */}
                          <button
                            onClick={() => {
                              setRenewUnitModalTarget(u);
                              setRenewPlan(u.plano_tipo);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Renovar / Estender Subscrição"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* View Registration Payment Proof */}
                          <button
                            onClick={() => {
                              const pay = allPayments.find((p) => p.unidade_id === u.id) || {
                                id: `pay-${u.id}`,
                                unidade_id: u.id,
                                unidade_nome: u.nome,
                                plano_tipo: u.plano_tipo,
                                periodicidade: u.plano_periodicidade,
                                valor: u.plano_preco || (u.plano_tipo === 'avancado' ? 1008000 : 280500),
                                desconto_aplicado: u.plano_desconto || 30,
                                metodo: 'multicaixa_express',
                                referencia_mcx: 'MCX-2026-REG',
                                comprovativo_url: u.comprovativo_pagamento_url || `comprovativo_${u.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                                comprovativo_nome: u.comprovativo_pagamento_nome || `comprovativo_${u.nome.toLowerCase().replace(/\s+/g, '_')}.pdf`,
                                comprovativo_tipo: u.comprovativo_pagamento_tipo || 'pdf',
                                status: u.plano_status === 'ativo' ? 'confirmado' : 'pendente',
                                data_pagamento: u.created_at || new Date().toISOString(),
                                validado_por: u.plano_status === 'ativo' ? 'Super Administrador Geral' : undefined,
                              };
                              setSelectedPaymentForProof(pay as PaymentTransaction);
                            }}
                            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#123B7A] transition-colors cursor-pointer"
                            title="Ver Comprovativo de Pagamento e Inscrição"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-[#00A878]" />
                          </button>

                          {/* Edit Unit details */}
                          <button
                            onClick={() => {
                              setEditingUnit(u);
                              setUnitForm({
                                nome: u.nome,
                                tipo: u.tipo,
                                provincia: u.provincia,
                                municipio: u.municipio,
                                bairro: u.bairro,
                                endereco_completo: u.endereco_completo,
                                telefone: u.telefone,
                                whatsapp: u.whatsapp,
                                email: u.email,
                                nova_senha: '',
                                horario_funcionamento: u.horario_funcionamento,
                                certificado_institucional: u.certificado_institucional || 'CERT-MINSA-2025-4891',
                                documento_minsa_nome: u.documento_minsa_nome || 'alvara_sanitario_minsa_2025_4891.pdf',
                                documento_minsa_url: u.documento_minsa_url || 'alvara_sanitario_minsa_2025_4891.pdf',
                                plano_tipo: u.plano_tipo,
                                plano_periodicidade: u.plano_periodicidade,
                                aberto_agora: u.aberto_agora,
                              });
                              setIsAddUnitModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Editar Dados e Credenciais da Unidade"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* If pending: Show Quick Approve and Reject buttons */}
                          {((u as any).status_aprovacao === 'pendente' || u.plano_status === 'pendente') ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleApproveUnit(u.id, u.nome)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1"
                                title="Aprovar Documentação e Activar Unidade Imediatamente"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprovar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectUnit(u.id, u.nome)}
                                className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                                title="Rejeitar Pedido de Cadastro"
                              >
                                <span>Rejeitar</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleToggleUnit(u.id, u.plano_status)}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                                u.plano_status === 'ativo'
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-[#00A878] text-white hover:bg-[#008f66]'
                              }`}
                            >
                              {u.plano_status === 'ativo' ? 'Bloquear' : 'Activar'}
                            </button>
                          )}

                          {/* Delete Unit */}
                          <button
                            onClick={() => handleDeleteUnit(u.id, u.nome)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                            title="Eliminar Unidade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PAYMENTS & SUBSCRIPTIONS VALIDATION */}
        {/* ========================================================================= */}
        {activeTab === 'pagamentos' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#00A878]" />
                  <span>Histórico de Subscrições & Liquidações Financeiras</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Conferência de depósitos BAI, referências Multicaixa Express e lançamentos manuais
                </p>
              </div>

              <button
                onClick={() => setIsManualPaymentModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registar Liquidação Manual</span>
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Pesquisar por unidade ou referência Multicaixa..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
                />
              </div>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
              >
                <option value="all">Todos os Estados</option>
                <option value="pendente">Apenas Pendentes</option>
                <option value="confirmado">Confirmados</option>
                <option value="rejeitado">Rejeitados</option>
              </select>
            </div>

            {/* Payments Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 pl-2">Unidade / Referência</th>
                    <th className="pb-3">Plano & Ciclo</th>
                    <th className="pb-3">Valor (AOA)</th>
                    <th className="pb-3">Método</th>
                    <th className="pb-3">Comprovativo</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3">Data</th>
                    <th className="pb-3 text-right pr-2">Validado Por / Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-2 font-black text-[#123B7A] uppercase">
                        <div>{p.unidade_nome}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Ref: {p.referencia_mcx || 'Transferência Directa'}
                        </div>
                      </td>
                      <td className="py-3.5 uppercase text-amber-700 font-black text-[10px]">
                        {p.plano_tipo} ({p.periodicidade})
                      </td>
                      <td className="py-3.5 font-black text-[#00A878]">
                        {p.valor.toLocaleString()} AOA
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">
                        {p.metodo.replace('_', ' ').toUpperCase()}
                      </td>
                      <td className="py-3.5">
                        <button
                          onClick={() => setSelectedPaymentForProof(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-50/90 hover:bg-blue-100 text-[#123B7A] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200/80 shadow-2xs group"
                          title="Ver comprovativo de pagamento enviado pela unidade"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#00A878]" />
                          <span className="truncate max-w-[110px] font-semibold text-[11px]">
                            {p.comprovativo_nome || 'Ver Anexo'}
                          </span>
                          <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#123B7A]" />
                        </button>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                            p.status === 'confirmado'
                              ? 'bg-[#E8F5F1] text-[#00A878] border border-[#00A878]/30'
                              : p.status === 'rejeitado'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 font-medium">
                        {new Date(p.data_pagamento).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        {p.status === 'pendente' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPaymentForProof(p)}
                              className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#123B7A] border border-blue-200 transition-colors cursor-pointer"
                              title="Inspecionar Comprovativo"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#00A878]" />
                            </button>
                            <button
                              onClick={() => handleValidatePayment(p.id, true)}
                              className="px-3 py-1.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleValidatePayment(p.id, false)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-black text-[10px] uppercase tracking-wider border border-rose-200 cursor-pointer"
                            >
                              Recusar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-slate-600 font-medium text-[11px]">
                              {p.validado_por || 'Sistema'}
                            </span>
                            <button
                              onClick={() => setSelectedPaymentForProof(p)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Visualizar Comprovativo Validado"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: USERS MANAGEMENT & RBAC */}
        {/* ========================================================================= */}
        {activeTab === 'usuarios' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00A878]" />
                  <span>Gestão Global de Acessos & Utilizadores (RBAC)</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Crie acessos oficiais para Unidades (Farmácias/Depósitos) e Ministério da Saúde (MINSA) com User e Password
                </p>
              </div>

              {/* Action Buttons: Ministério, Unidade, Outro */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateMinistryAccess}
                  className="px-3.5 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Criar credenciais oficiais para delegados, inspectores e directores do Ministério da Saúde"
                >
                  <Landmark className="w-4 h-4" />
                  <span>+ Acesso Ministério (MINSA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCreateUnitAccess()}
                  className="px-3.5 py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Criar credenciais oficiais para gestores de Farmácias, Clínicas e Depósitos"
                >
                  <Building2 className="w-4 h-4" />
                  <span>+ Acesso Unidade</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setUserForm({
                      accessCategory: 'outro',
                      nome: '',
                      username: '',
                      email: '',
                      telefone: '+244 923 ',
                      whatsapp: '+244923',
                      nova_senha: generateSecurePassword('Mutiku'),
                      role: 'admin',
                      unidade_id: '',
                      departamento: '',
                      cargo: '',
                    });
                    setIsAddUserModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-[#123B7A] hover:bg-[#0d2a58] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Criar utilizador genérico ou administrador"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Outro Perfil</span>
                </button>
              </div>
            </div>

            {/* Search & Role Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Pesquisar por User, nome, e-mail, ministério ou telefone..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
              >
                <option value="all">Todos os Perfis (Roles)</option>
                <option value="institucional">Ministério da Saúde (MINSA)</option>
                <option value="unidade">Farmácia / Unidade de Saúde</option>
                <option value="deposito">Depósito Grossista</option>
                <option value="super_admin">Super Administrador</option>
                <option value="admin">Administrador</option>
                <option value="paciente">Utente / Paciente</option>
              </select>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 pl-2">Utilizador & User de Login</th>
                    <th className="pb-3">Contacto / E-mail</th>
                    <th className="pb-3">Perfil de Acesso (Role)</th>
                    <th className="pb-3">Entidade / Vinculação</th>
                    <th className="pb-3 text-right pr-2">Ações Super Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pl-2 font-black text-[#123B7A]">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                            u.role === 'institucional'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.role === 'unidade' || u.role === 'deposito'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-[#123B7A]'
                          }`}>
                            {u.role === 'institucional' ? <Landmark className="w-4 h-4" /> : u.nome.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span>{u.nome}</span>
                              {u.senha_provisoria && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-mono font-bold" title="Tem senha configurada">
                                  🔑 Activo
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[11px] font-bold text-[#123B7A] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                User: @{u.username || u.email.split('@')[0]}
                              </span>
                              {u.cargo && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {u.cargo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">
                        <div className="font-mono text-[11px]">{u.email}</div>
                        <div className="text-[10px] text-slate-400">{u.telefone || 'Sem telefone'}</div>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                            u.role === 'institucional'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : u.role === 'super_admin'
                              ? 'bg-red-100 text-red-700'
                              : u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : u.role === 'deposito'
                              ? 'bg-amber-100 text-amber-800'
                              : u.role === 'unidade'
                              ? 'bg-[#E8F5F1] text-[#00A878] border border-[#00A878]/30'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role === 'institucional' ? 'Ministério (MINSA)' : u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-600 font-medium">
                        {u.role === 'institucional' ? (
                          <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                            <Landmark className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            <span>{u.departamento || 'Ministério da Saúde (MINSA)'}</span>
                          </div>
                        ) : u.unidade_id ? (
                          <div className="text-[11px] text-[#123B7A] font-bold flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-[#00A878] flex-shrink-0" />
                            <span>{allUnits.find((un) => un.id === u.unidade_id)?.nome || u.unidade_id}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Copy Credentials (User & Password) */}
                          <button
                            type="button"
                            onClick={() => {
                              const pass = u.senha_provisoria || 'Mutiku@2026';
                              const roleLabel = u.role === 'institucional'
                                ? `Ministério da Saúde (${u.departamento || 'DNME'})`
                                : u.role === 'unidade'
                                ? `Farmácia (${allUnits.find((un) => un.id === u.unidade_id)?.nome || 'Unidade'})`
                                : u.role.toUpperCase();
                              handleCopyCredentials(u.email, pass, u.nome, roleLabel, u.username);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Copiar Credenciais (User e Password)"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#123B7A]" />
                          </button>

                          {/* Reset Password for User */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetPasswordModalTarget({
                                id: u.id,
                                name: u.nome,
                                email: u.email,
                                type: 'user',
                                role: u.role,
                                currentPassword: u.senha_provisoria,
                              });
                              setNewPasswordInput('');
                              setShowNewPassword(false);
                            }}
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                            title="Redefinir Senha do Utilizador"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              const isMinsa = u.role === 'institucional';
                              const isUnit = u.role === 'unidade' || u.role === 'deposito';
                              setUserForm({
                                accessCategory: isMinsa ? 'institucional' : isUnit ? 'unidade' : 'outro',
                                nome: u.nome,
                                username: u.username || u.email.split('@')[0],
                                email: u.email,
                                telefone: u.telefone || '+244 923 ',
                                whatsapp: u.whatsapp || '+244923',
                                nova_senha: u.senha_provisoria || '',
                                role: u.role,
                                unidade_id: u.unidade_id || '',
                                departamento: u.departamento || 'Direcção Nacional de Medicamentos e Equipamentos (DNME)',
                                cargo: u.cargo || '',
                              });
                              setIsAddUserModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                            title="Editar Utilizador & Role"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {u.id !== 'user-super-admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.nome)}
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Remover Utilizador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: WHOLESALE DEPOTS & B2B VIGILANCE */}
        {/* ========================================================================= */}
        {activeTab === 'depositos' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span>Depósitos Grossistas & Regulação B2B de Medicamentos</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Vigilância de stock em armazém e fornecimento grossista para farmácias comunitárias
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wholesaleUnits.map((dep) => (
                <div key={dep.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-[10px] uppercase">
                      Depósito Grossista
                    </span>
                    <span className="text-[11px] font-bold text-[#00A878]">
                      {dep.plano_status === 'ativo' ? 'Credenciado' : 'Inactivo'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-[#123B7A] uppercase text-sm">{dep.nome}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{dep.municipio}, {dep.provincia}</p>
                  </div>

                  <div className="text-xs text-slate-600 font-medium space-y-1.5">
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold uppercase">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          Alvará Sanitário MINSA
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                          Homologado
                        </span>
                      </div>
                      <div className="font-mono text-xs font-black text-slate-800">
                        {dep.certificado_institucional || 'CERT-MINSA-GROSSISTA'}
                      </div>
                    </div>
                    <div>WhatsApp B2B: <strong>{dep.whatsapp}</strong></div>
                    <div>Horário: <strong>{dep.horario_funcionamento}</strong></div>
                    <button
                      type="button"
                      onClick={() => setMinsaDocModalUnit(dep)}
                      className="w-full mt-1.5 py-1.5 px-3 rounded-xl bg-[#123B7A] hover:bg-[#0B1E3B] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ver Documento MINSA</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Stock monitorizado</span>
                    <button
                      onClick={() => handleToggleUnit(dep.id, dep.plano_status)}
                      className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                    >
                      {dep.plano_status === 'ativo' ? 'Suspender Fornecimento' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PATROCINADORES & EMPRESAS APOIANTES (CARROSSEL DA HOME) */}
        {/* ========================================================================= */}
        {(activeTab === 'patrocinadores' || (activeTab === 'configuracoes' && configSubTab === 'patrocinadores')) && (
          <div className="space-y-6">
            {/* Sub-tabs header for quick navigation between system settings and sponsors */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('configuracoes');
                    setConfigSubTab('geral_rodape');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Informações & Rodapé</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('configuracoes');
                    setConfigSubTab('patrocinadores');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-[#00A878] text-white shadow-sm"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Empresas Apoiantes & Patrocinadoras ({activeSponsors.length}/{allSponsors.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('configuracoes');
                    setConfigSubTab('pagamentos');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <span>Parâmetros de Pagamento & Bancos</span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-2">
                <span className="text-[11px] font-bold text-slate-400">Configurações & Parceiros</span>
              </div>
            </div>
            {/* Header & Quick Actions */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center border border-[#00A878]/30">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-[#123B7A] tracking-tight">
                        Empresas Apoiantes & Patrocinadoras Oficiais
                      </h2>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        Gestão das empresas e instituições exibidas no carrossel da página inicial (Home) do Mutikukwama Saúde.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={handleResetSponsors}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
                    title="Restaurar lista para os parceiros oficiais padrão"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-500" />
                    <span>Restaurar Padrão</span>
                  </button>

                  <button
                    onClick={handleOpenAddSponsor}
                    className="px-5 py-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Empresa</span>
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cadastradas</div>
                  <div className="text-2xl font-black text-[#123B7A] mt-1">{allSponsors.length}</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">Empresas e Entidades</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#E8F5F1] border border-[#00A878]/30">
                  <div className="text-[11px] font-bold text-[#00A878] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#00A878] animate-pulse"></span>
                    <span>No Carrossel (Home)</span>
                  </div>
                  <div className="text-2xl font-black text-[#00A878] mt-1">{activeSponsors.length}</div>
                  <div className="text-[10px] text-[#00A878]/80 font-bold mt-0.5">Activas e Visíveis aos Cidadãos</div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/60">
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Diamante & Ouro</div>
                  <div className="text-2xl font-black text-amber-800 mt-1">
                    {allSponsors.filter((s) => s.tier === 'diamante' || s.tier === 'ouro').length}
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium mt-0.5">Alto Nível de Patrocínio</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ocultas / Desactivadas</div>
                  <div className="text-2xl font-black text-slate-700 mt-1">
                    {allSponsors.length - activeSponsors.length}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5">Fora de Exibição Pública</div>
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#123B7A]">
                    Pré-visualização em Tempo Real (Como os Cidadãos Vêem na Página Inicial)
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-500">
                  {activeSponsors.length} {activeSponsors.length === 1 ? 'empresa activa' : 'empresas activas'}
                </span>
              </div>
              <div className="max-w-xl">
                <SponsorsCarousel />
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Pesquisar empresa por nome, categoria ou descrição..."
                    value={sponsorSearch}
                    onChange={(e) => setSponsorSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#00A878] bg-slate-50/50"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={sponsorTierFilter}
                    onChange={(e) => setSponsorTierFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">Todos os Níveis (Tiers)</option>
                    <option value="diamante">Diamante</option>
                    <option value="ouro">Ouro</option>
                    <option value="institucional">Institucional</option>
                    <option value="estrategico">Estratégico</option>
                    <option value="tecnologico">Tecnológico</option>
                    <option value="prata">Prata</option>
                  </select>

                  <select
                    value={sponsorStatusFilter}
                    onChange={(e) => setSponsorStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
                  >
                    <option value="all">Todos os Estados</option>
                    <option value="active">Activos no Carrossel</option>
                    <option value="inactive">Ocultos / Desactivados</option>
                  </select>
                </div>
              </div>

              {/* Sponsors List Table / Cards */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">Empresa & Logótipo</th>
                      <th className="py-3 px-3">Categoria / Papel</th>
                      <th className="py-3 px-3">Nível (Tier)</th>
                      <th className="py-3 px-3">Ordem</th>
                      <th className="py-3 px-3 text-center">No Carrossel (Home)</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSponsors.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                          Nenhuma empresa encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredSponsors.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                {s.logo_url ? (
                                  <img src={s.logo_url} alt={s.nome} className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                  <Building2 className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 max-w-[220px]">
                                <div className="font-black text-slate-900 truncate flex items-center gap-1.5">
                                  <span>{s.nome}</span>
                                  {s.em_destaque && (
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Em Destaque" />
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">{s.descricao}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-700">
                            {s.categoria}
                          </td>

                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                s.tier === 'diamante'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : s.tier === 'ouro'
                                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                  : s.tier === 'institucional'
                                  ? 'bg-[#E8F5F1] text-[#00A878] border border-[#00A878]/30'
                                  : s.tier === 'estrategico'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : s.tier === 'tecnologico'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {s.tier.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 font-bold text-slate-500">
                            #{s.ordem}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            <button
                              onClick={() => handleToggleSponsorActive(s.id)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                s.ativo
                                  ? 'bg-[#E8F5F1] text-[#00A878] border border-[#00A878]/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-[#E8F5F1] hover:text-[#00A878]'
                              }`}
                              title={s.ativo ? 'Clique para ocultar do carrossel' : 'Clique para exibir no carrossel'}
                            >
                              {s.ativo ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-[#00A878] animate-pulse"></span>
                                  <span>Activo no Carrossel</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                  <span>Oculto</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {s.website_url && (
                                <a
                                  href={s.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                  title="Abrir website externo"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => handleOpenEditSponsor(s)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-[#123B7A] transition-colors cursor-pointer"
                                title="Editar dados da empresa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSponsor(s.id, s.nome)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Eliminar patrocinador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: AUDIT & SECURITY LOGS */}
        {/* ========================================================================= */}
        {activeTab === 'logs' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#00A878]" />
                  <span>Registo de Auditoria e Eventos de Segurança (Logs de Produção)</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Trilha permanente e inalterável de todas as ações administrativas, autenticações e subscrições
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allLogs, null, 2));
                    const dl = document.createElement('a');
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", "mutikukwama_audit_logs.json");
                    dl.click();
                    success('Logs exportados para JSON!');
                  }}
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Logs JSON</span>
                </button>
              </div>
            </div>

            {/* Log Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="Pesquisar em logs por ação, utilizador ou detalhes..."
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
                />
              </div>

              <select
                value={logCategoryFilter}
                onChange={(e) => setLogCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
              >
                <option value="all">Todas as Categorias</option>
                <option value="admin">Administração</option>
                <option value="plano">Subscrições & Pagamentos</option>
                <option value="auth">Autenticação & 2FA</option>
                <option value="seguranca">Segurança do Sistema</option>
                <option value="produto">Catálogo de Produtos</option>
                <option value="pedido">Pedidos de Utentes</option>
              </select>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="pb-3 pl-2">Data / Hora</th>
                    <th className="pb-3">Ação</th>
                    <th className="pb-3">Utilizador & Perfil</th>
                    <th className="pb-3">Detalhes do Evento</th>
                    <th className="pb-3 text-right pr-2">IP Seguro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pl-2 text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3.5 font-bold text-[#123B7A]">{log.acao}</td>
                      <td className="py-3.5 text-[#00A878] font-bold">
                        {log.usuario_nome || 'Sistema'} ({log.usuario_role || 'anon'})
                      </td>
                      <td className="py-3.5 text-slate-600 max-w-md break-words">{log.detalhes}</td>
                      <td className="py-3.5 text-right pr-2 text-slate-400">{log.ip_address || '197.234.218.42'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: GLOBAL CONFIGURATIONS & FOOTER MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'configuracoes' && configSubTab !== 'patrocinadores' && (
          <div className="space-y-6">
            {/* Sub-tabs header for navigation inside Configurations */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfigSubTab('geral_rodape')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    configSubTab === 'geral_rodape'
                      ? 'bg-[#123B7A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Informações & Rodapé</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigSubTab('patrocinadores')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <HeartHandshake className="w-4 h-4 text-slate-500" />
                  <span>Empresas Apoiantes & Patrocinadoras ({activeSponsors.length}/{allSponsors.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigSubTab('pagamentos')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    configSubTab === 'pagamentos'
                      ? 'bg-[#123B7A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Parâmetros de Pagamento & Bancos</span>
                </button>
              </div>

              <div className="flex items-center gap-2 px-2">
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  title="Restaurar parâmetros padrão de Angola"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </button>
              </div>
            </div>

            {/* SUBTAB 1: INFORMAÇÕES INSTITUCIONAIS & RODAPÉ */}
            {configSubTab === 'geral_rodape' && (
              <form onSubmit={handleSaveConfig} className="space-y-6">
                {/* Header Card with Quick Action */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center border border-[#00A878]/30">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="inline-block px-2.5 py-0.5 bg-[#E8F5F1] text-[#00A878] text-[10px] font-black rounded-full uppercase tracking-wider mb-1">
                            Personalização Nacional & Conformidade
                          </span>
                          <h2 className="text-lg font-black text-[#123B7A] tracking-tight">
                            Informações Institucionais, Rodapé & Textos da Plataforma
                          </h2>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Gerencie as informações exibidas no rodapé da aplicação, textos da marca, contactos de apoio ao cidadão, métodos de pagamento em Angola e linhas de emergência médica.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetConfig}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                        <span>Restaurar</span>
                      </button>

                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Alterações</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 1: Identidade da Marca & Selos Regulamentares */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Building2 className="w-5 h-5 text-[#123B7A]" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#123B7A]">
                      1. Identidade Visual & Selos Sanitários
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Nome da Plataforma</span>
                        <span className="text-[10px] text-slate-400">Exibido no Cabeçalho e Rodapé</span>
                      </label>
                      <input
                        type="text"
                        value={systemConfig.nome_plataforma || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, nome_plataforma: e.target.value })}
                        placeholder="MUTIKUKWAMA"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Subtítulo Oficial</span>
                        <span className="text-[10px] text-slate-400">Badge Nacional</span>
                      </label>
                      <input
                        type="text"
                        value={systemConfig.subtitulo || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, subtitulo: e.target.value })}
                        placeholder="SAÚDE NACIONAL"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Selo Sanitário MINSA</span>
                        <span className="text-[10px] text-[#00A878]">Em conformidade</span>
                      </label>
                      <input
                        type="text"
                        value={systemConfig.selo_conformidade_minsa || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, selo_conformidade_minsa: e.target.value })}
                        placeholder="Normas Sanitárias MINSA"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Selo de Privacidade & Dados</span>
                        <span className="text-[10px] text-[#123B7A]">APD Angola</span>
                      </label>
                      <input
                        type="text"
                        value={systemConfig.selo_proteccao_dados || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, selo_proteccao_dados: e.target.value })}
                        placeholder="Protecção de Dados"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#00A878]" />
                          <span>Logótipo Oficial da Plataforma (Opcional)</span>
                        </label>
                        <span className="text-[10px] text-slate-400">Upload do PC ou URL</span>
                      </div>

                      {/* Hidden File Input for Platform Logo */}
                      <input
                        ref={configFileInputRef}
                        type="file"
                        accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleConfigLogoFileUpload(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={systemConfig.logo_url || ''}
                          onChange={(e) => setSystemConfig({ ...systemConfig, logo_url: e.target.value })}
                          placeholder="Ex: https://... ou carregue do seu computador"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-xs focus:outline-none focus:border-[#00A878]"
                        />

                        <button
                          type="button"
                          onClick={() => configFileInputRef.current?.click()}
                          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          title="Carregar imagem do computador"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#00A878]" />
                          <span>Carregar do PC</span>
                        </button>

                        {systemConfig.logo_url && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={systemConfig.logo_url}
                                alt="Logo Preview"
                                className="w-full h-full object-contain rounded-lg"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSystemConfig({ ...systemConfig, logo_url: '' });
                                setConfigLogoFileName('');
                              }}
                              className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                              title="Remover"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {configLogoFileName && (
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{configLogoFileName}</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Descrição Institucional da Plataforma</span>
                        <span className="text-[10px] text-slate-400">{systemConfig.descricao_plataforma?.length || 0} caracteres</span>
                      </label>
                      <textarea
                        rows={3}
                        value={systemConfig.descricao_plataforma || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, descricao_plataforma: e.target.value })}
                        placeholder="Descreva a missão e o propósito do Mutikukwama Saúde..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-[#00A878] leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Contactos Oficiais de Apoio & Sede */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <Phone className="w-5 h-5 text-[#00A878]" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#123B7A]">
                      2. Contactos Oficiais de Atendimento & Sede em Angola
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>Telefone de Apoio</span>
                      </label>
                      <input
                        type="text"
                        value={systemConfig.telefone_suporte || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, telefone_suporte: e.target.value })}
                        placeholder="+244 923 000 111 (Luanda)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>E-mail Institucional</span>
                      </label>
                      <input
                        type="email"
                        value={systemConfig.email_suporte || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, email_suporte: e.target.value })}
                        placeholder="suporte@mutikukwama.ao"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp de Apoio</span>
                      </label>
                      <input
                        type="text"
                        value={systemConfig.whatsapp_suporte || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, whatsapp_suporte: e.target.value })}
                        placeholder="+244923000111"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span>Morada da Sede / Província</span>
                      </label>
                      <input
                        type="text"
                        value={systemConfig.endereco_institucional || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, endereco_institucional: e.target.value })}
                        placeholder="Mutamba, Luanda - Angola"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Métodos de Pagamento Exibidos no Rodapé */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <CreditCard className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#123B7A]">
                      3. Métodos de Pagamento em Angola (Exibição no Rodapé)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Rótulo da Secção de Pagamento</label>
                      <input
                        type="text"
                        value={systemConfig.rotulo_metodos_pagamento || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, rotulo_metodos_pagamento: e.target.value })}
                        placeholder="MÉTODOS DE PAGAMENTO EM ANGOLA:"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Método de Pagamento 1</label>
                      <input
                        type="text"
                        value={systemConfig.metodo_pagamento_1 || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, metodo_pagamento_1: e.target.value })}
                        placeholder="Multicaixa Express (MCX)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Método de Pagamento 2</label>
                      <input
                        type="text"
                        value={systemConfig.metodo_pagamento_2 || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, metodo_pagamento_2: e.target.value })}
                        placeholder="Transferência BAI (IBAN)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Linhas de Emergência Médica */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <HeartPulse className="w-5 h-5 text-red-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#123B7A]">
                      4. Linhas de Emergência Médica em Angola
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Título do Alerta de Emergência</label>
                      <input
                        type="text"
                        value={systemConfig.linhas_emergencia_titulo || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, linhas_emergencia_titulo: e.target.value })}
                        placeholder="Linhas de Emergência Médica em Angola"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Números e Serviços de Emergência</label>
                      <input
                        type="text"
                        value={systemConfig.linhas_emergencia_texto || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, linhas_emergencia_texto: e.target.value })}
                        placeholder="INEM / Ambulância: 112 ou 111 | CISP: 111"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold text-red-600 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Nota Operacional / Horário</label>
                      <input
                        type="text"
                        value={systemConfig.horario_operacao_nota || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, horario_operacao_nota: e.target.value })}
                        placeholder="Operação contínua 24h em todas as capitais provinciais"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Direitos de Autor & Avisos Legais Sanitários */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <ShieldCheck className="w-5 h-5 text-[#00A878]" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#123B7A]">
                      5. Avisos Legais, Termos e Regulamentação ARMED / MINSA
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Texto de Direitos de Autor (Copyright)</label>
                      <input
                        type="text"
                        value={systemConfig.copyright_texto || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, copyright_texto: e.target.value })}
                        placeholder="© MUTIKUKWAMA. Todos os direitos reservados."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>Aviso de Saúde e Responsabilidade Médica (Disclaimer)</span>
                        <span className="text-[10px] text-slate-400">Exibido na base de todas as páginas</span>
                      </label>
                      <textarea
                        rows={2}
                        value={systemConfig.disclaimer_saude || ''}
                        onChange={(e) => setSystemConfig({ ...systemConfig, disclaimer_saude: e.target.value })}
                        placeholder="O Mutikukwama Saúde é uma plataforma de facilitação e acesso à saúde..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-[#00A878] leading-relaxed resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 6: Pré-visualização em Tempo Real do Rodapé (Live Preview) */}
                <div className="bg-[#123B7A] rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-md border border-[#123B7A]/40">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">
                        Pré-visualização em Tempo Real do Rodapé Oficial
                      </h4>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-white/10 text-[#00A878] rounded-full border border-white/10">
                      Actualização Dinâmica
                    </span>
                  </div>

                  {/* Simulated Footer Content */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
                    {/* Brand Info */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-white text-[#123B7A] flex items-center justify-center font-black text-sm">
                          M
                        </div>
                        <div>
                          <div className="font-black text-sm tracking-tight text-white">
                            {systemConfig.nome_plataforma || 'MUTIKUKWAMA'}
                          </div>
                          <div className="text-[9px] font-bold text-[#00A878] tracking-widest uppercase">
                            {systemConfig.subtitulo || 'SAÚDE NACIONAL'}
                          </div>
                        </div>
                      </div>

                      <p className="text-white/70 text-[11px] leading-relaxed">
                        {systemConfig.descricao_plataforma || 'Plataforma nacional de saúde de Angola.'}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-white/90">
                          {systemConfig.selo_conformidade_minsa || 'Normas Sanitárias MINSA'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-bold text-white/90">
                          {systemConfig.selo_proteccao_dados || 'Protecção de Dados'}
                        </span>
                      </div>
                    </div>

                    {/* Support Contacts */}
                    <div className="space-y-2">
                      <div className="font-black text-[11px] uppercase tracking-wider text-white/90">
                        Apoio ao Cidadão
                      </div>
                      <div className="space-y-1.5 text-white/70 text-[11px]">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#00A878]" />
                          <span>{systemConfig.telefone_suporte || '+244 923 000 111'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-[#00A878]" />
                          <span>{systemConfig.email_suporte || 'suporte@mutikukwama.ao'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-red-400" />
                          <span>{systemConfig.endereco_institucional || 'Mutamba, Luanda - Angola'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payments */}
                    <div className="space-y-2">
                      <div className="font-black text-[11px] uppercase tracking-wider text-white/90">
                        {systemConfig.rotulo_metodos_pagamento || 'MÉTODOS DE PAGAMENTO:'}
                      </div>
                      <div className="space-y-1 text-white/70 text-[11px]">
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 font-medium">
                          {systemConfig.metodo_pagamento_1 || 'Multicaixa Express (MCX)'}
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 border border-white/10 font-medium">
                          {systemConfig.metodo_pagamento_2 || 'Transferência BAI (IBAN)'}
                        </div>
                      </div>
                    </div>

                    {/* Emergency Box */}
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-200">
                        <div className="font-black text-[11px] text-white flex items-center gap-1.5">
                          <HeartPulse className="w-4 h-4 text-red-400" />
                          <span>{systemConfig.linhas_emergencia_titulo || 'Linhas de Emergência Médica'}</span>
                        </div>
                        <div className="font-black text-white text-sm mt-1">
                          {systemConfig.linhas_emergencia_texto || '112 ou 111'}
                        </div>
                        <div className="text-[10px] text-red-200/80 mt-1">
                          {systemConfig.horario_operacao_nota || 'Operação contínua 24h'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Bottom Bar */}
                  <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-white/60">
                    <div>
                      {systemConfig.copyright_texto || '© MUTIKUKWAMA. Todos os direitos reservados.'}
                    </div>
                    <div className="text-right italic max-w-lg truncate">
                      {systemConfig.disclaimer_saude || 'Aviso de saúde e regulação ARMED.'}
                    </div>
                  </div>
                </div>

                {/* Bottom Save Action Bar */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-[#00A878]" />
                    <span>As alterações serão aplicadas instantaneamente em toda a aplicação.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Restaurar Padrão
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Configurações e Atualizar Rodapé</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* SUBTAB 3: PARÂMETROS BANCÁRIOS & MULTICAIXA */}
            {configSubTab === 'pagamentos' && (
              <form onSubmit={handleSaveConfig} className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 max-w-4xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="inline-block px-3 py-1 bg-[#E8F5F1] text-[#00A878] text-[10px] font-black rounded-full uppercase tracking-wider">
                      Configurações Nacionais
                    </span>
                    <h2 className="text-lg font-black text-[#123B7A] uppercase tracking-tight mt-1">
                      Parâmetros Oficiais de Pagamento & Contas em Angola
                    </h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Contas bancárias e credenciais para liquidação de subscrições e encomendas de medicamentos.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Multicaixa Express - Número / Telemóvel</label>
                    <input
                      type="text"
                      value={systemConfig.multicaixa_express_numero}
                      onChange={(e) => setSystemConfig({ ...systemConfig, multicaixa_express_numero: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Multicaixa - Entidade Oficial</label>
                    <input
                      type="text"
                      value={systemConfig.multicaixa_entidade}
                      onChange={(e) => setSystemConfig({ ...systemConfig, multicaixa_entidade: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-slate-700">Banco & IBAN Angolano (BAI / BFA)</label>
                    <input
                      type="text"
                      value={systemConfig.banco_iban}
                      onChange={(e) => setSystemConfig({ ...systemConfig, banco_iban: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono focus:outline-none focus:border-[#00A878]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Titular da Conta Bancária</label>
                    <input
                      type="text"
                      value={systemConfig.banco_titular}
                      onChange={(e) => setSystemConfig({ ...systemConfig, banco_titular: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Taxa de Entrega Padrão (AOA)</label>
                    <input
                      type="number"
                      value={systemConfig.taxa_entrega_padrao}
                      onChange={(e) => setSystemConfig({ ...systemConfig, taxa_entrega_padrao: parseInt(e.target.value, 10) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                    />
                  </div>

                  {/* Preços Oficiais dos Planos SaaS */}
                  <div className="sm:col-span-2 pt-4 border-t border-slate-200">
                    <h3 className="font-black text-sm text-[#123B7A] uppercase tracking-tight mb-1 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#00A878]" />
                      <span>Preços Oficiais de Subscrição Mensal (AOA/mês)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mb-3">
                      Estes valores definem os preços exibidos no formulário de criação de conta de novas farmácias e unidades de saúde.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px]">Plano BÁSICO (AOA/mês)</label>
                        <input
                          type="number"
                          value={systemConfig.precos_planos?.basico ?? 15000}
                          onChange={(e) =>
                            setSystemConfig({
                              ...systemConfig,
                              precos_planos: {
                                ...systemConfig.precos_planos,
                                basico: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A878] font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px]">Plano MÉDIO (AOA/mês)</label>
                        <input
                          type="number"
                          value={systemConfig.precos_planos?.medio ?? 35000}
                          onChange={(e) =>
                            setSystemConfig({
                              ...systemConfig,
                              precos_planos: {
                                ...systemConfig.precos_planos,
                                medio: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A878] font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px]">Plano AVANÇADO (AOA/mês)</label>
                        <input
                          type="number"
                          value={systemConfig.precos_planos?.avancado ?? 75000}
                          onChange={(e) =>
                            setSystemConfig({
                              ...systemConfig,
                              precos_planos: {
                                ...systemConfig.precos_planos,
                                avancado: parseInt(e.target.value, 10) || 0,
                              },
                            })
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A878] font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Descontos Promocionais por Período */}
                  <div className="sm:col-span-2 pt-4 border-t border-slate-200">
                    <h3 className="font-black text-sm text-[#123B7A] uppercase tracking-tight mb-1 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Descontos Promocionais por Periodicidade (%)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mb-3">
                      Percentagem de desconto aplicada no ato de inscrição para pagamentos trimestrais e anuais.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px]">Desconto Período TRIMESTRAL (%)</label>
                        <input
                          type="number"
                          value={(systemConfig.descontos_config?.trimestral as any)?.basico ?? 5}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setSystemConfig({
                              ...systemConfig,
                              descontos_config: {
                                ...systemConfig.descontos_config,
                                trimestral: { basico: val, medio: val, avancado: val },
                              },
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A878] font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 text-[11px]">Desconto Período ANUAL (%)</label>
                        <input
                          type="number"
                          value={(systemConfig.descontos_config?.anual as any)?.basico ?? 20}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setSystemConfig({
                              ...systemConfig,
                              descontos_config: {
                                ...systemConfig.descontos_config,
                                anual: { basico: val, medio: val, avancado: val },
                              },
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A878] font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Salvar Parâmetros Bancários</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: POSTGRESQL SUPABASE SCHEMA VIEWER & RESET */}
        {/* ========================================================================= */}
        {activeTab === 'sql' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 bg-[#E8F5F1] text-[#00A878] text-[10px] font-black rounded-full uppercase tracking-wider mb-2">
                  Database & Backend Architecture
                </span>
                <h2 className="text-xl font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <Code className="w-5 h-5 text-[#00A878]" />
                  <span>Esquema SQL de Produção para Supabase / PostgreSQL</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Inclui RLS, Triggers de bloqueio de plano, Tabelas e Índices de alta performance
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopySQL}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar SQL</span>
                </button>
                <button
                  onClick={handleDownloadSQL}
                  className="px-4 py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descarregar .sql</span>
                </button>
                <button
                  onClick={handleResetDatabase}
                  className="px-4 py-2.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-rose-200 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset / Seed DB</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 max-h-96 overflow-y-auto font-mono text-xs text-emerald-400 whitespace-pre leading-relaxed">
              {PRODUCTION_SUPABASE_SQL}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT HEALTH UNIT */}
      {/* ========================================================================= */}
      {isAddUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-slate-800 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#00A878]" />
                <span>{editingUnit ? 'Editar Unidade de Saúde' : 'Credenciar Nova Unidade de Saúde'}</span>
              </h3>
              <button
                onClick={() => setIsAddUnitModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnitForm} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Nome Oficial da Unidade / Farmácia *</label>
                  <input
                    type="text"
                    required
                    value={unitForm.nome}
                    onChange={(e) => setUnitForm({ ...unitForm, nome: e.target.value })}
                    placeholder="Ex: Farmácia Central do Kinaxixi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                {/* Registered Email field */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#00A878]" />
                      <span>E-mail Cadastrado / Conta de Acesso da Unidade *</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Utilizado para login da farmácia/unidade</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={unitForm.email}
                    onChange={(e) => setUnitForm({ ...unitForm, email: e.target.value })}
                    placeholder="Ex: gestor@farmaciacentral.ao"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                {/* Password Reset Section */}
                <div className="sm:col-span-2 p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-xs">Credenciais de Acesso & Redefinição de Senha</h4>
                        <p className="text-[10px] text-slate-500">Defina uma nova senha ou gere uma chave de acesso segura para o gestor</p>
                      </div>
                    </div>
                    {editingUnit?.senha_provisoria && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                        Senha Provisória Activa
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-7 relative">
                      <input
                        type={showUnitPassword ? 'text' : 'password'}
                        value={unitForm.nova_senha}
                        onChange={(e) => setUnitForm({ ...unitForm, nova_senha: e.target.value })}
                        placeholder={editingUnit?.senha_provisoria ? `Senha actual: ${editingUnit.senha_provisoria}` : "Digite nova senha (ou deixe em branco)"}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#00A878]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnitPassword(!showUnitPassword)}
                        className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showUnitPassword ? "Ocultar senha" : "Ver senha"}
                      >
                        {showUnitPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="sm:col-span-5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const generated = generateSecurePassword('Farmacia');
                          setUnitForm({ ...unitForm, nova_senha: generated });
                          setShowUnitPassword(true);
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Gerar Senha</span>
                      </button>

                      {unitForm.nova_senha && (
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(unitForm.email || 'gestor@unidade.ao', unitForm.nova_senha, unitForm.nome || 'Unidade de Saúde')}
                          className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Copiar credenciais completas"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {editingUnit?.ultima_redefinicao_senha && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      Última redefinição: {new Date(editingUnit.ultima_redefinicao_senha).toLocaleString('pt-PT')}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tipo de Unidade</label>
                  <select
                    value={unitForm.tipo}
                    onChange={(e) => setUnitForm({ ...unitForm, tipo: e.target.value as UnitType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="farmacia">Farmácia Comunitária / Hospitalar</option>
                    <option value="clinica">Clínica Médica / Policlínica</option>
                    <option value="hospital">Hospital (Geral / Provincial / Privado)</option>
                    <option value="centro_medico">Centro Médico / Posto de Saúde</option>
                    <option value="veterinaria">Veterinária (Clínica ou Farmácia Veterinária)</option>
                    <option value="consultorio">Consultório Médico / Dentário / Especialidades</option>
                    <option value="laboratorio">Laboratório de Análises Clínicas</option>
                    <option value="deposito">Depósito Grossista (Distribuição B2B)</option>
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2 p-3.5 bg-emerald-50/40 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Regulamentação MINSA (Obrigatório)
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      Exigido por Lei
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Nº de Alvará Sanitário / Registo MINSA *
                    </label>
                    <input
                      type="text"
                      required
                      value={unitForm.certificado_institucional}
                      onChange={(e) => setUnitForm({ ...unitForm, certificado_institucional: e.target.value })}
                      placeholder="CERT-MINSA-2025-4891"
                      className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-slate-800 font-mono font-bold focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="font-bold text-slate-700 block text-xs">
                      Documento Oficial do MINSA (Alvará Sanitário / Certidão Digital) *
                    </label>
                    <div className="border border-emerald-300 rounded-xl p-3 bg-white flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {unitForm.documento_minsa_nome || 'alvara_sanitario_minsa_2025_4891.pdf'}
                          </p>
                          <p className="text-[10px] text-emerald-700 font-semibold">
                            Ficheiro homologado pelo Ministério da Saúde (MINSA)
                          </p>
                        </div>
                      </div>
                      <label className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 transition shrink-0">
                        <span>Substituir</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUnitForm({
                                ...unitForm,
                                documento_minsa_nome: file.name,
                                documento_minsa_url: file.name,
                              });
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Província</label>
                  <select
                    value={unitForm.provincia}
                    onChange={(e) => setUnitForm({ ...unitForm, provincia: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    {PROVINCES_ANGOLA.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Município</label>
                  <input
                    type="text"
                    value={unitForm.municipio}
                    onChange={(e) => setUnitForm({ ...unitForm, municipio: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Telefone / Telemóvel</label>
                  <input
                    type="text"
                    value={unitForm.telefone}
                    onChange={(e) => setUnitForm({ ...unitForm, telefone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">WhatsApp Oficial</label>
                  <input
                    type="text"
                    value={unitForm.whatsapp}
                    onChange={(e) => setUnitForm({ ...unitForm, whatsapp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Plano SaaS Atribuído</label>
                  <select
                    value={unitForm.plano_tipo}
                    onChange={(e) => setUnitForm({ ...unitForm, plano_tipo: e.target.value as PlanType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="basico">Plano Básico (25.000 AOA / mês)</option>
                    <option value="medio">Plano Médio (55.000 AOA / mês)</option>
                    <option value="avancado">Plano Avançado (120.000 AOA / mês)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Horário de Atendimento</label>
                  <input
                    type="text"
                    value={unitForm.horario_funcionamento}
                    onChange={(e) => setUnitForm({ ...unitForm, horario_funcionamento: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUnitModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                >
                  {editingUnit ? 'Salvar Alterações' : 'Credenciar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RENEW / EXTEND UNIT SUBSCRIPTION */}
      {/* ========================================================================= */}
      {renewUnitModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#00A878]" />
                <span>Estender / Renovar Subscrição</span>
              </h3>
              <button
                onClick={() => setRenewUnitModalTarget(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRenewSubscription} className="space-y-4 pt-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="font-black text-[#123B7A] uppercase">{renewUnitModalTarget.nome}</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Expiração atual: <strong>{renewUnitModalTarget.plano_data_expiracao}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Período de Extensão</label>
                <select
                  value={renewDays}
                  onChange={(e) => setRenewDays(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                >
                  <option value={30}>+30 Dias (1 Mês)</option>
                  <option value={90}>+90 Dias (Trimestre)</option>
                  <option value={180}>+180 Dias (Semestre)</option>
                  <option value={365}>+365 Dias (1 Ano Completo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Nível do Plano SaaS</label>
                <select
                  value={renewPlan}
                  onChange={(e) => setRenewPlan(e.target.value as PlanType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                >
                  <option value="basico">Plano Básico</option>
                  <option value="medio">Plano Médio</option>
                  <option value="avancado">Plano Avançado (Selo Premium)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRenewUnitModalTarget(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider shadow-sm"
                >
                  Confirmar Renovação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL PAYMENT RECORD */}
      {/* ========================================================================= */}
      {isManualPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#00A878]" />
                <span>Lançamento Manual de Pagamento</span>
              </h3>
              <button
                onClick={() => setIsManualPaymentModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualPayment} className="space-y-4 pt-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Unidade de Saúde Beneficiária *</label>
                <select
                  required
                  value={manualPayForm.unidade_id}
                  onChange={(e) => setManualPayForm({ ...manualPayForm, unidade_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                >
                  <option value="">Seleccione a Unidade...</option>
                  {allUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome} ({u.provincia})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Plano</label>
                  <select
                    value={manualPayForm.plano_tipo}
                    onChange={(e) => setManualPayForm({ ...manualPayForm, plano_tipo: e.target.value as PlanType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="basico">Básico</option>
                    <option value="medio">Médio</option>
                    <option value="avancado">Avançado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ciclo</label>
                  <select
                    value={manualPayForm.periodicidade}
                    onChange={(e) => setManualPayForm({ ...manualPayForm, periodicidade: e.target.value as PlanPeriodicity })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Valor Liquidado (AOA)</label>
                <input
                  type="number"
                  required
                  value={manualPayForm.valor}
                  onChange={(e) => setManualPayForm({ ...manualPayForm, valor: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-black focus:outline-none focus:border-[#00A878]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Referência ou Número de Talão</label>
                <input
                  type="text"
                  value={manualPayForm.referencia_mcx}
                  onChange={(e) => setManualPayForm({ ...manualPayForm, referencia_mcx: e.target.value })}
                  placeholder="Ex: TALAO-BAI-990234 ou CHEQUE"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:border-[#00A878]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider shadow-sm"
                >
                  Creditar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SYSTEM USER & CREDENTIALS (UNIDADES, MINSA, RBAC) */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black ${
                  userForm.accessCategory === 'institucional'
                    ? 'bg-emerald-100 text-emerald-800'
                    : userForm.accessCategory === 'unidade'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-blue-100 text-[#123B7A]'
                }`}>
                  {userForm.accessCategory === 'institucional' ? (
                    <Landmark className="w-5 h-5" />
                  ) : userForm.accessCategory === 'unidade' ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-[#123B7A] uppercase tracking-tight">
                    {editingUser ? 'Editar Acesso & Credenciais' : 'Criar Novo Acesso (User & Password)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {userForm.accessCategory === 'institucional'
                      ? 'Ministério da Saúde - Credenciamento Institucional'
                      : userForm.accessCategory === 'unidade'
                      ? 'Farmácia, Clínica ou Depósito - Credenciais de Gestor'
                      : 'Administração & Controlo de Acessos'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Selector Tabs (for new access creation) */}
            {!editingUser && (
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl mt-4 text-xs font-bold text-center">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreateMinistryAccess();
                  }}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    userForm.accessCategory === 'institucional'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Ministério (MINSA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreateUnitAccess();
                  }}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    userForm.accessCategory === 'unidade'
                      ? 'bg-[#00A878] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Unidade / Farmácia</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserForm({
                      ...userForm,
                      accessCategory: 'outro',
                      role: 'admin',
                      username: 'admin.geral',
                      departamento: '',
                      cargo: 'Administrador',
                      nova_senha: generateSecurePassword('Mutiku'),
                    });
                  }}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    userForm.accessCategory === 'outro'
                      ? 'bg-[#123B7A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Outro Perfil</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4 pt-4 text-xs">
              {/* Category Specific Banner */}
              {userForm.accessCategory === 'institucional' && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="font-black text-xs flex items-center gap-1.5 text-emerald-800 uppercase tracking-wide">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    <span>Acesso Oficial - Autoridades Sanitárias (MINSA)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                    Permite ao titular aceder ao Observatório Nacional de Saúde, relatórios de escassez de fármacos, vigilância epidemiológica e mapas de cobertura sanitária das 21 províncias.
                  </p>
                </div>
              )}

              {userForm.accessCategory === 'unidade' && (
                <div className="p-3 rounded-2xl bg-[#E8F5F1] border border-[#00A878]/30 text-[#007050] space-y-1">
                  <div className="font-black text-xs flex items-center gap-1.5 text-[#00A878] uppercase tracking-wide">
                    <Building2 className="w-4 h-4" />
                    <span>Acesso Operacional - Gestão de Farmácia ou Depósito</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Vincule a farmácia ao gestor para lançamento de stock, confirmação de reservas de utentes e actualização de horários de funcionamento.
                  </p>
                </div>
              )}

              {/* Unit Selection (When Category is Unidade) */}
              {userForm.accessCategory === 'unidade' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#00A878]" />
                    <span>Seleccionar Farmácia / Unidade de Saúde Vinculada *</span>
                  </label>
                  <select
                    value={userForm.unidade_id}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const u = allUnits.find((unit) => unit.id === selectedId);
                      if (u) {
                        const slug = u.slug || u.nome.toLowerCase().replace(/[^a-z0-9]/g, '.').substring(0, 20);
                        const cleanSlug = slug.replace(/^farmacia\./, '');
                        setUserForm({
                          ...userForm,
                          unidade_id: u.id,
                          role: u.tipo === 'deposito' ? 'deposito' : 'unidade',
                          nome: `Gestor (${u.nome})`,
                          username: `farmacia.${cleanSlug}`,
                          email: u.email || `farmacia.${cleanSlug}@saude.ao`,
                          telefone: u.telefone || userForm.telefone,
                          whatsapp: u.whatsapp || userForm.whatsapp,
                        });
                      } else {
                        setUserForm({ ...userForm, unidade_id: '' });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="">-- Seleccione uma farmácia cadastrada --</option>
                    {allUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.provincia} • {u.tipo === 'deposito' ? 'Depósito' : 'Farmácia'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* MINSA Department Selection (When Category is Institucional) */}
              {userForm.accessCategory === 'institucional' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Direcção / Departamento do MINSA *</span>
                    </label>
                    <select
                      value={userForm.departamento}
                      onChange={(e) => {
                        const dept = e.target.value;
                        let autoUser = 'minsa.dnme';
                        if (dept.includes('Inspecção')) autoUser = 'minsa.inspeccao';
                        else if (dept.includes('Pública')) autoUser = 'minsa.dnsp';
                        else if (dept.includes('Vigilância')) autoUser = 'minsa.vigilancia';
                        else if (dept.includes('Observatório')) autoUser = 'minsa.observatorio';
                        else if (dept.includes('Provincial')) autoUser = 'minsa.gps';
                        else if (dept.includes('Ministro')) autoUser = 'minsa.gabinete';

                        setUserForm({
                          ...userForm,
                          departamento: dept,
                          username: userForm.username.startsWith('minsa.') ? autoUser : userForm.username,
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-semibold focus:outline-none focus:border-emerald-600"
                    >
                      <option value="Direcção Nacional de Medicamentos e Equipamentos (DNME)">
                        DNME - Direcção Nac. de Medicamentos
                      </option>
                      <option value="Inspecção Geral das Actividades de Saúde">
                        Inspecção Geral de Saúde (IGAS)
                      </option>
                      <option value="Direcção Nacional de Saúde Pública (DNSP)">
                        DNSP - Saúde Pública Nacional
                      </option>
                      <option value="Vigilância Epidemiológica e Controlo de Endemias">
                        Vigilância Epidemiológica
                      </option>
                      <option value="Observatório Nacional de Saúde de Angola">
                        Observatório Nacional do Medicamento
                      </option>
                      <option value="Gabinete Provincial de Saúde (GPS Luanda)">
                        Gabinete Provincial de Saúde (GPS)
                      </option>
                      <option value="Gabinete do Ministro da Saúde">
                        Gabinete Ministerial
                      </option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Cargo / Função Oficial *</label>
                    <input
                      type="text"
                      required
                      value={userForm.cargo}
                      onChange={(e) => setUserForm({ ...userForm, cargo: e.target.value })}
                      placeholder="Ex: Inspector Sanitário / Delegado"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-medium focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {/* User & Password Primary Box */}
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-slate-800 text-xs uppercase tracking-tight">
                        Credenciais de Login (User & Password)
                      </span>
                      <p className="text-[10px] text-slate-400">
                        O utilizador usará este User ou E-mail com a Password para autenticar
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = userForm.accessCategory === 'institucional'
                        ? 'Minsa'
                        : userForm.accessCategory === 'unidade'
                        ? 'Farmacia'
                        : 'Mutiku';
                      const generated = generateSecurePassword(prefix);
                      setUserForm({ ...userForm, nova_senha: generated });
                      setShowUserPassword(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Gerar Password</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* USER (Username) */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#123B7A]" />
                        <span>User (Nome de Utilizador) *</span>
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">@</span>
                      <input
                        type="text"
                        required
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') })}
                        placeholder={userForm.accessCategory === 'institucional' ? 'minsa.dnme' : 'farmacia.central'}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 font-mono font-bold text-xs text-[#123B7A] focus:outline-none focus:border-[#00A878]"
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>Password (Palavra-passe) *</span>
                      <span className="text-[10px] text-slate-400 font-normal">Mín. 6 dígitos</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={userForm.nova_senha}
                        onChange={(e) => setUserForm({ ...userForm, nova_senha: e.target.value })}
                        placeholder={editingUser?.senha_provisoria ? `Actual: ${editingUser.senha_provisoria}` : "Defina ou clique em 'Gerar'"}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2 font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00A878]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showUserPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {userForm.nova_senha && (
                  <div className="flex items-center justify-between bg-amber-50/80 p-2 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-amber-700 font-bold">Palavra-passe definida:</span>
                      <span className="font-black text-amber-900">{userForm.nova_senha}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(
                        userForm.email || `${userForm.username}@mutikukwama.ao`,
                        userForm.nova_senha,
                        userForm.nome || 'Utilizador',
                        userForm.accessCategory === 'institucional' ? 'Ministério da Saúde (MINSA)' : 'Unidade de Saúde',
                        userForm.username
                      )}
                      className="px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 font-bold text-[10px] text-amber-900 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Personal / Official Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">
                    {userForm.accessCategory === 'institucional'
                      ? 'Nome Completo do Titular / Delegado *'
                      : 'Nome do Responsável / Farmácia *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.nome}
                    onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })}
                    placeholder={userForm.accessCategory === 'institucional' ? 'Ex: Dr. Manuel Gaspar' : 'Ex: Dra. Ana Paula Costa'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#00A878]" />
                      <span>E-mail de Contacto / Notificação</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder={userForm.accessCategory === 'institucional' ? 'minsa.dnme@saude.gov.ao' : 'gestor@farmacia.ao'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 focus:outline-none focus:border-[#00A878]"
                  />
                </div>
              </div>

              {/* Telephone & WhatsApp for immediate credential sharing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Telefone de Contacto</span>
                  </label>
                  <input
                    type="tel"
                    value={userForm.telefone}
                    onChange={(e) => setUserForm({ ...userForm, telefone: e.target.value })}
                    placeholder="+244 923 000 000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp (para envio directo)</span>
                  </label>
                  <input
                    type="tel"
                    value={userForm.whatsapp}
                    onChange={(e) => setUserForm({ ...userForm, whatsapp: e.target.value })}
                    placeholder="+244 923 000 000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A878]"
                  />
                </div>
              </div>

              {/* Role selector if category is "Outro" */}
              {userForm.accessCategory === 'outro' && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Perfil de Acesso do Sistema (RBAC)</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="admin">Administrador Operacional</option>
                    <option value="super_admin">Super Administrador Geral</option>
                    <option value="paciente">Utente / Paciente</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-full text-white font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                    userForm.accessCategory === 'institucional'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : userForm.accessCategory === 'unidade'
                      ? 'bg-[#00A878] hover:bg-[#008f66]'
                      : 'bg-[#123B7A] hover:bg-[#0d2a58]'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Guardar Alterações' : 'Criar Acesso & Gerar Credenciais'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATED CREDENTIALS SLIP (SHOW USER & PASSWORD FOR IMMEDIATE SHARE) */}
      {/* ========================================================================= */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95 space-y-4">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-[#123B7A] tracking-tight uppercase">
                Acesso Criado com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                As credenciais de entrada oficial foram geradas. Pode copiar ou enviar diretamente ao destinatário.
              </p>
            </div>

            {/* Credential Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {createdCredentialsModal.tipo === 'institucional' ? 'Ministério da Saúde (MINSA)' : 'Unidade de Saúde'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {createdCredentialsModal.role.toUpperCase()}
                </span>
              </div>

              <div>
                <div className="text-xs text-slate-500 font-medium">Entidade / Titular:</div>
                <div className="text-sm font-black text-[#123B7A]">{createdCredentialsModal.entidadeNome}</div>
                <div className="text-xs text-slate-600 font-medium">{createdCredentialsModal.nome}</div>
              </div>

              <div className="space-y-2 pt-1">
                {/* User */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                  <div>
                    <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">User de Login</div>
                    <div className="font-mono text-sm font-black text-[#123B7A]">
                      @{createdCredentialsModal.username}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentialsModal.username);
                      success('User copiado!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="Copiar User"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                  <div>
                    <div className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">Palavra-passe (Password)</div>
                    <div className="font-mono text-sm font-black text-amber-800">
                      {createdCredentialsModal.password}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentialsModal.password);
                      success('Password copiada!');
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    title="Copiar Password"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono pt-1">
                Portal: <span className="font-bold text-slate-700">{window.location.origin}</span>
              </div>
            </div>

            {/* Actions: Copy All or WhatsApp Share */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  const roleLabel = createdCredentialsModal.tipo === 'institucional'
                    ? 'Ministério da Saúde (MINSA)'
                    : 'Unidade de Saúde';
                  handleCopyCredentials(
                    createdCredentialsModal.email,
                    createdCredentialsModal.password,
                    createdCredentialsModal.entidadeNome,
                    roleLabel,
                    createdCredentialsModal.username
                  );
                }}
                className="w-full py-2.5 rounded-2xl bg-[#123B7A] hover:bg-[#0d2a58] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Credenciais Completas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const roleLabel = createdCredentialsModal.tipo === 'institucional'
                    ? 'Ministério da Saúde (MINSA)'
                    : 'Unidade de Saúde';
                  const text = `🏥 *MUTIKUKWAMA SAÚDE - CREDENCIAIS DE ACESSO*\n` +
                    `-----------------------------------------\n` +
                    `🏢 *Entidade:* ${createdCredentialsModal.entidadeNome}\n` +
                    `🛡️ *Perfil:* ${roleLabel}\n` +
                    `👤 *User (Login):* ${createdCredentialsModal.username}\n` +
                    `🔑 *Password:* ${createdCredentialsModal.password}\n` +
                    `🌐 *Portal:* ${window.location.origin}\n` +
                    `-----------------------------------------\n` +
                    `*Aviso:* Aceda ao portal e altere a sua palavra-passe no primeiro login.`;

                  handleShareViaWhatsApp(createdCredentialsModal.telefone, text);
                }}
                className="w-full py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Partilhar via WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="w-full py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DEDICATED QUICK RESET PASSWORD (UNIDADE OU UTILIZADOR) */}
      {/* ========================================================================= */}
      {resetPasswordModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#123B7A] uppercase tracking-tight">
                    Redefinir Senha de Acesso
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Super Admin - Gestão de Credenciais
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setResetPasswordModalTarget(null);
                  setNewPasswordInput('');
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4 pt-4 text-xs">
              {/* Account Details Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Conta Seleccionada ({resetPasswordModalTarget.type === 'unit' ? 'Unidade de Saúde' : 'Utilizador / Perfil'})
                </div>
                <div className="font-black text-sm text-[#123B7A] uppercase">
                  {resetPasswordModalTarget.name}
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Mail className="w-3.5 h-3.5 text-[#00A878]" />
                  <span className="font-mono text-[11px] font-bold text-slate-800">{resetPasswordModalTarget.email}</span>
                </div>
                {resetPasswordModalTarget.currentPassword && (
                  <div className="pt-1 text-[10px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                    <span className="font-bold">Senha Provisória Actual:</span> <span className="font-mono font-black">{resetPasswordModalTarget.currentPassword}</span>
                  </div>
                )}
              </div>

              {/* Password Input & Generator */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Nova Senha Provisória</span>
                  <span className="text-[10px] text-slate-400 font-normal">Mínimo 6 caracteres</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Clique em 'Gerar Senha Segura' ou digite..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-800 font-mono text-xs focus:outline-none focus:border-[#00A878]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showNewPassword ? "Ocultar" : "Mostrar"}
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons for Generator */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const generated = generateSecurePassword(resetPasswordModalTarget.type === 'unit' ? 'Farmacia' : 'Mutiku');
                    setNewPasswordInput(generated);
                    setShowNewPassword(true);
                  }}
                  className="flex-1 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Gerar Senha Segura</span>
                </button>

                {newPasswordInput && (
                  <button
                    type="button"
                    onClick={() => handleCopyCredentials(resetPasswordModalTarget.email, newPasswordInput, resetPasswordModalTarget.name)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copiar credenciais"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                )}
              </div>

              <div className="p-3 rounded-2xl bg-[#E8F5F1] border border-[#00A878]/20 text-[11px] text-[#007050] space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00A878]" />
                  <span>Pronto para Enviar ao Titular</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-normal">
                  Ao confirmar, o sistema actualizará imediatamente as credenciais e você poderá copiar o texto formatado para enviar via WhatsApp ou E-mail.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordModalTarget(null);
                    setNewPasswordInput('');
                  }}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Redefinir & Copiar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADICIONAR / EDITAR PATROCINADOR OU EMPRESA APOIANTE */}
      {/* ========================================================================= */}
      {isAddSponsorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center border border-[#00A878]/30">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-[#123B7A] text-base">
                    {editingSponsor ? 'Editar Patrocinador / Apoiante' : 'Adicionar Empresa Apoiante ou Patrocinadora'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Configure as informações e decida se a empresa aparece no carrossel da Home.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSponsorModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSponsor} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome da Empresa / Instituição *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banco BAI, Unitel Angola, ENSA"
                    value={sponsorForm.nome}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, nome: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nível / Tier de Parceria</label>
                  <select
                    value={sponsorForm.tier}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, tier: e.target.value as SponsorTier })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="diamante">Diamante (Patrocínio Principal)</option>
                    <option value="ouro">Ouro (Patrocinador Oficial)</option>
                    <option value="institucional">Institucional (Governo / MINSA / Regulador)</option>
                    <option value="estrategico">Estratégico (Parceiro de Saúde / Hospitalar)</option>
                    <option value="tecnologico">Tecnológico (Conectividade / Telecom)</option>
                    <option value="prata">Prata (Apoio Comunitário)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Categoria / Designação</label>
                <input
                  type="text"
                  placeholder="Ex: Patrocinador Oficial & Inclusão Financeira, Apoio Institucional"
                  value={sponsorForm.categoria}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, categoria: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-semibold focus:outline-none focus:border-[#00A878]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#00A878]" />
                    <span>Logótipo da Empresa</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    Upload direto do computador (PC) ou URL
                  </span>
                </div>

                {/* Hidden File Input for PC Upload */}
                <input
                  ref={sponsorFileInputRef}
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSponsorLogoFileUpload(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                {/* If logo is already loaded / uploaded */}
                {sponsorForm.logo_url ? (
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <img
                          src={sponsorForm.logo_url}
                          alt="Logótipo da Empresa"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              sponsorForm.logo_url.startsWith('data:image')
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-[#123B7A] border border-blue-200'
                            }`}
                          >
                            {sponsorForm.logo_url.startsWith('data:image') ? (
                              <>
                                <Upload className="w-3 h-3" />
                                Upload do PC
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3" />
                                URL da Web
                              </>
                            )}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Imagem carregada
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate mt-1">
                          {sponsorLogoFileName || sponsorForm.nome || 'Logótipo da empresa parceira'}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Pronta para exibição no carrossel de apoiantes
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => sponsorFileInputRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Escolher outra imagem no computador"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#00A878]" />
                        <span>Trocar Imagem</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSponsorForm({ ...sponsorForm, logo_url: '' });
                          setSponsorLogoFileName('');
                        }}
                        className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                        title="Remover imagem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Drag & Drop PC Upload Box */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingSponsorLogo(true);
                    }}
                    onDragLeave={() => setIsDraggingSponsorLogo(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingSponsorLogo(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleSponsorLogoFileUpload(file);
                    }}
                    onClick={() => sponsorFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDraggingSponsorLogo
                        ? 'border-[#00A878] bg-[#E8F5F1]/60 scale-[1.01]'
                        : 'border-slate-300 hover:border-[#00A878] bg-slate-50/60 hover:bg-[#E8F5F1]/20'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#E8F5F1] text-[#00A878] flex items-center justify-center shadow-2xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">
                        Clique aqui para carregar a imagem do seu computador (PC)
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        ou arraste e solte o ficheiro de imagem aqui
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        Formatos suportados: PNG, JPG, JPEG, SVG, WebP (até 5MB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sponsorFileInputRef.current?.click();
                      }}
                      className="mt-1 px-4 py-1.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white text-xs font-black uppercase tracking-wider shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Selecionar do PC</span>
                    </button>
                  </div>
                )}

                {/* Secondary Option: Manual URL & Quick Presets */}
                <details className="group pt-1 text-xs">
                  <summary className="font-bold text-slate-500 hover:text-slate-800 cursor-pointer list-none flex items-center gap-1.5 select-none py-1">
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90 text-slate-400" />
                    <span>Ou introduzir link/URL da imagem ou sugestões pré-definidas</span>
                  </summary>

                  <div className="pt-2 pl-5 space-y-2 border-l-2 border-slate-100 ml-1.5 mt-1">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://exemplo.ao/logotipo.png"
                        value={sponsorForm.logo_url}
                        onChange={(e) => {
                          setSponsorForm({ ...sponsorForm, logo_url: e.target.value });
                          if (e.target.value.startsWith('http')) {
                            setSponsorLogoFileName('URL da Web');
                          }
                        }}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-medium focus:outline-none focus:border-[#00A878]"
                      />
                    </div>

                    {/* Quick Angolan Brand Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="text-slate-400 font-bold">Sugestões rápidas:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSponsorForm({
                            ...sponsorForm,
                            nome: sponsorForm.nome || 'Banco BAI',
                            logo_url: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=200&auto=format&fit=crop&q=80',
                          });
                          setSponsorLogoFileName('Preset Banco BAI');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Bancário
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSponsorForm({
                            ...sponsorForm,
                            nome: sponsorForm.nome || 'Unitel Angola',
                            logo_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&auto=format&fit=crop&q=80',
                          });
                          setSponsorLogoFileName('Preset Unitel Angola');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Telecomunicações
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSponsorForm({
                            ...sponsorForm,
                            nome: sponsorForm.nome || 'Clínica Girassol',
                            logo_url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80',
                          });
                          setSponsorLogoFileName('Preset Clínica Girassol');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Hospitalar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSponsorForm({
                            ...sponsorForm,
                            nome: sponsorForm.nome || 'ARMED - MINSA',
                            logo_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&auto=format&fit=crop&q=80',
                          });
                          setSponsorLogoFileName('Preset ARMED MINSA');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Institucional
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSponsorForm({
                            ...sponsorForm,
                            nome: sponsorForm.nome || 'Mecofarma Distribuidora',
                            logo_url: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=200&auto=format&fit=crop&q=80',
                          });
                          setSponsorLogoFileName('Preset Mecofarma Distribuidora');
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Farmacêutico
                      </button>
                    </div>
                  </div>
                </details>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Website Oficial</label>
                  <input
                    type="url"
                    placeholder="https://www.empresa.ao"
                    value={sponsorForm.website_url}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, website_url: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ordem de Exibição no Carrossel</label>
                  <input
                    type="number"
                    min="1"
                    value={sponsorForm.ordem}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, ordem: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Descrição / Mensagem de Impacto para os Cidadãos</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Apoia o acesso transparente à saúde e medicamentos certificados em Angola..."
                  value={sponsorForm.descricao}
                  onChange={(e) => setSponsorForm({ ...sponsorForm, descricao: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878] resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sponsorForm.ativo}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, ativo: e.target.checked })}
                    className="w-4 h-4 rounded text-[#00A878] focus:ring-[#00A878] border-slate-300"
                  />
                  <div>
                    <div className="font-black text-[#123B7A]">Exibir no Carrossel da Página Inicial</div>
                    <div className="text-[10px] text-slate-500">
                      Se desmarcado, a empresa ficará guardada no catálogo mas oculta do público na Home.
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-slate-200/60">
                  <input
                    type="checkbox"
                    checked={sponsorForm.em_destaque}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, em_destaque: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300"
                  />
                  <div>
                    <div className="font-black text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Em Destaque Especial</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Exibe um distintivo dourado de destaque prioritário.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSponsorModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingSponsor ? 'Guardar Alterações' : 'Cadastrar Empresa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINSA Official Document & License Modal */}
      {minsaDocModalUnit && (
        <MinsaDocumentModal
          isOpen={!!minsaDocModalUnit}
          unit={minsaDocModalUnit}
          onClose={() => setMinsaDocModalUnit(null)}
        />
      )}

      {/* Payment Receipt / Comprovativo Modal */}
      {selectedPaymentForProof && (
        <PaymentReceiptModal
          isOpen={!!selectedPaymentForProof}
          payment={selectedPaymentForProof}
          unit={allUnits.find((u) => u.id === selectedPaymentForProof.unidade_id) || null}
          onValidate={(id, approved) => {
            handleValidatePayment(id, approved);
            setSelectedPaymentForProof(null);
          }}
          onClose={() => setSelectedPaymentForProof(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: Eliminar Unidade de Saúde (Substitui confirm do browser) */}
      {/* ========================================================================= */}
      {unitToDelete && (
        <div id="modal-delete-unit-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="modal-delete-unit-container" className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Eliminar Unidade de Saúde
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Remoção definitiva e desvinculação da plataforma
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs text-rose-950 space-y-2">
              <p>
                Tem a certeza de que deseja eliminar permanentemente a unidade <strong className="font-bold underline text-rose-900">{unitToDelete.name}</strong>?
              </p>
              <p className="text-[11px] text-rose-700 font-medium">
                ⚠️ Atenção: Esta acção é irreversível. Todos os medicamentos cadastrados em catálogo, serviços de saúde, exames clínicos e comprovativos associados serão limpos.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-delete-unit"
                type="button"
                onClick={() => setUnitToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-unit"
                type="button"
                onClick={confirmDeleteUnit}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Definitivamente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Rejeitar / Bloquear Unidade com Motivo (Substitui prompt do browser) */}
      {/* ========================================================================= */}
      {unitToReject && (
        <div id="modal-reject-unit-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="modal-reject-unit-container" className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Rejeitar / Bloquear Unidade
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {unitToReject.name}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Indique o motivo formal da rejeição / indeferimento:
              </label>
              <textarea
                id="input-reject-unit-reason"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                placeholder="Ex: Alvará sanitário expirado ou documentação não conforme as normas do MINSA."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-reject-unit"
                type="button"
                onClick={() => setUnitToReject(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-reject-unit"
                type="button"
                onClick={confirmRejectUnit}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Confirmar Rejeição</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Eliminar Utilizador */}
      {/* ========================================================================= */}
      {userToDelete && (
        <div id="modal-delete-user-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="modal-delete-user-container" className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Remover Utilizador
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Eliminação de credenciais e acessos
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Tem a certeza de que deseja remover o utilizador <strong className="font-bold text-slate-900">{userToDelete.name}</strong> do sistema?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-delete-user"
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-user"
                type="button"
                onClick={confirmDeleteUser}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Utilizador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Eliminar Patrocinador */}
      {/* ========================================================================= */}
      {sponsorToDelete && (
        <div id="modal-delete-sponsor-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="modal-delete-sponsor-container" className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Remover Empresa Patrocinadora
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {sponsorToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Deseja remover permanentemente a empresa <strong className="font-bold text-slate-900">{sponsorToDelete.name}</strong> da lista de patrocinadores e apoiantes oficiais?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-delete-sponsor"
                type="button"
                onClick={() => setSponsorToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-sponsor"
                type="button"
                onClick={confirmDeleteSponsor}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remover Patrocinador</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Restaurar Patrocinadores Padrão */}
      {/* ========================================================================= */}
      {isResetSponsorsModalOpen && (
        <div id="modal-reset-sponsors-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="modal-reset-sponsors-container" className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Restaurar Patrocinadores Oficiais
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Repor lista padrão de empresas apoiantes
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Deseja restaurar a lista oficial de empresas apoiantes e patrocinadoras de Angola (ENSA, Unitel, BAI, Sonangol, etc.)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-reset-sponsors"
                type="button"
                onClick={() => setIsResetSponsorsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-reset-sponsors"
                type="button"
                onClick={confirmResetSponsors}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#00A878] hover:bg-[#008f66] text-white shadow-md shadow-[#00A878]/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Lista</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Restaurar Configurações Padrão */}
      {/* ========================================================================= */}
      {isResetConfigModalOpen && (
        <div id="modal-reset-config-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="modal-reset-config-container" className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Restaurar Parâmetros Institucionais
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Repor dados de contacto, IBAN e rodapé
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Deseja restaurar as configurações institucionais, contactos, dados de pagamento e rodapé para os padrões oficiais do sistema?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-reset-config"
                type="button"
                onClick={() => setIsResetConfigModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-reset-config"
                type="button"
                onClick={confirmResetConfig}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Parâmetros</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Restaurar Base de Dados de Demonstração */}
      {/* ========================================================================= */}
      {isResetDbModalOpen && (
        <div id="modal-reset-db-overlay" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div id="modal-reset-db-container" className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Restaurar Base de Dados Original
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Reinicialização de dados locais e catálogo
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs text-rose-950 space-y-2">
              <p className="font-bold">
                ATENÇÃO: Deseja restaurar a base de dados de demonstração para o estado original?
              </p>
              <p className="text-[11px] text-rose-700">
                Todas as modificações locais, novas unidades criadas ou eliminadas e encomendas serão repostas para a versão inicial de demonstração.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                id="btn-cancel-reset-db"
                type="button"
                onClick={() => setIsResetDbModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-reset-db"
                type="button"
                onClick={confirmResetDatabase}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Restaurar Base de Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
