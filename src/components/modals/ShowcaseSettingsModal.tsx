import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { Check, RefreshCw } from 'lucide-react';

interface ShowcaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_THEME_COLORS = [
  { name: 'Dark', hex: '#1A1B26' },
  { name: 'Cyan', hex: '#00F0FF' },
  { name: 'Purple', hex: '#9D4EDD' },
  { name: 'Green', hex: '#00E676' },
  { name: 'Red', hex: '#FF5252' },
  { name: 'Amber', hex: '#FFA000' },
];

export const ShowcaseSettingsModal: React.FC<ShowcaseSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, updateProfile, updateVisibility, deleteAccount, isLoading } = useAuthStore();
  const { syncGames, isSyncingGames, cooldownSeconds } = useShowcaseStore();

  const [isPublic, setIsPublic] = useState(true);
  const [selectedColor, setSelectedColor] = useState('#00F0FF');
  const [hexInput, setHexInput] = useState('00F0FF');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const isCooldownActive = cooldownSeconds > 0;
  const cooldownMin = Math.floor(cooldownSeconds / 60);
  const cooldownSec = cooldownSeconds % 60;
  const formattedCooldown = `${cooldownMin}분 ${
    cooldownSec < 10 ? '0' + cooldownSec : cooldownSec
  }초`;

  useEffect(() => {
    if (user) {
      setIsPublic(user.isPublic ?? true);
      const color = user.themeColor || '#00F0FF';
      setSelectedColor(color);
      setHexInput(color.replace('#', ''));
    }
  }, [user, isOpen]);

  const handleColorSelect = (hex: string) => {
    setSelectedColor(hex);
    setHexInput(hex.replace('#', ''));
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setHexInput(val);
    if (/^[0-9A-F]{6}$/i.test(val)) {
      setSelectedColor(`#${val}`);
    }
  };

  const handleSave = async () => {
    try {
      const fullHex = `#${hexInput.replace('#', '')}`;
      await updateVisibility(isPublic);
      await updateProfile({ themeColor: fullHex });
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="쇼케이스 설정"
      maxWidth="md"
    >
      <div className="space-y-6">
        {syncStatus && (
          <div
            className={`p-3 rounded-xl text-xs ${
              isCooldownActive
                ? 'bg-amber-950/50 border border-amber-800/60 text-amber-200'
                : 'bg-sky-950/60 border border-[#00F0FF]/40 text-[#00F0FF]'
            }`}
          >
            {syncStatus}
          </div>
        )}

        {/* 1. 공개 설정 */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            공개 설정
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#090d14] rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isPublic
                  ? 'bg-[#15202b] text-[#00F0FF] border border-[#00F0FF]/60 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isPublic
                  ? 'bg-[#15202b] text-[#00F0FF] border border-[#00F0FF]/60 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Private
            </button>
          </div>
        </div>

        {/* 2. 테마 컬러 */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            테마 컬러
          </label>
          {/* Preset Circles */}
          <div className="flex items-center gap-3.5">
            {PRESET_THEME_COLORS.map((preset) => {
              const isSelected =
                selectedColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => handleColorSelect(preset.hex)}
                  className={`w-7 h-7 rounded-full transition-transform duration-150 cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'scale-110 ring-2 ring-offset-2 ring-offset-[#121620] ring-[#00F0FF]'
                      : 'hover:scale-105 border border-white/20'
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                >
                  {isSelected && (
                    <Check
                      className={`w-3.5 h-3.5 ${
                        preset.hex === '#1A1B26' ? 'text-white' : 'text-black font-bold'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Hex Input */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#090d14] border border-slate-800 rounded-xl">
            <span className="text-slate-500 font-mono text-sm">#</span>
            <input
              type="text"
              maxLength={6}
              value={hexInput}
              onChange={handleHexInputChange}
              className="w-full bg-transparent text-sm font-mono text-slate-100 uppercase focus:outline-none tracking-wider"
              placeholder="00F0FF"
            />
            <div
              className="w-4 h-4 rounded-full shrink-0 border border-white/20"
              style={{ backgroundColor: selectedColor }}
            />
          </div>
        </div>

        {/* 3. 계정 행동 */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-slate-300">
            계정 행동
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
                  isCooldownActive ? 'text-amber-400' : 'text-slate-300'
                }`}
              />
            }
          >
            {isCooldownActive
              ? `동기화 쿨다운 중 (${formattedCooldown})`
              : '스팀 프로필 & 라이브러리 동기화 (API)'}
          </Button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="text-xs text-red-500 hover:text-red-400 font-medium transition-colors cursor-pointer"
            >
              계정 삭제
            </button>
          </div>
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
            type="button"
            variant="cyan"
            size="sm"
            onClick={handleSave}
            isLoading={isLoading}
            className="px-6 text-xs font-bold"
          >
            저장하기
          </Button>
        </div>
      </div>
    </Modal>
  );
};
