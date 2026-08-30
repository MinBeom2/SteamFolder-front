import { create } from 'zustand';
import type { FolderItem } from '@/types/showcase';
import type { UserGame, SyncResult, CooldownStatus } from '@/types/game';
import { INITIAL_ROOT_FOLDERS, INITIAL_AVAILABLE_GAMES } from '@/api/mockData';
import { getUserGamesApi, syncSteamGamesApi, getSyncCooldownApi } from '@/api/game';

interface ShowcaseState {
  // Navigation & Data
  currentFolderId: string | null;
  currentFolderName: string;
  rootFolders: FolderItem[];
  userGames: UserGame[];
  isLoadingGames: boolean;
  isSyncingGames: boolean;
  cooldownSeconds: number; // 동기화 쿨다운 남은 초 (0이면 동기화 가능)
  searchQuery: string;
  selectedGenre: string;

  // Modal Visibility
  isSettingsModalOpen: boolean;
  isAddGameModalOpen: boolean;
  isDirectLoginModalOpen: boolean;

  // Actions
  openFolder: (folderId: string, folderName: string) => void;
  goToRoot: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string) => void;
  fetchUserGames: () => Promise<void>;
  syncGames: () => Promise<SyncResult>;
  checkCooldown: () => Promise<CooldownStatus | null>;
  setCooldownSeconds: (seconds: number) => void;
  toggleGameSelection: (appId: number) => void;
  addSelectedGamesToFolder: (folderId: string) => void;

  setSettingsModalOpen: (open: boolean) => void;
  setAddGameModalOpen: (open: boolean) => void;
  setDirectLoginModalOpen: (open: boolean) => void;
}

const INITIAL_MOCK_USER_GAMES: UserGame[] = INITIAL_AVAILABLE_GAMES.map((g) => ({
  userGameId: Number(g.id.replace('game-', '')),
  appId: g.appId,
  name: g.name,
  playtimeForever: g.playtimeHours * 60,
  headerImage: g.headerImage,
  genres: g.genres,
  selected: g.selected,
}));

let countdownTimer: ReturnType<typeof setInterval> | null = null;

const startCooldownCountdown = (
  initialSeconds: number,
  set: (state: Partial<ShowcaseState>) => void,
  get: () => ShowcaseState
) => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  set({ cooldownSeconds: initialSeconds });

  if (initialSeconds <= 0) return;

  countdownTimer = setInterval(() => {
    const current = get().cooldownSeconds;
    if (current <= 1) {
      if (countdownTimer) clearInterval(countdownTimer);
      countdownTimer = null;
      set({ cooldownSeconds: 0 });
    } else {
      set({ cooldownSeconds: current - 1 });
    }
  }, 1000);
};

export const useShowcaseStore = create<ShowcaseState>((set, get) => ({
  currentFolderId: null,
  currentFolderName: '',
  rootFolders: INITIAL_ROOT_FOLDERS,
  userGames: INITIAL_MOCK_USER_GAMES,
  isLoadingGames: false,
  isSyncingGames: false,
  cooldownSeconds: 0,
  searchQuery: '',
  selectedGenre: '전체',

  isSettingsModalOpen: false,
  isAddGameModalOpen: false,
  isDirectLoginModalOpen: false,

  openFolder: (folderId: string, folderName: string) => {
    set({ currentFolderId: folderId, currentFolderName: folderName });
  },

  goToRoot: () => {
    set({ currentFolderId: null, currentFolderName: '' });
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedGenre: (genre: string) => set({ selectedGenre: genre }),

  setCooldownSeconds: (seconds: number) => {
    startCooldownCountdown(seconds, set, get);
  },

  checkCooldown: async () => {
    try {
      const status = await getSyncCooldownApi();
      const remaining = status?.remainingSeconds ?? 0;
      if (remaining > 0) {
        startCooldownCountdown(remaining, set, get);
      } else {
        set({ cooldownSeconds: 0 });
      }
      return status;
    } catch (err) {
      console.warn('Failed to check sync cooldown:', err);
      return null;
    }
  },

  fetchUserGames: async () => {
    set({ isLoadingGames: true });
    try {
      const games = await getUserGamesApi();
      if (games && games.length > 0) {
        set({ userGames: games, isLoadingGames: false });
      } else {
        set({ isLoadingGames: false });
      }
    } catch (err) {
      console.warn('Backend getUserGames fallback:', err);
      set({ isLoadingGames: false });
    }
  },

  syncGames: async () => {
    set({ isSyncingGames: true });
    try {
      const result = await syncSteamGamesApi();
      // Start 5-minute (300 seconds) countdown on success
      startCooldownCountdown(300, set, get);
      // Refresh game list
      await get().fetchUserGames();
      set({ isSyncingGames: false });
      return result;
    } catch (err: unknown) {
      set({ isSyncingGames: false });

      // Check if error is G005 (Cooldown active)
      const errResponse = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (errResponse?.code === 'G005' || errResponse?.message?.includes('쿨다운')) {
        // Fetch exact remaining seconds from backend and update countdown
        await get().checkCooldown();
      }

      throw err;
    }
  },

  toggleGameSelection: (appId: number) => {
    set((state) => ({
      userGames: state.userGames.map((game) =>
        game.appId === appId ? { ...game, selected: !game.selected } : game
      ),
    }));
  },

  addSelectedGamesToFolder: (_folderId: string) => {
    const { userGames } = get();
    const selectedCount = userGames.filter((g) => g.selected).length;
    console.log(`Added ${selectedCount} games to folder`);
    set({ isAddGameModalOpen: false });
  },

  setSettingsModalOpen: (open: boolean) => {
    set({ isSettingsModalOpen: open });
    if (open) {
      get().checkCooldown();
    }
  },

  setAddGameModalOpen: (open: boolean) => {
    set({ isAddGameModalOpen: open });
    if (open) {
      get().fetchUserGames();
      get().checkCooldown();
    }
  },

  setDirectLoginModalOpen: (open: boolean) =>
    set({ isDirectLoginModalOpen: open }),
}));
