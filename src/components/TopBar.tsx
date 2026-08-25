import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  ArrowUpRight,
  Database,
  RefreshCw,
  Search,
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const {
    branches,
    alerts,
    setActiveModal,
    isSearchOpen,
    setIsSearchOpen,
    isSupabaseConnected,
    refreshData,
    userProfile,
    currentUser,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const displayName = userProfile?.fullName || currentUser?.user_metadata?.full_name || 'System Administrator';
  const displayRole = userProfile?.role || currentUser?.user_metadata?.role || 'admin';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SA';

  return (
    <header
      id="mridaos-topbar"
      className="sticky top-0 z-40 w-full px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-[#E5ECE7] transition-all select-none overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 w-full py-0.5">
        
        {/* 1. Far Left: sketchItUP Brand Logo & Integrated Search Bar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center text-[19px] sm:text-[21px] font-black tracking-tight leading-none text-[#1A1A1A]">
            <span>sketch<span className="text-[#079455]">ItUP</span></span>
          </div>
          
          {/* Integrated Global Search Bar */}
          <div
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#F6F8F6] hover:bg-[#E0EAE4]/60 border border-[#CCD8D1] focus-within:border-[#079455] rounded-xl w-52 md:w-72 lg:w-80 transition-all cursor-pointer shadow-2xs group"
            title="Global Realtime Search (Ctrl+K / ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-[#079455] shrink-0" />
            <input
              type="text"
              readOnly
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search items, batches, customers, POs..."
              className="bg-transparent text-xs font-medium text-[#1A1A1A] placeholder:text-[#8E9B94] w-full focus:outline-none cursor-pointer"
            />
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white text-[#6E7B74] border border-[#CCD8D1] rounded shadow-2xs shrink-0 group-hover:border-[#079455]/40 transition-colors">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* 2. Center: Operating Branch Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#F9FBFA] border border-[#E0EAE4] rounded-full text-xs text-[#54645B]">
          <span className="text-[#7A8B82]">Hub:</span>
          <span className="font-bold text-[#1A1A1A]">
            {branches[0]?.name || 'Nashik Central Agro-Hub'}
          </span>
          <span className="text-[10px] text-[#079455] bg-[#E0EAE4] font-bold px-1.5 py-0.2 rounded-full">
            Live
          </span>
        </div>

        {/* 3. Right Group: Supabase Status, Alerts, Authenticated User & Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          {/* Supabase Connection Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
              isSupabaseConnected
                ? 'bg-[#E0EAE4] text-[#079455] border-[#B7D5C4]'
                : 'bg-[#FEE4E2] text-[#D92D20] border-[#FECDCA]'
            }`}
            title={isSupabaseConnected ? 'Connected to Supabase PostgreSQL Storage' : 'Supabase credentials missing or disconnected'}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSupabaseConnected ? 'Supabase Live' : 'Offline Storage'}</span>
            <button
              onClick={handleRefresh}
              className={`ml-1 hover:opacity-75 ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh Realtime Data"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Alerts Button */}
          <button
            id="topbar-alerts-pill"
            onClick={() => setActiveModal('quick_view_alerts')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white rounded-full text-xs font-bold hover:bg-black transition-all shadow-sm group whitespace-nowrap cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-[#F9AD19] fill-[#F9AD19]" />
            <span>{alerts.length} Alerts</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          {/* Authenticated User Identity Pill */}
          <div
            id="topbar-user-badge"
            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-[#F9FBFA] border border-[#E0EAE4] shadow-2xs"
          >
            <div className="w-6 h-6 rounded-full bg-[#079455] text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
              {initials}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-[#1A1A1A] leading-none truncate max-w-[130px]">
                {displayName}
              </span>
              <span className="text-[9px] text-[#7A8B82] capitalize font-medium">
                {displayRole.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};

