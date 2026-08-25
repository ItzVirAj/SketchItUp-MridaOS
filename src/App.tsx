/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MetricCards } from './components/MetricCards';
import { ActionRequired } from './components/ActionRequired';
import { NurseryCameraAndSensors } from './components/NurseryCameraAndSensors';
import { SalesAnalytics } from './components/SalesAnalytics';
import { InventoryIntelligence } from './components/InventoryIntelligence';
import { KhataLedger } from './components/KhataLedger';
import { ProcurementSection } from './components/ProcurementSection';
import { SeasonalIntelligence } from './components/SeasonalIntelligence';
import { ComplianceAndActivity } from './components/ComplianceAndActivity';
import { DedicatedViews } from './components/views/DedicatedViews';
import { NotFoundView } from './components/views/NotFoundView';
import { LoginPage } from './components/auth/LoginPage';
import { useLenis } from './hooks/useLenis';
import { SearchPalette } from './components/SearchPalette';

// Interactive Modals
import { NewSaleModal } from './components/modals/NewSaleModal';
import { CreatePOModal } from './components/modals/CreatePOModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { PlantCareModal } from './components/modals/PlantCareModal';
import { StockAdjustModal } from './components/modals/StockAdjustModal';
import { AlertsModal } from './components/modals/AlertsModal';
import { LiveCameraModal } from './components/modals/LiveCameraModal';
import { AddUserModal } from './components/modals/AddUserModal';
import { EditUserModal } from './components/modals/EditUserModal';
import { RemoveUserModal } from './components/modals/RemoveUserModal';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    isLoadingAuth,
    activeView,
    activeModal,
    isSearchOpen,
    setIsSearchOpen,
  } = useApp();
  const { containerRef, contentRef } = useLenis(activeView);

  // Global Spotlight Search Shortcut (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F4EDDE] text-[#1A1A1A]">
        <div className="w-14 h-14 rounded-2xl bg-[#1A1A1A] text-[#35C56E] flex items-center justify-center shadow-lg mb-4 animate-bounce">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>
        <h2 className="text-xl font-black tracking-tight text-[#1A1A1A]">MridaOS Enterprise</h2>
        <p className="text-xs text-[#6E7B74] mt-1 font-medium">Connecting to Supabase Auth & Secure Database...</p>
        <div className="mt-4 w-32 h-1 bg-[#E0EAE4] rounded-full overflow-hidden">
          <div className="w-full h-full bg-[#079455] origin-left animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  if (activeView === '404') {
    return <NotFoundView attemptedRoute={window.location.pathname} />;
  }

  const isCommandCenter = activeView === 'command_center' || activeView === 'dashboard' || !activeView;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F8F6] text-[#1A1A1A] font-sans antialiased selection:bg-[#079455]/20 selection:text-[#079455]">
      {/* Top Header Bar */}
      <TopBar />

      {/* App Body (Sidebar on left, Main Content on right) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Scrollable Dashboard Viewport with Lenis Smooth Scrolling */}
        <main
          ref={containerRef}
          className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 sm:py-5 custom-scrollbar"
        >
          <div ref={contentRef} className="max-w-[1600px] mx-auto flex flex-col gap-4 sm:gap-5 pb-12">
            {isCommandCenter ? (
              <>
                {/* 1. Top KPI Row (Weather, Today's Sales, Khata Risk, Buffer Stock, Procurement, Nursery Vigor) */}
                <MetricCards />

                {/* 2. Visual CCTV Camera Feeds, Device Sensors & Daily Care Tasks */}
                <NurseryCameraAndSensors />

                {/* 3. Action Required Bar (Immediate Operational Decisions) */}
                <ActionRequired />

                {/* 4. Sales Velocity Trends, Anomaly Radar & Operating Margins */}
                <SalesAnalytics />

                {/* 5. Inventory Intelligence & FEFO Expiry Radar */}
                <InventoryIntelligence />

                {/* 6. Khata Credit Health & Farmer Ledger */}
                <KhataLedger />

                {/* 7. Procurement & Inbound Supplier POs */}
                <ProcurementSection />

                {/* 8. Seasonal Agricultural Sowing Forecast */}
                <SeasonalIntelligence />

                {/* 9. Statutory FCO Compliance & Immutable Audit Trail */}
                <ComplianceAndActivity />
              </>
            ) : (
              <DedicatedViews />
            )}
          </div>
        </main>
      </div>

      {/* Global Spotlight Search Palette (Cmd+K / Ctrl+K) */}
      <SearchPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Active Modal Portals */}
      {activeModal === 'new_sale' && <NewSaleModal />}
      {activeModal === 'create_po' && <CreatePOModal />}
      {activeModal === 'record_khata' && <RecordPaymentModal />}
      {activeModal === 'plant_care' && <PlantCareModal />}
      {activeModal === 'stock_adjust' && <StockAdjustModal />}
      {activeModal === 'quick_view_alerts' && <AlertsModal />}
      {activeModal === 'live_camera' && <LiveCameraModal />}
      {activeModal === 'add_user' && <AddUserModal />}
      {activeModal === 'edit_user' && <EditUserModal />}
      {activeModal === 'remove_user' && <RemoveUserModal />}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
