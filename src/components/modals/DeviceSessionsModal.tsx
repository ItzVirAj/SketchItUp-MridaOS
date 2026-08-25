import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { authApi } from '../../lib/api';
import {
  Laptop,
  Smartphone,
  Globe,
  ShieldCheck,
  LogOut,
  X,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { DeviceSession } from '../../types';

export const DeviceSessionsModal: React.FC = () => {
  const { setActiveModal } = useApp();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchDevices = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await authApi.getDevices();
      if (res.data) {
        setDevices(res.data.devices || []);
        setCurrentSessionId(res.data.currentSessionId || localStorage.getItem('mridaos_session_id') || '');
      } else {
        // Fallback to local session
        const storedSession = localStorage.getItem('mridaos_session_id');
        setDevices([
          {
            id: storedSession || 'cur-session',
            userId: 'current-user',
            deviceName: 'Current Browser Session',
            browser: 'Chrome / Web Browser',
            os: 'Windows 11',
            ipAddress: '127.0.0.1 (Local)',
            isRevoked: false,
            lastActiveAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          },
        ]);
      }
    } catch {
      setActionError('Failed to fetch active device sessions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevokeSingle = async (sessionId: string) => {
    try {
      await authApi.revokeDevice(sessionId);
      setDevices((prev) => prev.filter((d) => d.id !== sessionId));
      setActionSuccess('Device session revoked successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      setActionError('Failed to revoke device session.');
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      const res = await authApi.revokeAllOtherDevices();
      setDevices((prev) => prev.filter((d) => d.id === currentSessionId));
      setActionSuccess(res.data?.message || 'All other devices logged out.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch {
      setActionError('Failed to logout other devices.');
    }
  };

  const getDeviceIcon = (os: string) => {
    if (os.toLowerCase().includes('ios') || os.toLowerCase().includes('android')) {
      return <Smartphone className="w-5 h-5 text-[#079455]" />;
    }
    return <Laptop className="w-5 h-5 text-[#079455]" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FDFEFE] rounded-3xl border border-[#E2EAE5] shadow-2xl max-w-xl w-full p-6 sm:p-7 max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2EAE5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E0EAE4] text-[#079455] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1A1A1A]">Active Logged-in Devices</h2>
              <p className="text-xs text-[#6E7B74]">Manage security sessions and remote logouts</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('none')}
            className="p-1.5 rounded-full hover:bg-[#F6F8F6] text-[#6E7B74] hover:text-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Alerts */}
        {actionSuccess && (
          <div className="mt-4 p-3 rounded-2xl bg-[#ECFDF3] border border-[#A6F4C5] text-[#079455] text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-3 rounded-2xl bg-[#FEF3F2] border border-[#FECDCA] text-[#D92D20] text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Devices List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#6E7B74]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#079455] mb-2" />
              <span className="text-xs font-bold">Scanning active sessions...</span>
            </div>
          ) : devices.length === 0 ? (
            <div className="py-12 text-center text-[#6E7B74] text-xs font-bold">
              No active sessions recorded.
            </div>
          ) : (
            devices.map((device) => {
              const isCurrent = device.id === currentSessionId;

              return (
                <div
                  key={device.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isCurrent
                      ? 'bg-[#079455]/5 border-[#079455]/30'
                      : 'bg-[#FDFEFE] hover:bg-[#F6F8F6] border-[#E2EAE5]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#CCD8D1] flex items-center justify-center shrink-0 mt-0.5">
                      {getDeviceIcon(device.os)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-[#1A1A1A]">
                          {device.browser} on {device.os}
                        </span>
                        {isCurrent ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#079455] border border-[#A6F4C5]">
                            Current Device
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4EDDE] text-[#6E7B74]">
                            Remote Session
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6E7B74] mt-1">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-[#8C9C93]" />
                          <span>IP: {device.ipAddress || '127.0.0.1'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#8C9C93]" />
                          <span>Last active: {new Date(device.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRevokeSingle(device.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#FEF3F2] hover:bg-[#FEE4E2] text-[#D92D20] text-xs font-bold border border-[#FECDCA] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#E2EAE5] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={fetchDevices}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#6E7B74] hover:text-[#1A1A1A] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <div className="flex items-center gap-2">
            {devices.length > 1 && (
              <button
                type="button"
                onClick={handleRevokeAllOthers}
                className="px-4 py-2 rounded-2xl bg-[#FEF3F2] hover:bg-[#FEE4E2] text-[#D92D20] text-xs font-bold border border-[#FECDCA] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out all other devices</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="px-5 py-2 rounded-2xl bg-[#1A1A1A] hover:bg-black text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
