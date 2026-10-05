import React, { useState } from 'react';
import type { CanvasItem, FolderResponse } from '@/types/showcase';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

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
  const previewCount = previewGames.length;

  const openFolder = () => {
    if (onOpen) onOpen();
    else navigate(`/folders/${folder.id}`);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isReadOnly || window.matchMedia('(pointer: coarse)').matches) openFolder();
    else selectItem(`FOLDER_${folder.id}`, e.ctrlKey || e.metaKey || e.shiftKey);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFolder();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    selectItem(`FOLDER_${folder.id}`, false);
    openContextMenu(e.clientX, e.clientY, 'FOLDER', item);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openFolder();
    } else if (!isReadOnly && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      selectItem(`FOLDER_${folder.id}`, false);
      openContextMenu(rect.left + rect.width / 2, rect.bottom, 'FOLDER', item);
    }
  };

  const handleMoreClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    selectItem(`FOLDER_${folder.id}`, false);
    openContextMenu(rect.right, rect.bottom, 'FOLDER', item);
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
      onContextMenu={handleContextMenu}
      className={`group relative flex w-full max-w-48 select-none flex-col items-start p-1 transition-[transform,background-color,outline-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSelected
          ? 'bg-[var(--selection-bg)] outline outline-1 outline-[var(--selection-border)]'
          : isDragOver
          ? 'scale-[1.025] bg-emerald-500/10 outline outline-1 outline-emerald-400'
          : 'hover:scale-[1.025]'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onKeyDown={handleKeyDown}
        aria-label={`${folder.name} 폴더 열기`}
        aria-pressed={isReadOnly ? undefined : isSelected}
        className="flex w-full cursor-pointer flex-col items-center gap-3 text-left"
      >
      {/* Folder Shape Container */}
      <div className="relative aspect-[4/3] w-full shrink-0">
        {/* Folder Top Tab */}
        <div className="absolute -top-1 left-2 h-3 w-[30%] rounded-t-[2px] border-x border-t border-[var(--border-card)] bg-[var(--folder-top-bg)] transition-colors group-hover:border-[var(--primary-accent)]" />

        {/* Folder Body */}
        <div className="absolute inset-0 flex min-h-0 flex-col justify-center rounded-[2px] border border-[var(--border-card)] bg-[var(--folder-body-bg)] p-2 transition-colors duration-300 group-hover:border-[var(--primary-accent)]">
          {/* Keep the folder silhouette stable and Steam covers at their original ratio. */}
          <div
            className={`grid h-full min-h-0 w-full gap-1 overflow-hidden ${
              previewCount === 0 ? 'border border-[var(--border-subtle)] bg-[var(--folder-inner-bg)] p-1' : ''
            } ${
              previewCount <= 1
                ? 'grid-cols-1 place-items-center'
                : previewCount === 2
                  ? 'grid-cols-1 grid-rows-2'
                  : 'grid-cols-2 grid-rows-2'
            }`}
          >
            {previewCount === 0 ? (
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-400/50 dark:bg-slate-500/50" />
            ) : (
              previewGames.map((game, index) => (
                <div
                  key={game.id}
                  className={`min-h-0 min-w-0 overflow-hidden ${
                    previewCount === 1 ? 'aspect-[460/215] max-h-full w-full' : 'h-full w-full'
                  } ${previewCount === 3 && index === 0 ? 'col-span-2' : ''}`}
                >
                  <img
                    src={game.headerImage}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Folder Label */}
      <div className="flex min-h-11 w-full items-center border-t border-[var(--border-subtle)] pl-1 pr-12 text-center md:min-h-0 md:px-1 md:pt-2">
        <span className="block min-w-0 w-full truncate text-center text-xs font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)]">
          {folder.name}
        </span>
      </div>
      </button>
      {!isReadOnly && (
        <button
          type="button"
          onClick={handleMoreClick}
          className="absolute bottom-0 right-0 z-10 flex h-11 w-11 items-center justify-center rounded-[3px] border border-[var(--border-card)] bg-[var(--bg-surface)] text-[var(--text-primary)] md:hidden"
          aria-label={`${folder.name} 폴더 메뉴`}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
