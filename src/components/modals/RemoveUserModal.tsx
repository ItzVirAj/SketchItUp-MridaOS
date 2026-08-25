import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const RemoveUserModal: React.FC = () => {
  const { adminRemoveUser, selectedUserForEdit, setSelectedUserForEdit, setActiveModal } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  if (!selectedUserForEdit) return null;

  const isConfirmed = confirmEmail.trim().toLowerCase() === selectedUserForEdit.email.toLowerCase();

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    const res = await adminRemoveUser(selectedUserForEdit.id);
    setIsDeleting(false);
    if (res.success) {
      setActiveModal('none');
      setSelectedUserForEdit(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#FECDCA] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#FEF3F2] border-b border-[#FECDCA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#D92D20] text-white flex items-center justify-center shadow-2xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#D92D20]">Delete Employee Account</h3>
              <p className="text-xs text-[#B42318]">Irreversible deletion of Supabase Auth & Profile</p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveModal('none');
              setSelectedUserForEdit(null);
            }}
            className="p-2 rounded-xl text-[#788880] hover:text-[#1A1A1A] hover:bg-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 flex flex-col gap-3.5 text-xs">
          <div className="p-3 bg-[#FEF3F2] rounded-2xl border border-[#FECDCA] text-[#B42318]">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-[#D92D20]" />
              Warning: Permanent Action
            </p>
            <p className="text-[11px] leading-relaxed">
              This will permanently delete <strong>{selectedUserForEdit.fullName}</strong> ({selectedUserForEdit.email}) from Supabase Auth and remove all operational permissions.
            </p>
          </div>

          <div>
            <label className="block font-bold text-[#1A1A1A] mb-1">
              Type <code className="text-[#D92D20] font-mono bg-[#FEE4E2] px-1 rounded">{selectedUserForEdit.email}</code> to confirm:
            </label>
            <input
              type="text"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Confirm user email..."
              className="w-full px-3 py-2 bg-white border border-[#DCE4DF] rounded-xl font-mono text-xs focus:ring-2 focus:ring-[#D92D20]/30 focus:outline-none"
            />
          </div>

          <div className="pt-2 border-t border-[#E5ECE7] flex items-center justify-end gap-2">
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
              type="button"
              disabled={!isConfirmed || isDeleting}
              onClick={handleDelete}
              className="px-5 py-2 bg-[#D92D20] hover:bg-[#B42318] text-white rounded-xl font-bold shadow-2xs flex items-center gap-1.5 disabled:opacity-40"
            >
              {isDeleting ? 'Deleting...' : 'Permanently Delete User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
