import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  BookOpen,
  Sprout,
  ShieldCheck,
  Search,
  Users,
  Sparkles,
  TrendingUp,
  Truck,
} from 'lucide-react';

interface NotFoundViewProps {
  attemptedRoute?: string;
  onNavigateHome?: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ attemptedRoute, onNavigateHome }) => {
  const { setActiveView, setActiveModal, activeView, userProfile } = useApp();

  const handleGoHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      setActiveView('command_center');
    }
  };

  const displayRoute = attemptedRoute || window.location.pathname || activeView || '/unknown';

  const quickLinks = [
    {
      id: 'command_center',
      label: 'Command Center',
      desc: 'Central dashboard, live KPIs & operational alerts',
      icon: LayoutDashboard,
      color: 'text-[#079455]',
      bg: 'bg-[#079455]/10',
      border: 'hover:border-[#079455]/50',
    },
    {
      id: 'sales_pos',
      label: 'Counter POS & Billing',
      desc: 'Generate GST bills with FEFO batch mapping',
      icon: ShoppingBag,
      color: 'text-[#0284C7]',
      bg: 'bg-[#0284C7]/10',
      border: 'hover:border-[#0284C7]/50',
    },
    {
      id: 'inventory_fefo',
      label: 'FEFO Inventory & Batches',
      desc: 'Expiry radar, reorder levels & batch control',
      icon: Boxes,
      color: 'text-[#F79009]',
      bg: 'bg-[#F79009]/10',
      border: 'hover:border-[#F79009]/50',
    },
    {
      id: 'khata_ledger',
      label: 'Farmer Khata Ledger',
      desc: 'Customer credit limits, aging & repayments',
      icon: BookOpen,
      color: 'text-[#7A5AF8]',
      bg: 'bg-[#7A5AF8]/10',
      border: 'hover:border-[#7A5AF8]/50',
    },
    {
      id: 'procurement',
      label: 'Procurement & POs',
      desc: 'Purchase orders, supplier rates & GRN inward',
      icon: Truck,
      color: 'text-[#067A46]',
      bg: 'bg-[#067A46]/10',
      border: 'hover:border-[#067A46]/50',
    },
    {
      id: 'nursery_care',
      label: 'Greenhouse & Polyhouse',
      desc: 'IoT telemetry, care schedule & CCTV monitoring',
      icon: Sprout,
      color: 'text-[#12B76A]',
      bg: 'bg-[#12B76A]/10',
      border: 'hover:border-[#12B76A]/50',
    },
  ];

  return (
    <div className="min-h-screen w-screen bg-[#F4EDDE] text-[#1A1A1A] flex flex-col justify-between selection:bg-[#079455]/20 selection:text-[#079455] font-sans antialiased overflow-y-auto">
      {/* Standalone Minimalist Top Bar */}
      <header className="w-full bg-[#1A1A1A] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-[#333] shadow-md shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleGoHome}>
          <div className="w-9 h-9 rounded-xl bg-[#079455] text-white flex items-center justify-center shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
            </svg>
          </div>
          <div>
            <div className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>MridaOS</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#333] text-[#35C56E] font-bold uppercase tracking-wider">Enterprise</span>
            </div>
            <p className="text-[10px] text-[#A0AFA6] leading-none">Agri-Retail Operating System</p>
          </div>
        </div>

        <button
          onClick={handleGoHome}
          className="px-3.5 py-1.5 bg-[#333] hover:bg-[#444] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#35C56E]" />
          <span>Back to Command Center</span>
        </button>
      </header>

      {/* Main 404 Hero Body */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-3xl bg-white border border-[#E2EAE5] rounded-3xl p-6 sm:p-10 card-shadow flex flex-col items-center text-center relative overflow-hidden my-auto">
          {/* Decorative background blurs */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#079455]/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-[#F9AD19]/8 rounded-full blur-3xl pointer-events-none" />

          {/* 404 Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3F2] border border-[#FECDCA] text-[#D92D20] text-xs font-black tracking-wide uppercase shadow-2xs mb-6">
            <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Error 404 • Uncharted Sector</span>
          </div>

          {/* Sprout Illustration */}
          <div className="relative mb-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-br from-[#F4EDDE] to-[#E5EFE8] flex items-center justify-center border-2 border-dashed border-[#CCD8D1] shadow-inner">
              <div className="relative flex flex-col items-center">
                <Sprout className="w-12 h-12 sm:w-16 sm:h-16 text-[#079455] transform -rotate-12 animate-pulse" />
                <div className="absolute -bottom-2 w-10 h-2 bg-[#6E7B74]/20 rounded-full blur-xs" />
              </div>
            </div>
            <div className="absolute -top-2 -right-2 px-2.5 py-1 bg-[#1A1A1A] text-[#F9AD19] text-xs font-black rounded-xl shadow-md border border-[#333]">
              404
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight mb-2">
            This Field Has Not Been Sown
          </h1>

          {/* Subtitle description */}
          <p className="text-sm sm:text-base text-[#6E7B74] max-w-lg mb-8 leading-relaxed">
            The requested route <span className="font-mono font-bold text-[#D92D20] bg-[#FEF3F2] border border-[#FECDCA] px-2 py-0.5 rounded text-xs">{displayRoute}</span> does not exist in the MridaOS agricultural registry.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto mb-10">
            <button
              onClick={handleGoHome}
              className="w-full sm:w-auto px-6 py-3 bg-[#079455] hover:bg-[#067A46] active:scale-98 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Return to Command Center</span>
            </button>

            <button
              onClick={() => {
                setActiveView('sales_pos');
                setActiveModal('new_sale');
              }}
              className="w-full sm:w-auto px-5 py-3 bg-[#1A1A1A] hover:bg-black active:scale-98 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-2xs transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-[#35C56E]" />
              <span>New Counter Bill</span>
            </button>
          </div>

          {/* Cultivated Modules & Shortcuts */}
          <div className="w-full border-t border-[#E2EAE5] pt-8 text-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6E7B74] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#079455]" />
                <span>Cultivated Modules & Valid Destinations</span>
              </h3>
              <span className="text-[11px] text-[#6E7B74] font-medium hidden sm:inline">Click to jump directly</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.id}
                    onClick={() => setActiveView(link.id as any)}
                    className={`p-3.5 rounded-2xl border border-[#E2EAE5] bg-[#FDFEFE] ${link.border} text-left transition-all hover:shadow-xs group flex items-start gap-3`}
                  >
                    <div className={`p-2.5 rounded-xl ${link.bg} ${link.color} shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1A1A1A] group-hover:text-[#079455] transition-colors truncate">
                        {link.label}
                      </div>
                      <div className="text-[11px] text-[#6E7B74] line-clamp-1 leading-snug mt-0.5">
                        {link.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-[#6E7B74] border-t border-[#E2EAE5] bg-white/50 shrink-0">
        MridaOS Enterprise v2.4 • Agri-Retail Operating System • Nashik Hub
      </footer>
    </div>
  );
};
