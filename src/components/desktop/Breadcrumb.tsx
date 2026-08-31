import React, { useState } from 'react';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { ChevronRight, Home, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BreadcrumbProps {
  isReadOnly?: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ isReadOnly = false }) => {
  const navigate = useNavigate();
  const {
    breadcrumbTrail,
    moveFolder,
    moveGameToFolder,
  } = useShowcaseStore();

  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleClickCrumb = (crumbId: number | null) => {
    if (crumbId === null) {
      navigate('/');
    } else {
      navigate(`/folders/${crumbId}`);
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

    const targetBreadcrumb = breadcrumbTrail[idx];
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
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6 flex-wrap select-none">
      {breadcrumbTrail.map((crumb, idx) => {
        const isLast = idx === breadcrumbTrail.length - 1;
        const isDragOver = dragOverIdx === idx;

        return (
          <React.Fragment key={crumb.id ?? 'root'}>
            {idx > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}

            <button
              type="button"
              onClick={() => handleClickCrumb(crumb.id)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                isLast
                  ? 'bg-[#15202b] text-[#00F0FF] font-bold border border-[#00F0FF]/40 shadow-sm'
                  : 'hover:bg-white/5 hover:text-slate-200'
              } ${isDragOver ? 'ring-2 ring-emerald-400 bg-emerald-500/20' : ''}`}
            >
              {idx === 0 ? (
                <Home className="w-3.5 h-3.5" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-[#00F0FF]" />
              )}
              <span>{crumb.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
