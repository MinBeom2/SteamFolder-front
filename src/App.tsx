import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { GuestShowcasePage } from '@/pages/GuestShowcasePage';
import { ShowcaseRankingPage } from '@/pages/ShowcaseRankingPage';
import { MyPage } from '@/pages/MyPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const App: React.FC = () => {
  const { initializeAuth, isInitialized } = useAuthStore();
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
    initializeAuth();
  }, [initializeAuth, initializeTheme]);

  // Initial token verification state (prevents page flicker on F5 reload)
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[var(--bg-app,#07090e)] text-[var(--text-primary,#e2e8f0)] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="스팀 인증중..." />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/folders/:folderId" element={<HomePage />} />
        <Route path="/rankings" element={<ShowcaseRankingPage />} />
        <Route path="/mypage" element={<MyPage />} />
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
