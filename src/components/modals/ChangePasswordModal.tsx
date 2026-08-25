import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { authApi } from '../../lib/api';
import {
  KeyRound,
  X,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export const ChangePasswordModal: React.FC = () => {
  const { setActiveModal } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      if (res.error) {
        setErrorMsg(res.error.message || 'Failed to change password.');
      } else {
        setSuccessMsg(res.data?.message || 'Password changed successfully!');
        setTimeout(() => {
          setActiveModal('none');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FDFEFE] rounded-3xl border border-[#E2EAE5] shadow-2xl max-w-md w-full p-6 sm:p-7 overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2EAE5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">Change Password</h2>
              <p className="text-xs text-[#6E7B74]">Update your secure login credentials</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-full hover:bg-[#F6F8F6] text-[#6E7B74] hover:text-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-[#ECFDF3] border border-[#A6F4C5] text-[#079455] text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[#D92D20] text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full px-3.5 py-2.5 bg-[#F6F8F6] border border-[#CCD8D1] focus:border-[#079455] focus:bg-white rounded-2xl text-xs font-medium text-[#1A1A1A] focus:outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9C93] hover:text-[#1A1A1A]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                className="w-full px-3.5 py-2.5 bg-[#F6F8F6] border border-[#CCD8D1] focus:border-[#079455] focus:bg-white rounded-2xl text-xs font-medium text-[#1A1A1A] focus:outline-none transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C9C93] hover:text-[#1A1A1A]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full px-3.5 py-2.5 bg-[#F6F8F6] border border-[#CCD8D1] focus:border-[#079455] focus:bg-white rounded-2xl text-xs font-medium text-[#1A1A1A] focus:outline-none transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E2EAE5] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="px-4 py-2 rounded-2xl border border-[#CCD8D1] text-xs font-bold text-[#6E7B74] hover:bg-[#F6F8F6] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-2xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
