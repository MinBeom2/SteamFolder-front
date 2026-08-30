import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useShowcaseStore } from '@/store/useShowcaseStore';
import { FolderCard } from './FolderCard';
import { Breadcrumb } from './Breadcrumb';
import { SteamLoginButton } from '@/components/auth/SteamLoginButton';
import { Button } from '@/components/common/Button';
import { INITIAL_SUBFOLDERS_GENRE } from '@/api/mockData';
import { Plus, Globe, Lock, Palette } from 'lucide-react';

export const DesktopCanvas: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const {
    currentFolderId,
    rootFolders,
    openFolder,
    setAddGameModalOpen,
    setSettingsModalOpen,
  } = useShowcaseStore();

  const themeColor = user?.themeColor || '#00F0FF';
  const subFolders = INITIAL_SUBFOLDERS_GENRE;

  // Unauthenticated Welcome State
  if (!isAuthenticated || !user) {
    return (
      <div className="relative min-h-[calc(100vh-61px)] w-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        {/* Background Dot Matrix Pattern & Glowing Center */}
        <div className="absolute inset-0 desktop-dot-bg opacity-30 pointer-events-none" />
        <div className="absolute w-[500px] h-[300px] rounded-full blur-[140px] opacity-20 bg-[#66c0f4] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/25 text-xs font-semibold">
            <span>Spring Boot 백엔드 API 실시간 연동 준비 완료</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            스팀 라이브러리를 나만의 <br />
            <span className="bg-gradient-to-r from-[#66c0f4] via-[#00F0FF] to-[#38bdf8] bg-clip-text text-transparent">
              감성 데스크탑 쇼케이스
            </span>
            로
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            스팀 OpenID 계정으로 로그인하여 나만의 테마 색상을 설정하고, 보유 게임들을 자유롭게 큐레이션해 보세요.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <SteamLoginButton size="lg" />
          </div>

          <div className="pt-8 text-[11px] text-slate-500 font-mono flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Auth API: POST /api/v1/auth/steam/login
            </span>
            <span>•</span>
            <span>JWT Refresh: POST /api/v1/auth/refresh</span>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Canvas View
  return (
    <div className="relative min-h-[calc(100vh-61px)] w-full p-6 sm:p-12 overflow-hidden flex flex-col justify-between">
      {/* Background Dot Matrix Pattern & Ambient Radial Glow using User's Theme Color */}
      <div className="absolute inset-0 desktop-dot-bg opacity-40 pointer-events-none" />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] rounded-full blur-[140px] opacity-20 pointer-events-none transition-all duration-500"
        style={{ backgroundColor: themeColor }}
      />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {currentFolderId ? (
          /* 1. Subfolder View */
          <div>
            <Breadcrumb />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 pt-4">
              {subFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => setAddGameModalOpen(true)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* 2. Main Root Canvas View */
          <div>
            {/* Header Title with User Profile Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{user.username}님의 캔버스</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  SteamID: <span className="font-mono text-slate-300">{user.steamId}</span>
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#121620] border border-slate-800 text-[11px] font-semibold text-slate-300 hover:border-[#00F0FF]/60 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {user.isPublic ? (
                    <>
                      <Globe className="w-3 h-3 text-[#00F0FF]" />
                      <span>공개 (Public)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>비공개 (Private)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSettingsModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#121620] border border-slate-800 text-[11px] font-semibold text-slate-300 hover:border-[#00F0FF]/60 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Palette className="w-3 h-3" style={{ color: themeColor }} />
                  <span className="font-mono uppercase">{themeColor}</span>
                </button>
              </div>
            </div>

            {/* Folder Cards Grid */}
            <div className="flex flex-wrap items-center gap-8">
              {rootFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={{ ...folder, color: themeColor }}
                  onClick={() => openFolder(folder.id, folder.name)}
                />
              ))}

              {/* Add Folder / Game Button */}
              <div
                onClick={() => setAddGameModalOpen(true)}
                className="flex flex-col items-center gap-2.5 p-3 rounded-2xl cursor-pointer group transition-all duration-200 select-none hover:scale-105 opacity-80 hover:opacity-100"
              >
                <div className="w-28 h-24 rounded-xl border-2 border-dashed border-slate-700 group-hover:border-[#00F0FF] bg-[#101520]/50 flex items-center justify-center text-slate-400 group-hover:text-[#00F0FF] transition-all">
                  <Plus className="w-8 h-8" />
                </div>
                <span className="text-xs font-semibold text-slate-400 group-hover:text-white">
                  게임 추가하기
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Footer Bar */}
      <div className="relative z-10 max-w-7xl mx-auto w-full pt-8 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/40">
        <span>SteamFolder Interactive Canvas</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettingsModalOpen(true)}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          테마 & 공개범위 설정 (API)
        </Button>
      </div>
    </div>
  );
};
