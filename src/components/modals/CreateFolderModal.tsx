import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createFolder, currentFolder } = useShowcaseStore();

  const [name, setName] = useState('');
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
      // Default Steam Dark Blue Theme for all folders
      await createFolder(name.trim(), '#2a475e', 'folder');
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
            폴더 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 갓겜, 추천 게임 등"
            maxLength={100}
            autoFocus
            className="w-full px-3.5 py-2.5 bg-[#090d14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#2a475e] focus:ring-1 focus:ring-[#2a475e] transition-all"
          />
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
