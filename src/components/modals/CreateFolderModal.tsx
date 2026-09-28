import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { getErrorMessage } from '@/utils/error';

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

  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
    }
  }, [isOpen]);

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
      const msg = getErrorMessage(err, '폴더 생성에 실패했습니다.');
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentFolder ? `새 폴더 만들기` : '새 폴더 만들기'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* 1. 폴더 이름 */}
        <div className="space-y-1.5">
          <label htmlFor="create-folder-name" className="block text-sm font-bold text-[var(--text-primary)]">
            폴더 이름
          </label>
          <input
            id="create-folder-name"
            type="text"
            aria-invalid={Boolean(error)}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 갓겜, 추천 게임 등"
            maxLength={100}
            autoFocus
            className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2a475e] focus:ring-1 focus:ring-[#2a475e] transition-all"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="cyan"
            size="sm"
            isLoading={isSubmitting}
            className="px-5 text-xs font-semibold"
          >
            폴더 생성
          </Button>
        </div>
      </form>
    </Modal>
  );
};
