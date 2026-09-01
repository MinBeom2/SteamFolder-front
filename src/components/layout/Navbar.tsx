import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { Button } from '@/components/common/Button';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';
import {
  Settings,
  Share2,
  LogOut,
  Check,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { setSettingsModalOpen } = useShowcaseStore();

  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const handleShareClick = async () => {
    if (!user) return;
    const identifier = user.username || user.steamId;
    const shareUrl = `${window.location.origin}/showcase/${encodeURIComponent(identifier)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      navigate(`/showcase/${encodeURIComponent(identifier)}`);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07090e]/50 backdrop-blur-lg border-b border-white/5 px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Clean Typography Brand Logo */}
        <Link to="/" className="flex items-center gap-1 group cursor-pointer shrink-0">
          <span className="font-black text-lg tracking-tight text-white group-hover:text-[#00F0FF] transition-colors">
            SteamFolder
          </span>
        </Link>

        {/* Right: Actions & Auth State */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <>
              {/* Settings Icon Button */}
              <button
                type="button"
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 rounded-lg bg-[#121620] border border-slate-800 text-slate-300 hover:text-white hover:border-[#2a475e] transition-colors cursor-pointer"
                title="쇼케이스 설정"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Showcase Share Button */}
              <Button
                variant="steam"
                size="sm"
                onClick={handleShareClick}
                className="text-xs font-semibold px-3.5"
                leftIcon={
                  isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Share2 className="w-3.5 h-3.5" />
                  )
                }
              >
                {isCopied ? '링크 복사됨!' : '쇼케이스 공유'}
              </Button>

              {/* User Profile Avatar & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <img
                  src={
                    user.avatarUrl ||
                    'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
                  }
                  alt={user.username}
                  className="w-7 h-7 rounded-full ring-1 ring-[#2a475e] object-cover"
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
