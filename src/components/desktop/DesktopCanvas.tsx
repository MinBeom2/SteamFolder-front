import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { FolderCard } from './FolderCard';
import { GameCard } from './GameCard';
import { Breadcrumb } from './Breadcrumb';
import { LandingHeroMarquee } from './LandingHeroMarquee';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Plus,
  FolderPlus,
  Info,
  Share2,
  Check,
  Lock,
} from 'lucide-react';

interface DesktopCanvasProps {
  isReadOnly?: boolean;
}

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const DesktopCanvas: React.FC<DesktopCanvasProps> = ({ isReadOnly = false }) => {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuthStore();
  const {
    showcase,
    currentFolderId,
    currentFolder,
    items,
    isLoadingShowcase,
    selectedItemKeys,
    toastMessage,
    loadFolderView,
    openContextMenu,
    clearSelection,
    selectMultipleItems,
    moveItemPosition,
    copySelected,
    cutSelected,
    pasteClipboard,
    removeSelectedGamesFromFolder,
    setCreateFolderModalOpen,
    setEditFolderModalOpen,
    setAddGameModalOpen,
    setToastMessage,
    searchQuery,
  } = useShowcaseStore();

  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);

  const [isCopied, setIsCopied] = useState(false);

  const handleShareClick = async () => {
    if (!user) return;
    const identifier = user.username || user.steamId || showcase?.user?.username || showcase?.user?.steamId;
    if (!identifier) return;
    const shareUrl = `${window.location.origin}/showcase/${encodeURIComponent(identifier)}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setToastMessage('쇼케이스 링크가 클립보드에 복사되었습니다.');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      navigate(`/showcase/${encodeURIComponent(identifier)}`);
    }
  };

  // Windows-style Marquee Selection State
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const isSelectingRef = useRef(false);

  // Synchronize URL folderId parameter with showcase view
  useEffect(() => {
    if (!isAuthenticated || isReadOnly) return;

    const syncFolderFromUrl = async () => {
      if (folderId) {
        const idNum = Number(folderId);
        if (!isNaN(idNum)) {
          try {
            await loadFolderView(idNum);
          } catch {
            navigate('/', { replace: true });
            setToastMessage('존재하지 않거나 삭제된 폴더입니다.');
          }
        } else {
          navigate('/', { replace: true });
        }
      } else {
        await loadFolderView(null);
      }
    };

    syncFolderFromUrl();
  }, [isAuthenticated, folderId, isReadOnly, loadFolderView, navigate, setToastMessage]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore typing in input/textarea
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copySelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        cutSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelectedGamesFromFolder();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      } else if (e.key === 'F2') {
        e.preventDefault();
        const folderKey = selectedItemKeys.find((k) => k.startsWith('FOLDER_'));
        if (folderKey) {
          const fid = Number(folderKey.replace('FOLDER_', ''));
          const folderItem = items.find(
            (it) => it.type === 'FOLDER' && it.id === fid
          );
          if (folderItem && folderItem.folderData) {
            setEditFolderModalOpen(true, folderItem.folderData);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isReadOnly,
    copySelected,
    cutSelected,
    pasteClipboard,
    removeSelectedGamesFromFolder,
    clearSelection,
    selectedItemKeys,
    items,
    setEditFolderModalOpen,
  ]);

  // Filter items by search query if any
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    return items.filter((it) =>
      it.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  // Determine grid dimensions (fixed 6 columns, dynamic rows)
  const totalRows = useMemo(() => {
    let maxY = 3;
    filteredItems.forEach((it) => {
      if (it.positionY > maxY) maxY = it.positionY;
    });
    return Math.max(maxY + 2, 4);
  }, [filteredItems]);

  // Windows Marquee Selection Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isReadOnly) return;
    if ((e.target as HTMLElement).closest('[data-interactive="true"]')) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    isSelectingRef.current = true;
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    setSelectionBox({
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      clearSelection();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelectingRef.current || !selectionBox || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

    // Calculate Marquee Box dimensions
    const boxLeft = Math.min(selectionBox.startX, currentX);
    const boxTop = Math.min(selectionBox.startY, currentY);
    const boxRight = Math.max(selectionBox.startX, currentX);
    const boxBottom = Math.max(selectionBox.startY, currentY);

    // Find all item elements intersecting with the marquee selection box
    const selectedKeys: string[] = [];
    const itemElements = canvasRef.current.querySelectorAll<HTMLElement>('[data-item-key]');

    itemElements.forEach((el) => {
      const elRect = el.getBoundingClientRect();
      const elLeft = elRect.left - rect.left;
      const elTop = elRect.top - rect.top;
      const elRight = elRect.right - rect.left;
      const elBottom = elRect.bottom - rect.top;

      const isIntersecting =
        boxLeft < elRight &&
        boxRight > elLeft &&
        boxTop < elBottom &&
        boxBottom > elTop;

      if (isIntersecting) {
        const key = el.getAttribute('data-item-key');
        if (key) selectedKeys.push(key);
      }
    });

    selectMultipleItems(selectedKeys);
  };

  const handleMouseUp = () => {
    isSelectingRef.current = false;
    setSelectionBox(null);
  };

  // Unauthenticated Welcome State (Infinite Flowing Games Marquee)
  if (!isAuthenticated && !isReadOnly) {
    return <LandingHeroMarquee />;
  }

  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    if ((e.target as HTMLElement).closest('[data-interactive="true"]')) return;
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, 'CANVAS');
  };

  const handleCellDragOver = (e: React.DragEvent, x: number, y: number) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell({ x, y });
  };

  const handleCellDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);
  };

  const handleCellDrop = async (e: React.DragEvent, targetX: number, targetY: number) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(null);

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);

      if (data.type && data.id) {
        await moveItemPosition(data.type, data.id, targetX, targetY);
      }
    } catch (err) {
      console.error('Failed to move item to cell:', err);
    }
  };

  const selectionStyle = selectionBox
    ? {
        left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
        top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
        width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
        height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
      }
    : null;

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleCanvasContextMenu}
      className="relative min-h-[calc(100vh-61px)] w-full p-4 sm:p-8 flex flex-col justify-between select-none"
    >
      {/* Windows Marquee Drag Selection Rectangle */}
      {selectionBox && selectionStyle && (
        <div
          style={selectionStyle}
          className="absolute z-30 border border-[#2a475e] bg-[#1e3a5f]/25 pointer-events-none rounded-[2px] shadow-sm transition-none"
        />
      )}

      {/* Background Dot Matrix Pattern */}
      <div className="absolute inset-0 desktop-dot-bg opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Breadcrumb Navigation */}
        <div data-interactive="true">
          <Breadcrumb isReadOnly={isReadOnly} />
        </div>

        {/* Controls & Actions Bar */}
        <div
          data-interactive="true"
          className="flex flex-wrap items-center justify-between gap-4 -mt-2 mb-6"
        >
          {/* Left: Folder Title (if inside folder) + Share Button + Private Lock */}
          <div className="flex items-center gap-3">
            {currentFolder && (
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2 sm:gap-2.5">
                <span>{currentFolder.name}</span>
              </h1>
            )}

            {isAuthenticated && user && !isReadOnly && (
              <div className="flex items-center gap-2">
                <Button
                  variant="steam"
                  size="sm"
                  onClick={handleShareClick}
                  className="h-8 text-xs sm:text-[13px] font-medium px-3 shadow-xs cursor-pointer gap-1.5"
                  leftIcon={
                    isCopied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )
                  }
                >
                  {isCopied ? '링크 복사됨!' : '공유'}
                </Button>
                {!currentFolder && (user?.isPublic === false || showcase?.user?.isPublic === false) && (
                  <span title="비공개 쇼케이스" className="flex items-center text-[var(--text-secondary)] shrink-0">
                    <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Action Buttons ([폴더 추가], [게임 추가]) */}
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreateFolderModalOpen(true)}
                className="h-8 text-xs sm:text-[13px] font-medium px-3.5 shadow-xs cursor-pointer gap-1.5"
                leftIcon={<FolderPlus className="w-4 h-4" />}
              >
                폴더 추가
              </Button>

              {currentFolderId !== null && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAddGameModalOpen(true)}
                  className="h-8 text-xs sm:text-[13px] font-medium px-3.5 shadow-xs cursor-pointer gap-1.5"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  게임 추가
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 2D 6-Column Desktop Grid Canvas */}
        {isLoadingShowcase ? (
          <div className="py-24 flex items-center justify-center">
            <LoadingSpinner size="lg" label="쇼케이스 캔버스 로딩 중..." />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 min-h-[420px] p-4 rounded-xl bg-[var(--glass-panel-bg)] border border-[var(--border-subtle)] backdrop-blur-sm">
            {/* Render 2D Grid Cells */}
            {Array.from({ length: totalRows }).map((_, rowIndex) =>
              Array.from({ length: 6 }).map((_, colIndex) => {
                const cellItem = filteredItems.find(
                  (it) => it.positionX === colIndex && it.positionY === rowIndex
                );

                const isCellDragOver =
                  dragOverCell?.x === colIndex && dragOverCell?.y === rowIndex;

                const isSelected = cellItem
                  ? selectedItemKeys.includes(`${cellItem.type}_${cellItem.id}`)
                  : false;

                return (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    onDragOver={(e) => handleCellDragOver(e, colIndex, rowIndex)}
                    onDragLeave={handleCellDragLeave}
                    onDrop={(e) => handleCellDrop(e, colIndex, rowIndex)}
                    className={`relative min-h-[130px] rounded-lg flex items-center justify-center transition-all ${
                      isCellDragOver
                        ? 'border-2 border-dashed border-emerald-400 bg-emerald-500/10'
                        : cellItem
                        ? ''
                        : 'border border-dashed border-transparent hover:border-slate-800/80 hover:bg-white/[0.02]'
                    }`}
                  >
                    {cellItem && cellItem.type === 'FOLDER' && cellItem.folderData && (
                      <div
                        data-interactive="true"
                        data-item-key={`FOLDER_${cellItem.id}`}
                        className="w-full flex items-center justify-center"
                      >
                        <FolderCard
                          item={cellItem}
                          folder={cellItem.folderData}
                          isSelected={isSelected}
                          isReadOnly={isReadOnly}
                        />
                      </div>
                    )}

                    {cellItem && cellItem.type === 'GAME' && cellItem.gameData && (
                      <div
                        data-interactive="true"
                        data-item-key={`GAME_${cellItem.id}`}
                        className="w-full flex items-center justify-center"
                      >
                        <GameCard
                          item={cellItem}
                          game={cellItem.gameData}
                          isSelected={isSelected}
                          isReadOnly={isReadOnly}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Floating Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-16 right-8 z-50 px-4 py-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-card)] text-[var(--text-primary)] text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Info className="w-4 h-4 text-[var(--primary-accent)] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Canvas Footer */}
      {!isReadOnly && (
        <div
          data-interactive="true"
          className="relative z-10 max-w-7xl mx-auto w-full pt-8 flex items-center justify-between text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]"
        >
          <span>마우스 드래그: 다중 선택 • 아이콘 드래그: 이동 • Ctrl+C/V: 복사/붙여넣기 • Delete: 삭제</span>
        </div>
      )}
    </div>
  );
};
