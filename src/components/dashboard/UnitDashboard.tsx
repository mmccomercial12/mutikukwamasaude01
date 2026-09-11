import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Building2,
  Package,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  Truck,
  Phone,
  Search,
  Lock,
  Crown,
  Star,
  Layers,
  ArrowRight,
  TrendingUp,
  Upload,
  Download,
  RefreshCw,
  Sliders,
  MapPin,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  FileText,
  Printer,
  Receipt,
  CreditCard,
  Sparkles,
  Filter,
  Check,
  X,
  Stethoscope,
  Microscope,
  DollarSign,
  Calendar,
  Settings,
  HelpCircle,
  ShoppingCart,
  CheckSquare,
  Square,
  Flame,
  Image as ImageIcon,
  Camera,
  UploadCloud,
  Megaphone,
} from 'lucide-react';
import { compressImageFile } from '../../utils/imageCompressor';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useCart } from '../../context/CartContext';
import { supabaseData } from '../../services/supabase';
import { ProductItem, Order, HealthUnit, PlanType, PlanPeriodicity, PaymentTransaction } from '../../types';
import { PROVINCES_ANGOLA } from '../../services/mockData';
import { MedicalSearchResultCard } from '../common/MedicalSearchResultCard';
import { UnitRouteMapModal } from '../units/UnitRouteMapModal';
import { UnitProfileModal } from '../units/UnitProfileModal';
import { CartDrawerModal } from '../cart/CartDrawerModal';
import { MostWantedItemsTab } from './MostWantedItemsTab';
import { PaymentReceiptModal } from '../admin/PaymentReceiptModal';
import { UnitMinsaAnnouncementsView } from './UnitMinsaAnnouncementsView';

interface UnitDashboardProps {
  onNavigatePlans: () => void;
  onOpenCart?: () => void;
}

export const UnitDashboard: React.FC<UnitDashboardProps> = ({ onNavigatePlans, onOpenCart }) => {
  const { currentUser, isDepot, isAdmin, isSuperAdmin } = useAuth();
  const { success, warning, error } = useToast();
  const {
    items: cartItems,
    addItem: addCartItem,
    subtotal: cartSubtotal,
    totalItemsCount,
    currentUnit: currentCartUnit,
  } = useCart();

  const [isB2BCartOpen, setIsB2BCartOpen] = useState(false);

  const handleOpenCart = () => {
    if (onOpenCart) {
      onOpenCart();
    } else {
      setIsB2BCartOpen(true);
    }
  };

  // B2B Wholesale Depot Search & Navigation States
  const [b2bSearchQuery, setB2bSearchQuery] = useState('');
  const [b2bProvinceFilter, setB2bProvinceFilter] = useState('all');
  const [selectedDepotForRoute, setSelectedDepotForRoute] = useState<HealthUnit | null>(null);
  const [selectedDepotForProfile, setSelectedDepotForProfile] = useState<HealthUnit | null>(null);
  const [savedDepotItems, setSavedDepotItems] = useState<Set<string>>(new Set());

  // Refresh trigger for reactivity
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  // All available units in system (to allow manager/admin switcher)
  const allUnits = useMemo(() => supabaseData.getAllUnits(), [refreshKey]);

  // Determine current active unit ID
  const [selectedUnitId, setSelectedUnitId] = useState<string>(() => {
    if (currentUser?.unidade_id) return currentUser.unidade_id;
    if (isDepot) return 'unit-depot-1';
    return allUnits[0]?.id || 'unit-1';
  });

  const unit = useMemo(() => {
    return supabaseData.getUnitById(selectedUnitId) || allUnits[0];
  }, [selectedUnitId, allUnits, refreshKey]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'stock' | 'excel' | 'pedidos' | 'mais-procurados' | 'b2b-deposito' | 'perfil' | 'subscricao' | 'comunicados-minsa'>('stock');

  // MINSA Official Announcements for this unit
  const unitAnnouncements = useMemo(() => {
    if (!unit) return [];
    return supabaseData.getUnitAnnouncements(unit.id, unit.tipo, unit.provincia);
  }, [unit?.id, unit?.tipo, unit?.provincia, refreshKey]);

  const unreadMinsaCount = useMemo(() => {
    return unitAnnouncements.filter((a) => !a.isRead).length;
  }, [unitAnnouncements]);

  // Most Wanted Plan Limits: Avançado = 100, Médio = 50, Básico = 10
  const mostWantedLimit = useMemo(() => {
    if (unit?.plano_tipo === 'avancado') return 100;
    if (unit?.plano_tipo === 'medio') return 50;
    return 10;
  }, [unit?.plano_tipo]);

  // Stock Filter States
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'medicamento' | 'servico' | 'exame' | 'suplemento' | 'material'>('all');
  const [stockLevelFilter, setStockLevelFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [prescriptionFilter, setPrescriptionFilter] = useState<'all' | 'yes' | 'no'>('all');

  // Orders Filter State
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');
  const [viewingOrderReceipt, setViewingOrderReceipt] = useState<Order | null>(null);
  const [viewingPaymentProof, setViewingPaymentProof] = useState<PaymentTransaction | null>(null);

  // Bulk Selection & Inventory Reset State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isClearAllInventoryModalOpen, setIsClearAllInventoryModalOpen] = useState(false);
  const [isDeleteSelectedModalOpen, setIsDeleteSelectedModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  const [replaceOnImport, setReplaceOnImport] = useState(false);

  // Add / Edit Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [productForm, setProductForm] = useState({
    nome: '',
    nome_generico: '',
    categoria: 'medicamento' as 'medicamento' | 'servico' | 'exame',
    subcategoria: '',
    forma_farmaceutica: 'Comprimidos',
    dosagem: '',
    preco: '',
    quantidade_stock: '',
    requer_receita: false,
    destaque: false,
    fabricante: '',
    lote: '',
    descricao: '',
  });

  // Excel Paste / Upload state (Exact model: nome, categoria, stock, preco_kz)
  const [excelText, setExcelText] = useState(
    'nome;categoria;stock;preco_kz\n' +
    'Paracetamol 500mg;Antipirético;320;450\n' +
    'Ibuprofeno 400mg;Analgésico;124;850\n' +
    'Amoxicilina 500mg;Antibiótico;18;2400'
  );

  // Unit Profile Edit Form State
  const [profileForm, setProfileForm] = useState<Partial<HealthUnit>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [unitNewPassword, setUnitNewPassword] = useState('');
  const [showUnitNewPassword, setShowUnitNewPassword] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [logoFileName, setLogoFileName] = useState('');
  const [bannerFileName, setBannerFileName] = useState('');
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);
  const [showBannerUrlInput, setShowBannerUrlInput] = useState(false);

  // Active Logo & Banner (live preview from form or stored in unit)
  const currentLogo = profileForm.logo_url !== undefined ? profileForm.logo_url : (unit?.logo_url || '');
  const currentBanner = profileForm.banner_url !== undefined ? profileForm.banner_url : (unit?.banner_url || '');
  const [logoLoadError, setLogoLoadError] = useState(false);

  useEffect(() => {
    setLogoLoadError(false);
  }, [currentLogo]);

  // Subscription Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPlanType, setPaymentPlanType] = useState<PlanType>('medio');
  const [paymentPeriodicity, setPaymentPeriodicity] = useState<PlanPeriodicity>('mensal');
  const [paymentMethod, setPaymentMethod] = useState<'multicaixa_express' | 'transferencia_bancaria'>('multicaixa_express');
  const [paymentAmount, setPaymentAmount] = useState('45000');
  const [paymentProofName, setPaymentProofName] = useState('comprovativo_pagamento.pdf');

  // Sync profile form when unit changes
  React.useEffect(() => {
    if (unit) {
      setProfileForm({
        nome: unit.nome,
        tipo: unit.tipo,
        provincia: unit.provincia,
        municipio: unit.municipio,
        bairro: unit.bairro,
        endereco_completo: unit.endereco_completo,
        telefone: unit.telefone,
        whatsapp: unit.whatsapp,
        email: unit.email,
        horario_funcionamento: unit.horario_funcionamento,
        aberto_agora: unit.aberto_agora,
        certificado_institucional: unit.certificado_institucional,
        descricao: unit.descricao,
        logo_url: unit.logo_url || '',
        banner_url: unit.banner_url || '',
      });
      setPaymentPlanType(unit.plano_tipo);
    }
  }, [unit]);

  // Plan Expiration & Operation Blocking Check
  const planStatus = useMemo(() => {
    return supabaseData.checkUnitPlanStatus(selectedUnitId);
  }, [selectedUnitId, unit, refreshKey]);

  // Products of Current Unit
  const unitProducts = useMemo(() => {
    let prods = supabaseData.getProducts().filter((p) => p.unidade_id === selectedUnitId);

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      prods = prods.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.nome_generico?.toLowerCase().includes(q) ||
          p.dosagem?.toLowerCase().includes(q) ||
          p.descricao.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      prods = prods.filter((p) => p.categoria === categoryFilter);
    }

    if (stockLevelFilter === 'in_stock') {
      prods = prods.filter((p) => p.quantidade_stock > 10);
    } else if (stockLevelFilter === 'low_stock') {
      prods = prods.filter((p) => p.quantidade_stock > 0 && p.quantidade_stock <= 10);
    } else if (stockLevelFilter === 'out_of_stock') {
      prods = prods.filter((p) => p.quantidade_stock === 0 || !p.disponivel);
    }

    if (prescriptionFilter === 'yes') {
      prods = prods.filter((p) => p.requer_receita);
    } else if (prescriptionFilter === 'no') {
      prods = prods.filter((p) => !p.requer_receita);
    }

    return prods;
  }, [selectedUnitId, searchFilter, categoryFilter, stockLevelFilter, prescriptionFilter, refreshKey]);

  // Unfiltered products for KPIs
  const allUnitProducts = useMemo(() => {
    return supabaseData.getProducts().filter((p) => p.unidade_id === selectedUnitId);
  }, [selectedUnitId, refreshKey]);

  // Orders of Current Unit
  const unitOrders = useMemo(() => {
    let orders = supabaseData.getOrders().filter((o) => o.unidade_id === selectedUnitId);
    if (orderStatusFilter !== 'all') {
      orders = orders.filter((o) => o.status === orderStatusFilter);
    }
    return orders;
  }, [selectedUnitId, orderStatusFilter, refreshKey]);

  const allUnitOrders = useMemo(() => {
    return supabaseData.getOrders().filter((o) => o.unidade_id === selectedUnitId);
  }, [selectedUnitId, refreshKey]);

  // Wholesale Depots (B2B)
  const b2bWholesaleProducts = useMemo(() => {
    return supabaseData.getProducts().filter((p) => {
      const u = supabaseData.getUnitById(p.unidade_id);
      return u?.tipo === 'deposito';
    });
  }, [refreshKey]);

  const filteredB2BProducts = useMemo(() => {
    return b2bWholesaleProducts.filter((wp) => {
      const depot = supabaseData.getUnitById(wp.unidade_id);
      if (b2bProvinceFilter !== 'all' && depot?.provincia !== b2bProvinceFilter) {
        return false;
      }
      if (b2bSearchQuery.trim()) {
        const q = b2bSearchQuery.toLowerCase().trim();
        const inName = wp.nome.toLowerCase().includes(q);
        const inDesc = wp.descricao?.toLowerCase().includes(q);
        const inDepot = depot?.nome?.toLowerCase().includes(q);
        if (!inName && !inDesc && !inDepot) return false;
      }
      return true;
    });
  }, [b2bWholesaleProducts, b2bSearchQuery, b2bProvinceFilter]);

  // Unit Payments
  const unitPayments = useMemo(() => {
    return supabaseData.getPayments().filter((p) => p.unidade_id === selectedUnitId);
  }, [selectedUnitId, refreshKey]);

  // KPI Calculations
  const totalRevenue = useMemo(() => {
    return allUnitOrders
      .filter((o) => o.status !== 'cancelado')
      .reduce((acc, o) => acc + (o.total || 0), 0);
  }, [allUnitOrders]);

  const criticalStockCount = useMemo(() => {
    return allUnitProducts.filter((p) => p.quantidade_stock <= 5).length;
  }, [allUnitProducts]);

  const pendingOrdersCount = useMemo(() => {
    return allUnitOrders.filter((o) => o.status === 'pendente' || o.status === 'em_preparacao').length;
  }, [allUnitOrders]);

  // Max products allowed by plan
  const planLimits = useMemo(() => {
    if (unit?.plano_tipo === 'basico') return 50;
    if (unit?.plano_tipo === 'medio') return 200;
    if (unit?.plano_tipo === 'avancado' || isDepot) return 999999;
    return 100;
  }, [unit, isDepot]);

  // Handlers for Products
  const handleOpenAddProduct = (prefill?: {
    nome?: string;
    nome_generico?: string;
    categoria?: 'medicamento' | 'servico' | 'exame' | 'material_medico' | 'higiene';
    dosagem?: string;
    preco?: number;
    descricao?: string;
  }) => {
    setEditingProduct(null);
    setProductForm({
      nome: prefill?.nome || '',
      nome_generico: prefill?.nome_generico || '',
      categoria: (prefill?.categoria === 'servico' || prefill?.categoria === 'exame' ? prefill.categoria : 'medicamento'),
      subcategoria: '',
      forma_farmaceutica: 'Comprimidos',
      dosagem: prefill?.dosagem || '',
      preco: prefill?.preco ? prefill.preco.toString() : '',
      quantidade_stock: '50',
      requer_receita: false,
      destaque: false,
      fabricante: '',
      lote: '',
      descricao: prefill?.descricao || '',
    });
    setIsProductModalOpen(true);
  };

  const handleNavigateToTab = (targetTab: any, searchQuery?: string) => {
    if (targetTab === 'stock') {
      if (searchQuery) setSearchFilter(searchQuery);
      setActiveTab('stock');
    } else if (targetTab === 'b2b-deposito') {
      if (searchQuery) setB2bSearchQuery(searchQuery);
      setActiveTab('b2b-deposito');
    } else {
      setActiveTab(targetTab);
    }
  };

  const handleOpenEditProduct = (prod: ProductItem) => {
    setEditingProduct(prod);
    setProductForm({
      nome: prod.nome,
      nome_generico: prod.nome_generico || '',
      categoria: prod.categoria,
      subcategoria: prod.subcategoria || '',
      forma_farmaceutica: prod.forma_farmaceutica || 'Comprimidos',
      dosagem: prod.dosagem || '',
      preco: prod.preco.toString(),
      quantidade_stock: prod.quantidade_stock.toString(),
      requer_receita: !!prod.requer_receita,
      destaque: !!prod.destaque,
      fabricante: prod.fabricante || '',
      lote: prod.data_validade || '',
      descricao: prod.descricao || '',
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProductForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (planStatus.isBlocked) {
      error(planStatus.reason || 'Operação bloqueada por expiração de plano.');
      return;
    }

    const price = parseFloat(productForm.preco);
    const stock = parseInt(productForm.quantidade_stock, 10);

    if (!productForm.nome.trim() || isNaN(price) || isNaN(stock)) {
      warning('Preencha os campos obrigatórios com valores válidos.');
      return;
    }

    if (!editingProduct && allUnitProducts.length >= planLimits) {
      warning(`Limite do plano ${unit?.plano_tipo.toUpperCase()} atingido (${planLimits} produtos). Faça upgrade do seu plano para cadastrar mais itens.`);
      return;
    }

    if (editingProduct) {
      const updated: ProductItem = {
        ...editingProduct,
        nome: productForm.nome.trim(),
        nome_generico: productForm.nome_generico.trim() || productForm.nome.split(' ')[0],
        categoria: productForm.categoria,
        subcategoria: productForm.subcategoria,
        forma_farmaceutica: productForm.forma_farmaceutica,
        dosagem: productForm.dosagem,
        preco: price,
        quantidade_stock: stock,
        disponivel: stock > 0,
        requer_receita: productForm.requer_receita,
        destaque: productForm.destaque,
        fabricante: productForm.fabricante,
        data_validade: productForm.lote,
        descricao: productForm.descricao || `${productForm.nome} - Disponível na ${unit?.nome}.`,
        updated_at: new Date().toISOString(),
      };
      supabaseData.saveProduct(updated);
      success(`Produto "${updated.nome}" atualizado com sucesso!`);
    } else {
      const newProd: ProductItem = {
        id: 'prod-' + Date.now(),
        unidade_id: selectedUnitId,
        nome: productForm.nome.trim(),
        nome_generico: productForm.nome_generico.trim() || productForm.nome.split(' ')[0],
        categoria: productForm.categoria,
        subcategoria: productForm.subcategoria,
        forma_farmaceutica: productForm.forma_farmaceutica,
        dosagem: productForm.dosagem,
        preco: price,
        quantidade_stock: stock,
        disponivel: stock > 0,
        requer_receita: productForm.requer_receita,
        destaque: productForm.destaque,
        fabricante: productForm.fabricante,
        data_validade: productForm.lote,
        visualizacoes: 0,
        descricao: productForm.descricao || `${productForm.nome} - Cadastrado no catálogo oficial.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      supabaseData.saveProduct(newProd);
      success(`Novo produto "${newProd.nome}" cadastrado com sucesso!`);
    }

    setIsProductModalOpen(false);
    triggerRefresh();
  };

  const handleAdjustStock = (prodId: string, delta: number) => {
    if (planStatus.isBlocked) {
      error('Subscrição expirada. Regularize o plano para atualizar o inventário.');
      return;
    }
    const res = supabaseData.adjustProductStock(prodId, delta);
    if (res) {
      success(`Stock atualizado: ${res.quantidade_stock} unidades disponíveis.`);
      triggerRefresh();
    }
  };

  const handleToggleAvailability = (prodId: string) => {
    const res = supabaseData.toggleProductAvailability(prodId);
    if (res) {
      success(`Produto ${res.disponivel ? 'disponibilizado' : 'marcado como indisponível'}.`);
      triggerRefresh();
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    setProductToDelete({ id, name });
  };

  const handleConfirmDeleteSingleProduct = () => {
    if (!productToDelete) return;
    const { id, name } = productToDelete;
    supabaseData.deleteProduct(id);
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setProductToDelete(null);
    success(`Produto "${name}" removido com sucesso.`);
    triggerRefresh();
  };

  // --- Bulk Selection & Inventory Elimination Handlers ---
  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllFilteredSelected = useMemo(() => {
    if (unitProducts.length === 0) return false;
    return unitProducts.every((p) => selectedProductIds.has(p.id));
  }, [unitProducts, selectedProductIds]);

  const isSomeFilteredSelected = useMemo(() => {
    if (unitProducts.length === 0) return false;
    return unitProducts.some((p) => selectedProductIds.has(p.id)) && !isAllFilteredSelected;
  }, [unitProducts, selectedProductIds, isAllFilteredSelected]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Unselect all currently filtered products
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        unitProducts.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      // Select all currently filtered products
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        unitProducts.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handleSelectEntireInventory = () => {
    const allIds = new Set(allUnitProducts.map((p) => p.id));
    setSelectedProductIds(allIds);
    success(`Todos os ${allIds.size} produtos do inventário foram selecionados.`);
  };

  const handleClearSelection = () => {
    setSelectedProductIds(new Set());
  };

  const handleConfirmDeleteSelected = () => {
    if (selectedProductIds.size === 0) return;
    const count = selectedProductIds.size;
    supabaseData.deleteProducts(Array.from(selectedProductIds));
    setSelectedProductIds(new Set());
    setIsDeleteSelectedModalOpen(false);
    success(`${count} ${count === 1 ? 'medicamento eliminado' : 'medicamentos eliminados'} com sucesso. Catálogo pronto para actualização!`);
    triggerRefresh();
  };

  const handleConfirmClearAllInventory = () => {
    const totalCount = allUnitProducts.length;
    supabaseData.clearUnitInventory(selectedUnitId);
    setSelectedProductIds(new Set());
    setIsClearAllInventoryModalOpen(false);
    success(`Todo o inventário atual (${totalCount} produtos) foi removido com sucesso. O catálogo está limpo para carregar uma nova lista actualizada!`);
    triggerRefresh();
  };

  // Batch Excel Import
  const handleProcessExcel = () => {
    if (planStatus.isBlocked) {
      error(planStatus.reason || 'Operação bloqueada por expiração de plano.');
      return;
    }

    if (!excelText.trim()) {
      error('O editor de dados está vazio. Carregue um ficheiro Excel (.xlsx/.csv) ou cole os dados.');
      return;
    }

    // Guard against raw zipped binary text if pasted manually
    if (excelText.startsWith('PK\x03\x04') || excelText.includes('[Content_Types].xml')) {
      error('Detectado ficheiro binário não processado. Por favor utilize o botão "Carregar Ficheiro" para processar o ficheiro .xlsx automaticamente.');
      return;
    }

    const res = supabaseData.processExcelImport(selectedUnitId, excelText, replaceOnImport);
    if (res.success) {
      success(
        replaceOnImport
          ? `Inventário anterior substituído com sucesso! ${res.importedCount} novos produtos importados.`
          : `Importados com sucesso ${res.importedCount} produtos via folha Excel/CSV!`
      );
      setSelectedProductIds(new Set());
      setActiveTab('stock');
      triggerRefresh();
    } else {
      error(res.errors[0]?.error || 'Erro ao processar ficheiro Excel.');
    }
  };

  const handleFileUpload = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isExcelBinary = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || file.type.includes('spreadsheet') || file.type.includes('excel');

    if (isExcelBinary) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            error('O ficheiro Excel não contém nenhuma folha com dados.');
            return;
          }
          const worksheet = workbook.Sheets[firstSheetName];
          const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
          
          if (!csv || !csv.trim()) {
            error('A folha do Excel está vazia.');
            return;
          }
          
          setExcelText(csv.trim());
          success(`Ficheiro Excel "${file.name}" lido e convertido com sucesso!`);
        } catch (err) {
          console.error('Erro ao ler ficheiro Excel:', err);
          error('Não foi possível ler o ficheiro Excel. Certifique-se de que é um documento .xlsx ou .xls válido.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV or TXT file
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          // If a user renamed a .xlsx to .csv, detect binary header
          if (content.startsWith('PK\x03\x04') || content.includes('[Content_Types].xml')) {
            const bufferReader = new FileReader();
            bufferReader.onload = (bufEvt) => {
              try {
                const data = new Uint8Array(bufEvt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
                setExcelText(csv.trim());
                success(`Ficheiro Excel "${file.name}" processado com sucesso!`);
              } catch (e) {
                error('Ficheiro Excel corrompido ou formato não suportado.');
              }
            };
            bufferReader.readAsArrayBuffer(file);
            return;
          }

          setExcelText(content.trim());
          success(`Ficheiro "${file.name}" carregado com sucesso!`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadXlsxTemplate = () => {
    try {
      const wsData = [
        ['nome', 'categoria', 'stock', 'preco_kz'],
        ['Paracetamol 500mg', 'Antipirético', 320, 450],
        ['Ibuprofeno 400mg', 'Analgésico', 124, 850],
        ['Amoxicilina 500mg', 'Antibiótico', 18, 2400],
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Medicamentos');
      XLSX.writeFile(wb, 'modelo_importacao_medicamentos.xlsx');
      success('Modelo oficial Excel (.XLSX) descarregado com sucesso!');
    } catch (err) {
      handleDownloadCsvTemplate();
    }
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'nome;categoria;stock;preco_kz\n' +
      'Paracetamol 500mg;Antipirético;320;450\n' +
      'Ibuprofeno 400mg;Analgésico;124;850\n' +
      'Amoxicilina 500mg;Antibiótico;18;2400';

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `modelo_importacao_medicamentos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Modelo oficial CSV descarregado com sucesso!');
  };

  const handleExportCurrentCatalog = () => {
    try {
      const prods = supabaseData.getProducts().filter((p) => p.unidade_id === selectedUnitId);
      const wsData = [
        ['nome', 'categoria', 'stock', 'preco_kz'],
        ...prods.map((p) => [p.nome, p.subcategoria || p.categoria, p.quantidade_stock, p.preco]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      const fileName = `catalogo_${unit?.nome ? unit.nome.toLowerCase().replace(/\s+/g, '_') : 'unidade'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      success(`Catálogo Excel descarregado com ${prods.length} itens!`);
    } catch (err) {
      // Fallback to CSV
      const prods = supabaseData.getProducts().filter((p) => p.unidade_id === selectedUnitId);
      let csv = 'nome;categoria;stock;preco_kz\n';
      prods.forEach((p) => {
        csv += `"${p.nome}";"${p.subcategoria || p.categoria}";${p.quantidade_stock};${p.preco}\n`;
      });

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `catalogo_${unit?.nome.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      success(`Catálogo exportado com ${prods.length} itens no formato CSV!`);
    }
  };

  // Orders Status Update
  const handleUpdateOrderStatus = (orderId: string, status: Order['status']) => {
    supabaseData.updateOrderStatus(orderId, status);
    success(`Estado do pedido atualizado para "${status.replace('_', ' ')}".`);
    triggerRefresh();
  };

  // Unit Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    const updatedUnit: HealthUnit = {
      ...unit,
      ...profileForm,
      nome: profileForm.nome || unit.nome,
      logo_url: profileForm.logo_url !== undefined ? profileForm.logo_url : (unit.logo_url || ''),
      banner_url: profileForm.banner_url !== undefined ? profileForm.banner_url : (unit.banner_url || ''),
      email: profileForm.email || unit.email,
      telefone: profileForm.telefone || unit.telefone,
      whatsapp: profileForm.whatsapp || unit.whatsapp,
      provincia: profileForm.provincia || unit.provincia,
      municipio: profileForm.municipio || unit.municipio,
      bairro: profileForm.bairro || unit.bairro,
      endereco_completo: profileForm.endereco_completo || unit.endereco_completo,
      horario_funcionamento: profileForm.horario_funcionamento || unit.horario_funcionamento,
      aberto_agora: profileForm.aberto_agora ?? unit.aberto_agora,
      updated_at: new Date().toISOString(),
    };

    if (isChangingPassword && unitNewPassword.trim()) {
      updatedUnit.senha_provisoria = unitNewPassword.trim();
      updatedUnit.ultima_redefinicao_senha = new Date().toISOString();
      supabaseData.resetUnitPassword(unit.id, updatedUnit.email, unitNewPassword.trim());
      setIsChangingPassword(false);
      setUnitNewPassword('');
    }

    supabaseData.saveUnit(updatedUnit);
    setProfileForm({
      ...updatedUnit,
      logo_url: updatedUnit.logo_url || '',
      banner_url: updatedUnit.banner_url || '',
    });
    success('Dados, logótipo e imagem de destaque da unidade guardados com sucesso!');
    triggerRefresh();
  };

  // Handle Logo Upload and Compression
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Por favor, selecione um ficheiro de imagem válido (.png, .jpg, .jpeg, .webp, .svg).');
      return;
    }

    try {
      setIsUploadingLogo(true);
      const compressed = await compressImageFile(file, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.85,
        outputFormat: 'image/jpeg',
      });
      setProfileForm((prev) => ({ ...prev, logo_url: compressed }));
      setLogoFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
      success(`Logótipo "${file.name}" carregado e otimizado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao processar logótipo:', err);
      error(err.message || 'Erro ao processar imagem.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Handle Banner / Facade Upload and Compression
  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      error('Por favor, selecione um ficheiro de imagem válido (.png, .jpg, .jpeg, .webp).');
      return;
    }

    try {
      setIsUploadingBanner(true);
      const compressed = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.82,
        outputFormat: 'image/jpeg',
      });
      setProfileForm((prev) => ({ ...prev, banner_url: compressed }));
      setBannerFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
      success(`Imagem de destaque/fachada "${file.name}" carregada com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao processar imagem de destaque:', err);
      error(err.message || 'Erro ao processar imagem.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Submit Subscription Payment
  const handleSubmitSubscriptionPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    const amount = parseFloat(paymentAmount) || 45000;
    supabaseData.submitPayment({
      unidade_id: unit.id,
      unidade_nome: unit.nome,
      plano_tipo: paymentPlanType,
      periodicidade: paymentPeriodicity,
      valor: amount,
      desconto_aplicado: 0,
      metodo: paymentMethod,
      comprovativo_url: paymentProofName,
      status: 'pendente',
    });

    success('Comprovativo de pagamento submetido com sucesso! A ativação será validada em minutos pelo Super Admin.');
    setIsPaymentModalOpen(false);
    triggerRefresh();
  };

  return (
    <div className="bg-[#F8FAFC] text-slate-800 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* ========================================================================= */}
        {/* HEADER & EXECUTIVE UNIT BANNER */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden relative">
          {/* Cover Banner if available */}
          {currentBanner && (
            <div className="h-28 sm:h-36 w-full relative overflow-hidden bg-slate-100">
              <img
                src={currentBanner}
                alt={unit?.nome || 'Fachada da Unidade'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <button
                type="button"
                onClick={() => setActiveTab('perfil')}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 hover:bg-white text-slate-800 text-[10px] font-bold shadow-sm backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <Camera className="w-3.5 h-3.5 text-[#00A878]" />
                <span>Alterar Fachada</span>
              </button>
            </div>
          )}

          <div className={`p-6 sm:p-8 ${currentBanner ? '-mt-8 sm:-mt-10 relative z-10' : ''}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Unit Identity */}
              <div className="flex items-start sm:items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('perfil')}
                  title="Logótipo da Unidade — Clique para gerir nas Configurações"
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer hover:ring-2 hover:ring-[#00A878] transition-all bg-white ${
                    currentBanner ? 'border-2 border-white shadow-md' : 'border border-[#00A878]/20 bg-[#E8F5F1] shadow-sm'
                  }`}
                >
                  {currentLogo && !logoLoadError ? (
                    <img
                      src={currentLogo}
                      alt={unit?.nome || 'Logótipo da Unidade'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={() => setLogoLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E8F5F1] text-[#00A878] flex items-center justify-center">
                      <Building2 className="w-9 h-9" />
                    </div>
                  )}
                  {/* Hover shortcut */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                    <Camera className="w-4 h-4" />
                    <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">Alterar</span>
                  </div>
                </button>

                <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#123B7A] uppercase tracking-tight">
                    {unit?.nome || 'Portal da Unidade de Saúde'}
                  </h1>

                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#123B7A] font-black text-[10px] uppercase tracking-wider">
                    {unit?.tipo || 'Farmácia'}
                  </span>

                  {unit?.verificada && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5F1] text-[#00A878] font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> MINSA Verificada
                    </span>
                  )}

                  {unit?.selo_premium && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Star className="w-3 h-3 fill-slate-950" /> Selo ⭐ Premium
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#00A878]" />
                    {unit?.bairro}, {unit?.municipio} ({unit?.provincia})
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#123B7A]" />
                    {unit?.telefone}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 font-mono text-[11px] text-slate-600">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {unit?.email}
                  </span>
                </div>

                {/* Open / Closed Live Switch */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (!unit) return;
                      const next = !unit.aberto_agora;
                      const updated = { ...unit, aberto_agora: next };
                      supabaseData.saveUnit(updated);
                      success(`Estado da unidade alterado para: ${next ? 'ABERTO AGORA' : 'FECHADO'}`);
                      triggerRefresh();
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
                      unit?.aberto_agora
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${unit?.aberto_agora ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                    <span>{unit?.aberto_agora ? 'Aberto Agora (Atendimento Activo)' : 'Fechado / Encerrado'}</span>
                  </button>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Horário: {unit?.horario_funcionamento}
                  </span>
                </div>
              </div>
            </div>

            {/* Plan Status & Branch Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Unit Switcher for multi-branch or admin testing */}
              {allUnits.length > 1 && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Alternar Unidade / Filial:
                  </label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 text-xs focus:outline-none focus:border-[#00A878] cursor-pointer"
                  >
                    {allUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.provincia})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plan Status Card */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-between gap-4 text-xs">
                <div>
                  <div className="text-slate-500 font-bold uppercase text-[10px] flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>Plano: <strong className="text-[#123B7A] uppercase font-black">{unit?.plano_tipo}</strong></span>
                  </div>
                  <div className="text-slate-700 font-medium mt-0.5">
                    Expira em: <strong className="text-[#00A878] font-black">{unit?.plano_data_expiracao}</strong> ({planStatus.daysUntilExpiration} dias)
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Capacidade: {allUnitProducts.length} / {planLimits === 999999 ? 'Ilimitado' : planLimits} produtos
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Pagar / Renovar</span>
                  </button>
                  <button
                    onClick={onNavigatePlans}
                    className="text-[10px] font-bold text-[#123B7A] hover:underline text-center cursor-pointer"
                  >
                    Ver Todos os Planos
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Expiration Notification Banners */}
          {planStatus.isBlocked ? (
            <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
                <div>
                  <div className="font-black text-xs uppercase tracking-wider text-rose-900">
                    OPERAÇÕES BLOQUEADAS POR EXPIRAÇÃO
                  </div>
                  <div className="font-medium text-rose-700">{planStatus.reason}</div>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shrink-0 shadow-sm cursor-pointer"
              >
                Regularizar Subscrição
              </button>
            </div>
          ) : planStatus.show7dAlert || planStatus.show1dAlert ? (
            <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 animate-bounce" />
                <div>
                  <div className="font-black text-xs uppercase tracking-wider text-amber-900">
                    AVISO DE EXPIRAÇÃO IMINENTE DO PLANO
                  </div>
                  <div className="font-medium text-amber-800">
                    O seu plano expira em {planStatus.daysUntilExpiration} dias. Renove agora para evitar a interrupção da visibilidade pública e dos pedidos.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 shadow-sm cursor-pointer"
              >
                Renovar Subscrição
              </button>
            </div>
          ) : null}

          {/* Key Executive Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-100">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Faturamento (Vendas)</span>
                <DollarSign className="w-4 h-4 text-[#00A878]" />
              </div>
              <div className="text-lg sm:text-xl font-black text-[#123B7A] mt-1">
                {totalRevenue.toLocaleString()} <span className="text-xs text-[#00A878]">AOA</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                {allUnitOrders.filter((o) => o.status === 'concluido').length} pedidos concluídos
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Itens no Catálogo</span>
                <Package className="w-4 h-4 text-[#123B7A]" />
              </div>
              <div className="text-lg sm:text-xl font-black text-[#123B7A] mt-1">
                {allUnitProducts.length} <span className="text-xs text-slate-400">/ {planLimits === 999999 ? '∞' : planLimits}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                {allUnitProducts.filter((p) => p.disponivel).length} disponíveis para venda
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Alertas de Stock Baixo</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className={`text-lg sm:text-xl font-black mt-1 ${criticalStockCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {criticalStockCount} <span className="text-xs text-slate-400">produtos</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Itens com quantidade ≤ 5 un.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-black uppercase tracking-wider">Pedidos em Espera</span>
                <Truck className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg sm:text-xl font-black text-purple-700 mt-1">
                {pendingOrdersCount} <span className="text-xs text-slate-400">activos</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Necessitam atenção imediata
              </div>
            </div>
          </div>
        </div>
      </div>

        {/* ========================================================================= */}
        {/* TABS NAVIGATION */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <button
              onClick={() => setActiveTab('stock')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'stock'
                  ? 'bg-[#123B7A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Inventário & Stock ({unitProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('excel')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'excel'
                  ? 'bg-[#00A878] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar / Exportar (Excel)</span>
            </button>

            <button
              onClick={() => setActiveTab('pedidos')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'pedidos'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Pedidos de Utentes ({allUnitOrders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('mais-procurados')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'mais-procurados'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Flame className={`w-4 h-4 ${activeTab === 'mais-procurados' ? 'text-white' : 'text-amber-500'}`} />
              <span>Mais Procurados (Top {mostWantedLimit})</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'mais-procurados' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {mostWantedLimit}
              </span>
            </button>

            {!isDepot && (
              <button
                onClick={() => setActiveTab('b2b-deposito')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'b2b-deposito'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Depósitos Grossistas (B2B)</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('perfil')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'perfil'
                  ? 'bg-[#123B7A] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Perfil & Horários</span>
            </button>

            <button
              onClick={() => setActiveTab('subscricao')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'subscricao'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Subscrição & Faturas</span>
            </button>

            <button
              onClick={() => setActiveTab('comunicados-minsa')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer relative ${
                activeTab === 'comunicados-minsa'
                  ? 'bg-[#0B1E3B] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Megaphone className="w-4 h-4 text-amber-500" />
              <span>Comunicados MINSA</span>
              {unreadMinsaCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                  {unreadMinsaCount}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'stock' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCurrentCatalog}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Exportar Catálogo para CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleOpenAddProduct}
                className="px-4 py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Medicamento</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: STOCK & CATALOG MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'stock' && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-5">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pb-2 border-b border-slate-100">
              {/* Search */}
              <div className="sm:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Pesquisar por nome, genérico, dosagem..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00A878]"
                />
              </div>

              {/* Category Filter */}
              <div className="sm:col-span-3">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-[#00A878] cursor-pointer"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="medicamento">Medicamentos</option>
                  <option value="suplemento">Suplementos & Vitaminas</option>
                  <option value="exame">Testes Rápidos & Exames</option>
                  <option value="material">Material Penso / Hospitalar</option>
                  <option value="servico">Serviços Farmacêuticos</option>
                </select>
              </div>

              {/* Stock Level Filter */}
              <div className="sm:col-span-3">
                <select
                  value={stockLevelFilter}
                  onChange={(e) => setStockLevelFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-[#00A878] cursor-pointer"
                >
                  <option value="all">Todos os Níveis de Stock</option>
                  <option value="in_stock">Em Stock Normal (&gt; 10 un.)</option>
                  <option value="low_stock">Stock Baixo (1 - 10 un.)</option>
                  <option value="out_of_stock">Esgotado / Indisponível (0 un.)</option>
                </select>
              </div>

              {/* Prescription Filter */}
              <div className="sm:col-span-2">
                <select
                  value={prescriptionFilter}
                  onChange={(e) => setPrescriptionFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-[#00A878] cursor-pointer"
                >
                  <option value="all">Receita: Todas</option>
                  <option value="yes">Exige Receita Médica</option>
                  <option value="no">Venda Livre (Sem Receita)</option>
                </select>
              </div>
            </div>

            {/* Bulk Selection & Inventory Reset Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {/* Select All / Deselect All Button */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={unitProducts.length === 0}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isAllFilteredSelected
                      ? 'bg-[#123B7A] text-white border-[#123B7A] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Selecionar ou desmarcar todos os produtos exibidos"
                >
                  {isAllFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{isAllFilteredSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isAllFilteredSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {unitProducts.length}
                  </span>
                </button>

                {/* Select entire inventory if filters are active */}
                {unitProducts.length < allUnitProducts.length && (
                  <button
                    type="button"
                    onClick={handleSelectEntireInventory}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Selecionar todo o inventário da unidade sem filtros"
                  >
                    <span>Selecionar Todo o Inventário ({allUnitProducts.length})</span>
                  </button>
                )}

                {/* Selection counter badge */}
                {selectedProductIds.size > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold animate-in fade-in">
                    <span>{selectedProductIds.size} selecionado(s)</span>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer"
                      title="Limpar seleção"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Delete Selected Button */}
                {selectedProductIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteSelectedModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer animate-in fade-in"
                    title="Eliminar os produtos selecionados para posterior atualização"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Selecionados ({selectedProductIds.size})</span>
                  </button>
                )}

                {/* Delete ALL Current Inventory Button */}
                <button
                  type="button"
                  onClick={() => setIsClearAllInventoryModalOpen(true)}
                  disabled={allUnitProducts.length === 0}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Eliminar todo o inventário atual da unidade/depósito para carregar uma lista atualizada"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Eliminar Inventário Atual ({allUnitProducts.length})</span>
                </button>

                {/* Shortcut to Excel update */}
                <button
                  type="button"
                  onClick={() => setActiveTab('excel')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Ir para importação de novo ficheiro Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Actualizar via Excel</span>
                </button>
              </div>
            </div>

            {/* Products Table */}
            {unitProducts.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 space-y-3">
                <Package className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-sm">Nenhum produto encontrado com os filtros selecionados.</div>
                <p className="text-slate-400 max-w-md mx-auto">
                  Tente alterar os termos da pesquisa ou adicione novos medicamentos utilizando o botão "+ Novo Medicamento" ou a aba "Importação Excel".
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      <th className="pb-3 pl-3 w-10 text-center">
                        <input
                          type="checkbox"
                          aria-label="Selecionar todos os medicamentos exibidos"
                          checked={isAllFilteredSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isSomeFilteredSelected;
                          }}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-[#00A878] border-slate-300 focus:ring-[#00A878] cursor-pointer"
                        />
                      </th>
                      <th className="pb-3 pl-2">Medicamento / Artigo</th>
                      <th className="pb-3">Dosagem / Apresentação</th>
                      <th className="pb-3">Preço Unitário (AOA)</th>
                      <th className="pb-3 text-center">Stock Disponível</th>
                      <th className="pb-3 text-center">Receita Médica</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right pr-2">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unitProducts.map((p) => (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          selectedProductIds.has(p.id)
                            ? 'bg-emerald-50/70 border-l-4 border-l-[#00A878]'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-3.5 pl-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${p.nome}`}
                            checked={selectedProductIds.has(p.id)}
                            onChange={() => handleToggleSelectProduct(p.id)}
                            className="w-4 h-4 rounded text-[#00A878] border-slate-300 focus:ring-[#00A878] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 pl-2">
                          <div className="font-black text-[#123B7A] uppercase text-xs">
                            {p.nome}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            {p.nome_generico && <span className="italic">{p.nome_generico}</span>}
                            {p.fabricante && <span className="text-slate-400">• {p.fabricante}</span>}
                            {p.destaque && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                Destaque
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 text-slate-600 font-medium">
                          {p.dosagem || p.forma_farmaceutica || '—'}
                        </td>
                        <td className="py-3.5 font-black text-[#00A878] text-xs">
                          {p.preco.toLocaleString()} AOA
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleAdjustStock(p.id, -1)}
                              disabled={p.quantidade_stock <= 0}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer"
                              title="Diminuir 1"
                            >
                              -
                            </button>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                                p.quantidade_stock > 10
                                  ? 'bg-[#E8F5F1] text-[#00A878]'
                                  : p.quantidade_stock > 0
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {p.quantidade_stock} un.
                            </span>
                            <button
                              onClick={() => handleAdjustStock(p.id, 1)}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer"
                              title="Aumentar 1"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleAdjustStock(p.id, 10)}
                              className="px-1.5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center cursor-pointer"
                              title="Aumentar 10 unidades"
                            >
                              +10
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 text-center">
                          {p.requer_receita ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold uppercase text-[9px]">
                              Obrigatória
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[10px]">Venda Livre</span>
                          )}
                        </td>
                        <td className="py-3.5 text-center">
                          <button
                            onClick={() => handleToggleAvailability(p.id)}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                              p.disponivel
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {p.disponivel ? 'Activo' : 'Oculto'}
                          </button>
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Editar Produto"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.nome)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Remover Produto"
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
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: BATCH EXCEL / CSV IMPORT & EXPORT */}
        {/* ========================================================================= */}
        {activeTab === 'excel' && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-[#E8F5F1] text-[#00A878] text-[10px] font-black rounded-full uppercase tracking-wider mb-2">
                  Automação de Catálogo
                </span>
                <h2 className="text-xl font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <FileSpreadsheet className="w-6 h-6 text-[#00A878]" />
                  Importação e Sincronização em Lote (Excel / CSV)
                </h2>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Carregue o ficheiro original em <strong>Excel (.xlsx / .xls)</strong> ou <strong>CSV</strong> exportado do seu software de faturação ou folha de cálculo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadXlsxTemplate}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                  title="Descarregar ficheiro Microsoft Excel original"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Modelo Excel (.XLSX)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="px-4 py-2.5 rounded-2xl bg-[#E8F5F1] hover:bg-[#d1ece4] text-[#00A878] border border-[#00A878]/30 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#00A878]" />
                  <span>Modelo CSV</span>
                </button>
              </div>
            </div>

            {/* Visual Excel Model Replica Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-black text-[#123B7A] uppercase text-xs tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Estrutura Oficial do Modelo Excel / CSV:</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  Compatível com .xlsx, .xls e .csv
                </span>
              </div>

              {/* Replica Excel Spreadsheet Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-xs">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-300">
                      <th className="py-2.5 px-4 border-r border-slate-200 w-12 text-center text-slate-400 font-mono text-[10px]">#</th>
                      <th className="py-2.5 px-4 border-r border-slate-200 text-slate-900 font-black tracking-wide text-xs">nome</th>
                      <th className="py-2.5 px-4 border-r border-slate-200 text-slate-900 font-black tracking-wide text-xs">categoria</th>
                      <th className="py-2.5 px-4 border-r border-slate-200 text-slate-900 font-black tracking-wide text-xs text-right">stock</th>
                      <th className="py-2.5 px-4 text-slate-900 font-black tracking-wide text-xs text-right">preco_kz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
                    <tr className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-2 px-4 border-r border-slate-200 text-center text-slate-400 font-mono text-[10px]">1</td>
                      <td className="py-2 px-4 border-r border-slate-200 font-semibold text-slate-900">Paracetamol 500mg</td>
                      <td className="py-2 px-4 border-r border-slate-200 text-slate-700">Antipirético</td>
                      <td className="py-2 px-4 border-r border-slate-200 text-right font-mono font-bold text-slate-900">320</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-[#00A878]">450</td>
                    </tr>
                    <tr className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-2 px-4 border-r border-slate-200 text-center text-slate-400 font-mono text-[10px]">2</td>
                      <td className="py-2 px-4 border-r border-slate-200 font-semibold text-slate-900">Ibuprofeno 400mg</td>
                      <td className="py-2 px-4 border-r border-slate-200 text-slate-700">Analgésico</td>
                      <td className="py-2 px-4 border-r border-slate-200 text-right font-mono font-bold text-slate-900">124</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-[#00A878]">850</td>
                    </tr>
                    <tr className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-2 px-4 border-r border-slate-200 text-center text-slate-400 font-mono text-[10px]">3</td>
                      <td className="py-2 px-4 border-r border-slate-200 font-semibold text-slate-900">Amoxicilina 500mg</td>
                      <td className="py-2 px-4 border-r border-slate-200 text-slate-700">Antibiótico</td>
                      <td className="py-2 px-4 border-r border-slate-200 text-right font-mono font-bold text-slate-900">18</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-[#00A878]">2400</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                <span>💡 Ficheiros Excel (.xlsx/.xls) ou CSV são convertidos e validados automaticamente.</span>
                <button
                  type="button"
                  onClick={() => {
                    setExcelText(
                      'nome;categoria;stock;preco_kz\n' +
                      'Paracetamol 500mg;Antipirético;320;450\n' +
                      'Ibuprofeno 400mg;Analgésico;124;850\n' +
                      'Amoxicilina 500mg;Antibiótico;18;2400'
                    );
                    success('Exemplo padrão reposto no editor!');
                  }}
                  className="text-[#00A878] hover:underline font-bold cursor-pointer"
                >
                  Restaurar Exemplo Oficial no Editor
                </button>
              </div>
            </div>

            {/* Drag and Drop / File Input Box */}
            <div className="space-y-2">
              <label className="text-xs font-black text-[#123B7A] uppercase tracking-wider block">
                Carregar Ficheiro Excel (.xlsx, .xls) ou CSV:
              </label>
              <div className="border-2 border-dashed border-emerald-300 hover:border-[#00A878] rounded-2xl p-6 text-center bg-emerald-50/20 hover:bg-emerald-50/40 transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                    e.target.value = '';
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="space-y-2 pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-black text-slate-800">
                    Clique aqui ou arraste o seu ficheiro <span className="text-[#00A878]">.XLSX</span>, <span className="text-[#00A878]">.XLS</span> ou <span className="text-[#00A878]">.CSV</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    O ficheiro será descompactado e estruturado instantaneamente no editor abaixo para confirmação.
                  </p>
                </div>
              </div>
            </div>

            {/* Textarea for CSV */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#123B7A] uppercase tracking-wider">
                  Pré-visualização e Edição dos Dados Extraídos:
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                    {excelText.split('\n').filter(Boolean).length > 1
                      ? `${excelText.split('\n').filter(Boolean).length - 1} produtos prontos para inserção`
                      : 'Nenhum dado'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExcelText('')}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>
              </div>
              <textarea
                rows={7}
                value={excelText}
                onChange={(e) => setExcelText(e.target.value)}
                placeholder="nome;categoria;stock;preco_kz"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-xs text-slate-800 focus:outline-none focus:border-[#00A878] leading-relaxed resize-y"
              />
            </div>

            {/* Replace / Clean Existing Inventory Controls */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-amber-950">
                <input
                  type="checkbox"
                  checked={replaceOnImport}
                  onChange={(e) => setReplaceOnImport(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span>Substituir todo o inventário atual ao importar</span>
                  <p className="text-[11px] font-normal text-amber-800">
                    Remove os {allUnitProducts.length} produtos existentes nesta unidade/depósito antes de carregar os novos artigos da folha Excel.
                  </p>
                </div>
              </label>

              <button
                type="button"
                onClick={() => setIsClearAllInventoryModalOpen(true)}
                disabled={allUnitProducts.length === 0}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Limpar Stock Atual Agora ({allUnitProducts.length})</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportCurrentCatalog}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Inventário Atual em Excel (.XLSX)</span>
              </button>

              <button
                type="button"
                onClick={handleProcessExcel}
                className="px-6 py-3 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Processar e Atualizar Catálogo</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: INCOMING ORDERS & DISPATCH */}
        {/* ========================================================================= */}
        {activeTab === 'pedidos' && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-[#123B7A] uppercase tracking-tight flex items-center gap-2">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <span>Pedidos de Utentes & Balcão ({unitOrders.length})</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Fila de pedidos recebidos em tempo real para separação, embalamento e entrega.
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'pendente', 'em_preparacao', 'pronto_levantamento', 'a_caminho', 'concluido', 'cancelado'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase transition-all cursor-pointer ${
                      orderStatusFilter === st
                        ? 'bg-[#123B7A] text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {st === 'all' ? 'Todos' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {unitOrders.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-500 space-y-3">
                <Truck className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700 text-sm">Nenhum pedido encontrado nesta categoria.</div>
                <p className="text-slate-400">
                  Os novos pedidos enviados pelos pacientes no aplicativo aparecerão aqui instantaneamente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {unitOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm text-[#00A878]">
                            #{ord.codigo_pedido}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
                            {ord.modalidade === 'entrega' ? 'Entrega ao Domicílio' : 'Levantamento no Balcão'}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {new Date(ord.created_at).toLocaleString('pt-PT')}
                          </span>
                        </div>

                        <div className="text-xs text-[#123B7A] font-black uppercase">
                          Utente: {ord.paciente_nome} — Tel: {ord.paciente_telefone}
                        </div>

                        {ord.endereco_entrega && (
                          <div className="text-[11px] text-amber-800 font-bold flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            <span>Entrega: {ord.endereco_entrega}</span>
                          </div>
                        )}
                      </div>

                      {/* Total and Actions */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="text-base font-black text-[#00A878] mr-2">
                          {ord.total.toLocaleString()} AOA
                        </div>

                        {/* Status Select */}
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as any)}
                          className="bg-white border border-slate-300 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#00A878] cursor-pointer"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="em_preparacao">Em Preparação</option>
                          <option value="pronto_levantamento">Pronto p/ Levantamento</option>
                          <option value="a_caminho">A Caminho (Entrega)</option>
                          <option value="concluido">Concluído</option>
                          <option value="cancelado">Cancelado</option>
                        </select>

                        {/* WhatsApp Contact */}
                        <button
                          onClick={() => {
                            const phone = ord.paciente_whatsapp || ord.paciente_telefone;
                            const msg = `Olá ${ord.paciente_nome}! Estamos a entrar em contacto da ${unit?.nome} a respeito do seu pedido #${ord.codigo_pedido} no MUTIKUKWAMA SAÚDE.`;
                            window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="p-2 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white shadow-sm cursor-pointer"
                          title="Contactar Utente via WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </button>

                        {/* Print Receipt / Slip */}
                        <button
                          onClick={() => setViewingOrderReceipt(ord)}
                          className="p-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-sm cursor-pointer"
                          title="Ver / Imprimir Guia do Pedido"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {ord.itens.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-800">{item.nome}</div>
                            <div className="text-[10px] text-slate-400">Qtd: {item.quantidade} x {item.preco_unitario.toLocaleString()} AOA</div>
                          </div>
                          <div className="font-black text-[#00A878] text-xs">
                            {(item.quantidade * item.preco_unitario).toLocaleString()} AOA
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: MOST WANTED PRODUCTS & SERVICES (TOP 10 / 50 / 100 BY PLAN) */}
        {/* ========================================================================= */}
        {activeTab === 'mais-procurados' && (
          <MostWantedItemsTab
            unit={unit}
            isDepot={isDepot}
            unitProducts={allUnitProducts}
            onOpenAddProduct={handleOpenAddProduct}
            onNavigateToTab={handleNavigateToTab}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB 4: B2B WHOLESALE DEPOTS (FOR PHARMACIES) */}
        {/* ========================================================================= */}
        {activeTab === 'b2b-deposito' && !isDepot && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-black text-[10px] uppercase tracking-wider mb-2">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Canal Grossista Exclusivo B2B</span>
                </div>
                <h2 className="text-xl font-black text-[#123B7A] uppercase tracking-tight">
                  Abastecimento Farmacêutico Directo via Depósitos Oficiais
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Compre caixas e fardos de reposição com preços de distribuição grossista dos principais importadores e depósitos licenciados pelo MINSA em Angola.
                </p>
              </div>

              {/* Counter Pill */}
              <div className="flex items-center gap-2 self-start lg:self-auto bg-amber-50 border border-amber-200/80 px-4 py-2 rounded-2xl">
                <Package className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="text-xs font-bold text-amber-900">
                  <span className="font-black text-amber-700">{filteredB2BProducts.length}</span> Lotes Grossistas Disponíveis
                </div>
              </div>
            </div>

            {/* Active B2B Cart Summary Banner */}
            {cartItems.length > 0 && (
              <div className="bg-gradient-to-r from-[#123B7A] via-[#1a4a93] to-[#0d2a59] text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 border border-blue-900/30 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#123B7A] text-[10px] font-black uppercase tracking-wider">
                        Carrinho B2B
                      </span>
                      <span className="text-xs text-blue-200 font-medium">
                        {currentCartUnit?.nome || 'Depósito Selecionado'}
                      </span>
                    </div>
                    <p className="text-sm font-bold mt-0.5">
                      {totalItemsCount} {totalItemsCount === 1 ? 'lote no carrinho' : 'lotes no carrinho'} · Total: <span className="text-amber-300 font-black">{cartSubtotal.toLocaleString()} AOA</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCart}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#123B7A] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Ver Carrinho & Finalizar Pedido</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* B2B Search & Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="md:col-span-8 relative flex items-center bg-white border border-slate-200 focus-within:border-[#123B7A] rounded-xl px-3.5 py-2 transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={b2bSearchQuery}
                  onChange={(e) => setB2bSearchQuery(e.target.value)}
                  placeholder="Pesquisar por medicamento, princípio activo ou depósito grossista..."
                  className="w-full bg-transparent text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {b2bSearchQuery && (
                  <button
                    onClick={() => setB2bSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="md:col-span-4 flex items-center bg-white border border-slate-200 focus-within:border-[#123B7A] rounded-xl px-3 py-2">
                <MapPin className="w-4 h-4 text-[#00A878] mr-2 shrink-0" />
                <select
                  value={b2bProvinceFilter}
                  onChange={(e) => setB2bProvinceFilter(e.target.value)}
                  className="w-full bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Todas as Províncias</option>
                  {PROVINCES_ANGOLA.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Wholesale Lots Grid with MedicalSearchResultCard */}
            {filteredB2BProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredB2BProducts.map((wp) => {
                  const depot = supabaseData.getUnitById(wp.unidade_id);
                  return (
                    <MedicalSearchResultCard
                      key={wp.id}
                      id={wp.id}
                      badgeType="LOTE GROSSISTA"
                      title={wp.nome}
                      subtitle={wp.descricao || 'Distribuição Farmacêutica Grossista B2B · Preço Distribuidor'}
                      isAvailable={wp.quantidade_stock > 0}
                      statusLabel={wp.quantidade_stock > 0 ? 'DISPONÍVEL NO ARMAZÉM' : 'ESGOTADO'}
                      durationOrQuantityLabel="STOCK LOTE"
                      durationOrQuantityValue={`${wp.quantidade_stock} cx`}
                      price={wp.preco}
                      unit={{
                        id: depot?.id || wp.unidade_id,
                        nome: depot?.nome || 'Depósito Grossista Licenciado',
                        tipo: 'deposito',
                        bairro: depot?.bairro || 'Zona Industrial',
                        municipio: depot?.municipio || 'Viana',
                        provincia: depot?.provincia || 'Luanda',
                        latitude: depot?.latitude,
                        longitude: depot?.longitude,
                        telefone: depot?.telefone,
                        whatsapp: depot?.whatsapp,
                        selo_premium: depot?.selo_premium,
                      }}
                      userCoords={{ lat: -8.825, lng: 13.235 }}
                      onViewLocation={() => depot && setSelectedDepotForProfile(depot)}
                      onViewRoute={() => depot && setSelectedDepotForRoute(depot)}
                      bookActionLabel="Adicionar ao Carrinho B2B"
                      onBookOrAdd={() => {
                        const added = addCartItem(
                          {
                            item_id: wp.id,
                            tipo_item: 'medicamento',
                            nome: `${wp.nome} (Lote Grossista B2B)`,
                            preco: wp.preco,
                            quantidade: 1,
                            unidade_id: depot?.id || wp.unidade_id,
                            unidade_nome: depot?.nome || 'Depósito Grossista Licenciado',
                          },
                          false
                        );
                        if (added) {
                          success(`Lote grossista "${wp.nome}" adicionado ao carrinho de compras!`);
                        }
                      }}
                      orderActionLabel="Fazer Pedido B2B"
                      onOrder={() => {
                        const added = addCartItem(
                          {
                            item_id: wp.id,
                            tipo_item: 'medicamento',
                            nome: `${wp.nome} (Lote Grossista B2B)`,
                            preco: wp.preco,
                            quantidade: 1,
                            unidade_id: depot?.id || wp.unidade_id,
                            unidade_nome: depot?.nome || 'Depósito Grossista Licenciado',
                          },
                          false
                        );
                        if (added) {
                          success(`Lote grossista "${wp.nome}" adicionado ao carrinho! A abrir carrinho para formalizar o pedido...`);
                          handleOpenCart();
                        }
                      }}
                      onWhatsApp={() => {
                        const phone = depot?.whatsapp || depot?.telefone || '';
                        const cleanPhone = phone.replace(/[^0-9]/g, '') || '244923999000';
                        const msg = `Olá! Somos da unidade "${unit?.nome}" e entramos em contacto sobre fornecimento e reposição do lote "${wp.nome}".`;
                        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      onToggleSave={(id, isSaved) => {
                        setSavedDepotItems((prev) => {
                          const next = new Set(prev);
                          if (isSaved) {
                            next.add(id);
                            success('Lote guardado nos favoritos de reposição!');
                          } else {
                            next.delete(id);
                          }
                          return next;
                        });
                      }}
                      isSavedInitial={savedDepotItems.has(wp.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl max-w-lg mx-auto">
                <Package className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-black text-[#123B7A] uppercase">Nenhum lote encontrado</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Não foram encontrados lotes grossistas com os termos pesquisados. Limpe os filtros para visualizar todo o catálogo dos depósitos.
                </p>
                <button
                  onClick={() => {
                    setB2bSearchQuery('');
                    setB2bProvinceFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-[#123B7A] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Limpar Filtros Grossistas
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: UNIT PROFILE, SCHEDULE & CREDENTIALS */}
        {/* ========================================================================= */}
        {activeTab === 'perfil' && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-[#123B7A] text-[10px] font-black rounded-full uppercase tracking-wider mb-2">
                Configurações da Unidade
              </span>
              <h2 className="text-xl font-black text-[#123B7A] uppercase tracking-tight">
                Dados Cadastrais, Horários & Segurança da Farmácia
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mantenha as informações do estabelecimento sempre atualizadas para os pacientes encontrarem o seu local com precisão.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
              {/* ========================================================= */}
              {/* VISUAL IDENTITY: LOGO & BANNER (MAIS PROCURADAS & HOME)   */}
              {/* ========================================================= */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 border border-slate-200/90 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-[#123B7A] text-white rounded-xl">
                        <ImageIcon className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-black text-[#123B7A] uppercase tracking-wide">
                        Identidade Visual: Logótipo & Foto de Fachada (Destaque)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      As imagens anexadas são exibidas na <strong>Página Inicial</strong>, na secção de <strong>Unidades Mais Procuradas</strong> e no perfil público da sua unidade.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase tracking-wider self-start sm:self-auto flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-600 fill-amber-600" />
                    Aparece no Top Unidades
                  </span>
                </div>

                {/* Upload Columns: Logo + Banner */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* MODULE 1: LOGO */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <span>Logótipo Oficial da Unidade</span>
                          <span className="text-slate-400 font-normal">(Quadrado / Ícone)</span>
                        </label>
                        {profileForm.logo_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileForm((prev) => ({ ...prev, logo_url: '' }));
                              setLogoFileName('');
                            }}
                            className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remover
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Logo Preview */}
                        <div className="w-20 h-20 rounded-2xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group">
                          {profileForm.logo_url ? (
                            <img
                              src={profileForm.logo_url}
                              alt="Logótipo da Unidade"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-2 text-slate-400">
                              <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-0.5" />
                              <span className="text-[9px] font-bold uppercase block leading-none">Sem Logo</span>
                            </div>
                          )}
                          {isUploadingLogo && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                              A processar...
                            </div>
                          )}
                        </div>

                        {/* Upload Controls */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <label className="relative inline-flex items-center justify-center w-full px-3.5 py-2.5 rounded-xl bg-[#123B7A] hover:bg-[#0c2854] text-white font-bold text-xs cursor-pointer transition-colors shadow-xs">
                            <UploadCloud className="w-4 h-4 mr-1.5 shrink-0" />
                            <span>{isUploadingLogo ? 'A carregar...' : 'Carregar Imagem do Computador'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileChange}
                              disabled={isUploadingLogo}
                              className="sr-only"
                            />
                          </label>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>PNG, JPG, SVG ou WebP (Máx 5MB)</span>
                            <button
                              type="button"
                              onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                              className="text-[#123B7A] hover:underline font-bold cursor-pointer"
                            >
                              {showLogoUrlInput ? 'Ocultar URL' : 'Inserir Link URL'}
                            </button>
                          </div>

                          {logoFileName && (
                            <p className="text-[10px] text-emerald-700 font-medium truncate flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Ficheiro: {logoFileName}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Optional Direct URL Input */}
                      {showLogoUrlInput && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                          <input
                            type="url"
                            value={profileForm.logo_url || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, logo_url: e.target.value })}
                            placeholder="https://exemplo.com/meu-logotipo.png"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-mono focus:outline-none focus:border-[#00A878]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Quick Preset Logos */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Ou escolha um ícone padrão do setor da saúde:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { name: 'Cruz Farmácia', url: 'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200&auto=format&fit=crop&q=80' },
                          { name: 'Clínica Azul', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&auto=format&fit=crop&q=80' },
                          { name: 'Cuidados Médicos', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&auto=format&fit=crop&q=80' },
                          { name: 'Laboratório', url: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=200&auto=format&fit=crop&q=80' },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setProfileForm((prev) => ({ ...prev, logo_url: preset.url }));
                              setLogoFileName(`Preset ${preset.name}`);
                              success(`Logótipo padrão "${preset.name}" selecionado.`);
                            }}
                            className="p-1.5 border border-slate-200 hover:border-[#123B7A] rounded-xl flex flex-col items-center gap-1 text-[9px] font-semibold text-slate-600 bg-slate-50 hover:bg-white transition-colors cursor-pointer"
                          >
                            <img src={preset.url} alt={preset.name} className="w-6 h-6 rounded-md object-cover" />
                            <span className="truncate w-full text-center">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* MODULE 2: BANNER / FACHADA PHOTO */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Foto da Fachada / Banner de Destaque</span>
                          <span className="text-amber-600 font-extrabold text-[10px]">* Página Inicial</span>
                        </label>
                        {profileForm.banner_url && (
                          <button
                            type="button"
                            onClick={() => {
                              setProfileForm((prev) => ({ ...prev, banner_url: '' }));
                              setBannerFileName('');
                            }}
                            className="text-[10px] font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remover
                          </button>
                        )}
                      </div>

                      {/* Banner Preview Box */}
                      <div className="h-24 w-full rounded-2xl border-2 border-slate-200 bg-slate-100 overflow-hidden relative shadow-inner mb-3 flex items-center justify-center">
                        {profileForm.banner_url ? (
                          <>
                            <img
                              src={profileForm.banner_url}
                              alt="Foto da Fachada / Banner"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <span className="absolute bottom-2 left-2 text-white font-bold text-[10px] bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Foto da Unidade Ativa
                            </span>
                          </>
                        ) : (
                          <div className="text-center p-3 text-slate-400">
                            <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                            <span className="text-[10px] font-bold uppercase block">Nenhuma foto de fachada anexada</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Anexe uma foto para aparecer com destaque visual no Top Unidades</span>
                          </div>
                        )}
                        {isUploadingBanner && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                            A carregar imagem de fachada...
                          </div>
                        )}
                      </div>

                      {/* Upload Controls */}
                      <div className="space-y-2">
                        <label className="relative inline-flex items-center justify-center w-full px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs">
                          <UploadCloud className="w-4 h-4 mr-1.5 shrink-0" />
                          <span>{isUploadingBanner ? 'A carregar...' : 'Carregar Foto da Fachada / Edifício'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerFileChange}
                            disabled={isUploadingBanner}
                            className="sr-only"
                          />
                        </label>

                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Recomendado: 1200×600 (Paisagem)</span>
                          <button
                            type="button"
                            onClick={() => setShowBannerUrlInput(!showBannerUrlInput)}
                            className="text-emerald-700 hover:underline font-bold cursor-pointer"
                          >
                            {showBannerUrlInput ? 'Ocultar URL' : 'Inserir Link URL'}
                          </button>
                        </div>

                        {bannerFileName && (
                          <p className="text-[10px] text-emerald-700 font-medium truncate flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Ficheiro: {bannerFileName}</span>
                          </p>
                        )}

                        {showBannerUrlInput && (
                          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                            <input
                              type="url"
                              value={profileForm.banner_url || ''}
                              onChange={(e) => setProfileForm({ ...profileForm, banner_url: e.target.value })}
                              placeholder="https://exemplo.com/minha-farmacia-fachada.jpg"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-mono focus:outline-none focus:border-[#00A878]"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Preset Photos */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Ou use fotos profissionais de farmácia/clínica:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { name: 'Fachada Farmácia', url: 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&auto=format&fit=crop&q=80' },
                          { name: 'Clínica Moderna', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80' },
                          { name: 'Interior Balcão', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&auto=format&fit=crop&q=80' },
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setProfileForm((prev) => ({ ...prev, banner_url: preset.url }));
                              setBannerFileName(`Foto ${preset.name}`);
                              success(`Foto "${preset.name}" selecionada com sucesso!`);
                            }}
                            className="p-1 border border-slate-200 hover:border-emerald-600 rounded-xl flex items-center gap-1.5 text-[9px] font-semibold text-slate-700 bg-slate-50 hover:bg-white transition-colors cursor-pointer overflow-hidden"
                          >
                            <img src={preset.url} alt={preset.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                            <span className="truncate text-left">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* MODULE 3: LIVE PREVIEW CARD */}
                <div className="bg-white/90 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Pré-visualização: Como a sua unidade é vista na Página Inicial e Unidades Mais Procuradas
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Simulação em Tempo Real
                    </span>
                  </div>

                  <div className="max-w-md mx-auto bg-white rounded-2xl border border-amber-300/80 shadow-md overflow-hidden">
                    {/* Simulated Banner */}
                    <div className="h-28 w-full relative bg-slate-100 overflow-hidden">
                      <img
                        src={profileForm.banner_url || 'https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&auto=format&fit=crop&q=80'}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <Flame className="w-2.5 h-2.5 fill-slate-950" />
                          Top #1 Mais Procurada
                        </span>
                      </div>
                    </div>

                    {/* Simulated Info */}
                    <div className="p-3 -mt-5 relative z-10">
                      <div className="flex items-end gap-2.5">
                        <img
                          src={profileForm.logo_url || 'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200&auto=format&fit=crop&q=80'}
                          alt="Logo Preview"
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-md bg-white shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-[#123B7A] uppercase text-xs truncate">
                            {profileForm.nome || unit?.nome || 'Minha Farmácia'}
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium truncate">
                            {profileForm.bairro || unit?.bairro || 'Bairro'}, {profileForm.municipio || unit?.municipio || 'Município'} ({profileForm.provincia || unit?.provincia || 'Luanda'})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome Oficial da Unidade *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.nome || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, nome: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Tipo de Estabelecimento</label>
                  <select
                    value={profileForm.tipo || 'farmacia'}
                    onChange={(e) => setProfileForm({ ...profileForm, tipo: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="farmacia">Farmácia Comunitária</option>
                    <option value="clinica">Clínica Médica</option>
                    <option value="hospital">Hospital / Centro de Saúde</option>
                    <option value="laboratorio">Laboratório de Análises Clínicas</option>
                    <option value="posto_saude">Posto de Saúde</option>
                    <option value="deposito">Depósito Grossista de Medicamentos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Província *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.provincia || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, provincia: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Município & Bairro *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Município"
                      value={profileForm.municipio || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, municipio: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Bairro"
                      value={profileForm.bairro || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, bairro: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Endereço Completo / Referência</label>
                  <input
                    type="text"
                    value={profileForm.endereco_completo || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, endereco_completo: e.target.value })}
                    placeholder="Ex: Rua Direita da Maianga, em frente ao Hospital Militar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Telefone de Atendimento *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.telefone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, telefone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">WhatsApp Comercial para Pedidos *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.whatsapp || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Horário de Funcionamento</label>
                  <input
                    type="text"
                    value={profileForm.horario_funcionamento || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, horario_funcionamento: e.target.value })}
                    placeholder="Ex: 08:00 - 22:00 (Segunda a Sábado)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nº de Alvará Sanitário / Registo MINSA</label>
                  <input
                    type="text"
                    value={profileForm.certificado_institucional || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, certificado_institucional: e.target.value })}
                    placeholder="Ex: CERT-MINSA-2026-FARM-042"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                {/* Account Email */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#00A878]" />
                      <span>E-mail de Acesso e Notificações *</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.email || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                {/* Password Change Sub-section */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600" />
                      <span className="font-bold text-slate-800">Alterar Senha de Acesso da Unidade</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(!isChangingPassword)}
                      className="text-xs font-bold text-[#123B7A] hover:underline cursor-pointer"
                    >
                      {isChangingPassword ? 'Cancelar Alteração' : 'Mudar Senha'}
                    </button>
                  </div>

                  {isChangingPassword && (
                    <div className="pt-2 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showUnitNewPassword ? 'text' : 'password'}
                          value={unitNewPassword}
                          onChange={(e) => setUnitNewPassword(e.target.value)}
                          placeholder="Digite a nova senha segura..."
                          className="w-full bg-white border border-slate-200 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#00A878]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowUnitNewPassword(!showUnitNewPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                        >
                          {showUnitNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Alterações do Perfil</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: SUBSCRIPTION, INVOICES & PAYMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'subscricao' && (
          <div className="bg-white border border-slate-200 rounded-[32px] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full uppercase tracking-wider mb-2">
                  Gestão SaaS & Faturas
                </span>
                <h2 className="text-xl font-black text-[#123B7A] uppercase tracking-tight">
                  Subscrição, Comprovativos & Histórico Financeiro
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Consulte os detalhes do plano contratado e envie comprovativos de liquidação bancária para ativação imediata.
                </p>
              </div>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Submeter Novo Comprovativo</span>
              </button>
            </div>

            {/* Current Plan Overview Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#123B7A] to-[#0a234a] text-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#00A878]">
                    Plano Subscrito Actualmente
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight mt-1 flex items-center gap-2">
                    <span>Plano {unit?.plano_tipo}</span>
                    {unit?.selo_premium && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                  </h3>
                </div>

                <div className="text-right">
                  <div className="text-xs text-blue-200">Data Limite de Validade:</div>
                  <div className="text-lg font-black text-amber-400">{unit?.plano_data_expiracao}</div>
                  <div className="text-xs font-semibold text-emerald-300">
                    {planStatus.daysUntilExpiration} dias restantes
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-blue-800/60 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00A878]" />
                  <span>Capacidade de Catálogo: {planLimits === 999999 ? 'Ilimitado' : `${planLimits} medicamentos`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00A878]" />
                  <span>Importação Excel & CSV Integrada</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00A878]" />
                  <span>Atendimento & Delivery via WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Invoices and Payments History Table */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-[#123B7A] uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#00A878]" />
                <span>Histórico de Pagamentos de Subscrição ({unitPayments.length})</span>
              </h3>

              {unitPayments.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  Nenhuma transação de pagamento registada nesta unidade ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                        <th className="pb-3 pl-2">Data da Submissão</th>
                        <th className="pb-3">Plano & Período</th>
                        <th className="pb-3">Método de Pagamento</th>
                        <th className="pb-3">Valor Liquidado</th>
                        <th className="pb-3">Comprovativo</th>
                        <th className="pb-3 text-right pr-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unitPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pl-2 text-slate-600 font-medium">
                            {new Date(pay.data_pagamento).toLocaleDateString('pt-PT')}
                          </td>
                          <td className="py-3 font-bold text-[#123B7A] uppercase text-xs">
                            {pay.plano_tipo} ({pay.periodicidade})
                          </td>
                          <td className="py-3 text-slate-600 uppercase text-[11px] font-semibold">
                            {pay.metodo.replace('_', ' ')}
                          </td>
                          <td className="py-3 font-black text-[#00A878]">
                            {pay.valor.toLocaleString()} AOA
                          </td>
                          <td className="py-3 text-slate-600 text-[11px]">
                            <button
                              type="button"
                              onClick={() => setViewingPaymentProof(pay)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#123B7A] font-bold text-xs transition-colors cursor-pointer border border-blue-200/60"
                              title="Visualizar comprovativo de pagamento"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#00A878]" />
                              <span className="truncate max-w-[120px]">
                                {pay.comprovativo_nome || pay.comprovativo_url || 'Ver Comprovativo'}
                              </span>
                            </button>
                          </td>
                          <td className="py-3 text-right pr-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                pay.status === 'confirmado'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : pay.status === 'pendente'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-600'
                              }`}
                            >
                              {pay.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: COMUNICADOS E DIRECTRIZES MINSA */}
        {/* ========================================================================= */}
        {activeTab === 'comunicados-minsa' && unit && (
          <UnitMinsaAnnouncementsView unit={unit} />
        )}

        {/* ========================================================================= */}
        {/* MODAL: ADD / EDIT PRODUCT */}
        {/* ========================================================================= */}
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-[32px] max-w-lg w-full p-6 sm:p-8 shadow-2xl text-slate-800 animate-in zoom-in-95 my-8 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="inline-block px-2.5 py-0.5 bg-[#E8F5F1] text-[#00A878] text-[10px] font-black rounded-full uppercase tracking-wider">
                    Gestão de Inventário
                  </span>
                  <h3 className="text-lg font-black text-[#123B7A] uppercase tracking-tight mt-0.5">
                    {editingProduct ? 'Editar Medicamento / Artigo' : 'Adicionar Produto ao Catálogo'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProductForm} className="space-y-4 pt-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome Comercial do Produto *</label>
                  <input
                    type="text"
                    required
                    value={productForm.nome}
                    onChange={(e) => setProductForm({ ...productForm, nome: e.target.value })}
                    placeholder="Ex: Coartem 20/120mg ou Amoxicilina 500mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Nome Genérico (DCI)</label>
                    <input
                      type="text"
                      value={productForm.nome_generico}
                      onChange={(e) => setProductForm({ ...productForm, nome_generico: e.target.value })}
                      placeholder="Ex: Arteméter + Lumefantrina"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Dosagem / Apresentação</label>
                    <input
                      type="text"
                      value={productForm.dosagem}
                      onChange={(e) => setProductForm({ ...productForm, dosagem: e.target.value })}
                      placeholder="Ex: Caixa com 24 Comprimidos"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Preço de Venda (AOA) *</label>
                    <input
                      type="number"
                      required
                      value={productForm.preco}
                      onChange={(e) => setProductForm({ ...productForm, preco: e.target.value })}
                      placeholder="4500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Quantidade em Stock *</label>
                    <input
                      type="number"
                      required
                      value={productForm.quantidade_stock}
                      onChange={(e) => setProductForm({ ...productForm, quantidade_stock: e.target.value })}
                      placeholder="100"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Categoria</label>
                    <select
                      value={productForm.categoria}
                      onChange={(e) => setProductForm({ ...productForm, categoria: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                    >
                      <option value="medicamento">Medicamento</option>
                      <option value="suplemento">Suplemento & Vitamina</option>
                      <option value="exame">Teste Rápido / Exame</option>
                      <option value="material">Material Penso / Hospitalar</option>
                      <option value="servico">Serviço Farmacêutico</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Laboratório / Fabricante</label>
                    <input
                      type="text"
                      value={productForm.fabricante}
                      onChange={(e) => setProductForm({ ...productForm, fabricante: e.target.value })}
                      placeholder="Ex: Novartis, Medinfar, Sanofi"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={productForm.requer_receita}
                      onChange={(e) => setProductForm({ ...productForm, requer_receita: e.target.checked })}
                      className="rounded border-slate-300 text-[#00A878] focus:ring-[#00A878] w-4 h-4"
                    />
                    <div>
                      <div className="text-slate-800 font-bold text-xs">Medicamento Sujeito a Receita Médica</div>
                      <div className="text-[10px] text-slate-400 font-normal">Exige validação de prescrição médica no atendimento</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <input
                      type="checkbox"
                      checked={productForm.destaque}
                      onChange={(e) => setProductForm({ ...productForm, destaque: e.target.checked })}
                      className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4"
                    />
                    <div>
                      <div className="text-slate-800 font-bold text-xs">Produto em Destaque no Catálogo</div>
                      <div className="text-[10px] text-slate-400 font-normal">Aparece na vitrine principal da unidade</div>
                    </div>
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Descrição / Instruções de Uso</label>
                  <textarea
                    rows={3}
                    value={productForm.descricao}
                    onChange={(e) => setProductForm({ ...productForm, descricao: e.target.value })}
                    placeholder="Indicações terapêuticas, posologia ou observações importantes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                  >
                    Guardar Produto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: PRINT ORDER RECEIPT / DELIVERY SLIP */}
        {/* ========================================================================= */}
        {viewingOrderReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#00A878]" />
                  <h3 className="font-black text-sm text-[#123B7A] uppercase">Guia de Pedido / Recibo</h3>
                </div>
                <button
                  onClick={() => setViewingOrderReceipt(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thermal Slip Content */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-xs space-y-3">
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <div className="font-black text-sm text-[#123B7A] uppercase">{unit?.nome}</div>
                  <div className="text-[10px] text-slate-500">{unit?.endereco_completo}</div>
                  <div className="text-[10px] text-slate-500">Tel: {unit?.telefone}</div>
                </div>

                <div className="flex justify-between text-[11px]">
                  <span>PEDIDO: #{viewingOrderReceipt.codigo_pedido}</span>
                  <span>{new Date(viewingOrderReceipt.created_at).toLocaleDateString('pt-PT')}</span>
                </div>

                <div className="text-[11px]">
                  <div>UTENTE: {viewingOrderReceipt.paciente_nome}</div>
                  <div>TEL: {viewingOrderReceipt.paciente_telefone}</div>
                  {viewingOrderReceipt.endereco_entrega && (
                    <div className="text-amber-800 font-bold">ENDEREÇO: {viewingOrderReceipt.endereco_entrega}</div>
                  )}
                </div>

                <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-[11px]">
                  {viewingOrderReceipt.itens.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{it.quantidade}x {it.nome}</span>
                      <span className="font-bold">{(it.quantidade * it.preco_unitario).toLocaleString()} AOA</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-black text-sm text-[#00A878] pt-1">
                  <span>TOTAL A PAGAR:</span>
                  <span>{viewingOrderReceipt.total.toLocaleString()} AOA</span>
                </div>

                <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
                  MUTIKUKWAMA SAÚDE - PLATAFORMA NACIONAL ANGOLA
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-full bg-[#123B7A] hover:bg-[#0d2a59] text-white font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Talão</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: SUBMIT SUBSCRIPTION PAYMENT */}
        {/* ========================================================================= */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#123B7A] uppercase tracking-tight">
                      Renovação de Subscrição
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Submeta o comprovativo para validação
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSubscriptionPayment} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Plano Pretendido</label>
                  <select
                    value={paymentPlanType}
                    onChange={(e) => {
                      const pl = e.target.value as PlanType;
                      setPaymentPlanType(pl);
                      if (pl === 'basico') setPaymentAmount('25000');
                      if (pl === 'medio') setPaymentAmount('45000');
                      if (pl === 'avancado') setPaymentAmount('85000');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="basico">Plano Básico (50 produtos) - 25.000 AOA/mês</option>
                    <option value="medio">Plano Médio (200 produtos + Excel) - 45.000 AOA/mês</option>
                    <option value="avancado">Plano Avançado (Ilimitado + Selo ⭐) - 85.000 AOA/mês</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Periodicidade</label>
                  <select
                    value={paymentPeriodicity}
                    onChange={(e) => setPaymentPeriodicity(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="mensal">Mensal (1 Mês)</option>
                    <option value="trimestral">Trimestral (3 Meses - 5% Desconto)</option>
                    <option value="semestral">Semestral (6 Meses - 10% Desconto)</option>
                    <option value="anual">Anual (12 Meses - 20% Desconto)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Método de Liquidação</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-[#00A878]"
                  >
                    <option value="multicaixa_express">Multicaixa Express (MCX)</option>
                    <option value="transferencia_bancaria">Transferência Bancária (IBAN)</option>
                  </select>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-[11px]">
                  <div className="font-bold text-[#123B7A]">Dados Bancários Oficiais:</div>
                  <div className="text-slate-600">Banco: <strong>BAI Angola</strong> | Titular: <strong>MUTIKUKWAMA SAUDE LDA</strong></div>
                  <div className="text-[#00A878] font-mono font-bold">IBAN: AO06.0040.0000.1234.5678.9012.3</div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome / Ficheiro do Comprovativo *</label>
                  <input
                    type="text"
                    required
                    value={paymentProofName}
                    onChange={(e) => setPaymentProofName(e.target.value)}
                    placeholder="Ex: comprovativo_mcx_ref_98231.pdf"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 font-medium focus:outline-none focus:border-[#00A878]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full bg-[#00A878] hover:bg-[#008f66] text-white font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Enviar Comprovativo</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CONFIRM BATCH DELETE SELECTED PRODUCTS */}
        {/* ========================================================================= */}
        {isDeleteSelectedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-rose-950 uppercase tracking-tight">
                      Eliminar Produtos Selecionados
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {selectedProductIds.size} {selectedProductIds.size === 1 ? 'artigo selecionado' : 'artigos selecionados'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDeleteSelectedModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Confirmação de Eliminação em Lote</span>
                </div>
                <p className="leading-relaxed">
                  Tem a certeza que deseja eliminar os <strong className="font-black">{selectedProductIds.size} produtos</strong> selecionados da unidade/depósito <strong className="font-black">"{unit?.nome}"</strong>?
                </p>
                <p className="text-[11px] text-rose-700">
                  Esta ação libertará o espaço no catálogo para que possa cadastrar ou importar novos medicamentos atualizados.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteSelectedModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSelected}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Eliminar ({selectedProductIds.size})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CONFIRM DELETE SINGLE PRODUCT */}
        {/* ========================================================================= */}
        {productToDelete && (
          <div id="modal-delete-single-product-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div id="modal-delete-single-product-container" className="bg-white border border-rose-100 rounded-3xl max-w-md w-full p-6 shadow-2xl text-slate-800 animate-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-950 uppercase tracking-tight">
                      Remover Medicamento
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Exclusão de item do catálogo
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setProductToDelete(null)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-1.5">
                <p className="leading-relaxed">
                  Tem a certeza que deseja remover <strong className="font-black text-rose-950">"{productToDelete.name}"</strong> do catálogo da unidade?
                </p>
                <p className="text-[11px] text-rose-700 font-medium">
                  Este produto deixará de aparecer nas buscas dos utentes.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSingleProduct}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sim, Eliminar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CONFIRM CLEAR ALL CURRENT INVENTORY */}
        {/* ========================================================================= */}
        {isClearAllInventoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl text-slate-800 animate-in zoom-in-95 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-rose-950 uppercase tracking-tight">
                      Eliminar Todo o Inventário Atual
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Unidade / Depósito: <strong>{unit?.nome}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsClearAllInventoryModalOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-950 space-y-2">
                <div className="font-black flex items-center gap-2 text-rose-900 uppercase tracking-wider text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Atenção: Limpeza Completa de Catálogo</span>
                </div>
                <p className="leading-relaxed">
                  Tem a certeza absoluta de que deseja eliminar <strong className="font-black text-rose-700">TODOS os {allUnitProducts.length} medicamentos e artigos</strong> do inventário atual de <strong className="font-black">"{unit?.nome}"</strong>?
                </p>
                <div className="bg-white/80 p-3 rounded-xl border border-rose-200 text-[11px] text-slate-700 space-y-1">
                  <div>✓ <strong>Finalidade:</strong> Limpar o inventário anterior a fim de carregar uma lista 100% atualizada (manualmente ou via folha Excel/CSV).</div>
                  <div>✓ <strong>Segurança:</strong> O histórico de vendas e pedidos passados da unidade não será afetado.</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsClearAllInventoryModalOpen(false);
                    setActiveTab('excel');
                  }}
                  className="text-xs text-slate-500 hover:text-[#00A878] font-bold underline cursor-pointer"
                >
                  Ir para Importação Excel
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsClearAllInventoryModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleConfirmClearAllInventory();
                      setActiveTab('excel');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar e Atualizar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* B2B Depot Profile Modal */}
        {selectedDepotForProfile && (
          <UnitProfileModal
            unit={selectedDepotForProfile}
            onClose={() => setSelectedDepotForProfile(null)}
          />
        )}

        {/* B2B Depot Route & Navigation Modal */}
        {selectedDepotForRoute && (
          <UnitRouteMapModal
            unit={selectedDepotForRoute}
            onClose={() => setSelectedDepotForRoute(null)}
            userCoords={unit ? { lat: unit.latitude, lng: unit.longitude } : { lat: -8.825, lng: 13.235 }}
            originLabel={unit ? `Sua Unidade (${unit.nome})` : 'Sua Unidade'}
          />
        )}

        {/* Dedicated B2B Cart & Checkout Drawer */}
        <CartDrawerModal
          isOpen={isB2BCartOpen}
          onClose={() => setIsB2BCartOpen(false)}
        />

        {/* Subscription Payment Receipt Modal */}
        {viewingPaymentProof && (
          <PaymentReceiptModal
            isOpen={!!viewingPaymentProof}
            payment={viewingPaymentProof}
            unit={unit}
            onClose={() => setViewingPaymentProof(null)}
          />
        )}
      </div>
    </div>
  );
};
