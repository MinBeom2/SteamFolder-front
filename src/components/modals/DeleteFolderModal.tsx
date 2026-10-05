import React, { useEffect, useId } from 'react';
import { AlertTriangle, Folder, Trash2 } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useFolderDeletionStore } from '@/store/useFolderDeletionStore';

export const DeleteFolderModal: React.FC = () => {
  const { request, isDeleting, error, cancelDeletion, confirmDeletion, resetDeletion } = useFolderDeletionStore();
  const descriptionId = useId();

  useEffect(() => () => resetDeletion(), [resetDeletion]);

  const names = request?.folderNames || [];
  const selectedGameCount = request?.selectedGameCount || 0;

  return (
    <Modal
      isOpen={Boolean(request)}
      onClose={cancelDeletion}
      title="폴더 삭제"
      showCloseButton={false}
      maxWidth="md"
      zIndex={70}
      ariaDescribedBy={descriptionId}
    >
      <div className="space-y-5" aria-busy={isDeleting}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[3px] border border-[var(--border-card)] bg-[var(--bg-surface-elevated)] text-[var(--primary-accent)]">
            <Folder className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="break-words text-base font-semibold leading-relaxed text-[var(--text-primary)]">
              {names.length === 1 ? `“${names[0]}” 폴더를 삭제할까요?` : `선택한 폴더 ${names.length}개를 삭제할까요?`}
            </p>
            {names.length > 1 && (
              <p className="max-h-20 overflow-y-auto break-words text-xs leading-relaxed text-[var(--text-muted)]">
                {names.join(' · ')}
              </p>
            )}
          </div>
        </div>

        <div id={descriptionId} className="space-y-3">
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
            하위 폴더와 폴더에 배치된 게임도 함께 삭제됩니다.
            {selectedGameCount > 0 && (
              <span className="mt-1 block">선택한 게임 {selectedGameCount}개도 폴더에서 제거됩니다.</span>
            )}
          </p>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-red-600 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            삭제한 내용은 되돌릴 수 없습니다.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-[3px] border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Button type="button" variant="secondary" disabled={isDeleting} onClick={cancelDeletion} className="min-h-11 flex-1 sm:flex-none sm:min-w-20">
            취소
          </Button>
          <Button type="button" variant="danger" isLoading={isDeleting} onClick={() => void confirmDeletion()} leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />} className="min-h-11 flex-1 sm:flex-none sm:min-w-28">
            {isDeleting ? '삭제 중…' : '폴더 삭제'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
