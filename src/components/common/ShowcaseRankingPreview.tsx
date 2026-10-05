import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Eye, Folder, Gamepad2 } from 'lucide-react';
import { getPublicShowcaseApi } from '@/api/showcase';
import { getAuthSessionVersion } from '@/utils/authSession';
import type { FolderResponse, FolderGameDto, ShowcaseResponse } from '@/types/showcase';

interface PreviewProps {
  userId: number;
  username: string;
  autoLoad?: boolean;
}

interface PreviewSummary {
  folderNames: string[];
  totalFolders: number;
  games: FolderGameDto[];
}

type PreviewState = {
  scope: string;
  status: 'loading' | 'ready' | 'error' | 'private';
  summary?: PreviewSummary;
};

function summarize(showcase: ShowcaseResponse): PreviewSummary {
  const games: FolderGameDto[] = [];
  const seen = new Set<number>();
  const byPosition = (a: { positionX: number; positionY: number }, b: { positionX: number; positionY: number }) =>
    a.positionY - b.positionY || a.positionX - b.positionX;
  const roots = [...showcase.rootFolders].sort(byPosition);
  const queue: FolderResponse[] = [...roots];
  while (queue.length && games.length < 3) {
    const folder = queue.shift()!;
    for (const game of [...(folder.games ?? [])].sort(byPosition)) {
      if (!seen.has(game.appId)) {
        seen.add(game.appId);
        games.push(game);
        if (games.length === 3) break;
      }
    }
    queue.push(...[...(folder.childFolders ?? [])].sort(byPosition));
  }
  return { games, folderNames: roots.slice(0, 2).map((folder) => folder.name), totalFolders: showcase.stats.totalFolders };
}

const PreviewCover: React.FC<{ game: FolderGameDto }> = ({ game }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="ranking-preview-cover" title={game.name}>
      {game.headerImage && !failed ? (
        <img src={game.headerImage} alt={game.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className="flex min-w-0 items-center gap-1 px-1.5 text-[var(--text-secondary)]">
          <Gamepad2 className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate text-[10px]">{game.name}</span>
        </span>
      )}
    </span>
  );
};

export const ShowcaseRankingPreview: React.FC<PreviewProps> = ({ userId, username, autoLoad = false }) => {
  const sessionVersion = getAuthSessionVersion();
  const scope = `${sessionVersion}:${userId}:${username}`;
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const focusAfterLoadRef = useRef(false);
  const mountedRef = useRef(false);
  const requestRef = useRef<{ scope: string } | null>(null);
  const current = preview?.scope === scope ? preview : null;

  const loadPreview = useCallback(async () => {
    if (requestRef.current?.scope === scope) return;
    const request = { scope };
    requestRef.current = request;
    const isCurrent = () => mountedRef.current && requestRef.current === request && getAuthSessionVersion() === sessionVersion;
    try {
      const response = await getPublicShowcaseApi(username);
      if (!isCurrent()) return;
      if (response.user.id !== userId) throw new Error('Showcase owner changed');
      if (!response.user.isPublic) {
        setPreview({ scope, status: 'private' });
        return;
      }
      setPreview({ scope, status: 'ready', summary: summarize(response) });
    } catch {
      if (isCurrent()) setPreview({ scope, status: 'error' });
    } finally {
      if (requestRef.current === request) requestRef.current = null;
    }
  }, [scope, sessionVersion, username, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!autoLoad || current || !containerRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void loadPreview();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [autoLoad, current, loadPreview]);

  useEffect(() => {
    if (!focusAfterLoadRef.current || !current || current.status === 'loading') return;
    focusAfterLoadRef.current = false;
    if (current.status === 'ready') linkRef.current?.focus();
    else if (current.status === 'error') retryRef.current?.focus();
    else containerRef.current?.focus();
  }, [current]);

  const requestPreview = (event?: React.MouseEvent) => {
    if (requestRef.current?.scope === scope) return;
    focusAfterLoadRef.current = event?.detail === 0;
    setPreview({ scope, status: 'loading' });
    void loadPreview();
  };

  const summary = current?.summary;
  return (
    <div ref={containerRef} tabIndex={-1} className={`ranking-preview ${!autoLoad && !current ? 'ranking-preview-collapsed' : ''}`} aria-label={`${username}님의 쇼케이스 미리보기`}>
      {current?.status === 'loading' || (!current && autoLoad) ? (
        <div className="ranking-preview-loading" role="status">
          <span className="sr-only">쇼케이스 미리보기 불러오는 중</span>
          <span className="ranking-preview-skeleton" /><span className="ranking-preview-skeleton" /><span className="ranking-preview-skeleton" />
        </div>
      ) : current?.status === 'error' ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs text-[var(--text-secondary)]" role="status">미리보기를 불러오지 못했습니다.</span>
          <button ref={retryRef} type="button" onClick={requestPreview} className="ranking-preview-trigger" aria-label={`${username}님 미리보기 다시 시도`}>다시 시도</button>
        </div>
      ) : current?.status === 'private' ? (
        <span className="text-xs text-[var(--text-secondary)]" role="status">비공개로 전환된 쇼케이스입니다.</span>
      ) : summary ? (
        <Link ref={linkRef} to={`/showcase/${encodeURIComponent(username)}`} className="ranking-preview-link" aria-label={`${username}님 쇼케이스 미리보기에서 열기`}>
          {summary.games.length > 0 && (
            <span className="flex min-w-0 gap-1.5">
              {summary.games.map((game) => <PreviewCover key={game.appId} game={game} />)}
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Folder className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate" title={summary.folderNames.join(' · ')}>
              {summary.folderNames.length ? summary.folderNames.join(' · ') : '아직 배치된 폴더가 없습니다.'}
            </span>
            {summary.totalFolders > 2 && <span className="shrink-0 text-[var(--text-muted)]">외 {summary.totalFolders - 2}개</span>}
          </span>
        </Link>
      ) : (
        <button type="button" className="ranking-preview-trigger" onClick={requestPreview} aria-label={`${username}님 쇼케이스 미리보기 불러오기`}>
          <Eye className="size-3.5" aria-hidden="true" /><span>미리보기</span><ChevronDown className="ranking-preview-chevron size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
