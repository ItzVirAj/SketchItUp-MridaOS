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

// Interactive Modals
import { NewSaleModal } from './components/modals/NewSaleModal';
import { CreatePOModal } from './components/modals/CreatePOModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { PlantCareModal } from './components/modals/PlantCareModal';
import { StockAdjustModal } from './components/modals/StockAdjustModal';
import { AlertsModal } from './components/modals/AlertsModal';
import { LiveCameraModal } from './components/modals/LiveCameraModal';

const DashboardContent: React.FC = () => {
  const { activeView, activeModal } = useApp();

  const isCommandCenter = activeView === 'command_center' || activeView === 'dashboard' || !activeView;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F8F6] text-[#1A1A1A] font-sans antialiased selection:bg-[#079455]/20 selection:text-[#079455]">
      {/* Top Header Bar (Full width top bar matching reference) */}
      <TopBar />

      {/* App Body (Sidebar on left, Main Content on right) */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Scrollable Dashboard Viewport */}
        <main className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-4 sm:py-5 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-4 sm:gap-5 pb-12">
            {isCommandCenter ? (
              <>
                {/* 1. Top KPI Row (Weather, Today's Sales, Khata Risk, Buffer Stock, Procurement, Nursery Vigor) */}
                <MetricCards />

                {/* 2. Visual CCTV Camera Feeds, Device Sensors & Daily Care Tasks (matching Reference Image 1 & 5) */}
                <NurseryCameraAndSensors />

                {/* 3. Action Required Bar (Immediate Operational Decisions) */}
                <ActionRequired />

                {/* 4. Sales Velocity Trends, Anomaly Radar & Operating Margins (matching Reference Image 4 & 5) */}
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

      {/* Active Modal Portals */}
      {activeModal === 'new_sale' && <NewSaleModal />}
      {activeModal === 'create_po' && <CreatePOModal />}
      {activeModal === 'record_khata' && <RecordPaymentModal />}
      {activeModal === 'plant_care' && <PlantCareModal />}
      {activeModal === 'stock_adjust' && <StockAdjustModal />}
      {activeModal === 'quick_view_alerts' && <AlertsModal />}
      {activeModal === 'live_camera' && <LiveCameraModal />}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}
