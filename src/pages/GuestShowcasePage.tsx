import React from 'react';
import { Link } from 'react-router-dom';
import { GameCard } from '@/components/desktop/GameCard';
import { GuestBanner } from '@/components/layout/GuestBanner';
import { Button } from '@/components/common/Button';
import { INITIAL_GUEST_SHOWCASE } from '@/api/mockData';
import { FolderKanban, Sparkles } from 'lucide-react';

export const GuestShowcasePage: React.FC = () => {
  const showcase = INITIAL_GUEST_SHOWCASE;

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col justify-between pb-24 selection:bg-[#00F0FF]/30 selection:text-white">
      {/* Top Guest Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[#0b0e14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 font-extrabold text-sm tracking-tight text-white">
              <span>스팀폴더</span>
              <span className="text-[#00F0FF]">SteamFolder</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#121620] text-slate-300 border border-slate-700/80">
              GUEST VIEW • 읽기 전용
            </span>

            <Link to="/">
              <Button
                variant="steam"
                size="sm"
                className="text-xs font-semibold px-4"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                나도 만들기
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Showcase Area */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-12 py-16 flex-1">
        {/* Showcase Header Title */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase mb-2">
            {showcase.customTitle}
          </h1>
          <p className="text-xs text-slate-400">
            {showcase.totalFolders} folders • {showcase.totalGames} custom curated gaming collections
          </p>
        </div>

        {/* Horizontal Game Items Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {showcase.games.map((game, idx) => {
            const counts = [12, 8, 15, 6, 22, 4];
            return (
              <GameCard
                key={game.id}
                game={game}
                gameCount={counts[idx % counts.length]}
              />
            );
          })}
        </div>
      </main>

      {/* Bottom CTA Banner */}
      <GuestBanner />
    </div>
  );
};

export default GuestShowcasePage;
