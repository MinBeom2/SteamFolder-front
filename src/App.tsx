import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { GuestShowcasePage } from '@/pages/GuestShowcasePage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { useAuthStore } from '@/store/useAuthStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const App: React.FC = () => {
  const { initializeAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Initial token verification state (prevents page flicker on F5 reload)
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="스팀 인증중..." />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/folders/:folderId" element={<HomePage />} />
        <Route path="/guest" element={<GuestShowcasePage />} />
        <Route path="/showcase/:identifier" element={<GuestShowcasePage />} />
        <Route path="/showcase/:identifier/folders/:folderId" element={<GuestShowcasePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
