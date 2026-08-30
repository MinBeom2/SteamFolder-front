import React from 'react';
import type { GameItem } from '@/types/showcase';

interface GameCardProps {
  game: GameItem;
  gameCount?: number;
  onClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  gameCount,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-2 rounded-2xl cursor-pointer group transition-all duration-200 select-none hover:scale-105"
    >
      {/* Game Card Container - Official Steam Header Aspect Ratio (460:215) */}
      <div className="relative w-36 sm:w-44 aspect-[460/215] rounded-xl bg-[#101520] border border-slate-700/80 p-1 shadow-lg group-hover:border-[#00F0FF]/80 group-hover:shadow-[0_0_16px_rgba(0,240,255,0.25)] transition-all overflow-hidden">
        <div className="w-full h-full rounded-lg overflow-hidden bg-[#07090e]">
          <img
            src={game.headerImage}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>
      </div>

      {/* Card Info */}
      <div className="text-center max-w-[160px]">
        <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-[#00F0FF] transition-colors">
          {game.name}
        </h4>
        <p className="text-[10px] text-slate-400 font-medium">
          {gameCount !== undefined
            ? `${gameCount} games`
            : `${game.playtimeHours}시간 플레이`}
        </p>
      </div>
    </div>
  );
};
