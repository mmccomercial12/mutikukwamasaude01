import React from 'react';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  LogOut,
  Home,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel } from '../../utils/rbac';
import { UserRole } from '../../types';

interface AccessDeniedViewProps {
  title?: string;
  reason?: string;
  recommendedView?: string;
  onNavigate: (view: any) => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  title = 'Acesso Restrito pelo Sistema de Regras (RBAC)',
  reason = 'O seu perfil de utilizador não possui privilégios de acesso a esta secção da plataforma.',
  recommendedView = 'home',
  onNavigate,
}) => {
  const { currentUser, logout } = useAuth();
  const roleInfo = getRoleLabel(currentUser?.role);

  const getTargetViewLabel = (v: string) => {
    switch (v) {
      case 'admin-dashboard':
      case 'admin':
        return 'Painel do Super Administrador';
      case 'unit-dashboard':
        return currentUser?.role === 'deposito'
          ? 'Painel do Depósito Grossista'
          : 'Portal da Unidade Sanitária';
      case 'institutional':
        return 'Portal do Ministério da Saúde (MINSA)';
      case 'utente-dashboard':
        return 'Portal do Utente';
      default:
        return 'Página Inicial';
    }
  };

  const handleGoToAuthorizedPortal = () => {
    onNavigate(recommendedView);
  };

  const handleLogoutAndSwitch = () => {
    logout();
    onNavigate('login');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="max-w-3xl w-full bg-white border border-slate-200/90 rounded-3xl shadow-xl p-6 sm:p-10 space-y-8 animate-in fade-in zoom-in-95">
        
        {/* Header Alert */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200/80 flex items-center justify-center shrink-0 text-rose-600 shadow-sm">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/70 border border-rose-200 text-rose-800 text-xs font-black uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" />
              <span>Restrição de Perfil de Segurança Ativa</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {title}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              {reason}
            </p>
          </div>
        </div>

        {/* Current User Identity Card */}
        <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Credencial e Perfil em Sessão:
            </span>
            <div className="flex items-center gap-2">
              <strong className="text-slate-900 font-bold text-sm sm:text-base">
                {currentUser ? currentUser.nome : 'Utilizador Não Autenticado'}
              </strong>
              {currentUser && (
                <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${roleInfo.badgeColor}`}>
                  {currentUser.role.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {currentUser?.email} {currentUser?.username ? `(User: ${currentUser.username})` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogoutAndSwitch}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-center"
            title="Terminar sessão atual para entrar com outro login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Trocar de Conta</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Página Inicial</span>
          </button>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <button
              type="button"
              onClick={handleGoToAuthorizedPortal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#00A878] hover:bg-[#008f66] text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <span>Ir para {getTargetViewLabel(recommendedView)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
