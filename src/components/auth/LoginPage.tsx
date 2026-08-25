import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  Cpu,
} from 'lucide-react';

const SEED_DEV_ACCOUNTS = [
  { email: 'admin@mridaos.in', role: 'System Admin', name: 'Jethalal Gada', color: '#175CD3' },
  { email: 'owner@mridaos.in', role: 'Owner / Super Admin', name: 'Champaklal Gada', color: '#079455' },
  { email: 'counter@mridaos.in', role: 'Counter POS Staff', name: 'Natu Kaka', color: '#B54708' },
  { email: 'procurement@mridaos.in', role: 'Procurement Officer', name: 'Bagha Boy', color: '#0E7090' },
  { email: 'inventory@mridaos.in', role: 'Inventory Manager', name: 'Taarak Mehta', color: '#7A5E0B' },
];

export const LoginPage: React.FC = () => {
  const { authError, setAuthError, loginWithJwt } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setLocalError(null);
    setAuthError(null);
    setIsLoading(true);

    try {
      const res = await loginWithJwt(email.trim().toLowerCase(), password);
      if (!res.success) {
        setLocalError(res.error || 'Invalid email or password. Please verify your credentials.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevQuickLogin = async (devEmail: string) => {
    setEmail(devEmail);
    setPassword('Admin@1234');
    setLocalError(null);
    setAuthError(null);
    setIsLoading(true);

    try {
      const res = await loginWithJwt(devEmail, 'Admin@1234');
      if (!res.success) {
        setLocalError(`Login failed: ${res.error}`);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Dev login error');
    } finally {
      setIsLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen w-screen bg-[#F4EDDE] flex items-center justify-center p-3 sm:p-6 select-none">
      {/* Split-screen Card Shell */}
      <div className="w-full max-w-5xl bg-white rounded-3xl sm:rounded-[36px] shadow-2xl border border-[#E0EAE4] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: Agriculture-Themed Hero Brand Visual (#35C56E -> #2E9055)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#35C56E] to-[#2E9055] p-6 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Pattern & Glow */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="absolute -left-16 -top-16 w-56 h-56 rounded-full bg-[#F9AD19]/15 blur-2xl pointer-events-none"></div>

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-[#35C56E] shadow-md">
                {/* Seedling / Leaf SVG */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none text-white flex items-center gap-1.5">
                  Mrida<span className="text-[#F4EDDE]">OS</span>
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                    Enterprise
                  </span>
                </h1>
                <p className="text-xs text-white/80 font-medium mt-0.5">Agri-Retail Operating System</p>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 space-y-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
                Intelligent Agri-Retail, Nursery & Khata Management.
              </h2>
              <p className="text-xs sm:text-sm text-white/85 leading-relaxed">
                Unified operational command center for fertilizers, seeds, pesticides, and greenhouse nursery IoT.
              </p>
            </div>
          </div>

          {/* Center Agriculture Motifs SVG Graphic */}
          <div className="my-6 relative z-10 py-4 border-y border-white/20 grid grid-cols-3 gap-2 text-center text-white/90">
            <div className="flex flex-col items-center gap-1 p-2 bg-white/10 rounded-2xl backdrop-blur-xs">
              <svg className="w-5 h-5 text-[#F9AD19]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 22h20" />
                <path d="M7 10v4" />
                <path d="M12 6v8" />
                <path d="M17 14v-2" />
                <path d="M7 18h10" />
              </svg>
              <span className="text-[11px] font-bold">FEFO Batches</span>
            </div>

            <div className="flex flex-col items-center gap-1 p-2 bg-white/10 rounded-2xl backdrop-blur-xs">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
              <span className="text-[11px] font-bold">Khata Ledger</span>
            </div>

            <div className="flex flex-col items-center gap-1 p-2 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Cpu className="w-5 h-5 text-[#F9AD19]" />
              <span className="text-[11px] font-bold">IoT Sensors</span>
            </div>
          </div>

          {/* Bottom Security / Trust Badge */}
          <div className="relative z-10 flex items-center justify-between text-xs text-white/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>Role-Based Access Control</span>
            </div>
            <span className="font-mono text-[10px] text-white/70">v2.4 Production</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Form & Dev Quick Login                                       */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-[#F9FBF9] p-6 sm:p-10 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Form Header */}
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#079455] bg-[#E0EAE4] px-3 py-1 rounded-full inline-block mb-2">
                Operational Staff Portal
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-xs text-[#6E7B74] mt-1">
                Enter your authorized employee email and password to access the retail terminal.
              </p>
            </div>

            {/* Error Notification */}
            {displayError && (
              <div className="mb-4 p-3.5 bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl flex items-start gap-2.5 text-xs text-[#B42318] animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#D92D20]" />
                <div className="flex-1 font-medium">{displayError}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#788880]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. staff@mridaos.in"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#DCE4DF] rounded-2xl text-xs font-semibold text-[#1A1A1A] placeholder-[#98A2B3] focus:border-[#079455] focus:ring-2 focus:ring-[#079455]/20 focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#1A1A1A]">
                    Password
                  </label>
                  <span className="text-[11px] font-bold text-[#B57C1E] hover:underline cursor-pointer" title="Contact your store admin to reset credentials">
                    Managed by Admin
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#788880]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#DCE4DF] rounded-2xl text-xs font-semibold text-[#1A1A1A] placeholder-[#98A2B3] focus:border-[#079455] focus:ring-2 focus:ring-[#079455]/20 focus:outline-none transition-all shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#788880] hover:text-[#1A1A1A]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-[#079455] hover:bg-[#067A46] active:scale-[0.99] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Log In to Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-[11px] text-[#7A8B82]">
                New employee? Accounts must be provisioned by a Store Admin. Self-registration is disabled.
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* DEV DIRECT LOGIN (Vite DEV Mode ONLY - Tree-shaken in production)          */}
          {/* ========================================================================= */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-5 border-t border-[#E5ECE7]">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1A1A]">
                  <Sparkles className="w-3.5 h-3.5 text-[#F9AD19]" />
                  <span>Dev Quick Login (Testing Only)</span>
                </div>
                <span className="text-[10px] font-mono text-[#079455] bg-[#E0EAE4] px-2 py-0.5 rounded-full font-bold">
                  import.meta.env.DEV
                </span>
              </div>
              <p className="text-[10px] text-[#6E7B74] mb-2">
                Click any role to authenticate via real Supabase token with password <code className="font-bold text-[#1A1A1A]">MridaOS@2026</code>:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SEED_DEV_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleDevQuickLogin(acc.email)}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-white hover:bg-[#EFF5F1] border border-[#DCE4DF] hover:border-[#079455] text-left transition-all group flex flex-col justify-between shadow-2xs"
                  >
                    <div className="text-[11px] font-bold text-[#1A1A1A] group-hover:text-[#079455] truncate">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-[#6E7B74] truncate flex items-center justify-between mt-0.5">
                      <span className="font-semibold">{acc.role.split(' ')[0]}</span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-[#E0EAE4] text-[#079455] font-bold">
                        Login →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
