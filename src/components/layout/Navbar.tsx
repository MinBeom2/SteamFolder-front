import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { Button } from '@/components/common/Button';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';
import {
  FolderKanban,
  Search,
  Settings,
  Share2,
  Plus,
  LogOut,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const {
    searchQuery,
    setSearchQuery,
    setSettingsModalOpen,
    setAddGameModalOpen,
  } = useShowcaseStore();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0e14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] group-hover:scale-105 group-hover:border-[#00F0FF] transition-all">
            <FolderKanban className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
            SteamFolder
          </span>
        </Link>

        {/* Center: Search Bar (When logged in) */}
        {isAuthenticated && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="내 보관함에서 검색"
                className="w-full pl-8 pr-4 py-1.5 bg-[#090d14] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] transition-all"
              />
            </div>
          </div>
        )}

        {/* Right: Actions & Auth State */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <>
              {/* Add Game Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddGameModalOpen(true)}
                className="text-xs text-slate-300 border border-slate-800 hover:border-slate-700 bg-[#121620]"
                leftIcon={<Plus className="w-3.5 h-3.5 text-[#00F0FF]" />}
              >
                게임 추가
              </Button>

              {/* Settings Icon Button */}
              <button
                type="button"
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 rounded-lg bg-[#121620] border border-slate-800 text-slate-300 hover:text-white hover:border-[#00F0FF]/50 transition-colors cursor-pointer"
                title="쇼케이스 설정"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Showcase Share Button */}
              <Link to="/guest">
                <Button
                  variant="steam"
                  size="sm"
                  className="text-xs font-semibold px-3.5"
                  leftIcon={<Share2 className="w-3.5 h-3.5" />}
                >
                  쇼케이스 공유
                </Button>
              </Link>

              {/* User Profile Avatar & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <img
                  src={
                    user.avatarUrl ||
                    'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
                  }
                  alt={user.username}
                  className="w-7 h-7 rounded-full ring-1 ring-[#00F0FF]/50 object-cover"
                />
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                  {user.username}
                </span>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            /* Unauthenticated Navbar State */
            <SteamLoginButton size="sm" />
          )}
        </div>
      </div>
    </header>
  );
};
