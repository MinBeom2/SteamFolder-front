import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AnimatedList } from '@/components/common/AnimatedList';
import { LoginRequiredModal } from '@/components/modals/LoginRequiredModal';
import { QueryError } from '@/components/common/QueryError';
import { ShowcaseRankingPreview } from '@/components/common/ShowcaseRankingPreview';
import { getShowcaseRankingsApi } from '@/api/ranking';
import { toggleShowcaseLikeApi } from '@/api/showcase';
import type { ShowcaseRankingItemDto } from '@/types/ranking';
import { useAuthStore } from '@/store/useAuthStore';
import { getAuthSessionVersion } from '@/utils/authSession';
import {
  Heart,
  Info,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

export const ShowcaseRankingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();

  const [rankings, setRankings] = useState<ShowcaseRankingItemDto[]>([]);
  const [myRanking, setMyRanking] = useState<ShowcaseRankingItemDto | null>(null);
  const [rankingUserId, setRankingUserId] = useState<number | null>(null);
  const [nextCursorLikeCount, setNextCursorLikeCount] = useState<number | null>(null);
  const [nextCursorUserId, setNextCursorUserId] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Interaction & Feedback state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [likeLoadingUserIds, setLikeLoadingUserIds] = useState<Set<number>>(new Set());

  const observerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef({ active: false });
  const loadingMoreRef = useRef(false);
  const likeRequestsRef = useRef(new Map<number, object>());

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

    if (likeRequestsRef.current.has(targetUserId)) return;

    const request = {};
    const pageRequest = requestRef.current;
    const sessionVersion = getAuthSessionVersion();
    likeRequestsRef.current.set(targetUserId, request);
    const isCurrent = () => pageRequest.active && getAuthSessionVersion() === sessionVersion && likeRequestsRef.current.get(targetUserId) === request;

    setLikeLoadingUserIds((prev) => new Set(prev).add(targetUserId));
    try {
      const res = await toggleShowcaseLikeApi(targetUserId);
      if (!isCurrent()) return;
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
      if (!isCurrent()) return;
      console.error('Failed to toggle like:', err);
      const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(errMsg || '좋아요 처리에 실패했습니다.');
    } finally {
      if (likeRequestsRef.current.get(targetUserId) === request) {
        const wasCurrent = isCurrent();
        likeRequestsRef.current.delete(targetUserId);
        if (wasCurrent) setLikeLoadingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUserId);
          return next;
        });
      }
    }
  };

  // Initial fetch
  useEffect(() => {
    const request = { active: true };
    requestRef.current = request;
    loadingMoreRef.current = false;
    likeRequestsRef.current.clear();
    const fetchInitialRankings = async () => {
      setLikeLoadingUserIds(new Set());
      setIsLoading(true);
      setIsLoadingMore(false);
      setLoadMoreError(null);
      setHasNext(false);
      try {
        const res = await getShowcaseRankingsApi(null, null, 50);
        if (!request.active) return;
        setError(null);
        setRankings(res.content);
        setMyRanking(res.myRanking ?? null);
        setRankingUserId(isAuthenticated ? user?.id ?? null : null);
        setNextCursorLikeCount(res.nextCursorLikeCount);
        setNextCursorUserId(res.nextCursorUserId);
        setHasNext(res.hasNext);
      } catch (err) {
        if (!request.active) return;
        console.error('Failed to fetch showcase rankings:', err);
        setError('잠시 후 다시 시도해 주세요.');
      } finally {
        if (request.active) setIsLoading(false);
      }
    };

    fetchInitialRankings();
    return () => { request.active = false; };
  }, [retryCount, isAuthenticated, user?.id]);

  // Load more with cursor
  const loadMoreRankings = useCallback(async () => {
    if (!hasNext || isLoading || loadingMoreRef.current || nextCursorLikeCount === null || nextCursorUserId === null) return;

    const request = requestRef.current;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const res = await getShowcaseRankingsApi(nextCursorLikeCount, nextCursorUserId, 50);
      if (!request.active) return;
      setLoadMoreError(null);
      setRankings((prev) => [...prev, ...res.content]);
      setNextCursorLikeCount(res.nextCursorLikeCount);
      setNextCursorUserId(res.nextCursorUserId);
      setHasNext(res.hasNext);
    } catch (err) {
      if (!request.active) return;
      console.error('Failed to load more rankings:', err);
      setLoadMoreError('이미 불러온 랭킹은 유지됩니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      if (request.active) {
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [hasNext, isLoading, nextCursorLikeCount, nextCursorUserId]);

  // Infinite scroll intersection observer
  useEffect(() => {
    if (!observerRef.current || !hasNext || loadMoreError || isLoading) return;

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
  }, [hasNext, isLoadingMore, loadMoreError, isLoading, loadMoreRankings]);

  // Only use ranking data fetched for the current account. A missing myRanking
  // can still be recovered from that account's row in the loaded list.
  const displayedMyRanking = user && rankingUserId === user.id
    ? (myRanking?.userId === user.id ? myRanking : rankings.find((item) => item.userId === user.id))
    : undefined;
  const isMyShowcasePrivate = displayedMyRanking?.isPublic === false
    || (!displayedMyRanking && user?.isPublic === false);

  const renderRankBadge = (rank: number | null) => {
    if (rank === null) {
      return (
        <span aria-label="비공개 쇼케이스" className="ranking-position">
          <Lock className="size-4" aria-hidden="true" />
        </span>
      );
    }
    return (
      <span className={`ranking-position ${rank <= 3 ? 'ranking-position-leading' : ''}`}>
        {rank}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Ranking Content */}
      <main className="relative z-10 max-w-6xl mx-auto w-full p-4 sm:p-8 flex-1 flex flex-col select-none pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {/* Hero Header */}
        <div className="mb-5 flex flex-col justify-between gap-4 pt-3 sm:mb-6 sm:flex-row sm:items-end">
          <div className="flex items-start gap-4 sm:items-center">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-black tracking-[-0.03em] text-[var(--text-primary)] sm:text-4xl">
                <span>쇼케이스 랭킹</span>
              </h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                좋아요를 많이 받은 게임 쇼케이스를 둘러보세요.
              </p>
            </div>
          </div>

        </div>

        {/* Content State */}
        {error ? (
          <QueryError message={error} onRetry={() => setRetryCount((count) => count + 1)} isRetrying={isLoading} />
        ) : isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner size="lg" label="인기 랭킹 로딩 중..." />
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
            showGradients={false}
            enableArrowNavigation={false}
            displayScrollbar={true}
            className="w-full"
            listClassName="!max-h-none !overflow-visible border-t border-[var(--border-subtle)] !px-0 !py-0"
            renderItem={(item, index) => {
              const isOwner = user?.id === item.userId;

              return (
                <div
                  key={item.userId}
                  className={`ranking-row group ${isOwner ? 'ranking-row-own' : ''}`}
                >
                  <Link
                    to={`/showcase/${encodeURIComponent(item.username)}`}
                    className="ranking-profile"
                    aria-label={`${item.username}님의 쇼케이스 열기`}
                  >
                    {renderRankBadge(item.rank)}
                    <div className="size-10 shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--border-card)] sm:size-11">
                      <img
                        src={
                          item.avatarUrl ||
                          'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-accent)] sm:text-base" title={item.username}>{item.username}</span>
                        {isOwner && (
                          <span className="shrink-0 text-xs font-semibold text-[var(--primary-accent)]">
                            나
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[var(--text-secondary)]">보유 게임 {item.totalGamesCount.toLocaleString()}개</span>
                    </div>
                    <ArrowUpRight className="ranking-open-icon" aria-hidden="true" />
                  </Link>
                  <ShowcaseRankingPreview key={item.userId} userId={item.userId} username={item.username} autoLoad={index < 3} />
                  <div className="ranking-likes">
                    {isOwner ? (
                      <span className="ranking-like-count ranking-like-own" title="내 쇼케이스가 받은 좋아요" aria-label={`내 쇼케이스 좋아요 ${item.likeCount}개`}>
                        <Heart className="size-4" aria-hidden="true" />
                        <span className="tabular-nums">{item.likeCount.toLocaleString()}</span>
                        <span className="ranking-like-caption">받은 좋아요</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleLikeClick(e, item.userId)}
                        disabled={likeLoadingUserIds.has(item.userId)}
                        className={`ranking-like-count ranking-like-button ${item.isLiked ? 'ranking-like-selected' : ''}`}
                        title={item.isLiked ? '좋아요 취소' : '좋아요'}
                        aria-label={`${item.username}님 쇼케이스 ${item.isLiked ? '좋아요 취소' : '좋아요'}, 현재 ${item.likeCount}개`}
                        aria-pressed={item.isLiked}
                      >
                        <Heart className={`size-4 ${item.isLiked ? 'fill-current' : ''}`} aria-hidden="true" />
                        <span className="tabular-nums">{item.likeCount.toLocaleString()}</span>
                        <span className="ranking-like-caption">{item.isLiked ? '좋아요 취소' : '좋아요'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }}
            footer={
              loadMoreError ? (
                <div className="py-4">
                  <QueryError title="추가 랭킹을 불러오지 못했습니다" message={loadMoreError} onRetry={loadMoreRankings} isRetrying={isLoadingMore} />
                </div>
              ) : hasNext ? (
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
        <div role="status" aria-live="polite" className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xl animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <Info className="w-4 h-4 text-[var(--primary-accent)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Steam login prompt for unauthenticated likes */}
      <LoginRequiredModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Keep the personal bar visible while data loads; blur only the strip behind it. */}
      {isAuthenticated && user && (
        <section className="my-ranking-dock" aria-label="내 랭킹">
          <Link to="/" aria-label="내 쇼케이스 열기" className="my-ranking-bar flex max-w-full items-center gap-3 rounded-full border border-[var(--border-card)] px-4 py-2 select-none sm:px-5">
            <span className="whitespace-nowrap text-xs font-semibold text-[var(--text-secondary)]">내 랭킹</span>
            {isMyShowcasePrivate ? (
              <span title="비공개 쇼케이스" aria-label="비공개 쇼케이스" className="flex items-center text-[var(--text-secondary)]">
                <Lock className="w-4 h-4" />
              </span>
            ) : (
              <span
                aria-label={displayedMyRanking?.rank != null ? `순위 ${displayedMyRanking.rank}위` : '순위 확인 불가'}
                className="font-black text-sm tabular-nums text-[var(--text-primary)] sm:text-base"
              >
                {displayedMyRanking?.rank ?? '—'}
              </span>
            )}
            <img
              src={displayedMyRanking?.avatarUrl || user.avatarUrl || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'}
              alt={user.username}
              className="w-8 h-8 rounded-full ring-1 ring-[var(--border-card)] object-cover shrink-0"
            />
            <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-[var(--text-like)] sm:text-sm">
              <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span aria-label={displayedMyRanking ? `좋아요 ${displayedMyRanking.likeCount}개` : '좋아요 확인 불가'} className="tabular-nums">
                {displayedMyRanking?.likeCount ?? '—'}
              </span>
            </div>
            {!displayedMyRanking && (
              <span className="whitespace-nowrap text-xs text-[var(--text-secondary)]" role="status">
                {isLoading ? '조회 중' : '확인 불가'}
              </span>
            )}
            <ArrowUpRight className="size-3.5 shrink-0 text-[var(--primary-accent)]" aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
};

export default ShowcaseRankingPage;
