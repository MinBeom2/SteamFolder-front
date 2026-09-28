import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { getErrorMessage } from '@/utils/error';
import {
  Search,
  Check,
  Clock,
  RefreshCw,
  ArrowUpAZ,
  ArrowDownAZ,
  Calendar,
} from 'lucide-react';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortOption = 'playtime' | 'recent' | 'name-asc' | 'name-desc';

const GENRE_TAGS = [
  '전체',
  'FPS',
  'RPG',
  '인디',
  '전략',
  '시뮬레이션',
  '액션',
  '어드벤처',
  '캐주얼',
  '스포츠',
  '레이싱',
  '생존',
  '멀티플레이',
  '스토리',
];

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    userGames,
    selectedGameAppIds,
    isLoadingGames,
    isLoadingMoreGames,
    hasMoreGames,
    isSyncingGames,
    cooldownSeconds,
    syncGames,
    checkCooldown,
    toggleGameSelection,
    addSelectedGamesToFolder,
    loadMoreGames,
    filterUserGames,
  } = useShowcaseStore();

  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('전체');
  const [sortBy, setSortBy] = useState<SortOption>('playtime');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Drag-to-scroll state for genre tags
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const [isGrabbed, setIsGrabbed] = useState(false);

  // Infinite scroll observer sentry ref
  const observerTargetRef = useRef<HTMLDivElement>(null);

  const isCooldownActive = cooldownSeconds > 0;
  const cooldownMin = Math.floor(cooldownSeconds / 60);
  const cooldownSec = cooldownSeconds % 60;
  const formattedCooldown = `${cooldownMin}분 ${
    cooldownSec < 10 ? '0' + cooldownSec : cooldownSec
  }초`;

  // On open/close, fetch latest cooldown or reset local search & alerts
  useEffect(() => {
    if (isOpen) {
      checkCooldown();
      setErrorMessage(null);
      setSuccessMessage(null);
    } else {
      setSearch('');
      setActiveGenre('전체');
      setSortBy('playtime');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, checkCooldown]);

  // Fetch games from server with dynamic JPA specification filter & sort
  useEffect(() => {
    if (!isOpen) return;
    const genres = activeGenre === '전체' ? undefined : [activeGenre];
    filterUserGames(genres, sortBy);
  }, [isOpen, activeGenre, sortBy, filterUserGames]);

  // Infinite scroll observer setup
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreGames &&
          !isLoadingMoreGames &&
          !isLoadingGames
        ) {
          loadMoreGames();
        }
      },
      { threshold: 0.1, rootMargin: '120px' }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [isOpen, hasMoreGames, isLoadingMoreGames, isLoadingGames, loadMoreGames]);

  const handleSync = async () => {
    if (isCooldownActive) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await syncGames();
      setSuccessMessage(`스팀 게임 ${res.syncedGameCount}개가 성공적으로 동기화되었습니다!`);
      const genres = activeGenre === '전체' ? undefined : [activeGenre];
      await filterUserGames(genres, sortBy);
    } catch (err: unknown) {
      console.error('Failed to sync games:', err);
      const resData = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (resData?.code !== 'G005' && !resData?.message?.includes('쿨다운')) {
        setErrorMessage(getErrorMessage(err, '스팀 동기화 요청 중 오류가 발생했습니다.'));
      }
    }
  };

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tagsContainerRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    setIsGrabbed(true);
    startXRef.current = e.pageX - tagsContainerRef.current.offsetLeft;
    scrollLeftRef.current = tagsContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !tagsContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tagsContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
    }
    tagsContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
    setIsGrabbed(false);
    setTimeout(() => {
      hasMovedRef.current = false;
    }, 50);
  };

  const handleTagClick = (genre: string) => {
    if (hasMovedRef.current) return;
    setActiveGenre(genre);
  };

  // Toggle Name sort between Ascending and Descending (without changing button text)
  const handleNameSortClick = () => {
    if (sortBy === 'name-asc') {
      setSortBy('name-desc');
    } else {
      setSortBy('name-asc');
    }
  };

  // 1. Filter by search keyword (Genre & Sort are processed on server by DB Specification)
  const filteredGames = userGames.filter((game) => {
    return (
      search.trim() === '' ||
      game.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // 2. The games list is already sorted by DB Specification on the backend
  const sortedGames = filteredGames;

  const selectedCount = selectedGameAppIds.length;

  const handleAdd = async () => {
    try {
      await addSelectedGamesToFolder();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to add games to folder:', err);
      const msg = getErrorMessage(err, '폴더에 게임을 추가하지 못했습니다.');
      setErrorMessage(msg);
    }
  };

  const formatLastPlayed = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex w-full flex-wrap items-center justify-between gap-2 pr-2">
          <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">게임 추가하기</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSync}
            disabled={isCooldownActive}
            isLoading={isSyncingGames}
            className={`min-h-11 border px-3 text-xs transition-all ${
              isCooldownActive
                ? 'bg-amber-50 border-amber-300 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-300 cursor-not-allowed'
                : ''
            }`}
            leftIcon={
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isCooldownActive ? 'text-amber-400' : 'text-[var(--primary-accent)]'
                }`}
              />
            }
          >
            {isCooldownActive
              ? `쿨다운 중 (${formattedCooldown})`
              : '라이브러리 동기화'}
          </Button>
        </div>
      }
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Success Message Banner */}
        {successMessage && (
          <div className="flex justify-center">
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-2 animate-in fade-in duration-200 w-fit text-center">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message Banner */}
        {errorMessage && (
          <div className="flex justify-center">
            <div className="px-4 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-center gap-2 animate-in fade-in duration-200 w-fit text-center">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* 1. Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="보유 게임 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="보유 게임 검색..."
            className="min-h-11 w-full rounded-[3px] border border-[var(--border-card)] bg-[var(--bg-surface-elevated)] py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:border-[var(--primary-accent)] focus:outline-none"
          />
        </div>

        {/* 2. Genre Filter Chips (Mouse Drag-to-Slide with No Visible Scrollbar) */}
        <div
          ref={tagsContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 select-none no-scrollbar ${
            isGrabbed ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {GENRE_TAGS.map((genre) => {
            const isActive = activeGenre === genre;
            return (
              <button
                key={genre}
                type="button"
                onClick={() => handleTagClick(genre)}
                className={`px-2.5 py-1 rounded-[3px] text-xs tracking-tight transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)] font-bold'
                    : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-card)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] font-medium'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* 3. Sort Row (Positioned underneath genre tags) */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pb-1 pt-2">
          {/* Right: Clean Sort Buttons (Playtime, Recent, Toggleable Name) */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-[var(--border-card)] bg-[var(--bg-surface-elevated)] p-1">
            <button
              type="button"
              onClick={() => setSortBy('playtime')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                sortBy === 'playtime'
                  ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="플레이타임이 많은 순으로 정렬"
            >
              <Clock className={`w-3 h-3 ${sortBy === 'playtime' ? 'text-[var(--bg-app)]' : ''}`} />
              <span>플레이타임순</span>
            </button>

            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                sortBy === 'recent'
                  ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="최근에 플레이한 순으로 정렬"
            >
              <Calendar className={`w-3 h-3 ${sortBy === 'recent' ? 'text-[var(--bg-app)]' : ''}`} />
              <span>최근 플레이순</span>
            </button>

            {/* Clean Static Name Sort Button */}
            <button
              type="button"
              onClick={handleNameSortClick}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                sortBy === 'name-asc' || sortBy === 'name-desc'
                  ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="클릭 시 이름 가나다순 오름차순/내림차순 토글"
            >
              {sortBy === 'name-asc' ? (
                <ArrowUpAZ className="w-3 h-3" />
              ) : sortBy === 'name-desc' ? (
                <ArrowDownAZ className="w-3 h-3" />
              ) : (
                <ArrowUpAZ className="w-3 h-3 opacity-60" />
              )}
              <span>
                {sortBy === 'name-desc' ? '이름 내림차순' : '이름 가나다순'}
              </span>
            </button>
          </div>
        </div>

        {/* 4. Game Card Grid (3 Columns) - Steam Official Header Aspect Ratio (460:215) */}
        <div className="relative min-h-32">
          {isLoadingGames && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--glass-modal-bg)]/75 backdrop-blur-[1px]">
              <LoadingSpinner size="md" label="스팀 게임 목록 불러오는 중..." />
            </div>
          )}
          <div className={`grid max-h-[380px] grid-cols-1 gap-3.5 overflow-y-auto pr-1 transition-opacity sm:grid-cols-2 md:grid-cols-3 ${
            isLoadingGames ? 'pointer-events-none opacity-40' : ''
          }`}>
            {sortedGames.map((game) => {
              const isSelected = !!game.selected;
              const playtimeHours = Math.round((game.playtimeForever || 0) / 60);
              const lastPlayedFormatted = formatLastPlayed(game.lastPlayedAt);

              return (
                <button
                  type="button"
                  key={game.appId}
                  onClick={() => toggleGameSelection(game.appId)}
                  aria-pressed={isSelected}
                  aria-label={`${game.name} ${isSelected ? '선택 해제' : '선택'}`}
                  className={`relative overflow-hidden rounded-[3px] border bg-[var(--bg-card)] text-left transition-colors duration-300 cursor-pointer group select-none ${
                    isSelected
                      ? 'border-[var(--primary-accent)] ring-1 ring-[var(--primary-accent)]'
                      : 'border-[var(--border-card)] hover:border-[var(--primary-accent)]'
                  }`}
                >
                  {/* Official Steam Header Image (460x215) Container */}
                  <div className="relative w-full aspect-[460/215] overflow-hidden bg-[#07090e]">
                    <img
                      src={game.headerImage}
                      alt=""
                      className="w-full h-full object-cover transition-[filter] duration-500 group-hover:saturate-125"
                      loading="lazy"
                    />
                    {/* Top right checkbox */}
                    <div
                      className={`absolute top-2 right-2 w-5 h-5 rounded flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)]'
                          : 'bg-black/60 border border-slate-500/60'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 font-bold" />}
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3">
                    <h4 className="mb-1.5 truncate text-sm font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)]">
                      {game.name}
                    </h4>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--primary-accent)]" />
                        <span className="font-medium text-[var(--text-primary)]">
                          {playtimeHours}시간
                        </span>
                      </div>

                      {lastPlayedFormatted && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{lastPlayedFormatted}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Bottom Sentinel Element for Infinite Scroll */}
            <div ref={observerTargetRef} className="col-span-full h-2 w-full" />

            {/* Loading More Indicator */}
            {isLoadingMoreGames && (
              <div className="col-span-full py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <LoadingSpinner size="sm" label="게임 더 불러오는 중..." />
              </div>
            )}

            {/* End of list message */}
            {!hasMoreGames && sortedGames.length > 0 && (
              <div className="col-span-full py-2 text-center text-xs text-[var(--text-muted)]">
                모든 게임을 불러왔습니다
              </div>
            )}

            {sortedGames.length === 0 && (
              <div className="col-span-full space-y-3 py-12 text-center text-sm text-[var(--text-secondary)]">
                <p>조건과 일치하는 게임이 없습니다.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSync}
                  disabled={isCooldownActive}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[var(--primary-accent)]" />}
                >
                  {isCooldownActive
                    ? `쿨다운 중 (${formattedCooldown})`
                    : '스팀 라이브러리 동기화 실행'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            선택된 게임: <strong className="text-[var(--primary-accent)]">{selectedCount}</strong>개
          </span>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="cyan"
              size="sm"
              onClick={handleAdd}
              className="px-5 text-xs font-semibold"
            >
              게임 추가
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
