/**
 * MUTIKUKWAMA SAÚDE - Core TypeScript Definitions
 */

export type UserRole =
  | 'paciente'
  | 'unidade'
  | 'deposito'
  | 'admin'
  | 'super_admin'
  | 'institucional';

export type UnitType =
  | 'farmacia'
  | 'clinica'
  | 'hospital'
  | 'centro_medico'
  | 'veterinaria'
  | 'consultorio'
  | 'laboratorio'
  | 'unidade_sanitaria'
  | 'deposito';

export type PlanType = 'gratis' | 'basico' | 'medio' | 'avancado';

export type PlanPeriodicity = 'mensal' | 'trimestral' | 'semestral' | 'anual';

export type PlanStatus = 'ativo' | 'expirado' | 'pendente' | 'cancelado';

export type PaymentMethod = 'multicaixa_express' | 'transferencia_bancaria';

export type PaymentStatus = 'pendente' | 'confirmado' | 'rejeitado';

export type OrderStatus =
  | 'pendente'
  | 'confirmado'
  | 'em_preparacao'
  | 'pronto_levantamento'
  | 'a_caminho'
  | 'concluido'
  | 'cancelado';

export type DeliveryMode = 'levantamento' | 'entrega';

export type ProductCategory =
  | 'medicamento'
  | 'servico'
  | 'exame'
  | 'material_medico'
  | 'higiene';

export interface UserProfile {
  id: string;
  email: string;
  username?: string; // Nome de utilizador / User para login
  nome: string;
  telefone?: string;
  whatsapp?: string;
  role: UserRole;
  departamento?: string; // Ex: MINSA - DNME, Inspecção da Saúde, etc.
  cargo?: string; // Cargo ou função do titular
  unidade_id?: string;
  status_aprovacao?: 'pendente' | 'aprovado' | 'rejeitado';
  nif?: string;
  avatar_url?: string;
  senha_provisoria?: string;
  ultima_redefinicao_senha?: string;
  auth_provider?: 'email' | 'google';
  termos_aceites?: boolean;
  data_aceitacao_termos?: string;
  versao_termos?: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyConsentRecord {
  id: string;
  usuario_id: string;
  usuario_email: string;
  usuario_nome?: string;
  versao_politica: string;
  termos_utilizacao: boolean;
  politica_privacidade: boolean;
  proteccao_dados: boolean;
  data_hora: string;
  ip_simulado?: string;
  user_agent?: string;
}

export interface HealthUnit {
  id: string;
  nome: string;
  slug: string;
  tipo: UnitType;
  descricao: string;
  logo_url: string;
  banner_url?: string;
  provincia: string;
  municipio: string;
  bairro: string;
  endereco_completo: string;
  latitude: number;
  longitude: number;
  telefone: string;
  whatsapp: string;
  email: string;
  senha_provisoria?: string;
  ultima_redefinicao_senha?: string;
  horario_funcionamento: string;
  aberto_agora: boolean;
  verificada: boolean;
  nif?: string; // Número de Identificação Fiscal (NIF)
  responsavel_nome?: string;
  certificado_institucional?: string; // Nº de Alvará Sanitário / Registo MINSA
  documento_minsa_nome?: string;
  documento_minsa_url?: string;
  documento_minsa_base64?: string;
  documento_minsa_data_emissao?: string;
  documento_minsa_validade?: string;
  
  // Subscription fields
  plano_tipo: PlanType;
  plano_periodicidade: PlanPeriodicity;
  plano_preco: number;
  plano_desconto: number;
  plano_data_inicio: string;
  plano_data_expiracao: string;
  plano_status: PlanStatus;
  metodo_pagamento?: PaymentMethod;
  referencia_pagamento?: string;
  comprovativo_pagamento_url?: string;
  comprovativo_pagamento_nome?: string;
  comprovativo_pagamento_base64?: string;
  comprovativo_pagamento_tipo?: 'pdf' | 'imagem';
  motivo_rejeicao?: string;
  
  destaque_visual: boolean;
  selo_premium: boolean;
  visualizacoes: number;
  total_pedidos: number;
  avaliacao: number;
  total_avaliacoes: number;
  distancia_km?: number; // Calculated on fly
  created_at: string;
  updated_at: string;
}

export interface ProductItem {
  id: string;
  unidade_id: string;
  nome: string;
  nome_generico?: string;
  descricao: string;
  categoria: ProductCategory;
  subcategoria?: string;
  preco: number; // Em Kwanzas (AOA)
  preco_promocional?: number;
  quantidade_stock: number;
  disponivel: boolean;
  requer_receita: boolean;
  dosagem?: string;
  forma_farmaceutica?: string;
  imagem_url?: string;
  codigo_barras?: string;
  fabricante?: string;
  data_validade?: string;
  visualizacoes: number;
  destaque: boolean;
  unidade_nome?: string;
  unidade_tipo?: UnitType;
  unidade_provincia?: string;
  unidade_municipio?: string;
  unidade_bairro?: string;
  distancia_km?: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceItem {
  id: string;
  unidade_id: string;
  nome: string;
  descricao: string;
  especialidade: string;
  preco: number;
  duracao_minutos: number;
  disponivel: boolean;
  unidade_nome?: string;
  unidade_tipo?: UnitType;
  unidade_provincia?: string;
  unidade_municipio?: string;
  unidade_bairro?: string;
  distancia_km?: number;
  created_at: string;
}

export interface ExamItem {
  id: string;
  unidade_id: string;
  nome: string;
  descricao: string;
  tipo_exame: 'laboratorial' | 'imagem' | 'cardiologico' | 'outro';
  preco: number;
  tempo_resultado_horas: number;
  preparacao_necessaria?: string;
  disponivel: boolean;
  unidade_nome?: string;
  unidade_tipo?: UnitType;
  unidade_provincia?: string;
  unidade_municipio?: string;
  unidade_bairro?: string;
  distancia_km?: number;
  created_at: string;
}

export interface MostSearchedItem {
  id: string;
  item_type: 'medicamento' | 'servico' | 'exame';
  nome: string;
  nome_generico?: string;
  descricao: string;
  categoria?: string;
  subcategoria?: string;
  preco: number;
  disponivel: boolean;
  quantidade_stock?: number;
  duracao_minutos?: number;
  tempo_resultado_horas?: number;
  visualizacoes: number;
  destaque?: boolean;
  unidade_id: string;
  unidade: HealthUnit;
  plano_tipo: PlanType;
  plano_limite_destaque: number; // 100 for avancado, 50 for medio, 10 for basico
  is_deposito: boolean;
  distancia_km?: number;
}

export interface CartItem {
  id: string;
  item_id: string;
  tipo_item?: ProductCategory;
  tipo?: ProductCategory;
  nome: string;
  preco: number;
  quantidade: number;
  subtotal?: number;
  unidade_id: string;
  unidade_nome: string;
  unidade_whatsapp?: string;
  unidade_telefone?: string;
  requer_receita?: boolean;
  imagem_url?: string;
}

export interface Order {
  id: string;
  codigo_pedido: string;
  paciente_id?: string;
  paciente_nome: string;
  paciente_telefone: string;
  paciente_whatsapp: string;
  paciente_email?: string;
  unidade_id: string;
  unidade_nome: string;
  unidade_whatsapp?: string;
  modalidade: DeliveryMode;
  endereco_entrega?: string;
  mensagem_unidade?: string;
  status: OrderStatus;
  subtotal: number;
  taxa_entrega: number;
  total: number;
  itens: CartItem[];
  receita_url?: string;
  avaliado?: boolean;
  avaliacao_estrelas?: number;
  avaliacao_comentario?: string;
  avaliacao_data?: string;
  created_at: string;
  updated_at: string;
}

export interface UnitReview {
  id: string;
  unidade_id: string;
  unidade_nome?: string;
  paciente_id?: string;
  paciente_nome: string;
  paciente_avatar?: string;
  pedido_id?: string;
  consulta_id?: string;
  estrelas: number; // 1 to 5
  comentario: string;
  tipo_atendimento: 'pedido' | 'consulta' | 'exame' | 'geral';
  created_at: string;
}

export interface SubscriptionPlanDefinition {
  id: PlanType;
  nome: string;
  descricao: string;
  preco_base_mensal: number;
  limite_produtos: number | 'ilimitado';
  produtos_destaque: number | 'ilimitado';
  limite_destaque?: number | 'ilimitado';
  recursos: string[];
  descontos: {
    mensal?: number;
    trimestral: number;
    semestral: number;
    anual: number;
  };
  destaque_badge?: string;
}

export interface PaymentTransaction {
  id: string;
  unidade_id: string;
  unidade_nome: string;
  nif?: string;
  responsavel_nome?: string;
  plano_tipo: PlanType;
  periodicidade: PlanPeriodicity;
  valor: number;
  desconto_aplicado: number;
  metodo: PaymentMethod;
  referencia_mcx?: string;
  telefone_express?: string;
  comprovativo_url?: string;
  comprovativo_nome?: string;
  comprovativo_base64?: string;
  comprovativo_tipo?: 'pdf' | 'imagem';
  documento_minsa_nome?: string;
  documento_minsa_url?: string;
  documento_minsa_base64?: string;
  status: PaymentStatus;
  data_pagamento: string;
  validado_por?: string;
  observacoes?: string;
}

export interface ActivityLog {
  id: string;
  acao: string;
  categoria: 'auth' | 'admin' | 'plano' | 'produto' | 'pedido' | 'seguranca' | 'avaliacao';
  usuario_id: string;
  usuario_nome: string;
  usuario_role: UserRole;
  detalhes: string;
  ip_address?: string;
  created_at: string;
}

export interface SystemConfig {
  nome_plataforma: string;
  subtitulo: string;
  logo_url: string;
  descricao_plataforma?: string;
  selo_conformidade_minsa?: string;
  selo_proteccao_dados?: string;
  telefone_suporte: string;
  email_suporte: string;
  whatsapp_suporte: string;
  endereco_institucional?: string;
  rotulo_metodos_pagamento?: string;
  metodo_pagamento_1?: string;
  metodo_pagamento_2?: string;
  linhas_emergencia_titulo?: string;
  linhas_emergencia_texto?: string;
  horario_operacao_nota?: string;
  copyright_texto?: string;
  disclaimer_saude?: string;
  multicaixa_express_numero: string;
  multicaixa_entidade: string;
  multicaixa_tag?: string;
  multicaixa_instrucao?: string;
  banco_nome: string;
  banco_titular: string;
  banco_iban: string;
  banco_swift: string;
  banco_tag?: string;
  canais_pagamento_titulo?: string;
  canais_pagamento_subtitulo?: string;
  taxa_entrega_padrao: number;
  precos_planos: {
    gratis?: number;
    basico: number;
    medio: number;
    avancado: number;
  };
  descontos_config: {
    trimestral: { gratis?: number; basico: number; medio: number; avancado: number };
    semestral: { gratis?: number; basico: number; medio: number; avancado: number };
    anual: { gratis?: number; basico: number; medio: number; avancado: number };
  };
  planos_detalhes?: SubscriptionPlanDefinition[];
}

export interface AIPrescriptionExtractedItem {
  name: string;
  category: 'medicamento' | 'exame' | 'servico';
  dosage?: string;
  quantity?: string;
  confidence: number;
  notes?: string;
  matched_product?: ProductItem;
}

export interface AIPrescriptionResult {
  extractedText: string;
  doctorInfo?: string;
  items: AIPrescriptionExtractedItem[];
  disclaimer: string;
  mode?: string;
}

export type OrderType = 'pedido_paciente' | 'pedido_abastecimento';

export type SupplyOrderStatus =
  | 'pendente'
  | 'aceite'
  | 'recusado'
  | 'em_preparacao'
  | 'enviado'
  | 'concluido'
  | 'cancelado';

export interface SupplyOrderItem {
  id: string;
  produto_id: string;
  nome: string;
  categoria?: string;
  quantidade_caixas: number;
  unidades_por_caixa?: number;
  preco_unitario_caixa: number;
  subtotal: number;
}

export interface SupplyOrder {
  id: string;
  codigo_pedido: string;
  tipo: 'pedido_abastecimento';
  unidade_compradora_id: string;
  unidade_compradora_nome: string;
  unidade_compradora_provincia?: string;
  unidade_compradora_telefone?: string;
  unidade_compradora_email?: string;
  deposito_fornecedor_id: string;
  deposito_fornecedor_nome: string;
  deposito_fornecedor_provincia?: string;
  deposito_fornecedor_telefone?: string;
  itens: SupplyOrderItem[];
  valor_total: number;
  notas?: string;
  status: SupplyOrderStatus;
  data_pedido: string;
  data_atualizacao?: string;
  motivo_recusa?: string;
}

export interface IndicatorMetric {
  id: string;
  titulo: string;
  valor_atual: number | string;
  valor_anterior: number | string;
  variacao_percentual: number;
  tipo_variacao: 'aumento' | 'reducao' | 'estavel';
  sentido_positivo: boolean; // se aumento é bom (ex: disponibilidade) ou mau (ex: falta de stock)
  sufixo?: string;
  prefixo?: string;
  descricao?: string;
  categoria_kpi: 'procura' | 'disponibilidade' | 'operacional' | 'regional';
}

export interface ProvinceMapData {
  id: string; // Ex: 'luanda', 'benguela', 'huambo'
  nome: string; // Ex: 'Luanda'
  total_pesquisas: number;
  total_pedidos: number;
  unidades_activas: number;
  farmacias_activas: number;
  hospitais_activos: number;
  depositos_activos: number;
  produtos_disponiveis: number;
  indice_disponibilidade: number; // 0 - 100%
  nivel_procura: 'baixo' | 'medio' | 'elevado' | 'muito_elevado'; // verde, amarelo, laranja, vermelho
  tendencia_procura_pct: number; // ex: +24% vs período anterior
  medicamentos_mais_procurados: { nome: string; pesquisas: number; disponibilidade_pct: number }[];
  servicos_mais_procurados: { nome: string; pesquisas: number }[];
  exames_mais_procurados: { nome: string; pesquisas: number }[];
}

export interface DrugHeatmapPoint {
  provincia: string;
  municipio?: string;
  medicamento: string;
  categoria_terapeutica: string;
  total_pesquisas: number;
  total_pedidos: number;
  intensidade: 'verde' | 'amarelo' | 'laranja' | 'vermelho';
  indice_procura: number; // 0 - 100
  crescimento_pct: number; // Comparação com período anterior (+/- %)
  nova_zona_procura: boolean;
}

export interface DrugAvailabilityPoint {
  provincia: string;
  medicamento: string;
  categoria_terapeutica: string;
  status: 'disponivel' | 'baixa_disponibilidade' | 'indisponivel' | 'sem_stock';
  unidades_com_stock: number;
  total_unidades_regiao: number;
  stock_total_estimado: number;
  preco_medio_aoa: number;
}

export interface InstitutionalAlert {
  id: string;
  tipo: 'aumento_repentino' | 'rotura_stock' | 'medicamento_sem_stock' | 'crescimento_continuo' | 'desequilibrio_regional';
  severidade: 'critico' | 'alerta' | 'informativo';
  titulo: string;
  descricao: string;
  medicamento?: string;
  provincia: string;
  municipio?: string;
  impacto_estimado?: string;
  data_detecao: string;
  acao_sugerida?: string;
}

export interface NationalRankingItem {
  posicao: number;
  nome: string;
  categoria?: string;
  regiao?: string;
  metrica_primaria: number | string;
  metrica_secundaria?: number | string;
  variacao_posicao?: number;
  indicador_status?: string;
}

export interface TemporalEvolutionPoint {
  data: string; // Ex: '2026-08-25' ou 'Semana 34' ou 'Ago/2026'
  pesquisas_totais: number;
  pesquisas_medicamentos: number;
  pesquisas_servicos: number;
  pesquisas_exames: number;
  pedidos_concluidos: number;
  indice_disponibilidade: number;
  [key: string]: any; // Para medicamentos ou províncias específicas
}

export interface InstitutionalAggregateData {
  periodo_selecionado: string;
  provincia_selecionada: string;
  categoria_selecionada: string;
  indicadores: IndicatorMetric[];
  provincias_mapa: ProvinceMapData[];
  alertas: InstitutionalAlert[];
  rankings: {
    medicamentos_procurados: NationalRankingItem[];
    servicos_procurados: NationalRankingItem[];
    exames_procurados: NationalRankingItem[];
    regioes_maior_procura: NationalRankingItem[];
    regioes_menor_disponibilidade: NationalRankingItem[];
    unidades_mais_pedidos: NationalRankingItem[];
    unidades_maior_taxa_conclusao: NationalRankingItem[];
  };
  evolucao_temporal: TemporalEvolutionPoint[];
}

export type LanguageCode = 'pt' | 'en' | 'fr' | 'es' | 'zh';

export type SponsorTier =
  | 'diamante'
  | 'ouro'
  | 'prata'
  | 'institucional'
  | 'estrategico'
  | 'tecnologico'
  | 'logistica';

export interface SponsorPartner {
  id: string;
  nome: string;
  categoria: string; // Ex: 'Patrocinador Oficial', 'Apoiante Institucional', 'Parceiro Estratégico'
  tier: SponsorTier;
  descricao: string;
  logo_url: string;
  website_url?: string;
  telefone?: string;
  email?: string;
  ativo: boolean; // Se o super admin activou para passar no carrossel
  em_destaque?: boolean;
  ordem: number;
  data_inicio?: string;
  data_fim?: string;
  created_at: string;
  updated_at?: string;
}

export type MinsaAnnouncementCategory =
  | 'alerta_sanitario'
  | 'circular_normativa'
  | 'recolha_lote'
  | 'farmacovigilancia'
  | 'directriz_clinica'
  | 'comunicado_geral';

export type MinsaAnnouncementPriority = 'normal' | 'alta' | 'critica_urgente';

export interface MinsaAnnouncementConfirmation {
  unidade_id: string;
  unidade_nome: string;
  data_leitura: string;
  responsavel: string;
}

export interface MinsaAnnouncement {
  id: string;
  numero_oficio: string;
  titulo: string;
  resumo: string;
  conteudo: string;
  categoria: MinsaAnnouncementCategory;
  prioridade: MinsaAnnouncementPriority;
  emissor: string;
  signatario: string;
  cargo_signatario?: string;
  data_publicacao: string;
  data_vigencia_fim?: string;
  ambito_territorial: string;
  publico_alvo: ('todas' | 'farmacia' | 'deposito' | 'hospital' | 'clinica' | 'laboratorio')[];
  anexo_nome?: string;
  anexo_tamanho?: string;
  anexo_url?: string;
  anexo_tipo?: string;
  confirmacoes_leitura: MinsaAnnouncementConfirmation[];
  criado_em: string;
}

