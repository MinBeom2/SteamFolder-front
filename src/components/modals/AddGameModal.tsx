import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Search,
  Check,
  Clock,
  RefreshCw,
  ArrowUpAZ,
  ArrowDownAZ,
  Calendar,
  Layers,
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
    isLoadingGames,
    isSyncingGames,
    cooldownSeconds,
    syncGames,
    checkCooldown,
    toggleGameSelection,
    addSelectedGamesToFolder,
    currentFolderId,
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

  const isCooldownActive = cooldownSeconds > 0;
  const cooldownMin = Math.floor(cooldownSeconds / 60);
  const cooldownSec = cooldownSeconds % 60;
  const formattedCooldown = `${cooldownMin}분 ${
    cooldownSec < 10 ? '0' + cooldownSec : cooldownSec
  }초`;

  // On open, fetch latest cooldown
  useEffect(() => {
    if (isOpen) {
      checkCooldown();
    }
  }, [isOpen, checkCooldown]);

  const handleSync = async () => {
    if (isCooldownActive) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await syncGames();
      setSuccessMessage(`스팀 게임 ${res.syncedGameCount}개가 성공적으로 동기화되었습니다!`);
    } catch (err: unknown) {
      console.error('Failed to sync games:', err);
      const resData = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (resData?.code !== 'G005' && !resData?.message?.includes('쿨다운')) {
        setErrorMessage(resData?.message || '스팀 동기화 요청 중 오류가 발생했습니다.');
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

  // 1. Filter by search & genre
  const filteredGames = userGames.filter((game) => {
    const matchesSearch = game.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesGenre =
      activeGenre === '전체' ||
      (game.genres &&
        game.genres.some((g) =>
          g.toLowerCase().includes(activeGenre.toLowerCase())
        ));
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

  const selectedCount = userGames.filter((g) => g.selected).length;

  const handleAdd = () => {
    addSelectedGamesToFolder(currentFolderId || 'root');
    onClose();
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
        <div className="flex items-center justify-between w-full pr-4">
          <span className="font-bold text-slate-100">게임 추가하기</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSync}
            disabled={isCooldownActive}
            isLoading={isSyncingGames}
            className={`text-[11px] py-1 px-3 border transition-all ${
              isCooldownActive
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-300 cursor-not-allowed'
                : 'bg-[#1e293b]/70 border-slate-700 hover:border-[#00F0FF]/50 text-slate-300'
            }`}
            leftIcon={
              <RefreshCw
                className={`w-3 h-3 ${
                  isCooldownActive ? 'text-amber-400' : 'text-[#00F0FF]'
                }`}
              />
            }
          >
            {isCooldownActive
              ? `쿨다운 중 (${formattedCooldown})`
              : '스팀 라이브러리 동기화 (API)'}
          </Button>
        </div>
      }
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Success Message Banner */}
        {successMessage && (
          <div className="p-3 bg-sky-950/60 border border-[#00F0FF]/40 rounded-xl text-xs text-[#00F0FF] flex items-center justify-between animate-in fade-in duration-200">
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between animate-in fade-in duration-200">
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="보유 게임 검색..."
            className="w-full pl-10 pr-4 py-2 bg-[#090d14] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] transition-all"
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
                className={`px-3.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#00F0FF] text-[#07090e] shadow-[0_0_10px_rgba(0,240,255,0.35)]'
                    : 'bg-[#121620] text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>

        {/* 3. Sort Row (Positioned underneath genre tags) */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/60 pb-1">
          {/* Left: Filtered games count */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Layers className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>
              총 <strong className="text-slate-200">{sortedGames.length}</strong>개 게임
            </span>
          </div>

          {/* Right: Clean Sort Buttons (Playtime, Recent, Toggleable Name) */}
          <div className="flex items-center gap-1 bg-[#090d14] p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setSortBy('playtime')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'playtime'
                  ? 'bg-[#1e293b] text-[#00F0FF] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="플레이타임이 많은 순으로 정렬"
            >
              <Clock className="w-3 h-3" />
              <span>플레이타임순</span>
            </button>

            <button
              type="button"
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'recent'
                  ? 'bg-[#1e293b] text-[#00F0FF] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="최근에 플레이한 순으로 정렬"
            >
              <Calendar className="w-3 h-3" />
              <span>최근 플레이순</span>
            </button>

            {/* Clean Static Name Sort Button */}
            <button
              type="button"
              onClick={handleNameSortClick}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                sortBy === 'name-asc' || sortBy === 'name-desc'
                  ? 'bg-[#1e293b] text-[#00F0FF] font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={
                sortBy === 'name-asc'
                  ? '현재 이름 오름차순 (클릭 시 역순 정렬)'
                  : sortBy === 'name-desc'
                  ? '현재 이름 역순 (클릭 시 오름차순 정렬)'
                  : '이름순 정렬'
              }
            >
              {sortBy === 'name-desc' ? (
                <ArrowDownAZ className="w-3.5 h-3.5 text-[#00F0FF]" />
              ) : (
                <ArrowUpAZ className="w-3.5 h-3.5" />
              )}
              <span>이름순</span>
            </button>
          </div>
        </div>

        {/* 4. Game Card Grid (3 Columns) - Steam Official Header Aspect Ratio (460:215) */}
        {isLoadingGames ? (
          <div className="py-16 flex items-center justify-center">
            <LoadingSpinner size="md" label="스팀 게임 목록 불러오는 중..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[380px] overflow-y-auto pr-1">
            {sortedGames.map((game) => {
              const isSelected = !!game.selected;
              const playtimeHours = Math.round((game.playtimeForever || 0) / 60);
              const lastPlayedFormatted = formatLastPlayed(game.lastPlayedAt);

              return (
                <div
                  key={game.appId}
                  onClick={() => toggleGameSelection(game.appId)}
                  className={`relative rounded-xl bg-[#121620] border transition-all duration-200 cursor-pointer overflow-hidden group select-none ${
                    isSelected
                      ? 'border-[#00F0FF] shadow-[0_0_14px_rgba(0,240,255,0.25)]'
                      : 'border-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  {/* Official Steam Header Image (460x215) Container */}
                  <div className="relative w-full aspect-[460/215] overflow-hidden bg-[#07090e]">
                    <img
                      src={game.headerImage}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {/* Top right checkbox */}
                    <div
                      className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#00F0FF] text-[#07090e]'
                          : 'bg-black/60 border border-slate-500/60'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 font-bold" />}
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-3">
                    <h4 className="font-bold text-xs text-slate-100 truncate mb-1.5 group-hover:text-[#00F0FF] transition-colors">
                      {game.name}
                    </h4>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#00F0FF]" />
                        <span className="font-medium text-slate-300">
                          {playtimeHours}시간
                        </span>
                      </div>

                      {lastPlayedFormatted && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{lastPlayedFormatted}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedGames.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-500 space-y-3">
                <p>조건과 일치하는 게임이 없습니다.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSync}
                  disabled={isCooldownActive}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[#00F0FF]" />}
                >
                  {isCooldownActive
                    ? `쿨다운 중 (${formattedCooldown})`
                    : '스팀 라이브러리 동기화 실행'}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium">
            선택된 게임: <strong className="text-[#00F0FF]">{selectedCount}</strong>개
          </span>
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              취소
            </Button>
            <Button
              type="button"
              variant="cyan"
              size="sm"
              onClick={handleAdd}
              className="px-5 text-xs font-bold"
            >
              선택한 게임 추가
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
