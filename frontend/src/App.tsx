import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Loader2, Code2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { useAuthStore } from './store/useAuthStore';

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
  const { user, handleCallback } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');

    if (code && !user && processedCodeRef.current !== code) {
      processedCodeRef.current = code;
      setIsProcessingOAuth(true);
      setOauthError(null);

      // Clean the URL query params so history doesn't retain the used code
      window.history.replaceState({}, document.title, window.location.pathname);

      handleCallback(code)
        .then(() => {
          navigate('/dashboard', { replace: true });
        })
        .catch((err: any) => {
          // If token was already received in localStorage, don't show error
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
      <div className="min-h-screen bg-[#000000] text-[#f4f4f5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)] mb-6 animate-pulse">
          <Code2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connecting to CodeLens via GitHub</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Verifying session credentials and synchronizing your repositories...
        </p>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-mono bg-[#09090b] px-4 py-2 rounded-lg border border-[#1f1f23]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Authenticating...</span>
        </div>
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
          {/* Public Landing Page (Screen 23) */}
          <Route path="/" element={<LandingPage />} />

          {/* Any /login link redirects to root landing page */}
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* Protected Workspace Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repositories"
            element={
              <ProtectedRoute>
                <RepositoriesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repository/:id"
            element={
              <ProtectedRoute>
                <RepositoryOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/repository/:id/architecture"
            element={
              <ProtectedRoute>
                <ArchitectureMapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <CodeLensChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettingsPage />
              </ProtectedRoute>
            }
          />

          {/* 404 Fallback */}
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
    <AuthProvider>
      <WorkspaceProvider>
        <Router>
          <AppContent />
        </Router>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
