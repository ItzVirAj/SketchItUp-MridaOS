import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingBag,
  Boxes,
  Truck,
  BookOpen,
  Sprout,
  ShieldCheck,
  Sparkles,
  Plus,
  ArrowUpRight,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  IndianRupee,
  Phone,
  Send,
  Download,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { SalesAnalytics } from '../SalesAnalytics';
import { InventoryIntelligence } from '../InventoryIntelligence';
import { KhataLedger } from '../KhataLedger';
import { ProcurementSection } from '../ProcurementSection';
import { NurseryCameraAndSensors } from '../NurseryCameraAndSensors';
import { SeasonalIntelligence } from '../SeasonalIntelligence';
import { ComplianceAndActivity } from '../ComplianceAndActivity';

export const DedicatedViews: React.FC = () => {
  const { activeView, setActiveModal, inventory, khataLedger, purchaseOrders, licenses, careTasks } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  if (activeView === 'sales_pos') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Counter POS & Invoice Stream</h2>
            <p className="text-xs text-[#6E7B74]">Generate instant GST bills with FEFO batch mapping and customer Khata</p>
          </div>
          <button
            onClick={() => setActiveModal('new_sale')}
            className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Counter Sale / Bill</span>
          </button>
        </div>
        <SalesAnalytics />
      </div>
    );
  }

  if (activeView === 'inventory_fefo') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Warehouse & FEFO Batch Radar</h2>
            <p className="text-xs text-[#6E7B74]">Pallet rack locations, batch expiries, reorder buffer algorithms</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal('stock_adjust')}
              className="px-3 py-2 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#079455] text-xs font-bold rounded-2xl flex items-center gap-1.5"
            >
              <span>Stock Adjustment</span>
            </button>
            <button
              onClick={() => setActiveModal('create_po')}
              className="px-4 py-2 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create PO</span>
            </button>
          </div>
        </div>
        <InventoryIntelligence />
      </div>
    );
  }

  if (activeView === 'khata_ledger') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Khata Ledger & Farmer Accounts</h2>
            <p className="text-xs text-[#6E7B74]">Farmer credit ageing, recovery WhatsApp alerts, and payment receipts</p>
          </div>
          <button
            onClick={() => setActiveModal('record_khata')}
            className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto"
          >
            <IndianRupee className="w-4 h-4" />
            <span>Record Farmer Payment</span>
          </button>
        </div>
        <KhataLedger />
      </div>
    );
  }

  if (activeView === 'procurement') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Procurement & Supplier GRN</h2>
            <p className="text-xs text-[#6E7B74]">Distributor rate contracts, inbound truck consignments & GRN verification</p>
          </div>
          <button
            onClick={() => setActiveModal('create_po')}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Supplier PO</span>
          </button>
        </div>
        <ProcurementSection />
      </div>
    );
  }

  if (activeView === 'nursery_care') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Greenhouse, Nursery & Polyhouse Control</h2>
            <p className="text-xs text-[#6E7B74]">IoT microclimate telemetry, scheduled crop tasks and live visual monitoring</p>
          </div>
          <button
            onClick={() => setActiveModal('plant_care')}
            className="px-4 py-2 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-2xl flex items-center gap-2 shadow-2xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Care Schedule</span>
          </button>
        </div>
        <NurseryCameraAndSensors />
      </div>
    );
  }

  if (activeView === 'compliance') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Statutory Licenses & FCO Regulatory Center</h2>
            <p className="text-xs text-[#6E7B74]">Fertilizer control order registers, insecticide licenses, audit compliance</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#E0EAE4] text-[#079455] font-bold text-xs rounded-full">
              Audit Status: 100% Compliant
            </span>
          </div>
        </div>
        <ComplianceAndActivity />
      </div>
    );
  }

  if (activeView === 'intelligence') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-[#E2EAE5] card-shadow">
          <div>
            <h2 className="text-lg font-bold text-[#1A1A1A]">Seasonal Demand & Margin Intelligence</h2>
            <p className="text-xs text-[#6E7B74]">Kharif/Rabi sowing predictive models, agroclimatic advisories & profit matrix</p>
          </div>
        </div>
        <SeasonalIntelligence />
      </div>
    );
  }

  return null;
};
