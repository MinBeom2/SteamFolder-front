import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPublicShowcaseApi, toggleShowcaseLikeApi } from '@/api/showcase';
import { getFolderDetailApi } from '@/api/folder';
import type { ShowcaseResponse, FolderResponse, CanvasItem } from '@/types/showcase';
import { FolderCard } from '@/components/desktop/FolderCard';
import { GameCard } from '@/components/desktop/GameCard';
import { GuestBanner } from '@/components/layout/GuestBanner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/common/Button';
import { Breadcrumb } from '@/components/desktop/Breadcrumb';
import { GameDetailModal } from '@/components/modals/GameDetailModal';
import { DirectLoginModal } from '@/components/modals/DirectLoginModal';
import { useThemeStore } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Lock, Sun, Moon, Heart, Info, Share2, Check } from 'lucide-react';

export const GuestShowcasePage: React.FC = () => {
  const { identifier, folderId } = useParams<{ identifier?: string; folderId?: string }>();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
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
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between selection:bg-[#66c0f4]/20">
        <header className="sticky top-0 z-40 w-full bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-subtle)] px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1 group cursor-pointer shrink-0">
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)] group-hover:text-[#66c0f4] transition-colors">
                SteamFolder
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full glass-modal p-8 rounded-xl border border-amber-500/40 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">비공개 쇼케이스</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              사용자가 쇼케이스를 <strong>Private(비공개)</strong>로 설정하여 열람할 수 없습니다.
            </p>
            <Link to="/">
              <Button variant="cyan" size="sm" className="w-full mt-4">
                홈으로 돌아가기
              </Button>
            </Link>
          </div>
        </main>

        <GuestBanner />
      </div>
    );
  }

  if (error || !showcase) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between selection:bg-[#66c0f4]/20">
        <header className="sticky top-0 z-40 w-full bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-subtle)] px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1 cursor-pointer shrink-0">
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)] transition-colors">
                SteamFolder
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full glass-modal p-8 rounded-xl border border-[var(--border-card)] space-y-4 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">쇼케이스를 찾을 수 없습니다</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {error || '존재하지 않는 유저이거나 등록된 쇼케이스가 없습니다.'}
            </p>
            <Link to="/">
              <Button variant="cyan" size="sm" className="w-full mt-4">
                홈으로 돌아가기
              </Button>
            </Link>
          </div>
        </main>

        <GuestBanner />
      </div>
    );
  }

  const playtimeHours = Math.round((showcase.stats.totalPlaytimeForever || 0) / 60);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col justify-between pb-20 selection:bg-[#66c0f4]/20 transition-colors duration-200">
      {/* Background Dot Matrix Pattern */}
      <div className="absolute inset-0 desktop-dot-bg opacity-40 pointer-events-none" />

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-xl animate-in fade-in slide-in-from-top-2 text-xs font-semibold">
          <Info className="w-4 h-4 text-[#66c0f4]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Guest Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border-subtle)] px-6 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 cursor-pointer shrink-0">
            <span className="font-bold text-lg tracking-tight text-[var(--text-primary)] transition-colors">
              SteamFolder
            </span>
          </Link>

          <div className="flex items-center gap-2.5">

            {/* Dark / Light Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-md bg-[var(--nav-btn-bg)] border border-[var(--nav-btn-border)] text-[var(--nav-btn-text)] hover:text-[var(--text-primary)] hover:border-[var(--border-card)] active:scale-[0.96] transition-colors cursor-pointer flex items-center justify-center shadow-xs"
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label="테마 모드 전환"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500 hover:-rotate-12 transition-transform" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Showcase Container */}
      <main className="relative z-10 max-w-7xl mx-auto w-full p-4 sm:p-8 flex-1 flex flex-col justify-start select-none">
        {/* User Profile & Showcase Stats Banner */}
        <div className="flex flex-wrap items-center justify-between gap-6 p-5 sm:p-6 rounded-xl bg-[var(--glass-panel-bg)] border border-[var(--border-subtle)] backdrop-blur-md mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <img
              src={
                showcase.user.avatarUrl ||
                'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
              }
              alt={showcase.user.username}
              className="w-14 h-14 rounded-full ring-2 ring-[var(--border-card)] object-cover shadow-sm"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                {!showcase.user.isPublic && (
                  <span title="비공개 쇼케이스 (링크 공유됨)" className="flex items-center text-[var(--text-secondary)] shrink-0">
                    <Lock className="w-5 h-5 text-slate-400" aria-hidden="true" />
                  </span>
                )}
                <span>{showcase.user.username}님의 쇼케이스</span>
                <Button
                  variant="steam"
                  size="sm"
                  onClick={handleShareClick}
                  className="h-7 text-xs font-medium px-2.5 ml-1 shadow-xs cursor-pointer"
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
              </h1>
            </div>
          </div>

          {/* Plain Text Stats & Like Action Button */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
            <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              <div>
                보유 게임 <span className="text-[var(--text-primary)] font-bold ml-1">{showcase.stats.totalOwnedGames}개</span>
              </div>
              <span className="text-[var(--text-muted)]">•</span>
              <div>
                총 플레이 시간 <span className="text-[var(--text-primary)] font-bold ml-1">{playtimeHours}시간</span>
              </div>
            </div>

            {/* Like Toggle Button */}
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={isLikeLoading}
              className={`h-9 px-3.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 ${
                isLiked
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
                  : 'bg-[var(--nav-btn-bg)] border-[var(--nav-btn-border)] text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-400/40'
              }`}
              title={isLiked ? '좋아요 취소' : '쇼케이스 좋아요'}
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
        <div className="mb-4">
          <Breadcrumb
            isReadOnly={true}
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 min-h-[420px] p-4 rounded-xl bg-[var(--glass-panel-bg)] border border-[var(--border-subtle)] backdrop-blur-sm shadow-sm">
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
                    className="relative min-h-[130px] rounded-lg flex items-center justify-center"
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
