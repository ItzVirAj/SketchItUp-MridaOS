import React, { useState } from 'react';
import { authApi } from '../../lib/api';
import {
  X,
  Mail,
  Send,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; resetLink?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await authApi.requestPasswordReset(email.trim().toLowerCase());
      if (res.data) {
        setSuccessInfo({
          message: res.data.message,
          resetLink: res.data.resetLink,
        });
      } else {
        setErrorMessage(res.error?.message || 'Failed to submit reset request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit reset request. Please check rate limits.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E0EAE4] p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#788880] hover:text-[#1A1A1A] hover:bg-[#EFF5F1] rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#E0EAE4] border border-[#C5D7CC] flex items-center justify-center text-[#079455]">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A]">Reset Password</h2>
            <p className="text-xs text-[#5E6D65]">15-minute single-use secure reset link</p>
          </div>
        </div>

        {successInfo ? (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 bg-[#ECFDF3] border border-[#ABEFC6] rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#079455] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#067647]">
                <p className="font-bold">Reset Request Dispatched</p>
                <p className="mt-0.5">{successInfo.message}</p>
              </div>
            </div>

            {successInfo.resetLink && (
              <div className="p-3 bg-[#F9FBFA] border border-[#CCD8D1] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#344054]">
                  <span className="flex items-center gap-1 text-[#079455]">
                    <Clock className="w-3 h-3" /> One-Time Reset Link (15m):
                  </span>
                  <button
                    onClick={() => handleCopy(successInfo.resetLink!)}
                    className="flex items-center gap-1 text-[#079455] hover:text-[#067647] font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#079455]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white rounded-lg border border-[#E0EAE4] text-[10px] font-mono break-all text-[#1A1A1A]">
                  {successInfo.resetLink}
                </div>
                <a
                  href={successInfo.resetLink}
                  className="block w-full py-2 bg-[#079455] hover:bg-[#067647] text-white text-center rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  Proceed to Reset Password Now
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#1A1A1A] rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {errorMessage && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-xl flex items-start gap-2 text-xs text-[#D92D20]">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#344054] mb-1.5 flex items-center justify-between">
                <span>Account Email</span>
                <span className="text-[10px] text-[#7A8B82]">Max 3 requests / hour</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7A8B82]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@mridaos.in"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-[#F9FBFA] border border-[#CCD8D1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#079455]/20 focus:border-[#079455] text-[#1A1A1A]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-[#EFF5F1] hover:bg-[#E0EAE4] text-[#1A1A1A] rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 bg-[#079455] hover:bg-[#067647] disabled:bg-[#93C5AA] text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
