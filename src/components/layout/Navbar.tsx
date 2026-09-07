import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useThemeStore } from '@/store/useThemeStore';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';
import { ShowcaseSettingsModal } from '@/components/modals/ShowcaseSettingsModal';
import {
  Sun,
  Moon,
  LogOut,
  Settings,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isSettingsModalOpen, setSettingsModalOpen } = useShowcaseStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-header)] backdrop-blur-lg border-b border-[var(--border-subtle)] px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Clean Typography Brand Logo & Navigation */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="flex items-center gap-1 cursor-pointer shrink-0">
            <span className="font-bold text-lg tracking-tight text-[var(--text-primary)] transition-colors">
              SteamFolder
            </span>
          </Link>

          <Link
            to="/rankings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--nav-btn-bg)] transition-all cursor-pointer"
          >
            <span>랭킹</span>
          </Link>
        </div>

        {/* Right: Actions & Auth State */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated && user ? (
            <>
              {/* Settings Button */}
              <button
                type="button"
                onClick={() => setSettingsModalOpen(true)}
                className="h-8 w-8 rounded-md bg-[var(--nav-btn-bg)] border border-[var(--nav-btn-border)] text-[var(--nav-btn-text)] hover:text-[var(--text-primary)] hover:border-[var(--border-card)] active:scale-[0.96] transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                title="쇼케이스 설정"
                aria-label="쇼케이스 설정"
              >
                <Settings className="w-4 h-4 text-[var(--text-secondary)] hover:rotate-45 transition-transform" />
              </button>

              {/* Dark / Light Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-md bg-[var(--nav-btn-bg)] border border-[var(--nav-btn-border)] text-[var(--nav-btn-text)] hover:text-[var(--text-primary)] hover:border-[var(--border-card)] active:scale-[0.96] transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
                aria-label="화면 모드 전환"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400 hover:-rotate-12 transition-transform" />
                )}
              </button>

              {/* User Profile Avatar & Link to MyPage */}
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-subtle)]">
                <Link
                  to="/mypage"
                  className="flex items-center gap-2 group cursor-pointer hover:opacity-85 transition-opacity"
                  title="내 페이지로 이동"
                >
                  <img
                    src={
                      user.avatarUrl ||
                      'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
                    }
                    alt={user.username}
                    className="w-7 h-7 rounded-full ring-1 ring-[var(--border-card)] group-hover:ring-[#66c0f4] object-cover transition-all"
                  />
                  <span className="text-xs font-medium text-[var(--text-primary)] group-hover:text-[#66c0f4] hidden sm:inline transition-colors">
                    {user.username}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 active:scale-[0.96] transition-colors cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            /* Unauthenticated Navbar State */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="h-8 w-8 rounded-md bg-[var(--nav-btn-bg)] border border-[var(--nav-btn-border)] text-[var(--nav-btn-text)] hover:text-[var(--text-primary)] hover:border-[var(--border-card)] active:scale-[0.96] transition-colors cursor-pointer flex items-center justify-center shadow-xs"
                title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
                aria-label="화면 모드 전환"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400 hover:-rotate-12 transition-transform" />
                )}
              </button>
              <SteamLoginButton size="sm" />
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Global Showcase Settings Modal for any page with Navbar */}
    {isAuthenticated && (
      <ShowcaseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    )}
  </>
  );
};
