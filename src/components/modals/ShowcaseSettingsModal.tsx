import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import type { User } from '@/types/auth';
import { RefreshCw, Globe, Lock } from 'lucide-react';

interface ShowcaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ShowcaseSettingsFormProps {
  user: User;
  onClose?: () => void;
  showCancelButton?: boolean;
}

export const ShowcaseSettingsForm: React.FC<ShowcaseSettingsFormProps> = ({
  user,
  onClose,
}) => {
  const { updateVisibility, deleteAccount } = useAuthStore();
  const { syncGames, isSyncingGames, cooldownSeconds } = useShowcaseStore();

  const [isPublic, setIsPublic] = useState(user.isPublic ?? true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const isCooldownActive = cooldownSeconds > 0;
  const cooldownMin = Math.floor(cooldownSeconds / 60);
  const cooldownSec = cooldownSeconds % 60;
  const formattedCooldown = `${cooldownMin}: ${
    cooldownSec < 10 ? '0' + cooldownSec : cooldownSec
  }`;

  const handleToggleVisibility = async (nextPublic: boolean) => {
    if (isPublic === nextPublic || isUpdatingVisibility) return;
    setIsPublic(nextPublic);
    setIsUpdatingVisibility(true);
    try {
      await updateVisibility(nextPublic);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to update visibility:', err);
      setIsPublic(!nextPublic);
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleSyncSteam = async () => {
    if (isCooldownActive) {
      setSyncStatus(`동기화 쿨다운(5분) 제한 중입니다. (${formattedCooldown} 후 가능)`);
      return;
    }

    setSyncStatus(null);
    try {
      const res = await syncGames();
      setSyncStatus(`동기화 완료: ${res.syncedGameCount}개의 게임 라이브러리가 갱신되었습니다.`);
    } catch (err: unknown) {
      console.error('Steam sync failed:', err);
      const resData = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (resData?.code === 'G005' || resData?.message?.includes('쿨다운')) {
        setSyncStatus(`동기화 쿨다운(5분) 제한 중입니다. (${formattedCooldown} 후 가능)`);
      } else {
        setSyncStatus('스팀 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('정말로 계정을 삭제하고 연동을 해제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      await deleteAccount();
      onClose?.();
    }
  };

  return (
    <div className="space-y-6 text-[var(--text-primary)]">
      {syncStatus && (
        <div
          className={`p-3 rounded-lg text-xs ${
            isCooldownActive
              ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-200'
              : 'bg-sky-50 dark:bg-[#121b28] border border-sky-200 dark:border-[#2a475e] text-sky-900 dark:text-slate-200 shadow-sm'
          }`}
        >
          {syncStatus}
        </div>
      )}

      {/* 1. 공개 설정 */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            쇼케이스 공개 범위
          </label>
          {isUpdatingVisibility && (
            <span className="text-[11px] text-[var(--text-secondary)] animate-pulse">
              저장 중...
            </span>
          )}
          {saveSuccess && !isUpdatingVisibility && (
            <span className="text-[11px] font-medium text-emerald-500 animate-in fade-in">
              ✓ 자동 저장됨
            </span>
          )}
        </div>
        <div className="relative flex items-center p-1 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-card)] select-none">
          {/* Sliding Pill Indicator */}
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md toggle-pill-indicator transition-transform duration-300 ease-in-out pointer-events-none"
            style={{
              left: '4px',
              transform: isPublic ? 'translateX(0%)' : 'translateX(100%)',
            }}
          />

          <button
            type="button"
            disabled={isUpdatingVisibility}
            onClick={() => handleToggleVisibility(true)}
            className={`relative z-10 flex-1 py-2.5 text-xs rounded-md transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              isPublic
                ? 'toggle-item-active'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>공개</span>
          </button>
          <button
            type="button"
            disabled={isUpdatingVisibility}
            onClick={() => handleToggleVisibility(false)}
            className={`relative z-10 flex-1 py-2.5 text-xs rounded-md transition-colors duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
              !isPublic
                ? 'toggle-item-active'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>비공개</span>
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          {isPublic
            ? '누구나 쇼케이스 공유 링크를 통해 열람할 수 있습니다.'
            : '나만이 내 쇼케이스에 접근할 수 있습니다.'}
        </p>
      </div>

      {/* 2. 스팀 계정 연동 & 라이브러리 동기화 */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
        <div className="space-y-0.5">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            스팀 데이터 동기화
          </label>
          <p className="text-[11px] text-[var(--text-secondary)]">
            스팀 프로필 및 게임 라이브러리를 동기화합니다.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={`shrink-0 py-1.5 px-3 text-xs font-medium border transition-all ${
            isCooldownActive
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 cursor-not-allowed'
              : ''
          }`}
          onClick={handleSyncSteam}
          disabled={isCooldownActive}
          isLoading={isSyncingGames}
          leftIcon={
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isCooldownActive ? 'text-amber-500' : 'text-[#66c0f4] dark:text-[#66c0f4] light:text-blue-600'
              }`}
            />
          }
        >
          {isCooldownActive
            ? `${formattedCooldown}`
            : '동기화'}
        </Button>
      </div>

      {/* 3. 계정 삭제 */}
      <div className="pt-3 border-t border-[var(--border-subtle)] text-center">
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium py-1 px-2 rounded-md hover:bg-red-500/10 active:scale-[0.98] transition-colors cursor-pointer"
        >
          계정 삭제 및 스팀 연동 해제
        </button>
      </div>
    </div>
  );
};

export const ShowcaseSettingsModal: React.FC<ShowcaseSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="설정"
      maxWidth="md"
    >
      <ShowcaseSettingsForm
        key={`${user.id}-${user.isPublic}`}
        user={user}
        onClose={onClose}
      />
    </Modal>
  );
};
