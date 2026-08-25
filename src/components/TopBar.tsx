import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  ArrowUpRight,
  Database,
  RefreshCw,
  LogOut,
  User,
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
    signOut,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const initials = userProfile?.fullName
    ? userProfile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'MO';

  return (
    <header
      id="mridaos-topbar"
      className="sticky top-0 z-40 w-full px-4 sm:px-6 py-2.5 bg-white/95 backdrop-blur-md border-b border-[#E5ECE7] transition-all select-none overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 w-full py-0.5">
        
        {/* 1. Far Left: sketchItUP Brand Logo & System Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center text-[19px] sm:text-[21px] font-black tracking-tight leading-none text-[#1A1A1A]">
            <span>sketch<span className="text-[#079455]">ItUP</span></span>
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-[#8C9C93] border-l border-[#DDE5E0] pl-2.5 ml-1">
            MridaOS Retail Terminal
          </span>
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

        {/* 3. Right Group: Supabase Status, Alerts, User Profile & Sign Out */}
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

          {/* Global Spotlight Search Trigger Pill */}
          <button
            id="topbar-global-search"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#F4EDDE] hover:bg-[#E0EAE4] text-[#1A1A1A] border border-[#CCD8D1] rounded-full text-xs font-bold transition-all shadow-2xs group cursor-pointer"
            title="Global Search (Ctrl+K / ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-[#079455]" />
            <span className="hidden md:inline">Quick Search</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[10px] font-mono font-bold bg-white text-[#6E7B74] border border-[#CCD8D1] rounded shadow-2xs">
              ⌘K
            </kbd>
          </button>

          {/* Alerts Button */}
          <button
            id="topbar-alerts-pill"
            onClick={() => setActiveModal('quick_view_alerts')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A1A1A] text-white rounded-full text-xs font-bold hover:bg-black transition-all shadow-sm group whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5 text-[#F9AD19] fill-[#F9AD19]" />
            <span>{alerts.length} Alerts</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          {/* User Profile Pill & Sign Out */}
          <div className="flex items-center gap-1.5 pl-1">
            <div className="flex items-center gap-2 bg-[#F9FBFA] border border-[#E0EAE4] py-1 px-2.5 rounded-full shadow-2xs">
              <div className="w-6 h-6 rounded-full bg-[#079455] text-white font-bold text-[10px] flex items-center justify-center">
                {initials}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-[#1A1A1A] leading-none">
                  {userProfile?.fullName || 'User'}
                </span>
                <span className="text-[9px] text-[#7A8B82] capitalize font-medium">
                  {userProfile?.role?.replace('_', ' ') || 'Staff'}
                </span>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-full hover:bg-[#FEE4E2] text-[#788880] hover:text-[#D92D20] transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
