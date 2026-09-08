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
      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg cursor-pointer select-none transition-all duration-200 group ${
        isSelected
          ? 'ring-2 ring-[#2a475e] bg-[#1e3a5f]/25 scale-105'
          : 'hover:scale-105 hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      {/* Game Card Container - Official Steam Header Aspect Ratio (460:215) */}
      <div className="relative w-36 sm:w-44 aspect-[460/215] rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] p-1 shadow-sm group-hover:border-[#2a475e] transition-all overflow-hidden">
        <div className="w-full h-full rounded-md overflow-hidden bg-[#07090e]">
          <img
            src={game.headerImage}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      </div>

      {/* Card Info */}
      <div className="text-center max-w-[160px] w-full px-1">
        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[#66c0f4] transition-colors">
          {game.name}
        </h4>
        {game.genres && game.genres.length > 0 && (
          <p className="text-[10px] text-[var(--text-secondary)] font-medium truncate">
            {game.genres.slice(0, 2).join(' • ')}
          </p>
        )}
      </div>
    </div>
  );
};
