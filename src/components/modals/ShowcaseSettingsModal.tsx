import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import type { User } from '@/types/auth';
import { RefreshCw } from 'lucide-react';

interface ShowcaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShowcaseSettingsFormProps {
  user: User;
  onClose: () => void;
}

const ShowcaseSettingsForm: React.FC<ShowcaseSettingsFormProps> = ({
  user,
  onClose,
}) => {
  const { updateVisibility, deleteAccount, isLoading } = useAuthStore();
  const { syncGames, isSyncingGames, cooldownSeconds } = useShowcaseStore();

  const [isPublic, setIsPublic] = useState(user.isPublic ?? true);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const isCooldownActive = cooldownSeconds > 0;
  const cooldownMin = Math.floor(cooldownSeconds / 60);
  const cooldownSec = cooldownSeconds % 60;
  const formattedCooldown = `${cooldownMin}분 ${
    cooldownSec < 10 ? '0' + cooldownSec : cooldownSec
  }초`;

  const handleSave = async () => {
    try {
      await updateVisibility(isPublic);
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
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
      onClose();
    }
  };

  return (
    <div className="space-y-6">
      {syncStatus && (
        <div
          className={`p-3 rounded-xl text-xs ${
            isCooldownActive
              ? 'bg-amber-950/50 border border-amber-800/60 text-amber-200'
              : 'bg-[#121b28] border border-[#2a475e] text-slate-200'
          }`}
        >
          {syncStatus}
        </div>
      )}

      {/* 1. 공개 설정 */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300">
          쇼케이스 공개 범위
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#090d14] rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setIsPublic(true)}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              isPublic
                ? 'bg-[#1b2838] text-white border border-[#2a475e] shadow-[0_0_12px_rgba(42,71,94,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            공개
          </button>
          <button
            type="button"
            onClick={() => setIsPublic(false)}
            className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              !isPublic
                ? 'bg-[#1b2838] text-white border border-[#2a475e] shadow-[0_0_12px_rgba(42,71,94,0.4)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            비공개
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          {isPublic
            ? '누구나 내 쇼케이스 링크를 통해 라이브러리를 열람할 수 있습니다.'
            : '나만 내 쇼케이스에 접근하고 편집할 수 있습니다.'}
        </p>
      </div>

      {/* 2. 스팀 계정 연동 & 라이브러리 동기화 */}
      <div className="space-y-3 pt-2 border-t border-slate-800/60">
        <label className="block text-xs font-semibold text-slate-300">
          스팀 데이터 동기화
        </label>
        <Button
          type="button"
          variant="secondary"
          className={`w-full py-2.5 text-xs font-medium border transition-all ${
            isCooldownActive
              ? 'bg-amber-950/30 border-amber-800/60 text-amber-300 cursor-not-allowed'
              : 'bg-[#1e293b]/70 border-slate-700/70 hover:bg-[#283548] text-slate-200'
          }`}
          onClick={handleSyncSteam}
          disabled={isCooldownActive}
          isLoading={isSyncingGames}
          leftIcon={
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isCooldownActive ? 'text-amber-400' : 'text-[#66c0f4]'
              }`}
            />
          }
        >
          {isCooldownActive
            ? `동기화 쿨다운 중 (${formattedCooldown})`
            : '스팀 프로필 & 라이브러리 동기화 (API)'}
        </Button>
      </div>

      {/* 3. 계정 삭제 */}
      <div className="pt-2 border-t border-slate-800/60 text-center">
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors cursor-pointer"
        >
          계정 삭제 및 스팀 연동 해제
        </button>
      </div>

      {/* Modal Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          취소
        </Button>
        <Button
          type="submit"
          variant="cyan"
          size="sm"
          onClick={handleSave}
          isLoading={isLoading}
          className="px-6 text-xs font-bold"
        >
          저장
        </Button>
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
      title="쇼케이스 설정"
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
