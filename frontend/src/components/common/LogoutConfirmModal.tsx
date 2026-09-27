import React from 'react';
import { LogOut, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#19243B]/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-2xl p-6 border border-[#E2E0D9] shadow-xl relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#8C96A5] hover:text-[#19243B] p-1 rounded-md hover:bg-[#F0EEE9] transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="size-9 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#526078] shrink-0">
            <LogOut className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#19243B] tracking-tight">Confirm Logout</h3>
            <p className="text-xs text-[#526078]">Sign out of your CodeLens session</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] mb-5">
          <p className="text-xs text-[#526078] leading-relaxed">
            Are you sure you want to log out, <span className="font-semibold text-[#19243B]">{user?.username || 'Developer'}</span>? 
            Your session token will be cleared and you will be returned to the sign-in screen.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E0D9]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-3.5 text-xs font-medium rounded-xl border-[#E2E0D9] bg-white hover:bg-[#FAF9F5] text-[#526078] hover:text-[#19243B] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmLogout}
            className="h-8 px-3.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs border-0"
          >
            <LogOut className="mr-1.5 size-3.5" />
            <span>Log Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
