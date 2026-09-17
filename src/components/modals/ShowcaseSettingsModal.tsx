import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { resetWorkspaceApi } from '@/api/auth';
import { getErrorMessage } from '@/utils/error';
import type { User } from '@/types/auth';
import {
  AlertTriangle,
  Globe,
  Lock,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';

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
  const navigate = useNavigate();
  const { updateVisibility, deleteAccount } = useAuthStore();
  const {
    syncGames,
    isSyncingGames,
    cooldownSeconds,
    fetchMyShowcase,
    setToastMessage,
  } = useShowcaseStore();

  const [isPublic, setIsPublic] = useState(user.isPublic ?? true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dangerAction, setDangerAction] = useState<'workspace' | 'account' | null>(null);
  const [isProcessingDangerAction, setIsProcessingDangerAction] = useState(false);
  const [dangerError, setDangerError] = useState<string | null>(null);

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

  const closeDangerModal = () => {
    if (isProcessingDangerAction) return;
    setDangerAction(null);
    setDangerError(null);
  };

  const handleResetWorkspace = async () => {
    setIsProcessingDangerAction(true);
    setDangerError(null);
    try {
      await resetWorkspaceApi();
      await fetchMyShowcase();
      setDangerAction(null);
      setToastMessage('작업 공간을 초기화했습니다. Steam 보유 게임과 업적은 유지됩니다.');
    } catch (err: unknown) {
      setDangerError(
        getErrorMessage(err, '작업 공간을 초기화하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.')
      );
    } finally {
      setIsProcessingDangerAction(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsProcessingDangerAction(true);
    setDangerError(null);
    try {
      await deleteAccount();
      setDangerAction(null);
      onClose?.();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setDangerError(
        getErrorMessage(err, '회원 탈퇴를 완료하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.')
      );
    } finally {
      setIsProcessingDangerAction(false);
    }
  };

  return (
    <div className="space-y-7 text-[var(--text-primary)]">
      {syncStatus && (
        <div
          className={`rounded-lg p-4 text-sm ${
            isCooldownActive
              ? 'bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-200'
              : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] text-[var(--text-primary)]'
          }`}
        >
          {syncStatus}
        </div>
      )}

      {/* 1. 공개 설정 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-[var(--text-primary)]">
            쇼케이스 공개 범위
          </label>
          {isUpdatingVisibility && (
            <span className="animate-pulse text-xs text-[var(--text-secondary)]">
              저장 중...
            </span>
          )}
          {saveSuccess && !isUpdatingVisibility && (
            <span className="animate-in fade-in text-xs font-medium text-emerald-500">
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
            className={`relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md py-3 text-sm transition-colors duration-200 ${
              isPublic
                ? 'toggle-item-active'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>공개</span>
          </button>
          <button
            type="button"
            disabled={isUpdatingVisibility}
            onClick={() => handleToggleVisibility(false)}
            className={`relative z-10 flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md py-3 text-sm transition-colors duration-200 ${
              !isPublic
                ? 'toggle-item-active'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>비공개</span>
          </button>
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          {isPublic
            ? '누구나 ㅎ쇼케이스 공유 링크를 통해 열람할 수 있습니다.'
            : '나만이 내 쇼케이스에 접근할 수 있습니다.'}
        </p>
      </div>

      {/* 2. 스팀 계정 연동 & 라이브러리 동기화 */}
      <div className="flex items-center justify-between gap-6 border-t border-[var(--border-subtle)] pt-5">
        <div className="space-y-1">
          <label className="block text-sm font-bold text-[var(--text-primary)]">
            스팀 데이터 동기화
          </label>
          <p className="text-xs text-[var(--text-secondary)]">
            스팀 프로필 및 게임 라이브러리를 동기화합니다.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={`shrink-0 border px-4 py-2 text-sm font-medium transition-all ${
            isCooldownActive
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 cursor-not-allowed'
              : ''
          }`}
          onClick={handleSyncSteam}
          disabled={isCooldownActive}
          isLoading={isSyncingGames}
          leftIcon={
            <RefreshCw
              className={`h-4 w-4 ${
                isCooldownActive ? 'text-amber-500' : 'text-[var(--primary-accent)]'
              }`}
            />
          }
        >
          {isCooldownActive
            ? `${formattedCooldown}`
            : '동기화'}
        </Button>
      </div>

      {/* 3. 데이터 관리 */}
      <div className="space-y-4 border-t border-[var(--border-subtle)] pt-5">
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">데이터 관리</h4>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            작업 공간 초기화와 회원 탈퇴는 삭제 범위가 다릅니다. 내용을 확인한 뒤 진행해 주세요.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setDangerError(null);
              setDangerAction('workspace');
            }}
            className="group flex min-h-28 cursor-pointer flex-col items-start justify-between rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-left transition-colors hover:border-amber-500/45 hover:bg-amber-500/10 active:scale-[0.99]"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="text-sm font-bold text-amber-700 dark:text-amber-300">작업 공간 초기화</span>
              <RotateCcw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </span>
            <span className="text-xs leading-relaxed text-[var(--text-secondary)]">
              폴더와 배치한 게임만 비웁니다. Steam 보유 게임은 유지됩니다.
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDangerError(null);
              setDangerAction('account');
            }}
            className="group flex min-h-28 cursor-pointer flex-col items-start justify-between rounded-xl border border-red-500/25 bg-red-500/5 p-4 text-left transition-colors hover:border-red-500/45 hover:bg-red-500/10 active:scale-[0.99]"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="text-sm font-bold text-red-600 dark:text-red-300">회원 탈퇴</span>
              <Trash2 className="h-5 w-5 text-red-500" />
            </span>
            <span className="text-xs leading-relaxed text-[var(--text-secondary)]">
              계정 연동과 모든 사용자 데이터를 삭제합니다. 되돌릴 수 없습니다.
            </span>
          </button>
        </div>
      </div>

      <Modal
        isOpen={dangerAction !== null}
        onClose={closeDangerModal}
        title={dangerAction === 'workspace' ? '작업 공간을 초기화할까요?' : '정말 회원 탈퇴할까요?'}
        maxWidth="sm"
        zIndex={80}
      >
        <div className="space-y-5">
          <div
            className={`rounded-xl border p-4 ${
              dangerAction === 'workspace'
                ? 'border-amber-500/25 bg-amber-500/5'
                : 'border-red-500/25 bg-red-500/5'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  dangerAction === 'workspace'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                    : 'bg-red-500/15 text-red-500 dark:text-red-300'
                }`}
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {dangerAction === 'workspace'
                    ? '모든 폴더와 폴더에 배치한 게임이 삭제됩니다.'
                    : 'SteamFolder의 사용자 데이터가 모두 삭제됩니다.'}
                </p>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {dangerAction === 'workspace'
                    ? 'Steam 보유 게임과 업적 데이터는 유지되며, 초기화 후 빈 쇼케이스로 돌아갑니다.'
                    : '폴더, 보유 게임·업적, 좋아요, 피드백과 로그인 정보가 삭제됩니다. 같은 Steam 계정으로 다시 로그인해도 신규 상태로 시작합니다.'}
                </p>
              </div>
            </div>
          </div>

          {dangerError && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-600 dark:text-red-300">
              {dangerError}
            </div>
          )}

          <div className="flex justify-end gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={closeDangerModal}
              disabled={isProcessingDangerAction}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={dangerAction === 'workspace' ? handleResetWorkspace : handleDeleteAccount}
              isLoading={isProcessingDangerAction}
            >
              {dangerAction === 'workspace' ? '초기화하기' : '회원 탈퇴'}
            </Button>
          </div>
        </div>
      </Modal>
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
      title={<h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">설정</h3>}
      maxWidth="xl"
    >
      <ShowcaseSettingsForm
        key={`${user.id}-${user.isPublic}`}
        user={user}
        onClose={onClose}
      />
    </Modal>
  );
};
