import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleConfirmLogout = async () => {
    try {
      await logout();
      onClose();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      onClose();
      navigate('/login');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-[#09090b] rounded-2xl p-6 border border-[#1f1f23] shadow-2xl relative flex flex-col transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-[#18181b] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Confirm Logout</h3>
            <p className="text-xs text-slate-400">Sign out of your CodeLens session</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 rounded-xl bg-[#121214] border border-[#1f1f23] mb-5">
          <p className="text-xs text-slate-300 leading-relaxed">
            Are you sure you want to log out, <span className="font-semibold text-white">{user?.username || 'Developer'}</span>? 
            Your session token will be cleared and you will be returned to the sign-in screen.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f1f23]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl shadow-lg shadow-rose-600/20 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
