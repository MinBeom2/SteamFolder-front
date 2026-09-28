import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPublicShowcaseApi, toggleShowcaseLikeApi } from '@/api/showcase';
import { getFolderDetailApi } from '@/api/folder';
import type { ShowcaseResponse, FolderResponse, CanvasItem } from '@/types/showcase';
import { FolderCard } from '@/components/desktop/FolderCard';
import { GameCard } from '@/components/desktop/GameCard';
import { GuestBanner } from '@/components/layout/GuestBanner';
import { Navbar } from '@/components/layout/Navbar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/common/Button';
import { Breadcrumb } from '@/components/desktop/Breadcrumb';
import { GameDetailModal } from '@/components/modals/GameDetailModal';
import { DirectLoginModal } from '@/components/modals/DirectLoginModal';
import { GuestUserGamesModal } from '@/components/modals/GuestUserGamesModal';
import { useAuthStore } from '@/store/useAuthStore';
import { Lock, Heart, Info, Share2, Check, ChevronRight } from 'lucide-react';

export const GuestShowcasePage: React.FC = () => {
  const { identifier, folderId } = useParams<{ identifier?: string; folderId?: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const targetId = identifier || 'guest';

  const [showcase, setShowcase] = useState<ShowcaseResponse | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Like state & interaction
  const [likeCount, setLikeCount] = useState<number>(0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isLikeLoading, setIsLikeLoading] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isGamesModalOpen, setIsGamesModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleShareClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + `/showcase/${encodeURIComponent(targetId)}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  // Fetch showcase data and subfolder if folderId in URL
  useEffect(() => {
    const fetchShowcaseData = async () => {
      setIsLoading(true);
      setIsPrivate(false);
      setError(null);

      try {
        const sc = await getPublicShowcaseApi(targetId);
        setShowcase(sc);
        setLikeCount(sc.user.likeCount ?? 0);
        setIsLiked(sc.user.isLiked ?? false);

        if (folderId) {
          const fid = Number(folderId);
          if (!isNaN(fid)) {
            try {
              const fDetail = await getFolderDetailApi(fid);
              setCurrentFolder(fDetail);
            } catch {
              navigate(`/showcase/${targetId}`, { replace: true });
            }
          }
        } else {
          setCurrentFolder(null);
        }
      } catch (err: unknown) {
        console.warn('Failed to fetch public showcase:', err);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setIsPrivate(true);
        } else {
          setError('해당 쇼케이스를 찾을 수 없거나 불러오지 못했습니다.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchShowcaseData();
  }, [targetId, folderId, navigate]);

  const handleOpenFolder = (folder: FolderResponse) => {
    navigate(`/showcase/${targetId}/folders/${folder.id}`);
  };

  const handleToggleLike = async () => {
    if (!showcase) return;

    if (!isAuthenticated || !currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    if (currentUser.id === showcase.user.id) {
      setToastMessage('자신의 쇼케이스에는 좋아요를 누를 수 없습니다.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    setIsLikeLoading(true);
    try {
      const res = await toggleShowcaseLikeApi(showcase.user.id);
      setIsLiked(res.liked);
      setLikeCount(res.totalLikeCount);
      setTimeout(() => setToastMessage(null), 2500);
    } catch (err: unknown) {
      console.error('Failed to toggle like:', err);
      const errMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setToastMessage(errMsg || '좋아요 처리에 실패했습니다.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsLikeLoading(false);
    }
  };

  // Convert currentFolders and currentGames into CanvasItem list (must be top level hook)
  const items = useMemo(() => {
    const list: CanvasItem[] = [];
    let fallbackIndex = 0;
    const assignPos = (posX?: number | null, posY?: number | null) => {
      if (posX !== undefined && posX !== null && posY !== undefined && posY !== null) {
        return { x: posX, y: posY };
      }
      const x = fallbackIndex % 6;
      const y = Math.floor(fallbackIndex / 6);
      fallbackIndex++;
      return { x, y };
    };

    if (currentFolder) {
      (currentFolder.childFolders || []).forEach((f) => {
        const { x, y } = assignPos(f.positionX, f.positionY);
        list.push({
          type: 'FOLDER',
          id: f.id,
          name: f.name,
          positionX: x,
          positionY: y,
          themeColor: f.themeColor,
          folderData: f,
        });
      });
      (currentFolder.games || []).forEach((g) => {
        const { x, y } = assignPos(g.positionX, g.positionY);
        list.push({
          type: 'GAME',
          id: g.id,
          name: g.name,
          positionX: x,
          positionY: y,
          appId: g.appId,
          headerImage: g.headerImage,
          genres: g.genres,
          playtimeForever: g.playtimeForever,
          lastPlayedAt: g.lastPlayedAt,
          totalAchievements: g.totalAchievements,
          achievedAchievements: g.achievedAchievements,
          achievementRate: g.achievementRate,
          gameData: g,
        });
      });
    } else if (showcase) {
      (showcase.rootFolders || []).forEach((f) => {
        const { x, y } = assignPos(f.positionX, f.positionY);
        list.push({
          type: 'FOLDER',
          id: f.id,
          name: f.name,
          positionX: x,
          positionY: y,
          themeColor: f.themeColor,
          folderData: f,
        });
      });
    }
    return list;
  }, [currentFolder, showcase]);

  const totalRows = useMemo(() => {
    let maxY = 3;
    items.forEach((it) => {
      if (it.positionY !== undefined && it.positionY >= maxY) {
        maxY = it.positionY + 1;
      }
    });
    return Math.max(3, maxY);
  }, [items]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="공개 쇼케이스 불러오는 중..." />
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[var(--bg-surface)] p-8 rounded-[3px] border border-amber-500/40 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">비공개 쇼케이스</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              사용자가 쇼케이스를 <strong>Private(비공개)</strong>로 설정하여 열람할 수 없습니다.
            </p>
            <Link to="/" className="btn-variant-cyan mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[3px] px-4 text-sm font-semibold">
              홈으로 돌아가기
            </Link>
          </div>
        </main>

        <GuestBanner />
      </div>
    );
  }

  if (error || !showcase) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between">
        <Navbar />

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[var(--bg-surface)] p-8 rounded-[3px] border border-[var(--border-card)] space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">쇼케이스를 찾을 수 없습니다</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {error || '존재하지 않는 유저이거나 등록된 쇼케이스가 없습니다.'}
            </p>
            <Link to="/" className="btn-variant-cyan mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[3px] px-4 text-sm font-semibold">
              홈으로 돌아가기
            </Link>
          </div>
        </main>

        <GuestBanner />
      </div>
    );
  }

  const playtimeHours = Math.round((showcase.stats.totalPlaytimeForever || 0) / 60);

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-app)] pb-20 text-[var(--text-primary)] transition-colors duration-300">
      {/* Background Dot Matrix Pattern */}
      <div className="absolute inset-0 desktop-dot-bg opacity-40 pointer-events-none" />

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xl animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <Info className="w-4 h-4 text-[var(--primary-accent)]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Navbar />

      {/* Main Showcase Container */}
      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 select-none flex-col justify-start px-5 py-9 sm:px-10 sm:py-12">
        {/* User Profile & Showcase Stats Banner */}
        <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex min-w-0 items-end gap-4 sm:gap-7">
            <img
              src={
                showcase.user.avatarUrl ||
                'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
              }
              alt={showcase.user.username}
              className="h-16 w-16 shrink-0 object-cover grayscale-[15%] sm:h-28 sm:w-28"
            />
            <div className="min-w-0">
              <h1 className="flex min-w-0 flex-wrap items-center gap-3 break-words text-3xl font-black tracking-[-0.04em] text-[var(--text-primary)] sm:text-6xl">
                {!showcase.user.isPublic && (
                  <span title="비공개 쇼케이스 (링크 공유됨)" className="flex items-center text-[var(--text-secondary)] shrink-0">
                    <Lock className="w-5 h-5 text-slate-400" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 break-all">{showcase.user.username}</span>
              </h1>
              <Button
                  variant="steam"
                  size="sm"
                  onClick={handleShareClick}
                  className="mt-3 min-h-11 px-3 text-xs font-medium"
                  leftIcon={
                    isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {isCopied ? '링크 복사됨!' : '공유'}
              </Button>
            </div>
          </div>

          {/* Profile Stats & Actions */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
            {/* Owned Games Button (방안 1: 칩/뱃지형) */}
            <button
              type="button"
              onClick={() => setIsGamesModalOpen(true)}
              className="group flex min-h-11 cursor-pointer items-center gap-2 py-1.5 text-xs font-semibold transition-colors hover:text-[var(--primary-accent)] sm:text-sm"
              title="보유 게임 전체 목록 열기"
            >
              <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">보유 게임</span>
              <strong className="text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary-accent)]">
                {showcase.stats.totalOwnedGames}개
              </strong>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary-accent)]" />
            </button>

            <span className="text-[var(--text-muted)] hidden sm:inline">•</span>

            <div className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              총 플레이 시간 <span className="text-[var(--text-primary)] font-bold ml-1">{playtimeHours}시간</span>
            </div>

            {/* Like Toggle Button */}
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={isLikeLoading}
              className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[2px] border px-3.5 text-xs font-semibold transition-colors sm:text-sm ${
                isLiked
                  ? 'bg-rose-500/15 border-rose-500/40 text-[var(--text-like)] hover:bg-rose-500/25'
                  : 'bg-[var(--nav-btn-bg)] border-[var(--nav-btn-border)] text-[var(--text-secondary)] hover:text-[var(--text-like)] hover:border-rose-400/40'
              }`}
              title={isLiked ? '좋아요 취소' : '쇼케이스 좋아요'}
              aria-label={`쇼케이스 ${isLiked ? '좋아요 취소' : '좋아요'}, 현재 ${likeCount}개`}
              aria-pressed={isLiked}
            >
              <Heart
                className={`w-4 h-4 transition-transform duration-200 ${
                  isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-current'
                }`}
              />
              <span>{likeCount}</span>
            </button>
          </div>
        </div>

        {/* Hierarchical Breadcrumb Navigation Path */}
        <div className="mb-5">
          <Breadcrumb
            isReadOnly={true}
            className="mb-0"
            basePath={`/showcase/${encodeURIComponent(targetId)}`}
            trail={
              currentFolder
                ? [
                    { id: null, name: `${showcase.user.username}님의 쇼케이스` },
                    ...(currentFolder.breadcrumbs || []).map((b) => ({
                      id: b.id,
                      name: b.name,
                    })),
                    { id: currentFolder.id, name: currentFolder.name },
                  ]
                : [{ id: null, name: `${showcase.user.username}님의 쇼케이스` }]
            }
          />
        </div>

        {/* 2D 6-Column Desktop Grid Canvas */}
        <div className="editorial-rule grid grid-cols-2 gap-3 border-y py-6 sm:grid-cols-3 md:hidden">
          {items.length === 0 ? (
            <p className="col-span-full py-16 text-center text-sm text-[var(--text-secondary)]">폴더가 비어있습니다.</p>
          ) : [...items].sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX).map((cellItem) => (
            <div key={`${cellItem.type}_${cellItem.id}`} className="flex min-w-0 items-start justify-center">
              {cellItem.type === 'FOLDER' && cellItem.folderData ? (
                <FolderCard item={cellItem} folder={cellItem.folderData} onOpen={() => handleOpenFolder(cellItem.folderData!)} isReadOnly />
              ) : cellItem.type === 'GAME' && cellItem.gameData ? (
                <GameCard item={cellItem} game={cellItem.gameData} isReadOnly />
              ) : null}
            </div>
          ))}
        </div>
        <div className="editorial-rule hidden min-h-[420px] grid-cols-6 gap-x-3 gap-y-7 border-y py-7 md:grid">
          {items.length === 0 ? (
            <div className="col-span-full py-20 text-center text-xs text-[var(--text-muted)]">
              폴더가 비어있습니다.
            </div>
          ) : (
            Array.from({ length: totalRows }).map((_, rowIndex) =>
              Array.from({ length: 6 }).map((_, colIndex) => {
                const cellItem = items.find(
                  (it) => it.positionX === colIndex && it.positionY === rowIndex
                );

                return (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    className="relative flex min-h-[142px] items-center justify-center"
                  >
                    {cellItem && cellItem.type === 'FOLDER' && cellItem.folderData && (
                      <div className="w-full flex items-center justify-center">
                        <FolderCard
                          item={cellItem}
                          folder={cellItem.folderData}
                          onOpen={() => handleOpenFolder(cellItem.folderData!)}
                          isReadOnly={true}
                        />
                      </div>
                    )}

                    {cellItem && cellItem.type === 'GAME' && cellItem.gameData && (
                      <div className="w-full flex items-center justify-center">
                        <GameCard
                          item={cellItem}
                          game={cellItem.gameData}
                          isReadOnly={true}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )
          )}
        </div>
      </main>

      {/* Bottom CTA Banner */}
      <GuestBanner />

      {/* Guest User Games Modal */}
      {showcase && (
        <GuestUserGamesModal
          isOpen={isGamesModalOpen}
          onClose={() => setIsGamesModalOpen(false)}
          identifier={targetId}
          username={showcase.user.username}
        />
      )}

      {/* Game Detail & Achievement Modal */}
      <GameDetailModal />

      {/* Direct Login Modal for Guest Interaction */}
      <DirectLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};

export default GuestShowcasePage;
