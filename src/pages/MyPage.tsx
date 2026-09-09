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
  const cardHoverClass = 'hover:scale-[1.075] hover:z-20 hover:border-[var(--border-card)]';

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between selection:bg-[#66c0f4]/20 transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto w-full p-4 sm:p-8 flex-1 flex flex-col items-center justify-start select-none pb-28">
        {/* Profile Header without enclosing card */}
        <div className="py-8 sm:py-12 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 mx-auto">
          <img
            src={
              user.avatarUrl ||
              'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
            }
            alt={user.username}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full ring-2 ring-[var(--border-card)] object-cover shrink-0 shadow-sm"
          />

          <div className="flex flex-col gap-3 sm:gap-3.5 items-center sm:items-start text-center sm:text-left">
            {/* Username (Moved slightly up, no settings button) */}
            <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
              {user.username}
            </h1>

            {/* 3 Stats: Clean minimal text without emojis and container shells */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 pt-1 text-xs sm:text-sm">
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
                className="flex items-center gap-1.5 px-3 py-1 -my-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[#66c0f4] hover:text-[#66c0f4] text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-95 group"
                title="보유 게임 전체 목록 열기"
              >
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  보유 게임
                </span>
                <strong className="text-[var(--text-primary)] group-hover:text-[#66c0f4] transition-colors">
                  {showcase?.stats.totalOwnedGames ?? 0}개
                </strong>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[#66c0f4] group-hover:translate-x-0.5 transition-transform shrink-0" />
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
        <div className="w-full mt-4 flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                <span>내가 좋아요 누른 쇼케이스</span>
                {totalLikedCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
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
              listClassName="max-h-[60vh] overflow-y-auto !px-6 sm:!px-12 md:!px-16 !py-6"
              renderItem={(item) => (
                <Link
                  key={item.userId}
                  to={`/showcase/${encodeURIComponent(item.username)}`}
                  className={`group relative flex items-center justify-between gap-4 py-4 sm:py-5 px-5 sm:px-7 rounded-2xl transition-all duration-200 backdrop-blur-sm border cursor-pointer bg-[var(--glass-panel-bg)] border-[var(--border-subtle)] ${cardHoverClass}`}
                >
                  {/* Left: Avatar + Username (No liked date) */}
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0 sm:min-w-[280px]">
                    <div className="w-12 h-12 rounded-full ring-2 ring-[var(--border-card)] overflow-hidden shadow-sm shrink-0">
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
                      <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] transition-colors truncate group-hover:text-[#66c0f4]">
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
                      className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl border text-sm sm:text-base font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60 ${
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
