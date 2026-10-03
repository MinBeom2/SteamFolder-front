import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { QueryError } from '@/components/common/QueryError';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { getPublicShowcaseGamesApi } from '@/api/showcase';
import { getGameAchievementsApi } from '@/api/game';
import type { UserGame } from '@/types/game';
import {
  Search,
  Clock,
  ArrowUpAZ,
  ArrowDownAZ,
  Calendar,
  Trophy,
} from 'lucide-react';

interface GuestUserGamesModalProps {
  isOpen: boolean;
  onClose: () => void;
  identifier: string;
  username: string;
  isReadOnly?: boolean;
}

type SortOption = 'playtime' | 'recent' | 'name-asc' | 'name-desc';

const GENRE_TAGS = [
  '전체',
  '액션',
  'RPG',
  '전략',
  '어드벤처',
  '시뮬레이션',
  '스포츠',
  '인디',
  '캐주얼',
  '앞서 해보기',
];

export const GuestUserGamesModal: React.FC<GuestUserGamesModalProps> = ({
  isOpen,
  onClose,
  identifier,
  username,
  isReadOnly = true,
}) => {
  const { achievementDetail } = useShowcaseStore();
  const [syncingAppIds, setSyncingAppIds] = useState<Set<number>>(new Set());

  const [games, setGames] = useState<UserGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [search, setSearch] = useState('');
  const [activeGenre, setActiveGenre] = useState('전체');
  const [sortBy, setSortBy] = useState<SortOption>('playtime');

  // Drag-to-scroll state for genre tags
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);
  const [isGrabbed, setIsGrabbed] = useState(false);

  // Scroll container and observer sentinel refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  // Reset states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setActiveGenre('전체');
      setSortBy('playtime');
      setDisplayLimit(24);
      setGamesError(null);
    }
  }, [isOpen]);

  // Fetch games from server with dynamic JPA specification filter & DB sort
  useEffect(() => {
    if (!isOpen || !identifier) return;

    let isMounted = true;
    const fetchGames = async () => {
      setIsLoading(true);
      setDisplayLimit(24);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      try {
        const genres = activeGenre === '전체' ? undefined : [activeGenre];
        const data = await getPublicShowcaseGamesApi(identifier, genres, sortBy);
        if (!isMounted) return;

        setGames(data.games || data.content || []);
        setGamesError(null);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load guest user games:', err);
        setGamesError('검색·필터 조건은 유지됩니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchGames();

    return () => {
      isMounted = false;
    };
  }, [isOpen, identifier, activeGenre, sortBy, retryCount]);

  // Reset scroll and limit when search keyword changes
  useEffect(() => {
    setDisplayLimit(24);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [search]);

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
    setDisplayLimit(24);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setDisplayLimit(24);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Toggle Name sort between Ascending and Descending
  const handleNameSortClick = () => {
    const nextSort = sortBy === 'name-asc' ? 'name-desc' : 'name-asc';
    handleSortChange(nextSort);
  };

  // 1. Filter by search keyword and genre
  const filteredGames = games.filter((game) => {
    const matchesSearch =
      search.trim() === '' ||
      game.name.toLowerCase().includes(search.toLowerCase());
    const matchesGenre =
      activeGenre === '전체' ||
      (game.genres && game.genres.includes(activeGenre));
    return matchesSearch && matchesGenre;
  });

  // 2. Sort by selected option
  const sortedGames = [...filteredGames].sort((a, b) => {
    if (sortBy === 'playtime') {
      return (b.playtimeForever || 0) - (a.playtimeForever || 0);
    }
    if (sortBy === 'recent') {
      const timeA = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : 0;
      const timeB = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.playtimeForever || 0) - (a.playtimeForever || 0);
    }
    if (sortBy === 'name-asc') {
      return a.name.localeCompare(b.name, 'ko');
    }
    if (sortBy === 'name-desc') {
      return b.name.localeCompare(a.name, 'ko');
    }
    return 0;
  });

  const visibleGames = sortedGames.slice(0, displayLimit);
  const hasMore = displayLimit < sortedGames.length;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      if (hasMore) {
        setDisplayLimit((prev) => Math.min(prev + 24, sortedGames.length));
      }
    }
  };

  // Infinite scroll observer setup with scrollContainerRef as root
  useEffect(() => {
    if (!isOpen || !hasMore) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + 24, sortedGames.length));
        }
      },
      { root: scrollContainer, threshold: 0.1, rootMargin: '100px' }
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
  }, [isOpen, hasMore, sortedGames.length, displayLimit]);

  const formatLastPlayed = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const currentYear = new Date().getFullYear();
    if (year === currentYear) {
      return `${month}월 ${day}일`;
    }
    return `${year}년 ${month}월 ${day}일`;
  };

  // Sync live updated achievement details to currently displayed games
  useEffect(() => {
    if (!achievementDetail) return;
    setGames((prev) =>
      prev.map((g) =>
        g.appId === achievementDetail.appId
          ? {
              ...g,
              totalAchievements: achievementDetail.totalAchievements,
              achievedAchievements: achievementDetail.achievedAchievements,
              achievementRate: achievementDetail.achievementRate,
            }
          : g
      )
    );
  }, [achievementDetail]);

  const handleCardClick = async (game: UserGame) => {
    // 1. 읽기 전용(게스트 모드)이거나 이미 동기화 진행 중인 경우 건너뜀
    if (isReadOnly || syncingAppIds.has(game.appId)) return;

    // 2. 이미 도전과제 데이터가 로드되어 있는 경우(쿨타임/캐시 유효 상태) 동기화 표시 없이 건너뜀
    if (game.totalAchievements !== undefined && game.totalAchievements !== null) return;

    setSyncingAppIds((prev) => new Set(prev).add(game.appId));
    try {
      const data = await getGameAchievementsApi(game.appId);
      if (data) {
        setGames((prev) =>
          prev.map((g) =>
            g.appId === game.appId
              ? {
                  ...g,
                  totalAchievements: data.totalAchievements,
                  achievedAchievements: data.achievedAchievements,
                  achievementRate: data.achievementRate,
                }
              : g
          )
        );
      }
    } catch (err) {
      console.error('Failed to sync achievements for game:', game.appId, err);
    } finally {
      setSyncingAppIds((prev) => {
        const next = new Set(prev);
        next.delete(game.appId);
        return next;
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${username}님이 보유한 게임`}
      maxWidth="3xl"
    >
      <div className="space-y-3">
        {/* 1. Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            aria-label="보유 게임 검색"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="보유 게임 검색..."
            className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#2a475e] focus:ring-1 focus:ring-[#2a475e] transition-all"
          />
        </div>

        {/* 2. Genre Filter Chips (Mouse Drag-to-Slide with No Visible Scrollbar) */}
        <div
          ref={tagsContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={`flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar ${
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
                aria-pressed={isActive}
                className={`min-h-11 px-2.5 py-1 rounded-[3px] text-xs tracking-tight transition-all shrink-0 cursor-pointer ${
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

        {/* 3. Sort Buttons (Full-width 3 columns) */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--bg-surface-elevated)] p-1 rounded-lg border border-[var(--border-card)] w-full">
          <button
            type="button"
            onClick={() => handleSortChange('playtime')}
            aria-pressed={sortBy === 'playtime'}
            className={`min-h-11 w-full py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
              sortBy === 'playtime'
                ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="플레이타임이 많은 순으로 정렬"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>플레이타임순</span>
          </button>

          <button
            type="button"
            onClick={() => handleSortChange('recent')}
            aria-pressed={sortBy === 'recent'}
            className={`min-h-11 w-full py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
              sortBy === 'recent'
                ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="최근에 플레이한 순으로 정렬"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>최근 플레이순</span>
          </button>

          <button
            type="button"
            onClick={handleNameSortClick}
            aria-pressed={sortBy === 'name-asc' || sortBy === 'name-desc'}
            className={`min-h-11 w-full py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
              sortBy === 'name-asc' || sortBy === 'name-desc'
                ? 'bg-[var(--primary-accent)] text-[var(--bg-app)] border border-[var(--primary-accent)] font-bold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="클릭 시 이름 가나다순 오름차순/내림차순 토글"
          >
            {sortBy === 'name-asc' ? (
              <ArrowUpAZ className="w-3.5 h-3.5" />
            ) : sortBy === 'name-desc' ? (
              <ArrowDownAZ className="w-3.5 h-3.5" />
            ) : (
              <ArrowUpAZ className="w-3.5 h-3.5 opacity-60" />
            )}
            <span>
              {sortBy === 'name-desc' ? '이름 내림차순' : '이름 가나다순'}
            </span>
          </button>
        </div>

        {/* 4. Long Horizontal Row List (Ranking-style, No Animation) */}
        <div className="relative min-h-32">
          {gamesError ? (
            <QueryError message={gamesError} onRetry={() => setRetryCount((count) => count + 1)} isRetrying={isLoading} />
          ) : <>
          {isLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--glass-modal-bg)]/75 backdrop-blur-[1px]">
              <LoadingSpinner size="md" label="게임 목록 불러오는 중..." />
            </div>
          )}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className={`flex max-h-[500px] flex-col gap-3 overflow-y-auto pr-3.5 transition-opacity sm:pr-4 select-none ${
              isLoading ? 'pointer-events-none opacity-40' : ''
            }`}
          >
            {visibleGames.map((game) => {
              const playtimeHours = (Math.round(((game.playtimeForever || 0) / 60) * 10) / 10).toFixed(1);
              const playtimeDisplay = `${playtimeHours}시간`;
              const lastPlayedFormatted = formatLastPlayed(game.lastPlayedAt);
              const total = game.totalAchievements ?? 0;
              const achieved = game.achievedAchievements ?? 0;
              const rate = game.achievementRate ?? 0;
              const isPerfect = total > 0 && achieved === total;
              const isSyncing = syncingAppIds.has(game.appId);

              return (
                <div
                  key={game.appId}
                  className="group relative grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 rounded-[3px] border border-[var(--border-card)] bg-[var(--bg-card)] p-3 transition-colors duration-300 hover:border-[var(--primary-accent)] hover:bg-[var(--bg-surface-elevated)] sm:grid-cols-[208px_minmax(0,1fr)_auto] sm:gap-x-4 sm:p-4 md:grid-cols-[240px_minmax(0,1fr)_auto]"
                >
                  <div className="col-start-1 row-start-1 aspect-[460/215] w-full overflow-hidden rounded-[2px] bg-[var(--bg-app)] border border-[var(--border-subtle)] sm:row-span-2">
                    <img
                      src={game.headerImage}
                      alt=""
                      className="w-full h-full object-cover transition-[filter] duration-500 group-hover:saturate-125"
                      loading="lazy"
                    />
                  </div>

                  <h3 title={game.name} className="col-start-2 row-start-1 min-w-0 line-clamp-2 break-words text-sm font-bold leading-snug text-[var(--text-primary)] group-hover:text-[var(--primary-accent)] transition-colors sm:line-clamp-none sm:truncate sm:text-lg md:text-xl">
                    {game.name}
                  </h3>

                  <div className="col-span-2 row-start-2 grid grid-cols-2 gap-3 sm:col-span-1 sm:col-start-2 sm:gap-6">
                    <div className="flex flex-col">
                      <span className="whitespace-nowrap text-xs text-[var(--text-muted)] font-medium">전체 플레이 시간</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{playtimeDisplay}</span>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="text-xs text-[var(--text-muted)] font-medium">최근 플레이</span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{lastPlayedFormatted || '기록 없음'}</span>
                    </div>
                  </div>

                  {/* Bottom Row: Achievement Progress Section (Matching GameDetailModal design) */}
                  <div className="col-span-full row-start-3 min-w-0">
                  {isSyncing ? (
                    <div className="rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] py-3 px-4 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)] animate-pulse">
                      <LoadingSpinner size="sm" label="스팀 업적 동기화 중..." />
                    </div>
                  ) : game.totalAchievements === 0 ? (
                    <div className="rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] py-2.5 px-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <Trophy className="w-4 h-4 text-slate-400 dark:text-slate-600 stroke-1 shrink-0" />
                      <span>이 게임에는 등록된 도전과제가 없습니다.</span>
                    </div>
                  ) : game.achievementRate !== undefined && game.achievementRate !== null ? (
                    <div className="rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] p-3 space-y-2 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="flex items-center gap-2 font-medium text-[var(--text-secondary)]">

                          <span>도전과제 달성 현황</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-primary)]">
                            <strong
                              className={
                                isPerfect
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-[var(--primary-accent)]'
                              }
                            >
                              {achieved}
                            </strong>{' '}
                            / {total}
                          </span>
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                              isPerfect
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-[var(--primary-accent)]/10 text-[var(--primary-accent)] border border-[var(--primary-accent)]/20'
                            }`}
                          >
                            {rate.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden border border-[var(--border-card)] p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPerfect
                              ? 'bg-emerald-500 dark:bg-emerald-400'
                              : 'bg-[var(--primary-accent)]'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[3px] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] py-2.5 px-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)] group-hover:border-[var(--primary-accent)] transition-colors">
                      <div className="flex items-center gap-2">
                        <span>도전과제 미동기화</span>
                      </div>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleCardClick(game)}
                          className="min-h-11 rounded px-2 text-sm font-semibold text-[var(--primary-accent)] hover:underline"
                        >
                          업적 불러오기
                        </button>
                      )}
                    </div>
                  )}
                  </div>
                  <div className="col-span-2 row-start-4 justify-self-end sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:row-span-2">
                    <a
                      href={`https://store.steampowered.com/app/${game.appId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex min-h-11 items-center gap-1.5 px-3 py-1 rounded-[3px] text-xs font-medium bg-transparent border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[var(--primary-accent)] hover:border-[var(--primary-accent)] transition-colors cursor-pointer group/store"
                      title="스팀 공식 상점 페이지 열기 (새 창)"
                    >
                      <span>상점 방문</span>
                    </a>
                  </div>
                </div>
              );
            })}

            {/* Bottom Sentinel Element for Infinite Scroll */}
            {hasMore && <div ref={observerTargetRef} className="h-2 w-full" />}

            {/* Loading More Indicator */}
            {hasMore && (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                <LoadingSpinner size="sm" label="게임 더 불러오는 중..." />
                <span>({visibleGames.length} / {sortedGames.length})</span>
              </div>
            )}

            {!isLoading && sortedGames.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <p>조건과 일치하는 게임이 없습니다.</p>
              </div>
            )}
          </div>
          </>}
        </div>
      </div>
    </Modal>
  );
};
