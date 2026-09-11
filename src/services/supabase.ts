import {
  HealthUnit,
  ProductItem,
  ServiceItem,
  ExamItem,
  Order,
  PaymentTransaction,
  ActivityLog,
  SystemConfig,
  UserProfile,
  UserRole,
  PlanType,
  PlanPeriodicity,
  SupplyOrder,
  SupplyOrderStatus,
  InstitutionalAggregateData,
  IndicatorMetric,
  ProvinceMapData,
  DrugHeatmapPoint,
  DrugAvailabilityPoint,
  InstitutionalAlert,
  NationalRankingItem,
  TemporalEvolutionPoint,
  PolicyConsentRecord,
  SponsorPartner,
  MostSearchedItem,
  UnitReview,
  MinsaAnnouncement,
  SubscriptionPlanDefinition,
} from '../types';
import {
  INITIAL_HEALTH_UNITS,
  INITIAL_PRODUCTS,
  INITIAL_SERVICES,
  INITIAL_EXAMS,
  INITIAL_ACTIVITY_LOGS,
  SYSTEM_CONFIG_INITIAL,
  PLANS_DEFINITIONS,
  DEMO_USERS,
  PROVINCES_ANGOLA,
  INITIAL_SPONSORS,
  INITIAL_ORDERS,
  INITIAL_REVIEWS,
  INITIAL_MINSA_ANNOUNCEMENTS,
} from './mockData';

const STORAGE_KEYS = {
  UNITS: 'mutikukwama_units_v1',
  DELETED_UNITS: 'mutikukwama_deleted_units_v1',
  PRODUCTS: 'mutikukwama_products_v1',
  SERVICES: 'mutikukwama_services_v1',
  EXAMS: 'mutikukwama_exams_v1',
  ORDERS: 'mutikukwama_orders_v1',
  SUPPLY_ORDERS: 'mutikukwama_supply_orders_v1',
  PAYMENTS: 'mutikukwama_payments_v1',
  LOGS: 'mutikukwama_logs_v1',
  CONFIG: 'mutikukwama_config_v1',
  USERS: 'mutikukwama_users_list_v1',
  CURRENT_USER: 'mutikukwama_current_user_v1',
  USER_LOCATION: 'mutikukwama_user_location_v1',
  SEARCH_EVENTS: 'mutikukwama_search_events_v1',
  POLICY_CONSENTS: 'mutikukwama_policy_consents_v1',
  PASSWORD_RESETS: 'mutikukwama_password_resets_v1',
  SPONSORS: 'mutikukwama_sponsors_v1',
  REVIEWS: 'mutikukwama_reviews_v1',
  ANNOUNCEMENTS: 'mutikukwama_minsa_announcements_v1',
};

// Helper: Haversine distance in KM
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // 1 decimal place
}

class SupabaseDataService {
  private configSyncInitialized = false;

  constructor() {
    // Ensure all accounts are logged off by default so users must log in with password
    if (typeof window !== 'undefined') {
      try {
        const LOGOFF_KEY = 'mutikukwama_logoff_enforced_v1';
        if (!localStorage.getItem(LOGOFF_KEY)) {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          localStorage.setItem(LOGOFF_KEY, 'true');
        }
      } catch (e) {
        // ignore
      }

      // Cross-tab synchronization for global system config & payment channels
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEYS.CONFIG && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            window.dispatchEvent(new CustomEvent('mutikukwama:config-updated', { detail: parsed }));
          } catch {
            // ignore
          }
        }
      });

      // Initialize real-time cloud Firestore synchronization for system configuration
      this.initFirestoreConfigSync();
    }
  }

  private getStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return fallback;
    }
  }

  private setStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to storage:`, e);
    }
  }

  // --- Units ---
  getUnits(includeDepots = false): HealthUnit[] {
    const allUnits = this.getAllUnits();
    if (includeDepots) return allUnits;
    // Patient/Public safety: depósitos are strictly hidden from public view
    return allUnits.filter((u) => u.tipo !== 'deposito');
  }

  getAllUnits(): HealthUnit[] {
    const stored = this.getStorage<HealthUnit[]>(STORAGE_KEYS.UNITS, INITIAL_HEALTH_UNITS);
    const deletedIds = new Set(this.getStorage<string[]>(STORAGE_KEYS.DELETED_UNITS, []));
    const activeStored = stored.filter((u) => !deletedIds.has(u.id));
    const existingIds = new Set(activeStored.map((u) => u.id));
    let hasNew = false;
    const merged = [...activeStored];
    for (const initU of INITIAL_HEALTH_UNITS) {
      if (!existingIds.has(initU.id) && !deletedIds.has(initU.id)) {
        merged.push(initU);
        hasNew = true;
      }
    }
    if (hasNew || activeStored.length !== stored.length) {
      this.setStorage(STORAGE_KEYS.UNITS, merged);
    }
    return merged.map((u, idx) => {
      let emissao = u.documento_minsa_data_emissao;
      let validade = u.documento_minsa_validade;
      if (!emissao) {
        emissao = '2025-01-15';
      }
      if (!validade) {
        if (u.id === 'unit-2') {
          validade = '2026-09-28';
        } else if (u.id === 'unit-4') {
          validade = '2026-10-05';
        } else if (u.id === 'unit-5') {
          validade = '2026-08-15';
        } else if (u.id === 'unit-8') {
          validade = '2026-09-20';
        } else {
          validade = '2027-01-31';
        }
      }
      const cert = u.certificado_institucional || `CERT-MINSA-2025-${(idx + 1000).toString().slice(-4)}`;
      const docName = u.documento_minsa_nome || `alvara_minsa_${u.slug || u.id}.pdf`;
      const resp = u.responsavel_nome || (u.tipo === 'farmacia' ? 'Dra. Luísa Mendonça (Farmacêutica DT)' : u.tipo === 'clinica' || u.tipo === 'hospital' ? 'Dr. Paulo da Silva (Director Clínico)' : 'Dr. António Francisco (Responsável Técnico)');

      return {
        ...u,
        certificado_institucional: cert,
        documento_minsa_nome: docName,
        documento_minsa_data_emissao: emissao,
        documento_minsa_validade: validade,
        responsavel_nome: resp,
      };
    });
  }

  getUnitById(id: string): HealthUnit | undefined {
    const units = this.getAllUnits();
    return units.find((u) => u.id === id);
  }

  saveUnit(unit: HealthUnit): void {
    const units = this.getAllUnits();
    const index = units.findIndex((u) => u.id === unit.id);
    if (index >= 0) {
      units[index] = { ...unit, updated_at: new Date().toISOString() };
    } else {
      units.push(unit);
    }
    this.setStorage(STORAGE_KEYS.UNITS, units);
  }

  toggleUnitStatus(id: string, active: boolean): HealthUnit | null {
    const units = this.getAllUnits();
    const unit = units.find((u) => u.id === id);
    if (unit) {
      unit.plano_status = active ? 'ativo' : 'expirado';
      unit.updated_at = new Date().toISOString();
      this.setStorage(STORAGE_KEYS.UNITS, units);
      this.logActivity({
        acao: active ? 'Activação de Unidade' : 'Desactivação de Unidade',
        categoria: 'admin',
        usuario_id: 'admin',
        usuario_nome: 'Administrador do Sistema',
        usuario_role: 'admin',
        detalhes: `Unidade ${unit.nome} (${unit.id}) alterada para status ${unit.plano_status}`,
      });
      return unit;
    }
    return null;
  }

  // --- Unified Plan Limits & Resource Count ---
  getUnitPlanUsage(unitId: string): {
    totalItems: number;
    productCount: number;
    serviceCount: number;
    examCount: number;
    maxAllowed: number | 'ilimitado';
    isUnlimited: boolean;
    isLimitReached: boolean;
    availableSlots: number;
    planType: PlanType;
    planStatus: HealthUnit['plano_status'];
    isExpired: boolean;
    canAddMore: boolean;
    reason?: string;
  } {
    const unit = this.getUnitById(unitId);
    const products = this.getProducts().filter((p) => p.unidade_id === unitId);
    const services = this.getServices().filter((s) => s.unidade_id === unitId);
    const exams = this.getExams().filter((e) => e.unidade_id === unitId);

    const productCount = products.length;
    const serviceCount = services.length;
    const examCount = exams.length;
    const totalItems = productCount + serviceCount + examCount;

    if (!unit) {
      return {
        totalItems,
        productCount,
        serviceCount,
        examCount,
        maxAllowed: 50,
        isUnlimited: false,
        isLimitReached: true,
        availableSlots: 0,
        planType: 'basico',
        planStatus: 'cancelado',
        isExpired: true,
        canAddMore: false,
        reason: 'Unidade não encontrada no sistema.',
      };
    }

    const planType = unit.plano_tipo || 'basico';
    const planStatus = unit.plano_status || 'ativo';
    const expDate = unit.plano_data_expiracao ? new Date(unit.plano_data_expiracao) : new Date(Date.now() + 86400000);
    const isExpired = expDate.getTime() < Date.now() || planStatus !== 'ativo';

    const isUnlimited = planType === 'avancado' || unit.tipo === 'deposito';
    let maxAllowed: number | 'ilimitado' = 50;
    if (planType === 'medio') maxAllowed = 200;
    if (isUnlimited) maxAllowed = 'ilimitado';

    if (isExpired) {
      return {
        totalItems,
        productCount,
        serviceCount,
        examCount,
        maxAllowed,
        isUnlimited,
        isLimitReached: true,
        availableSlots: 0,
        planType,
        planStatus,
        isExpired: true,
        canAddMore: false,
        reason: 'O seu plano está inativo ou expirado. Regularize a subscrição para adicionar novos itens.',
      };
    }

    if (isUnlimited) {
      return {
        totalItems,
        productCount,
        serviceCount,
        examCount,
        maxAllowed: 'ilimitado',
        isUnlimited: true,
        isLimitReached: false,
        availableSlots: 999999,
        planType,
        planStatus,
        isExpired: false,
        canAddMore: true,
      };
    }

    const numericMax = maxAllowed as number;
    const isLimitReached = totalItems >= numericMax;
    const availableSlots = Math.max(0, numericMax - totalItems);

    return {
      totalItems,
      productCount,
      serviceCount,
      examCount,
      maxAllowed,
      isUnlimited: false,
      isLimitReached,
      availableSlots,
      planType,
      planStatus,
      isExpired: false,
      canAddMore: !isLimitReached,
      reason: isLimitReached
        ? `Limite do seu plano atingido (${totalItems} de ${numericMax} itens utilizados). Actualize para o Plano Avançado para produtos e serviços ilimitados.`
        : undefined,
    };
  }

  // --- Products, Services, Exams ---
  getProducts(): ProductItem[] {
    const stored = this.getStorage<ProductItem[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const existingIds = new Set(stored.map((p) => p.id));
    let hasNew = false;
    const merged = [...stored];
    for (const initP of INITIAL_PRODUCTS) {
      if (!existingIds.has(initP.id)) {
        merged.push(initP);
        hasNew = true;
      }
    }
    if (hasNew) {
      this.setStorage(STORAGE_KEYS.PRODUCTS, merged);
    }
    return merged;
  }

  getServices(): ServiceItem[] {
    const stored = this.getStorage<ServiceItem[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
    const existingIds = new Set(stored.map((s) => s.id));
    let hasNew = false;
    const merged = [...stored];
    for (const initS of INITIAL_SERVICES) {
      if (!existingIds.has(initS.id)) {
        merged.push(initS);
        hasNew = true;
      }
    }
    if (hasNew) {
      this.setStorage(STORAGE_KEYS.SERVICES, merged);
    }
    return merged;
  }

  getExams(): ExamItem[] {
    const stored = this.getStorage<ExamItem[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
    const existingIds = new Set(stored.map((e) => e.id));
    let hasNew = false;
    const merged = [...stored];
    for (const initE of INITIAL_EXAMS) {
      if (!existingIds.has(initE.id)) {
        merged.push(initE);
        hasNew = true;
      }
    }
    if (hasNew) {
      this.setStorage(STORAGE_KEYS.EXAMS, merged);
    }
    return merged;
  }

  saveProduct(product: ProductItem): { success: boolean; error?: string } {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);

    // If it's a new product, enforce plan limits
    if (index < 0) {
      const usage = this.getUnitPlanUsage(product.unidade_id);
      if (!usage.canAddMore) {
        return {
          success: false,
          error: usage.reason || 'Limite do seu plano atingido.',
        };
      }
      products.push({ ...product, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    } else {
      products[index] = { ...product, updated_at: new Date().toISOString() };
    }

    this.setStorage(STORAGE_KEYS.PRODUCTS, products);
    return { success: true };
  }

  saveService(service: ServiceItem): { success: boolean; error?: string } {
    const services = this.getServices();
    const index = services.findIndex((s) => s.id === service.id);

    if (index < 0) {
      const usage = this.getUnitPlanUsage(service.unidade_id);
      if (!usage.canAddMore) {
        return {
          success: false,
          error: usage.reason || 'Limite do seu plano atingido.',
        };
      }
      services.push({ ...service, created_at: new Date().toISOString() });
    } else {
      services[index] = { ...service };
    }

    this.setStorage(STORAGE_KEYS.SERVICES, services);
    return { success: true };
  }

  saveExam(exam: ExamItem): { success: boolean; error?: string } {
    const exams = this.getExams();
    const index = exams.findIndex((e) => e.id === exam.id);

    if (index < 0) {
      const usage = this.getUnitPlanUsage(exam.unidade_id);
      if (!usage.canAddMore) {
        return {
          success: false,
          error: usage.reason || 'Limite do seu plano atingido.',
        };
      }
      exams.push({ ...exam, created_at: new Date().toISOString() });
    } else {
      exams[index] = { ...exam };
    }

    this.setStorage(STORAGE_KEYS.EXAMS, exams);
    return { success: true };
  }

  deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    this.setStorage(STORAGE_KEYS.PRODUCTS, products);
  }

  deleteProducts(ids: string[]): number {
    const idSet = new Set(ids);
    const initial = this.getProducts();
    const remaining = initial.filter((p) => !idSet.has(p.id));
    const removedCount = initial.length - remaining.length;
    this.setStorage(STORAGE_KEYS.PRODUCTS, remaining);
    return removedCount;
  }

  clearUnitInventory(unidadeId: string): number {
    const initial = this.getProducts();
    const remaining = initial.filter((p) => p.unidade_id !== unidadeId);
    const removedCount = initial.length - remaining.length;
    this.setStorage(STORAGE_KEYS.PRODUCTS, remaining);
    return removedCount;
  }

  deleteService(id: string): void {
    const services = this.getServices().filter((s) => s.id !== id);
    this.setStorage(STORAGE_KEYS.SERVICES, services);
  }

  deleteExam(id: string): void {
    const exams = this.getExams().filter((e) => e.id !== id);
    this.setStorage(STORAGE_KEYS.EXAMS, exams);
  }

  adjustProductStock(id: string, delta: number): ProductItem | null {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === id);
    if (!prod) return null;
    const newStock = Math.max(0, prod.quantidade_stock + delta);
    prod.quantidade_stock = newStock;
    prod.disponivel = newStock > 0;
    prod.updated_at = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.PRODUCTS, products);
    return prod;
  }

  toggleProductAvailability(id: string): ProductItem | null {
    const products = this.getProducts();
    const prod = products.find((p) => p.id === id);
    if (!prod) return null;
    prod.disponivel = !prod.disponivel;
    prod.updated_at = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.PRODUCTS, products);
    return prod;
  }

  // Smart Search (Case-insensitive substring matching: e.g. "ibu" -> "Ibuprofeno")
  searchCatalog(options: {
    query?: string;
    category?: 'all' | 'medicamento' | 'servico' | 'exame';
    province?: string;
    municipality?: string;
    inStockOnly?: boolean;
    userLat?: number;
    userLng?: number;
    sortBy?: 'relevance' | 'price_low' | 'price_high' | 'distance';
    isB2BSearch?: boolean; // For pharmacies searching wholesale depots
  }): {
    products: ProductItem[];
    services: ServiceItem[];
    exams: ExamItem[];
    totalCount: number;
  } {
    const {
      query = '',
      category = 'all',
      province,
      municipality,
      inStockOnly = false,
      userLat,
      userLng,
      sortBy = 'relevance',
      isB2BSearch = false,
    } = options;

    const cleanQuery = query.toLowerCase().trim();
    const units = this.getAllUnits();
    const unitMap = new Map(units.map((u) => [u.id, u]));

    // Filter products
    let matchedProducts = this.getProducts().filter((prod) => {
      const unit = unitMap.get(prod.unidade_id);
      if (!unit) return false;

      // Depots filter: if not B2B search, depots must NEVER be shown
      if (!isB2BSearch && unit.tipo === 'deposito') return false;
      if (isB2BSearch && unit.tipo !== 'deposito') return false;

      // Province filter
      if (province && province !== 'all' && unit.provincia !== province) return false;
      // Municipality filter
      if (municipality && municipality !== 'all' && unit.municipio !== municipality) return false;
      // Stock filter
      if (inStockOnly && (!prod.disponivel || prod.quantidade_stock <= 0)) return false;

      // Category filter
      if (category !== 'all' && prod.categoria !== category) return false;

      // Substring match on name, generic name, category, or description
      if (cleanQuery) {
        const inName = prod.nome.toLowerCase().includes(cleanQuery);
        const inGeneric = prod.nome_generico?.toLowerCase().includes(cleanQuery);
        const inDesc = prod.descricao.toLowerCase().includes(cleanQuery);
        const inCat = prod.subcategoria?.toLowerCase().includes(cleanQuery);
        if (!inName && !inGeneric && !inDesc && !inCat) return false;
      }

      return true;
    });

    // Populate unit metadata and calculate distance
    matchedProducts = matchedProducts.map((p) => {
      const u = unitMap.get(p.unidade_id);
      let dist: number | undefined = undefined;
      if (userLat !== undefined && userLng !== undefined && u?.latitude && u?.longitude) {
        dist = calculateHaversineDistance(userLat, userLng, u.latitude, u.longitude);
      }
      return {
        ...p,
        unidade_nome: u?.nome || 'Unidade de Saúde',
        unidade_tipo: u?.tipo,
        unidade_provincia: u?.provincia,
        unidade_municipio: u?.municipio,
        unidade_bairro: u?.bairro,
        distancia_km: dist,
      };
    });

    // Sorting products
    matchedProducts.sort((a, b) => {
      const unitA = unitMap.get(a.unidade_id);
      const unitB = unitMap.get(b.unidade_id);

      // Advanced plan / Premium units always get priority visual boost
      const priorityA = unitA?.selo_premium ? 1 : 0;
      const priorityB = unitB?.selo_premium ? 1 : 0;

      if (sortBy === 'price_low') {
        return a.preco - b.preco;
      }
      if (sortBy === 'price_high') {
        return b.preco - a.preco;
      }
      if (sortBy === 'distance') {
        return (a.distancia_km ?? 9999) - (b.distancia_km ?? 9999);
      }
      // Default: relevance with premium tier boost
      if (priorityA !== priorityB) return priorityB - priorityA;
      return (b.visualizacoes || 0) - (a.visualizacoes || 0);
    });

    // Services
    let matchedServices: ServiceItem[] = [];
    if (category === 'all' || category === 'servico') {
      matchedServices = this.getServices().filter((s) => {
        const u = unitMap.get(s.unidade_id);
        if (!u || u.tipo === 'deposito') return false;
        if (province && province !== 'all' && u.provincia !== province) return false;
        if (cleanQuery) {
          const inName = s.nome.toLowerCase().includes(cleanQuery);
          const inEsp = s.especialidade.toLowerCase().includes(cleanQuery);
          const inDesc = s.descricao.toLowerCase().includes(cleanQuery);
          if (!inName && !inEsp && !inDesc) return false;
        }
        return true;
      }).map((s) => ({
        ...s,
        unidade_nome: unitMap.get(s.unidade_id)?.nome,
      }));
    }

    // Exams
    let matchedExams: ExamItem[] = [];
    if (category === 'all' || category === 'exame') {
      matchedExams = this.getExams().filter((e) => {
        const u = unitMap.get(e.unidade_id);
        if (!u || u.tipo === 'deposito') return false;
        if (province && province !== 'all' && u.provincia !== province) return false;
        if (cleanQuery) {
          const inName = e.nome.toLowerCase().includes(cleanQuery);
          const inDesc = e.descricao.toLowerCase().includes(cleanQuery);
          if (!inName && !inDesc) return false;
        }
        return true;
      }).map((e) => ({
        ...e,
        unidade_nome: unitMap.get(e.unidade_id)?.nome,
      }));
    }

    return {
      products: matchedProducts,
      services: matchedServices,
      exams: matchedExams,
      totalCount: matchedProducts.length + matchedServices.length + matchedExams.length,
    };
  }

  // --- Most Searched Items by Active Plan Quota (Avançado: 100, Médio: 50, Básico: 10) ---
  // REGRA GERAL: Os depósitos NÃO devem aparecer nas pesquisas dos utentes e nem na aba dos utentes
  getMostSearchedCatalog(options?: {
    query?: string;
    province?: string;
    municipality?: string;
    unitTypeFilter?: 'all' | 'farmacia' | 'clinica' | 'hospital' | 'centro_medico' | 'veterinaria' | 'consultorio' | 'laboratorio' | 'health_units' | 'depots' | string;
    itemType?: 'all' | 'medicamento' | 'servico' | 'exame';
    planFilter?: 'all' | 'avancado' | 'medio' | 'basico';
    userLat?: number;
    userLng?: number;
    sortBy?: 'popular' | 'price_low' | 'price_high' | 'distance';
    includeDepots?: boolean;
  }): {
    items: MostSearchedItem[];
    stats: {
      total: number;
      avancadoCount: number;
      medioCount: number;
      basicoCount: number;
      farmaciaCount: number;
      clinicaCount: number;
      hospitalCount: number;
      centroMedicoCount: number;
      veterinariaCount: number;
      consultorioCount: number;
      laboratorioCount: number;
      depotsCount: number;
      healthUnitsCount: number;
    };
  } {
    const {
      query = '',
      province = 'all',
      municipality = 'all',
      unitTypeFilter = 'all',
      itemType = 'all',
      planFilter = 'all',
      userLat,
      userLng,
      sortBy = 'popular',
      includeDepots = false,
    } = options || {};

    const cleanQuery = query.trim().toLowerCase();
    const allUnits = this.getAllUnits();
    const allProducts = this.getProducts();
    const allServices = this.getServices();
    const allExams = this.getExams();

    // Only active plans count
    const activeUnits = allUnits.filter((u) => u.plano_status === 'ativo');

    let allMostSearched: MostSearchedItem[] = [];

    activeUnits.forEach((unit) => {
      // REGRA GERAL: Depósitos grossistas NÃO aparecem nas pesquisas de utentes (apenas fornecimento B2B)
      if (!includeDepots && unit.tipo === 'deposito') {
        return;
      }

      // Quota: Avançado = 100, Médio = 50, Básico = 10
      let quota = 10;
      if (unit.plano_tipo === 'avancado') quota = 100;
      else if (unit.plano_tipo === 'medio') quota = 50;
      else quota = 10;

      const isDepot = unit.tipo === 'deposito';

      // Collect products
      const unitProds: MostSearchedItem[] = allProducts
        .filter((p) => p.unidade_id === unit.id)
        .map((p) => ({
          id: p.id,
          item_type: 'medicamento' as const,
          nome: p.nome,
          nome_generico: p.nome_generico,
          descricao: p.descricao,
          categoria: p.categoria,
          subcategoria: p.subcategoria,
          preco: p.preco,
          disponivel: p.disponivel && p.quantidade_stock > 0,
          quantidade_stock: p.quantidade_stock,
          visualizacoes: p.visualizacoes || (p.destaque ? 1200 : 450),
          destaque: p.destaque,
          unidade_id: unit.id,
          unidade: unit,
          plano_tipo: unit.plano_tipo,
          plano_limite_destaque: quota,
          is_deposito: isDepot,
        }));

      // Collect services
      const unitServices: MostSearchedItem[] = allServices
        .filter((s) => s.unidade_id === unit.id)
        .map((s) => ({
          id: s.id,
          item_type: 'servico' as const,
          nome: s.nome,
          descricao: s.descricao,
          categoria: 'servico',
          subcategoria: s.especialidade,
          preco: s.preco,
          disponivel: s.disponivel,
          duracao_minutos: s.duracao_minutos,
          visualizacoes: 800,
          destaque: false,
          unidade_id: unit.id,
          unidade: unit,
          plano_tipo: unit.plano_tipo,
          plano_limite_destaque: quota,
          is_deposito: isDepot,
        }));

      // Collect exams
      const unitExams: MostSearchedItem[] = allExams
        .filter((e) => e.unidade_id === unit.id)
        .map((e) => ({
          id: e.id,
          item_type: 'exame' as const,
          nome: e.nome,
          descricao: e.descricao,
          categoria: 'exame',
          subcategoria: e.tipo_exame,
          preco: e.preco,
          disponivel: e.disponivel,
          tempo_resultado_horas: e.tempo_resultado_horas,
          visualizacoes: 650,
          destaque: false,
          unidade_id: unit.id,
          unidade: unit,
          plano_tipo: unit.plano_tipo,
          plano_limite_destaque: quota,
          is_deposito: isDepot,
        }));

      // Merge and sort unit items by popularity
      const combinedUnitItems = [...unitProds, ...unitServices, ...unitExams].sort((a, b) => {
        if (a.destaque && !b.destaque) return -1;
        if (!a.destaque && b.destaque) return 1;
        return (b.visualizacoes || 0) - (a.visualizacoes || 0);
      });

      // Strict enforcement of plan quota: Avançado 100, Médio 50, Básico 10
      const quotaSlice = combinedUnitItems.slice(0, quota);
      allMostSearched.push(...quotaSlice);
    });

    // Compute distance if GPS user coordinates present
    allMostSearched = allMostSearched.map((item) => {
      let dist: number | undefined = undefined;
      if (userLat !== undefined && userLng !== undefined && item.unidade.latitude && item.unidade.longitude) {
        dist = calculateHaversineDistance(userLat, userLng, item.unidade.latitude, item.unidade.longitude);
      }
      return { ...item, distancia_km: dist };
    });

    // Compute stats across all permitted active quota items
    const stats = {
      total: allMostSearched.length,
      avancadoCount: allMostSearched.filter((i) => i.plano_tipo === 'avancado').length,
      medioCount: allMostSearched.filter((i) => i.plano_tipo === 'medio').length,
      basicoCount: allMostSearched.filter((i) => i.plano_tipo === 'basico').length,
      farmaciaCount: allMostSearched.filter((i) => i.unidade?.tipo === 'farmacia').length,
      clinicaCount: allMostSearched.filter((i) => i.unidade?.tipo === 'clinica').length,
      hospitalCount: allMostSearched.filter((i) => i.unidade?.tipo === 'hospital').length,
      centroMedicoCount: allMostSearched.filter((i) => i.unidade?.tipo === 'centro_medico').length,
      veterinariaCount: allMostSearched.filter((i) => i.unidade?.tipo === 'veterinaria').length,
      consultorioCount: allMostSearched.filter((i) => i.unidade?.tipo === 'consultorio').length,
      laboratorioCount: allMostSearched.filter((i) => i.unidade?.tipo === 'laboratorio').length,
      depotsCount: allMostSearched.filter((i) => i.is_deposito).length,
      healthUnitsCount: allMostSearched.filter((i) => !i.is_deposito).length,
    };

    // Filter by unitType (specific unit types, health_units or depots)
    let filtered = allMostSearched;
    if (unitTypeFilter === 'health_units') {
      filtered = filtered.filter((i) => !i.is_deposito);
    } else if (unitTypeFilter === 'depots') {
      filtered = filtered.filter((i) => i.is_deposito);
    } else if (unitTypeFilter !== 'all') {
      filtered = filtered.filter((i) => i.unidade?.tipo === unitTypeFilter);
    }

    // Filter by item category
    if (itemType !== 'all') {
      filtered = filtered.filter((i) => i.item_type === itemType);
    }

    // Filter by plan type
    if (planFilter !== 'all') {
      filtered = filtered.filter((i) => i.plano_tipo === planFilter);
    }

    // Filter by province & municipality
    if (province && province !== 'all') {
      filtered = filtered.filter((i) => i.unidade.provincia === province);
    }
    if (municipality && municipality !== 'all') {
      filtered = filtered.filter((i) => i.unidade.municipio === municipality);
    }

    // Filter by query
    if (cleanQuery) {
      filtered = filtered.filter((i) => {
        return (
          i.nome.toLowerCase().includes(cleanQuery) ||
          (i.nome_generico && i.nome_generico.toLowerCase().includes(cleanQuery)) ||
          i.descricao.toLowerCase().includes(cleanQuery) ||
          i.unidade.nome.toLowerCase().includes(cleanQuery) ||
          i.unidade.bairro.toLowerCase().includes(cleanQuery)
        );
      });
    }

    // Sorting: Units and items with Plano Avançado ativo ALWAYS appear first!
    filtered.sort((a, b) => {
      // Prioritize active Avançado (300) > Médio (200) > Básico (100)
      const getPlanScore = (item: MostSearchedItem) => {
        if (item.unidade?.plano_status === 'ativo') {
          if (item.plano_tipo === 'avancado') return 300;
          if (item.plano_tipo === 'medio') return 200;
          if (item.plano_tipo === 'basico') return 100;
        }
        return 0;
      };

      const scoreA = getPlanScore(a);
      const scoreB = getPlanScore(b);

      if (sortBy === 'price_low') {
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.preco - b.preco;
      }
      if (sortBy === 'price_high') {
        if (scoreA !== scoreB) return scoreB - scoreA;
        return b.preco - a.preco;
      }
      if (sortBy === 'distance') {
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (a.distancia_km ?? 9999) - (b.distancia_km ?? 9999);
      }
      // 'popular': rank by plan priority (Avançado strictly first) and views
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return (b.visualizacoes || 0) - (a.visualizacoes || 0);
    });

    return { items: filtered, stats };
  }

  // --- Most Searched Units (Unidades Mais Procuradas com prioridade para Plano Avançado Ativo) ---
  // REGRA GERAL: Os depósitos NÃO devem aparecer nas pesquisas dos utentes e nem na aba dos utentes
  getMostSearchedUnits(options?: {
    query?: string;
    province?: string;
    municipality?: string;
    unitTypeFilter?: 'all' | 'farmacia' | 'clinica' | 'hospital' | 'centro_medico' | 'veterinaria' | 'consultorio' | 'laboratorio' | 'health_units' | 'depots' | string;
    planFilter?: 'all' | 'avancado' | 'medio' | 'basico';
    userLat?: number;
    userLng?: number;
    sortBy?: 'popular' | 'rating' | 'distance' | 'orders';
    includeDepots?: boolean;
  }): {
    units: HealthUnit[];
    stats: {
      total: number;
      avancadoCount: number;
      medioCount: number;
      basicoCount: number;
      farmaciaCount: number;
      clinicaCount: number;
      hospitalCount: number;
      centroMedicoCount: number;
      veterinariaCount: number;
      consultorioCount: number;
      laboratorioCount: number;
      depotsCount: number;
      healthUnitsCount: number;
    };
  } {
    const {
      query = '',
      province = 'all',
      municipality = 'all',
      unitTypeFilter = 'all',
      planFilter = 'all',
      userLat,
      userLng,
      sortBy = 'popular',
      includeDepots = false,
    } = options || {};

    const allUnits = this.getAllUnits();
    // Only units with active subscription
    const activeUnits = allUnits.filter((u) => u.plano_status === 'ativo');

    // REGRA GERAL: Por padrão, os depósitos grossistas NÃO aparecem nas pesquisas de utentes
    const visibleUnits = includeDepots ? activeUnits : activeUnits.filter((u) => u.tipo !== 'deposito');

    const stats = {
      total: visibleUnits.length,
      avancadoCount: visibleUnits.filter((u) => u.plano_tipo === 'avancado').length,
      medioCount: visibleUnits.filter((u) => u.plano_tipo === 'medio').length,
      basicoCount: visibleUnits.filter((u) => u.plano_tipo === 'basico').length,
      farmaciaCount: visibleUnits.filter((u) => u.tipo === 'farmacia').length,
      clinicaCount: visibleUnits.filter((u) => u.tipo === 'clinica').length,
      hospitalCount: visibleUnits.filter((u) => u.tipo === 'hospital').length,
      centroMedicoCount: visibleUnits.filter((u) => u.tipo === 'centro_medico').length,
      veterinariaCount: visibleUnits.filter((u) => u.tipo === 'veterinaria').length,
      consultorioCount: visibleUnits.filter((u) => u.tipo === 'consultorio').length,
      laboratorioCount: visibleUnits.filter((u) => u.tipo === 'laboratorio').length,
      depotsCount: includeDepots ? activeUnits.filter((u) => u.tipo === 'deposito').length : 0,
      healthUnitsCount: visibleUnits.filter((u) => u.tipo !== 'deposito').length,
    };

    let filtered = [...visibleUnits];

    // Filter by unit type
    if (unitTypeFilter === 'health_units') {
      filtered = filtered.filter((u) => u.tipo !== 'deposito');
    } else if (unitTypeFilter === 'depots') {
      if (includeDepots) {
        filtered = filtered.filter((u) => u.tipo === 'deposito');
      } else {
        filtered = [];
      }
    } else if (unitTypeFilter !== 'all') {
      filtered = filtered.filter((u) => u.tipo === unitTypeFilter);
    }

    // Filter by plan type
    if (planFilter !== 'all') {
      filtered = filtered.filter((u) => u.plano_tipo === planFilter);
    }

    // Filter by province & municipality
    if (province && province !== 'all') {
      filtered = filtered.filter((u) => u.provincia === province);
    }
    if (municipality && municipality !== 'all') {
      filtered = filtered.filter((u) => u.municipio === municipality);
    }

    // Filter by query
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.nome.toLowerCase().includes(q) ||
          u.bairro.toLowerCase().includes(q) ||
          u.municipio.toLowerCase().includes(q) ||
          u.provincia.toLowerCase().includes(q) ||
          (u.descricao && u.descricao.toLowerCase().includes(q))
      );
    }

    // Calculate distance
    filtered = filtered.map((u) => {
      let dist: number | undefined = undefined;
      if (userLat !== undefined && userLng !== undefined && u.latitude && u.longitude) {
        dist = calculateHaversineDistance(userLat, userLng, u.latitude, u.longitude);
      }
      return { ...u, distancia_km: dist };
    });

    // Mandatory rule: As unidades com Plano Avançado ativo aparecem PRIMEIRO!
    filtered.sort((a, b) => {
      const getPlanScore = (u: HealthUnit) => {
        if (u.plano_status === 'ativo') {
          if (u.plano_tipo === 'avancado') return 300;
          if (u.plano_tipo === 'medio') return 200;
          if (u.plano_tipo === 'basico') return 100;
        }
        return 0;
      };

      const planA = getPlanScore(a);
      const planB = getPlanScore(b);

      // Avançado (300) > Médio (200) > Básico (100)
      if (planA !== planB) {
        return planB - planA;
      }

      // Secondary sorting within the same plan tier
      if (sortBy === 'distance' && userLat !== undefined && userLng !== undefined) {
        return (a.distancia_km ?? 9999) - (b.distancia_km ?? 9999);
      }
      if (sortBy === 'rating') {
        return (b.avaliacao || 0) - (a.avaliacao || 0);
      }
      if (sortBy === 'orders') {
        return (b.total_pedidos || 0) - (a.total_pedidos || 0);
      }

      // Default: Most viewed / most searched
      return (b.visualizacoes || 0) - (a.visualizacoes || 0);
    });

    return { units: filtered, stats };
  }

  // --- Orders ---
  getOrders(): Order[] {
    const orders = this.getStorage<Order[]>(STORAGE_KEYS.ORDERS, []);
    if (!orders || orders.length === 0) {
      this.setStorage(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
    // Clean out any legacy depot test orders assigned to patient
    const cleaned = orders.filter((o) => {
      const isDepotOrder =
        (o.unidade_nome && o.unidade_nome.toLowerCase().includes('depósito')) ||
        (o.itens && o.itens.some((i) => i.nome.toLowerCase().includes('b2b') || i.nome.toLowerCase().includes('fardo')));
      if (isDepotOrder && (o.paciente_id === 'user-paciente' || !o.unidade_id.startsWith('b2b-client'))) {
        return false;
      }
      return true;
    });
    if (cleaned.length !== orders.length) {
      this.setStorage(STORAGE_KEYS.ORDERS, cleaned);
      return cleaned;
    }
    return orders;
  }

  getOrdersByPatient(pacienteId?: string, pacienteEmail?: string): Order[] {
    const all = this.getOrders();
    const allUnits = this.getAllUnits();
    const unitMap = new Map(allUnits.map((u) => [u.id, u]));

    // REGRA GERAL: Os depósitos NÃO devem aparecer na aba dos utentes!
    // Depósitos e lotes B2B pertencem exclusivamente ao canal institucional entre farmácias e fornecedores.
    const patientOrders = all.filter((o) => {
      const unit = unitMap.get(o.unidade_id);
      if (unit && unit.tipo === 'deposito') return false;
      if (o.unidade_nome && o.unidade_nome.toLowerCase().includes('depósito')) return false;
      if (o.itens && o.itens.some((i) => i.nome.toLowerCase().includes('b2b') || i.nome.toLowerCase().includes('fardo'))) return false;
      return true;
    });

    if (!pacienteId && !pacienteEmail) return patientOrders;
    return patientOrders.filter(
      (o) =>
        (pacienteId && (o.paciente_id === pacienteId || o.paciente_id === 'user-paciente')) ||
        (pacienteEmail && o.paciente_email?.toLowerCase() === pacienteEmail.toLowerCase())
    );
  }

  createOrder(orderData: Omit<Order, 'id' | 'codigo_pedido' | 'created_at' | 'updated_at'>): Order {
    const orders = this.getOrders();
    const randomCode = 'MUT-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder: Order = {
      ...orderData,
      id: 'ord-' + Date.now(),
      codigo_pedido: randomCode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    orders.unshift(newOrder);
    this.setStorage(STORAGE_KEYS.ORDERS, orders);

    // Increment unit metrics
    const unit = this.getUnitById(newOrder.unidade_id);
    if (unit) {
      unit.total_pedidos = (unit.total_pedidos || 0) + 1;
      this.saveUnit(unit);
    }

    // Log activity
    this.logActivity({
      acao: 'Novo Pedido Criado',
      categoria: 'pedido',
      usuario_id: newOrder.paciente_id || 'anonimo',
      usuario_nome: newOrder.paciente_nome,
      usuario_role: 'paciente',
      detalhes: `Pedido ${newOrder.codigo_pedido} criado para ${newOrder.unidade_nome} no valor de ${newOrder.total.toLocaleString()} AOA (${newOrder.modalidade})`,
    });

    return newOrder;
  }

  updateOrderStatus(orderId: string, status: Order['status']): Order | null {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
      this.setStorage(STORAGE_KEYS.ORDERS, orders);

      this.logActivity({
        acao: 'Estado do Pedido Alterado',
        categoria: 'pedido',
        usuario_id: order.unidade_id,
        usuario_nome: order.unidade_nome,
        usuario_role: 'unidade',
        detalhes: `Pedido ${order.codigo_pedido} atualizado para status '${status}'`,
      });
      return order;
    }
    return null;
  }

  // --- Reviews & Ratings (Atribuição de Estrelas e Avaliações pelo Utente) ---
  getReviews(unidade_id?: string): UnitReview[] {
    const reviews = this.getStorage<UnitReview[]>(STORAGE_KEYS.REVIEWS, []);
    if (!reviews || reviews.length === 0) {
      this.setStorage(STORAGE_KEYS.REVIEWS, INITIAL_REVIEWS);
      return unidade_id ? INITIAL_REVIEWS.filter((r) => r.unidade_id === unidade_id) : INITIAL_REVIEWS;
    }
    if (unidade_id) {
      return reviews.filter((r) => r.unidade_id === unidade_id);
    }
    return reviews;
  }

  rateUnit(params: {
    unidade_id: string;
    estrelas: number;
    comentario?: string;
    paciente_id?: string;
    paciente_nome: string;
    paciente_avatar?: string;
    pedido_id?: string;
    consulta_id?: string;
    tipo_atendimento?: 'pedido' | 'consulta' | 'exame' | 'geral';
  }): { review: UnitReview; updatedUnit: HealthUnit | null } {
    const {
      unidade_id,
      estrelas,
      comentario = '',
      paciente_id,
      paciente_nome,
      paciente_avatar,
      pedido_id,
      consulta_id,
      tipo_atendimento = 'pedido',
    } = params;

    const clampedStars = Math.max(1, Math.min(5, Math.round(estrelas)));
    const allReviews = this.getReviews();
    const unit = this.getUnitById(unidade_id);

    const newReview: UnitReview = {
      id: 'rev-' + Date.now(),
      unidade_id,
      unidade_nome: unit?.nome || 'Unidade de Saúde',
      paciente_id,
      paciente_nome: paciente_nome || 'Utente Verificado',
      paciente_avatar: paciente_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      pedido_id,
      consulta_id,
      estrelas: clampedStars,
      comentario,
      tipo_atendimento,
      created_at: new Date().toISOString(),
    };

    allReviews.unshift(newReview);
    this.setStorage(STORAGE_KEYS.REVIEWS, allReviews);

    // Update unit rating and total count
    let updatedUnit: HealthUnit | null = null;
    if (unit) {
      const currentReviewsCount = unit.total_avaliacoes || 0;
      const currentRating = unit.avaliacao || 5.0;
      const newTotal = currentReviewsCount + 1;
      const newAvg = Number(((currentRating * currentReviewsCount + clampedStars) / newTotal).toFixed(2));

      unit.avaliacao = newAvg;
      unit.total_avaliacoes = newTotal;
      this.saveUnit(unit);
      updatedUnit = unit;
    }

    // If linked to an order, mark the order as reviewed
    if (pedido_id) {
      const orders = this.getOrders();
      const order = orders.find((o) => o.id === pedido_id || o.codigo_pedido === pedido_id);
      if (order) {
        order.avaliado = true;
        order.avaliacao_estrelas = clampedStars;
        order.avaliacao_comentario = comentario;
        order.avaliacao_data = new Date().toISOString();
        this.setStorage(STORAGE_KEYS.ORDERS, orders);
      }
    }

    this.logActivity({
      acao: 'Nova Avaliação com Estrelas',
      categoria: 'avaliacao',
      usuario_id: paciente_id || 'paciente',
      usuario_nome: paciente_nome,
      usuario_role: 'paciente',
      detalhes: `Utente ${paciente_nome} atribuiu ${clampedStars} estrelas à unidade ${unit?.nome || unidade_id}${comentario ? `: "${comentario.slice(0, 50)}..."` : ''}`,
    });

    return { review: newReview, updatedUnit };
  }

  // --- B2B Supply Orders (Pedidos de Abastecimento Farmacêutico) ---
  getSupplyOrders(unitOrDepotId?: string): SupplyOrder[] {
    const defaultSupplyOrders: SupplyOrder[] = [
      {
        id: 'supp-1',
        codigo_pedido: 'ABAST-2026-081',
        tipo: 'pedido_abastecimento',
        unidade_compradora_id: 'unit-1',
        unidade_compradora_nome: 'Farmácia Luanda Saúde Central',
        unidade_compradora_provincia: 'Luanda',
        unidade_compradora_telefone: '+244 923 111 222',
        unidade_compradora_email: 'contacto@luandasaude.ao',
        deposito_fornecedor_id: 'unit-depot-1',
        deposito_fornecedor_nome: 'Depósito Central Grossista de Medicamentos Luanda',
        deposito_fornecedor_provincia: 'Luanda',
        deposito_fornecedor_telefone: '+244 923 999 000',
        itens: [
          {
            id: 'item-s-1',
            produto_id: 'prod-1',
            nome: 'Paracetamol 500mg (Caixa 50 Blisters)',
            categoria: 'Analgésicos e Antipiréticos',
            quantidade_caixas: 20,
            unidades_por_caixa: 50,
            preco_unitario_caixa: 15000,
            subtotal: 300000,
          },
          {
            id: 'item-s-2',
            produto_id: 'prod-2',
            nome: 'Coartem 80/480mg (Caixa 30 Tratamentos)',
            categoria: 'Antimaláricos',
            quantidade_caixas: 15,
            unidades_por_caixa: 30,
            preco_unitario_caixa: 38000,
            subtotal: 570000,
          },
        ],
        valor_total: 870000,
        notas: 'Entrega urgente para reposição de stock da farmácia de plantão 24H.',
        status: 'em_preparacao',
        data_pedido: '2026-09-01T08:30:00Z',
      },
      {
        id: 'supp-2',
        codigo_pedido: 'ABAST-2026-082',
        tipo: 'pedido_abastecimento',
        unidade_compradora_id: 'unit-6',
        unidade_compradora_nome: 'Farmácia Benguela Vida - Praia Morena',
        unidade_compradora_provincia: 'Benguela',
        deposito_fornecedor_id: 'unit-depot-2',
        deposito_fornecedor_nome: 'Depósito Farmacêutico do Sul - Lobito',
        deposito_fornecedor_provincia: 'Benguela',
        itens: [
          {
            id: 'item-s-3',
            produto_id: 'prod-3',
            nome: 'Amoxicilina + Ácido Clavulânico 1g (Caixa 20 Frascos/Caixas)',
            categoria: 'Antibióticos',
            quantidade_caixas: 10,
            unidades_por_caixa: 20,
            preco_unitario_caixa: 45000,
            subtotal: 450000,
          },
        ],
        valor_total: 450000,
        status: 'concluido',
        data_pedido: '2026-08-28T14:15:00Z',
      },
    ];

    const all = this.getStorage<SupplyOrder[]>(STORAGE_KEYS.SUPPLY_ORDERS, defaultSupplyOrders);
    if (!unitOrDepotId) return all;
    return all.filter(
      (o) => o.unidade_compradora_id === unitOrDepotId || o.deposito_fornecedor_id === unitOrDepotId
    );
  }

  createSupplyOrder(orderData: {
    unidade_compradora_id: string;
    deposito_fornecedor_id: string;
    itens: SupplyOrder['itens'];
    notas?: string;
  }): { success: boolean; order?: SupplyOrder; error?: string } {
    // Role validation: Paciente cannot create supply orders
    const currentUser = this.getCurrentUser();
    if (!currentUser || currentUser.role === 'paciente') {
      return {
        success: false,
        error: 'Acesso negado. Apenas unidades de saúde credenciadas e depósitos podem emitir pedidos de abastecimento B2B.',
      };
    }

    const buyer = this.getUnitById(orderData.unidade_compradora_id);
    const depot = this.getUnitById(orderData.deposito_fornecedor_id);

    if (!buyer || !depot) {
      return {
        success: false,
        error: 'Unidade compradora ou depósito grossista não encontrado.',
      };
    }

    if (depot.tipo !== 'deposito') {
      return {
        success: false,
        error: 'A unidade de destino selecionada não é um depósito grossista homologado.',
      };
    }

    const totalValue = orderData.itens.reduce((acc, item) => acc + item.subtotal, 0);
    const code = 'ABAST-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

    const newSupplyOrder: SupplyOrder = {
      id: 'supp-' + Date.now(),
      codigo_pedido: code,
      tipo: 'pedido_abastecimento',
      unidade_compradora_id: buyer.id,
      unidade_compradora_nome: buyer.nome,
      unidade_compradora_provincia: buyer.provincia,
      unidade_compradora_telefone: buyer.telefone,
      unidade_compradora_email: buyer.email,
      deposito_fornecedor_id: depot.id,
      deposito_fornecedor_nome: depot.nome,
      deposito_fornecedor_provincia: depot.provincia,
      deposito_fornecedor_telefone: depot.telefone,
      itens: orderData.itens,
      valor_total: totalValue,
      notas: orderData.notas,
      status: 'pendente',
      data_pedido: new Date().toISOString(),
    };

    const orders = this.getSupplyOrders();
    orders.unshift(newSupplyOrder);
    this.setStorage(STORAGE_KEYS.SUPPLY_ORDERS, orders);

    this.logActivity({
      acao: 'Pedido de Abastecimento B2B Criado',
      categoria: 'pedido',
      usuario_id: buyer.id,
      usuario_nome: buyer.nome,
      usuario_role: 'unidade',
      detalhes: `Pedido ${newSupplyOrder.codigo_pedido} para o depósito ${depot.nome} no valor de ${totalValue.toLocaleString()} AOA (${orderData.itens.length} itens)`,
    });

    return { success: true, order: newSupplyOrder };
  }

  updateSupplyOrderStatus(
    orderId: string,
    status: SupplyOrderStatus,
    reason?: string
  ): SupplyOrder | null {
    const orders = this.getSupplyOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.data_atualizacao = new Date().toISOString();
      if (reason) order.motivo_recusa = reason;
      this.setStorage(STORAGE_KEYS.SUPPLY_ORDERS, orders);

      this.logActivity({
        acao: 'Estado do Pedido B2B Atualizado',
        categoria: 'pedido',
        usuario_id: order.deposito_fornecedor_id,
        usuario_nome: order.deposito_fornecedor_nome,
        usuario_role: 'deposito',
        detalhes: `Pedido de Abastecimento ${order.codigo_pedido} alterado para status '${status}'`,
      });

      return order;
    }
    return null;
  }

  // --- INSTITUTIONAL INTELLIGENCE ENGINE (MINISTÉRIO DA SAÚDE) ---
  // Strictly aggregated and anonymized. Absolutely NO individual patient data.
  getInstitutionalData(filters?: {
    period?: 'today' | '7days' | '30days' | '3months' | '6months' | '12months' | 'custom';
    customStartDate?: string;
    customEndDate?: string;
    province?: string;
    municipality?: string;
    category?: string;
    therapeuticCategory?: string;
    unitId?: string;
  }): InstitutionalAggregateData {
    const period = filters?.period || '30days';
    const provinceFilter = filters?.province || 'all';
    const categoryFilter = filters?.category || 'all';

    const units = this.getUnits(true); // Include all verified health actors
    const products = this.getProducts();
    const services = this.getServices();
    const exams = this.getExams();
    const orders = this.getOrders();

    // Multiplier for timeframe calculations
    let multiplier = 1;
    let timeLabel = 'Últimos 30 dias';
    if (period === 'today') { multiplier = 0.04; timeLabel = 'Hoje'; }
    else if (period === '7days') { multiplier = 0.25; timeLabel = 'Últimos 7 dias'; }
    else if (period === '30days') { multiplier = 1.0; timeLabel = 'Últimos 30 dias'; }
    else if (period === '3months') { multiplier = 2.8; timeLabel = 'Últimos 3 meses'; }
    else if (period === '6months') { multiplier = 5.5; timeLabel = 'Últimos 6 meses'; }
    else if (period === '12months') { multiplier = 11.2; timeLabel = 'Últimos 12 meses'; }
    else if (period === 'custom') { multiplier = 1.2; timeLabel = 'Período Personalizado'; }

    // Aggregate baseline calculations
    const baseSearches = Math.round(18420 * multiplier);
    const searchesMed = Math.round(baseSearches * 0.62);
    const searchesServ = Math.round(baseSearches * 0.22);
    const searchesExams = Math.round(baseSearches * 0.16);

    const activeUsers = Math.round(8940 * Math.min(1.5, Math.max(0.2, multiplier * 0.6)));
    const activeUnits = units.length;
    const availableProducts = products.filter((p) => p.disponivel && p.quantidade_stock > 0).length;
    const outOfStockMeds = products.filter((p) => !p.disponivel || p.quantidade_stock === 0).length + 14;

    const baseOrders = Math.round((orders.length * 48 + 320) * multiplier);
    const completedOrders = Math.round(baseOrders * 0.88);
    const rejectedOrders = Math.round(baseOrders * 0.07);
    const acceptanceRate = 93.2; // %
    const completionRate = 88.4; // %
    const avgResponseTime = '14 min';
    const avgCompletionTime = '48 min';
    const demandGrowthPct = 21.4;
    const supplyGrowthPct = 14.8;
    const generalAvailabilityIndex = 82.6; // %

    // --- 20 OFFICIAL MINSA METRIC KPIS ---
    const indicadores: IndicatorMetric[] = [
      {
        id: 'kpi-1',
        titulo: 'Total de Pesquisas Realizadas',
        valor_atual: baseSearches.toLocaleString('pt-PT'),
        valor_anterior: Math.round(baseSearches * 0.82).toLocaleString('pt-PT'),
        variacao_percentual: 21.4,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'procura',
        descricao: 'Volume global de buscas por medicamentos, exames e consultas no ecossistema',
      },
      {
        id: 'kpi-2',
        titulo: 'Medicamentos Pesquisados',
        valor_atual: searchesMed.toLocaleString('pt-PT'),
        valor_anterior: Math.round(searchesMed * 0.84).toLocaleString('pt-PT'),
        variacao_percentual: 19.2,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'procura',
        descricao: 'Consultas dirigidas a produtos farmacêuticos e especialidades médicas',
      },
      {
        id: 'kpi-3',
        titulo: 'Serviços Médicos Pesquisados',
        valor_atual: searchesServ.toLocaleString('pt-PT'),
        valor_anterior: Math.round(searchesServ * 0.79).toLocaleString('pt-PT'),
        variacao_percentual: 26.5,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'procura',
        descricao: 'Consultas por especialidades (Pediatria, Cardiologia, Ginecologia, etc.)',
      },
      {
        id: 'kpi-4',
        titulo: 'Exames Pesquisados',
        valor_atual: searchesExams.toLocaleString('pt-PT'),
        valor_anterior: Math.round(searchesExams * 0.85).toLocaleString('pt-PT'),
        variacao_percentual: 17.6,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'procura',
        descricao: 'Procura por análises clínicas, imagiologia e exames laboratoriais',
      },
      {
        id: 'kpi-5',
        titulo: 'Utentes Ativos na Plataforma',
        valor_atual: activeUsers.toLocaleString('pt-PT'),
        valor_anterior: Math.round(activeUsers * 0.88).toLocaleString('pt-PT'),
        variacao_percentual: 13.6,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'operacional',
        descricao: 'Cidadãos que realizaram pesquisas ou pedidos no período',
      },
      {
        id: 'kpi-6',
        titulo: 'Unidades Sanitárias Ativas',
        valor_atual: activeUnits,
        valor_anterior: Math.max(1, activeUnits - 2),
        variacao_percentual: 8.5,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'operacional',
        descricao: 'Farmácias, hospitais, clínicas e laboratórios com inventário online',
      },
      {
        id: 'kpi-7',
        titulo: 'Produtos com Stock Disponível',
        valor_atual: availableProducts,
        valor_anterior: Math.max(1, availableProducts - 6),
        variacao_percentual: 12.0,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'disponibilidade',
        descricao: 'Linhas de medicamentos e insumos disponíveis para atendimento imediato',
      },
      {
        id: 'kpi-8',
        titulo: 'Medicamentos sem Disponibilidade',
        valor_atual: outOfStockMeds,
        valor_anterior: outOfStockMeds + 4,
        variacao_percentual: -18.2,
        tipo_variacao: 'reducao',
        sentido_positivo: true, // Redução de falta é positivo!
        categoria_kpi: 'disponibilidade',
        descricao: 'Itens pesquisados pelos utentes que não apresentaram unidades com stock',
      },
      {
        id: 'kpi-9',
        titulo: 'Total de Pedidos Realizados',
        valor_atual: baseOrders.toLocaleString('pt-PT'),
        valor_anterior: Math.round(baseOrders * 0.86).toLocaleString('pt-PT'),
        variacao_percentual: 16.3,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'operacional',
        descricao: 'Pedidos de reserva, entrega e atendimento gerados pelos utentes',
      },
      {
        id: 'kpi-10',
        titulo: 'Pedidos Concluídos com Sucesso',
        valor_atual: completedOrders.toLocaleString('pt-PT'),
        valor_anterior: Math.round(completedOrders * 0.85).toLocaleString('pt-PT'),
        variacao_percentual: 17.4,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'operacional',
        descricao: 'Pedidos entregues ou levantados presencialmente com sucesso',
      },
      {
        id: 'kpi-11',
        titulo: 'Pedidos Recusados / Cancelados',
        valor_atual: rejectedOrders.toLocaleString('pt-PT'),
        valor_anterior: Math.round(rejectedOrders * 1.25).toLocaleString('pt-PT'),
        variacao_percentual: -20.0,
        tipo_variacao: 'reducao',
        sentido_positivo: true, // Redução de recusa é positivo!
        categoria_kpi: 'operacional',
        descricao: 'Pedidos não concretizados por rutura de stock ou cancelamento do utente',
      },
      {
        id: 'kpi-12',
        titulo: 'Taxa de Aceitação de Pedidos',
        valor_atual: `${acceptanceRate}%`,
        valor_anterior: '89.5%',
        variacao_percentual: 4.1,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'operacional',
        descricao: 'Percentual de solicitações prontamente acolhidas pelas farmácias',
      },
      {
        id: 'kpi-13',
        titulo: 'Taxa Geral de Conclusão',
        valor_atual: `${completionRate}%`,
        valor_anterior: '84.1%',
        variacao_percentual: 5.1,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'operacional',
        descricao: 'Relação entre pedidos recebidos e atendimentos integralmente concluídos',
      },
      {
        id: 'kpi-14',
        titulo: 'Tempo Médio de Resposta',
        valor_atual: avgResponseTime,
        valor_anterior: '19 min',
        variacao_percentual: -26.3,
        tipo_variacao: 'reducao',
        sentido_positivo: true, // Menor tempo de resposta é positivo!
        categoria_kpi: 'operacional',
        descricao: 'Tempo decorrido entre o envio do pedido e a confirmação pela unidade',
      },
      {
        id: 'kpi-15',
        titulo: 'Tempo Médio até Conclusão',
        valor_atual: avgCompletionTime,
        valor_anterior: '62 min',
        variacao_percentual: -22.5,
        tipo_variacao: 'reducao',
        sentido_positivo: true, // Menor tempo até conclusão é positivo!
        categoria_kpi: 'operacional',
        descricao: 'Tempo total entre o pedido inicial e a entrega / dispensa final ao utente',
      },
      {
        id: 'kpi-16',
        titulo: 'Crescimento da Procura',
        valor_atual: `+${demandGrowthPct}%`,
        valor_anterior: '+15.2%',
        variacao_percentual: 40.8,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'procura',
        descricao: 'Aceleração da procura populacional em relação ao ciclo anterior',
      },
      {
        id: 'kpi-17',
        titulo: 'Crescimento da Disponibilidade',
        valor_atual: `+${supplyGrowthPct}%`,
        valor_anterior: '+8.9%',
        variacao_percentual: 66.3,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'disponibilidade',
        descricao: 'Entrada de novos lotes e aumento da cobertura do inventário',
      },
      {
        id: 'kpi-18',
        titulo: 'Unidades Ativas por Região',
        valor_atual: `${units.filter((u) => u.provincia === (provinceFilter === 'all' ? 'Luanda' : provinceFilter)).length} (${provinceFilter === 'all' ? 'Luanda Principal' : provinceFilter})`,
        valor_anterior: '4 unidades',
        variacao_percentual: 25.0,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'regional',
        descricao: 'Densidade de estabelecimentos farmacêuticos registados no território',
      },
      {
        id: 'kpi-19',
        titulo: 'Produtos Disponíveis na Região',
        valor_atual: `${Math.round(availableProducts * (provinceFilter === 'all' ? 0.7 : 0.35))} itens`,
        valor_anterior: '18 itens',
        variacao_percentual: 16.7,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'regional',
        descricao: 'Sortimento activo e disponível no polo geográfico selecionado',
      },
      {
        id: 'kpi-20',
        titulo: 'Índice de Disponibilidade Geral',
        valor_atual: `${generalAvailabilityIndex}%`,
        valor_anterior: '76.4%',
        variacao_percentual: 8.1,
        tipo_variacao: 'aumento',
        sentido_positivo: true,
        categoria_kpi: 'disponibilidade',
        descricao: 'Taxa de satisfação imediata de stock para o total de consultas nacionais',
      },
    ];

    // --- PROVINCES MAP DATA (ALL 21 PROVINCES OF ANGOLA) ---
    const provinceMultipliers: Record<string, { factor: number; level: 'baixo' | 'medio' | 'elevado' | 'muito_elevado'; trend: number }> = {
      Luanda: { factor: 0.48, level: 'muito_elevado', trend: 28 },
      'Icolo Bengo': { factor: 0.04, level: 'medio', trend: 14 },
      Benguela: { factor: 0.13, level: 'elevado', trend: 18 },
      Huambo: { factor: 0.10, level: 'elevado', trend: 15 },
      Huíla: { factor: 0.07, level: 'medio', trend: 12 },
      Cabinda: { factor: 0.04, level: 'medio', trend: 9 },
      'Cuanza Sul': { factor: 0.03, level: 'medio', trend: 6 },
      'Cuanza Norte': { factor: 0.015, level: 'baixo', trend: -2 },
      Uíge: { factor: 0.015, level: 'baixo', trend: 4 },
      Malanje: { factor: 0.012, level: 'baixo', trend: 3 },
      Zaire: { factor: 0.008, level: 'baixo', trend: 2 },
      Bié: { factor: 0.007, level: 'baixo', trend: 1 },
      Moxico: { factor: 0.005, level: 'baixo', trend: -4 },
      'Moxico Leste': { factor: 0.004, level: 'baixo', trend: 5 },
      Namibe: { factor: 0.005, level: 'baixo', trend: 2 },
      'Lunda Norte': { factor: 0.004, level: 'baixo', trend: 0 },
      'Lunda Sul': { factor: 0.003, level: 'baixo', trend: -1 },
      Cunene: { factor: 0.003, level: 'baixo', trend: -3 },
      'Cuando Cubango': { factor: 0.002, level: 'baixo', trend: -5 },
      Kuando: { factor: 0.002, level: 'baixo', trend: 4 },
      Bengo: { factor: 0.002, level: 'baixo', trend: 1 },
    };

    const provincias_mapa: ProvinceMapData[] = PROVINCES_ANGOLA.map((prov) => {
      const info = provinceMultipliers[prov] || { factor: 0.01, level: 'baixo', trend: 0 };
      const provSearches = Math.max(25, Math.round(baseSearches * info.factor));
      const provOrders = Math.max(3, Math.round(baseOrders * info.factor));
      const provUnits = units.filter((u) => u.provincia === prov);

      return {
        id: prov.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
        nome: prov,
        total_pesquisas: provSearches,
        total_pedidos: provOrders,
        unidades_activas: provUnits.length || (info.factor > 0.05 ? 3 : 1),
        farmacias_activas: provUnits.filter((u) => u.tipo === 'farmacia').length || (info.factor > 0.05 ? 2 : 1),
        hospitais_activos: provUnits.filter((u) => u.tipo === 'hospital').length || 1,
        depositos_activos: provUnits.filter((u) => u.tipo === 'deposito').length,
        produtos_disponiveis: Math.max(12, Math.round(availableProducts * (info.factor * 1.5 + 0.1))),
        indice_disponibilidade: Math.min(98, Math.max(45, Math.round(75 + info.trend * 0.4))),
        nivel_procura: info.level,
        tendencia_procura_pct: info.trend,
        medicamentos_mais_procurados: [
          { nome: 'Paracetamol 500mg', pesquisas: Math.round(provSearches * 0.28), disponibilidade_pct: 92 },
          { nome: 'Coartem (Arteméter + Lumefantrina)', pesquisas: Math.round(provSearches * 0.24), disponibilidade_pct: 85 },
          { nome: 'Ibuprofeno 400mg', pesquisas: Math.round(provSearches * 0.18), disponibilidade_pct: 89 },
          { nome: 'Amoxicilina 500mg', pesquisas: Math.round(provSearches * 0.15), disponibilidade_pct: 78 },
        ],
        servicos_mais_procurados: [
          { nome: 'Consulta de Clínica Geral', pesquisas: Math.round(provSearches * 0.12) },
          { nome: 'Consulta de Pediatria', pesquisas: Math.round(provSearches * 0.09) },
          { nome: 'Ginecologia e Obstetrícia', pesquisas: Math.round(provSearches * 0.06) },
        ],
        exames_mais_procurados: [
          { nome: 'Teste Rápido de Malária (Gota Espessa)', pesquisas: Math.round(provSearches * 0.14) },
          { nome: 'Hemograma Completo', pesquisas: Math.round(provSearches * 0.11) },
          { nome: 'Glicemia em Jejum', pesquisas: Math.round(provSearches * 0.07) },
        ],
      };
    });

    // --- ALERTS AND SURVEILLANCE ---
    const alertas: InstitutionalAlert[] = [
      {
        id: 'alt-1',
        tipo: 'aumento_repentino',
        severidade: 'critico',
        titulo: 'Surto de Procura por Antimaláricos em Luanda e Benguela',
        descricao: 'Aumento de +64% nas pesquisas por Coartem e Teste Rápido de Malária nos últimos 7 dias.',
        medicamento: 'Coartem 80/480mg',
        provincia: 'Luanda',
        municipio: 'Viana e Cacuaco',
        impacto_estimado: 'Risco de rutura de stock farmacêutico em 48 horas nas farmácias periféricas.',
        data_detecao: '2026-09-02T06:00:00Z',
        acao_sugerida: 'Reforçar abastecimento a partir dos depósitos grossistas e emitir alerta epidemiológico aos centros de saúde.',
      },
      {
        id: 'alt-2',
        tipo: 'rotura_stock',
        severidade: 'critico',
        titulo: 'Baixa Disponibilidade de Insulina Regular no Huambo',
        descricao: 'Apenas 1 unidade com stock reportado para 128 buscas registadas esta semana.',
        medicamento: 'Insulina Humana Regular 100UI/ml',
        provincia: 'Huambo',
        municipio: 'Huambo',
        impacto_estimado: 'Pacientes diabéticos dependentes sem acesso imediato na rede comunitária.',
        data_detecao: '2026-09-01T18:30:00Z',
        acao_sugerida: 'Mobilização urgente de lote da Reserva Estratégica Nacional de Medicamentos.',
      },
      {
        id: 'alt-3',
        tipo: 'medicamento_sem_stock',
        severidade: 'alerta',
        titulo: 'Escassez de Amoxicilina Suspensão Pediátrica em Cuanza Sul',
        descricao: 'Zero farmácias com stock registado no município do Sumbe e Porto Amboim.',
        medicamento: 'Amoxicilina 250mg/5ml Xarope Pediátrico',
        provincia: 'Cuanza Sul',
        municipio: 'Sumbe',
        impacto_estimado: 'Tratamento de infeções respiratórias infantis comprometido.',
        data_detecao: '2026-08-31T11:00:00Z',
        acao_sugerida: 'Priorizar despacho logístico a partir do Depósito do Lobito.',
      },
      {
        id: 'alt-4',
        tipo: 'crescimento_continuo',
        severidade: 'informativo',
        titulo: 'Expansão Contínua da Cobertura em Benguela',
        descricao: 'Crescimento de +32% na oferta de exames laboratoriais e diagnósticos de urgência.',
        provincia: 'Benguela',
        data_detecao: '2026-08-30T09:00:00Z',
        acao_sugerida: 'Consolidar adesão de mais 4 farmácias municipais ao ecossistema nacional.',
      },
    ];

    // --- NATIONAL RANKINGS ---
    const rankings = {
      medicamentos_procurados: [
        { posicao: 1, nome: 'Paracetamol 500mg Comprimidos', categoria: 'Analgésicos', regiao: 'Nacional', metrica_primaria: Math.round(searchesMed * 0.28).toLocaleString(), metrica_secundaria: '92% Disp.', variacao_posicao: 0 },
        { posicao: 2, nome: 'Coartem 80/480mg (Antimalárico)', categoria: 'Antimaláricos', regiao: 'Nacional', metrica_primaria: Math.round(searchesMed * 0.24).toLocaleString(), metrica_secundaria: '85% Disp.', variacao_posicao: 1 },
        { posicao: 3, nome: 'Ibuprofeno 400mg Anti-inflamatório', categoria: 'Anti-inflamatórios', regiao: 'Nacional', metrica_primaria: Math.round(searchesMed * 0.18).toLocaleString(), metrica_secundaria: '89% Disp.', variacao_posicao: -1 },
        { posicao: 4, nome: 'Amoxicilina + Ácido Clavulânico 1g', categoria: 'Antibióticos', regiao: 'Nacional', metrica_primaria: Math.round(searchesMed * 0.15).toLocaleString(), metrica_secundaria: '78% Disp.', variacao_posicao: 0 },
        { posicao: 5, nome: 'Ciprofloxacina 500mg', categoria: 'Antibióticos', regiao: 'Nacional', metrica_primaria: Math.round(searchesMed * 0.08).toLocaleString(), metrica_secundaria: '81% Disp.', variacao_posicao: 2 },
        { posicao: 6, nome: 'Omeprazol 20mg Cápsulas', categoria: 'Antiulcerosos', regiao: 'Nacional', metrica_primaria: Math.round(searchesMed * 0.07).toLocaleString(), metrica_secundaria: '94% Disp.', variacao_posicao: 0 },
      ],
      servicos_procurados: [
        { posicao: 1, nome: 'Consulta de Medicina Geral / Urgência', categoria: 'Clínica Geral', regiao: 'Nacional', metrica_primaria: Math.round(searchesServ * 0.38).toLocaleString(), metrica_secundaria: '18 Unidades' },
        { posicao: 2, nome: 'Consulta Médica de Pediatria', categoria: 'Pediatria', regiao: 'Nacional', metrica_primaria: Math.round(searchesServ * 0.26).toLocaleString(), metrica_secundaria: '12 Unidades' },
        { posicao: 3, nome: 'Ginecologia e Acompanhamento Pré-Natal', categoria: 'Saúde Materna', regiao: 'Nacional', metrica_primaria: Math.round(searchesServ * 0.18).toLocaleString(), metrica_secundaria: '9 Unidades' },
        { posicao: 4, nome: 'Consulta de Cardiologia e Hipertensão', categoria: 'Cardiologia', regiao: 'Nacional', metrica_primaria: Math.round(searchesServ * 0.11).toLocaleString(), metrica_secundaria: '7 Unidades' },
        { posicao: 5, nome: 'Oftalmologia e Acuidade Visual', categoria: 'Oftalmologia', regiao: 'Nacional', metrica_primaria: Math.round(searchesServ * 0.07).toLocaleString(), metrica_secundaria: '5 Unidades' },
      ],
      exames_procurados: [
        { posicao: 1, nome: 'Teste Rápido de Malária / Gota Espessa', categoria: 'Doenças Tropicais', regiao: 'Nacional', metrica_primaria: Math.round(searchesExams * 0.34).toLocaleString(), metrica_secundaria: '24 Laboratórios' },
        { posicao: 2, nome: 'Hemograma Completo com Plaquetas', categoria: 'Hematologia', regiao: 'Nacional', metrica_primaria: Math.round(searchesExams * 0.28).toLocaleString(), metrica_secundaria: '22 Laboratórios' },
        { posicao: 3, nome: 'Perfil Lipídico e Glicemia em Jejum', categoria: 'Bioquímica', regiao: 'Nacional', metrica_primaria: Math.round(searchesExams * 0.18).toLocaleString(), metrica_secundaria: '19 Laboratórios' },
        { posicao: 4, nome: 'Ecografia Abdominal e Pélvica', categoria: 'Imagiologia', regiao: 'Nacional', metrica_primaria: Math.round(searchesExams * 0.12).toLocaleString(), metrica_secundaria: '14 Clínicas' },
        { posicao: 5, nome: 'Teste de Widal (Febre Tifoide)', categoria: 'Microbiologia', regiao: 'Nacional', metrica_primaria: Math.round(searchesExams * 0.08).toLocaleString(), metrica_secundaria: '17 Laboratórios' },
      ],
      regioes_maior_procura: [
        { posicao: 1, nome: 'Luanda (Maianga, Talatona, Viana)', regiao: 'Luanda', metrica_primaria: `${Math.round(baseSearches * 0.52).toLocaleString()} buscas`, metrica_secundaria: '+28% cresc.' },
        { posicao: 2, nome: 'Benguela (Benguela, Lobito, Baía Farta)', regiao: 'Benguela', metrica_primaria: `${Math.round(baseSearches * 0.14).toLocaleString()} buscas`, metrica_secundaria: '+18% cresc.' },
        { posicao: 3, nome: 'Huambo (Cidade Alta, Caála)', regiao: 'Huambo', metrica_primaria: `${Math.round(baseSearches * 0.11).toLocaleString()} buscas`, metrica_secundaria: '+15% cresc.' },
        { posicao: 4, nome: 'Huíla (Lubango, Matala)', regiao: 'Huíla', metrica_primaria: `${Math.round(baseSearches * 0.08).toLocaleString()} buscas`, metrica_secundaria: '+12% cresc.' },
        { posicao: 5, nome: 'Cabinda (Cabinda, Cacongo)', regiao: 'Cabinda', metrica_primaria: `${Math.round(baseSearches * 0.04).toLocaleString()} buscas`, metrica_secundaria: '+9% cresc.' },
      ],
      regioes_menor_disponibilidade: [
        { posicao: 1, nome: 'Cuando Cubango (Menongue)', regiao: 'Cuando Cubango', metrica_primaria: '48% Disponibilidade', metrica_secundaria: '2 Unidades conectadas' },
        { posicao: 2, nome: 'Cunene (Ondjiva)', regiao: 'Cunene', metrica_primaria: '52% Disponibilidade', metrica_secundaria: '3 Unidades conectadas' },
        { posicao: 3, nome: 'Moxico (Luena)', regiao: 'Moxico', metrica_primaria: '54% Disponibilidade', metrica_secundaria: '3 Unidades conectadas' },
        { posicao: 4, nome: 'Lunda Sul (Saurimo)', regiao: 'Lunda Sul', metrica_primaria: '58% Disponibilidade', metrica_secundaria: '4 Unidades conectadas' },
        { posicao: 5, nome: 'Cuanza Sul (Sumbe/Porto Amboim)', regiao: 'Cuanza Sul', metrica_primaria: '64% Disponibilidade', metrica_secundaria: '5 Unidades conectadas' },
      ],
      unidades_mais_pedidos: [
        { posicao: 1, nome: 'Farmácia Luanda Saúde Central', regiao: 'Luanda (Ingombota)', metrica_primaria: '612 pedidos', metrica_secundaria: '98.5% Aceitação' },
        { posicao: 2, nome: 'Clínica & Farmácia Sagrada Esperança', regiao: 'Luanda (Talatona)', metrica_primaria: '580 pedidos', metrica_secundaria: '97.8% Aceitação' },
        { posicao: 3, nome: 'Farmácia Central do Huambo', regiao: 'Huambo (Cidade Alta)', metrica_primaria: '410 pedidos', metrica_secundaria: '96.2% Aceitação' },
        { posicao: 4, nome: 'Farmácia Popular da Maianga', regiao: 'Luanda (Maianga)', metrica_primaria: '340 pedidos', metrica_secundaria: '95.0% Aceitação' },
        { posicao: 5, nome: 'Farmácia Benguela Vida', regiao: 'Benguela (Praia Morena)', metrica_primaria: '215 pedidos', metrica_secundaria: '94.6% Aceitação' },
      ],
      unidades_maior_taxa_conclusao: [
        { posicao: 1, nome: 'Farmácia Luanda Saúde Central', regiao: 'Luanda', metrica_primaria: '98.5% Conclusão', metrica_secundaria: 'Tempo Médio: 12 min' },
        { posicao: 2, nome: 'Laboratório Central de Análises Clínicas', regiao: 'Luanda', metrica_primaria: '98.0% Conclusão', metrica_secundaria: 'Tempo Médio: 15 min' },
        { posicao: 3, nome: 'Clínica Sagrada Esperança Talatona', regiao: 'Luanda', metrica_primaria: '97.4% Conclusão', metrica_secundaria: 'Tempo Médio: 18 min' },
        { posicao: 4, nome: 'Farmácia Central do Huambo', regiao: 'Huambo', metrica_primaria: '96.8% Conclusão', metrica_secundaria: 'Tempo Médio: 22 min' },
        { posicao: 5, nome: 'Farmácia Popular da Maianga', regiao: 'Luanda', metrica_primaria: '95.5% Conclusão', metrica_secundaria: 'Tempo Médio: 25 min' },
      ],
    };

    // --- TEMPORAL EVOLUTION POINTS (GRAPHS & TABLES) ---
    const evolucao_temporal: TemporalEvolutionPoint[] = [
      { data: 'Semana 1', pesquisas_totais: Math.round(baseSearches * 0.18), pesquisas_medicamentos: Math.round(searchesMed * 0.18), pesquisas_servicos: Math.round(searchesServ * 0.18), pesquisas_exames: Math.round(searchesExams * 0.18), pedidos_concluidos: Math.round(completedOrders * 0.18), indice_disponibilidade: 78 },
      { data: 'Semana 2', pesquisas_totais: Math.round(baseSearches * 0.22), pesquisas_medicamentos: Math.round(searchesMed * 0.22), pesquisas_servicos: Math.round(searchesServ * 0.22), pesquisas_exames: Math.round(searchesExams * 0.22), pedidos_concluidos: Math.round(completedOrders * 0.21), indice_disponibilidade: 80 },
      { data: 'Semana 3', pesquisas_totais: Math.round(baseSearches * 0.28), pesquisas_medicamentos: Math.round(searchesMed * 0.28), pesquisas_servicos: Math.round(searchesServ * 0.28), pesquisas_exames: Math.round(searchesExams * 0.28), pedidos_concluidos: Math.round(completedOrders * 0.29), indice_disponibilidade: 82 },
      { data: 'Semana 4', pesquisas_totais: Math.round(baseSearches * 0.32), pesquisas_medicamentos: Math.round(searchesMed * 0.32), pesquisas_servicos: Math.round(searchesServ * 0.32), pesquisas_exames: Math.round(searchesExams * 0.32), pedidos_concluidos: Math.round(completedOrders * 0.32), indice_disponibilidade: 85 },
    ];

    return {
      periodo_selecionado: timeLabel,
      provincia_selecionada: provinceFilter === 'all' ? 'Angola (Nacional)' : provinceFilter,
      categoria_selecionada: categoryFilter,
      indicadores,
      provincias_mapa,
      alertas,
      rankings,
      evolucao_temporal,
    };
  }

  // --- DRUG HEATMAP GENERATOR ---
  getDrugHeatmap(drugQuery?: string): DrugHeatmapPoint[] {
    const defaultMeds = ['Paracetamol', 'Coartem', 'Ibuprofeno', 'Amoxicilina', 'Ciprofloxacina', 'Omeprazol', 'Insulina', 'Metformina'];
    const selectedDrug = drugQuery && drugQuery.trim() ? drugQuery.trim() : 'Geral';

    return PROVINCES_ANGOLA.map((prov) => {
      let intensidade: 'verde' | 'amarelo' | 'laranja' | 'vermelho' = 'verde';
      let indice = 25;
      let crescimento = 4;
      let novaZona = false;

      if (prov === 'Luanda') {
        intensidade = 'vermelho';
        indice = 96;
        crescimento = 34;
      } else if (prov === 'Benguela') {
        intensidade = 'laranja';
        indice = 78;
        crescimento = 22;
      } else if (prov === 'Huambo') {
        intensidade = 'laranja';
        indice = 72;
        crescimento = 18;
      } else if (prov === 'Huíla' || prov === 'Cabinda') {
        intensidade = 'amarelo';
        indice = 55;
        crescimento = 12;
      } else if (prov === 'Cuanza Sul' || prov === 'Uíge' || prov === 'Icolo Bengo') {
        intensidade = 'amarelo';
        indice = 42;
        crescimento = 26;
        novaZona = true; // Nova zona com crescimento rápido
      } else if (prov === 'Moxico Leste' || prov === 'Kuando') {
        intensidade = 'amarelo';
        indice = 36;
        crescimento = 18;
        novaZona = true;
      }

      return {
        provincia: prov,
        medicamento: selectedDrug,
        categoria_terapeutica: 'Farmacêutica Geral',
        total_pesquisas: Math.round(indice * 85),
        total_pedidos: Math.round(indice * 6.5),
        intensidade,
        indice_procura: indice,
        crescimento_pct: crescimento,
        nova_zona_procura: novaZona,
      };
    });
  }

  // --- DRUG AVAILABILITY MATRIX PER PROVINCE ---
  getDrugAvailabilityMap(drugName?: string): DrugAvailabilityPoint[] {
    const med = drugName || 'Paracetamol 500mg';
    return PROVINCES_ANGOLA.map((prov) => {
      let status: 'disponivel' | 'baixa_disponibilidade' | 'indisponivel' | 'sem_stock' = 'disponivel';
      let unitsWithStock = 4;
      let totalUnits = 6;
      let estimatedStock = 850;
      let avgPrice = 1200;

      if (prov === 'Luanda') {
        status = 'disponivel';
        unitsWithStock = 18;
        totalUnits = 20;
        estimatedStock = 4200;
        avgPrice = 1100;
      } else if (prov === 'Benguela' || prov === 'Huambo') {
        status = 'disponivel';
        unitsWithStock = 6;
        totalUnits = 7;
        estimatedStock = 1400;
        avgPrice = 1250;
      } else if (prov === 'Huíla' || prov === 'Cabinda') {
        status = 'baixa_disponibilidade';
        unitsWithStock = 2;
        totalUnits = 5;
        estimatedStock = 320;
        avgPrice = 1400;
      } else if (prov === 'Icolo Bengo') {
        status = 'disponivel';
        unitsWithStock = 3;
        totalUnits = 4;
        estimatedStock = 620;
        avgPrice = 1350;
      } else if (prov === 'Moxico Leste' || prov === 'Kuando') {
        status = 'baixa_disponibilidade';
        unitsWithStock = 2;
        totalUnits = 3;
        estimatedStock = 240;
        avgPrice = 1450;
      } else if (prov === 'Cuando Cubango' || prov === 'Cunene') {
        status = 'indisponivel';
        unitsWithStock = 0;
        totalUnits = 3;
        estimatedStock = 0;
        avgPrice = 0;
      } else {
        status = 'baixa_disponibilidade';
        unitsWithStock = 1;
        totalUnits = 3;
        estimatedStock = 180;
        avgPrice = 1500;
      }

      return {
        provincia: prov,
        medicamento: med,
        categoria_terapeutica: 'Medicamentos Essenciais',
        status,
        unidades_com_stock: unitsWithStock,
        total_unidades_regiao: totalUnits,
        stock_total_estimado: estimatedStock,
        preco_medio_aoa: avgPrice,
      };
    });
  }

  // --- Payments & Subscriptions ---
  getPayments(): PaymentTransaction[] {
    const raw = this.getStorage<PaymentTransaction[]>(STORAGE_KEYS.PAYMENTS, [
      {
        id: 'pay-1',
        unidade_id: 'unit-1',
        unidade_nome: 'Farmácia Luanda Saúde Central',
        plano_tipo: 'avancado',
        periodicidade: 'anual',
        valor: 1008000,
        desconto_aplicado: 30,
        metodo: 'multicaixa_express',
        referencia_mcx: 'MCX-2026-99021',
        comprovativo_url: 'comprovativo_mcx_luanda_saude.pdf',
        comprovativo_nome: 'comprovativo_mcx_luanda_saude.pdf',
        comprovativo_tipo: 'pdf',
        status: 'confirmado',
        data_pagamento: '2026-01-01T10:00:00Z',
        validado_por: 'Super Administrador Geral',
      },
      {
        id: 'pay-2',
        unidade_id: 'unit-2',
        unidade_nome: 'Farmácia Popular da Maianga',
        plano_tipo: 'medio',
        periodicidade: 'semestral',
        valor: 280500,
        desconto_aplicado: 15,
        metodo: 'transferencia_bancaria',
        comprovativo_url: 'comprovativo_bancario_maianga.pdf',
        comprovativo_nome: 'comprovativo_bancario_maianga.pdf',
        comprovativo_tipo: 'pdf',
        status: 'confirmado',
        data_pagamento: '2026-03-01T08:30:00Z',
        validado_por: 'Carla Agostinho (Admin)',
      },
      {
        id: 'pay-3',
        unidade_id: 'unit-3',
        unidade_nome: 'Farmácia Alvalade Vida',
        plano_tipo: 'avancado',
        periodicidade: 'anual',
        valor: 1008000,
        desconto_aplicado: 30,
        metodo: 'multicaixa_express',
        referencia_mcx: 'MCX-2026-88192',
        comprovativo_url: 'recibo_multicaixa_express_alvalade.pdf',
        comprovativo_nome: 'recibo_multicaixa_express_alvalade.pdf',
        comprovativo_tipo: 'pdf',
        status: 'pendente',
        data_pagamento: '2026-03-03T11:45:00Z',
        observacoes: 'Comprovativo oficial Multicaixa Express anexado no registo inicial da farmácia.',
      },
      {
        id: 'pay-4',
        unidade_id: 'unit-4',
        unidade_nome: 'Farmácia Benguela Saúde',
        plano_tipo: 'medio',
        periodicidade: 'semestral',
        valor: 280500,
        desconto_aplicado: 15,
        metodo: 'transferencia_bancaria',
        referencia_mcx: 'REF-BAI-2026-9041',
        comprovativo_url: 'comprovativo_transferencia_bai_benguela.pdf',
        comprovativo_nome: 'comprovativo_transferencia_bai_benguela.pdf',
        comprovativo_tipo: 'pdf',
        status: 'pendente',
        data_pagamento: '2026-03-03T14:20:00Z',
        observacoes: 'Transferência bancária BAI efetuada na inscrição da unidade.',
      },
    ]);

    // Ensure backwards-compatible comprovativo fields if loaded from older localStorage
    let updated = false;
    const normalized = raw.map((p) => {
      if (!p.comprovativo_url || !p.comprovativo_nome) {
        updated = true;
        const defaultName = p.metodo === 'multicaixa_express' 
          ? `recibo_multicaixa_${p.referencia_mcx || 'express'}.pdf` 
          : `comprovativo_bancario_${p.unidade_nome.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        return {
          ...p,
          comprovativo_url: p.comprovativo_url || defaultName,
          comprovativo_nome: p.comprovativo_nome || defaultName,
          comprovativo_tipo: p.comprovativo_tipo || 'pdf',
        };
      }
      return p;
    });

    if (updated) {
      this.setStorage(STORAGE_KEYS.PAYMENTS, normalized);
    }
    return normalized;
  }

  submitPayment(payment: Omit<PaymentTransaction, 'id' | 'data_pagamento'>): PaymentTransaction {
    const payments = this.getPayments();
    const newPay: PaymentTransaction = {
      ...payment,
      id: 'pay-' + Date.now(),
      data_pagamento: new Date().toISOString(),
    };
    payments.unshift(newPay);
    this.setStorage(STORAGE_KEYS.PAYMENTS, payments);

    this.logActivity({
      acao: 'Submissão de Pagamento de Subscrição',
      categoria: 'plano',
      usuario_id: newPay.unidade_id,
      usuario_nome: newPay.unidade_nome,
      usuario_role: 'unidade',
      detalhes: `Pagamento submetido: Plano ${newPay.plano_tipo.toUpperCase()} (${newPay.periodicidade}) no valor de ${newPay.valor.toLocaleString()} AOA via ${newPay.metodo}`,
    });

    return newPay;
  }

  validatePayment(paymentId: string, approved: boolean, validatedBy: string): PaymentTransaction | null {
    const payments = this.getPayments();
    const pay = payments.find((p) => p.id === paymentId);
    if (pay) {
      pay.status = approved ? 'confirmado' : 'rejeitado';
      pay.validado_por = validatedBy;
      this.setStorage(STORAGE_KEYS.PAYMENTS, payments);

      if (approved) {
        // Activate or renew unit subscription
        const unit = this.getUnitById(pay.unidade_id);
        if (unit) {
          unit.plano_tipo = pay.plano_tipo;
          unit.plano_periodicidade = pay.periodicidade;
          unit.plano_status = 'ativo';
          unit.verificada = true;
          unit.selo_premium = pay.plano_tipo === 'avancado';
          unit.destaque_visual = pay.plano_tipo !== 'basico';
          
          // Calculate expiration date
          const now = new Date();
          let monthsToAdd = 1;
          if (pay.periodicidade === 'trimestral') monthsToAdd = 3;
          if (pay.periodicidade === 'semestral') monthsToAdd = 6;
          if (pay.periodicidade === 'anual') monthsToAdd = 12;
          now.setMonth(now.getMonth() + monthsToAdd);
          unit.plano_data_expiracao = now.toISOString().split('T')[0];
          this.saveUnit(unit);
        }

        // Activate associated users
        const users = this.getUsers();
        users.forEach((u) => {
          if (u.unidade_id === pay.unidade_id) {
            u.status_aprovacao = 'aprovado';
          }
        });
        this.setStorage(STORAGE_KEYS.USERS, users);
      } else {
        const unit = this.getUnitById(pay.unidade_id);
        if (unit && unit.plano_status === 'pendente') {
          unit.plano_status = 'expirado';
          this.saveUnit(unit);
        }
      }

      this.logActivity({
        acao: approved ? 'Pagamento e Conta da Unidade Aprovados' : 'Pagamento Rejeitado',
        categoria: 'plano',
        usuario_id: 'admin',
        usuario_nome: validatedBy,
        usuario_role: 'admin',
        detalhes: `Pagamento ${pay.id} (${pay.unidade_nome}) no valor de ${pay.valor.toLocaleString()} AOA foi ${approved ? 'APROVADO E ATIVADO' : 'REJEITADO'}`,
      });

      return pay;
    }
    return null;
  }

  // Direct activation/approval by Super Admin for health establishments
  approveUnit(unitId: string, approvedBy: string): HealthUnit | null {
    const unit = this.getUnitById(unitId);
    if (!unit) return null;

    unit.plano_status = 'ativo';
    unit.verificada = true;
    unit.selo_premium = unit.plano_tipo === 'avancado';
    unit.destaque_visual = unit.plano_tipo !== 'basico';

    const now = new Date();
    let monthsToAdd = 1;
    if (unit.plano_periodicidade === 'trimestral') monthsToAdd = 3;
    if (unit.plano_periodicidade === 'semestral') monthsToAdd = 6;
    if (unit.plano_periodicidade === 'anual') monthsToAdd = 12;
    now.setMonth(now.getMonth() + monthsToAdd);
    unit.plano_data_expiracao = now.toISOString().split('T')[0];
    this.saveUnit(unit);

    // Update pending payments for this unit
    const payments = this.getPayments();
    payments.forEach((p) => {
      if (p.unidade_id === unitId && p.status === 'pendente') {
        p.status = 'confirmado';
        p.validado_por = approvedBy;
      }
    });
    this.setStorage(STORAGE_KEYS.PAYMENTS, payments);

    // Update user approval status
    const users = this.getUsers();
    users.forEach((u) => {
      if (u.unidade_id === unitId) {
        u.status_aprovacao = 'aprovado';
      }
    });
    this.setStorage(STORAGE_KEYS.USERS, users);

    this.logActivity({
      acao: 'Estabelecimento Aprovado e Ativado pelo Super Admin',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: approvedBy,
      usuario_role: 'super_admin',
      detalhes: `Unidade '${unit.nome}' (${unit.tipo.toUpperCase()}, NIF: ${unit.nif || 'N/A'}) aprovada e ativada com sucesso.`,
    });

    return unit;
  }

  rejectUnit(unitId: string, motivo: string, rejectedBy: string): HealthUnit | null {
    const unit = this.getUnitById(unitId);
    if (!unit) return null;

    unit.plano_status = 'expirado';
    unit.motivo_rejeicao = motivo;
    this.saveUnit(unit);

    const payments = this.getPayments();
    payments.forEach((p) => {
      if (p.unidade_id === unitId && p.status === 'pendente') {
        p.status = 'rejeitado';
        p.validado_por = rejectedBy;
        p.observacoes = motivo;
      }
    });
    this.setStorage(STORAGE_KEYS.PAYMENTS, payments);

    const users = this.getUsers();
    users.forEach((u) => {
      if (u.unidade_id === unitId) {
        u.status_aprovacao = 'rejeitado';
      }
    });
    this.setStorage(STORAGE_KEYS.USERS, users);

    this.logActivity({
      acao: 'Registo de Unidade Rejeitado pelo Super Admin',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: rejectedBy,
      usuario_role: 'super_admin',
      detalhes: `Unidade '${unit.nome}' rejeitada. Motivo: ${motivo}`,
    });

    return unit;
  }

  // --- Backend Plan Expiration & Operation Blocking ---
  checkUnitPlanStatus(unitId: string): {
    canPerformOperations: boolean;
    isBlocked: boolean;
    reason?: string;
    daysUntilExpiration: number;
    show30dAlert: boolean;
    show15dAlert: boolean;
    show7dAlert: boolean;
    show1dAlert: boolean;
  } {
    const unit = this.getUnitById(unitId);
    if (!unit) {
      return {
        canPerformOperations: false,
        isBlocked: true,
        reason: 'Unidade de saúde não encontrada no sistema.',
        daysUntilExpiration: 0,
        show30dAlert: false,
        show15dAlert: false,
        show7dAlert: false,
        show1dAlert: false,
      };
    }

    const expDate = new Date(unit.plano_data_expiracao);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isExpired = daysUntilExpiration <= 0;
    const isStatusInactive = unit.plano_status !== 'ativo';
    const isBlocked = isExpired || isStatusInactive;

    return {
      canPerformOperations: !isBlocked,
      isBlocked,
      reason: isBlocked
        ? isExpired
          ? `O plano de subscrição expirou em ${unit.plano_data_expiracao}. Renove a sua anuidade para continuar a gerir o stock e aceitar pedidos.`
          : `O plano de subscrição está com estado '${unit.plano_status}'. Regularize o pagamento.`
        : undefined,
      daysUntilExpiration,
      show30dAlert: daysUntilExpiration <= 30 && daysUntilExpiration > 15,
      show15dAlert: daysUntilExpiration <= 15 && daysUntilExpiration > 7,
      show7dAlert: daysUntilExpiration <= 7 && daysUntilExpiration > 1,
      show1dAlert: daysUntilExpiration <= 1 && daysUntilExpiration > 0,
    };
  }

  // --- Batch Excel Import ---
  processExcelImport(
    unitId: string,
    rawCsvOrText: string,
    replaceExisting: boolean = false
  ): {
    success: boolean;
    importedCount: number;
    errors: { line: number; error: string }[];
  } {
    const unit = this.getUnitById(unitId);
    if (!unit) {
      return { success: false, importedCount: 0, errors: [{ line: 0, error: 'Unidade não encontrada' }] };
    }

    // Check plan limits
    const currentProducts = this.getProducts().filter((p) => p.unidade_id === unitId);
    let maxAllowed = 50;
    if (unit.plano_tipo === 'medio') maxAllowed = 200;
    if (unit.plano_tipo === 'avancado' || unit.tipo === 'deposito') maxAllowed = 999999;

    const lines = rawCsvOrText.split('\n').map((l) => l.trim()).filter(Boolean);
    const errors: { line: number; error: string }[] = [];
    const newProducts: ProductItem[] = [];

    if (lines.length === 0) {
      return { success: false, importedCount: 0, errors: [{ line: 0, error: 'O ficheiro/texto está vazio.' }] };
    }

    // Detect column indexes from header if present
    let colIndexNome = 0;
    let colIndexCategoria = 1;
    let colIndexStock = 2;
    let colIndexPreco = 3;
    let colIndexReceita = -1;
    let colIndexDosagem = -1;
    let colIndexDesc = -1;

    const firstLineLower = lines[0].toLowerCase();
    const isHeaderPresent = firstLineLower.includes('nome') || firstLineLower.includes('preco') || firstLineLower.includes('stock') || firstLineLower.includes('categoria');

    if (isHeaderPresent) {
      const headerCols = lines[0].split(/[;,|\t]/).map((c) => c.trim().toLowerCase().replace(/^["']|["']$/g, ''));
      headerCols.forEach((h, idx) => {
        if (h.includes('nome') || h.includes('medicamento') || h.includes('artigo') || h.includes('produto')) colIndexNome = idx;
        else if (h.includes('cat') || h.includes('tipo') || h.includes('classe')) colIndexCategoria = idx;
        else if (h.includes('stock') || h.includes('qtd') || h.includes('quant')) colIndexStock = idx;
        else if (h.includes('preco') || h.includes('preço') || h.includes('kz') || h.includes('aoa') || h.includes('valor')) colIndexPreco = idx;
        else if (h.includes('receita') || h.includes('prescricao')) colIndexReceita = idx;
        else if (h.includes('dosag') || h.includes('apresent')) colIndexDosagem = idx;
        else if (h.includes('desc') || h.includes('detalhe') || h.includes('fabric')) colIndexDesc = idx;
      });
    }

    // Parse data lines
    const startIdx = isHeaderPresent ? 1 : 0;
    for (let idx = startIdx; idx < lines.length; idx++) {
      const line = lines[idx];
      const cols = line.split(/[;,|\t]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length < 3) {
        errors.push({ line: idx + 1, error: 'Linha com campos insuficientes. Formato exigido: nome | categoria | stock | preco_kz' });
        continue;
      }

      const nome = cols[colIndexNome] || cols[0];
      const categoriaStr = cols[colIndexCategoria] || cols[1] || 'Medicamento';
      const stockStr = cols[colIndexStock] || cols[2] || '0';
      const precoStr = cols[colIndexPreco] || cols[3] || '0';
      const reqRecStr = colIndexReceita >= 0 ? cols[colIndexReceita] : '';
      const customDosagem = colIndexDosagem >= 0 ? cols[colIndexDosagem] : '';
      const customDesc = colIndexDesc >= 0 ? cols[colIndexDesc] : '';

      if (!nome || nome.length < 2) {
        errors.push({ line: idx + 1, error: 'Nome do produto inválido ou vazio.' });
        continue;
      }

      const preco = parseFloat(precoStr.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (isNaN(preco) || preco <= 0) {
        errors.push({ line: idx + 1, error: `Preço em Kwanzas inválido: "${precoStr}".` });
        continue;
      }

      const stock = parseInt(stockStr.replace(/[^0-9]/g, ''), 10);
      if (isNaN(stock) || stock < 0) {
        errors.push({ line: idx + 1, error: `Quantidade de stock inválida: "${stockStr}".` });
        continue;
      }

      // Auto-extract dosage from name if not present (e.g. "Paracetamol 500mg" -> "500mg")
      const dosageMatch = nome.match(/\b\d+(\/\d+)?(\.\d+)?\s*(mg|g|ml|mcg|ui|%|l)\b/i);
      const extractedDosage = customDosagem || (dosageMatch ? dosageMatch[0] : '');

      // Categorization & Prescription Logic
      const catLower = categoriaStr.toLowerCase();
      let mainCategory: 'medicamento' | 'servico' | 'exame' = 'medicamento';
      if (catLower.includes('serv') || catLower.includes('consulta') || catLower.includes('enferm')) {
        mainCategory = 'servico';
      } else if (catLower.includes('exam') || catLower.includes('teste') || catLower.includes('analis') || catLower.includes('diagnost')) {
        mainCategory = 'exame';
      }

      // Antibióticos or specific keywords default to requiring prescription
      const isAntibiotic = catLower.includes('antib') || catLower.includes('injet') || catLower.includes('psico') || nome.toLowerCase().includes('amoxic') || nome.toLowerCase().includes('cipro') || nome.toLowerCase().includes('azitro');
      let requerReceita = isAntibiotic;
      if (reqRecStr) {
        requerReceita = ['sim', 'true', '1', 'yes', 'obrigatorio', 'obrigatória'].includes(reqRecStr.toLowerCase());
      }

      newProducts.push({
        id: 'prod-' + Date.now() + '-' + idx,
        unidade_id: unitId,
        nome,
        nome_generico: nome.split(' ')[0],
        descricao: customDesc || `${nome} - Categoria: ${categoriaStr}. Disponível para entrega e balcão.`,
        categoria: mainCategory,
        subcategoria: categoriaStr,
        preco,
        quantidade_stock: stock,
        disponivel: stock > 0,
        requer_receita: requerReceita,
        dosagem: extractedDosage,
        visualizacoes: 0,
        destaque: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const baseCount = replaceExisting ? 0 : currentProducts.length;
    if (baseCount + newProducts.length > maxAllowed) {
      return {
        success: false,
        importedCount: 0,
        errors: [
          {
            line: 0,
            error: `O limite do plano ${unit.plano_tipo.toUpperCase()} (${maxAllowed} produtos) seria ultrapassado. Actualize para o Plano Avançado para produtos ilimitados.`,
          },
        ],
      };
    }

    if (newProducts.length > 0) {
      const baseProducts = replaceExisting
        ? this.getProducts().filter((p) => p.unidade_id !== unitId)
        : this.getProducts();
      const allProds = [...baseProducts, ...newProducts];
      this.setStorage(STORAGE_KEYS.PRODUCTS, allProds);

      this.logActivity({
        acao: replaceExisting ? 'Inventário Substituído via Excel' : 'Importação Excel Concluída',
        categoria: 'produto',
        usuario_id: unitId,
        usuario_nome: unit.nome,
        usuario_role: 'unidade',
        detalhes: replaceExisting
          ? `Inventário anterior eliminado e substituído por ${newProducts.length} novos itens via folha Excel/CSV.`
          : `Importados com sucesso ${newProducts.length} itens via ficheiro Excel/CSV (Formato: nome, categoria, stock, preco_kz)`,
      });
    }

    return {
      success: newProducts.length > 0,
      importedCount: newProducts.length,
      errors,
    };
  }

  // --- Activity Logs ---
  getLogs(): ActivityLog[] {
    return this.getStorage<ActivityLog[]>(STORAGE_KEYS.LOGS, INITIAL_ACTIVITY_LOGS);
  }

  logActivity(log: Omit<ActivityLog, 'id' | 'created_at'>): void {
    const logs = this.getLogs();
    const newLog: ActivityLog = {
      ...log,
      id: 'log-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // Keep last 200 logs
    this.setStorage(STORAGE_KEYS.LOGS, logs.slice(0, 200));
  }

  // --- System Configuration ---
  getConfig(): SystemConfig {
    const stored = this.getStorage<SystemConfig>(STORAGE_KEYS.CONFIG, SYSTEM_CONFIG_INITIAL);
    return { ...SYSTEM_CONFIG_INITIAL, ...stored };
  }

  getPlans(): SubscriptionPlanDefinition[] {
    const config = this.getConfig();
    if (config.planos_detalhes && Array.isArray(config.planos_detalhes) && config.planos_detalhes.length > 0) {
      return config.planos_detalhes;
    }
    return PLANS_DEFINITIONS;
  }

  savePlans(plans: SubscriptionPlanDefinition[]): void {
    const config = this.getConfig();
    const updatedPrecos = { ...config.precos_planos };
    const updatedTrimestral = { ...config.descontos_config.trimestral };
    const updatedSemestral = { ...config.descontos_config.semestral };
    const updatedAnual = { ...config.descontos_config.anual };

    plans.forEach((p) => {
      if (p.id in updatedPrecos) {
        (updatedPrecos as any)[p.id] = p.preco_base_mensal;
      }
      if (p.descontos) {
        if (p.id in updatedTrimestral) (updatedTrimestral as any)[p.id] = p.descontos.trimestral || 0;
        if (p.id in updatedSemestral) (updatedSemestral as any)[p.id] = p.descontos.semestral || 0;
        if (p.id in updatedAnual) (updatedAnual as any)[p.id] = p.descontos.anual || 0;
      }
    });

    const newConfig: SystemConfig = {
      ...config,
      planos_detalhes: plans,
      precos_planos: updatedPrecos,
      descontos_config: {
        trimestral: updatedTrimestral,
        semestral: updatedSemestral,
        anual: updatedAnual,
      },
    };
    this.saveConfig(newConfig);
  }

  saveConfig(newConfig: SystemConfig): void {
    const merged = { ...SYSTEM_CONFIG_INITIAL, ...newConfig };
    this.setStorage(STORAGE_KEYS.CONFIG, merged);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mutikukwama:config-updated', { detail: merged }));
      import('./firebase')
        .then(({ db }) => {
          import('firebase/firestore').then(({ doc, setDoc }) => {
            setDoc(doc(db, 'config', 'general'), merged, { merge: true }).catch((err) => {
              console.warn('[Firestore] Sync de config em segundo plano:', err);
            });
          });
        })
        .catch(() => {});
    }
    this.logActivity({
      acao: 'Alteração de Configurações Globais',
      categoria: 'seguranca',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: 'Parâmetros institucionais, planos de subscrição, dados bancários e identificação do sistema atualizados.',
    });
  }

  /**
   * Initializes real-time bidirectional synchronization with Cloud Firestore on doc config/general
   */
  initFirestoreConfigSync(): void {
    if (typeof window === 'undefined' || this.configSyncInitialized) return;
    this.configSyncInitialized = true;

    import('./firebase')
      .then(({ db }) => {
        import('firebase/firestore').then(({ doc, onSnapshot, getDoc, setDoc }) => {
          const docRef = doc(db, 'config', 'general');

          // Check if document exists initially or seed it
          getDoc(docRef)
            .then((snap) => {
              if (snap.exists()) {
                const cloudConfig = snap.data() as Partial<SystemConfig>;
                if (cloudConfig) {
                  const current = this.getConfig();
                  const merged = { ...current, ...cloudConfig };
                  this.setStorage(STORAGE_KEYS.CONFIG, merged);
                  window.dispatchEvent(new CustomEvent('mutikukwama:config-updated', { detail: merged }));
                }
              } else {
                const initial = this.getConfig();
                setDoc(docRef, initial, { merge: true }).catch(() => {});
              }
            })
            .catch((err) => {
              console.warn('[Firestore] Leitura inicial de config:', err);
            });

          // Real-time listener for remote changes from other sessions/admins
          onSnapshot(
            docRef,
            (snap) => {
              if (snap.exists()) {
                const cloudConfig = snap.data() as Partial<SystemConfig>;
                if (cloudConfig) {
                  const current = this.getConfig();
                  const merged = { ...current, ...cloudConfig };
                  this.setStorage(STORAGE_KEYS.CONFIG, merged);
                  window.dispatchEvent(new CustomEvent('mutikukwama:config-updated', { detail: merged }));
                }
              }
            },
            (err) => {
              console.warn('[Firestore] Escuta em tempo real de config:', err);
            }
          );
        });
      })
      .catch(() => {});
  }

  /**
   * Explicitly pulls latest configuration and payment channels from Cloud Firestore
   */
  async syncConfigWithCloud(): Promise<SystemConfig> {
    if (typeof window === 'undefined') return this.getConfig();
    try {
      const { db } = await import('./firebase');
      const { doc, getDoc, setDoc } = await import('firebase/firestore');
      const docRef = doc(db, 'config', 'general');
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const cloudConfig = snap.data() as Partial<SystemConfig>;
        const current = this.getConfig();
        const merged = { ...current, ...cloudConfig };
        this.setStorage(STORAGE_KEYS.CONFIG, merged);
        window.dispatchEvent(new CustomEvent('mutikukwama:config-updated', { detail: merged }));
        return merged;
      } else {
        const current = this.getConfig();
        await setDoc(docRef, current, { merge: true });
        return current;
      }
    } catch (e) {
      console.warn('[Firestore] Falha na sincronizacao manual de config:', e);
      return this.getConfig();
    }
  }

  resetConfig(): SystemConfig {
    this.setStorage(STORAGE_KEYS.CONFIG, SYSTEM_CONFIG_INITIAL);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mutikukwama:config-updated', { detail: SYSTEM_CONFIG_INITIAL }));
      import('./firebase')
        .then(({ db }) => {
          import('firebase/firestore').then(({ doc, setDoc }) => {
            setDoc(doc(db, 'config', 'general'), SYSTEM_CONFIG_INITIAL, { merge: true }).catch(() => {});
          });
        })
        .catch(() => {});
    }
    this.logActivity({
      acao: 'Restauro de Configurações Globais',
      categoria: 'seguranca',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: 'Configurações institucionais, de planos, pagamento e rodapé restauradas para os valores oficiais.',
    });
    return SYSTEM_CONFIG_INITIAL;
  }

  // --- Users Management (Super Admin) ---
  getUsers(): UserProfile[] {
    return this.getStorage<UserProfile[]>(STORAGE_KEYS.USERS, DEMO_USERS);
  }

  saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = { ...user, updated_at: new Date().toISOString() };
    } else {
      users.push(user);
    }
    this.setStorage(STORAGE_KEYS.USERS, users);
  }

  createUser(userData: Partial<UserProfile>): UserProfile {
    const users = this.getUsers();
    const newUser: UserProfile = {
      id: userData.id || 'usr-' + Date.now(),
      email: userData.email || `utilizador${Date.now()}@mutikukwama.ao`,
      username: userData.username ? userData.username.trim().toLowerCase() : undefined,
      nome: userData.nome || 'Novo Utilizador',
      telefone: userData.telefone || '+244 923 000 000',
      whatsapp: userData.whatsapp || '+244923000000',
      role: userData.role || 'paciente',
      departamento: userData.departamento,
      cargo: userData.cargo,
      unidade_id: userData.unidade_id,
      senha_provisoria: userData.senha_provisoria,
      ultima_redefinicao_senha: userData.senha_provisoria ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    users.push(newUser);
    this.setStorage(STORAGE_KEYS.USERS, users);

    // If linked to a unit, ensure the unit's password matches if specified
    if (newUser.unidade_id && newUser.senha_provisoria) {
      const units = this.getAllUnits();
      const unit = units.find((u) => u.id === newUser.unidade_id);
      if (unit) {
        unit.senha_provisoria = newUser.senha_provisoria;
        unit.ultima_redefinicao_senha = new Date().toISOString();
        this.saveUnit(unit);
      }
    }

    this.logActivity({
      acao: 'Acesso Criado pelo Super Admin',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Acesso criado para ${newUser.nome} (User: ${newUser.username || newUser.email}) com perfil '${newUser.role}'${newUser.departamento ? ` [${newUser.departamento}]` : ''}`,
    });

    return newUser;
  }

  updateUserRole(userId: string, newRole: UserProfile['role']): UserProfile | null {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (user) {
      const oldRole = user.role;
      user.role = newRole;
      user.updated_at = new Date().toISOString();
      this.setStorage(STORAGE_KEYS.USERS, users);

      this.logActivity({
        acao: 'Alteração de Perfil de Acesso (RBAC)',
        categoria: 'seguranca',
        usuario_id: 'super-admin',
        usuario_nome: 'Super Administrador Geral',
        usuario_role: 'super_admin',
        detalhes: `Perfil de ${user.nome} alterado de '${oldRole}' para '${newRole}'`,
      });

      return user;
    }
    return null;
  }

  deleteUser(userId: string): boolean {
    const users = this.getUsers();
    const filtered = users.filter((u) => u.id !== userId);
    if (filtered.length !== users.length) {
      this.setStorage(STORAGE_KEYS.USERS, filtered);
      this.logActivity({
        acao: 'Eliminação de Utilizador',
        categoria: 'admin',
        usuario_id: 'super-admin',
        usuario_nome: 'Super Administrador Geral',
        usuario_role: 'super_admin',
        detalhes: `Utilizador ID ${userId} removido do sistema`,
      });
      return true;
    }
    return false;
  }

  resetUserPassword(userId: string, newPassword?: string): { success: boolean; passwordGenerated: string; user?: UserProfile } {
    const users = this.getUsers();
    let user = users.find((u) => u.id === userId);
    if (!user) {
      // Check if it's a demo user not yet modified in local storage
      const demoUser = DEMO_USERS.find((u) => u.id === userId);
      if (demoUser) {
        user = { ...demoUser };
        users.push(user);
      } else {
        return { success: false, passwordGenerated: '' };
      }
    }

    const generatedPassword = newPassword && newPassword.trim() ? newPassword.trim() : `Mutiku@${Math.floor(100000 + Math.random() * 900000)}!`;
    user.senha_provisoria = generatedPassword;
    user.ultima_redefinicao_senha = new Date().toISOString();
    user.updated_at = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.USERS, users);

    // If linked to a unit, keep unit password in sync
    if (user.unidade_id) {
      const units = this.getAllUnits();
      const unit = units.find((u) => u.id === user.unidade_id);
      if (unit) {
        unit.senha_provisoria = generatedPassword;
        unit.ultima_redefinicao_senha = new Date().toISOString();
        this.saveUnit(unit);
      }
    }

    this.logActivity({
      acao: 'Redefinição de Senha de Utilizador',
      categoria: 'seguranca',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Senha do utilizador ${user.nome} (User: ${user.username || user.email}) redefinida pelo Super Admin. Nova chave provisória atribuída.`,
    });

    return { success: true, passwordGenerated: generatedPassword, user };
  }

  resetUnitPassword(unitId: string, email: string, newPassword?: string): { success: boolean; passwordGenerated: string; unit?: HealthUnit } {
    const units = this.getAllUnits();
    const unit = units.find((u) => u.id === unitId);
    if (!unit) {
      return { success: false, passwordGenerated: '' };
    }

    const generatedPassword = newPassword && newPassword.trim() ? newPassword.trim() : `Farmacia@${Math.floor(100000 + Math.random() * 900000)}!`;
    if (email && email.trim()) {
      unit.email = email.trim();
    }
    unit.senha_provisoria = generatedPassword;
    unit.ultima_redefinicao_senha = new Date().toISOString();
    unit.updated_at = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.UNITS, units);

    // Also update or create associated user if exists
    const users = this.getUsers();
    const existingUser = users.find((u) => u.unidade_id === unitId || u.email.toLowerCase() === unit.email.toLowerCase());
    if (existingUser) {
      existingUser.email = unit.email;
      existingUser.senha_provisoria = generatedPassword;
      existingUser.ultima_redefinicao_senha = new Date().toISOString();
      existingUser.updated_at = new Date().toISOString();
      this.setStorage(STORAGE_KEYS.USERS, users);
    }

    this.logActivity({
      acao: 'Redefinição de Senha de Unidade de Saúde',
      categoria: 'seguranca',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Acesso da unidade '${unit.nome}' (E-mail: ${unit.email}) redefinido pelo Super Admin. Nova credencial gerada.`,
    });

    return { success: true, passwordGenerated: generatedPassword, unit };
  }

  // --- Advanced Unit Operations (Super Admin) ---
  createUnit(unitData: Partial<HealthUnit>): HealthUnit {
    const units = this.getAllUnits();
    const slug = (unitData.nome || 'unidade').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newUnit: HealthUnit = {
      id: 'unit-' + Date.now(),
      nome: unitData.nome || 'Nova Unidade de Saúde',
      slug,
      tipo: unitData.tipo || 'farmacia',
      descricao: unitData.descricao || 'Unidade de saúde credenciada na plataforma MUTIKUKWAMA.',
      logo_url: unitData.logo_url || 'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200&auto=format&fit=crop&q=80',
      banner_url: unitData.banner_url || 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200&auto=format&fit=crop&q=80',
      provincia: unitData.provincia || 'Luanda',
      municipio: unitData.municipio || 'Maianga',
      bairro: unitData.bairro || 'Centro',
      endereco_completo: unitData.endereco_completo || 'Luanda, Angola',
      latitude: unitData.latitude || -8.8354,
      longitude: unitData.longitude || 13.2389,
      telefone: unitData.telefone || '+244 923 000 000',
      whatsapp: unitData.whatsapp || '+244923000000',
      email: unitData.email || 'contacto@unidade.ao',
      nif: unitData.nif || '',
      responsavel_nome: unitData.responsavel_nome || '',
      horario_funcionamento: unitData.horario_funcionamento || 'Seg a Sáb: 08:00 - 20:00',
      aberto_agora: unitData.aberto_agora ?? true,
      verificada: unitData.verificada ?? (unitData.plano_status === 'ativo'),
      certificado_institucional: unitData.certificado_institucional || 'CERT-MINSA-2026-AUT',
      documento_minsa_nome: unitData.documento_minsa_nome || `alvara_minsa_${slug}.pdf`,
      documento_minsa_url: unitData.documento_minsa_url || `alvara_minsa_${slug}.pdf`,
      documento_minsa_base64: unitData.documento_minsa_base64,
      documento_minsa_data_emissao: unitData.documento_minsa_data_emissao || new Date().toISOString().split('T')[0],
      documento_minsa_validade: unitData.documento_minsa_validade || '2027-12-31',
      plano_tipo: unitData.plano_tipo || 'medio',
      plano_periodicidade: unitData.plano_periodicidade || 'mensal',
      plano_preco: unitData.plano_preco || 55000,
      plano_desconto: unitData.plano_desconto || 0,
      plano_data_inicio: new Date().toISOString().split('T')[0],
      plano_data_expiracao: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
      })(),
      plano_status: unitData.plano_status || 'pendente',
      metodo_pagamento: unitData.metodo_pagamento,
      referencia_pagamento: unitData.referencia_pagamento,
      comprovativo_pagamento_url: unitData.comprovativo_pagamento_url,
      comprovativo_pagamento_nome: unitData.comprovativo_pagamento_nome,
      comprovativo_pagamento_base64: unitData.comprovativo_pagamento_base64,
      comprovativo_pagamento_tipo: unitData.comprovativo_pagamento_tipo || 'pdf',
      destaque_visual: unitData.plano_tipo === 'avancado' || unitData.plano_tipo === 'medio',
      selo_premium: unitData.plano_tipo === 'avancado',
      visualizacoes: 120,
      total_pedidos: 0,
      avaliacao: 5.0,
      total_avaliacoes: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    units.unshift(newUnit);
    this.setStorage(STORAGE_KEYS.UNITS, units);

    this.logActivity({
      acao: 'Nova Unidade Credenciada pelo Super Admin',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Unidade '${newUnit.nome}' (${newUnit.tipo.toUpperCase()}) em ${newUnit.municipio}, ${newUnit.provincia} cadastrada com Plano ${newUnit.plano_tipo.toUpperCase()}`,
    });

    return newUnit;
  }

  deleteUnit(unitId: string): boolean {
    const units = this.getAllUnits();
    const unit = units.find((u) => u.id === unitId);
    const filtered = units.filter((u) => u.id !== unitId);

    // Save filtered list
    this.setStorage(STORAGE_KEYS.UNITS, filtered);

    // Track in deleted units list to prevent resurrection from seed data
    const deletedIds = this.getStorage<string[]>(STORAGE_KEYS.DELETED_UNITS, []);
    if (!deletedIds.includes(unitId)) {
      deletedIds.push(unitId);
      this.setStorage(STORAGE_KEYS.DELETED_UNITS, deletedIds);
    }

    // Clean up dependent inventory items (products, services, exams)
    try {
      const prods = this.getProducts().filter((p) => p.unidade_id !== unitId);
      this.setStorage(STORAGE_KEYS.PRODUCTS, prods);
      const servs = this.getServices().filter((s) => s.unidade_id !== unitId);
      this.setStorage(STORAGE_KEYS.SERVICES, servs);
      const exams = this.getExams().filter((e) => e.unidade_id !== unitId);
      this.setStorage(STORAGE_KEYS.EXAMS, exams);
    } catch (e) {
      console.warn('Error clearing unit dependencies:', e);
    }

    this.logActivity({
      acao: 'Eliminação de Unidade de Saúde',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Unidade '${unit?.nome || unitId}' removida da plataforma`,
    });
    return true;
  }

  extendUnitSubscription(unitId: string, daysToAdd: number, newPlan?: PlanType): HealthUnit | null {
    const units = this.getAllUnits();
    const unit = units.find((u) => u.id === unitId);
    if (unit) {
      if (newPlan) {
        unit.plano_tipo = newPlan;
        unit.selo_premium = newPlan === 'avancado';
        unit.destaque_visual = newPlan !== 'basico';
      }
      unit.plano_status = 'ativo';

      const currentExp = new Date(unit.plano_data_expiracao);
      const baseDate = isNaN(currentExp.getTime()) || currentExp < new Date() ? new Date() : currentExp;
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      unit.plano_data_expiracao = baseDate.toISOString().split('T')[0];
      unit.updated_at = new Date().toISOString();

      this.setStorage(STORAGE_KEYS.UNITS, units);

      this.logActivity({
        acao: 'Renovação / Extensão de Subscrição pelo Super Admin',
        categoria: 'plano',
        usuario_id: 'super-admin',
        usuario_nome: 'Super Administrador Geral',
        usuario_role: 'super_admin',
        detalhes: `Unidade '${unit.nome}' estendida por +${daysToAdd} dias (Nova expiração: ${unit.plano_data_expiracao})`,
      });

      return unit;
    }
    return null;
  }

  createManualPayment(paymentData: Partial<PaymentTransaction>): PaymentTransaction {
    const payments = this.getPayments();
    const newPay: PaymentTransaction = {
      id: 'pay-man-' + Date.now(),
      unidade_id: paymentData.unidade_id || 'unit-1',
      unidade_nome: paymentData.unidade_nome || 'Unidade de Saúde',
      plano_tipo: paymentData.plano_tipo || 'medio',
      periodicidade: paymentData.periodicidade || 'mensal',
      valor: paymentData.valor || 55000,
      desconto_aplicado: paymentData.desconto_aplicado || 0,
      metodo: paymentData.metodo || 'transferencia_bancaria',
      referencia_mcx: paymentData.referencia_mcx || 'LANÇAMENTO MANUAL SUPER ADMIN',
      status: 'confirmado',
      data_pagamento: new Date().toISOString(),
      validado_por: 'Super Administrador Geral',
      observacoes: paymentData.observacoes || 'Liquidação manual creditada directamente pelo Super Admin',
    };

    payments.unshift(newPay);
    this.setStorage(STORAGE_KEYS.PAYMENTS, payments);

    // Auto renew unit
    const unit = this.getUnitById(newPay.unidade_id);
    if (unit) {
      unit.plano_tipo = newPay.plano_tipo;
      unit.plano_periodicidade = newPay.periodicidade;
      unit.plano_status = 'ativo';
      const days = newPay.periodicidade === 'anual' ? 365 : newPay.periodicidade === 'semestral' ? 180 : newPay.periodicidade === 'trimestral' ? 90 : 30;
      this.extendUnitSubscription(unit.id, days, newPay.plano_tipo);
    }

    this.logActivity({
      acao: 'Lançamento Manual de Pagamento',
      categoria: 'plano',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Pagamento de ${newPay.valor.toLocaleString()} AOA creditado manualmente para ${newPay.unidade_nome}`,
    });

    return newPay;
  }

  resetDatabase(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.UNITS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_UNITS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SERVICES);
    localStorage.removeItem(STORAGE_KEYS.EXAMS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.SPONSORS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // --- Auth Session Simulation ---
  getCurrentUser(): UserProfile | null {
    return this.getStorage<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  setCurrentUser(user: UserProfile | null): void {
    if (user) {
      this.setStorage(STORAGE_KEYS.CURRENT_USER, user);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  logoffAll(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  getDemoUsers(): UserProfile[] {
    return this.getUsers();
  }

  // --- Policy & Legal Consents Management ---
  savePolicyConsent(consentData: {
    usuario_id: string;
    usuario_email: string;
    usuario_nome?: string;
    versao_politica?: string;
    termos_utilizacao?: boolean;
    politica_privacidade?: boolean;
    proteccao_dados?: boolean;
  }): PolicyConsentRecord {
    const consents = this.getStorage<PolicyConsentRecord[]>(STORAGE_KEYS.POLICY_CONSENTS, []);
    const newConsent: PolicyConsentRecord = {
      id: 'cons-' + Date.now(),
      usuario_id: consentData.usuario_id,
      usuario_email: consentData.usuario_email.toLowerCase().trim(),
      usuario_nome: consentData.usuario_nome,
      versao_politica: consentData.versao_politica || 'v1.2-2026',
      termos_utilizacao: consentData.termos_utilizacao ?? true,
      politica_privacidade: consentData.politica_privacidade ?? true,
      proteccao_dados: consentData.proteccao_dados ?? true,
      data_hora: new Date().toISOString(),
      ip_simulado: '197.149.244.' + Math.floor(10 + Math.random() * 200), // IP de Angola
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'MUTIKUKWAMA Web Client',
    };
    consents.unshift(newConsent);
    this.setStorage(STORAGE_KEYS.POLICY_CONSENTS, consents);

    this.logActivity({
      acao: 'Consentimento de Termos e Protecção de Dados',
      categoria: 'seguranca',
      usuario_id: newConsent.usuario_id,
      usuario_nome: newConsent.usuario_nome || newConsent.usuario_email,
      usuario_role: 'paciente',
      detalhes: `Aceitação registada para ${newConsent.usuario_email} (Versão: ${newConsent.versao_politica}) em conformidade com a Lei n.º 22/11 de Angola`,
    });

    return newConsent;
  }

  getPolicyConsents(): PolicyConsentRecord[] {
    return this.getStorage<PolicyConsentRecord[]>(STORAGE_KEYS.POLICY_CONSENTS, []);
  }

  // --- User Lookup & Password Reset Engine ---
  findUserByEmail(identifier: string): UserProfile | undefined {
    return this.findUserByEmailOrUsername(identifier);
  }

  findUserByEmailOrUsername(identifier: string): UserProfile | undefined {
    const clean = identifier.toLowerCase().trim();
    if (!clean) return undefined;

    // Check in stored users first
    const users = this.getUsers();
    const found = users.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uUser = (u.username || '').toLowerCase().trim();
      const uId = (u.id || '').toLowerCase().trim();
      return uEmail === clean || uUser === clean || uId === clean;
    });
    if (found) return found;

    // Check demo users
    const demo = DEMO_USERS.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uUser = (u.username || '').toLowerCase().trim();
      const uId = (u.id || '').toLowerCase().trim();
      return uEmail === clean || uUser === clean || uId === clean;
    });
    if (demo) return demo;

    // Also check if matches a HealthUnit (allows logging in directly with unit email or slug)
    const units = this.getAllUnits();
    const unitFound = units.find((un) => {
      const unEmail = (un.email || '').toLowerCase().trim();
      const unSlug = (un.slug || '').toLowerCase().trim();
      const unId = (un.id || '').toLowerCase().trim();
      return unEmail === clean || unSlug === clean || unId === clean;
    });
    if (unitFound) {
      return {
        id: `user-unit-${unitFound.id}`,
        email: unitFound.email,
        username: unitFound.slug || unitFound.id,
        nome: unitFound.nome,
        role: unitFound.tipo === 'deposito' ? 'deposito' : 'unidade',
        unidade_id: unitFound.id,
        telefone: unitFound.telefone,
        whatsapp: unitFound.whatsapp,
        senha_provisoria: unitFound.senha_provisoria || 'Mutiku@2026',
        created_at: unitFound.created_at,
        updated_at: unitFound.updated_at,
      };
    }

    return undefined;
  }

  async sendPasswordResetInstructions(email: string): Promise<{
    success: boolean;
    message: string;
    demoToken?: string;
  }> {
    const cleanEmail = email.toLowerCase().trim();
    const existing = this.findUserByEmail(cleanEmail);

    // Security rule: Always return the same neutral message so email existence is not leaked
    const neutralMessage =
      'Se existir uma conta associada a este e-mail, receberá instruções para redefinir a sua palavra-passe.';

    const token = 'rst-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now();

    if (existing) {
      const resetRequests = this.getStorage<
        Array<{ email: string; token: string; expires_at: number }>
      >(STORAGE_KEYS.PASSWORD_RESETS, []);

      resetRequests.unshift({
        email: cleanEmail,
        token,
        expires_at: Date.now() + 3600000, // 1 hour
      });

      this.setStorage(STORAGE_KEYS.PASSWORD_RESETS, resetRequests.slice(0, 50));

      this.logActivity({
        acao: 'Solicitação de Recuperação de Palavra-passe',
        categoria: 'seguranca',
        usuario_id: existing.id,
        usuario_nome: existing.nome,
        usuario_role: existing.role,
        detalhes: `Instruções de recuperação solicitadas para o e-mail ${cleanEmail}`,
      });
    }

    return {
      success: true,
      message: neutralMessage,
      demoToken: existing ? token : undefined,
    };
  }

  async resetPassword(
    email: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase().trim() === cleanEmail);

    if (userIndex >= 0) {
      users[userIndex].senha_provisoria = newPassword;
      users[userIndex].ultima_redefinicao_senha = new Date().toISOString();
      users[userIndex].updated_at = new Date().toISOString();
      this.setStorage(STORAGE_KEYS.USERS, users);

      // If current user, update session
      const current = this.getCurrentUser();
      if (current && current.email.toLowerCase().trim() === cleanEmail) {
        this.setCurrentUser({ ...current, senha_provisoria: newPassword });
      }

      this.logActivity({
        acao: 'Redefinição de Palavra-passe Concluída',
        categoria: 'seguranca',
        usuario_id: users[userIndex].id,
        usuario_nome: users[userIndex].nome,
        usuario_role: users[userIndex].role,
        detalhes: `Palavra-passe alterada com sucesso pelo titular da conta (${cleanEmail})`,
      });

      return {
        success: true,
        message: 'Palavra-passe actualizada com sucesso.',
      };
    }

    // Also check demo users to allow test resets
    const demoUser = DEMO_USERS.find((u) => u.email.toLowerCase().trim() === cleanEmail);
    if (demoUser) {
      const updatedDemo: UserProfile = {
        ...demoUser,
        senha_provisoria: newPassword,
        ultima_redefinicao_senha: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.saveUser(updatedDemo);

      return {
        success: true,
        message: 'Palavra-passe actualizada com sucesso.',
      };
    }

    return {
      success: false,
      message: 'Não foi possível localizar uma conta associada a este e-mail.',
    };
  }

  // --- Google OAuth Simulation & Account Linking ---
  async authenticateWithGoogle(googleData: {
    email: string;
    nome: string;
    avatar_url?: string;
    role?: UserRole;
  }): Promise<{ user: UserProfile; isNew: boolean }> {
    const cleanEmail = googleData.email.toLowerCase().trim();
    let existing = this.findUserByEmail(cleanEmail);

    if (existing) {
      // User already exists: Log in without duplicating
      if (googleData.avatar_url && !existing.avatar_url) {
        existing.avatar_url = googleData.avatar_url;
        this.saveUser(existing);
      }
      this.setCurrentUser(existing);

      this.logActivity({
        acao: 'Autenticação com Google com Sucesso',
        categoria: 'auth',
        usuario_id: existing.id,
        usuario_nome: existing.nome,
        usuario_role: existing.role,
        detalhes: `Utilizador autenticado via Google Account (${cleanEmail})`,
      });

      return { user: existing, isNew: false };
    }

    // Create new profile for Google user
    const newUser: UserProfile = {
      id: 'usr-goog-' + Date.now(),
      email: cleanEmail,
      nome: googleData.nome || cleanEmail.split('@')[0],
      avatar_url:
        googleData.avatar_url ||
        `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      role: googleData.role || 'paciente',
      auth_provider: 'google',
      termos_aceites: true,
      data_aceitacao_termos: new Date().toISOString(),
      versao_termos: 'v1.2-2026',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.saveUser(newUser);
    this.setCurrentUser(newUser);

    // Save policy consent for new Google user
    this.savePolicyConsent({
      usuario_id: newUser.id,
      usuario_email: newUser.email,
      usuario_nome: newUser.nome,
      versao_politica: 'v1.2-2026',
      termos_utilizacao: true,
      politica_privacidade: true,
      proteccao_dados: true,
    });

    this.logActivity({
      acao: 'Registo de Nova Conta via Google',
      categoria: 'auth',
      usuario_id: newUser.id,
      usuario_nome: newUser.nome,
      usuario_role: newUser.role,
      detalhes: `Nova conta registada via Google Sign-In (${cleanEmail}) com perfil '${newUser.role}'`,
    });

    return { user: newUser, isNew: true };
  }

  // --- Sponsors & Supporting Partners (Carrossel de Empresas Apoiantes) ---
  getAllSponsors(): SponsorPartner[] {
    const stored = this.getStorage<SponsorPartner[]>(STORAGE_KEYS.SPONSORS, INITIAL_SPONSORS);
    if (!stored || stored.length === 0) {
      this.setStorage(STORAGE_KEYS.SPONSORS, INITIAL_SPONSORS);
      return INITIAL_SPONSORS;
    }
    return [...stored].sort((a, b) => a.ordem - b.ordem);
  }

  getSponsors(onlyActive = true): SponsorPartner[] {
    const all = this.getAllSponsors();
    if (!onlyActive) return all;
    return all.filter((s) => s.ativo);
  }

  createSponsor(data: Omit<SponsorPartner, 'id' | 'created_at'>): SponsorPartner {
    const all = this.getAllSponsors();
    const newSponsor: SponsorPartner = {
      ...data,
      id: 'spons-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    all.push(newSponsor);
    this.setStorage(STORAGE_KEYS.SPONSORS, all);

    this.logActivity({
      acao: 'Novo Patrocinador / Apoiante Adicionado',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Empresa "${newSponsor.nome}" cadastrada como '${newSponsor.categoria}' (${newSponsor.ativo ? 'Activa no Carrossel' : 'Oculta'})`,
    });

    return newSponsor;
  }

  updateSponsor(id: string, updates: Partial<SponsorPartner>): SponsorPartner | null {
    const all = this.getAllSponsors();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.setStorage(STORAGE_KEYS.SPONSORS, all);

    this.logActivity({
      acao: 'Patrocinador / Apoiante Actualizado',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Dados da empresa parceira "${all[index].nome}" actualizados`,
    });

    return all[index];
  }

  toggleSponsorActive(id: string): SponsorPartner | null {
    const all = this.getAllSponsors();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const newStatus = !all[index].ativo;
    all[index].ativo = newStatus;
    all[index].updated_at = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.SPONSORS, all);

    this.logActivity({
      acao: 'Visibilidade no Carrossel Alterada',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Exibição no carrossel para "${all[index].nome}" alterada para: ${newStatus ? 'ACTIVA (VISÍVEL NO CARROSSEL)' : 'DESACTIVADA (OCULTA)'}`,
    });

    return all[index];
  }

  toggleSponsorHighlight(id: string): SponsorPartner | null {
    const all = this.getAllSponsors();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) return null;

    all[index].em_destaque = !all[index].em_destaque;
    all[index].updated_at = new Date().toISOString();
    this.setStorage(STORAGE_KEYS.SPONSORS, all);
    return all[index];
  }

  deleteSponsor(id: string): boolean {
    const all = this.getAllSponsors();
    const target = all.find((s) => s.id === id);
    const filtered = all.filter((s) => s.id !== id);
    if (filtered.length === all.length) return false;

    this.setStorage(STORAGE_KEYS.SPONSORS, filtered);

    if (target) {
      this.logActivity({
        acao: 'Patrocinador / Apoiante Removido',
        categoria: 'admin',
        usuario_id: 'super-admin',
        usuario_nome: 'Super Administrador Geral',
        usuario_role: 'super_admin',
        detalhes: `Empresa "${target.nome}" removida do catálogo de patrocinadores`,
      });
    }

    return true;
  }

  resetSponsors(): void {
    this.setStorage(STORAGE_KEYS.SPONSORS, INITIAL_SPONSORS);
    this.logActivity({
      acao: 'Patrocinadores Restaurados para Padrão',
      categoria: 'admin',
      usuario_id: 'super-admin',
      usuario_nome: 'Super Administrador Geral',
      usuario_role: 'super_admin',
      detalhes: `Lista de empresas apoiantes restaurada para os padrões oficiais`,
    });
  }

  // --- MINSA Official Announcements & Directives ---
  getAnnouncements(): MinsaAnnouncement[] {
    return this.getStorage<MinsaAnnouncement[]>(STORAGE_KEYS.ANNOUNCEMENTS, INITIAL_MINSA_ANNOUNCEMENTS);
  }

  getAnnouncementById(id: string): MinsaAnnouncement | undefined {
    return this.getAnnouncements().find((a) => a.id === id);
  }

  createAnnouncement(data: Omit<MinsaAnnouncement, 'id' | 'criado_em' | 'confirmacoes_leitura'> & { id?: string }): MinsaAnnouncement {
    const list = this.getAnnouncements();
    const newAnnouncement: MinsaAnnouncement = {
      ...data,
      id: data.id || `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      confirmacoes_leitura: [],
      criado_em: new Date().toISOString(),
    };
    list.unshift(newAnnouncement);
    this.setStorage(STORAGE_KEYS.ANNOUNCEMENTS, list);

    this.logActivity({
      acao: 'Comunicado Oficial MINSA Publicado',
      categoria: 'admin',
      usuario_id: 'minsa-gestor',
      usuario_nome: 'Ministério da Saúde - Gabinete DNME',
      usuario_role: 'super_admin',
      detalhes: `Ofício "${newAnnouncement.numero_oficio}" - ${newAnnouncement.titulo} publicado com prioridade ${newAnnouncement.prioridade}`,
    });

    try {
      window.dispatchEvent(new CustomEvent('mutikukwama_announcement_published', { detail: newAnnouncement }));
    } catch {
      // ignore
    }

    return newAnnouncement;
  }

  deleteAnnouncement(id: string): boolean {
    const list = this.getAnnouncements();
    const target = list.find((a) => a.id === id);
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length === list.length) return false;
    this.setStorage(STORAGE_KEYS.ANNOUNCEMENTS, filtered);
    if (target) {
      this.logActivity({
        acao: 'Comunicado Oficial MINSA Removido',
        categoria: 'admin',
        usuario_id: 'minsa-gestor',
        usuario_nome: 'Ministério da Saúde - Gabinete DNME',
        usuario_role: 'super_admin',
        detalhes: `Ofício "${target.numero_oficio}" removido dos registos oficiais`,
      });
    }
    return true;
  }

  markAnnouncementRead(announcementId: string, unitId: string, unitNome: string, responsavel: string): boolean {
    const list = this.getAnnouncements();
    const ann = list.find((a) => a.id === announcementId);
    if (!ann) return false;

    if (!ann.confirmacoes_leitura) {
      ann.confirmacoes_leitura = [];
    }

    const alreadyRead = ann.confirmacoes_leitura.some((c) => c.unidade_id === unitId);
    if (alreadyRead) return true;

    ann.confirmacoes_leitura.push({
      unidade_id: unitId,
      unidade_nome: unitNome,
      data_leitura: new Date().toISOString(),
      responsavel: responsavel || 'Responsável Técnico / Farmacêutico',
    });

    this.setStorage(STORAGE_KEYS.ANNOUNCEMENTS, list);

    this.logActivity({
      acao: 'Leitura de Comunicado MINSA Confirmada',
      categoria: 'admin',
      usuario_id: unitId,
      usuario_nome: unitNome,
      usuario_role: 'unidade',
      detalhes: `A unidade "${unitNome}" confirmou a leitura do ofício "${ann.numero_oficio}"`,
    });

    try {
      window.dispatchEvent(new CustomEvent('mutikukwama_announcement_read', { detail: { announcementId, unitId } }));
    } catch {
      // ignore
    }

    return true;
  }

  getUnitAnnouncements(unitId: string, unitTipo?: string, provincia?: string): { announcement: MinsaAnnouncement; isRead: boolean }[] {
    const list = this.getAnnouncements();
    return list
      .filter((ann) => {
        if (ann.publico_alvo && !ann.publico_alvo.includes('todas')) {
          if (unitTipo && !ann.publico_alvo.includes(unitTipo as any)) {
            return false;
          }
        }
        if (ann.ambito_territorial && ann.ambito_territorial !== 'Nacional' && ann.ambito_territorial !== 'all') {
          if (provincia && ann.ambito_territorial.toLowerCase() !== provincia.toLowerCase()) {
            return false;
          }
        }
        return true;
      })
      .map((ann) => ({
        announcement: ann,
        isRead: ann.confirmacoes_leitura?.some((c) => c.unidade_id === unitId) || false,
      }));
  }
}

export const supabaseData = new SupabaseDataService();
