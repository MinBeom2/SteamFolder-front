import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import {
  Trophy,
  Crown,
  Calendar,
  Sparkles,
  ExternalLink,
  Clock,
  Gamepad2,
  Tag,
} from 'lucide-react';

export const GameDetailModal: React.FC = () => {
  const {
    isGameDetailModalOpen,
    selectedGameDetail,
    achievementDetail,
    isLoadingGameDetail,
    gameDetailError,
    closeGameDetailModal,
    openGameDetailModal,
  } = useShowcaseStore();

  if (!isGameDetailModalOpen || !selectedGameDetail) {
    return null;
  }

  const handleRetry = () => {
    if (selectedGameDetail) {
      openGameDetailModal(selectedGameDetail);
    }
  };

  const formatSyncedDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month}월 ${day}일 ${hours}:${mins}`;
  };

  const formatLastPlayed = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  };

  const total = achievementDetail?.totalAchievements ?? 0;
  const achieved = achievementDetail?.achievedAchievements ?? 0;
  const unachieved = Math.max(0, total - achieved);
  const rate = achievementDetail?.achievementRate ?? 0;
  const isPerfect = total > 0 && achieved === total;

  const playtimeHours =
    selectedGameDetail.playtimeForever !== undefined
      ? Math.round(selectedGameDetail.playtimeForever / 60)
      : null;
  const lastPlayedStr = formatLastPlayed(selectedGameDetail.lastPlayedAt);

  return (
    <Modal
      isOpen={isGameDetailModalOpen}
      onClose={closeGameDetailModal}
      maxWidth="2xl"
      title={
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-2.5">
            <div>
              <span className="font-bold text-slate-100 text-sm sm:text-base">
                상세 정보
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://store.steampowered.com/app/${selectedGameDetail.appId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#121620] border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="스팀 공식 상점 페이지 열기"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#66c0f4]" />
              <span>상점 페이지</span>
            </a>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Error Banner */}
        {gameDetailError && (
          <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center justify-between animate-in fade-in duration-200">
            <span>{gameDetailError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="text-xs text-red-200 hover:text-white underline p-0 h-auto"
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* 1. Game Meta Card */}
        <div className="relative rounded-2xl bg-[#0e1420] border border-slate-800/90 p-4 sm:p-5 overflow-hidden shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left: Game Thumbnail & Meta */}
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-28 sm:w-36 aspect-[460/215] rounded-xl overflow-hidden bg-[#07090e] border border-slate-700/80 shrink-0 shadow-md">
                <img
                  src={
                    selectedGameDetail.headerImage ||
                    `https://cdn.akamai.steamstatic.com/steam/apps/${selectedGameDetail.appId}/header.jpg`
                  }
                  alt={selectedGameDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-slate-100 truncate flex items-center gap-2">
                  <span>{selectedGameDetail.name}</span>
                  {isPerfect && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500/20 to-yellow-500/30 border border-amber-400/40 text-amber-300 flex items-center gap-1 shadow-sm">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span>100% PERFECT</span>
                    </span>
                  )}
                </h3>

                {/* Genre Tags */}
                {selectedGameDetail.genres && selectedGameDetail.genres.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedGameDetail.genres.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#162030] text-slate-300 border border-slate-700/60 flex items-center gap-1"
                      >
                        <Tag className="w-2.5 h-2.5 text-[#66c0f4]" />
                        <span>{g}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Playtime & Last Played */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-0.5">
                  {playtimeHours !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#66c0f4]" />
                      <span>
                        플레이타임: <strong className="text-slate-200">{playtimeHours}시간</strong>
                      </span>
                    </div>
                  )}

                  {lastPlayedStr && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>
                        최근 플레이: <strong className="text-slate-300">{lastPlayedStr}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Big Achievement Percentage */}
            {total > 0 && (
              <div className="sm:text-right shrink-0">
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center sm:justify-end gap-1">
                  <span className={isPerfect ? 'text-amber-400' : 'text-[#66c0f4]'}>
                    {rate.toFixed(1)}%
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">도전과제 달성률</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. Achievement Progress Section */}
        {isLoadingGameDetail ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="md" label="스팀 도전과제(업적) 달성률 조회 중..." />
          </div>
        ) : total === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-2 bg-[#0a0d14]/40 rounded-xl border border-slate-800/50">
            <Trophy className="w-7 h-7 text-slate-600 mx-auto stroke-1" />
            <p>이 게임에는 등록된 스팀 도전과제(업적)가 없습니다.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0a0f18] border border-slate-800/90 p-4 sm:p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2 font-semibold">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>
                  도전과제 달성 현황: <strong className="text-[#66c0f4]">{achieved}</strong> / <strong className="text-white">{total}</strong>

                </span>
              </span>

            </div>

            {/* Glowing Achievement Progress Bar */}
            <div className="w-full h-3 bg-black/70 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPerfect
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_14px_rgba(245,158,11,0.8)]'
                    : 'bg-gradient-to-r from-[#1b5e90] to-[#66c0f4] shadow-[0_0_12px_rgba(102,192,244,0.6)]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>상세보기 열람 시 자동 갱신되며, 게임별 60분의 쿨타임이 적용됩니다.</span>
          </div>

        </div>
      </div>
    </Modal>
  );
};
