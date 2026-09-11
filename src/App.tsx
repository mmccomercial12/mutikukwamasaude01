import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/home/HeroSection';
import { SearchAndResultsView } from './components/search/SearchAndResultsView';
import { PlansAndPricingView } from './components/plans/PlansAndPricingView';
import { UnitDashboard } from './components/dashboard/UnitDashboard';
import { AdminSuperAdminDashboard } from './components/admin/AdminSuperAdminDashboard';
import { MinistryIntelligenceDashboard } from './components/institutional/MinistryIntelligenceDashboard';
import { PrescriptionAIModal } from './components/prescription/PrescriptionAIModal';
import { CartDrawerModal } from './components/cart/CartDrawerModal';
import { UnitProfileModal } from './components/units/UnitProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { LoginPage } from './components/auth/LoginPage';
import { LegalModal, LegalDocumentType } from './components/legal/LegalModal';
import { UtenteDashboardView } from './components/utente/UtenteDashboardView';
import { UnitRouteMapModal } from './components/units/UnitRouteMapModal';
import { HealthUnit } from './types';
import { getSavedUserGpsLocation } from './services/geoService';

type MainView = 'home' | 'search' | 'plans' | 'unit-dashboard' | 'admin' | 'admin-dashboard' | 'institutional' | 'login' | 'utente-dashboard';

const MainAppContent: React.FC = () => {
  const { currentUser, isSuperAdmin, isNationalAdmin, isUnit, isDepot } = useAuth();

  const [currentView, setCurrentView] = useState<MainView>('utente-dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProvince, setSearchProvince] = useState('all');
  const [searchMunicipality, setSearchMunicipality] = useState('all');

  // Modals state
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<import('./types').UserRole>('paciente');
  const [selectedUnitForProfile, setSelectedUnitForProfile] = useState<HealthUnit | null>(null);
  const [selectedUnitForRoute, setSelectedUnitForRoute] = useState<HealthUnit | null>(null);

  // Legal Modal State
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocumentType>('termos');

  const handleOpenLegalDoc = (doc: LegalDocumentType) => {
    setActiveLegalDoc(doc);
    setIsLegalModalOpen(true);
  };

  const handleHeroSearch = (query: string, province: string, categoryOrMunicipality?: string) => {
    setSearchQuery(query);
    setSearchProvince(province || 'all');
    if (categoryOrMunicipality) {
      setSearchMunicipality(categoryOrMunicipality);
    }
    setCurrentView('search');
  };

  const handleOpenUnitProfile = (unit: HealthUnit) => {
    setSelectedUnitForProfile(unit);
  };

  const handleOpenLogin = () => {
    setAuthInitialMode('login');
    setAuthInitialRole('paciente');
    setCurrentView('login');
  };

  const handleOpenRegisterUnit = () => {
    setAuthInitialMode('register');
    setAuthInitialRole('unidade');
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1e293b] flex flex-col font-sans selection:bg-[#00A878] selection:text-white">
      {/* Global Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view as MainView)}
        onOpenSearch={() => setCurrentView('search')}
        onOpenPrescriptionAI={() => setIsPrescriptionModalOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAuth={handleOpenLogin}
        onOpenRegisterUnit={handleOpenRegisterUnit}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'home' && (
          <div>
            <HeroSection
              onSearch={handleHeroSearch}
              onOpenPrescriptionAI={() => setIsPrescriptionModalOpen(true)}
              onSelectUnit={handleOpenUnitProfile}
              onViewPlans={() => setCurrentView('plans')}
            />
          </div>
        )}

        {currentView === 'search' && (
          <SearchAndResultsView
            initialQuery={searchQuery}
            initialProvince={searchProvince}
            initialMunicipality={searchMunicipality}
            onSelectUnit={handleOpenUnitProfile}
            onOpenPrescriptionAI={() => setIsPrescriptionModalOpen(true)}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {currentView === 'plans' && (
          <PlansAndPricingView
            onPlanSelected={(planId) => {
              if (!currentUser) {
                setAuthInitialMode('register');
                setAuthInitialRole('unidade');
                setCurrentView('login');
              }
            }}
          />
        )}

        {currentView === 'unit-dashboard' && (
          <UnitDashboard
            onNavigatePlans={() => setCurrentView('plans')}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}

        {(currentView === 'admin' || currentView === 'admin-dashboard') && (
          <AdminSuperAdminDashboard />
        )}

        {currentView === 'institutional' && (
          <MinistryIntelligenceDashboard onBackToHome={() => setCurrentView('home')} />
        )}

        {currentView === 'utente-dashboard' && (
          <UtenteDashboardView
            onNavigateSearch={(q, p) => {
              if (q) setSearchQuery(q);
              if (p) setSearchProvince(p);
              setCurrentView('search');
            }}
            onOpenPrescriptionAI={() => setIsPrescriptionModalOpen(true)}
            onSelectUnit={handleOpenUnitProfile}
            onOpenRouteModal={(unit) => setSelectedUnitForRoute(unit)}
          />
        )}

        {currentView === 'login' && (
          <LoginPage
            onNavigateHome={() => setCurrentView('home')}
            onNavigateRegisterUnit={() => {
              setAuthInitialMode('register');
              setAuthInitialRole('unidade');
              setCurrentView('login');
            }}
            onOpenLegalDoc={handleOpenLegalDoc}
            initialTab={authInitialMode}
            initialRole={authInitialRole}
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer
        onNavigate={(view) => setCurrentView(view as MainView)}
        onOpenPrescriptionAI={() => setIsPrescriptionModalOpen(true)}
        onOpenLegalDoc={handleOpenLegalDoc}
      />

      {/* AI Prescription Modal */}
      <PrescriptionAIModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        onNavigateSearch={(q) => {
          setSearchQuery(q);
          setCurrentView('search');
        }}
      />

      {/* Cart & WhatsApp Checkout Drawer */}
      <CartDrawerModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />

      {/* Unit Profile Modal */}
      <UnitProfileModal
        unit={selectedUnitForProfile}
        onClose={() => setSelectedUnitForProfile(null)}
      />

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authInitialMode}
        initialRole={authInitialRole}
        onOpenLegalDoc={handleOpenLegalDoc}
      />

      {/* Dedicated Legal & Data Protection Compliance Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialDoc={activeLegalDoc}
      />

      {/* Interactive Turn-by-Turn Route / Map Navigation Modal */}
      {selectedUnitForRoute && (
        <UnitRouteMapModal
          unit={selectedUnitForRoute}
          onClose={() => setSelectedUnitForRoute(null)}
          userCoords={
            getSavedUserGpsLocation()
              ? {
                  lat: getSavedUserGpsLocation()!.latitude,
                  lng: getSavedUserGpsLocation()!.longitude,
                }
              : undefined
          }
          originLabel={
            getSavedUserGpsLocation()?.bairro
              ? `Sua Localização (${getSavedUserGpsLocation()!.bairro})`
              : undefined
          }
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <MainAppContent />
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
