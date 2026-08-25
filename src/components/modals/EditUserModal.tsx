import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  UserCheck,
  Building2,
  Mail,
  User,
  Shield,
} from 'lucide-react';
import { UserRole } from '../../types';

export const EditUserModal: React.FC = () => {
  const { adminEditUser, selectedUserForEdit, setSelectedUserForEdit, setActiveModal } = useApp();

  const [fullName, setFullName] = useState(selectedUserForEdit?.fullName || '');
  const [role, setRole] = useState<UserRole>(selectedUserForEdit?.role || 'counter_staff');
  const [branchId, setBranchId] = useState(selectedUserForEdit?.branchId || 'nashik-central');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedUserForEdit) {
      setFullName(selectedUserForEdit.fullName);
      setRole(selectedUserForEdit.role);
      setBranchId(selectedUserForEdit.branchId || 'nashik-central');
    }
  }, [selectedUserForEdit]);

  if (!selectedUserForEdit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    const res = await adminEditUser(selectedUserForEdit.id, fullName, role, branchId);
    setIsLoading(false);

    if (res.success) {
      setActiveModal('none');
      setSelectedUserForEdit(null);
    } else {
      setErrorMessage(res.error || 'Failed to update user profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#E2EAE5] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#F9FBF9] border-b border-[#E5ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center shadow-2xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A]">Edit Staff Permissions</h3>
              <p className="text-xs text-[#6E7B74]">Update operational role, name or branch assignment</p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveModal('none');
              setSelectedUserForEdit(null);
            }}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl text-xs text-[#B42318]">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block font-bold text-[#6E7B74] mb-1">User Email (Immutable)</label>
            <div className="px-3 py-2 bg-[#F2F7F4] border border-[#DCE4DF] rounded-xl font-mono font-bold text-xs text-[#1A1A1A]">
              {selectedUserForEdit.email}
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">Employee Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#788880]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
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

          <div className="p-3 bg-[#EFF5F1] rounded-2xl border border-[#D5E5DB] text-[11px] text-[#405448]">
            💡 Role updates take effect immediately in the database and audit trail.
          </div>

          <div className="pt-3 border-t border-[#E5ECE7] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveModal('none');
                setSelectedUserForEdit(null);
              }}
              className="px-4 py-2 bg-[#EFF5F1] text-[#6E7E75] hover:bg-[#E0EAE4] rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-[#1A1A1A] hover:bg-black text-white rounded-xl font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
