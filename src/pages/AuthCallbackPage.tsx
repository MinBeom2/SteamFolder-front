import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { loginWithSteamApi } from '@/api/auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getErrorMessage } from '@/utils/error';
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
        setError(getErrorMessage(err, '스팀 로그인 검증에 실패했습니다.'));
      }
    };

    processAuth();
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 text-center transition-colors duration-200">
      {error ? (
        <div className="relative max-w-md w-full bg-[var(--bg-surface)] p-8 sm:p-10 rounded-[3px] border border-[var(--border-modal)] space-y-3">
          {/* Top-right Close (X) Button */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-[3px] text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--primary-accent)] dark:hover:bg-white/10 cursor-pointer"
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
