import React from 'react';
import type { FolderItem } from '@/types/showcase';

interface FolderCardProps {
  folder: FolderItem;
  onClick: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({ folder, onClick }) => {
  const borderColor = folder.color || '#00F0FF';

  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 p-3 rounded-2xl cursor-pointer group transition-all duration-200 select-none hover:scale-105"
    >
      {/* Folder Shape Container */}
      <div className="relative w-28 h-24 flex items-center justify-center">
        {/* Folder Top Tab */}
        <div
          className="absolute -top-1 left-2 w-10 h-3 rounded-t-md bg-[#131926] border-t border-l border-r border-slate-700/80 transition-colors"
          style={{ borderColor: `${borderColor}55` }}
        />

        {/* Folder Body */}
        <div
          className="relative w-full h-full bg-[#101520]/90 rounded-xl border-2 p-2.5 flex flex-col justify-center shadow-lg transition-all duration-200 group-hover:shadow-[0_0_20px_var(--glow-color)]"
          style={
            {
              borderColor: borderColor,
              '--glow-color': `${borderColor}40`,
            } as React.CSSProperties
          }
        >
          {/* 2x2 Inner Grid Slots */}
          <div className="grid grid-cols-2 gap-1.5 w-full h-full p-1 bg-[#090d14]/60 rounded-lg">
            <div className="bg-[#242e42]/80 rounded-[4px] border border-white/5" />
            <div className="bg-[#242e42]/80 rounded-[4px] border border-white/5" />
            <div className="bg-[#242e42]/80 rounded-[4px] border border-white/5" />
            <div className="bg-[#242e42]/80 rounded-[4px] border border-white/5" />
          </div>
        </div>
      </div>

      {/* Folder Label */}
      <span className="text-xs font-semibold text-slate-200 text-center tracking-tight group-hover:text-white max-w-[120px] truncate">
        {folder.name}
      </span>
    </div>
  );
};
