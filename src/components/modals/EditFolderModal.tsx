import React, { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import type { FolderResponse } from '@/types/showcase';
import { Check, Trash2 } from 'lucide-react';

interface EditFolderModalProps {
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

interface EditFolderFormProps {
  folder: FolderResponse;
  onClose: () => void;
}

const EditFolderForm: React.FC<EditFolderFormProps> = ({ folder, onClose }) => {
  const { updateFolder, deleteFolder } = useShowcaseStore();

  const [name, setName] = useState(folder.name || '');
  const [themeColor, setThemeColor] = useState(folder.themeColor || '#00F0FF');
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
      await updateFolder(folder.id, name.trim(), themeColor, folder.icon || 'folder');
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
          placeholder="폴더 이름 입력"
          maxLength={100}
          className="w-full px-3.5 py-2.5 bg-[#090d14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] transition-all"
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
      </div>

      {/* Footer with Delete & Save */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 py-1.5 px-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
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
