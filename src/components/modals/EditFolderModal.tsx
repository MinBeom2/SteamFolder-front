import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import type { FolderResponse } from '@/types/showcase';
import { Trash2 } from 'lucide-react';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditFolderFormProps {
  folder: FolderResponse;
  onClose: () => void;
}

const EditFolderForm: React.FC<EditFolderFormProps> = ({ folder, onClose }) => {
  const { updateFolder, deleteFolder } = useShowcaseStore();

  const [name, setName] = useState(folder.name || '');
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
      // Keep default Steam Dark Blue theme
      await updateFolder(folder.id, name.trim(), '#2a475e', folder.icon || 'folder');
      onClose();
    } catch (err: unknown) {
      console.error('Failed to update folder:', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || '폴더 정보 수정에 실패했습니다.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `'${folder.name}' 폴더와 하위 모든 내용을 정말 삭제하시겠습니까?`
      )
    ) {
      try {
        await deleteFolder(folder.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete folder:', err);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* 1. 폴더 이름 */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[var(--text-primary)]">
          폴더 이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="폴더 이름 입력"
          maxLength={100}
          autoFocus
          className="w-full px-3.5 py-2.5 bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2a475e] focus:ring-1 focus:ring-[#2a475e] transition-all"
        />
      </div>

      {/* Footer with Delete & Save */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 py-1.5 px-2 rounded-lg hover:bg-red-500/10 active:scale-[0.98] transition-colors cursor-pointer font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>폴더 삭제</span>
        </button>

        <div className="flex items-center gap-2.5">
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
            변경사항 저장
          </Button>
        </div>
      </div>
    </form>
  );
};

export const EditFolderModal: React.FC<EditFolderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { editingFolder } = useShowcaseStore();

  if (!editingFolder) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="폴더 정보 수정"
      maxWidth="md"
    >
      <EditFolderForm
        key={editingFolder.id}
        folder={editingFolder}
        onClose={onClose}
      />
    </Modal>
  );
};
