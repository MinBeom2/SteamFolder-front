import React, { useEffect, useRef } from 'react';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { useNavigate } from 'react-router-dom';
import { useFolderDeletionStore } from '@/store/useFolderDeletionStore';
import {
  FolderPlus,
  Gamepad2,
  FolderOpen,
  Edit3,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  ExternalLink,
  RefreshCw,
  Info,
} from 'lucide-react';

export const ContextMenu: React.FC = () => {
  const navigate = useNavigate();
  const {
    contextMenu,
    closeContextMenu,
    currentFolderId,
    setCreateFolderModalOpen,
    setEditFolderModalOpen,
    setAddGameModalOpen,
    deleteFolder,
    removeGameFromFolder,
    copySelected,
    cutSelected,
    pasteClipboard,
    clipboard,
    refreshCurrentView,
    selectItem,
    openGameDetailModal,
  } = useShowcaseStore();

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };

    const handleScrollOrResize = () => {
      closeContextMenu();
    };

    if (contextMenu?.isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize);
      window.addEventListener('resize', handleScrollOrResize);
    }

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [contextMenu?.isOpen, closeContextMenu]);

  if (!contextMenu || !contextMenu.isOpen) return null;

  const { x, y, type, targetItem } = contextMenu;

  // Ensure menu stays within screen viewport
  const menuWidth = 208;
  const menuHeight = 220;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;

  const safeX = x + menuWidth > screenW ? screenW - menuWidth - 16 : x;
  const safeY = y + menuHeight > screenH ? screenH - menuHeight - 16 : y;

  return (
    <div
      ref={menuRef}
      style={{ top: `${safeY}px`, left: `${safeX}px` }}
      className="fixed z-50 w-52 bg-[var(--context-menu-bg)] border border-[var(--border-card)] rounded-[3px] shadow-[var(--soft-shadow)] p-1 text-xs text-[var(--text-primary)] animate-in fade-in slide-in-from-top-1 duration-200 select-none"
    >
      {type === 'CANVAS' && (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              setCreateFolderModalOpen(true);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[var(--primary-accent)]" />
              <span>새 폴더 만들기</span>
            </div>
          </button>

          {currentFolderId !== null && (
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                setAddGameModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
            >
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-emerald-500" />
                <span>게임 추가하기</span>
              </div>
            </button>
          )}

          {clipboard && (
            <button
              type="button"
              onClick={() => {
                closeContextMenu();
                pasteClipboard();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
            >
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-amber-500" />
                <span>붙여넣기</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">Ctrl+V</span>
            </button>
          )}

          <div className="h-px bg-[var(--border-subtle)] my-1" />

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              refreshCurrentView();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>새로고침</span>
            </div>
          </button>
        </div>
      )}

      {type === 'FOLDER' && targetItem && (
        <div className="space-y-0.5">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] truncate border-b border-[var(--border-subtle)] mb-1">
            {targetItem.name}
          </div>

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              navigate(`/folders/${targetItem.id}`);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[var(--primary-accent)]" />
              <span>폴더 열기</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Enter</span>
          </button>

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              if (targetItem.folderData) {
                setEditFolderModalOpen(true, targetItem.folderData);
              }
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>이름 변경</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">F2</span>
          </button>

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              selectItem(`FOLDER_${targetItem.id}`, false);
              cutSelected();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>잘라내기</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Ctrl+X</span>
          </button>

          <div className="h-px bg-[var(--border-subtle)] my-1" />

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              useFolderDeletionStore.getState().requestDeletion({
                folderNames: [targetItem.name],
                onDelete: () => deleteFolder(targetItem.id),
              });
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-red-500/10 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>삭제</span>
            </div>
            <span className="text-[10px] text-red-400/60 font-mono">Del</span>
          </button>
        </div>
      )}

      {type === 'GAME' && targetItem && (
        <div className="space-y-0.5">

          {targetItem.appId && (
            <>
              <button
                type="button"
                onClick={() => {
                  closeContextMenu();
                  if (targetItem.appId) {
                    openGameDetailModal({
                      appId: targetItem.appId,
                      name: targetItem.name,
                      headerImage: targetItem.headerImage,
                      genres: targetItem.genres,
                      playtimeForever: targetItem.playtimeForever,
                      lastPlayedAt: targetItem.lastPlayedAt,
                      totalAchievements: targetItem.totalAchievements,
                      achievedAchievements: targetItem.achievedAchievements,
                      achievementRate: targetItem.achievementRate,
                      isReadOnly: false,
                    });
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[var(--primary-accent)]" />
                  <span>상세보기</span>
                </div>
              </button>

              <a
                href={`https://store.steampowered.com/app/${targetItem.appId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => closeContextMenu()}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>상점 페이지 보기</span>
                </div>
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              selectItem(`GAME_${targetItem.id}`, false);
              copySelected();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>복사하기</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Ctrl+C</span>
          </button>

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              selectItem(`GAME_${targetItem.id}`, false);
              cutSelected();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-primary)] transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Scissors className="w-4 h-4 text-[var(--text-secondary)]" />
              <span>잘라내기</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] font-mono">Ctrl+X</span>
          </button>

          <div className="h-px bg-[var(--border-subtle)] my-1" />

          <button
            type="button"
            onClick={() => {
              closeContextMenu();
              removeGameFromFolder(targetItem.id);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-red-500/10 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors text-left cursor-pointer font-medium"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span>제거</span>
            </div>
            <span className="text-[10px] text-red-400/60 font-mono">Del</span>
          </button>
        </div>
      )}
    </div>
  );
};
