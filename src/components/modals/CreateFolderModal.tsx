import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { Check } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Dark', hex: '#1A1B26' },
  { name: 'Cyan', hex: '#00F0FF' },
  { name: 'Purple', hex: '#9D4EDD' },
  { name: 'Green', hex: '#00E676' },
  { name: 'Red', hex: '#FF5252' },
  { name: 'Amber', hex: '#FFA000' },
];

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createFolder, currentFolder } = useShowcaseStore();

  const [name, setName] = useState('');
  const [themeColor, setThemeColor] = useState('#00F0FF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('폴더 이름을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createFolder(name.trim(), themeColor, 'folder');
      setName('');
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create folder:', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || '폴더 생성에 실패했습니다.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentFolder ? `하위 폴더 만들기 (${currentFolder.name} 내)` : '새 폴더 만들기'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        {/* 1. 폴더 이름 */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            폴더 이름 <span className="text-[#00F0FF]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 소울라이크 모음, 2026 베스트 등"
            maxLength={100}
            autoFocus
            className="w-full px-3.5 py-2.5 bg-[#090d14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#2a475e] focus:ring-1 focus:ring-[#2a475e] transition-all"
          />
        </div>

        {/* 2. 테마 컬러 */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            폴더 테마 색상
          </label>
          <div className="flex items-center gap-3">
            {PRESET_COLORS.map((preset) => {
              const isSelected = themeColor === preset.hex;
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setThemeColor(preset.hex)}
                  className={`w-7 h-7 rounded-full transition-transform duration-150 cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'scale-110 ring-2 ring-offset-2 ring-offset-[#121620] ring-[#2a475e]'
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
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="cyan"
            size="sm"
            isLoading={isSubmitting}
            className="px-6 text-xs font-bold"
          >
            폴더 생성
          </Button>
        </div>
      </form>
    </Modal>
  );
};
