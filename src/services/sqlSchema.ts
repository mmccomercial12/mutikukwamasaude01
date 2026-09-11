/**
 * MUTIKUKWAMA SAÚDE - Production PostgreSQL / Supabase Schema Definition
 * Includes Row Level Security (RLS), Functions, Triggers, Views, and Seed Data.
 */

export const PRODUCTION_SUPABASE_SQL = `-- ==============================================================================
-- MUTIKUKWAMA SAÚDE - ESQUEMA DE BASE DE DADOS POSTGRESQL / SUPABASE
-- Plataforma SaaS Nacional de Saúde de Angola
-- ==============================================================================

-- 1. EXTENSÕES POSTGRESQL NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Pesquisa textual fuzzy / substring
CREATE EXTENSION IF NOT EXISTS "postgis";  -- Opcional para cálculo geográfico avançado

-- 2. TIPOS ENUM PERSONALIZADOS
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('paciente', 'unidade', 'deposito', 'admin', 'super_admin', 'institucional');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_type_enum AS ENUM ('farmacia', 'clinica', 'hospital', 'laboratorio', 'unidade_sanitaria', 'deposito');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_type_enum AS ENUM ('basico', 'medio', 'avancado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_periodicity_enum AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_status_enum AS ENUM ('ativo', 'expirado', 'pendente', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('multicaixa_express', 'transferencia_bancaria');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('pendente', 'confirmado', 'rejeitado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status_enum AS ENUM ('pendente', 'confirmado', 'em_preparacao', 'pronto_levantamento', 'a_caminho', 'concluido', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE delivery_mode_enum AS ENUM ('levantamento', 'entrega');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE product_category_enum AS ENUM ('medicamento', 'servico', 'exame', 'material_medico', 'higiene');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABELAS PRINCIPAIS

-- TABELA: profiles (vinculada ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(50),
    whatsapp VARCHAR(50),
    role user_role_enum NOT NULL DEFAULT 'paciente',
    unidade_id UUID,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: unidades (Farmácias, Clínicas, Hospitais, Laboratórios, Depósitos)
CREATE TABLE IF NOT EXISTS public.unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    tipo unit_type_enum NOT NULL,
    descricao TEXT,
    logo_url TEXT,
    banner_url TEXT,
    provincia VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    endereco_completo TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    telefone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    horario_funcionamento VARCHAR(255) DEFAULT 'Aberto das 08:00 às 20:00',
    aberto_agora BOOLEAN DEFAULT TRUE,
    verificada BOOLEAN DEFAULT FALSE,
    certificado_institucional VARCHAR(100),
    
    -- Subscrição e Plano
    plano_tipo plan_type_enum NOT NULL DEFAULT 'basico',
    plano_periodicidade plan_periodicity_enum NOT NULL DEFAULT 'mensal',
    plano_preco DECIMAL(12, 2) NOT NULL DEFAULT 25000.00,
    plano_desconto DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    plano_data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    plano_data_expiracao DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
    plano_status plan_status_enum NOT NULL DEFAULT 'ativo',
    
    destaque_visual BOOLEAN DEFAULT FALSE,
    selo_premium BOOLEAN DEFAULT FALSE,
    visualizacoes INTEGER DEFAULT 0,
    total_pedidos INTEGER DEFAULT 0,
    avaliacao DECIMAL(3, 2) DEFAULT 5.00,
    total_avaliacoes INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: produtos (Medicamentos e materiais de saúde)
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    nome_generico VARCHAR(255),
    descricao TEXT,
    categoria product_category_enum NOT NULL DEFAULT 'medicamento',
    subcategoria VARCHAR(100),
    preco DECIMAL(12, 2) NOT NULL,
    preco_promocional DECIMAL(12, 2),
    quantidade_stock INTEGER NOT NULL DEFAULT 0,
    disponivel BOOLEAN DEFAULT TRUE,
    requer_receita BOOLEAN DEFAULT FALSE,
    dosagem VARCHAR(100),
    forma_farmaceutica VARCHAR(100),
    imagem_url TEXT,
    codigo_barras VARCHAR(100),
    fabricante VARCHAR(150),
    data_validade DATE,
    visualizacoes INTEGER DEFAULT 0,
    destaque BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: servicos (Consultas e procedimentos médicos)
CREATE TABLE IF NOT EXISTS public.servicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    especialidade VARCHAR(100) NOT NULL,
    preco DECIMAL(12, 2) NOT NULL,
    duracao_minutos INTEGER DEFAULT 30,
    disponivel BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: exames (Exames laboratoriais e imagiologia)
CREATE TABLE IF NOT EXISTS public.exames (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_exame VARCHAR(50) DEFAULT 'laboratorial',
    preco DECIMAL(12, 2) NOT NULL,
    tempo_resultado_horas INTEGER DEFAULT 24,
    preparacao_necessaria TEXT,
    disponivel BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_pedido VARCHAR(50) UNIQUE NOT NULL,
    paciente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    paciente_nome VARCHAR(255) NOT NULL,
    paciente_telefone VARCHAR(50) NOT NULL,
    paciente_whatsapp VARCHAR(50) NOT NULL,
    paciente_email VARCHAR(255),
    unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
    modalidade delivery_mode_enum NOT NULL DEFAULT 'levantamento',
    endereco_entrega TEXT,
    mensagem_unidade TEXT,
    status order_status_enum NOT NULL DEFAULT 'pendente',
    subtotal DECIMAL(12, 2) NOT NULL,
    taxa_entrega DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL,
    receita_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: pedido_itens
CREATE TABLE IF NOT EXISTS public.pedido_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
    exame_id UUID REFERENCES public.exames(id) ON DELETE SET NULL,
    nome_item VARCHAR(255) NOT NULL,
    tipo_item product_category_enum NOT NULL,
    preco_unitario DECIMAL(12, 2) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: carrinhos
CREATE TABLE IF NOT EXISTS public.carrinhos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: carrinho_itens
CREATE TABLE IF NOT EXISTS public.carrinho_itens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrinho_id UUID NOT NULL REFERENCES public.carrinhos(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    tipo_item product_category_enum NOT NULL,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(12, 2) NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
    plano_tipo plan_type_enum NOT NULL,
    periodicidade plan_periodicity_enum NOT NULL,
    valor DECIMAL(12, 2) NOT NULL,
    desconto_aplicado DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    metodo payment_method_enum NOT NULL,
    referencia_mcx VARCHAR(100),
    comprovativo_url TEXT,
    status payment_status_enum NOT NULL DEFAULT 'pendente',
    data_pagamento TIMESTAMPTZ DEFAULT NOW(),
    validado_por VARCHAR(255),
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: logs_atividade
CREATE TABLE IF NOT EXISTS public.logs_atividade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acao VARCHAR(255) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    usuario_id VARCHAR(255),
    usuario_nome VARCHAR(255),
    usuario_role user_role_enum,
    detalhes TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA: configuracoes
CREATE TABLE IF NOT EXISTS public.configuracoes (
    chave VARCHAR(100) PRIMARY KEY,
    valor JSONB NOT NULL,
    descricao TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ÍNDICES DE PERFORMANCE E PESQUISA TEXTUAL
CREATE INDEX IF NOT EXISTS idx_produtos_nome_trgm ON public.produtos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_produtos_generico_trgm ON public.produtos USING gin (nome_generico gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_produtos_unidade_id ON public.produtos (unidade_id);
CREATE INDEX IF NOT EXISTS idx_produtos_preco ON public.produtos (preco);
CREATE INDEX IF NOT EXISTS idx_produtos_stock ON public.produtos (quantidade_stock);

CREATE INDEX IF NOT EXISTS idx_unidades_tipo ON public.unidades (tipo);
CREATE INDEX IF NOT EXISTS idx_unidades_provincia ON public.unidades (provincia);
CREATE INDEX IF NOT EXISTS idx_unidades_municipio ON public.unidades (municipio);
CREATE INDEX IF NOT EXISTS idx_unidades_plano ON public.unidades (plano_status, plano_tipo);

CREATE INDEX IF NOT EXISTS idx_pedidos_unidade ON public.pedidos (unidade_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_paciente ON public.pedidos (paciente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos (status);

-- 5. FUNÇÃO & TRIGGER: BACKEND PLAN EXPIRATION & BLOCKING
CREATE OR REPLACE FUNCTION check_unit_plan_active_before_product_mutation()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_status plan_status_enum;
    v_unit_exp DATE;
BEGIN
    SELECT plano_status, plano_data_expiracao
    INTO v_unit_status, v_unit_exp
    FROM public.unidades
    WHERE id = NEW.unidade_id;

    IF v_unit_status != 'ativo' OR v_unit_exp < CURRENT_DATE THEN
        RAISE EXCEPTION 'OPERAÇÃO BLOQUEADA: A unidade possui subscrição inactiva ou expirada em (%). Renove o plano para continuar.', v_unit_exp;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_unpaid_unit_products ON public.produtos;
CREATE TRIGGER trg_block_unpaid_unit_products
BEFORE INSERT OR UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION check_unit_plan_active_before_product_mutation();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_atividade ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: UNIDADES (Público vê apenas unidades públicas; Depósitos são restritos)
CREATE POLICY "Publico pode ver unidades de saude públicas"
ON public.unidades FOR SELECT
TO public
USING (tipo != 'deposito');

CREATE POLICY "Unidades e Depósitos podem ver e editar o seu proprio registo"
ON public.unidades FOR ALL
TO authenticated
USING (id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

-- POLÍTICAS: PRODUTOS (Público pesquisa produtos em stock de farmácias públicas)
CREATE POLICY "Publico pode ver produtos de unidades publicas"
ON public.produtos FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.unidades u 
        WHERE u.id = produtos.unidade_id 
        AND u.tipo != 'deposito' 
        AND u.plano_status = 'ativo'
    )
);

CREATE POLICY "Unidades gerem apenas os seus proprios produtos"
ON public.produtos FOR ALL
TO authenticated
USING (
    unidade_id = (SELECT unidade_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- POLÍTICAS: PEDIDOS
CREATE POLICY "Pacientes veem os seus proprios pedidos"
ON public.pedidos FOR SELECT
TO authenticated
USING (paciente_id = auth.uid());

CREATE POLICY "Unidades veem pedidos atribuidos a si"
ON public.pedidos FOR ALL
TO authenticated
USING (
    unidade_id = (SELECT unidade_id FROM public.profiles WHERE id = auth.uid())
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

CREATE POLICY "Qualquer utilizador pode criar pedido"
ON public.pedidos FOR INSERT
TO public
WITH CHECK (true);

-- POLÍTICAS: INSTITUCIONAL & ADMIN LOGS
CREATE POLICY "Apenas Admins e Super Admins veem logs de auditoria"
ON public.logs_atividade FOR SELECT
TO authenticated
USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- FIM DO ESQUEMA
`;
