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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-md bg-card rounded-xl p-6 border border-border relative flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition cursor-pointer"
        >
          <X className="size-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-foreground shrink-0">
            <LogOut className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Confirm Logout</h3>
            <p className="text-xs text-muted-foreground">Sign out of your CodeLens session</p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 rounded-lg bg-secondary border border-border mb-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to log out, <span className="font-semibold text-foreground">{user?.username || 'Developer'}</span>? 
            Your session token will be cleared and you will be returned to the sign-in screen.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-3.5 text-xs font-medium rounded-lg border-border hover:bg-accent cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmLogout}
            className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer shadow-none"
          >
            <LogOut className="mr-1.5 size-3.5" />
            <span>Log Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
