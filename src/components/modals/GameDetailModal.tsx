import React from 'react';
import {
  ExternalLink,
  Trophy,
  X,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useShowcaseStore } from '@/store/useShowcaseStore';

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

  if (!isGameDetailModalOpen || !selectedGameDetail) return null;

  const formatLastPlayed = (dateStr?: string | null) => {
    if (!dateStr) return '기록 없음';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '기록 없음';
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatPlaytime = (minutes?: number) => {
    if (minutes === undefined) return '정보 없음';
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours}시간 ${remainder}분` : `${hours}시간`;
  };

  const total = achievementDetail?.totalAchievements ?? 0;
  const achieved = achievementDetail?.achievedAchievements ?? 0;
  const rate = achievementDetail?.achievementRate ?? 0;
  const isPerfect = total > 0 && achieved === total;
  const isReadOnly = Boolean(selectedGameDetail.isReadOnly);
  const steamStoreUrl = `https://store.steampowered.com/app/${selectedGameDetail.appId}`;
  const headerImage =
    selectedGameDetail.headerImage ||
    `https://cdn.akamai.steamstatic.com/steam/apps/${selectedGameDetail.appId}/header.jpg`;

  return (
    <Modal
      isOpen={isGameDetailModalOpen}
      onClose={closeGameDetailModal}
      maxWidth="2xl"
      zIndex={70}
      showCloseButton={false}
    >
      <article className="-m-6 max-h-[92vh] overflow-y-auto no-scrollbar bg-[var(--bg-surface)] text-[var(--text-primary)]">
        <div className="relative overflow-hidden bg-black">
          <img
            src={headerImage}
            alt={`${selectedGameDetail.name} 헤더 이미지`}
            className="block h-auto w-full"
          />
          <a
            href={steamStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/65 active:scale-95"
            title="스팀 상점 페이지를 새 창에서 엽니다"
            aria-label="스팀 상점 페이지 열기"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={closeGameDetailModal}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-black/65 active:scale-95 cursor-pointer"
            aria-label="게임 상세보기 닫기"
          >
            <X className="h-4 w-4" />
          </button>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent via-black/15 to-black/55 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent_0%,black_80%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_80%)]"
          />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-2 sm:px-6 sm:pb-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {(selectedGameDetail.genres || []).slice(0, 5).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm backdrop-blur-sm"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-6 sm:px-8 sm:pb-8">
          {gameDetailError && !isReadOnly && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-300">
              <span>{gameDetailError}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openGameDetailModal(selectedGameDetail)}
                className="h-auto shrink-0 p-0 text-red-600 underline dark:text-red-200"
              >
                다시 시도
              </Button>
            </div>
          )}

          <section className="grid grid-cols-2 gap-3 border-y border-[var(--border-subtle)] py-4">
            <div className="border-r border-[var(--border-subtle)] pr-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  플레이타임
                </p>
                <p className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]">
                  {formatPlaytime(selectedGameDetail.playtimeForever)}
                </p>
              </div>
            </div>
            <div className="pl-1 sm:pl-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  최근 플레이
                </p>
                <p className="mt-1 truncate text-sm font-bold text-[var(--text-primary)]">
                  {formatLastPlayed(selectedGameDetail.lastPlayedAt)}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Achievement
                </p>
                <h3 className="mt-1 text-sm font-bold text-[var(--text-primary)]">도전과제</h3>
              </div>
              {!isLoadingGameDetail && total > 0 && (
                <div className="text-right">
                  <p className={`text-2xl font-black ${isPerfect ? 'text-emerald-500' : 'text-[var(--primary-accent)]'}`}>
                    {rate.toFixed(1)}%
                  </p>
                  <p className="text-[10px] font-medium text-[var(--text-muted)]">
                    {achieved} / {total} 달성
                  </p>
                </div>
              )}
            </div>

            {isReadOnly && !achievementDetail ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-4 py-5 text-center">
                <Trophy className="mx-auto h-5 w-5 text-[var(--text-muted)]" />
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  소유자가 아직 이 게임의 도전과제를 동기화하지 않았습니다.
                </p>
              </div>
            ) : isLoadingGameDetail ? (
              <div className="rounded-xl border border-[var(--border-card)] bg-[var(--bg-surface-elevated)] py-7">
                <LoadingSpinner size="md" label="스팀 도전과제 조회 중..." />
              </div>
            ) : total === 0 ? (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] px-4 py-5 text-center">
                <Trophy className="mx-auto h-5 w-5 text-[var(--text-muted)]" />
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  등록된 도전과제가 없습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-2.5 overflow-hidden rounded-full bg-black/10 p-0.5 ring-1 ring-[var(--border-card)] dark:bg-black/35">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${
                      isPerfect ? 'bg-emerald-500' : 'bg-[var(--primary-accent)]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                  />
                </div>
                <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                  저장된 최신 도전과제 정보를 표시합니다.
                </p>
              </div>
            )}
          </section>
        </div>
      </article>
    </Modal>
  );
};
