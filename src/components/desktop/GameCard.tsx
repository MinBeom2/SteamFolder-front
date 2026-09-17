import React from 'react';
import type { CanvasItem, FolderGameDto } from '@/types/showcase';
import { useShowcaseStore } from '@/store/useShowcaseStore';

interface GameCardProps {
  item: CanvasItem;
  game: FolderGameDto;
  isSelected?: boolean;
  isReadOnly?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  item,
  game,
  isSelected = false,
  isReadOnly = false,
}) => {
  const { openContextMenu, selectItem, openGameDetailModal } = useShowcaseStore();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isReadOnly) {
      selectItem(`GAME_${game.id}`, e.ctrlKey || e.metaKey || e.shiftKey);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (game.appId) {
      openGameDetailModal({
        appId: game.appId,
        name: game.name,
        headerImage: game.headerImage,
        genres: game.genres,
        playtimeForever: game.playtimeForever ?? item.playtimeForever,
        lastPlayedAt: game.lastPlayedAt ?? item.lastPlayedAt,
        totalAchievements: game.totalAchievements ?? item.totalAchievements,
        achievedAchievements: game.achievedAchievements ?? item.achievedAchievements,
        achievementRate: game.achievementRate ?? item.achievementRate,
        isReadOnly,
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    selectItem(`GAME_${game.id}`, false);
    openContextMenu(e.clientX, e.clientY, 'GAME', item);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isReadOnly) return;
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'GAME',
        id: game.id,
        appId: game.appId,
        sourceX: game.positionX,
        sourceY: game.positionY,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable={!isReadOnly}
      onDragStart={handleDragStart}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      className={`group relative flex w-full cursor-pointer select-none flex-col items-start gap-3 p-1 transition-[transform,background-color,outline-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSelected
          ? 'bg-[var(--selection-bg)] outline outline-1 outline-[var(--selection-border)]'
          : 'hover:scale-[1.025]'
      }`}
    >
      {/* Game Card Container - Official Steam Header Aspect Ratio (460:215) */}
      <div className="relative aspect-[460/215] w-full overflow-hidden border border-[var(--border-card)] bg-[var(--bg-card)] shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition-colors duration-300 group-hover:border-[var(--primary-accent)]">
        <div className="h-full w-full overflow-hidden bg-[#0e0f0c]">
          <img
            src={game.headerImage}
            alt={game.name}
            className="h-full w-full object-cover grayscale-[10%] transition-[filter] duration-500 group-hover:grayscale-0"
            loading="lazy"
          />
        </div>
      </div>

      {/* Card Info */}
      <div className="w-full border-t border-[var(--border-subtle)] px-1 pt-2 text-center">
        <h4 className="truncate text-center text-xs font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)]">
          {game.name}
        </h4>
      </div>
    </div>
  );
};
