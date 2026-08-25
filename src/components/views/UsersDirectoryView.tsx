import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  Building2,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  KeyRound,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { authApi, adminUsersApi } from '../../lib/api';

export const UsersDirectoryView: React.FC = () => {
  const {
    usersList,
    fetchUsersList,
    adminToggleRevoke,
    setSelectedUserForEdit,
    setActiveModal,
    userProfile,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Admin Reset Token Modal State
  const [resetTokenInfo, setResetTokenInfo] = useState<{
    userName: string;
    email: string;
    token: string;
    resetLink: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0EAE4] text-[#079455] border border-[#079455]/20">Store Owner</span>;
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF8FF] text-[#175CD3] border border-[#175CD3]/20">System Admin</span>;
      case 'counter_staff':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF0C7] text-[#B54708] border border-[#B54708]/20">Counter POS Staff</span>;
      case 'inventory_manager':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F4EDDE] text-[#7A5E0B] border border-[#7A5E0B]/20">Inventory Manager</span>;
      case 'procurement_user':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0F2FE] text-[#0E7090] border border-[#0E7090]/20">Procurement User</span>;
      case 'nursery_care_staff':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFFDF4] text-[#16B364] border border-[#16B364]/20">Nursery Care Lead</span>;
      case 'accounts_user':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FDF2FA] text-[#C01048] border border-[#C01048]/20">Accounts / Khata</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F2F4F7] text-[#344054]">{role}</span>;
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleToggleRevoke = async (user: UserProfile) => {
    setActionLoadingId(user.id);
    await adminToggleRevoke(user.id, user.status);
    setActionLoadingId(null);
  };

  const handleEdit = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setActiveModal('edit_user');
  };

  const handleRemove = (user: UserProfile) => {
    setSelectedUserForEdit(user);
    setActiveModal('remove_user');
  };

  const handleGenerateResetToken = async (user: UserProfile) => {
    setActionLoadingId(user.id);
    try {
      const res = await authApi.adminGenerateResetToken(user.email);
      if (res.data) {
        setResetTokenInfo({
          userName: user.fullName,
          email: user.email,
          token: res.data.token,
          resetLink: res.data.resetLink,
        });
      } else {
        alert(`Failed to generate reset token: ${res.error?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Failed to generate reset token: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlockUser = async (user: UserProfile) => {
    setActionLoadingId(user.id);
    try {
      const res = await adminUsersApi.unlock(user.id);
      if (res.data) {
        alert(`Account for ${user.fullName} unlocked successfully. Failed attempt counters reset.`);
        fetchUsersList();
      } else {
        alert(`Failed to unlock account: ${res.error?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Unlock failed: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#E2EAE5] card-shadow flex flex-col gap-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#079455] text-white flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#1A1A1A] tracking-tight">
                  Staff & Access Control Directory
                </h2>
                <span className="text-[10px] font-bold bg-[#E0EAE4] text-[#079455] px-2 py-0.5 rounded-full">
                  {usersList.length} Accounts
                </span>
              </div>
              <p className="text-xs text-[#6E7B74]">
                Enterprise user roles, access revocation, and branch assignments backed by Supabase Auth
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsersList()}
            className="p-2.5 rounded-2xl border border-[#DCE4DF] bg-white hover:bg-[#F2F7F4] text-[#55635C] transition-all"
            title="Refresh Users List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveModal('add_user')}
            className="px-4 py-2 rounded-2xl bg-[#079455] hover:bg-[#067A46] text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Staff User</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-[#F9FBF9] rounded-2xl border border-[#E5ECE7]">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788880]">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#079455]/20 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">System Admin</option>
            <option value="counter_staff">Counter Staff</option>
            <option value="inventory_manager">Inventory Manager</option>
            <option value="procurement_user">Procurement User</option>
            <option value="nursery_care_staff">Nursery Care</option>
            <option value="accounts_user">Accounts User</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-[#DCE4DF] rounded-xl text-xs font-semibold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts Only</option>
            <option value="revoked">Revoked Accounts Only</option>
          </select>
        </div>
      </div>

      {/* Users Directory Table */}
      {filteredUsers.length === 0 ? (
        <div className="py-12 text-center bg-[#F9FBF9] rounded-2xl border border-dashed border-[#CCD8D0]">
          <Users className="w-8 h-8 text-[#8C9C93] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-[#1A1A1A]">No Users Found</p>
          <p className="text-xs text-[#6E7B74] mt-1">No staff members match the selected filter criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E5ECE7] text-[#7A8B82] font-semibold">
                <th className="py-3 px-3">Employee Name</th>
                <th className="py-3 px-3">Work Email</th>
                <th className="py-3 px-3">Operational Role</th>
                <th className="py-3 px-3">Branch Hub</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Created / Sign In</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F5F2]">
              {filteredUsers.map((u) => {
                const isActive = u.status === 'active';
                const isSelf = u.id === userProfile?.id;

                return (
                  <tr key={u.id} className="hover:bg-[#F9FBFA] transition-colors group">
                    {/* Name + Initials */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#E0EAE4] text-[#079455] font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {u.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {isSelf && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#1A1A1A] text-white">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#7A8B82]">ID: {u.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-3 font-mono font-medium text-[#4A5750]">
                      {u.email}
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-3">
                      {getRoleBadge(u.role)}
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-3 text-[#54625A] font-semibold">
                      {u.branchId ? u.branchId.replace('-', ' ').toUpperCase() : 'All Branches'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-[#E0EAE4] text-[#079455]'
                            : 'bg-[#FEE4E2] text-[#D92D20]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#079455]' : 'bg-[#D92D20]'}`}></span>
                        <span>{isActive ? 'Active' : 'Revoked'}</span>
                      </span>
                    </td>

                    {/* Created / Sign In */}
                    <td className="py-3 px-3 text-[11px] text-[#6E7B74]">
                      {u.lastSignInAt ? (
                        <span>{new Date(u.lastSignInAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span className="text-[#8C9C93]">Never logged in</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Unlock Account / Clear Lockout */}
                        <button
                          onClick={() => handleUnlockUser(u)}
                          disabled={actionLoadingId === u.id}
                          className="p-1.5 rounded-xl border border-[#DCE4DF] bg-white hover:bg-[#F2F7F4] text-[#175CD3] transition-colors cursor-pointer"
                          title="Unlock Account (Reset Failed Attempt Counters)"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                        </button>

                        {/* Generate 15-Minute Reset Token */}
                        <button
                          onClick={() => handleGenerateResetToken(u)}
                          disabled={actionLoadingId === u.id}
                          className="p-1.5 rounded-xl border border-[#DCE4DF] bg-white hover:bg-[#F2F7F4] text-[#079455] transition-colors cursor-pointer"
                          title="Generate 15-Minute Password Reset Link"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(u)}
                          className="p-1.5 rounded-xl border border-[#DCE4DF] bg-white hover:bg-[#F2F7F4] text-[#55635C] transition-colors"
                          title="Edit Permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Revoke / Restore Toggle */}
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleRevoke(u)}
                            disabled={actionLoadingId === u.id}
                            className={`p-1.5 rounded-xl border transition-colors ${
                              isActive
                                ? 'border-[#FEDF89] bg-[#FFFAEB] text-[#B54708] hover:bg-[#FEF0C7]'
                                : 'border-[#D5E5DB] bg-[#EFF5F1] text-[#079455] hover:bg-[#E0EAE4]'
                            }`}
                            title={isActive ? 'Revoke Access (Block Login)' : 'Restore Access'}
                          >
                            {isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Remove User */}
                        {!isSelf && (
                          <button
                            onClick={() => handleRemove(u)}
                            className="p-1.5 rounded-xl border border-[#FECDCA] bg-white hover:bg-[#FEF3F2] text-[#D92D20] transition-colors"
                            title="Hard Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Generated 15-Minute Single-Use Token Modal */}
      {resetTokenInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E0EAE4] p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setResetTokenInfo(null)}
              className="absolute top-4 right-4 p-2 text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#E0EAE4] border border-[#C5D7CC] flex items-center justify-center text-[#079455]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">One-Time Password Reset Token</h3>
                <p className="text-xs text-[#5E6D65]">For {resetTokenInfo.userName} ({resetTokenInfo.email})</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#EFF5F1] border border-[#C5D7CC] rounded-2xl flex items-start gap-2.5 text-xs text-[#067647] mb-4">
              <KeyRound className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#079455]" />
              <div>
                <span className="font-bold">Secure Single-Use Reset Token:</span>
                <p className="mt-0.5 text-[#2A523E]">
                  This token is single-use and will be immediately invalidated once consumed. Copy and share securely with the employee.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#344054] mb-1">Direct Reset Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resetTokenInfo.resetLink}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-[#F9FBFA] border border-[#CCD8D1] rounded-xl text-[#1A1A1A] truncate"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resetTokenInfo.resetLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-[#079455] hover:bg-[#067647] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#344054] mb-1">Raw Token</label>
                <div className="p-2 bg-[#F9FBFA] rounded-xl border border-[#CCD8D1] text-[11px] font-mono break-all text-[#344054]">
                  {resetTokenInfo.token}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setResetTokenInfo(null)}
                className="px-5 py-2.5 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#1A1A1A] rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
