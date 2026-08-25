import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  UserPlus,
  Copy,
  Check,
  Key,
  Shield,
  Building2,
  Mail,
  User,
} from 'lucide-react';
import { UserRole } from '../../types';

export const AddUserModal: React.FC = () => {
  const { adminAddUser, setActiveModal } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('counter_staff');
  const [branchId, setBranchId] = useState('nashik-central');
  const [tempPassword, setTempPassword] = useState(() => {
    return `Mrida@${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !tempPassword) return;

    setIsLoading(true);
    setErrorMessage(null);

    const res = await adminAddUser(email, tempPassword, fullName, role, branchId);
    setIsLoading(false);

    if (res.success) {
      setCreatedSuccess(true);
    } else {
      setErrorMessage(res.error || 'Failed to create user account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Provision Staff Account</h3>
              <p className="text-xs text-[#6E7B74]">Create a new employee profile and credentials</p>
            </div>
          </div>

          <button
            onClick={() => setActiveModal('none')}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdSuccess ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E0EAE4] text-[#079455] flex items-center justify-center mb-3">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Account Successfully Created!</h3>
            <p className="text-xs text-[#6E7B74] mt-1 max-w-sm">
              The user <strong>{email}</strong> has been provisioned and registered in Supabase Auth.
            </p>

            <div className="w-full my-5 p-4 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7] text-left text-xs">
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Full Name:</span>
                <strong className="text-[#1A1A1A]">{fullName}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#EAEFEA]">
                <span className="text-[#6E7B74]">Assigned Role:</span>
                <strong className="text-[#079455] capitalize font-bold">{role.replace('_', ' ')}</strong>
              </div>
              <div className="flex justify-between items-center py-2">
                <div>
                  <span className="text-[#6E7B74] block">Temporary Password:</span>
                  <strong className="text-[#1A1A1A] font-mono text-sm">{tempPassword}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-3 py-1.5 bg-white border border-[#DCE4DF] hover:bg-[#EFF5F1] text-xs font-bold rounded-xl flex items-center gap-1.5 text-[#079455]"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveModal('none')}
              className="px-5 py-2.5 bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold rounded-xl shadow-sm"
            >
              Done & Return to Directory
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl text-xs text-[#B42318]">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Employee Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788880]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold focus:ring-2 focus:ring-[#079455]/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#1A1A1A] mb-1">Work Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788880]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@mridaos.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold focus:ring-2 focus:ring-[#079455]/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Operational Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold focus:ring-2 focus:ring-[#079455]/20 focus:outline-none"
                >
                  <option value="counter_staff">Counter POS Staff</option>
                  <option value="inventory_manager">Inventory Manager</option>
                  <option value="procurement_user">Procurement User</option>
                  <option value="nursery_care_staff">Nursery Care Staff</option>
                  <option value="accounts_user">Accounts / Khata User</option>
                  <option value="admin">System Admin</option>
                  <option value="owner">Store Owner</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1A1A1A] mb-1">Assigned Hub / Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-semibold focus:ring-2 focus:ring-[#079455]/20 focus:outline-none"
                >
                  <option value="nashik-central">Nashik Central Agro-Hub</option>
                  <option value="pune-hub">Pune Regional Distribution Hub</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#1A1A1A]">Temporary Password (One-Time Display)</label>
                <button
                  type="button"
                  onClick={() => setTempPassword(`Mrida@${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="text-[11px] font-bold text-[#079455] hover:underline"
                >
                  Regenerate
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788880]">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-[#079455]/20 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-[#7A8B82] mt-1">
                This password will be securely hashed with bcrypt (round 10) in Supabase.
              </p>
            </div>

            <div className="pt-3 border-t border-[#E5ECE7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="px-4 py-2 bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#E0EAE4] rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 bg-[#079455] hover:bg-[#067A46] text-white rounded-xl font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? 'Creating Account...' : 'Create Staff User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
