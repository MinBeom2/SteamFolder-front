import React, { useState } from 'react';
import type { CanvasItem, FolderResponse } from '@/types/showcase';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useNavigate } from 'react-router-dom';

interface FolderCardProps {
  item: CanvasItem;
  folder: FolderResponse;
  isSelected?: boolean;
  onOpen?: () => void;
  isReadOnly?: boolean;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  item,
  folder,
  isSelected = false,
  onOpen,
  isReadOnly = false,
}) => {
  const navigate = useNavigate();
  const {
    openContextMenu,
    selectItem,
    moveGameToFolder,
    moveFolder,
  } = useShowcaseStore();

  const [isDragOver, setIsDragOver] = useState(false);

  // Get up to 4 preview thumbnails from games inside folder
  const previewGames = (folder.games || []).slice(0, 4);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly) {
      selectItem(`FOLDER_${folder.id}`, e.ctrlKey || e.metaKey || e.shiftKey);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpen) {
      onOpen();
    } else {
      navigate(`/folders/${folder.id}`);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    selectItem(`FOLDER_${folder.id}`, false);
    openContextMenu(e.clientX, e.clientY, 'FOLDER', item);
  };

  // Drag Source
  const handleDragStart = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'FOLDER',
        id: folder.id,
        sourceX: folder.positionX,
        sourceY: folder.positionY,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drop Target (Moving items inside this folder or swapping slots)
  const handleDragOver = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type === 'GAME') {
        await moveGameToFolder(data.id, folder.id);
      } else if (data.type === 'FOLDER' && data.id !== folder.id) {
        await moveFolder(data.id, folder.id);
      }
    } catch (err) {
      console.error('Failed to drop item into folder:', err);
    }
  };

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`relative flex flex-col items-center gap-2 p-2 rounded-lg cursor-pointer select-none transition-all duration-200 group ${
        isSelected
          ? 'ring-2 ring-[#2a475e] bg-[#1e3a5f]/25 scale-105'
          : isDragOver
          ? 'ring-2 ring-emerald-400 bg-emerald-500/20 scale-110'
          : 'hover:scale-105 hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      {/* Folder Shape Container */}
      <div className="relative w-28 h-24 flex items-center justify-center">
        {/* Folder Top Tab */}
        <div className="absolute -top-1 left-2 w-10 h-3 rounded-t-sm bg-[var(--folder-top-bg)] border-t border-l border-r border-[#2a475e]/80 transition-colors group-hover:border-[#3d678d]" />

        {/* Folder Body */}
        <div className="relative w-full h-full bg-[var(--folder-body-bg)] rounded-lg border-2 border-[#2a475e] p-2 flex flex-col justify-center shadow-md transition-all duration-200 group-hover:border-[#3d678d]">
          {/* 2x2 Inner Grid Slots for Mini Thumbnails */}
          <div className="grid grid-cols-2 gap-1 w-full h-full p-1 bg-[var(--folder-inner-bg)] rounded-md overflow-hidden border border-[var(--border-subtle)]">
            {[0, 1, 2, 3].map((slotIdx) => {
              const game = previewGames[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className="w-full h-full bg-[var(--folder-slot-bg)] rounded-[3px] overflow-hidden border border-[var(--border-subtle)] flex items-center justify-center"
                >
                  {game ? (
                    <img
                      src={game.headerImage}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 opacity-50" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Folder Label */}
      <div className="text-center max-w-[130px]">
        <span className="text-xs font-bold text-[var(--text-primary)] block truncate group-hover:text-[#66c0f4] transition-colors">
          {folder.name}
        </span>
      </div>
    </div>
  );
};
