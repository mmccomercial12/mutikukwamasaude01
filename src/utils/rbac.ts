import { UserProfile, UserRole } from '../types';

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  recommendedView?: string;
  title?: string;
}

/**
 * Retorna o painel principal correspondente a cada perfil de utilizador.
 */
export function getHomeDashboardForRole(role?: UserRole): 'admin-dashboard' | 'unit-dashboard' | 'institutional' | 'utente-dashboard' | 'home' {
  switch (role) {
    case 'super_admin':
    case 'admin':
      return 'admin-dashboard';
    case 'unidade':
    case 'deposito':
      return 'unit-dashboard';
    case 'institucional':
      return 'institutional';
    case 'paciente':
      return 'utente-dashboard';
    default:
      return 'home';
  }
}

/**
 * Retorna o nome amigável e descrição de responsabilidade de cada perfil.
 */
export function getRoleLabel(role?: UserRole): { name: string; description: string; badgeColor: string } {
  switch (role) {
    case 'super_admin':
      return {
        name: 'Super Administrador Geral',
        description: 'Acesso total irrestrito: gestão de todas as unidades, utilizadores, pagamentos e parametrização do sistema.',
        badgeColor: 'bg-red-100 text-red-800 border-red-200',
      };
    case 'admin':
      return {
        name: 'Administrador de Operações',
        description: 'Gestão operacional de unidades, suporte técnico e reconciliação de transações.',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    case 'unidade':
      return {
        name: 'Unidade Sanitária (Farmácia / Clínica)',
        description: 'Gestão exclusiva do inventário da própria unidade, receção de receitas e atendimento a pedidos de utentes.',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      };
    case 'deposito':
      return {
        name: 'Depósito Grossista (Distribuição B2B)',
        description: 'Gestão exclusiva de stocks de atacado e fornecimento a farmácias e clínicas credenciadas.',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      };
    case 'institucional':
      return {
        name: 'Ministério da Saúde (MINSA / ARMED)',
        description: 'Observatório Nacional, vigilância epidemiológica, auditoria de alvarás e emissão de circulares oficiais.',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'paciente':
      return {
        name: 'Utente / Paciente',
        description: 'Pesquisa de medicamentos em tempo real, submissão de receitas digitais e histórico de compras.',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      };
    default:
      return {
        name: 'Visitante Não Autenticado',
        description: 'Acesso público à pesquisa e consulta de planos de subscrição.',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

/**
 * REGRA CENTRAL DE ACESSO (RBAC)
 * 
 * 1. QUEM É UNIDADE: NÃO DEVE ENTRAR NO SUPER ADMIN.
 * 2. QUEM É MINISTÉRIO DA SAÚDE: NÃO DEVE ENTRAR NO DEPÓSITO, NEM NA UNIDADE, E NEM NO SUPER ADMIN.
 * 3. QUEM É DEPÓSITO: NÃO DEVE ENTRAR NO SUPER ADMIN, NEM NO MINISTÉRIO.
 * 4. QUEM É UTENTE / PACIENTE: NÃO DEVE ENTRAR EM NENHUM PAINEL ADMINISTRATIVO OU DE GESTÃO.
 * 5. APENAS O SUPER ADMIN TEM ACESSO GLOBAL ("EXCEPTO SUPER ADMIN").
 */
export function validateViewAccess(
  user: UserProfile | null,
  targetView: string
): AccessCheckResult {
  // Visões públicas acessíveis por qualquer visitante ou utilizador
  if (['home', 'search', 'plans', 'login'].includes(targetView)) {
    return { allowed: true };
  }

  // Se não estiver autenticado, qualquer painel fechado exige início de sessão
  if (!user) {
    return {
      allowed: false,
      title: 'Autenticação Necessária',
      reason: 'É necessário iniciar sessão com as suas credenciais autorizadas para aceder a esta área restrita.',
      recommendedView: 'login',
    };
  }

  const role = user.role;

  // 1. Acesso ao SUPER ADMIN / ADMIN DASHBOARD
  if (targetView === 'admin' || targetView === 'admin-dashboard') {
    if (role === 'super_admin' || role === 'admin') {
      return { allowed: true };
    }

    if (role === 'unidade') {
      return {
        allowed: false,
        title: 'Acesso Restrito: Não Permitido para Unidades Sanitárias',
        reason: 'O seu perfil é de Unidade Sanitária (Farmácia/Clínica). Conforme as regras de segurança da plataforma, unidades de saúde não têm permissão para aceder à Administração Geral do Sistema (Super Admin).',
        recommendedView: 'unit-dashboard',
      };
    }

    if (role === 'institucional') {
      return {
        allowed: false,
        title: 'Acesso Restrito: Não Permitido para o Ministério da Saúde',
        reason: 'O seu perfil é do Ministério da Saúde (MINSA). A segregação de segurança impede o acesso ministerial à administração interna da infraestrutura SaaS (Super Admin). O seu painel autorizado é o Observatório e Inteligência Sanitária.',
        recommendedView: 'institutional',
      };
    }

    if (role === 'deposito') {
      return {
        allowed: false,
        title: 'Acesso Restrito: Não Permitido para Depósitos',
        reason: 'O seu perfil é de Depósito Grossista. Depósitos têm acesso exclusivo ao seu painel de atacado B2B e não podem aceder ao Super Admin.',
        recommendedView: 'unit-dashboard',
      };
    }

    // Paciente
    return {
      allowed: false,
      title: 'Acesso Restrito ao Super Administrador',
      reason: 'Acesso exclusivo reservado ao Super Administrador Geral do Sistema.',
      recommendedView: 'utente-dashboard',
    };
  }

  // 2. Acesso ao PORTAL DO MINISTÉRIO DA SAÚDE (INSTITUCIONAL)
  if (targetView === 'institutional') {
    if (role === 'institucional' || role === 'super_admin') {
      return { allowed: true };
    }

    if (role === 'unidade') {
      return {
        allowed: false,
        title: 'Acesso Exclusivo: Ministério da Saúde (MINSA)',
        reason: 'O Portal de Inteligência Sanitária e Observatório Epidemiológico é de uso restrito do Ministério da Saúde e Reguladores Nacionais. Unidades de saúde devem consultar circulares através do seu próprio painel.',
        recommendedView: 'unit-dashboard',
      };
    }

    if (role === 'deposito') {
      return {
        allowed: false,
        title: 'Acesso Exclusivo: Ministério da Saúde (MINSA)',
        reason: 'Este módulo é reservado às autoridades reguladoras de saúde (MINSA / ARMED). Depósitos grossistas não têm permissão de acesso a este portal.',
        recommendedView: 'unit-dashboard',
      };
    }

    return {
      allowed: false,
      title: 'Acesso Restrito ao Ministério da Saúde',
      reason: 'Área reservada a entidades governamentais e de fiscalização em Angola.',
      recommendedView: 'utente-dashboard',
    };
  }

  // 3. Acesso ao PORTAL DA UNIDADE & DEPÓSITO (UNIT-DASHBOARD)
  if (targetView === 'unit-dashboard') {
    // REGRA CRÍTICA: "quem é Ministério da saude não deve entrar no deposito ou unidade"
    if (role === 'institucional') {
      return {
        allowed: false,
        title: 'Acesso Bloqueado: Proibido para o Ministério da Saúde',
        reason: 'Por imposição estrita das regras da plataforma, utilizadores com credencial do Ministério da Saúde não têm permissão para aceder à gestão interna de stock ou painéis operacionais de farmácias, clínicas ou depósitos grossistas.',
        recommendedView: 'institutional',
      };
    }

    if (role === 'paciente') {
      return {
        allowed: false,
        title: 'Acesso Restrito a Estabelecimentos de Saúde',
        reason: 'O Portal de Gestão de Unidade destina-se exclusivamente a farmácias, clínicas e depósitos autorizados. Os utentes têm acesso ao Portal do Utente.',
        recommendedView: 'utente-dashboard',
      };
    }

    // Permitido para unidade, depósito e super_admin (auditoria)
    return { allowed: true };
  }

  // 4. Acesso ao PORTAL DO UTENTE
  if (targetView === 'utente-dashboard') {
    // Permitido para paciente e super_admin. Outros perfis são direcionados aos seus painéis profissionais,
    // mas podem consultar suas contas se necessário.
    return { allowed: true };
  }

  return { allowed: true };
}
