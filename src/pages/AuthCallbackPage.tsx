import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { loginWithSteamApi } from '@/api/auth';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';

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
    <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center p-6 text-center">
      {error ? (
        <div className="max-w-md w-full glass-modal p-8 rounded-2xl border border-red-800/60 space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">로그인 실패</h2>
          <p className="text-xs text-slate-300 leading-relaxed bg-[#090d14] p-3 rounded-lg border border-slate-800 font-mono">
            {error}
          </p>
          <Button
            variant="cyan"
            size="sm"
            onClick={() => navigate('/')}
            className="w-full mt-4"
          >
            홈으로 돌아가기
          </Button>
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
