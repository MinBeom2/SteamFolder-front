import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AnimatedList } from '@/components/common/AnimatedList';
import { DirectLoginModal } from '@/components/modals/DirectLoginModal';
import { getShowcaseRankingsApi } from '@/api/ranking';
import { toggleShowcaseLikeApi } from '@/api/showcase';
import type { ShowcaseRankingItemDto } from '@/types/ranking';
import { useAuthStore } from '@/store/useAuthStore';
import {
  Heart,
  Info,
  Lock,
} from 'lucide-react';

export const ShowcaseRankingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  const [rankings, setRankings] = useState<ShowcaseRankingItemDto[]>([]);
  const [myRanking, setMyRanking] = useState<ShowcaseRankingItemDto | null>(null);
  const [nextCursorLikeCount, setNextCursorLikeCount] = useState<number | null>(null);
  const [nextCursorUserId, setNextCursorUserId] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Interaction & Feedback state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [likeLoadingUserIds, setLikeLoadingUserIds] = useState<Set<number>>(new Set());

  const observerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleLikeClick = async (e: React.MouseEvent, targetUserId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated || !user) {
      setIsLoginModalOpen(true);
      return;
    }

    if (user.id === targetUserId) {
      showToast('자신의 쇼케이스에는 좋아요를 누를 수 없습니다.');
      return;
    }

    if (likeLoadingUserIds.has(targetUserId)) return;

    setLikeLoadingUserIds((prev) => new Set(prev).add(targetUserId));
    try {
      const res = await toggleShowcaseLikeApi(targetUserId);
      setRankings((prev) =>
        prev.map((item) =>
          item.userId === targetUserId
            ? { ...item, isLiked: res.liked, likeCount: res.totalLikeCount }
            : item
        )
      );
      if (myRanking && myRanking.userId === targetUserId) {
        setMyRanking((prev) =>
          prev ? { ...prev, isLiked: res.liked, likeCount: res.totalLikeCount } : null
        );
      }
    } catch (err: unknown) {
      console.error('Failed to toggle like:', err);
      const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errMsg || '좋아요 처리에 실패했습니다.');
    } finally {
      setLikeLoadingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  // Initial fetch
  useEffect(() => {
    const fetchInitialRankings = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getShowcaseRankingsApi(null, null, 50);
        setRankings(res.content);
        if (res.myRanking) {
          setMyRanking(res.myRanking);
        }
        setNextCursorLikeCount(res.nextCursorLikeCount);
        setNextCursorUserId(res.nextCursorUserId);
        setHasNext(res.hasNext);
      } catch (err) {
        console.error('Failed to fetch showcase rankings:', err);
        setError('인기 랭킹을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialRankings();
  }, []);

  // Load more with cursor
  const loadMoreRankings = useCallback(async () => {
    if (!hasNext || isLoadingMore || nextCursorLikeCount === null || nextCursorUserId === null) return;

    setIsLoadingMore(true);
    try {
      const res = await getShowcaseRankingsApi(nextCursorLikeCount, nextCursorUserId, 50);
      setRankings((prev) => [...prev, ...res.content]);
      setNextCursorLikeCount(res.nextCursorLikeCount);
      setNextCursorUserId(res.nextCursorUserId);
      setHasNext(res.hasNext);
    } catch (err) {
      console.error('Failed to load more rankings:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasNext, isLoadingMore, nextCursorLikeCount, nextCursorUserId]);

  // Infinite scroll intersection observer
  useEffect(() => {
    if (!observerRef.current || !hasNext) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNext && !isLoadingMore) {
          loadMoreRankings();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasNext, isLoadingMore, loadMoreRankings]);

  const cardHoverClass = 'hover:bg-[var(--bg-surface-elevated)]';

  const renderRankBadge = (rank: number | null) => {
    if (rank === null) {
      return (
        <span className="w-8 sm:w-10 flex items-center justify-center shrink-0 select-none text-[var(--text-secondary)]">
          <Lock className="w-5 h-5 text-slate-400" />
        </span>
      );
    }
    return (
      <span className="w-8 sm:w-10 text-center font-black text-lg sm:text-xl shrink-0 select-none text-[var(--text-secondary)]">
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Ranking Content */}
      <main className="relative z-10 max-w-6xl mx-auto w-full p-4 sm:p-8 flex-1 flex flex-col select-none pb-28">
        {/* Hero Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[var(--page-rule)] pb-6 pt-3 sm:flex-row sm:items-end sm:pb-8">
          <div className="flex items-start gap-4 sm:items-center">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-black tracking-[-0.045em] text-[var(--text-primary)] sm:text-4xl">
                <span>쇼케이스 랭킹</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                좋아요를 많이 받은 게임 쇼케이스를 둘러보세요.
              </p>
            </div>
          </div>

        </div>

        {/* Content State */}
        {isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner size="lg" label="인기 랭킹 로딩 중..." />
          </div>
        ) : error ? (
          <div className="border-y border-red-200 bg-red-50 px-6 py-16 text-center text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : rankings.length === 0 ? (
          <div className="border-y border-[var(--border-subtle)] px-4 py-14 text-center sm:py-16">
            <p className="text-base font-semibold text-[var(--text-primary)]">아직 공개된 쇼케이스가 없습니다.</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">내 게임을 폴더에 배치해 첫 쇼케이스를 만들어 보세요.</p>
            <Link to="/" className="mt-5 inline-flex min-h-11 items-center justify-center border border-[var(--primary-accent)] px-4 text-sm font-semibold text-[var(--primary-accent)] transition-colors hover:bg-[var(--selection-bg)]">
              내 쇼케이스 만들기
            </Link>
          </div>
        ) : (
          <AnimatedList<ShowcaseRankingItemDto>
            items={rankings}
            showGradients={true}
            enableArrowNavigation={false}
            displayScrollbar={true}
            className="w-full"
            listClassName="max-h-[72vh] overflow-y-auto border-t border-[var(--border-subtle)] !px-0 !py-0"
            renderItem={(item) => {
              const isOwner = user?.id === item.userId;

              return (
                <div
                  key={item.userId}
                  className={`group relative flex min-w-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-4 transition-colors duration-200 sm:gap-4 sm:px-7 sm:py-6 ${cardHoverClass} ${
                    isOwner ? 'bg-[var(--selection-bg)]' : ''
                  }`}
                >
                  <Link
                    to={`/showcase/${encodeURIComponent(item.username)}`}
                    className="flex min-h-12 min-w-0 flex-1 items-center gap-3 sm:gap-5"
                    aria-label={`${item.username}님의 쇼케이스 열기`}
                  >
                  {/* Left: 1번칸 (순위 번호 텍스트 + 아바타 + 닉네임) */}
                  <div className="flex min-w-0 items-center gap-2 sm:min-w-[300px] sm:gap-5 md:min-w-[340px]">
                    {renderRankBadge(item.rank)}

                    <div className="w-12 h-12 rounded-full ring-2 ring-[var(--border-card)] overflow-hidden shadow-sm shrink-0">
                      <img
                        src={
                          item.avatarUrl ||
                          'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-bold text-[var(--text-primary)] sm:text-lg">{item.username}</span>
                      {isOwner && (
                        <span className="shrink-0 border border-[var(--primary-accent)] bg-[var(--selection-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-accent)]">
                          나
                        </span>
                      )}
                      </div>
                      <span className="text-xs text-[var(--text-secondary)] sm:hidden">보유 게임 {item.totalGamesCount}개</span>
                    </div>
                  </div>

                  {/* Center: 2번칸 (보유 게임 수량 중앙 배치) */}
                  <div className="hidden flex-1 items-center justify-center px-4 sm:flex">
                    <div className="flex items-center gap-2 text-sm sm:text-base text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                      <span>
                        보유 게임: <strong className="font-bold text-[var(--text-primary)] text-base sm:text-lg">{item.totalGamesCount}</strong>
                      </span>
                    </div>
                  </div>
                  </Link>

                  {/* Right: 좋아요 인터랙티브 버튼 */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleLikeClick(e, item.userId)}
                      disabled={likeLoadingUserIds.has(item.userId)}
                      className={`flex cursor-pointer items-center gap-2 rounded-[2px] border px-3.5 py-2 text-sm font-bold transition-colors disabled:opacity-60 sm:px-4 sm:text-base ${
                        item.isLiked
                          ? 'bg-rose-500/15 border-rose-500/30 text-[var(--text-like)] hover:bg-rose-500/25'
                          : 'bg-[var(--nav-btn-bg)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-like)] hover:border-rose-500/30 hover:bg-rose-500/10'
                      }`}
                      title={item.isLiked ? '좋아요 취소' : '좋아요'}
                      aria-label={`${item.username}님 쇼케이스 ${item.isLiked ? '좋아요 취소' : '좋아요'}, 현재 ${item.likeCount}개`}
                      aria-pressed={item.isLiked}
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
                </div>
              );
            }}
            footer={
              hasNext ? (
                <div ref={observerRef} className="py-6 flex items-center justify-center">
                  {isLoadingMore && <LoadingSpinner size="sm" label="추가 랭킹 불러오는 중..." />}
                </div>
              ) : null
            }
          />
        )}
      </main>

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xl animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <Info className="w-4 h-4 text-[#66c0f4]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Direct Login Modal for unauthenticated likes */}
      <DirectLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Sticky Bottom Floating Bar: My Ranking */}
      {isAuthenticated && myRanking && (
        <div className="fixed bottom-4 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--border-card)] bg-[var(--bg-surface)]/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 select-none sm:px-5">
          {/* 1. 이미지 좌측에 다른 유저처럼 숫자만 (비공개 시 자물쇠 아이콘) */}
          {myRanking.isPublic === false || myRanking.rank == null ? (
            <span title="비공개 쇼케이스" className="flex items-center text-[var(--text-secondary)] select-none">
              <Lock className="w-4 h-4 text-slate-400" />
            </span>
          ) : (
            <span className="font-black text-sm sm:text-base text-[var(--text-secondary)] select-none">
              {myRanking.rank}
            </span>
          )}

          {/* 2. 실제 내 프로필 이미지 */}
          <img
            src={
              myRanking.avatarUrl ||
              user?.avatarUrl ||
              'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
            }
            alt={myRanking.username || user?.username || 'My Avatar'}
            className="w-8 h-8 rounded-full ring-1 ring-[var(--border-card)] object-cover shadow-xs shrink-0"
          />

          {/* 3. 하트 좋아요 수 */}
          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-[var(--text-like)] sm:text-sm">
            <Heart className="w-3.5 h-3.5 fill-rose-500" />
            <span>{myRanking.likeCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowcaseRankingPage;
