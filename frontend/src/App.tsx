import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';

import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { RepositoryOverviewPage } from './pages/RepositoryOverviewPage';
import { ArchitectureMapPage } from './pages/ArchitectureMapPage';
import { CodeLensChatPage } from './pages/CodeLensChatPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';
import { ErrorState } from './components/common/ErrorState';

export function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Router>
          <div className="min-h-screen bg-[#0d1017] text-[#f0f3f6] flex flex-col font-sans" data-appearance="dark">
            <main className="flex-1 flex flex-col">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />

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
        </Router>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
