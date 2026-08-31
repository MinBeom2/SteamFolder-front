import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPublicShowcaseApi } from '@/api/showcase';
import { getFolderDetailApi } from '@/api/folder';
import type { ShowcaseResponse, FolderResponse } from '@/types/showcase';
import { FolderCard } from '@/components/desktop/FolderCard';
import { GameCard } from '@/components/desktop/GameCard';
import { GuestBanner } from '@/components/layout/GuestBanner';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/common/Button';
import {
  Sparkles,
  Lock,
  Globe,
  Folder as FolderIcon,
  Gamepad2,
  Clock,
  ArrowLeft,
} from 'lucide-react';

export const GuestShowcasePage: React.FC = () => {
  const { identifier, folderId } = useParams<{ identifier?: string; folderId?: string }>();
  const navigate = useNavigate();
  const targetId = identifier || 'guest';

  const [showcase, setShowcase] = useState<ShowcaseResponse | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch showcase data and subfolder if folderId in URL
  useEffect(() => {
    const fetchShowcaseData = async () => {
      setIsLoading(true);
      setIsPrivate(false);
      setError(null);

      try {
        const sc = await getPublicShowcaseApi(targetId);
        setShowcase(sc);

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

  const themeColor = showcase?.user.themeColor || '#00F0FF';

  const handleOpenFolder = (folder: FolderResponse) => {
    navigate(`/showcase/${targetId}/folders/${folder.id}`);
  };

  const handleGoBack = () => {
    if (currentFolder?.parentFolderId) {
      navigate(`/showcase/${targetId}/folders/${currentFolder.parentFolderId}`);
    } else {
      navigate(`/showcase/${targetId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" label="공개 쇼케이스 불러오는 중..." />
      </div>
    );
  }

  if (isPrivate) {
    return (
      <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col justify-between selection:bg-[#00F0FF]/30 selection:text-white">
        <header className="sticky top-0 z-40 w-full bg-[#0b0e14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1 group cursor-pointer shrink-0">
              <span className="font-black text-lg tracking-tight text-white group-hover:text-[#00F0FF] transition-colors">
                SteamFolder
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full glass-modal p-8 rounded-2xl border border-amber-800/60 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">비공개 쇼케이스</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
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
      <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col justify-between selection:bg-[#00F0FF]/30 selection:text-white">
        <header className="sticky top-0 z-40 w-full bg-[#0b0e14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-1 group cursor-pointer shrink-0">
              <span className="font-black text-lg tracking-tight text-white group-hover:text-[#00F0FF] transition-colors">
                SteamFolder
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full glass-modal p-8 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold text-white">쇼케이스를 찾을 수 없습니다</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
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

  // Items to display in current view
  const currentFolders = currentFolder
    ? currentFolder.childFolders || []
    : showcase.rootFolders || [];

  const currentGames = currentFolder ? currentFolder.games || [] : [];

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] flex flex-col justify-between pb-24 selection:bg-[#00F0FF]/30 selection:text-white">
      {/* Ambient Theme Background Glow */}
      <div
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full blur-[160px] opacity-15 pointer-events-none transition-all duration-500"
        style={{ backgroundColor: themeColor }}
      />

      {/* Top Guest Navbar */}
      <header className="sticky top-0 z-40 w-full bg-[#0b0e14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 group cursor-pointer shrink-0">
            <span className="font-black text-lg tracking-tight text-white group-hover:text-[#00F0FF] transition-colors">
              SteamFolder
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#121620] text-slate-300 border border-slate-700/80 flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-[#00F0FF]" />
              <span>GUEST VIEW • 읽기 전용</span>
            </span>

            <Link to="/">
              <Button
                variant="steam"
                size="sm"
                className="text-xs font-semibold px-4"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                나도 만들기
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Showcase Container */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-10 flex-1">
        {/* User Profile & Showcase Stats Banner */}
        <div className="flex flex-wrap items-center justify-between gap-6 p-6 rounded-2xl bg-[#0f141f]/80 border border-slate-800/80 backdrop-blur-md mb-8">
          <div className="flex items-center gap-4">
            <img
              src={
                showcase.user.avatarUrl ||
                'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'
              }
              alt={showcase.user.username}
              className="w-14 h-14 rounded-full ring-2 ring-[#00F0FF]/60 object-cover shadow-lg"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{showcase.user.username}님의 쇼케이스</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                SteamID: <span className="font-mono text-slate-300">{showcase.user.steamId}</span>
              </p>
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="px-3.5 py-2 rounded-xl bg-[#090d14] border border-slate-800 flex items-center gap-2 text-xs">
              <FolderIcon className="w-4 h-4 text-[#00F0FF]" />
              <div>
                <span className="text-slate-400 block text-[10px]">총 폴더</span>
                <strong className="text-white font-bold">{showcase.stats.totalFolders}개</strong>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-[#090d14] border border-slate-800 flex items-center gap-2 text-xs">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">보유 게임</span>
                <strong className="text-white font-bold">{showcase.stats.totalOwnedGames}개</strong>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-[#090d14] border border-slate-800 flex items-center gap-2 text-xs">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">총 플레이시간</span>
                <strong className="text-white font-bold">{playtimeHours}시간</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Folder Navigation Path when inside subfolder */}
        {currentFolder && (
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGoBack}
              className="text-xs text-slate-300 bg-[#121620]"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              상위 폴더로
            </Button>
            <span className="text-xs text-slate-400 font-semibold">
              현재 위치: <strong className="text-[#00F0FF]">{currentFolder.name}</strong>
            </span>
          </div>
        )}

        {/* 2D 6-Column Grid Items */}
        <div className="p-6 rounded-2xl bg-[#090d14]/40 border border-slate-800/60 backdrop-blur-sm min-h-[380px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {/* Folders */}
            {currentFolders.map((folder) => (
              <FolderCard
                key={`folder-${folder.id}`}
                item={{
                  type: 'FOLDER',
                  id: folder.id,
                  name: folder.name,
                  positionX: folder.positionX,
                  positionY: folder.positionY,
                  themeColor: folder.themeColor,
                  folderData: folder,
                }}
                folder={folder}
                onOpen={() => handleOpenFolder(folder)}
                isReadOnly={true}
              />
            ))}

            {/* Games in folder */}
            {currentGames.map((game) => (
              <GameCard
                key={`game-${game.id}`}
                item={{
                  type: 'GAME',
                  id: game.id,
                  name: game.name,
                  positionX: game.positionX,
                  positionY: game.positionY,
                  appId: game.appId,
                  headerImage: game.headerImage,
                  genres: game.genres,
                  gameData: game,
                }}
                game={game}
                isReadOnly={true}
              />
            ))}

            {currentFolders.length === 0 && currentGames.length === 0 && (
              <div className="col-span-full py-16 text-center text-xs text-slate-500">
                폴더에 등록된 항목이 없습니다.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom CTA Banner */}
      <GuestBanner />
    </div>
  );
};

export default GuestShowcasePage;
