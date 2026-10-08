import React from 'react';
import { Navigate } from 'react-router-dom';

export const RepositoriesPage: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};
