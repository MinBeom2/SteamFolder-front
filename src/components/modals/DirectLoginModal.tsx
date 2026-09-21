import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { loginWithSteamApi } from '@/api/auth';
import { Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getErrorMessage } from '@/utils/error';

interface DirectLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectLoginModal: React.FC<DirectLoginModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setAuth } = useAuthStore();
  const [steamId, setSteamId] = useState('76561198028793194');
  const [username, setUsername] = useState('PixelHunter');
  const [avatarUrl, setAvatarUrl] = useState(
    'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steamId.trim()) {
      setErrorMessage('Steam ID를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await loginWithSteamApi({
        steamId: steamId.trim(),
        username: username.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      setAuth(response);
      setSuccessMessage('로그인에 성공했습니다! 잠시 후 닫힙니다.');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      const errorCode = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (errorCode === 'G004') {
        setErrorMessage(getErrorMessage(err, '스팀 계정 공개 설정을 확인해 주세요.'));
        return;
      }
      console.warn('Backend login request fallback to local auth:', err);
      // Local fallback for offline/preview
      setAuth({
        accessToken: 'demo-jwt-access-token',
        refreshToken: 'demo-jwt-refresh-token',
        userId: 1,
        steamId: steamId.trim(),
        username: username.trim() || 'PixelHunter',
        avatarUrl: avatarUrl.trim() || null,
        themeColor: '#66C0F4',
        isNewUser: false,
      });
      setSuccessMessage('데모 모드로 로그인되었습니다!');
      setTimeout(() => {
        onClose();
      }, 800);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--primary-accent)]" />
          <span className="font-bold text-[var(--text-primary)]">
            개발 및 테스트용 간편 로그인
          </span>
        </div>
      }
    >
      <form onSubmit={handleDirectLogin} className="space-y-4">
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          로컬 개발 환경에서 실제 스팀 서버 리다이렉트 없이 바로 테스트 계정으로 로그인하고 JWT 토큰을 발급받을 수 있습니다.
        </p>

        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-lg flex items-start gap-2.5 text-xs text-red-700 dark:text-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            Steam ID (64-bit) <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] rounded-[3px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-accent)]"
            placeholder="76561198028793194"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            유저 닉네임 (선택)
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] rounded-[3px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-accent)]"
            placeholder="PixelHunter"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            프로필 아바타 이미지 URL (선택)
          </label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] rounded-[3px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-accent)]"
            placeholder="https://avatars.steamstatic.com/..."
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="cyan"
            size="sm"
            isLoading={isLoading}
          >
            로그인
          </Button>
        </div>
      </form>
    </Modal>
  );
};
