import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * RepositoriesPage is deprecated because repository management is directly
 * unified inside DashboardPage. This component redirects to /dashboard.
 */
export const RepositoriesPage: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};
