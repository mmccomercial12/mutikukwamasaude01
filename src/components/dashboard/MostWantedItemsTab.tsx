import React, { useState, useMemo } from 'react';
import {
  Flame,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  Download,
  Filter,
  PlusCircle,
  Eye,
  ShieldCheck,
  Stethoscope,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';
import { HealthUnit, ProductItem } from '../../types';
import { MOST_WANTED_HEALTH_ITEMS, MostWantedItem } from '../../data/mostWantedItems';

interface MostWantedItemsTabProps {
  unit: HealthUnit | null;
  isDepot: boolean;
  unitProducts: ProductItem[];
  onOpenAddProduct: (prefill?: {
    nome?: string;
    nome_generico?: string;
    categoria?: 'medicamento' | 'servico' | 'exame' | 'material_medico' | 'higiene';
    dosagem?: string;
    preco?: number;
    descricao?: string;
  }) => void;
  onNavigateToTab: (tab: any, searchQuery?: string) => void;
  onOpenPaymentModal: () => void;
}

export const MostWantedItemsTab: React.FC<MostWantedItemsTabProps> = ({
  unit,
  isDepot,
  unitProducts,
  onOpenAddProduct,
  onNavigateToTab,
  onOpenPaymentModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'medicamento' | 'servico' | 'exame' | 'material_medico' | 'b2b_lote'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'opportunity'>('all');
  const [sortBy, setSortBy] = useState<'rank' | 'searches' | 'price'>('rank');

  // Plan Limit calculation as strictly mandated:
  // Avançado -> 100
  // Médio -> 50
  // Básico -> 10
  const allowedCount = useMemo(() => {
    const plan = unit?.plano_tipo;
    if (plan === 'avancado') return 100;
    if (plan === 'medio') return 50;
    return 10; // 'basico' or default
  }, [unit?.plano_tipo]);

  const planName = useMemo(() => {
    if (unit?.plano_tipo === 'avancado') return 'Plano Avançado';
    if (unit?.plano_tipo === 'medio') return 'Plano Médio';
    return 'Plano Básico';
  }, [unit?.plano_tipo]);

  // Map each most wanted item to check stock availability in the current unit/depot
  const itemsWithStockStatus = useMemo(() => {
    return MOST_WANTED_HEALTH_ITEMS.map((item) => {
      const q = item.nome.toLowerCase();
      const genericQ = item.nome_generico?.toLowerCase();

      // Find any matches in the unit's inventory
      const matchedProducts = unitProducts.filter((p) => {
        const pName = p.nome.toLowerCase();
        const pGen = p.nome_generico?.toLowerCase();

        // Exact or strong substring matching
        if (pName.includes(q) || q.includes(pName)) return true;
        if (genericQ && pGen && (pGen.includes(genericQ) || genericQ.includes(pGen))) return true;
        if (genericQ && pName.includes(genericQ)) return true;

        // Check key keywords (e.g. "Coartem", "Paracetamol", "Ibuprofeno", "Ceftriaxona")
        const primaryKeyword = item.nome.split(' ')[0].toLowerCase();
        if (primaryKeyword.length > 4 && pName.includes(primaryKeyword)) return true;

        return false;
      });

      const totalStock = matchedProducts.reduce((acc, curr) => acc + (curr.quantidade_stock || 0), 0);
      const hasStock = matchedProducts.length > 0 && totalStock > 0;
      const hasItem = matchedProducts.length > 0;

      return {
        ...item,
        matchedProduct: matchedProducts[0] || null,
        totalStock,
        hasStock,
        hasItem,
        status: hasStock ? (totalStock <= 5 ? 'critical_stock' : 'in_stock') : 'opportunity',
      };
    });
  }, [unitProducts]);

  // Visible items allowed by plan
  const visibleAllowedItems = useMemo(() => {
    return itemsWithStockStatus.slice(0, allowedCount);
  }, [itemsWithStockStatus, allowedCount]);

  // Locked items beyond current plan limit
  const lockedItems = useMemo(() => {
    return itemsWithStockStatus.slice(allowedCount, 100);
  }, [itemsWithStockStatus, allowedCount]);

  // Filtered visible items
  const filteredVisibleItems = useMemo(() => {
    return visibleAllowedItems.filter((item) => {
      // Type filter
      if (typeFilter !== 'all' && item.tipo !== typeFilter) {
        return false;
      }

      // Stock filter
      if (stockFilter === 'in_stock' && !item.hasStock) {
        return false;
      }
      if (stockFilter === 'opportunity' && item.hasStock) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inName = item.nome.toLowerCase().includes(q);
        const inGen = item.nome_generico?.toLowerCase().includes(q);
        const inCat = item.categoria.toLowerCase().includes(q);
        const inDesc = item.descricao_breve.toLowerCase().includes(q);
        if (!inName && !inGen && !inCat && !inDesc) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'searches') return b.buscas_mensais - a.buscas_mensais;
      if (sortBy === 'price') return b.preco_medio_aoa - a.preco_medio_aoa;
      return a.posicao - b.posicao;
    });
  }, [visibleAllowedItems, typeFilter, stockFilter, searchQuery, sortBy]);

  // Analytics KPIs for this unit
  const inStockCount = useMemo(() => {
    return visibleAllowedItems.filter((i) => i.hasStock).length;
  }, [visibleAllowedItems]);

  const opportunityCount = useMemo(() => {
    return visibleAllowedItems.length - inStockCount;
  }, [visibleAllowedItems, inStockCount]);

  const coveragePercent = useMemo(() => {
    if (visibleAllowedItems.length === 0) return 0;
    return Math.round((inStockCount / visibleAllowedItems.length) * 100);
  }, [inStockCount, visibleAllowedItems.length]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Posição',
      'Nome do Artigo',
      'Nome Genérico',
      'Tipo',
      'Categoria',
      'Dosagem / Apresentação',
      'Buscas Mensais Estimadas (Angola)',
      'Nível de Procura',
      'Preço Médio (AOA)',
      'Estado no Seu Stock',
      'Quantidade no Seu Stock',
    ];

    const rows = visibleAllowedItems.map((item) => [
      `#${item.posicao}`,
      `"${item.nome.replace(/"/g, '""')}"`,
      `"${(item.nome_generico || '').replace(/"/g, '""')}"`,
      item.tipo,
      `"${item.categoria.replace(/"/g, '""')}"`,
      `"${item.dosagem_apresentacao.replace(/"/g, '""')}"`,
      item.buscas_mensais,
      item.demanda_nivel,
      item.preco_medio_aoa,
      item.hasStock ? 'Em Stock' : 'Oportunidade (Sem Stock)',
      item.totalStock,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mais_procurados_${unit?.slug || 'unidade'}_top${allowedCount}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* HEADER & PLAN BADGE BANNER */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#123B7A] via-[#1a4a93] to-[#0c2854] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        {/* Ambient background decoration */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-[#00A878]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Radar de Demanda Nacional • Angola</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              Produtos & Serviços Mais Procurados
            </h2>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              Análise em tempo real dos artigos com maior volume de pesquisas, pedidos e necessidade clínica em Angola.
              Identifique faltas no seu catálogo e abasteça o que os utentes e farmácias estão activamente a procurar.
            </p>
          </div>

          {/* Plan Limit Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex flex-col items-center sm:items-start gap-3 shrink-0 lg:min-w-[280px]">
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300">
                Seu Plano Ativo
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                {planName}
              </span>
            </div>

            <div className="w-full">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Top {allowedCount}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  {allowedCount === 100
                    ? 'Artigos (Acesso Total)'
                    : allowedCount === 50
                    ? 'Artigos (Plano Médio)'
                    : 'Artigos (Plano Básico)'}
                </span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(allowedCount / 100) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-300 mt-1 font-mono">
                <span>Básico: 10</span>
                <span>Médio: 50</span>
                <span>Avançado: 100</span>
              </div>
            </div>

            {allowedCount < 100 && (
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="w-full mt-1 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                <span>Desbloquear Top {allowedCount === 10 ? '50 / 100' : '100'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* UPGRADE TEASER ALERT (IF NOT ON ADVANCED PLAN) */}
      {/* ========================================================================= */}
      {allowedCount < 100 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-xs uppercase tracking-wider text-amber-900">
                {allowedCount === 10
                  ? 'Limite do Plano Básico: Exibindo os 10 primeiros artigos'
                  : 'Limite do Plano Médio: Exibindo os 50 primeiros artigos'}
              </div>
              <p className="text-xs text-amber-800 font-medium">
                {allowedCount === 10
                  ? 'Subscreva o Plano Médio (Top 50) ou o Plano Avançado (Top 100 completo) para aceder a todo o radar de medicamentos e lotes hospitalares em falta no mercado.'
                  : 'Subscreva o Plano Avançado para desbloquear todos os 100 artigos com análises completas e prioridade nos lotes grossistas.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenPaymentModal}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <span>Fazer Upgrade Agora</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KPIS SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Artigos Monitorizados</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-[#123B7A] mt-1">
            Top {allowedCount} <span className="text-xs text-slate-400">/ 100</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            {isDepot ? 'Para Depósitos Grossistas' : 'Para Farmácias e Clínicas'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Já no Seu Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {inStockCount} <span className="text-xs text-slate-400">artigos</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Prontos para venda na unidade
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Oportunidades em Falta</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 mt-1">
            {opportunityCount} <span className="text-xs text-slate-400">em falta</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Alta procura sem stock na sua unidade
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Cobertura da Procura</span>
            <TrendingUp className="w-4 h-4 text-[#00A878]" />
          </div>
          <div className="text-xl font-black text-[#00A878] mt-1">
            {coveragePercent}%
          </div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">
            Do Top {allowedCount} nacional
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTERS & SEARCH CONTROL BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por medicamento, princípio ativo, serviço ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A878] focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A878] font-bold text-slate-700 cursor-pointer"
              >
                <option value="rank">Ordenar por Posição (#1 - #{allowedCount})</option>
                <option value="searches">Maior Volume de Buscas</option>
                <option value="price">Maior Preço Médio</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Exportar dados do Top mais procurados em folha CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Category Type Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-[#123B7A] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({visibleAllowedItems.length})
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('medicamento')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'medicamento'
                  ? 'bg-[#00A878] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Medicamentos</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('servico')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'servico'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Serviços Médicos</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('exame')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'exame'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Exames & Diagnóstico</span>
            </button>

            <button
              type="button"
              onClick={() => setTypeFilter('b2b_lote')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                typeFilter === 'b2b_lote'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lotes Grossistas B2B</span>
            </button>
          </div>

          {/* Stock Filter Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Stock da Unidade:
            </span>
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Em Stock ({inStockCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('opportunity')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 ${
                stockFilter === 'opportunity'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Oportunidades ({opportunityCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRODUCTS & SERVICES LIST TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#123B7A] uppercase tracking-wider">
              Listagem Top {allowedCount} ({filteredVisibleItems.length} exibidos)
            </span>
            <span className="text-xs text-slate-400">
              • Ordenados por procura e procura agregada nacional
            </span>
          </div>

          <span className="text-xs font-mono text-slate-500">
            Atualizado Hoje com Dados de Angola
          </span>
        </div>

        {filteredVisibleItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-3">
            <Flame className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">
              Nenhum produto ou serviço encontrado com os filtros actuais.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStockFilter('all');
              }}
              className="text-[#00A878] font-bold hover:underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black tracking-wider bg-slate-50/70">
                  <th className="py-3.5 pl-4 w-14 text-center">Rank</th>
                  <th className="py-3.5 pl-2">Medicamento / Serviço / Lote</th>
                  <th className="py-3.5">Categoria & Apresentação</th>
                  <th className="py-3.5 text-center">Procura Mensal</th>
                  <th className="py-3.5">Preço Médio Estimado</th>
                  <th className="py-3.5 text-center">No Seu Catálogo?</th>
                  <th className="py-3.5 pr-4 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisibleItems.map((item) => (
                  <tr
                    key={item.posicao}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Rank Badge */}
                    <td className="py-4 pl-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
                          item.posicao === 1
                            ? 'bg-amber-400 text-slate-950 shadow-xs'
                            : item.posicao === 2
                            ? 'bg-slate-300 text-slate-900 shadow-xs'
                            : item.posicao === 3
                            ? 'bg-amber-700 text-white shadow-xs'
                            : item.posicao <= 10
                            ? 'bg-blue-50 text-blue-900 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{item.posicao}
                      </span>
                    </td>

                    {/* Name & Generic */}
                    <td className="py-4 pl-2 max-w-[260px]">
                      <div className="font-black text-[#123B7A] text-xs flex items-center gap-1.5">
                        <span>{item.nome}</span>
                        {item.tipo === 'b2b_lote' && (
                          <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 text-[9px] font-black uppercase tracking-wider border border-amber-300 shrink-0">
                            B2B
                          </span>
                        )}
                      </div>
                      {item.nome_generico && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          {item.nome_generico}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-normal">
                        {item.descricao_breve}
                      </p>
                    </td>

                    {/* Category & Presentation */}
                    <td className="py-4">
                      <div className="font-bold text-slate-800 text-xs">
                        {item.categoria}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.dosagem_apresentacao}
                      </div>
                    </td>

                    {/* Monthly Searches & Trend */}
                    <td className="py-4 text-center">
                      <div className="font-black text-slate-900 text-xs font-mono">
                        {item.buscas_mensais.toLocaleString('pt-PT')}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{item.tendencia_pct}%</span>
                      </div>
                    </td>

                    {/* Average Price */}
                    <td className="py-4">
                      <div className="font-black text-[#00A878] text-xs">
                        {item.preco_medio_aoa.toLocaleString('pt-PT')} AOA
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.tipo === 'b2b_lote' ? 'Preço Grossista' : 'Preço Retalho Médio'}
                      </div>
                    </td>

                    {/* Status in Unit Inventory */}
                    <td className="py-4 text-center">
                      {item.hasStock ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Em Stock ({item.totalStock} un.)</span>
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Oportunidade (0 un.)</span>
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 pr-4 text-right">
                      {item.hasStock ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('stock', item.nome)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Ver este medicamento no seu inventário"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Ver no Stock</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Add Product Button */}
                          <button
                            type="button"
                            onClick={() => {
                              onOpenAddProduct({
                                nome: item.nome,
                                nome_generico: item.nome_generico,
                                categoria: item.tipo === 'servico' ? 'servico' : item.tipo === 'exame' ? 'exame' : 'medicamento',
                                dosagem: item.dosagem_apresentacao,
                                preco: item.preco_medio_aoa,
                                descricao: item.descricao_breve,
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-bold text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            title="Adicionar ao inventário da unidade com dados preenchidos"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>{isDepot ? 'Cadastrar Lote' : 'Cadastrar'}</span>
                          </button>

                          {/* For normal units: Order from wholesale depot B2B */}
                          {!isDepot && item.tipo !== 'servico' && item.tipo !== 'exame' && (
                            <button
                              type="button"
                              onClick={() => onNavigateToTab('b2b-deposito', item.nome.split(' ')[0])}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer"
                              title="Procurar este medicamento nos depósitos grossistas B2B"
                            >
                              <Layers className="w-3 h-3 text-amber-600" />
                              <span className="hidden sm:inline">Depósitos</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* LOCKED ROWS TEASER (FOR BASIC AND MEDIUM PLANS) */}
      {/* ========================================================================= */}
      {lockedItems.length > 0 && (
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-50 to-slate-100 border-2 border-dashed border-slate-300 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Mais {lockedItems.length} Produtos de Alta Demanda Bloqueados
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              No seu {planName}, tem acesso ao <strong>Top {allowedCount}</strong>.
              {allowedCount === 10 ? (
                <>
                  Faça upgrade para o <strong>Plano Médio</strong> para aceder a <strong>50 artigos</strong>, ou para o <strong>Plano Avançado</strong> para ver os <strong>100 artigos completos</strong>.
                </>
              ) : (
                <>
                  Faça upgrade para o <strong>Plano Avançado</strong> para desbloquear a totalidade dos <strong>100 produtos mais procurados</strong> do mercado angolano.
                </>
              )}
            </p>
          </div>

          {/* Sample Teaser Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2">
            {lockedItems.slice(0, 3).map((item) => (
              <div
                key={item.posicao}
                className="p-3 bg-white/80 rounded-xl border border-slate-200 text-left opacity-70 filter blur-[0.4px] select-none pointer-events-none"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-black">
                  <span>RANK #{item.posicao}</span>
                  <Lock className="w-3 h-3 text-amber-600" />
                </div>
                <div className="font-bold text-xs text-slate-800 mt-1 truncate">
                  {item.nome}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {item.categoria}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenPaymentModal}
              className="px-6 py-3 rounded-2xl bg-[#123B7A] hover:bg-[#00A878] text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Desbloquear Catálogo Completo (Top 100)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
