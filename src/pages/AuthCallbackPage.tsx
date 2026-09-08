import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { loginWithSteamApi } from '@/api/auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { X } from 'lucide-react';

export const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [error, setError] = useState<string | null>(null);
  const isProcessedRef = useRef(false);

  useEffect(() => {
    // React StrictMode mounts components twice in dev. Prevent duplicate verification requests.
    if (isProcessedRef.current) return;

    const processAuth = async () => {
      // Collect all query parameters from Steam OpenID redirect
      const openIdParams: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        openIdParams[key] = value;
      });

      if (Object.keys(openIdParams).length === 0) {
        setError('스팀 인증 파라미터가 유효하지 않습니다.');
        return;
      }

      isProcessedRef.current = true;

      try {
        const authResponse = await loginWithSteamApi({ openIdParams });
        setAuth(authResponse);
        navigate('/', { replace: true });
      } catch (err: unknown) {
        console.error('Steam OpenID login failed:', err);
        const serverMsg =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || '스팀 로그인 검증에 실패했습니다.';
        setError(serverMsg);
      }
    };

    processAuth();
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 text-center transition-colors duration-200">
      {error ? (
        <div className="relative max-w-md w-full glass-modal p-8 sm:p-10 rounded-2xl border border-[var(--border-modal)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
          {/* Top-right Close (X) Button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute top-4 right-4 p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 active:scale-[0.96] transition-colors cursor-pointer"
            aria-label="창 닫기"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">로그인 실패</h2>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {error}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <LoadingSpinner size="lg" label="스팀 인증중..." />
        </div>
      )}
    </div>
  );
};

export default AuthCallbackPage;
