import React, { useState, useEffect } from 'react';
import { authApi } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
} from 'lucide-react';

export const ResetPasswordView: React.FC = () => {
  const { setActiveView } = useApp();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [revokedSessions, setRevokedSessions] = useState<number>(0);

  // Extract token from URL search params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage('Please enter the 15-minute password reset token.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-type your new password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.resetPasswordWithToken(token.trim(), newPassword);
      if (res.data) {
        setIsSuccess(true);
        setRevokedSessions(res.data.revokedSessionsCount || 0);
      } else {
        setErrorMessage(res.error?.message || 'Failed to reset password. The token may be expired or already used.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. The token may be expired or already used.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F4EDDE] flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E0EAE4] p-6 sm:p-8 relative overflow-hidden">
        {/* Subtle Top Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#079455]/10 rounded-full blur-xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#E0EAE4] border border-[#C5D7CC] flex items-center justify-center text-[#079455] mb-3 shadow-xs">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A]">Set New Password</h1>
          <p className="text-xs sm:text-sm text-[#5E6D65] mt-1">
            Single-use cryptographic reset with automatic 15-minute expiry.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-5 text-center animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-[#ECFDF3] border border-[#ABEFC6] rounded-2xl flex flex-col items-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-[#079455]" />
              <p className="text-sm font-bold text-[#067647]">Password Reset Successful!</p>
              <p className="text-xs text-[#067647]/90 leading-relaxed">
                Your password has been securely updated and all previous device sessions ({revokedSessions}) were invalidated.
              </p>
            </div>

            <button
              onClick={() => {
                window.location.href = '/command-center';
              }}
              className="w-full py-3 bg-[#079455] hover:bg-[#067647] text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Back to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-xl flex items-start gap-2.5 text-xs text-[#D92D20] animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Token Input (shown if not pre-populated) */}
            <div>
              <label className="block text-xs font-bold text-[#344054] mb-1.5 flex items-center justify-between">
                <span>Reset Token</span>
                <span className="text-[10px] font-semibold text-[#079455] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 15m Single-Use
                </span>
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your 32-byte reset token"
                required
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#F9FBFA] border border-[#CCD8D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#079455]/20 focus:border-[#079455] text-[#1A1A1A]"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-[#344054] mb-1.5">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A8B82]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#F9FBFA] border border-[#CCD8D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#079455]/20 focus:border-[#079455] text-[#1A1A1A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7A8B82] hover:text-[#1A1A1A] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-[#344054] mb-1.5">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A8B82]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#F9FBFA] border border-[#CCD8D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#079455]/20 focus:border-[#079455] text-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-[#079455] hover:bg-[#067647] disabled:bg-[#93C5AA] text-white rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Reset & Secure Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/command-center';
                }}
                className="text-xs font-bold text-[#5E6D65] hover:text-[#1A1A1A] cursor-pointer transition-colors"
              >
                Cancel and return to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
