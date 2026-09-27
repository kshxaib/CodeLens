import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useWorkspaceStore } from './store/useWorkspaceStore';

import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ArchitectureMapPage } from './pages/ArchitectureMapPage';
import { CodeLensChatPage } from './pages/CodeLensChatPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { ErrorState } from './components/common/ErrorState';

function RepositoryRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/repository/${id}/architecture`} replace />;
}

function ArchitectureRedirect() {
  const { repositories, selectedRepo } = useWorkspaceStore();
  const targetId = selectedRepo?.id || repositories[0]?.id;
  if (targetId) {
    return <Navigate to={`/repository/${targetId}/architecture`} replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function AppContent() {
  const { user, handleCallback, refreshUser } = useAuthStore();
  const fetchRepositories = useWorkspaceStore((state) => state.fetchRepositories);
  const location = useLocation();
  const navigate = useNavigate();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (user) {
      fetchRepositories();
    }
  }, [user, fetchRepositories]);

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
      <div className="min-h-screen bg-[#F8F7F4] text-[#19243B] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E0D9] flex items-center justify-center mb-4 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        </div>
        <h3 className="text-sm font-bold text-[#19243B] font-mono tracking-tight">
          Authenticating Session
        </h3>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#19243B] flex flex-col font-sans">
      {oauthError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-700 text-xs py-2.5 px-4 text-center font-mono">
          ⚠ {oauthError}
        </div>
      )}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/repositories" element={<Navigate to="/dashboard" replace />} />
          <Route path="/repository/:id" element={<ProtectedRoute><RepositoryRedirect /></ProtectedRoute>} />
          <Route path="/repository/:id/architecture" element={<ProtectedRoute><ArchitectureMapPage /></ProtectedRoute>} />
          <Route
            path="/architecture"
            element={
              <ProtectedRoute>
                <ArchitectureRedirect />
              </ProtectedRoute>
            }
          />
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
