import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { FolderCard } from './FolderCard';
import { GameCard } from './GameCard';
import { Breadcrumb } from './Breadcrumb';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  Plus,
  FolderPlus,
  Sparkles,
  Info,
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
    setSettingsModalOpen,
    setToastMessage,
    searchQuery,
  } = useShowcaseStore();

  const [dragOverCell, setDragOverCell] = useState<{ x: number; y: number } | null>(null);

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

  const themeColor = user?.themeColor || '#00F0FF';

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

  // Unauthenticated Welcome State
  if (!isAuthenticated && !isReadOnly) {
    return (
      <div className="relative min-h-[calc(100vh-61px)] w-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="absolute inset-0 desktop-dot-bg opacity-30 pointer-events-none" />
        <div className="absolute w-[500px] h-[300px] rounded-full blur-[140px] opacity-20 bg-[#00F0FF] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/25 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>2D 데스크탑 캔버스 & 계층형 폴더 시스템</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            스팀 라이브러리를 나만의 <br />
            <span className="bg-gradient-to-r from-[#66c0f4] via-[#00F0FF] to-[#38bdf8] bg-clip-text text-transparent">
              감성 데스크탑 쇼케이스
            </span>
            로
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            스팀 계정으로 로그인하여 6열 2D 격자 위에 자유롭게 폴더를 만들고, 윈도우처럼 드래그 앤 드롭으로 큐레이션해 보세요.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <SteamLoginButton size="lg" />
          </div>
        </div>
      </div>
    );
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
          className="absolute z-30 border border-[#00F0FF] bg-[#00F0FF]/15 pointer-events-none rounded-[2px] shadow-sm transition-none"
        />
      )}

      {/* Background Dot Matrix Pattern & Glowing Center */}
      <div className="absolute inset-0 desktop-dot-bg opacity-40 pointer-events-none" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[140px] opacity-15 pointer-events-none transition-all duration-500"
        style={{ backgroundColor: themeColor }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Breadcrumb Navigation */}
        <div data-interactive="true">
          <Breadcrumb isReadOnly={isReadOnly} />
        </div>

        {/* Header Title & Actions Bar */}
        <div
          data-interactive="true"
          className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80"
        >
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>{currentFolder ? currentFolder.name : `${user?.username || '게스트'}님의 쇼케이스`}</span>
            </h1>
          </div>

          {/* Action Buttons: [폴더 추가] and [게임 추가] */}
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCreateFolderModalOpen(true)}
                className="text-xs font-semibold text-slate-200 border-slate-700 hover:border-[#00F0FF]/60 hover:text-white bg-[#121620]"
                leftIcon={<FolderPlus className="w-3.5 h-3.5 text-[#00F0FF]" />}
              >
                폴더 추가
              </Button>

              {currentFolderId !== null && (
                <Button
                  variant="cyan"
                  size="sm"
                  onClick={() => setAddGameModalOpen(true)}
                  className="text-xs font-bold px-4"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 min-h-[420px] p-4 rounded-2xl bg-[#090d14]/40 border border-slate-800/60 backdrop-blur-sm">
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
                    className={`relative min-h-[130px] rounded-xl flex items-center justify-center transition-all ${
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
        <div className="fixed bottom-16 right-8 z-50 px-4 py-2.5 rounded-xl bg-[#0e1420]/95 border border-[#00F0FF]/60 text-white text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Info className="w-4 h-4 text-[#00F0FF]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Canvas Footer */}
      {!isReadOnly && (
        <div
          data-interactive="true"
          className="relative z-10 max-w-7xl mx-auto w-full pt-8 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/40"
        >
          <span>마우스 드래그: 다중 선택 • 아이콘 드래그: 이동 • Ctrl+C/V: 복사/붙여넣기 • Delete: 삭제</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            쇼케이스 테마 & 공개범위 설정
          </Button>
        </div>
      )}
    </div>
  );
};
