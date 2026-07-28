import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Loader2 } from 'lucide-react';

// Layout is always needed so keep static
import DashboardLayout from '../components/layout/DashboardLayout';

// Lazy-load ALL page components for route-level code splitting
const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const PredictionWizardPage = lazy(() => import('../pages/PredictionWizardPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const PreventionPage = lazy(() => import('../pages/PreventionPage'));
const NearbyPage = lazy(() => import('../pages/NearbyPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const DoctorPortalPage = lazy(() => import('../pages/DoctorPortalPage'));
const AdminPortalPage = lazy(() => import('../pages/AdminPortalPage'));

import CustomCursor from '../components/CustomCursor';

const queryClient = new QueryClient();

// Loading spinner fallback shown between route transitions
function PageLoader() {
  return (
    <div className="h-full flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-light tracking-wider uppercase">Loading module...</p>
      </div>
    </div>
  );
}

// Route Protection wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Global Premium Portfolio Cursor & Noise Overlay */}
        <CustomCursor />
        <div className="noise-overlay" />

        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Dashboard Core */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="prediction" element={<PredictionWizardPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="prevention" element={<PreventionPage />} />
              <Route path="nearby" element={<NearbyPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              
              {/* Portals */}
              <Route 
                path="doctor" 
                element={
                  <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
                    <DoctorPortalPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="admin" 
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminPortalPage />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Catch-all Fallback redirects to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
