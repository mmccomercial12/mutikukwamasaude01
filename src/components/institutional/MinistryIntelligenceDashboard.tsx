import React, { useState, useMemo } from 'react';
import {
  Landmark,
  ShieldCheck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  MapPin,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Pill,
  Stethoscope,
  Microscope,
  Building2,
  Users,
  Activity,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  BarChart3,
  PieChart as PieIcon,
  Flame,
  Globe,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  Car,
  Compass,
  ExternalLink,
  Phone,
  Megaphone,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { supabaseData } from '../../services/supabase';
import { PROVINCES_ANGOLA } from '../../services/mockData';
import {
  InstitutionalAggregateData,
  IndicatorMetric,
  ProvinceMapData,
  DrugHeatmapPoint,
  DrugAvailabilityPoint,
  InstitutionalAlert,
  NationalRankingItem,
  HealthUnit,
} from '../../types';
import { UnitRouteMapModal } from '../units/UnitRouteMapModal';
import { UnitProfileModal } from '../units/UnitProfileModal';
import { MinsaDocumentModal } from '../minsa/MinsaDocumentModal';
import { ActiveUnitsInstitutionalView } from './ActiveUnitsInstitutionalView';
import { MinsaAnnouncementsInstitutionalView } from './MinsaAnnouncementsInstitutionalView';

interface MinistryIntelligenceDashboardProps {
  onBackToHome?: () => void;
}

export const MinistryIntelligenceDashboard: React.FC<MinistryIntelligenceDashboardProps> = ({
  onBackToHome,
}) => {
  // Global Filters
  const [selectedPeriod, setSelectedPeriod] = useState<
    'today' | '7days' | '30days' | '3months' | '6months' | '12months' | 'custom'
  >('30days');
  const [customStartDate, setCustomStartDate] = useState('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-02');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTherapeuticCategory, setSelectedTherapeuticCategory] = useState<string>('all');

  // Interactive View Modes & Tabs
  const [activeTab, setActiveTab] = useState<
    'indicadores' | 'mapa_nacional' | 'unidades_ativas' | 'comunicados' | 'heatmap_farmacos' | 'disponibilidade' | 'alertas' | 'rankings' | 'evolucao' | 'relatorios'
  >('indicadores');

  // KPI Category Filter
  const [kpiFilter, setKpiFilter] = useState<'all' | 'procura' | 'disponibilidade' | 'operacional' | 'regional'>('all');

  // Map state
  const [mapMode, setMapMode] = useState<'procura' | 'disponibilidade' | 'unidades' | 'tendencia'>('procura');
  const [selectedProvinceModal, setSelectedProvinceModal] = useState<ProvinceMapData | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);

  // Health Units & Route Navigation State
  const [routeModalUnit, setRouteModalUnit] = useState<HealthUnit | null>(null);
  const [profileModalUnit, setProfileModalUnit] = useState<HealthUnit | null>(null);
  const [minsaDocModalUnit, setMinsaDocModalUnit] = useState<HealthUnit | null>(null);
  const [unitSearchQuery, setUnitSearchQuery] = useState<string>('');
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>('all');

  // All health units
  const allHealthUnits = useMemo(() => {
    return supabaseData.getAllUnits();
  }, []);

  // Health units filtered by province (or all if none selected)
  const provinceUnits = useMemo(() => {
    if (!selectedProvinceModal) return allHealthUnits;
    const provNameNorm = selectedProvinceModal.nome.toLowerCase().trim();
    return allHealthUnits.filter(
      (u) => u.provincia.toLowerCase().trim() === provNameNorm
    );
  }, [allHealthUnits, selectedProvinceModal]);

  // Units filtered by search and type
  const filteredProvUnits = useMemo(() => {
    return provinceUnits.filter((u) => {
      const matchesType = unitTypeFilter === 'all' || u.tipo === unitTypeFilter;
      const q = unitSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.nome.toLowerCase().includes(q) ||
        u.municipio.toLowerCase().includes(q) ||
        u.bairro.toLowerCase().includes(q) ||
        u.endereco_completo.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [provinceUnits, unitTypeFilter, unitSearchQuery]);

  const handleSelectProvinceOnMap = (prov: ProvinceMapData) => {
    setSelectedProvinceModal(prov);
    setTimeout(() => {
      const el = document.getElementById('unidades-provincia-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  };

  // Heatmap Drug Search
  const [heatmapDrugQuery, setHeatmapDrugQuery] = useState<string>('Coartem');
  const [availabilityDrugQuery, setAvailabilityDrugQuery] = useState<string>('Paracetamol 500mg');

  // Ranking active tab
  const [rankingTab, setRankingTab] = useState<
    'medicamentos' | 'servicos' | 'exames' | 'regioes_procura' | 'regioes_disponibilidade' | 'unidades_pedidos' | 'unidades_conclusao'
  >('medicamentos');

  // Temporal graph view mode
  const [temporalViewType, setTemporalViewType] = useState<'grafico' | 'tabela'>('grafico');

  // Fetch Institutional Analytics
  const analyticsData: InstitutionalAggregateData = useMemo(() => {
    return supabaseData.getInstitutionalData({
      period: selectedPeriod,
      customStartDate,
      customEndDate,
      province: selectedProvince,
      category: selectedCategory,
      therapeuticCategory: selectedTherapeuticCategory !== 'all' ? selectedTherapeuticCategory : undefined,
    });
  }, [selectedPeriod, customStartDate, customEndDate, selectedProvince, selectedCategory, selectedTherapeuticCategory]);

  // Drug Heatmap points
  const drugHeatmap = useMemo(() => {
    return supabaseData.getDrugHeatmap(heatmapDrugQuery);
  }, [heatmapDrugQuery]);

  // Drug Availability points
  const drugAvailability = useMemo(() => {
    return supabaseData.getDrugAvailabilityMap(availabilityDrugQuery);
  }, [availabilityDrugQuery]);

  // Filtered KPIs
  const filteredKpis = useMemo(() => {
    if (kpiFilter === 'all') return analyticsData.indicadores;
    return analyticsData.indicadores.filter((k) => k.categoria_kpi === kpiFilter);
  }, [analyticsData.indicadores, kpiFilter]);

  // Quick Preset Drugs for Heatmap
  const presetDrugs = [
    'Coartem (Antimalárico)',
    'Paracetamol 500mg',
    'Ibuprofeno 400mg',
    'Amoxicilina 500mg',
    'Ciprofloxacina 500mg',
    'Insulina Regular',
    'Omeprazol 20mg',
    'Metformina 850mg',
  ];

  // Export to Excel (.XLSX)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Indicadores
    const kpiRows = analyticsData.indicadores.map((kpi, idx) => ({
      N: idx + 1,
      Indicador: kpi.titulo,
      'Valor Atual': kpi.valor_atual,
      'Valor Anterior': kpi.valor_anterior,
      'Variação %': `${kpi.variacao_percentual > 0 ? '+' : ''}${kpi.variacao_percentual}%`,
      Categoria: kpi.categoria_kpi.toUpperCase(),
      Descrição: kpi.descricao,
    }));
    const wsKpis = XLSX.utils.json_to_sheet(kpiRows);
    XLSX.utils.book_append_sheet(wb, wsKpis, '20 Indicadores Oficiais');

    // Sheet 2: Províncias
    const provRows = analyticsData.provincias_mapa.map((p) => ({
      Província: p.nome,
      'Total Pesquisas': p.total_pesquisas,
      'Total Pedidos': p.total_pedidos,
      'Unidades Ativas': p.unidades_activas,
      'Farmácias Ativas': p.farmacias_activas,
      'Hospitais Ativos': p.hospitais_activos,
      'Produtos com Stock': p.produtos_disponiveis,
      'Índice Disponibilidade %': `${p.indice_disponibilidade}%`,
      'Nível de Procura': p.nivel_procura.toUpperCase(),
      'Tendência %': `${p.tendencia_procura_pct}%`,
    }));
    const wsProv = XLSX.utils.json_to_sheet(provRows);
    XLSX.utils.book_append_sheet(wb, wsProv, 'Dados Provinciais');

    // Sheet 3: Alertas
    const alertRows = analyticsData.alertas.map((a) => ({
      Severidade: a.severidade.toUpperCase(),
      Título: a.titulo,
      Província: a.provincia,
      Medicamento: a.medicamento || 'N/A',
      Descrição: a.descricao,
      'Ação Sugerida': a.acao_sugerida || 'N/A',
      Data: new Date(a.data_detecao).toLocaleString('pt-PT'),
    }));
    const wsAlerts = XLSX.utils.json_to_sheet(alertRows);
    XLSX.utils.book_append_sheet(wb, wsAlerts, 'Alertas Epidemiológicos');

    XLSX.writeFile(
      wb,
      `MINSA_MUTIKUKWAMA_Relatorio_${selectedPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const rows = [
      ['N', 'Indicador', 'Valor Atual', 'Valor Anterior', 'Variacao %', 'Categoria', 'Descricao'],
      ...analyticsData.indicadores.map((kpi, idx) => [
        idx + 1,
        `"${kpi.titulo}"`,
        `"${kpi.valor_atual}"`,
        `"${kpi.valor_anterior}"`,
        `"${kpi.variacao_percentual}%"`,
        `"${kpi.categoria_kpi}"`,
        `"${kpi.descricao}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MINSA_Indicadores_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print official document
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-800 pb-16">
      {/* Top National Header Bar */}
      <header className="bg-[#0B1E3B] text-white border-b border-[#1E3A66] sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* National Coat of Arms / MINSA Emblem */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8A317] via-[#D92525] to-[#0B1E3B] p-0.5 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0B1E3B] rounded-[10px] flex items-center justify-center">
                <Landmark className="w-6 h-6 text-[#E8A317]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#E8A317]/20 text-[#E8A317] border border-[#E8A317]/40 text-[10px] font-black uppercase tracking-wider">
                  República de Angola
                </span>
                <span className="text-xs font-bold text-slate-300 hidden sm:inline">
                  Ministério da Saúde (MINSA)
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                Centro Nacional de Inteligência e Análise do Ecossistema de Saúde
              </h1>
            </div>
          </div>

          {/* Top Actions: Anonymization Notice & Export */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#122B52] border border-[#234A85] rounded-lg text-xs text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Dados Agregados & Anonimizados (LPDS)</span>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
              title="Exportar Relatório em Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3A6B] hover:bg-[#254F8C] text-white border border-[#3262A8] rounded-lg text-xs font-bold transition cursor-pointer"
              title="Exportar Dados em CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A3A6B] hover:bg-[#254F8C] text-white border border-[#3262A8] rounded-lg text-xs font-bold transition cursor-pointer"
              title="Imprimir Relatório Oficial"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Filter & Control Command Center */}
      <section className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
            {/* Period Selector */}
            <div className="md:col-span-4 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0 ml-1.5" />
              <span className="text-xs font-bold text-slate-500 shrink-0">Período:</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="w-full bg-transparent text-xs font-bold text-[#0B1E3B] focus:outline-none cursor-pointer"
              >
                <option value="today">Hoje (Últimas 24h)</option>
                <option value="7days">Últimos 7 Dias</option>
                <option value="30days">Últimos 30 Dias (Padrão)</option>
                <option value="3months">Últimos 3 Meses</option>
                <option value="6months">Últimos 6 Meses</option>
                <option value="12months">Últimos 12 Meses (Anual)</option>
                <option value="custom">Período Personalizado</option>
              </select>
            </div>

            {/* Geographic Filter */}
            <div className="md:col-span-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <MapPin className="w-4 h-4 text-[#00A878] shrink-0 ml-1.5" />
              <span className="text-xs font-bold text-slate-500 shrink-0">Região:</span>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#0B1E3B] focus:outline-none cursor-pointer"
              >
                <option value="all">Angola (Nacional - 21 Províncias)</option>
                {PROVINCES_ANGOLA.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="md:col-span-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <Layers className="w-4 h-4 text-[#123B7A] shrink-0 ml-1.5" />
              <span className="text-xs font-bold text-slate-500 shrink-0">Segmento:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-[#0B1E3B] focus:outline-none cursor-pointer"
              >
                <option value="all">Todos os Segmentos</option>
                <option value="medicamentos">Medicamentos & Fármacos</option>
                <option value="servicos">Consultas & Serviços Clínicos</option>
                <option value="exames">Exames & Laboratórios</option>
              </select>
            </div>

            {/* Quick Status Pill */}
            <div className="md:col-span-2 flex items-center justify-end">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Vigilância Activa</span>
              </div>
            </div>
          </div>

          {/* Custom Date Range if 'custom' is selected */}
          {selectedPeriod === 'custom' && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 bg-slate-50 p-3 rounded-xl">
              <span className="text-xs font-bold text-slate-600">Intervalo de Datas:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">De:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold px-2 py-1 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Até:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs font-bold px-2 py-1 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Navigation Tabs */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2.5 no-scrollbar">
            <button
              onClick={() => setActiveTab('indicadores')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'indicadores'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>20 Indicadores Oficiais</span>
            </button>

            <button
              onClick={() => setActiveTab('mapa_nacional')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'mapa_nacional'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Mapa Nacional Angola</span>
            </button>

            <button
              onClick={() => setActiveTab('unidades_ativas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'unidades_ativas'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Unidades Activas & Alvarás</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                {allHealthUnits.filter((u) => u.plano_status === 'ativo' || u.verificada).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('comunicados')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'comunicados'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Megaphone className="w-4 h-4 text-amber-400" />
              <span>Comunicados & Informações</span>
            </button>

            <button
              onClick={() => setActiveTab('heatmap_farmacos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'heatmap_farmacos'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-4 h-4 text-orange-400" />
              <span>Mapa de Calor de Fármacos</span>
            </button>

            <button
              onClick={() => setActiveTab('disponibilidade')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'disponibilidade'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mapa de Disponibilidade</span>
            </button>

            <button
              onClick={() => setActiveTab('alertas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'alertas'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Alertas & Ruturas</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {analyticsData.alertas.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rankings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'rankings'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Rankings Nacionais</span>
            </button>

            <button
              onClick={() => setActiveTab('evolucao')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'evolucao'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Evolução Temporal</span>
            </button>

            <button
              onClick={() => setActiveTab('relatorios')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeTab === 'relatorios'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Relatório Executivo</span>
            </button>
          </nav>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ========================================================================= */}
        {/* TAB 1: 20 INDICADORES OFICIAIS */}
        {/* ========================================================================= */}
        {activeTab === 'indicadores' && (
          <div className="space-y-6">
            {/* KPI Subcategory Filter Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs font-bold text-slate-500 px-2">Filtrar KPIs:</span>
                {[
                  { id: 'all', label: 'Todos os 20 Indicadores' },
                  { id: 'procura', label: 'Procura & Buscas' },
                  { id: 'disponibilidade', label: 'Disponibilidade & Stock' },
                  { id: 'operacional', label: 'Operacional & Pedidos' },
                  { id: 'regional', label: 'Cobertura Regional' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setKpiFilter(item.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      kpiFilter === item.id
                        ? 'bg-[#123B7A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-slate-500">
                Mostrando <span className="text-[#0B1E3B] font-black">{filteredKpis.length}</span> de 20 indicadores
              </div>
            </div>

            {/* Grid of 20 Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredKpis.map((kpi) => {
                const isPositive = kpi.sentido_positivo
                  ? kpi.tipo_variacao === 'aumento'
                  : kpi.tipo_variacao === 'reducao';

                return (
                  <div
                    key={kpi.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            kpi.categoria_kpi === 'procura'
                              ? 'bg-blue-50 text-blue-700'
                              : kpi.categoria_kpi === 'disponibilidade'
                              ? 'bg-emerald-50 text-emerald-700'
                              : kpi.categoria_kpi === 'operacional'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {kpi.categoria_kpi}
                        </span>

                        {/* Trend Directional Arrow & Badge */}
                        <div
                          className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-black ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {kpi.variacao_percentual > 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {kpi.variacao_percentual > 0 ? '+' : ''}
                            {kpi.variacao_percentual}%
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-slate-600 leading-snug mb-1">
                        {kpi.titulo}
                      </h3>

                      <div className="text-2xl font-black text-[#0B1E3B] tracking-tight mb-2">
                        {kpi.valor_atual}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Ciclo anterior:</span>
                      <span className="font-bold text-slate-700">{kpi.valor_anterior}</span>
                    </div>

                    {kpi.descricao && (
                      <p className="mt-2 text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {kpi.descricao}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MAPA NACIONAL INTERATIVO DE ANGOLA (21 PROVÍNCIAS) */}
        {/* ========================================================================= */}
        {activeTab === 'mapa_nacional' && (
          <div className="space-y-6">
            {/* Map Mode Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Modo de Visualização:</span>
                {[
                  { id: 'procura', label: 'Intensidade de Procura' },
                  { id: 'disponibilidade', label: 'Índice de Disponibilidade' },
                  { id: 'unidades', label: 'Cobertura de Unidades' },
                  { id: 'tendencia', label: 'Tendência (+/- %)' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setMapMode(mode.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      mapMode === mode.id
                        ? 'bg-[#0B1E3B] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Zoom & Reset Controls */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setMapZoom((prev) => Math.min(prev + 0.2, 2.0))}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition cursor-pointer"
                  title="Aproximar Zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMapZoom((prev) => Math.max(prev - 0.2, 0.8))}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition cursor-pointer"
                  title="Afastar Zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMapZoom(1)}
                  className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition cursor-pointer"
                  title="Repor Visualização"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Split Screen: Angola Map Visualizer + Province Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Interactive Vector Map Layout */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between min-h-[520px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-black text-[#0B1E3B] uppercase tracking-tight">
                      Mapa Geográfico Interativo de Angola
                    </h3>
                    <p className="text-xs text-slate-500">
                      Clique em qualquer uma das 21 províncias para auditoria regional detalhada.
                    </p>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-3 h-3 rounded-full bg-emerald-500" /> Baixa / Bom
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-3 h-3 rounded-full bg-amber-400" /> Médio
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-3 h-3 rounded-full bg-orange-500" /> Elevado
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-3 h-3 rounded-full bg-rose-600" /> Crítico / Muito Alto
                    </span>
                  </div>
                </div>

                {/* SVG Angola Map Representation */}
                <div
                  className="relative flex items-center justify-center p-4 bg-slate-50 rounded-xl overflow-hidden min-h-[380px]"
                  style={{ transform: `scale(${mapZoom})`, transition: 'transform 0.2s ease' }}
                >
                  {/* Grid overlay of provinces clickable buttons on regional coordinate layout */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full max-w-xl">
                    {analyticsData.provincias_mapa.map((prov) => {
                      let colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200';
                      if (mapMode === 'procura') {
                        if (prov.nivel_procura === 'muito_elevado') colorClass = 'bg-rose-100 text-rose-800 border-rose-400 hover:bg-rose-200';
                        else if (prov.nivel_procura === 'elevado') colorClass = 'bg-orange-100 text-orange-800 border-orange-400 hover:bg-orange-200';
                        else if (prov.nivel_procura === 'medio') colorClass = 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
                      } else if (mapMode === 'disponibilidade') {
                        if (prov.indice_disponibilidade < 60) colorClass = 'bg-rose-100 text-rose-800 border-rose-400 hover:bg-rose-200';
                        else if (prov.indice_disponibilidade < 80) colorClass = 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
                        else colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200';
                      } else if (mapMode === 'tendencia') {
                        if (prov.tendencia_procura_pct > 20) colorClass = 'bg-rose-100 text-rose-800 border-rose-400 hover:bg-rose-200';
                        else if (prov.tendencia_procura_pct > 0) colorClass = 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
                        else colorClass = 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
                      }

                      return (
                        <button
                          key={prov.id}
                          onClick={() => handleSelectProvinceOnMap(prov)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${colorClass} ${
                            selectedProvinceModal?.id === prov.id ? 'ring-2 ring-[#0B1E3B] shadow-md' : ''
                          }`}
                        >
                          <span className="text-[11px] font-black truncate">{prov.nome}</span>
                          <div className="mt-1 flex items-center justify-between text-[10px]">
                            {mapMode === 'procura' && <span>{prov.total_pesquisas} buscas</span>}
                            {mapMode === 'disponibilidade' && <span>{prov.indice_disponibilidade}% disp.</span>}
                            {mapMode === 'unidades' && <span>{prov.unidades_activas} unid.</span>}
                            {mapMode === 'tendencia' && <span>{prov.tendencia_procura_pct > 0 ? '+' : ''}{prov.tendencia_procura_pct}%</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Total Territorial: 21 Províncias de Angola</span>
                  <span className="font-bold text-[#0B1E3B]">
                    Procura Nacional: {analyticsData.indicadores[0]?.valor_atual} pesquisas
                  </span>
                </div>
              </div>

              {/* Province Detail Drawer / Card */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                {selectedProvinceModal ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#0B1E3B] text-white uppercase tracking-wider">
                          Província Selecionada
                        </span>
                        <h3 className="text-xl font-black text-[#0B1E3B] mt-1">
                          {selectedProvinceModal.nome}
                        </h3>
                      </div>
                      <button
                        onClick={() => setSelectedProvinceModal(null)}
                        className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                      >
                        Fechar
                      </button>
                    </div>

                    {/* Metric summary for selected province */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500">Total de Pesquisas</span>
                        <div className="text-lg font-black text-[#0B1E3B]">
                          {selectedProvinceModal.total_pesquisas.toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500">Disponibilidade Geral</span>
                        <div className="text-lg font-black text-emerald-600">
                          {selectedProvinceModal.indice_disponibilidade}%
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500">Unidades Ativas</span>
                        <div className="text-lg font-black text-[#123B7A]">
                          {selectedProvinceModal.unidades_activas} estabelecimentos
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-500">Tendência de Procura</span>
                        <div className="text-lg font-black text-rose-600">
                          {selectedProvinceModal.tendencia_procura_pct > 0 ? '+' : ''}
                          {selectedProvinceModal.tendencia_procura_pct}%
                        </div>
                      </div>
                    </div>

                    {/* Top Drugs in this province */}
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                        Medicamentos Mais Procurados na Província:
                      </h4>
                      <div className="space-y-1.5">
                        {selectedProvinceModal.medicamentos_mais_procurados.map((med, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs font-medium"
                          >
                            <span className="font-bold text-slate-800">{med.nome}</span>
                            <div className="flex items-center gap-2 text-slate-500">
                              <span>{med.pesquisas} buscas</span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {med.disponibilidade_pct}% Disp.
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Services in this province */}
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                        Serviços & Consultas Mais Requisitados:
                      </h4>
                      <div className="space-y-1.5">
                        {selectedProvinceModal.servicos_mais_procurados.map((srv, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs font-medium"
                          >
                            <span className="font-bold text-slate-800">{srv.nome}</span>
                            <span className="text-slate-500">{srv.pesquisas} buscas</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA button to view units and route map */}
                    <button
                      onClick={() => {
                        const el = document.getElementById('unidades-provincia-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="w-full mt-3 py-2.5 px-4 rounded-xl bg-[#0B1E3B] text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-[#123B7A] transition shadow-xs cursor-pointer"
                    >
                      <Navigation className="w-4 h-4 text-emerald-400" />
                      <span>Ver {provinceUnits.length} Unidades & Rotas de Navegação</span>
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <MapPin className="w-12 h-12 text-slate-300 mb-3" />
                    <h4 className="text-sm font-black text-slate-600">Nenhuma Província Selecionada</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Clique em qualquer uma das províncias de Angola no mapa ao lado para consultar a disponibilidade, unidades sanitárias e medicamentos mais procurados.
                    </p>
                    <button
                      onClick={() => {
                        const el = document.getElementById('unidades-provincia-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1E3B] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Ver Todas as Unidades Nacionais ({allHealthUnits.length})</span>
                    </button>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Dados consolidados em conformidade com o Regulamento Geral de Saúde.</span>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* UNIDADES SANITÁRIAS CADASTRADAS NA PROVÍNCIA COM ROTA GPS */}
            {/* ========================================================================= */}
            <div id="unidades-provincia-section" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6 scroll-mt-6">
              {/* Section Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wider flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Cadastro Oficial de Unidades Sanitárias
                    </span>
                    {selectedProvinceModal && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {selectedProvinceModal.nome}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-[#0B1E3B] tracking-tight">
                    {selectedProvinceModal
                      ? `Unidades Sanitárias em ${selectedProvinceModal.nome}`
                      : 'Unidades Sanitárias Registadas (Todas as Províncias)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {filteredProvUnits.length} estabelecimentos de saúde disponíveis. Clique em <strong>"Ver Caminho ou Rota"</strong> para traçar o percurso no mapa com simulação GPS e integração ao Google Maps / Waze.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedProvinceModal && (
                    <button
                      onClick={() => setSelectedProvinceModal(null)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ver Todas as 21 Províncias</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Type Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setUnitTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      unitTypeFilter === 'all'
                        ? 'bg-[#0B1E3B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todas ({provinceUnits.length})
                  </button>
                  <button
                    onClick={() => setUnitTypeFilter('farmacia')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      unitTypeFilter === 'farmacia'
                        ? 'bg-[#0B1E3B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Farmácias ({provinceUnits.filter((u) => u.tipo === 'farmacia').length})
                  </button>
                  <button
                    onClick={() => setUnitTypeFilter('hospital')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      unitTypeFilter === 'hospital'
                        ? 'bg-[#0B1E3B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Hospitais ({provinceUnits.filter((u) => u.tipo === 'hospital').length})
                  </button>
                  <button
                    onClick={() => setUnitTypeFilter('clinica')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      unitTypeFilter === 'clinica'
                        ? 'bg-[#0B1E3B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Clínicas ({provinceUnits.filter((u) => u.tipo === 'clinica').length})
                  </button>
                  <button
                    onClick={() => setUnitTypeFilter('laboratorio')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      unitTypeFilter === 'laboratorio'
                        ? 'bg-[#0B1E3B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Laboratórios ({provinceUnits.filter((u) => u.tipo === 'laboratorio').length})
                  </button>
                  <button
                    onClick={() => setUnitTypeFilter('deposito')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      unitTypeFilter === 'deposito'
                        ? 'bg-[#0B1E3B] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Depósitos Grossistas ({provinceUnits.filter((u) => u.tipo === 'deposito').length})
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={unitSearchQuery}
                    onChange={(e) => setUnitSearchQuery(e.target.value)}
                    placeholder="Buscar unidade, município, bairro..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B1E3B] bg-slate-50 focus:bg-white"
                  />
                  {unitSearchQuery && (
                    <button
                      onClick={() => setUnitSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Units Grid */}
              {filteredProvUnits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filteredProvUnits.map((unit) => {
                    const typeLabel =
                      unit.tipo === 'farmacia'
                        ? 'Farmácia'
                        : unit.tipo === 'hospital'
                        ? 'Hospital Geral'
                        : unit.tipo === 'clinica'
                        ? 'Clínica Médica'
                        : unit.tipo === 'laboratorio'
                        ? 'Laboratório'
                        : 'Depósito Grossista';

                    return (
                      <div
                        key={unit.id}
                        className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-[#123B7A]/50 hover:shadow-lg transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-3.5">
                          {/* Top Row: Avatar & Badges */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {unit.logo_url ? (
                                <img
                                  src={unit.logo_url}
                                  alt={unit.nome}
                                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200">
                                  <Building2 className="w-6 h-6 text-[#0B1E3B]" />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {typeLabel}
                                  </span>
                                  {unit.verificada && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                      MINSA
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-black text-[#0B1E3B] mt-1 group-hover:text-blue-700 transition">
                                  {unit.nome}
                                </h4>
                              </div>
                            </div>
                          </div>

                          {/* Address & Municipality */}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-bold text-slate-800">
                                {unit.municipio}, {unit.provincia}
                              </span>
                              {unit.bairro && (
                                <span className="text-slate-400">• Bairro {unit.bairro}</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 pl-5 line-clamp-2">
                              {unit.endereco_completo}
                            </p>
                          </div>

                          {/* Schedule & Phone */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {unit.horario_funcionamento}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  unit.aberto_agora
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {unit.aberto_agora ? '● Aberto' : '○ Fechado'}
                              </span>
                            </div>

                            {unit.telefone && (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-400">Contacto:</span>
                                <a
                                  href={`tel:${unit.telefone}`}
                                  className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Phone className="w-3 h-3" />
                                  <span>{unit.telefone}</span>
                                </a>
                              </div>
                            )}

                            {/* GPS Coordinates */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span>Coordenadas GPS:</span>
                              <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                {unit.latitude.toFixed(4)}, {unit.longitude.toFixed(4)}
                              </span>
                            </div>

                            {/* MANDATORY MINSA REGISTRATION & OFFICIAL DOCUMENT */}
                            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-2 mt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  Nº de Alvará Sanitário / Registo MINSA
                                </span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                                  Homologado
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-black text-[#0B1E3B] tracking-wider bg-white px-2 py-1 rounded-md border border-amber-200">
                                  {unit.certificado_institucional || 'CERT-MINSA-2025-4891'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setMinsaDocModalUnit(unit)}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#123B7A] hover:bg-[#0B1E3B] text-white text-[11px] font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                                  title="Ver Documento Oficial e Alvará Sanitário do MINSA"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Documento MINSA</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                          <button
                            onClick={() => setRouteModalUnit(unit)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B1E3B] text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-[#123B7A] transition shadow-xs cursor-pointer group-hover:bg-[#123B7A]"
                          >
                            <Navigation className="w-4 h-4 text-emerald-400" />
                            <span>Ver Caminho / Rota</span>
                          </button>

                          <button
                            onClick={() =>
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${unit.latitude},${unit.longitude}&travelmode=driving`,
                                '_blank'
                              )
                            }
                            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                            title="Navegar no Google Maps"
                          >
                            <ExternalLink className="w-4 h-4 text-blue-600" />
                          </button>

                          <button
                            onClick={() => setProfileModalUnit(unit)}
                            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                            title="Ver Perfil Completo"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty state */
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-black text-slate-700">Nenhuma Unidade Encontrada</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Não foram encontradas unidades que correspondam aos filtros ou termo pesquisado nesta província.
                  </p>
                  <button
                    onClick={() => {
                      setUnitSearchQuery('');
                      setUnitTypeFilter('all');
                      setSelectedProvinceModal(null);
                    }}
                    className="mt-3 px-4 py-2 rounded-xl bg-[#0B1E3B] text-white font-bold text-xs hover:bg-[#123B7A] transition cursor-pointer"
                  >
                    Limpar Filtros e Ver Todas as Unidades
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: UNIDADES ACTIVAS, INFORMAÇÕES, ALVARÁS E ROTAS NO MAPA */}
        {/* ========================================================================= */}
        {activeTab === 'unidades_ativas' && (
          <ActiveUnitsInstitutionalView
            units={allHealthUnits}
            onOpenRouteMap={(unit) => setRouteModalUnit(unit)}
            onOpenMinsaDocument={(unit) => setMinsaDocModalUnit(unit)}
            onOpenUnitProfile={(unit) => setProfileModalUnit(unit)}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB: COMUNICADOS E INFORMAÇÕES OFICIAIS DO MINSA */}
        {/* ========================================================================= */}
        {activeTab === 'comunicados' && (
          <MinsaAnnouncementsInstitutionalView />
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MAPA DE CALOR DE FÁRMACOS (HEATMAP ESPECÍFICO) */}
        {/* ========================================================================= */}
        {activeTab === 'heatmap_farmacos' && (
          <div className="space-y-6">
            {/* Search Header for Drug Heatmap */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-black text-[#0B1E3B] uppercase tracking-tight">
                  Mapa de Calor Nacional — Procura de Fármacos em Tempo Real
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Analise a densidade da procura por medicamento específico, identifique novas zonas de consumo e surtos locais.
                </p>
              </div>

              {/* Search Drug Input & Quick Preset Pills */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={heatmapDrugQuery}
                    onChange={(e) => setHeatmapDrugQuery(e.target.value)}
                    placeholder="Digite o fármaco (ex: Coartem, Paracetamol)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#123B7A]"
                  />
                </div>

                {/* Quick preset buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 mr-1">Fármacos Frequentes:</span>
                  {presetDrugs.map((d) => (
                    <button
                      key={d}
                      onClick={() => setHeatmapDrugQuery(d.split(' ')[0])}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        heatmapDrugQuery.toLowerCase().includes(d.split(' ')[0].toLowerCase())
                          ? 'bg-[#0B1E3B] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Matrix Grid */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-[#0B1E3B] uppercase tracking-wider">
                  Intensidade de Procura por Província — <span className="text-[#00A878]">{heatmapDrugQuery || 'Geral'}</span>
                </h4>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" /> Verde (Baixa)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-amber-400" /> Amarelo (Média)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-orange-500" /> Laranja (Elevada)
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-rose-600" /> Vermelho (Muito Elevada)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {drugHeatmap.map((item, idx) => {
                  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  if (item.intensidade === 'vermelho') badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
                  else if (item.intensidade === 'laranja') badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
                  else if (item.intensidade === 'amarelo') badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between ${badgeColor}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-black tracking-tight">{item.provincia}</span>
                          {item.nova_zona_procura && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black animate-pulse">
                              Nova Zona
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span>Índice de Procura:</span>
                          <span className="text-base font-black">{item.indice_procura}/100</span>
                        </div>

                        <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full ${
                              item.intensidade === 'vermelho'
                                ? 'bg-rose-600'
                                : item.intensidade === 'laranja'
                                ? 'bg-orange-500'
                                : item.intensidade === 'amarelo'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${item.indice_procura}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-medium">
                        <span>{item.total_pesquisas} buscas ({item.total_pedidos} pedidos)</span>
                        <span className="font-bold">
                          {item.crescimento_pct > 0 ? `+${item.crescimento_pct}% cresc.` : 'Estável'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MAPA DE DISPONIBILIDADE DE MEDICAMENTOS */}
        {/* ========================================================================= */}
        {activeTab === 'disponibilidade' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-black text-[#0B1E3B] uppercase tracking-tight">
                  Matriz de Disponibilidade de Medicamentos por Província
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifique o estado de stock em tempo real por medicamento e província para intervenção da Reserva Estratégica.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={availabilityDrugQuery}
                    onChange={(e) => setAvailabilityDrugQuery(e.target.value)}
                    placeholder="Pesquisar medicamento no stock nacional..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#123B7A]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {['Paracetamol 500mg', 'Coartem 80/480mg', 'Insulina Regular', 'Amoxicilina 500mg', 'Ibuprofeno 400mg'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setAvailabilityDrugQuery(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        availabilityDrugQuery === d
                          ? 'bg-[#0B1E3B] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Matrix */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-black text-[#0B1E3B] uppercase tracking-wider">
                  Relatório de Stock — <span className="text-[#00A878]">{availabilityDrugQuery}</span>
                </h4>
                <span className="text-xs text-slate-500 font-bold">21 Províncias Mapeadas</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="p-3.5">Província</th>
                      <th className="p-3.5">Estado de Stock</th>
                      <th className="p-3.5">Unidades com Stock</th>
                      <th className="p-3.5">Stock Estimado</th>
                      <th className="p-3.5">Preço Médio Referência</th>
                      <th className="p-3.5 text-right">Ação Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drugAvailability.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 font-bold text-slate-900">{item.provincia}</td>
                        <td className="p-3.5">
                          {item.status === 'disponivel' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Disponível
                            </span>
                          )}
                          {item.status === 'baixa_disponibilidade' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-black text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> Baixa Disponibilidade
                            </span>
                          )}
                          {item.status === 'indisponivel' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-black text-[10px]">
                              <XCircle className="w-3 h-3" /> Indisponível (Sem Stock)
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-bold">
                          {item.unidades_com_stock} de {item.total_unidades_regiao} farmácias
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {item.stock_total_estimado > 0
                            ? `${item.stock_total_estimado.toLocaleString()} unidades`
                            : '0 unidades (Rutura)'}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {item.preco_medio_aoa > 0
                            ? `${item.preco_medio_aoa.toLocaleString()} AOA`
                            : 'N/A'}
                        </td>
                        <td className="p-3.5 text-right">
                          {item.status === 'indisponivel' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-[10px]">
                              Despacho Urgente
                            </span>
                          ) : item.status === 'baixa_disponibilidade' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[10px]">
                              Reabastecer
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[11px]">Normal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ALERTAS E RUTURAS */}
        {/* ========================================================================= */}
        {activeTab === 'alertas' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-[#0B1E3B] uppercase tracking-tight">
                  Sistema de Vigilância e Alertas Epidemiológicos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detecção automática de anomalias na procura e ruturas críticas de medicamentos essenciais.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black">
                  {analyticsData.alertas.filter((a) => a.severidade === 'critico').length} Alertas Críticos
                </span>
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                  {analyticsData.alertas.filter((a) => a.severidade === 'alerta').length} Avisos Moderados
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analyticsData.alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
                    alerta.severidade === 'critico'
                      ? 'bg-rose-50/50 border-rose-200'
                      : alerta.severidade === 'alerta'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-blue-50/50 border-blue-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          alerta.severidade === 'critico'
                            ? 'bg-rose-600 text-white'
                            : alerta.severidade === 'alerta'
                            ? 'bg-amber-500 text-white'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {alerta.severidade.toUpperCase()}
                      </span>

                      <span className="text-[11px] font-bold text-slate-400">
                        {new Date(alerta.data_detecao).toLocaleDateString('pt-PT')}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 mb-1.5">
                      {alerta.titulo}
                    </h4>

                    <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                      {alerta.descricao}
                    </p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold">Região:</span>
                        <span>{alerta.provincia} {alerta.municipio ? `(${alerta.municipio})` : ''}</span>
                      </div>
                      {alerta.impacto_estimado && (
                        <div className="flex items-center gap-1.5 text-rose-700 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span><strong>Impacto:</strong> {alerta.impacto_estimado}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {alerta.acao_sugerida && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 bg-white/70 p-3 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-[#0B1E3B] block mb-1">
                        Recomendação de Intervenção MINSA:
                      </span>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {alerta.acao_sugerida}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: RANKINGS NACIONAIS */}
        {/* ========================================================================= */}
        {activeTab === 'rankings' && (
          <div className="space-y-6">
            {/* Ranking Nav Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200">
              {[
                { id: 'medicamentos', label: 'Medicamentos Mais Procurados', icon: Pill },
                { id: 'servicos', label: 'Serviços Médicos', icon: Stethoscope },
                { id: 'exames', label: 'Exames Laboratoriais', icon: Microscope },
                { id: 'regioes_procura', label: 'Regiões com Maior Procura', icon: Flame },
                { id: 'regioes_disponibilidade', label: 'Regiões com Menor Stock', icon: AlertTriangle },
                { id: 'unidades_pedidos', label: 'Unidades com Mais Pedidos', icon: Building2 },
                { id: 'unidades_conclusao', label: 'Maior Taxa de Conclusão', icon: CheckCircle2 },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRankingTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      rankingTab === tab.id
                        ? 'bg-[#0B1E3B] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Ranking List Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-black text-[#0B1E3B] uppercase tracking-wider">
                  Tabela Classificativa Oficial — {rankingTab.toUpperCase().replace(/_/g, ' ')}
                </h3>
                <span className="text-xs text-slate-400 font-bold">Nível Nacional</span>
              </div>

              <div className="divide-y divide-slate-100">
                {rankingTab === 'medicamentos' &&
                  analyticsData.rankings.medicamentos_procurados.map((item) => (
                    <div key={item.posicao} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                            item.posicao === 1
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : item.posicao === 2
                              ? 'bg-slate-300 text-slate-800'
                              : item.posicao === 3
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.posicao}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.nome}</h4>
                          <span className="text-[11px] text-slate-400">{item.categoria}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-[#0B1E3B]">{item.metrica_primaria} pesquisas</div>
                        <span className="text-[11px] font-bold text-emerald-600">{item.metrica_secundaria}</span>
                      </div>
                    </div>
                  ))}

                {rankingTab === 'servicos' &&
                  analyticsData.rankings.servicos_procurados.map((item) => (
                    <div key={item.posicao} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700">
                          {item.posicao}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.nome}</h4>
                          <span className="text-[11px] text-slate-400">{item.categoria}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-[#0B1E3B]">{item.metrica_primaria} buscas</div>
                        <span className="text-[11px] text-slate-500 font-medium">{item.metrica_secundaria}</span>
                      </div>
                    </div>
                  ))}

                {rankingTab === 'exames' &&
                  analyticsData.rankings.exames_procurados.map((item) => (
                    <div key={item.posicao} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700">
                          {item.posicao}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.nome}</h4>
                          <span className="text-[11px] text-slate-400">{item.categoria}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-[#0B1E3B]">{item.metrica_primaria} exames solicitados</div>
                        <span className="text-[11px] text-slate-500 font-medium">{item.metrica_secundaria}</span>
                      </div>
                    </div>
                  ))}

                {rankingTab === 'regioes_procura' &&
                  analyticsData.rankings.regioes_maior_procura.map((item) => (
                    <div key={item.posicao} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700">
                          {item.posicao}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.nome}</h4>
                          <span className="text-[11px] text-slate-400">Polo Geográfico</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-[#0B1E3B]">{item.metrica_primaria}</div>
                        <span className="text-[11px] font-bold text-rose-600">{item.metrica_secundaria}</span>
                      </div>
                    </div>
                  ))}

                {rankingTab === 'regioes_disponibilidade' &&
                  analyticsData.rankings.regioes_menor_disponibilidade.map((item) => (
                    <div key={item.posicao} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-black text-xs">
                          {item.posicao}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.nome}</h4>
                          <span className="text-[11px] text-rose-600 font-bold">Zona de Atenção Prioritária</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-rose-700">{item.metrica_primaria}</div>
                        <span className="text-[11px] text-slate-500 font-medium">{item.metrica_secundaria}</span>
                      </div>
                    </div>
                  ))}

                {rankingTab === 'unidades_pedidos' &&
                  analyticsData.rankings.unidades_mais_pedidos.map((item) => (
                    <div key={item.posicao} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700">
                          {item.posicao}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.nome}</h4>
                          <span className="text-[11px] text-slate-400">{item.regiao}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-[#0B1E3B]">{item.metrica_primaria}</div>
                        <span className="text-[11px] font-bold text-emerald-600">{item.metrica_secundaria}</span>
                      </div>
                    </div>
                  ))}

                {rankingTab === 'unidades_conclusao' &&
                  analyticsData.rankings.unidades_maior_taxa_conclusao.map((item) => (
                    <div key={item.posicao} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3.5">
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                          {item.posicao}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{item.nome}</h4>
                          <span className="text-[11px] text-slate-400">{item.regiao}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-700">{item.metrica_primaria}</div>
                        <span className="text-[11px] text-slate-500 font-medium">{item.metrica_secundaria}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: EVOLUÇÃO TEMPORAL */}
        {/* ========================================================================= */}
        {activeTab === 'evolucao' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-[#0B1E3B] uppercase tracking-tight">
                  Evolução Temporal da Procura e Atendimento Farmacêutico
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acompanhamento de séries temporais diárias, semanais e mensais.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTemporalViewType('grafico')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    temporalViewType === 'grafico'
                      ? 'bg-[#0B1E3B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Modo Gráfico
                </button>
                <button
                  onClick={() => setTemporalViewType('tabela')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    temporalViewType === 'tabela'
                      ? 'bg-[#0B1E3B] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tabela de Dados
                </button>
              </div>
            </div>

            {temporalViewType === 'grafico' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Procura Total vs. Pedidos */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-black text-[#0B1E3B] uppercase tracking-wider mb-4">
                    Pesquisas de Utentes vs. Pedidos Concluídos
                  </h4>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.evolucao_temporal}>
                        <defs>
                          <linearGradient id="colorPesquisas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#123B7A" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#123B7A" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00A878" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#00A878" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="data" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="pesquisas_totais"
                          name="Pesquisas Totais"
                          stroke="#123B7A"
                          fillOpacity={1}
                          fill="url(#colorPesquisas)"
                        />
                        <Area
                          type="monotone"
                          dataKey="pedidos_concluidos"
                          name="Pedidos Concluídos"
                          stroke="#00A878"
                          fillOpacity={1}
                          fill="url(#colorPedidos)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Procura por Categoria */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-black text-[#0B1E3B] uppercase tracking-wider mb-4">
                    Procura por Segmento (Medicamentos vs. Serviços vs. Exames)
                  </h4>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.evolucao_temporal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="data" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="pesquisas_medicamentos"
                          name="Medicamentos"
                          fill="#123B7A"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="pesquisas_servicos"
                          name="Serviços Médicos"
                          fill="#00A878"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="pesquisas_exames"
                          name="Exames Laboratoriais"
                          fill="#E8A317"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="p-3.5">Período</th>
                      <th className="p-3.5">Pesquisas Totais</th>
                      <th className="p-3.5">Medicamentos</th>
                      <th className="p-3.5">Serviços Médicos</th>
                      <th className="p-3.5">Exames</th>
                      <th className="p-3.5">Pedidos Concluídos</th>
                      <th className="p-3.5">Índice Disp. %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyticsData.evolucao_temporal.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-bold text-slate-900">{p.data}</td>
                        <td className="p-3.5 font-bold text-[#123B7A]">{p.pesquisas_totais.toLocaleString()}</td>
                        <td className="p-3.5">{p.pesquisas_medicamentos.toLocaleString()}</td>
                        <td className="p-3.5">{p.pesquisas_servicos.toLocaleString()}</td>
                        <td className="p-3.5">{p.pesquisas_exames.toLocaleString()}</td>
                        <td className="p-3.5 font-bold text-emerald-600">{p.pedidos_concluidos.toLocaleString()}</td>
                        <td className="p-3.5 font-bold">{p.indice_disponibilidade}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: RELATÓRIOS OFICIAIS */}
        {/* ========================================================================= */}
        {activeTab === 'relatorios' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
              {/* Official Header */}
              <div className="text-center pb-6 border-b-2 border-slate-200">
                <div className="w-16 h-16 mx-auto mb-2 bg-[#0B1E3B] text-[#E8A317] rounded-2xl flex items-center justify-center shadow-md">
                  <Landmark className="w-8 h-8" />
                </div>
                <h2 className="text-base font-black uppercase text-slate-900 tracking-wider">
                  República de Angola • Ministério da Saúde
                </h2>
                <h3 className="text-sm font-bold text-slate-600 uppercase mt-0.5">
                  Gabinete de Estudos, Planeamento e Estatística (GEPE / MINSA)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Relatório Analítico Consolidado do Ecossistema MUTIKUKWAMA SAÚDE
                </p>
                <div className="mt-3 inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                  Referência: MINSA-REL-2026-{(Date.now() % 10000).toString().padStart(4, '0')} | Período: {analyticsData.periodo_selecionado}
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-[#0B1E3B] tracking-wider">
                  1. Sumário Executivo Nacional
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  No período em análise ({analyticsData.periodo_selecionado}), o ecossistema nacional de saúde registou um volume agregado de <strong>{analyticsData.indicadores[0]?.valor_atual}</strong> pesquisas de utentes em todo o território nacional. A taxa geral de disponibilidade farmacêutica situou-se em <strong>{analyticsData.indicadores[19]?.valor_atual}</strong>, com <strong>{analyticsData.indicadores[9]?.valor_atual}</strong> pedidos concluídos com sucesso.
                </p>
              </div>

              {/* Core Indicators Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-[#0B1E3B] tracking-wider">
                  2. Indicadores Estratégicos Chave
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {analyticsData.indicadores.slice(0, 6).map((kpi) => (
                    <div key={kpi.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block">{kpi.titulo}</span>
                      <span className="text-base font-black text-[#0B1E3B]">{kpi.valor_atual}</span>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                        {kpi.variacao_percentual > 0 ? '+' : ''}{kpi.variacao_percentual}% vs ciclo anterior
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Alerts */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-rose-700 tracking-wider">
                  3. Alertas e Ruturas de Stock Identificadas
                </h4>
                <div className="space-y-2">
                  {analyticsData.alertas.map((a) => (
                    <div key={a.id} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                      <div className="font-black text-rose-900">{a.titulo}</div>
                      <div className="text-slate-700 mt-1">{a.descricao}</div>
                      {a.acao_sugerida && (
                        <div className="text-rose-800 font-bold mt-1 text-[11px]">
                          Medida MINSA: {a.acao_sugerida}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Signatures & Seal */}
              <div className="pt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-6 text-center text-xs">
                <div>
                  <div className="w-48 border-b border-slate-400 mx-auto mb-1.5" />
                  <span className="font-black text-slate-800">Direcção Nacional de Medicamentos</span>
                  <span className="text-slate-400 block text-[10px]">MINSA — República de Angola</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Documento Autenticado Digitalmente</span>
                </div>

                <div>
                  <div className="w-48 border-b border-slate-400 mx-auto mb-1.5" />
                  <span className="font-black text-slate-800">Coordenação de Estatística Sanitária</span>
                  <span className="text-slate-400 block text-[10px]">Gabinete Técnico MUTIKUKWAMA</span>
                </div>
              </div>

              {/* Print / Export Bar */}
              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0B1E3B] text-white rounded-xl font-bold text-xs hover:bg-[#122B52] transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Relatório com Selo Oficial</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Exportar Livro Excel Completo</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Health Unit Route & GPS Navigation Modal */}
      {routeModalUnit && (
        <UnitRouteMapModal
          unit={routeModalUnit}
          onClose={() => setRouteModalUnit(null)}
          originLabel="Gabinete MINSA (Luanda)"
          userCoords={{ lat: -8.8147, lng: 13.2328 }}
        />
      )}

      {/* Unit Profile / Catalog Modal */}
      {profileModalUnit && (
        <UnitProfileModal
          unit={profileModalUnit}
          onClose={() => setProfileModalUnit(null)}
        />
      )}

      {/* MINSA Official License & Document Modal */}
      {minsaDocModalUnit && (
        <MinsaDocumentModal
          isOpen={!!minsaDocModalUnit}
          unit={minsaDocModalUnit}
          onClose={() => setMinsaDocModalUnit(null)}
        />
      )}
    </div>
  );
};
