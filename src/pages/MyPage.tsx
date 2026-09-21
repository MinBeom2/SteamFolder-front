import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';
import { AnimatedList } from '@/components/common/AnimatedList';
import {
  getMyShowcaseApi,
  getMyLikedShowcasesApi,
  toggleShowcaseLikeApi,
} from '@/api/showcase';
import type { ShowcaseResponse, LikedShowcaseItemDto } from '@/types/showcase';
import { useAuthStore } from '@/store/useAuthStore';
import { Heart, ChevronRight } from 'lucide-react';
import { GuestUserGamesModal } from '@/components/modals/GuestUserGamesModal';
import { GameDetailModal } from '@/components/modals/GameDetailModal';

export const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  // Profile data
  const [showcase, setShowcase] = useState<ShowcaseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);

  // Liked showcases data
  const [likedShowcases, setLikedShowcases] = useState<LikedShowcaseItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [totalLikedCount, setTotalLikedCount] = useState(0);
  const [isLoadingLiked, setIsLoadingLiked] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [likeLoadingUserIds, setLikeLoadingUserIds] = useState<Set<number>>(new Set());

  const observerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch user showcase profile
  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated || !user) {
      setIsLoading(false);
      return;
    }

    const fetchMyShowcase = async () => {
      setIsLoading(true);
      try {
        const data = await getMyShowcaseApi();
        setShowcase(data);
      } catch (err) {
        console.error('Failed to fetch my showcase data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyShowcase();
  }, [isAuthenticated, isInitialized, user]);

  // 2. Fetch liked showcases initial page
  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !user) {
      setIsLoadingLiked(false);
      return;
    }

    const fetchLikedShowcases = async () => {
      setIsLoadingLiked(true);
      try {
        const res = await getMyLikedShowcasesApi(null, 20);
        setLikedShowcases(res.content);
        setNextCursor(res.nextCursor);
        setHasNext(res.hasNext);
        setTotalLikedCount(res.totalElements);
      } catch (err) {
        console.error('Failed to fetch liked showcases:', err);
      } finally {
        setIsLoadingLiked(false);
      }
    };

    fetchLikedShowcases();
  }, [isInitialized, isAuthenticated, user]);

  // 3. Load more liked showcases (No-Offset Cursor Pagination)
  const loadMoreLikedShowcases = useCallback(async () => {
    if (!hasNext || isLoadingMore || nextCursor === null) return;

    setIsLoadingMore(true);
    try {
      const res = await getMyLikedShowcasesApi(nextCursor, 20);
      setLikedShowcases((prev) => [...prev, ...res.content]);
      setNextCursor(res.nextCursor);
      setHasNext(res.hasNext);
      setTotalLikedCount(res.totalElements);
    } catch (err) {
      console.error('Failed to load more liked showcases:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNext, isLoadingMore, nextCursor]);

  // 4. Infinite scroll intersection observer
  useEffect(() => {
    if (!observerRef.current || !hasNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !isLoadingMore) {
          loadMoreLikedShowcases();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNext, isLoadingMore, loadMoreLikedShowcases]);

  // 5. Toggle like on a liked showcase item
  const handleLikeToggle = async (e: React.MouseEvent, targetUserId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (likeLoadingUserIds.has(targetUserId)) return;

    setLikeLoadingUserIds((prev) => new Set(prev).add(targetUserId));
    try {
      const res = await toggleShowcaseLikeApi(targetUserId);
      setLikedShowcases((prev) =>
        prev.map((item) =>
          item.userId === targetUserId
            ? { ...item, isLiked: res.liked, likeCount: res.totalLikeCount }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to toggle showcase like:', err);
    } finally {
      setLikeLoadingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  if (!isInitialized || (isLoading && isAuthenticated)) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-24">
          <LoadingSpinner size="lg" label="마이페이지 로딩 중..." />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-[var(--glass-panel-bg)] border border-[var(--border-subtle)] backdrop-blur-md shadow-lg space-y-5">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">로그인이 필요합니다</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              마이페이지를 확인하려면 스팀 계정으로 로그인해 주세요.
            </p>
            <div className="flex justify-center pt-2">
              <SteamLoginButton size="md" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const playtimeHours = Math.round((showcase?.stats.totalPlaytimeForever || 0) / 60);
  const likeCount = showcase?.user.likeCount ?? 0;
  const cardHoverClass = 'hover:translate-x-1 hover:bg-[var(--bg-surface)]';

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 select-none flex-col justify-start px-5 pb-28 pt-10 sm:px-10 sm:pt-14">
        {/* Profile Header without enclosing card */}
        <div className="grid w-full gap-7 border-b border-[var(--page-rule)] pb-12 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-end sm:gap-10">
          <img
            src={
              user.avatarUrl ||
              'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
            }
            alt={user.username}
            className="h-28 w-28 shrink-0 object-cover grayscale-[20%] sm:h-36 sm:w-36"
          />

          <div className="flex flex-col items-start gap-4 text-left">
            {/* Username (Moved slightly up, no settings button) */}
            <h1 className="text-5xl font-black leading-none tracking-[-0.06em] text-[var(--text-primary)] sm:text-7xl">
              {user.username}
            </h1>

            {/* 3 Stats: Clean minimal text without emojis and container shells */}
            <div className="flex flex-wrap items-center justify-start gap-4 pt-2 text-xs sm:gap-6 sm:text-sm">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[var(--text-secondary)]">내 쇼케이스 좋아요</span>
                <span className="text-base sm:text-lg font-bold text-rose-500">{likeCount}</span>
                <span className="text-xs text-[var(--text-secondary)]">개</span>
              </div>

              <span className="text-[var(--border-subtle)] hidden sm:inline">|</span>

              {/* Owned Games Button (Chip/Badge style matching Guest view) */}
              <button
                type="button"
                onClick={() => setIsGamesModalOpen(true)}
                className="group -my-1 flex cursor-pointer items-center gap-1.5 border-b border-[var(--border-card)] px-1 py-1 text-xs font-semibold transition-colors hover:border-[var(--primary-accent)] hover:text-[var(--primary-accent)] sm:text-sm"
                title="보유 게임 전체 목록 열기"
              >
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  보유 게임
                </span>
                <strong className="text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)]">
                  {showcase?.stats.totalOwnedGames ?? 0}개
                </strong>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary-accent)]" />
              </button>

              <span className="text-[var(--border-subtle)] hidden sm:inline">|</span>

              <div className="flex items-baseline gap-1.5">
                <span className="text-[var(--text-secondary)]">총 플레이 시간</span>
                <span className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  {playtimeHours}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">시간</span>
              </div>
            </div>
          </div>
        </div>

        {/* Liked Showcases Section */}
        <div className="mt-14 flex w-full flex-col gap-5">
          <div className="flex items-end justify-between border-b border-[var(--border-subtle)] pb-5">
            <div className="flex items-center gap-2.5">
              <h2 className="flex items-end gap-3 text-3xl font-black tracking-[-0.045em] text-[var(--text-primary)] sm:text-5xl">
                <span>내가 좋아요 누른 쇼케이스</span>
                {totalLikedCount > 0 && (
                  <span className="mb-1 border border-rose-500/20 px-2 py-0.5 text-xs font-semibold text-rose-400">
                    {totalLikedCount}
                  </span>
                )}
              </h2>
            </div>

          </div>

          {/* List Content */}
          {isLoadingLiked ? (
            <div className="py-16 flex items-center justify-center">
              <LoadingSpinner size="md" label="좋아요 누른 쇼케이스 불러오는 중..." />
            </div>
          ) : likedShowcases.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--text-secondary)] bg-[var(--glass-panel-bg)] rounded-2xl border border-[var(--border-subtle)] p-8 space-y-3">
              <p className="font-medium text-[var(--text-primary)]">
                아직 좋아요를 누른 쇼케이스가 없습니다.
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                다른 유저들의 멋진 쇼케이스를 둘러보고 마음에 드는 쇼케이스에 좋아요를 눌러보세요!
              </p>
            </div>
          ) : (
            <AnimatedList<LikedShowcaseItemDto>
              items={likedShowcases}
              onItemSelect={(item) => navigate(`/showcase/${encodeURIComponent(item.username)}`)}
              showGradients={true}
              enableArrowNavigation={false}
              displayScrollbar={true}
              className="w-full"
              listClassName="max-h-[60vh] overflow-y-auto !px-0 !py-0"
              renderItem={(item) => (
                <Link
                  key={item.userId}
                  to={`/showcase/${encodeURIComponent(item.username)}`}
                  className={`group relative flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-3 py-5 transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-5 ${cardHoverClass}`}
                >
                  {/* Left: Avatar + Username (No liked date) */}
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0 sm:min-w-[280px]">
                    <div className="h-12 w-12 shrink-0 overflow-hidden border border-[var(--border-card)]">
                      <img
                        src={
                          item.avatarUrl ||
                          'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
                        }
                        alt={item.username}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate text-base font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)] sm:text-lg">
                        {item.username}
                      </span>
                    </div>
                  </div>

                  {/* Center: Total Games */}
                  <div className="flex flex-1 items-center justify-center px-4 hidden sm:flex">
                    <div className="flex items-center gap-2 text-sm sm:text-base text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      <span>
                        보유 게임: <strong className="font-bold text-[var(--text-primary)] text-base sm:text-lg">{item.totalGamesCount}</strong>개
                      </span>
                    </div>
                  </div>

                  {/* Right: Like Button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleLikeToggle(e, item.userId)}
                      disabled={likeLoadingUserIds.has(item.userId)}
                      className={`flex cursor-pointer items-center gap-2 rounded-[2px] border px-3.5 py-2 text-sm font-bold transition-colors disabled:opacity-60 sm:px-4 sm:text-base ${
                        item.isLiked
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                          : 'bg-[var(--nav-btn-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10'
                      }`}
                      title={item.isLiked ? '좋아요 취소' : '좋아요'}
                    >
                      <Heart
                        className={`w-5 h-5 transition-all ${
                          item.isLiked
                            ? 'fill-rose-500 text-rose-500 scale-105'
                            : 'fill-none text-slate-400'
                        }`}
                      />
                      <span>{item.likeCount}</span>
                    </button>
                  </div>
                </Link>
              )}
              footer={
                hasNext ? (
                  <div ref={observerRef} className="py-6 flex items-center justify-center">
                    {isLoadingMore && <LoadingSpinner size="sm" label="추가 목록 불러오는 중..." />}
                  </div>
                ) : null
              }
            />
          )}
        </div>
      </main>

      {/* User Owned Games Modal (Same as Guest view) */}
      {(showcase || user) && (
        <GuestUserGamesModal
          isOpen={isGamesModalOpen}
          onClose={() => setIsGamesModalOpen(false)}
          identifier={user.steamId || user.username}
          username={user.username}
          isReadOnly={false}
        />
      )}

      {/* Game Detail & Achievement Modal */}
      <GameDetailModal />
    </div>
  );
};

export default MyPage;
