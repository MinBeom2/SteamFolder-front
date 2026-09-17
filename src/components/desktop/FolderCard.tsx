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
      className={`group relative flex w-full max-w-[150px] cursor-pointer select-none flex-col items-start gap-3 p-1 transition-[transform,background-color,outline-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSelected
          ? 'bg-[var(--selection-bg)] outline outline-1 outline-[var(--selection-border)]'
          : isDragOver
          ? 'scale-[1.025] bg-emerald-500/10 outline outline-1 outline-emerald-400'
          : 'hover:scale-[1.025]'
      }`}
    >
      {/* Folder Shape Container */}
      <div className="relative flex h-24 w-full items-center justify-center">
        {/* Folder Top Tab */}
        <div className="absolute -top-1 left-2 h-3 w-11 rounded-t-[2px] border-x border-t border-[var(--border-card)] bg-[var(--folder-top-bg)] transition-colors group-hover:border-[var(--primary-accent)]" />

        {/* Folder Body */}
        <div className="relative flex h-full w-full flex-col justify-center rounded-[2px] border border-[var(--border-card)] bg-[var(--folder-body-bg)] p-2 transition-colors duration-300 group-hover:border-[var(--primary-accent)]">
          {/* 2x2 Inner Grid Slots for Mini Thumbnails */}
          <div className="grid h-full w-full grid-cols-2 gap-1 overflow-hidden border border-[var(--border-subtle)] bg-[var(--folder-inner-bg)] p-1">
            {[0, 1, 2, 3].map((slotIdx) => {
              const game = previewGames[slotIdx];
              return (
                <div
                  key={slotIdx}
                  className="flex h-full w-full items-center justify-center overflow-hidden border border-[var(--border-subtle)] bg-[var(--folder-slot-bg)]"
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
      <div className="flex w-full items-center justify-center px-1">
        <span className="block min-w-0 truncate text-center text-xs font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)]">
          {folder.name}
        </span>
      </div>
    </div>
  );
};
