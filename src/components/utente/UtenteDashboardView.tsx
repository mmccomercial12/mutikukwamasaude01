import React, { useState, useMemo } from 'react';
import {
  HeartPulse,
  Package,
  Calendar,
  FileText,
  CreditCard,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Truck,
  Building2,
  Search,
  Sparkles,
  Printer,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Shield,
  ShieldCheck,
  Flame,
  Star,
  Activity,
  User,
  Pill,
  Stethoscope,
  Microscope,
  Navigation,
  ArrowRight,
  RefreshCw,
  Bell,
  X,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabaseData } from '../../services/supabase';
import { Order, HealthUnit, UserProfile } from '../../types';
import { formatAOA } from '../common/MedicalSearchResultCard';
import { RatingModal } from './RatingModal';

interface Appointment {
  id: string;
  tipo: 'consulta' | 'exame';
  titulo: string;
  especialidade: string;
  medico_ou_tecnico?: string;
  unidade_id: string;
  unidade_nome: string;
  unidade_telefone: string;
  unidade_whatsapp: string;
  unidade_endereco: string;
  data: string;
  hora: string;
  status: 'confirmado' | 'pendente' | 'realizado' | 'cancelado';
  preco: number;
  preparo?: string;
  avaliado?: boolean;
  avaliacao_estrelas?: number;
}

interface SavedPrescription {
  id: string;
  codigo_receita: string;
  medico_nome: string;
  crm_medico: string;
  instituicao: string;
  data_emissao: string;
  validade: string;
  medicamentos: Array<{
    nome: string;
    dosagem: string;
    frequencia: string;
    duracao: string;
    instrucoes: string;
  }>;
  diagnostico_observacoes?: string;
}

interface MedicationReminder {
  id: string;
  medicamento: string;
  dosagem: string;
  horarios: string[];
  tomado_hoje: boolean;
  dias_restantes: number;
  notas?: string;
}

interface UtenteDashboardViewProps {
  onNavigateSearch: (query?: string, province?: string) => void;
  onOpenPrescriptionAI: () => void;
  onSelectUnit?: (unit: HealthUnit) => void;
  onOpenRouteModal?: (unit: HealthUnit) => void;
}

export const UtenteDashboardView: React.FC<UtenteDashboardViewProps> = ({
  onNavigateSearch,
  onOpenPrescriptionAI,
  onSelectUnit,
  onOpenRouteModal,
}) => {
  const { currentUser } = useAuth();
  const { success, info } = useToast();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'pedidos' | 'consultas' | 'receitas' | 'favoritos' | 'sos'>('pedidos');

  // Orders State
  const [orders, setOrders] = useState<Order[]>(() => {
    return supabaseData.getOrdersByPatient(currentUser?.id, currentUser?.email);
  });

  // Selected order for receipt modal
  const [viewingReceipt, setViewingReceipt] = useState<Order | null>(null);

  // Rating Modal state
  const [ratingModalData, setRatingModalData] = useState<{
    isOpen: boolean;
    unit: { id: string; nome: string };
    order?: Order | null;
    appointment?: Appointment | null;
  }>({
    isOpen: false,
    unit: { id: '', nome: '' },
    order: null,
    appointment: null,
  });

  const handleRatingSuccess = () => {
    // Refresh orders
    setOrders(supabaseData.getOrdersByPatient(currentUser?.id, currentUser?.email));
    // If appointment was rated, mark it
    if (ratingModalData.appointment) {
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === ratingModalData.appointment?.id
            ? { ...a, avaliado: true, avaliacao_estrelas: 5 }
            : a
        )
      );
    }
  };

  // Status Filter for orders
  const [orderFilter, setOrderFilter] = useState<'all' | 'ativos' | 'concluidos'>('all');

  // Appointments (Consultas & Exames do Utente)
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 'apt-1',
      tipo: 'consulta',
      titulo: 'Consulta de Especialidade em Cardiologia',
      especialidade: 'Cardiologia & Hipertensão',
      medico_ou_tecnico: 'Dr. António Bento Cabral (CRM 4812)',
      unidade_id: 'unit-4',
      unidade_nome: 'Clínica Sagrada Esperança Luanda',
      unidade_telefone: '+244 923 444 555',
      unidade_whatsapp: '+244923444555',
      unidade_endereco: 'Av. Mortala Mohamed, Ilha de Luanda, Luanda',
      data: '2026-09-12',
      hora: '10:30',
      status: 'confirmado',
      preco: 25000,
      preparo: 'Trazer exames laboratoriais anteriores e eletrocardiograma recente.',
    },
    {
      id: 'apt-2',
      tipo: 'exame',
      titulo: 'Ecografia Abdominal Total',
      especialidade: 'Imagiologia Médica',
      medico_ou_tecnico: 'Dra. Elsa Domingos',
      unidade_id: 'unit-5',
      unidade_nome: 'Laboratório Central de Análises Clínicas Luanda',
      unidade_telefone: '+244 923 555 666',
      unidade_whatsapp: '+244923555666',
      unidade_endereco: 'Rua Rainha Ginga, Ingombota, Luanda',
      data: '2026-09-18',
      hora: '09:00',
      status: 'confirmado',
      preco: 18000,
      preparo: 'Jejum obrigatório de 6 horas. Ingerir 4 copos de água 1 hora antes sem urinar.',
    },
    {
      id: 'apt-3',
      tipo: 'consulta',
      titulo: 'Consulta de Pediatria Geral',
      especialidade: 'Pediatria e Puericultura',
      medico_ou_tecnico: 'Dra. Maria Francisca Tavares',
      unidade_id: 'unit-1',
      unidade_nome: 'Farmácia & Centro Luanda Saúde',
      unidade_telefone: '+244 923 111 222',
      unidade_whatsapp: '+244923111222',
      unidade_endereco: 'Rua Kwame Nkrumah nº 14, Maianga, Luanda',
      data: '2026-08-25',
      hora: '14:00',
      status: 'realizado',
      preco: 15000,
    },
  ]);

  // Digital Prescriptions (Receitas do Utente)
  const [prescriptions] = useState<SavedPrescription[]>([
    {
      id: 'rec-1',
      codigo_receita: 'REC-MINSA-2026-04289',
      medico_nome: 'Dr. João Pedro Silva',
      crm_medico: 'CRM-ANG 3912',
      instituicao: 'Hospital Geral de Luanda',
      data_emissao: '2026-08-28',
      validade: '2026-09-28',
      diagnostico_observacoes: 'Quadro clínico de Malária não complicada + síndrome febril.',
      medicamentos: [
        {
          nome: 'Coartem 80/480mg',
          dosagem: '80mg Arteméter / 480mg Lumefantrina',
          frequencia: '1 comprimido de 12 em 12 horas',
          duracao: '3 dias consecutivos',
          instrucoes: 'Tomar imediatamente após refeição com teor lipídico.',
        },
        {
          nome: 'Paracetamol 500mg',
          dosagem: '500mg',
          frequencia: '1 comprimido de 8 em 8 horas se dor ou febre > 38ºC',
          duracao: '4 dias',
          instrucoes: 'Não ultrapassar 3000mg diários.',
        },
      ],
    },
    {
      id: 'rec-2',
      codigo_receita: 'REC-MINSA-2026-08914',
      medico_nome: 'Dra. Fátima Neto',
      crm_medico: 'CRM-ANG 5210',
      instituicao: 'Clínica Sagrada Esperança',
      data_emissao: '2026-08-10',
      validade: '2026-11-10',
      diagnostico_observacoes: 'Controlo de Hipertensão Arterial Estágio I.',
      medicamentos: [
        {
          nome: 'Losartana Potássica 50mg',
          dosagem: '50mg',
          frequencia: '1 comprimido pela manhã em jejum',
          duracao: 'Uso contínuo (90 dias)',
          instrucoes: 'Aferir a pressão arterial semanalmente.',
        },
      ],
    },
  ]);

  // Medication Reminders (Lembretes de Toma)
  const [reminders, setReminders] = useState<MedicationReminder[]>([
    {
      id: 'rem-1',
      medicamento: 'Coartem 80/480mg',
      dosagem: '1 comprimido',
      horarios: ['08:00', '20:00'],
      tomado_hoje: true,
      dias_restantes: 2,
      notas: 'Tomar com leite ou refeição.',
    },
    {
      id: 'rem-2',
      medicamento: 'Paracetamol 500mg',
      dosagem: '1 comprimido',
      horarios: ['14:00', '22:00'],
      tomado_hoje: false,
      dias_restantes: 3,
      notas: 'Apenas em caso de febre ou cefaleia.',
    },
  ]);

  // Saved / Favorite Units
  const savedUnits = useMemo(() => {
    const allUnits = supabaseData.getUnits();
    // Return top verified units as favorites for demo
    return allUnits.slice(0, 3);
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'ativos') {
      return orders.filter((o) => o.status !== 'concluido' && o.status !== 'cancelado');
    }
    if (orderFilter === 'concluidos') {
      return orders.filter((o) => o.status === 'concluido' || o.status === 'cancelado');
    }
    return orders;
  }, [orders, orderFilter]);

  // Quick WhatsApp order inquiry
  const handleOrderWhatsApp = (order: Order) => {
    const phone = order.unidade_whatsapp || '+244923111222';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Olá ${order.unidade_nome}! Sou o utente ${order.paciente_nome}. Gostaria de informações sobre o meu pedido ${order.codigo_pedido} no valor de ${formatAOA(order.total)} (${order.modalidade === 'entrega' ? 'Entrega em domicílio' : 'Levantamento no Balcão'}).`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  const handlePrintReceipt = (order: Order) => {
    window.print();
  };

  const toggleReminderTaken = (remId: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === remId ? { ...r, tomado_hoje: !r.tomado_hoje } : r))
    );
    success('Lembrete de toma atualizado com sucesso!');
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ------------------------------------------------------------- */}
      {/* TOP HERO: UTENTE IDENTITY & HEALTH OVERVIEW                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-[#123B7A] via-[#1a4a94] to-[#0c2854] text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#00A878]/20 via-sky-400/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="relative">
              <img
                src={
                  currentUser?.avatar_url ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                }
                alt={currentUser?.nome || 'Utente'}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-md bg-white/10"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-[#00A878] text-white rounded-full shadow-xs border-2 border-[#123B7A]">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full bg-[#00A878]/30 border border-[#00A878]/40 text-[#00E5A3] text-[11px] font-black uppercase tracking-wider">
                  Portal do Utente • MINSA
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 text-[10px] font-bold border border-white/10">
                  ID: UT-AO-2026-94812
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                {currentUser?.nome || 'Manuel Domingos Pereira'}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#00A878]" />
                  Luanda, Maianga (Angola)
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                  {currentUser?.telefone || '+244 923 456 789'}
                </span>
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  Grupo: O+ | Alergia: Penicilina
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons on Top Right */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateSearch()}
              className="bg-[#00A878] hover:bg-[#008f66] text-white px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Pesquisar Medicamentos</span>
            </button>

            <button
              type="button"
              onClick={onOpenPrescriptionAI}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all backdrop-blur-sm active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Digitalizar Receita IA</span>
            </button>
          </div>
        </div>

        {/* Utente Metrics Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-300">Pedidos no Balcão / Entrega</span>
              <Package className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{orders.length}</div>
            <span className="text-[10px] text-emerald-300 font-bold">
              {orders.filter((o) => o.status !== 'concluido').length} em andamento
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-300">Consultas & Exames</span>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{appointments.length}</div>
            <span className="text-[10px] text-amber-300 font-bold">2 agendamentos futuros</span>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-300">Receitas Médicas Ativas</span>
              <FileText className="w-4 h-4 text-[#00A878]" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{prescriptions.length}</div>
            <span className="text-[10px] text-slate-300 font-bold">100% validadas pelo MINSA</span>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-300">Cartão de Saúde</span>
              <CreditCard className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-sm font-black text-white mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#00A878]" />
              <span>Ativo • O+</span>
            </div>
            <span className="text-[10px] text-slate-300 font-bold">Válido em todo território</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* NAVIGATION TABS FOR UTENTE PORTAL                             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('pedidos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'pedidos'
              ? 'bg-[#123B7A] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#123B7A] hover:bg-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Meus Pedidos ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('consultas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'consultas'
              ? 'bg-[#123B7A] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#123B7A] hover:bg-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Consultas & Exames ({appointments.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('receitas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'receitas'
              ? 'bg-[#123B7A] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#123B7A] hover:bg-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Receitas & Posologia ({prescriptions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('favoritos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'favoritos'
              ? 'bg-[#123B7A] text-white shadow-xs'
              : 'text-slate-600 hover:text-[#123B7A] hover:bg-white'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500" />
          <span>Farmácias Favoritas ({savedUnits.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer ml-auto ${
            activeTab === 'sos'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Linhas SOS & Emergência</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: MEUS PEDIDOS & RESERVAS FARMACÊUTICAS                  */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'pedidos' && (
        <div className="space-y-5">
          {/* Filter sub-bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrderFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer ${
                  orderFilter === 'all'
                    ? 'bg-[#123B7A] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('ativos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer ${
                  orderFilter === 'ativos'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Em Andamento ({orders.filter((o) => o.status !== 'concluido' && o.status !== 'cancelado').length})
              </button>
              <button
                type="button"
                onClick={() => setOrderFilter('concluidos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer ${
                  orderFilter === 'concluidos'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Concluídos ({orders.filter((o) => o.status === 'concluido' || o.status === 'cancelado').length})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Pedidos sincronizados em tempo real com as farmácias e clínicas credenciadas
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isDelivered = order.status === 'concluido';
                const isDelivery = order.modalidade === 'entrega';
                const isRoad = order.status === 'a_caminho';
                const isConfirmed = order.status === 'confirmado';

                const statusColor = isDelivered
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isRoad
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : isConfirmed
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-700 border-slate-200';

                const statusLabel = isDelivered
                  ? 'Concluído / Levantado'
                  : isRoad
                  ? 'Estafeta a Caminho com a Entrega'
                  : isConfirmed
                  ? 'Pronto para Levantamento / Em Preparação'
                  : 'Pendente de Confirmação';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Top Bar of the Order Card */}
                    <div className="bg-slate-50 border-b border-slate-100 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-black text-sm text-[#123B7A]">
                          {order.codigo_pedido}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border ${statusColor}`}>
                          {statusLabel}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {new Date(order.created_at).toLocaleDateString('pt-AO', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Pago / A Pagar</span>
                        <span className="text-base font-black text-[#00A878]">
                          {formatAOA(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-6 space-y-4">
                      {/* Unit & Delivery Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-[#123B7A] flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Unidade de Saúde / Farmácia
                            </span>
                            <h4 className="text-sm font-black text-slate-800 uppercase">
                              {order.unidade_nome}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                              Tel: {order.unidade_whatsapp || '+244 923 111 222'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-[#00A878] flex items-center justify-center shrink-0">
                            {isDelivery ? <Truck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                              Modalidade
                            </span>
                            <h4 className="text-sm font-black text-slate-800 uppercase">
                              {isDelivery ? 'Entrega Rápida em Domicílio' : 'Levantamento no Balcão Farmacêutico'}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {order.endereco_entrega || 'Balcão de Atendimento'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                          Itens do Pedido ({order.itens.length})
                        </span>
                        <div className="space-y-2">
                          {order.itens.map((item, idx) => (
                            <div
                              key={item.id || idx}
                              className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-[#123B7A] font-black flex items-center justify-center text-xs">
                                  {item.quantidade}x
                                </span>
                                <span className="font-bold text-slate-800">{item.nome}</span>
                              </div>
                              <span className="font-black text-slate-700">
                                {formatAOA(item.subtotal || item.preco * item.quantidade)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Status Progress Bar */}
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black uppercase tracking-wider mb-2">
                          <span className="text-emerald-700">1. Pedido Criado</span>
                          <span className={order.status !== 'pendente' ? 'text-emerald-700' : 'text-slate-400'}>
                            2. Confirmado
                          </span>
                          <span className={isRoad || isDelivered ? 'text-emerald-700' : 'text-slate-400'}>
                            3. {isDelivery ? 'A Caminho' : 'Pronto Balcão'}
                          </span>
                          <span className={isDelivered ? 'text-emerald-700' : 'text-slate-400'}>
                            4. Concluído
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full w-1/4"></div>
                          <div
                            className={`h-full w-1/4 ${
                              order.status !== 'pendente' ? 'bg-emerald-500' : 'bg-transparent'
                            }`}
                          ></div>
                          <div
                            className={`h-full w-1/4 ${
                              isRoad || isDelivered ? 'bg-emerald-500' : 'bg-transparent'
                            }`}
                          ></div>
                          <div
                            className={`h-full w-1/4 ${isDelivered ? 'bg-emerald-500' : 'bg-transparent'}`}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="p-4 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Digital Receipt button */}
                        <button
                          type="button"
                          onClick={() => setViewingReceipt(order)}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Recibo Digital</span>
                        </button>

                        {/* GPS Route button */}
                        {onOpenRouteModal && (
                          <button
                            type="button"
                            onClick={() => {
                              const unit = supabaseData.getUnitById(order.unidade_id);
                              if (unit) {
                                onOpenRouteModal(unit);
                              } else {
                                info('A calcular rota até à farmácia...');
                              }
                            }}
                            className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#123B7A] border border-sky-100 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 text-sky-600" />
                            <span>Ver Rota no Mapa</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Star Rating Button for Completed Orders */}
                        {isDelivered && (
                          order.avaliado ? (
                            <span className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{order.avaliacao_estrelas || 5}/5 Estrelas Atribuídas</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setRatingModalData({
                                  isOpen: true,
                                  unit: { id: order.unidade_id, nome: order.unidade_nome },
                                  order,
                                  appointment: null,
                                })
                              }
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 fill-white text-white" />
                              <span>Atribuir Estrelas</span>
                            </button>
                          )
                        )}

                        {/* WhatsApp */}
                        <button
                          type="button"
                          onClick={() => handleOrderWhatsApp(order)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp da Farmácia</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 bg-blue-50 text-[#123B7A] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-[#123B7A] uppercase">
                Nenhum pedido encontrado nesta categoria
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Pode pesquisar por medicamentos em farmácias credenciadas em todas as 21 províncias e fazer pedidos com levantamento ou entrega.
              </p>
              <button
                type="button"
                onClick={() => onNavigateSearch()}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#123B7A] text-white font-black text-xs uppercase tracking-wider hover:bg-[#0c2854] transition-all cursor-pointer"
              >
                Pesquisar Farmácias com Stock
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: CONSULTAS & EXAMES AGENDADOS                           */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'consultas' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-[#123B7A] uppercase">
                Minhas Consultas Médicas & Exames de Laboratório
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Acompanhe datas, horários e instruções de preparo para atendimento prioritário.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateSearch('', 'Luanda')}
              className="px-4 py-2 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Marcar Nova Consulta ou Exame</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {appointments.map((apt) => {
              const isPast = apt.status === 'realizado' || apt.status === 'cancelado';
              return (
                <div
                  key={apt.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`p-2 rounded-xl border ${
                            apt.tipo === 'consulta'
                              ? 'bg-sky-50 border-sky-100 text-sky-700'
                              : 'bg-purple-50 border-purple-100 text-purple-700'
                          }`}
                        >
                          {apt.tipo === 'consulta' ? (
                            <Stethoscope className="w-5 h-5" />
                          ) : (
                            <Microscope className="w-5 h-5" />
                          )}
                        </span>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block">
                            {apt.tipo === 'consulta' ? 'Consulta Médica' : 'Exame de Diagnóstico'}
                          </span>
                          <span className="text-xs font-black text-[#123B7A] uppercase">
                            {apt.especialidade}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          apt.status === 'confirmado'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isPast
                            ? 'bg-slate-100 text-slate-600 border-slate-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {apt.status === 'confirmado'
                          ? 'Confirmado'
                          : apt.status === 'realizado'
                          ? 'Realizado'
                          : 'Pendente'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-slate-800 uppercase leading-tight">
                      {apt.titulo}
                    </h4>

                    {apt.medico_ou_tecnico && (
                      <p className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Profissional: {apt.medico_ou_tecnico}</span>
                      </p>
                    )}

                    {/* Date, Time & Unit */}
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-700">
                        <span className="flex items-center gap-1.5 text-[#123B7A]">
                          <Calendar className="w-4 h-4 text-[#00A878]" />
                          {new Date(apt.data).toLocaleDateString('pt-AO', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600 font-black">
                          <Clock className="w-4 h-4 text-amber-500" />
                          {apt.hora}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-slate-600">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-slate-800">{apt.unidade_nome}</span>
                          <span className="text-[11px] text-slate-500">{apt.unidade_endereco}</span>
                        </div>
                      </div>

                      {apt.preparo && (
                        <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-900 font-medium">
                          <strong>⚠️ Preparação:</strong> {apt.preparo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-[#00A878]">
                      {formatAOA(apt.preco)}
                    </span>

                    <div className="flex items-center gap-2">
                      {apt.status === 'realizado' && (
                        apt.avaliado ? (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1 shadow-2xs">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{apt.avaliacao_estrelas || 5}/5 Estrelas</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setRatingModalData({
                                isOpen: true,
                                unit: { id: apt.unidade_id, nome: apt.unidade_nome },
                                appointment: apt,
                                order: null,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                          >
                            <Star className="w-3.5 h-3.5 fill-white" />
                            <span>Avaliar Consulta</span>
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const clean = apt.unidade_whatsapp.replace(/[^0-9]/g, '');
                          window.open(`https://wa.me/${clean}`, '_blank');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const clean = apt.unidade_telefone.replace(/[^0-9]/g, '');
                          window.open(`tel:${clean}`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Ligar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: RECEITAS DIGITAIS & LEMBRETES DE POSOLOGIA             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'receitas' && (
        <div className="space-y-6">
          {/* Daily Pill Schedule Box */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00A878] flex items-center justify-center border border-emerald-100">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#123B7A] uppercase">
                    Plano Diário de Posologia & Lembretes
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Horários de toma dos medicamentos prescritos para a sua recuperação
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black">
                Hoje • 2 Medicamentos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    rem.tomado_hoje
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      {rem.dosagem} • {rem.dias_restantes} dias restantes
                    </span>
                    <h4 className="text-sm font-black text-slate-800">{rem.medicamento}</h4>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#123B7A] pt-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Horários: {rem.horarios.join(', ')}</span>
                    </div>
                    {rem.notas && <p className="text-[11px] text-slate-500">{rem.notas}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleReminderTaken(rem.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      rem.tomado_hoje
                        ? 'bg-[#00A878] text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{rem.tomado_hoje ? 'Tomado' : 'Tomar'}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stored Prescriptions */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-black text-[#123B7A] uppercase">
                Receitas Médicas Salvas no Dossier do Utente ({prescriptions.length})
              </h3>

              <button
                type="button"
                onClick={onOpenPrescriptionAI}
                className="px-4 py-2 rounded-xl bg-[#123B7A] hover:bg-[#0c2854] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Analisar Nova Receita com IA</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {prescriptions.map((presc) => (
                <div
                  key={presc.id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4 hover:shadow-md transition-all relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-black text-[#123B7A]">
                        {presc.codigo_receita}
                      </span>
                      <h4 className="text-base font-black text-slate-800 uppercase mt-0.5">
                        {presc.medico_nome}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {presc.crm_medico} • {presc.instituicao}
                      </p>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                      Receita Válida
                    </span>
                  </div>

                  {presc.diagnostico_observacoes && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 font-medium">
                      <strong>Diagnóstico:</strong> {presc.diagnostico_observacoes}
                    </div>
                  )}

                  {/* Medicines List */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Medicamentos Prescritos
                    </span>
                    {presc.medicamentos.map((med, mIdx) => (
                      <div
                        key={mIdx}
                        className="p-3 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-black text-slate-800">{med.nome}</h5>
                          <span className="text-[10px] font-bold text-slate-500">{med.dosagem}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{med.frequencia} • {med.duracao}</p>
                        <p className="text-slate-500 text-[10px] italic">{med.instrucoes}</p>

                        <div className="pt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onNavigateSearch(med.nome)}
                            className="text-[11px] font-black text-[#00A878] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Search className="w-3 h-3" />
                            <span>Buscar stock desta fórmula</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Emitida em: {presc.data_emissao}</span>
                    <span className="font-bold text-amber-700">Válida até: {presc.validade}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: FARMÁCIAS FAVORITAS & ITENS SALVOS                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'favoritos' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-[#123B7A] uppercase">
                Minhas Farmácias e Clínicas Guardadas ({savedUnits.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Aceda rapidamente aos estabelecimentos de saúde com atendimento prioritário
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateSearch()}
              className="px-4 py-2 rounded-xl bg-[#123B7A] hover:bg-[#0c2854] text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Explorar Mais Farmácias
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {savedUnits.map((unit) => (
              <div
                key={unit.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={unit.logo_url || 'https://images.unsplash.com/photo-1586015555751-63c2c125df96?w=200'}
                      alt={unit.nome}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {unit.tipo === 'farmacia' ? 'Farmácia' : 'Clínica'}
                      </span>
                      <h4 className="text-sm font-black text-[#123B7A] uppercase leading-tight line-clamp-2">
                        {unit.nome}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mt-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{unit.avaliacao?.toFixed(1) || '4.9'}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">{unit.descricao}</p>

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#00A878]" />
                      <span className="truncate">{unit.bairro}, {unit.municipio} ({unit.provincia})</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{unit.horario_funcionamento}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectUnit) onSelectUnit(unit);
                    }}
                    className="py-2 px-3 rounded-xl bg-[#123B7A] hover:bg-[#0c2854] text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Ver Catálogo
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenRouteModal) onOpenRouteModal(unit);
                    }}
                    className="py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#123B7A] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Navigation className="w-3.5 h-3.5 text-sky-600" />
                    <span>Ver Rota</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: SOS & LINHAS DE EMERGÊNCIA NACIONAL                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'sos' && (
        <div className="space-y-6">
          <div className="bg-rose-700 text-white rounded-3xl p-6 sm:p-8 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-rose-200">
                  Apoio Imediato • Angola
                </span>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-white">
                  Linhas Nacionais de Emergência Médica e Socorro
                </h2>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-rose-100 font-medium mt-2 leading-relaxed max-w-3xl">
              Em caso de risco de vida, convulsões, febre alta persistente em crianças ou acidentes graves, ligue imediatamente para os números de emergência gratuitos da República de Angola.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl border border-rose-200 p-6 shadow-xs flex flex-col justify-between text-center space-y-4">
              <div>
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-3 border border-rose-200">
                  <Phone className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900 uppercase">INEMA (Ambulâncias)</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Instituto Nacional de Emergências Médicas de Angola
                </p>
                <div className="text-3xl font-black text-rose-600 mt-3">111</div>
              </div>

              <a
                href="tel:111"
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Ligar Grátis 111</span>
              </a>
            </div>

            <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-xs flex flex-col justify-between text-center space-y-4">
              <div>
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                  <Activity className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900 uppercase">Bombeiros (Resgate)</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Serviço de Protecção Civil e Bombeiros
                </p>
                <div className="text-3xl font-black text-amber-600 mt-3">115</div>
              </div>

              <a
                href="tel:115"
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Ligar Grátis 115</span>
              </a>
            </div>

            <div className="bg-white rounded-3xl border border-sky-200 p-6 shadow-xs flex flex-col justify-between text-center space-y-4">
              <div>
                <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center mx-auto mb-3 border border-sky-200">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900 uppercase">Polícia Nacional</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Central de Atendimento e Emergências Policiais
                </p>
                <div className="text-3xl font-black text-sky-700 mt-3">113</div>
              </div>

              <a
                href="tel:113"
                className="w-full py-3 rounded-2xl bg-[#123B7A] hover:bg-[#0c2854] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Ligar Grátis 113</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DIGITAL RECEIPT MODAL                                         */}
      {/* ------------------------------------------------------------- */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-[#00A878]" />
                <span className="text-xs font-black uppercase text-[#123B7A]">
                  Comprovativo Digital • MUTIKUKWAMA SAÚDE
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-dashed border-slate-200">
                <h3 className="text-base font-black text-slate-900 uppercase">
                  {viewingReceipt.unidade_nome}
                </h3>
                <span className="font-mono font-black text-[#123B7A] text-sm mt-1 block">
                  {viewingReceipt.codigo_pedido}
                </span>
                <span className="text-[11px] text-slate-500">
                  {new Date(viewingReceipt.created_at).toLocaleString('pt-AO')}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Utente:</span>
                  <span className="font-bold text-slate-800">{viewingReceipt.paciente_nome}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Contacto:</span>
                  <span className="font-bold text-slate-800">{viewingReceipt.paciente_telefone}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Modalidade:</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {viewingReceipt.modalidade === 'entrega' ? 'Entrega em Domicílio' : 'Levantamento no Balcão'}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Itens</span>
                {viewingReceipt.itens.map((item, i) => (
                  <div key={i} className="flex justify-between text-slate-700">
                    <span>
                      {item.quantidade}x {item.nome}
                    </span>
                    <span className="font-bold">
                      {formatAOA(item.subtotal || item.preco * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-dashed border-slate-200 space-y-1 text-sm font-black">
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Subtotal:</span>
                  <span>{formatAOA(viewingReceipt.subtotal)}</span>
                </div>
                {viewingReceipt.taxa_entrega > 0 && (
                  <div className="flex justify-between text-slate-600 text-xs">
                    <span>Taxa de Entrega:</span>
                    <span>{formatAOA(viewingReceipt.taxa_entrega)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg text-[#00A878] pt-1">
                  <span>Total Geral:</span>
                  <span>{formatAOA(viewingReceipt.total)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handlePrintReceipt(viewingReceipt)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="px-5 py-2 rounded-xl bg-[#123B7A] text-white font-black text-xs uppercase tracking-wider hover:bg-[#0c2854] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating & Star Assignment Modal */}
      <RatingModal
        isOpen={ratingModalData.isOpen}
        onClose={() =>
          setRatingModalData({
            isOpen: false,
            unit: { id: '', nome: '' },
            order: null,
            appointment: null,
          })
        }
        unit={ratingModalData.unit}
        order={ratingModalData.order}
        appointment={ratingModalData.appointment}
        patientName={currentUser?.nome || 'Manuel Domingos Pereira'}
        patientId={currentUser?.id || 'user-paciente'}
        patientAvatar={currentUser?.avatar_url}
        onSuccess={handleRatingSuccess}
      />
    </div>
  );
};
