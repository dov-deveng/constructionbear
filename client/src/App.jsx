import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/index.js';

import AuthScreen from './screens/AuthScreen.jsx';
import OnboardingScreen from './screens/OnboardingScreen.jsx';
import AppShell from './screens/AppShell.jsx';
import VerifyEmail from './screens/VerifyEmail.jsx';
import ResetPassword from './screens/ResetPassword.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function OnboardingRoute({ children }) {
  const { user, profile, loading } = useAuthStore();
  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile?.onboarding_complete) return <Navigate to="/onboarding" replace />;
  return children;
}

function SplashScreen() {
  return (
    <div className="h-full flex items-center justify-center bg-bear-bg">
      <div className="text-center">
        <div className="w-16 h-16 bg-bear-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🐻</span>
        </div>
        <p className="text-bear-muted text-sm">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const init = useAuthStore(s => s.init);
  const loading = useAuthStore(s => s.loading);

  useEffect(() => { init(); }, []);

  if (loading) return <SplashScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthScreen mode="login" />} />
        <Route path="/register" element={<AuthScreen mode="register" />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<AuthScreen mode="forgot" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={
          <ProtectedRoute><OnboardingScreen /></ProtectedRoute>
        } />
        <Route path="/*" element={
          <OnboardingRoute><AppShell /></OnboardingRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
