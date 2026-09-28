import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useThemeStore } from '@/store/useThemeStore';
import { ShowcaseSettingsModal } from '@/components/modals/ShowcaseSettingsModal';
import { FeedbackModal } from '@/components/modals/FeedbackModal';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `group relative flex min-h-11 items-center px-2 text-sm font-semibold transition-colors ${
    isActive
      ? 'text-[var(--text-primary)]'
      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
  }`;

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { isSettingsModalOpen, setSettingsModalOpen } = useShowcaseStore();
  const { theme, toggleTheme } = useThemeStore();
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-4 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-3 py-1.5 sm:min-h-[68px] sm:flex-nowrap sm:gap-8 sm:py-0">
          <div className="contents sm:flex sm:min-w-0 sm:items-center sm:gap-8 lg:gap-12">
            <NavLink to="/" className="group order-1 flex min-h-11 shrink-0 items-center sm:order-none" aria-label="SteamFolder 홈">
              <span className="text-lg font-extrabold leading-none tracking-[-0.04em] text-[var(--text-primary)]">
                SteamFolder
              </span>
            </NavLink>

            <nav className="order-3 flex w-full items-center gap-2 border-t border-[var(--border-subtle)] sm:order-none sm:w-auto sm:gap-3 sm:border-0" aria-label="주요 메뉴">
              <NavLink to="/rankings" className={navItemClass}>
                <span>랭킹</span>
              </NavLink>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setFeedbackModalOpen(true)}
                  className="flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                >
                  피드백
                </button>
              )}
            </nav>
          </div>

          <div className="order-2 flex shrink-0 items-center gap-0.5 sm:gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="group flex h-11 w-11 items-center justify-center text-[var(--text-muted)]"
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 transition-colors group-hover:text-[var(--text-primary)]" />
              ) : (
                <Moon className="h-4 w-4 transition-colors group-hover:text-[var(--text-primary)]" />
              )}
            </button>

            {isAuthenticated && user && (
              <>
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(true)}
                  className="group flex h-11 w-11 items-center justify-center text-[var(--text-muted)]"
                  title="쇼케이스 설정"
                  aria-label="쇼케이스 설정"
                >
                  <Settings className="h-4 w-4 transition-colors group-hover:text-[var(--text-primary)]" />
                </button>

                <NavLink
                  to="/mypage"
                  className="group flex min-h-11 items-center gap-2.5 border-l border-[var(--border-subtle)] pl-2 sm:ml-2 sm:pl-4"
                  title="내 페이지로 이동"
                  aria-label={`${user.username}의 마이페이지`}
                >
                  <img
                    src={user.avatarUrl || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'}
                    alt={user.username}
                    className="h-8 w-8 rounded-[2px] object-cover grayscale-[25%] transition-all duration-500 group-hover:grayscale-0"
                  />
                  <span className="hidden max-w-28 truncate text-xs font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)] sm:inline">
                    {user.username}
                  </span>
                </NavLink>

                <button
                  type="button"
                  onClick={logout}
                  className="group flex h-11 w-11 items-center justify-center text-[var(--text-muted)]"
                  title="로그아웃"
                  aria-label="로그아웃"
                >
                  <LogOut className="h-3.5 w-3.5 transition-colors group-hover:text-[var(--text-primary)]" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {isAuthenticated && (
        <>
          <ShowcaseSettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
          />
          <FeedbackModal
            isOpen={isFeedbackModalOpen}
            onClose={() => setFeedbackModalOpen(false)}
          />
        </>
      )}
    </>
  );
};
