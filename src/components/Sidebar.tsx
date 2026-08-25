import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  Receipt,
  Boxes,
  BookOpen,
  Truck,
  Sprout,
  ShieldCheck,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Database,
  RefreshCw,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    isSidebarExpanded,
    setIsSidebarExpanded,
    alerts,
    isSupabaseConnected,
    refreshData,
    seasonalInsight,
  } = useApp();

  const criticalAlertCount = alerts.filter((a) => a.severity === 'critical').length;

  const navItems = [
    { id: 'command_center', label: 'Command Center', icon: LayoutDashboard, badge: criticalAlertCount > 0 ? `${criticalAlertCount}` : undefined },
    { id: 'sales_pos', label: 'Sales & Invoices', icon: Receipt },
    { id: 'inventory_fefo', label: 'Inventory & FEFO', icon: Boxes },
    { id: 'khata_ledger', label: 'Khata / Credit', icon: BookOpen },
    { id: 'procurement', label: 'Procurement & POs', icon: Truck },
    { id: 'nursery_care', label: 'Nursery Operations', icon: Sprout },
    { id: 'compliance', label: 'Compliance & Licenses', icon: ShieldCheck },
    { id: 'intelligence', label: 'Seasonal & Analytics', icon: TrendingUp },
  ];

  return (
    <aside
      id="mridaos-sidebar"
      className={`relative flex-shrink-0 h-full flex flex-col justify-between transition-all duration-300 ease-in-out p-3 sm:p-3.5 select-none ${
        isSidebarExpanded ? 'w-72 sm:w-80' : 'w-22 sm:w-24'
      }`}
    >
      {/* Outer Floating Pill Sidebar Shell */}
      <div className="h-full w-full bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EAE5] shadow-sm flex flex-col justify-between items-center p-3.5 sm:p-4 overflow-hidden">
        
        {/* Top Logo */}
        <div className="flex flex-col items-center w-full">
          <button
            id="sidebar-logo-button"
            onClick={() => setActiveView('command_center')}
            className={`flex items-center ${isSidebarExpanded ? 'justify-start gap-3 px-2 py-2' : 'justify-center p-2'} w-full rounded-2xl transition-all duration-200 hover:bg-[#F2F7F4] group`}
            title="MridaOS by SketchItUp"
          >
            {/* Dark Square Icon with Leaf Logo */}
            <div className="w-10 h-10 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-[#079455] shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>

            {isSidebarExpanded && (
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-extrabold text-base tracking-tight text-[#1A1A1A] leading-tight flex items-center gap-1.5">
                  Mrida<span className="text-[#079455]">OS</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#E0EAE4] text-[#079455]">
                    Live
                  </span>
                </span>
                <span className="text-[11px] text-[#788880] truncate font-medium">Agri-Retail Operating System</span>
              </div>
            )}
          </button>

          {/* Navigation Pill Items */}
          <nav className="mt-4 flex flex-col gap-2 w-full items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActiveView(item.id)}
                  className={`group relative flex items-center ${
                    isSidebarExpanded ? 'justify-start gap-3 px-3.5 py-2.5' : 'justify-center p-3'
                  } w-full rounded-2xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#1A1A1A] text-white shadow-md'
                      : 'text-[#66726B] hover:bg-[#EFF5F1] hover:text-[#1A1A1A]'
                  }`}
                  title={!isSidebarExpanded ? item.label : undefined}
                >
                  <div className={`flex items-center justify-center w-6 h-6 flex-shrink-0 ${!isSidebarExpanded ? 'mx-auto' : ''}`}>
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#5E6D65]'}`} />
                  </div>
                  
                  {isSidebarExpanded && (
                    <span className="text-[13px] font-semibold tracking-tight truncate flex-1 text-left">
                      {item.label}
                    </span>
                  )}

                  {isSidebarExpanded && item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        isActive
                          ? 'bg-[#F9AD19] text-[#1A1A1A]'
                          : 'bg-[#FEE4E2] text-[#D92D20]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {!isSidebarExpanded && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#1A1A1A] text-white text-xs font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 z-50 whitespace-nowrap">
                      {item.label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Supabase Connection Status & User Profile */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#EAEFEA] w-full items-center">
          
          {/* Supabase Storage Indicator */}
          {isSidebarExpanded ? (
            <div className="w-full p-2.5 bg-[#F6F8F6] rounded-2xl border border-[#E0EAE4] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Database className={`w-4 h-4 flex-shrink-0 ${isSupabaseConnected ? 'text-[#079455]' : 'text-[#D92D20]'}`} />
                <div className="truncate text-[11px]">
                  <strong className="block text-[#1A1A1A] font-bold">{isSupabaseConnected ? 'Supabase Storage' : 'Offline Backend'}</strong>
                  <span className="text-[#7A8B82]">{isSupabaseConnected ? 'Realtime Connected' : 'Check .env.local'}</span>
                </div>
              </div>
              <button
                onClick={() => refreshData()}
                className="p-1.5 rounded-xl hover:bg-[#E0EAE4] text-[#079455] transition-colors"
                title="Sync from Database"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : null}

          {/* Quick AI Advisor badge */}
          {isSidebarExpanded && (
            <div className="p-2.5 bg-[#F4EDDE] rounded-2xl border border-[#E8DCC2]/60 flex items-center gap-2 w-full">
              <Sparkles className="w-4 h-4 text-[#B57C1E] flex-shrink-0" />
              <div className="text-[11px] leading-tight text-[#6E4F18]">
                <strong className="font-semibold block text-[#47300B]">{seasonalInsight ? seasonalInsight.seasonName.split(' & ')[0] : 'Seasonal Advisor'}</strong>
                {seasonalInsight ? seasonalInsight.currentPhase : 'Synchronized with Live Data'}
              </div>
            </div>
          )}

          {/* User & Settings Row */}
          <div className={`flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'} gap-2 p-1 w-full`}>
            <div className={`flex items-center ${isSidebarExpanded ? 'gap-2' : 'justify-center'} overflow-hidden`}>
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-2xl bg-[#E0EAE4] border border-[#C5D7CC] flex items-center justify-center font-bold text-xs text-[#079455]">
                  SD
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#079455] border-2 border-white rounded-full"></span>
              </div>
              {isSidebarExpanded && (
                <div className="flex flex-col text-left overflow-hidden">
                  <span className="text-xs font-bold text-[#1A1A1A] truncate">Santosh Deshmukh</span>
                  <span className="text-[10px] text-[#6E7B74] truncate">Owner / Super Admin</span>
                </div>
              )}
            </div>

            <button
              id="toggle-sidebar-button"
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors flex-shrink-0"
              title={isSidebarExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              {isSidebarExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
