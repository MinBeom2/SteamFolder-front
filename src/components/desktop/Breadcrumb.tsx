import React, { useState } from 'react';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { ChevronRight, Home, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbProps {
  isReadOnly?: boolean;
  basePath?: string;
  trail?: Array<{ id: number | null; name: string }>;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  isReadOnly = false,
  basePath,
  trail,
}) => {
  const navigate = useNavigate();
  const {
    breadcrumbTrail,
    moveFolder,
    moveGameToFolder,
  } = useShowcaseStore();

  const activeTrail = trail || breadcrumbTrail;
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleClickCrumb = (crumbId: number | null) => {
    if (basePath) {
      if (crumbId === null) {
        navigate(basePath);
      } else {
        navigate(`${basePath}/folders/${crumbId}`);
      }
    } else {
      if (crumbId === null) {
        navigate('/');
      } else {
        navigate(`/folders/${crumbId}`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverIdx(idx);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIdx(null);
  };

  const handleDrop = async (e: React.DragEvent, idx: number) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverIdx(null);

    const targetBreadcrumb = activeTrail[idx];
    const targetFolderId = targetBreadcrumb.id;

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type === 'GAME') {
        if (targetFolderId === null) {
          alert('게임은 루트 바탕화면이 아닌 폴더 안으로만 이동할 수 있습니다.');
          return;
        }
        await moveGameToFolder(data.id, targetFolderId);
      } else if (data.type === 'FOLDER' && data.id !== targetFolderId) {
        await moveFolder(data.id, targetFolderId);
      }
    } catch (err) {
      console.error('Failed to drop onto breadcrumb:', err);
    }
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-6 flex-wrap select-none">
      {activeTrail.map((crumb, idx) => {
        const isLast = idx === activeTrail.length - 1;
        const isDragOver = dragOverIdx === idx;

        return (
          <React.Fragment key={`${crumb.id ?? 'root'}-${idx}`}>
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            )}

            <button
              type="button"
              onClick={() => handleClickCrumb(crumb.id)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                isLast
                  ? 'crumb-active font-semibold shadow-xs bg-[#ebf2f7] text-[#1a5b8c] border border-[#c6d8e6] dark:bg-[#66c0f4]/15 dark:text-[#66c0f4] dark:border-[#66c0f4]/35'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-primary)]'
              } ${isDragOver ? 'ring-2 ring-emerald-400 bg-emerald-500/20' : ''}`}
            >
              {idx === 0 ? (
                <Home className="w-3.5 h-3.5" />
              ) : (
                <Folder className={`w-3.5 h-3.5 ${isLast ? 'text-current' : 'text-slate-400'}`} />
              )}
              <span>{crumb.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
