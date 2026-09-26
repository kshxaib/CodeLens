import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';

import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { RepositoryOverviewPage } from './pages/RepositoryOverviewPage';
import { ArchitectureMapPage } from './pages/ArchitectureMapPage';
import { CodeLensChatPage } from './pages/CodeLensChatPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { ErrorState } from './components/common/ErrorState';

function AppContent() {
  const { user, handleCallback, refreshUser } = useAuthStore();
  const fetchRepositories = useWorkspaceStore((state) => state.fetchRepositories);
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const processedCodeRef = useRef<string | null>(null);

  // Bootstrap: refresh user session on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Bootstrap: auto-fetch repos when user is logged in
  useEffect(() => {
    if (user) {
      fetchRepositories();
    }
  }, [user, fetchRepositories]);

  // OAuth callback handling
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');

    if (code && !user && processedCodeRef.current !== code) {
      processedCodeRef.current = code;
      setIsProcessingOAuth(true);
      setOauthError(null);

      window.history.replaceState({}, document.title, window.location.pathname);

      handleCallback(code)
        .then(() => {
          navigate('/dashboard', { replace: true });
        })
        .catch((err: any) => {
          if (localStorage.getItem('codelens_token')) {
            navigate('/dashboard', { replace: true });
            return;
          }
          console.error('OAuth callback failed', err);
          setOauthError(err.message || 'GitHub login failed. Please try again.');
        })
        .finally(() => {
          setIsProcessingOAuth(false);
        });
    }
  }, [location.search, user, handleCallback, navigate]);

  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen bg-[#000000] text-[#f4f4f5] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#141416] border border-[#27272a] flex items-center justify-center mb-4 shadow-xl">
          <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-white font-mono tracking-tight">
          Authenticating Session
        </h3>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-[#f4f4f5] flex flex-col font-sans" data-appearance="dark">
      {oauthError && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 text-rose-300 text-xs py-2.5 px-4 text-center font-mono">
          ⚠ {oauthError}
        </div>
      )}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/repositories" element={<ProtectedRoute><RepositoriesPage /></ProtectedRoute>} />
          <Route path="/repository/:id" element={<ProtectedRoute><RepositoryOverviewPage /></ProtectedRoute>} />
          <Route path="/repository/:id/architecture" element={<ProtectedRoute><ArchitectureMapPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><CodeLensChatPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />

          <Route
            path="*"
            element={
              <div className="py-20">
                <ErrorState
                  type="404"
                  title="Page Not Found (404)"
                  message="The screen or route you are looking for does not exist."
                />
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
