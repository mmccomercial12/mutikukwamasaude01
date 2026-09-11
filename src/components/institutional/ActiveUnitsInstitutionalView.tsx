import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Navigation,
  Route,
  Search,
  Filter,
  Globe,
  Phone,
  Mail,
  ExternalLink,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Printer,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { HealthUnit } from '../../types';
import { PROVINCES_ANGOLA, REGIONS_ANGOLA, RegionDefinition } from '../../services/mockData';
import { useToast } from '../../context/ToastContext';

interface ActiveUnitsInstitutionalViewProps {
  units: HealthUnit[];
  onOpenRouteMap: (unit: HealthUnit) => void;
  onOpenMinsaDocument: (unit: HealthUnit) => void;
  onOpenUnitProfile?: (unit: HealthUnit) => void;
}

export const ActiveUnitsInstitutionalView: React.FC<ActiveUnitsInstitutionalViewProps> = ({
  units,
  onOpenRouteMap,
  onOpenMinsaDocument,
  onOpenUnitProfile,
}) => {
  const { success, info } = useToast();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDocStatus, setSelectedDocStatus] = useState<
    'all' | 'valid' | 'expiring_soon' | 'expired'
  >('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortBy, setSortBy] = useState<'name' | 'validade' | 'province'>('validade');

  // Selected Region object
  const currentRegion = useMemo(() => {
    return REGIONS_ANGOLA.find((r) => r.id === selectedRegionId) || REGIONS_ANGOLA[0];
  }, [selectedRegionId]);

  // Available provinces for current region
  const availableProvinces = useMemo(() => {
    if (selectedRegionId === 'all') return PROVINCES_ANGOLA;
    return currentRegion.provinces;
  }, [selectedRegionId, currentRegion]);

  // When region changes, reset province if not in region
  const handleRegionChange = (regId: string) => {
    setSelectedRegionId(regId);
    if (regId !== 'all') {
      const reg = REGIONS_ANGOLA.find((r) => r.id === regId);
      if (reg && selectedProvince !== 'all' && !reg.provinces.includes(selectedProvince)) {
        setSelectedProvince('all');
      }
    }
  };

  // Helper: calculate document status
  const getDocStatusInfo = (unit: HealthUnit) => {
    const validadeStr = unit.documento_minsa_validade || '2026-12-31';
    const emissaoStr = unit.documento_minsa_data_emissao || '2025-01-15';
    const alvara = unit.certificado_institucional || 'CERT-MINSA-2025-4891';

    const now = new Date();
    // Use fixed reference date aligned with simulation or today
    const expDate = new Date(validadeStr);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired' as const,
        label: 'Caducado / Inconforme',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        icon: XCircle,
        daysText: `Expirou há ${Math.abs(diffDays)} dias`,
        diffDays,
        validadeStr,
        emissaoStr,
        alvara,
      };
    } else if (diffDays <= 60) {
      return {
        status: 'expiring_soon' as const,
        label: 'Atenção: A Caducar',
        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
        dotColor: 'bg-amber-500',
        icon: AlertTriangle,
        daysText: `Expira em ${diffDays} dias`,
        diffDays,
        validadeStr,
        emissaoStr,
        alvara,
      };
    } else {
      return {
        status: 'valid' as const,
        label: 'Documento Válido',
        badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotColor: 'bg-emerald-500',
        icon: ShieldCheck,
        daysText: `${diffDays} dias de vigência`,
        diffDays,
        validadeStr,
        emissaoStr,
        alvara,
      };
    }
  };

  // Filter and sort units
  const filteredUnits = useMemo(() => {
    return units
      .filter((u) => {
        // Active filter
        const isUnitActive = u.plano_status === 'ativo' || u.verificada;
        if (!isUnitActive) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = u.nome.toLowerCase().includes(q);
          const matchMun = u.municipio.toLowerCase().includes(q);
          const matchBairro = (u.bairro || '').toLowerCase().includes(q);
          const matchProv = u.provincia.toLowerCase().includes(q);
          const matchCert = (u.certificado_institucional || '').toLowerCase().includes(q);
          const matchResp = (u.responsavel_nome || '').toLowerCase().includes(q);
          if (!matchName && !matchMun && !matchBairro && !matchProv && !matchCert && !matchResp) {
            return false;
          }
        }

        // Region Filter
        if (selectedRegionId !== 'all') {
          const reg = REGIONS_ANGOLA.find((r) => r.id === selectedRegionId);
          if (reg && !reg.provinces.some((p) => p.toLowerCase() === u.provincia.toLowerCase())) {
            return false;
          }
        }

        // Province Filter
        if (selectedProvince !== 'all' && u.provincia.toLowerCase() !== selectedProvince.toLowerCase()) {
          return false;
        }

        // Type Filter
        if (selectedType !== 'all' && u.tipo !== selectedType) {
          return false;
        }

        // Document Status Filter
        if (selectedDocStatus !== 'all') {
          const docInfo = getDocStatusInfo(u);
          if (docInfo.status !== selectedDocStatus) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.nome.localeCompare(b.nome);
        } else if (sortBy === 'province') {
          return a.provincia.localeCompare(b.provincia);
        } else {
          // sort by validade (expiring/expired first)
          const infoA = getDocStatusInfo(a);
          const infoB = getDocStatusInfo(b);
          return infoA.diffDays - infoB.diffDays;
        }
      });
  }, [units, searchQuery, selectedRegionId, selectedProvince, selectedType, selectedDocStatus, sortBy]);

  // Overview Counts for summary cards
  const summaryStats = useMemo(() => {
    let total = 0;
    let validCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let farmaciasCount = 0;
    let clinicasHospitaisCount = 0;

    units.forEach((u) => {
      const isActive = u.plano_status === 'ativo' || u.verificada;
      if (!isActive) return;

      total++;
      const doc = getDocStatusInfo(u);
      if (doc.status === 'valid') validCount++;
      else if (doc.status === 'expiring_soon') expiringCount++;
      else if (doc.status === 'expired') expiredCount++;

      if (u.tipo === 'farmacia') farmaciasCount++;
      else if (u.tipo === 'clinica' || u.tipo === 'hospital') clinicasHospitaisCount++;
    });

    return {
      total,
      validCount,
      expiringCount,
      expiredCount,
      farmaciasCount,
      clinicasHospitaisCount,
      validPercentage: total > 0 ? Math.round((validCount / total) * 100) : 0,
    };
  }, [units]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredUnits.map((u) => {
      const doc = getDocStatusInfo(u);
      return {
        'Nome da Unidade': u.nome,
        Tipo: u.tipo.toUpperCase(),
        Província: u.provincia,
        Município: u.municipio,
        Bairro: u.bairro,
        Endereço: u.endereco_completo,
        Telefone: u.telefone,
        WhatsApp: u.whatsapp,
        Email: u.email,
        'Responsável Técnico': u.responsavel_nome || 'N/D',
        'Nº Alvará / Certificado': doc.alvara,
        'Data de Emissão': doc.emissaoStr,
        'Data de Validade': doc.validadeStr,
        'Estado do Documento': doc.label,
        'Dias de Vigência': doc.diffDays,
        Latitude: u.latitude,
        Longitude: u.longitude,
        'Status do Plano': u.plano_status,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Unidades_Activas_MINSA');
    XLSX.writeFile(workbook, `Unidades_Activas_MINSA_Angola_${new Date().toISOString().split('T')[0]}.xlsx`);
    success('Relatório de unidades activas e documentos exportado para Excel com sucesso!');
  };

  const getTypeBadge = (tipo: string) => {
    switch (tipo) {
      case 'farmacia':
        return { label: 'Farmácia', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'hospital':
        return { label: 'Hospital', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'clinica':
        return { label: 'Clínica', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'laboratorio':
        return { label: 'Laboratório', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'deposito':
        return { label: 'Depósito B2B', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: tipo, bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Institutional Context */}
      <div className="bg-gradient-to-r from-[#0B1E3B] via-[#102B52] to-[#1E3A8A] rounded-2xl p-6 text-white shadow-lg border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-semibold text-emerald-300 border border-white/10">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Inspecção Sanitária & Rede Regulada do MINSA</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white">
              Directório de Unidades Activas & Fiscalização Documental
            </h2>
            <p className="text-xs lg:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Monitore em tempo real o parque sanitário credenciado em Angola: confira o status de
              emissão e caducidade de alvarás e licenças sanitárias, trace rotas no mapa até ao
              estabelecimento e aplique filtros regionais completos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-300" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRegionId('all');
                setSelectedProvince('all');
                setSelectedType('all');
                setSelectedDocStatus('all');
                info('Filtros restaurados com sucesso.');
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-medium border border-white/10 transition-all cursor-pointer"
              title="Limpar todos os filtros"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-white/10">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
              <span>Total Activas no País</span>
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-1 text-2xl font-black text-white">{summaryStats.total}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {summaryStats.farmaciasCount} Farmácias • {summaryStats.clinicasHospitaisCount} Clínicas/Hospitais
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-emerald-300 text-xs font-medium">
              <span>Alvarás Válidos / Conformes</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-400">
              {summaryStats.validCount}
              <span className="text-xs font-semibold text-emerald-300 ml-1.5">
                ({summaryStats.validPercentage}%)
              </span>
            </div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">Dentro do prazo regulamentar</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
              <span>Alerta: Caducam &lt; 60 dias</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-1 text-2xl font-black text-amber-400">
              {summaryStats.expiringCount}
            </div>
            <div className="text-[11px] text-amber-200/70 mt-0.5">Notificação preventiva requerida</div>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="flex items-center justify-between text-rose-300 text-xs font-medium">
              <span>Caducados / Inconformes</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-1 text-2xl font-black text-rose-400">
              {summaryStats.expiredCount}
            </div>
            <div className="text-[11px] text-rose-200/70 mt-0.5">Sujeitos a inspecção sanitária</div>
          </div>
        </div>
      </div>

      {/* Region Selector Pills */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Filtrar por Região Macro de Angola
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {currentRegion.description}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {REGIONS_ANGOLA.map((reg) => {
            const isSelected = selectedRegionId === reg.id;
            return (
              <button
                key={reg.id}
                onClick={() => handleRegionChange(reg.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#0B1E3B] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{reg.shortName}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filter Bar & Search */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, município, alvará, responsável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>

          {/* Province Filter (dynamically constrained by region) */}
          <div>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todas as Províncias ({availableProvinces.length})</option>
              {availableProvinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Todos os Tipos</option>
              <option value="farmacia">Farmácias</option>
              <option value="clinica">Clínicas Médicas</option>
              <option value="hospital">Hospitais / Centros</option>
              <option value="laboratorio">Laboratórios Clínicos</option>
              <option value="deposito">Depósitos Grossistas</option>
            </select>
          </div>

          {/* Document Status Filter */}
          <div>
            <select
              value={selectedDocStatus}
              onChange={(e) => setSelectedDocStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">Status Documental: Todos</option>
              <option value="valid">Válidos / Conformes</option>
              <option value="expiring_soon">A Caducar (&lt; 60 dias)</option>
              <option value="expired">Caducados / Inconformes</option>
            </select>
          </div>
        </div>

        {/* View mode toggle & sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <span>
              A apresentar <strong className="text-slate-900 font-black">{filteredUnits.length}</strong> de{' '}
              {units.length} unidades activas
            </span>
            {(selectedRegionId !== 'all' ||
              selectedProvince !== 'all' ||
              selectedType !== 'all' ||
              selectedDocStatus !== 'all' ||
              searchQuery) && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                Filtros activos
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-slate-800 border-0 focus:ring-0 cursor-pointer"
              >
                <option value="validade">Validade do Alvará (Urgência)</option>
                <option value="name">Nome (A - Z)</option>
                <option value="province">Província</option>
              </select>
            </div>

            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Cartões
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Tabela
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Units List: Empty State */}
      {filteredUnits.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Nenhuma unidade activa encontrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não existem estabelecimentos sanitários correspondentes aos filtros de região, província
            ou status de alvará seleccionados.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedRegionId('all');
              setSelectedProvince('all');
              setSelectedType('all');
              setSelectedDocStatus('all');
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            Limpar Filtros e Ver Todas
          </button>
        </div>
      )}

      {/* View Mode 1: Cards View */}
      {viewMode === 'cards' && filteredUnits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => {
            const doc = getDocStatusInfo(unit);
            const typeBadge = getTypeBadge(unit.tipo);
            const DocIcon = doc.icon;

            return (
              <div
                key={unit.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Header: Type, Status & Name */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${typeBadge.bg}`}
                      >
                        {typeBadge.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {unit.provincia}
                      </span>
                    </div>

                    {/* Document Status Badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${doc.badgeBg}`}
                      title={doc.daysText}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${doc.dotColor}`} />
                      <DocIcon className="w-3 h-3" />
                      <span>{doc.label}</span>
                    </div>
                  </div>

                  {/* Unit Title */}
                  <div>
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {unit.nome}
                    </h4>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {unit.municipio}{unit.bairro ? ` • ${unit.bairro}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Document Details Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Alvará Sanitário / MINSA:</span>
                      <span className="font-mono font-bold text-slate-800">{doc.alvara}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/50 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Data Emissão:</span>
                        <span className="font-bold text-slate-700">{doc.emissaoStr}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Caducidade:</span>
                        <span
                          className={`font-bold ${
                            doc.status === 'expired'
                              ? 'text-rose-600'
                              : doc.status === 'expiring_soon'
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {doc.validadeStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[10px]">
                      <span className="text-slate-500">Vigência restante:</span>
                      <span
                        className={`font-black uppercase tracking-wider ${
                          doc.status === 'expired'
                            ? 'text-rose-600'
                            : doc.status === 'expiring_soon'
                            ? 'text-amber-700'
                            : 'text-emerald-600'
                        }`}
                      >
                        {doc.daysText}
                      </span>
                    </div>
                  </div>

                  {/* Contact & Responsibility */}
                  <div className="space-y-1 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Responsável:</span>
                      <span className="font-bold text-slate-700 truncate max-w-[200px]">
                        {unit.responsavel_nome || 'Dr(a). Direcção Técnica'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Telefone:</span>
                      <span className="font-medium text-slate-800">{unit.telefone || 'N/D'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Route on Map & View Document */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => onOpenRouteMap(unit)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer"
                    title="Calcular caminho e rota GPS até esta unidade"
                  >
                    <Route className="w-3.5 h-3.5 text-blue-600" />
                    <span>Caminho no Mapa</span>
                  </button>

                  <button
                    onClick={() => onOpenMinsaDocument(unit)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                    title="Ver alvará sanitário e certidão oficial MINSA"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ver Documento</span>
                  </button>

                  {onOpenUnitProfile && (
                    <button
                      onClick={() => onOpenUnitProfile(unit)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Ver perfil completo da unidade"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode 2: Table View */}
      {viewMode === 'table' && filteredUnits.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Estabelecimento / Tipo</th>
                  <th className="py-3 px-4">Localização & Região</th>
                  <th className="py-3 px-4">Nº de Alvará MINSA</th>
                  <th className="py-3 px-4">Emissão</th>
                  <th className="py-3 px-4">Caducidade</th>
                  <th className="py-3 px-4">Status & Alerta</th>
                  <th className="py-3 px-4">Responsável Técnico</th>
                  <th className="py-3 px-4 text-right">Acções Directas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUnits.map((unit) => {
                  const doc = getDocStatusInfo(unit);
                  const typeBadge = getTypeBadge(unit.tipo);
                  const DocIcon = doc.icon;

                  return (
                    <tr key={unit.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">{unit.nome}</div>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider border ${typeBadge.bg}`}
                        >
                          {typeBadge.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-bold text-slate-800">{unit.provincia}</div>
                        <div className="text-[11px] text-slate-400">
                          {unit.municipio}{unit.bairro ? ` • ${unit.bairro}` : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {doc.alvara}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {doc.emissaoStr}
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        <span
                          className={
                            doc.status === 'expired'
                              ? 'text-rose-600'
                              : doc.status === 'expiring_soon'
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }
                        >
                          {doc.validadeStr}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${doc.badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${doc.dotColor}`} />
                          <DocIcon className="w-3 h-3" />
                          <span>{doc.label}</span>
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{doc.daysText}</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="font-medium">
                          {unit.responsavel_nome || 'Dr(a). Direcção Técnica'}
                        </div>
                        <div className="text-[11px] text-slate-400">{unit.telefone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => onOpenRouteMap(unit)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer"
                            title="Calcular caminho no mapa até à unidade"
                          >
                            <Route className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenMinsaDocument(unit)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer"
                            title="Ver alvará sanitário e certidão"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {onOpenUnitProfile && (
                            <button
                              onClick={() => onOpenUnitProfile(unit)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                              title="Ver perfil completo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
