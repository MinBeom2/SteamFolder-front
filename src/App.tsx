import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { GuestShowcasePage } from '@/pages/GuestShowcasePage';
import { ShowcaseRankingPage } from '@/pages/ShowcaseRankingPage';
import { MyPage } from '@/pages/MyPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { QueryError } from '@/components/common/QueryError';
import { Button } from '@/components/common/Button';

const PageTitle: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const section = pathname.startsWith('/rankings')
      ? '쇼케이스 랭킹'
      : pathname.startsWith('/mypage')
        ? '마이페이지'
        : pathname.startsWith('/showcase/') || pathname === '/guest'
          ? '공유 쇼케이스'
          : pathname.startsWith('/auth/callback')
            ? '로그인'
            : pathname.startsWith('/folders/')
              ? '내 폴더'
              : '나만의 게임 쇼케이스';
    document.title = `${section} | SteamFolder`;
  }, [pathname]);

  return null;
};

export const App: React.FC = () => {
  const { initializeAuth, isInitialized, isAuthenticated, isLoading, error, accessToken, refreshToken, logout } = useAuthStore();
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

  if (!isAuthenticated && error && (accessToken || refreshToken)) {
    return (
      <div className="min-h-screen bg-[var(--bg-app,#07090e)] text-[var(--text-primary,#e2e8f0)] flex items-center justify-center p-4">
        <QueryError
          title="로그인 상태를 확인하지 못했습니다"
          message={error}
          onRetry={initializeAuth}
          isRetrying={isLoading}
        >
          <Button variant="ghost" onClick={logout} disabled={isLoading}>로그아웃</Button>
        </QueryError>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <PageTitle />
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
