import React from 'react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import {
  Trophy,
  Calendar,
  Clock,
  ExternalLink,
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
  const rate = achievementDetail?.achievementRate ?? 0;
  const isPerfect = total > 0 && achieved === total;

  const playtimeHours =
    selectedGameDetail.playtimeForever !== undefined
      ? Math.round(selectedGameDetail.playtimeForever / 60)
      : null;
  const lastPlayedStr = formatLastPlayed(selectedGameDetail.lastPlayedAt);
  const isReadOnly = Boolean(selectedGameDetail.isReadOnly);

  return (
    <Modal
      isOpen={isGameDetailModalOpen}
      onClose={closeGameDetailModal}
      maxWidth="lg"
      zIndex={70}
      title={
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight truncate">
            {selectedGameDetail.name}
          </h3>
          <a
            href={`https://store.steampowered.com/app/${selectedGameDetail.appId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] text-[var(--text-secondary)] hover:text-[#66c0f4] hover:border-[#66c0f4]/50 active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer group"
            title="스팀 공식 상점 페이지 열기 (새 창)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[#66c0f4] transition-colors" />
            <span>스팀 상점</span>
          </a>
        </div>
      }
    >
      <div className="space-y-4 text-[var(--text-primary)]">
        {/* Error Banner */}
        {gameDetailError && !isReadOnly && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between animate-in fade-in duration-200">
            <span>{gameDetailError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="text-xs text-red-600 dark:text-red-200 hover:text-red-800 dark:hover:text-white underline p-0 h-auto"
            >
              다시 시도
            </Button>
          </div>
        )}

        {/* 1. Full-width Game Header Image Banner */}
        <div className="w-full aspect-[460/215] max-h-[220px] rounded-lg overflow-hidden bg-[#07090e] border border-[var(--border-subtle)] shadow-sm flex items-center justify-center">
          <img
            src={
              selectedGameDetail.headerImage ||
              `https://cdn.akamai.steamstatic.com/steam/apps/${selectedGameDetail.appId}/header.jpg`
            }
            alt={selectedGameDetail.name}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Genre Tags (if present) */}
        {selectedGameDetail.genres && selectedGameDetail.genres.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedGameDetail.genres.map((g) => (
              <span
                key={g}
                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* 2. Playtime & Last Played Info Grid (Moved below) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] flex items-center gap-2.5 shadow-xs">
            <div className="w-8 h-8 rounded-md bg-[var(--nav-btn-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[var(--primary-accent)]" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] text-[var(--text-secondary)] block font-medium">플레이타임</span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {playtimeHours !== null ? `${playtimeHours}시간` : '-'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] flex items-center gap-2.5 shadow-xs">
            <div className="w-8 h-8 rounded-md bg-[var(--nav-btn-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <span className="text-[11px] text-[var(--text-secondary)] block font-medium">최근 플레이</span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {lastPlayedStr || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Integrated Achievement Progress Section (도전과제 달성률 및 현황 통합) */}
        {isReadOnly && !achievementDetail ? (
          <div className="py-6 px-4 text-center space-y-2 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-subtle)] shadow-xs">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
              <Trophy className="w-4 h-4 text-[var(--text-muted)] stroke-1" />
              <span>도전과제 달성 현황</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              소유자가 아직 이 게임의 도전과제를 동기화하지 않았습니다.
            </p>
          </div>
        ) : isLoadingGameDetail ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2.5 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-card)]">
            <LoadingSpinner size="md" label="스팀 도전과제 달성률 조회 중..." />
          </div>
        ) : total === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--text-muted)] space-y-1.5 bg-[var(--bg-surface-elevated)] rounded-lg border border-[var(--border-subtle)]">
            <Trophy className="w-6 h-6 text-slate-400 dark:text-slate-600 mx-auto stroke-1" />
            <p>이 게임에는 등록된 도전과제가 없습니다.</p>
          </div>
        ) : (
          <div className="rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-card)] p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-[var(--text-secondary)]">
                <Trophy
                  className={`w-4 h-4 ${
                    isPerfect
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-[var(--primary-accent)]'
                  }`}
                />
                <span>도전과제 달성 현황</span>
              </span>

              {/* Achievement Count & Rate */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-[var(--text-primary)]">
                  <strong
                    className={
                      isPerfect
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-[var(--primary-accent)]'
                    }
                  >
                    {achieved}
                  </strong>{' '}
                  / {total}
                </span>
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    isPerfect
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                  }`}
                >
                  {rate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Achievement Progress Bar (Green when 100%, Cyan/Blue otherwise) */}
            <div className="w-full h-2.5 bg-black/10 dark:bg-black/40 rounded-full overflow-hidden border border-[var(--border-card)] p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isPerfect
                    ? 'bg-emerald-500 dark:bg-emerald-400'
                    : 'bg-[#66c0f4] dark:bg-[#66c0f4] light:bg-[#1a5b8c]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
              />
            </div>
          </div>
        )}

        {/* Auto-refresh Notice (No bottom 닫기 button) */}
        {!isReadOnly && (
          <p className="text-[11px] text-[var(--text-muted)] text-center pt-1">
            상세보기 열람 시 자동 갱신되며, 게임별 60분의 쿨타임이 적용됩니다.
          </p>
        )}
      </div>
    </Modal>
  );
};
