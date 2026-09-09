import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { getPublicShowcaseGamesApi } from '@/api/showcase';
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
}

type SortOption = 'playtime' | 'recent' | 'name-asc' | 'name-desc';

const GENRE_TAGS = [
  '전체',
  '액션',
  'RPG',
  '전략',
  '어드벤처',
  '시뮬레이션',
  '인디',
  '캐주얼',
  '스포츠',
  '레이싱',
  '생존',
  '멀티플레이',
  '스토리',
];

export const GuestUserGamesModal: React.FC<GuestUserGamesModalProps> = ({
  isOpen,
  onClose,
  identifier,
  username,
}) => {
  const { openGameDetailModal } = useShowcaseStore();

  const [games, setGames] = useState<UserGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);

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

  // Infinite scroll observer sentry ref
  const observerTargetRef = useRef<HTMLDivElement>(null);

  // Initial load when modal opens
  useEffect(() => {
    if (!isOpen || !identifier) return;

    let isMounted = true;
    const fetchInitialGames = async () => {
      setIsLoading(true);
      setSearch('');
      setActiveGenre('전체');
      setSortBy('playtime');

      try {
        const pageData = await getPublicShowcaseGamesApi(identifier, null, 24);
        if (!isMounted) return;

        setGames(pageData.content || []);
        setCursor(pageData.nextCursor);
        setHasNext(pageData.hasNext);
      } catch (err) {
        console.error('Failed to load guest user games:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitialGames();

    return () => {
      isMounted = false;
    };
  }, [isOpen, identifier]);

  // Load more games when reaching bottom
  const loadMore = async () => {
    if (!hasNext || isLoadingMore || isLoading || !identifier) return;

    setIsLoadingMore(true);
    try {
      const pageData = await getPublicShowcaseGamesApi(identifier, cursor, 24);
      if (pageData && pageData.content) {
        setGames((prev) => {
          const existingIds = new Set(prev.map((g) => g.appId));
          const newUnique = pageData.content.filter((g) => !existingIds.has(g.appId));
          return [...prev, ...newUnique];
        });
        setCursor(pageData.nextCursor);
        setHasNext(pageData.hasNext);
      } else {
        setHasNext(false);
      }
    } catch (err) {
      console.error('Failed to load more guest games:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Infinite scroll observer setup
  useEffect(() => {
    if (!isOpen) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !isLoadingMore && !isLoading) {
          loadMore();
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
  }, [isOpen, hasNext, isLoadingMore, isLoading, cursor]);

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

  // Toggle Name sort between Ascending and Descending
  const handleNameSortClick = () => {
    if (sortBy === 'name-asc') {
      setSortBy('name-desc');
    } else {
      setSortBy('name-asc');
    }
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

  const formatLastPlayed = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const handleCardClick = (game: UserGame) => {
    openGameDetailModal({
      appId: game.appId,
      name: game.name,
      headerImage: game.headerImage,
      genres: game.genres,
      playtimeForever: game.playtimeForever,
      lastPlayedAt: game.lastPlayedAt,
      totalAchievements: game.totalAchievements,
      achievedAchievements: game.achievedAchievements,
      achievementRate: game.achievementRate,
      isReadOnly: true,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${username}님이 보유한 게임`}
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* 1. Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
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
                className={`px-2.5 py-1 rounded-md text-xs tracking-tight transition-all shrink-0 cursor-pointer active:scale-[0.98] ${
                  isActive
                    ? 'bg-[#1a5b8c] text-white border border-[#1a5b8c] dark:bg-[#66c0f4] dark:text-[#111827] dark:border-[#66c0f4] font-bold shadow-xs dark:shadow-[0_0_10px_rgba(102,192,244,0.3)]'
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
            onClick={() => setSortBy('playtime')}
            className={`w-full py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
              sortBy === 'playtime'
                ? 'bg-white text-[#1a5b8c] border border-blue-200 dark:bg-[#1b2838] dark:text-[#66c0f4] dark:border-[#66c0f4]/40 font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="플레이타임이 많은 순으로 정렬"
          >
            <Clock className={`w-3.5 h-3.5 ${sortBy === 'playtime' ? 'text-[#1a5b8c] dark:text-[#66c0f4]' : ''}`} />
            <span>플레이타임순</span>
          </button>

          <button
            type="button"
            onClick={() => setSortBy('recent')}
            className={`w-full py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
              sortBy === 'recent'
                ? 'bg-white text-[#1a5b8c] border border-blue-200 dark:bg-[#1b2838] dark:text-[#66c0f4] dark:border-[#66c0f4]/40 font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="최근에 플레이한 순으로 정렬"
          >
            <Calendar className={`w-3.5 h-3.5 ${sortBy === 'recent' ? 'text-[#1a5b8c] dark:text-[#66c0f4]' : ''}`} />
            <span>최근 플레이순</span>
          </button>

          <button
            type="button"
            onClick={handleNameSortClick}
            className={`w-full py-2 rounded-md text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
              sortBy === 'name-asc' || sortBy === 'name-desc'
                ? 'bg-white text-[#1a5b8c] border border-blue-200 dark:bg-[#1b2838] dark:text-[#66c0f4] dark:border-[#66c0f4]/40 font-bold shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="클릭 시 이름 가나다순 오름차순/내림차순 토글"
          >
            {sortBy === 'name-asc' ? (
              <ArrowUpAZ className={`w-3.5 h-3.5 ${sortBy === 'name-asc' ? 'text-[#1a5b8c] dark:text-[#66c0f4]' : ''}`} />
            ) : sortBy === 'name-desc' ? (
              <ArrowDownAZ className={`w-3.5 h-3.5 ${sortBy === 'name-desc' ? 'text-[#1a5b8c] dark:text-[#66c0f4]' : ''}`} />
            ) : (
              <ArrowUpAZ className="w-3.5 h-3.5 opacity-60" />
            )}
            <span>
              {sortBy === 'name-desc' ? '이름 내림차순' : '이름 가나다순'}
            </span>
          </button>
        </div>

        {/* 4. Long Horizontal Row List (Ranking-style, No Animation) */}
        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingSpinner size="md" label="게임 목록 불러오는 중..." />
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1 select-none">
            {sortedGames.map((game) => {
              const playtimeHours = Math.round((game.playtimeForever || 0) / 60);
              const lastPlayedFormatted = formatLastPlayed(game.lastPlayedAt);

              return (
                <div
                  key={game.appId}
                  onClick={() => handleCardClick(game)}
                  className="group relative flex items-center justify-between gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[#66c0f4] hover:bg-[var(--bg-surface-elevated)] shadow-xs"
                  title="클릭 시 게임 상세 및 도전과제 확인"
                >
                  {/* Left: Capsule Image + Title & Genres */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-24 sm:w-32 aspect-[460/215] rounded-lg overflow-hidden shrink-0 bg-[#07090e] border border-[var(--border-subtle)]">
                      <img
                        src={game.headerImage}
                        alt={game.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex flex-col justify-center min-w-0 flex-1">
                      <span className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[#66c0f4] transition-colors truncate">
                        {game.name}
                      </span>
                      {game.genres && game.genres.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 overflow-hidden">
                          {game.genres.slice(0, 3).map((g) => (
                            <span
                              key={g}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats (Achievements, Playtime, Last Played) */}
                  <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                    {game.achievementRate !== undefined && game.achievementRate !== null && game.achievementRate > 0 && (
                      <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{Math.round(game.achievementRate)}%</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Clock className="w-3.5 h-3.5 text-[#66c0f4] shrink-0" />
                      <span className="font-semibold text-[var(--text-primary)]">
                        {playtimeHours}시간
                      </span>
                    </div>

                    {lastPlayedFormatted && (
                      <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--text-muted)] min-w-[75px] justify-end">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{lastPlayedFormatted}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bottom Sentinel Element for Infinite Scroll */}
            <div ref={observerTargetRef} className="h-2 w-full" />

            {/* Loading More Indicator */}
            {isLoadingMore && (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <LoadingSpinner size="sm" label="게임 더 불러오는 중..." />
              </div>
            )}

            {sortedGames.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                <p>조건과 일치하는 게임이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
