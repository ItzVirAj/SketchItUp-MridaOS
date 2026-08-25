import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Search,
  ChevronDown,
  Calendar,
  Layers,
  Store,
  Flower2,
  ArrowUpRight,
  Database,
  RefreshCw,
} from 'lucide-react';
import { BusinessType } from '../types';

export const TopBar: React.FC = () => {
  const {
    currentBranch,
    setCurrentBranch,
    branches,
    businessType,
    setBusinessType,
    alerts,
    setActiveModal,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    isSupabaseConnected,
    isLoading,
    refreshData,
  } = useApp();

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const businessTypes: { type: BusinessType; label: string; icon: any }[] = [
    { type: 'hybrid', label: 'Hybrid Agro-Retail', icon: Layers },
    { type: 'fertilizer', label: 'Fertilizer & Agri-Inputs', icon: Store },
    { type: 'nursery', label: 'Plant Nursery & Care', icon: Flower2 },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <header
      id="mridaos-topbar"
      className="sticky top-0 z-40 w-full px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-[#E5ECE7] transition-all select-none overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 w-full py-0.5">
        
        {/* 1. Far Left: sketchItUP Brand Logo */}
        <div className="flex items-center flex-shrink-0 mr-1 sm:mr-2">
          <div className="flex items-center text-[19px] sm:text-[21px] font-black tracking-tight leading-none text-[#1A1A1A]">
            <span>sketch<span className="text-[#079455]">ItUP</span></span>
          </div>
        </div>

        {/* 2. Search SKU / Batch / Farmer Pill */}
        <div className="relative flex-1 min-w-[140px] max-w-xs sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A8B82]" />
          <input
            id="topbar-search-input"
            type="text"
            placeholder="Search SKU, Batch, Farmer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 bg-[#F6F8F6] focus:bg-white rounded-full border border-[#E0EAE4] text-xs font-medium text-[#1A1A1A] placeholder-[#8C9C93] focus:outline-none focus:ring-2 focus:ring-[#079455]/30 focus:border-[#079455] transition-all shadow-2xs"
          />
        </div>

        {/* 3. Business Mode Segmented Pill Tabs */}
        <div className="hidden lg:flex items-center bg-[#F2F6F3] p-1 rounded-full border border-[#E0EAE4] shadow-2xs gap-0.5 flex-shrink-0">
          {businessTypes.map(({ type, label, icon: Icon }) => {
            const isActive = businessType === type;
            return (
              <button
                key={type}
                id={`business-mode-${type}`}
                onClick={() => setBusinessType(type)}
                className={`flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#1A1A1A] text-white shadow-2xs'
                    : 'text-[#64746B] hover:text-[#1A1A1A] hover:bg-[#E8EFEA]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Group: Supabase Status, Alerts, Date, Branch */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Supabase Connection Status Badge */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
              isSupabaseConnected
                ? 'bg-[#E0EAE4] text-[#079455] border-[#B7D5C4]'
                : 'bg-[#FEE4E2] text-[#D92D20] border-[#FECDCA]'
            }`}
            title={isSupabaseConnected ? 'Connected to Supabase PostgreSQL Storage' : 'Supabase credentials missing or disconnected'}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSupabaseConnected ? 'Supabase Live' : 'Offline Storage'}</span>
            <button
              onClick={handleRefresh}
              className={`ml-1 hover:opacity-75 ${isRefreshing || isLoading ? 'animate-spin' : ''}`}
              title="Refresh Realtime Data"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* 4. Alerts Button */}
          <button
            id="topbar-alerts-pill"
            onClick={() => setActiveModal('quick_view_alerts')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white rounded-full text-xs font-bold hover:bg-black transition-all shadow-sm group whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5 text-[#F9AD19] fill-[#F9AD19]" />
            <span>{alerts.length} Alerts</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          {/* 5. Date Selector Pill */}
          <div className="relative">
            <button
              id="date-filter-button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#E0EAE4] rounded-full text-xs font-semibold text-[#1A1A1A] hover:bg-[#F8FAF9] transition-all shadow-2xs whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-[#079455]" />
              <span>
                {dateRange === 'today'
                  ? 'Today (Live)'
                  : dateRange === '7d'
                  ? 'Last 7 Days'
                  : dateRange === '30d'
                  ? 'Last 30 Days'
                  : 'Current Season'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#7A8B82]" />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#E0EAE4] py-1.5 z-50">
                {(['today', '7d', '30d', 'season'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setDateRange(r);
                      setIsDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-xs font-medium capitalize hover:bg-[#F2F7F4] flex items-center justify-between ${
                      dateRange === r ? 'text-[#079455] font-bold bg-[#EFF6F2]' : 'text-[#333]'
                    }`}
                  >
                    <span>
                      {r === 'today'
                        ? 'Today (Live)'
                        : r === '7d'
                        ? 'Past 7 Days'
                        : r === '30d'
                        ? 'Past 30 Days'
                        : 'Active Crop Season'}
                    </span>
                    {dateRange === r && <span className="w-1.5 h-1.5 rounded-full bg-[#079455]"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 6. Branch Selector Dropdown */}
          <div className="relative">
            <button
              id="branch-selector-button"
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#E0EAE4] rounded-full text-xs font-semibold text-[#1A1A1A] hover:bg-[#F8FAF9] transition-all shadow-2xs whitespace-nowrap"
            >
              <span className="text-[#7A8B82] font-normal">Branch:</span>
              <span className="font-semibold">{currentBranch ? currentBranch.name.split(' (')[0] : 'All Branches'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A8B82]" />
            </button>

            {isBranchDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#E0EAE4] py-2 z-50">
                <div className="px-3 py-1.5 border-b border-[#F0F5F2] text-[10px] uppercase font-bold text-[#8C9C93] tracking-wider">
                  Select Operating Branch
                </div>
                {branches.length === 0 ? (
                  <div className="px-3.5 py-2 text-xs text-[#7A8B82]">No branches in database.</div>
                ) : (
                  branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setCurrentBranch(b);
                        setIsBranchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-[#F2F7F4] flex flex-col transition-colors ${
                        currentBranch?.id === b.id ? 'bg-[#EFF6F2]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${currentBranch?.id === b.id ? 'text-[#079455]' : 'text-[#1A1A1A]'}`}>
                          {b.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E0EAE4] text-[#079455] font-semibold capitalize">
                          {b.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#7A8B82] truncate">{b.location}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
