import { create } from 'zustand';
import type {
  FolderResponse,
  ShowcaseResponse,
  CanvasItem,
  BreadcrumbItem,
  ClipboardItem,
  ClipboardEntry,
} from '@/types/showcase';
import type { UserGame, SyncResult, CooldownStatus, GameAchievementDetail } from '@/types/game';
import {
  getMyShowcaseApi,
} from '@/api/showcase';
import {
  getFolderDetailApi,
  createFolderApi,
  updateFolderApi,
  deleteFolderApi,
  moveFolderApi,
  updatePositionsApi,
  addGameToFolderApi,
  batchAddFolderGamesApi,
  removeFolderGameApi,
  removeFolderGamesApi,
  moveGameToAnotherFolderApi,
  batchMoveFolderGamesApi,
} from '@/api/folder';
import {
  getUserGamesApi,
  getUserGamesCursorApi,
  filterUserGamesApi,
  syncSteamGamesApi,
  getSyncCooldownApi,
  getGameAchievementsApi,
  syncGameAchievementsApi,
} from '@/api/game';
import { useAuthStore } from '@/store/useAuthStore';
import { getErrorMessage } from '@/utils/error';
import { getAuthSessionVersion, subscribeAuthSession } from '@/utils/authSession';

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  type: 'CANVAS' | 'FOLDER' | 'GAME';
  targetItem?: CanvasItem;
}

interface ShowcaseState {
  // Navigation & Data
  showcase: ShowcaseResponse | null;
  currentFolderId: number | null;
  currentFolder: FolderResponse | null;
  breadcrumbTrail: BreadcrumbItem[];
  items: CanvasItem[];
  isLoadingShowcase: boolean;

  // Steam Games Library & Sync
  userGames: UserGame[];
  gamesCursor: number | null;
  hasMoreGames: boolean;
  totalGamesCount: number;
  isLoadingGames: boolean;
  isLoadingMoreGames: boolean;
  gamesError: string | null;
  isAddingGames: boolean;
  isSyncingGames: boolean;
  cooldownSeconds: number;
  searchQuery: string;
  selectedGenre: string;
  selectedGameAppIds: number[];

  // Selection & Clipboard & Toast
  selectedItemKeys: string[]; // e.g. ["FOLDER_1", "GAME_5"]
  clipboard: ClipboardItem | null;
  toastMessage: string | null;

  // Context Menu
  contextMenu: ContextMenuState | null;

  // Modals Visibility
  isSettingsModalOpen: boolean;
  isAddGameModalOpen: boolean;
  isDirectLoginModalOpen: boolean;
  isCreateFolderModalOpen: boolean;
  isEditFolderModalOpen: boolean;
  editingFolder: FolderResponse | null;

  // Game Detail & Achievement Modal State
  isGameDetailModalOpen: boolean;
  selectedGameDetail: {
    appId: number;
    name: string;
    headerImage?: string;
    genres?: string[];
    playtimeForever?: number;
    lastPlayedAt?: string;
    totalAchievements?: number | null;
    achievedAchievements?: number | null;
    achievementRate?: number | null;
    isReadOnly?: boolean;
  } | null;
  achievementDetail: GameAchievementDetail | null;
  isLoadingGameDetail: boolean;
  isSyncingAchievements: boolean;
  gameDetailError: string | null;

  // Actions - Showcase & Navigation
  loadFolderView: (folderId: number | null) => Promise<void>;
  fetchMyShowcase: () => Promise<void>;
  openFolder: (folderId: number, folderName: string) => Promise<void>;
  navigateToBreadcrumb: (index: number) => Promise<void>;
  refreshCurrentView: () => Promise<void>;

  // Actions - Folder CRUD
  createFolder: (name: string, themeColor?: string, icon?: string) => Promise<void>;
  updateFolder: (folderId: number, name?: string, themeColor?: string, icon?: string) => Promise<void>;
  deleteFolder: (folderId: number) => Promise<void>;
  moveFolder: (folderId: number, targetParentFolderId: number | null, posX?: number, posY?: number) => Promise<void>;

  // Actions - Game CRUD in Folder
  addSelectedGamesToFolder: () => Promise<void>;
  addSingleGameToFolder: (appId: number, posX?: number, posY?: number) => Promise<void>;
  removeGameFromFolder: (folderGameId: number) => Promise<void>;
  removeSelectedGamesFromFolder: () => Promise<void>;
  moveGameToFolder: (folderGameId: number, targetFolderId: number, posX?: number, posY?: number) => Promise<void>;

  // Actions - 2D Grid Drag & Drop
  moveItemPosition: (type: 'FOLDER' | 'GAME', id: number, targetX: number, targetY: number) => Promise<void>;

  // Actions - Selection & Clipboard & Context Menu
  selectItem: (key: string, isMulti: boolean) => void;
  selectMultipleItems: (keys: string[]) => void;
  clearSelection: () => void;
  copySelected: () => void;
  cutSelected: () => void;
  pasteClipboard: () => Promise<void>;
  setToastMessage: (msg: string | null) => void;
  openContextMenu: (x: number, y: number, type: 'CANVAS' | 'FOLDER' | 'GAME', targetItem?: CanvasItem) => void;
  closeContextMenu: () => void;

  // Actions - Search, Steam Sync & Cooldown
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string) => void;
  fetchUserGames: (reset?: boolean) => Promise<void>;
  filterUserGames: (genres?: string[], sort?: string) => Promise<void>;
  loadMoreGames: () => Promise<void>;
  syncGames: () => Promise<SyncResult>;
  checkCooldown: () => Promise<CooldownStatus | null>;
  setCooldownSeconds: (seconds: number) => void;
  toggleGameSelection: (appId: number) => void;

  // Modals Toggles
  setSettingsModalOpen: (open: boolean) => void;
  setAddGameModalOpen: (open: boolean) => void;
  setDirectLoginModalOpen: (open: boolean) => void;
  setCreateFolderModalOpen: (open: boolean) => void;
  setEditFolderModalOpen: (open: boolean, folder?: FolderResponse | null) => void;
  openGameDetailModal: (game: {
    appId: number;
    name: string;
    headerImage?: string;
    genres?: string[];
    playtimeForever?: number;
    lastPlayedAt?: string;
    totalAchievements?: number | null;
    achievedAchievements?: number | null;
    achievementRate?: number | null;
    isReadOnly?: boolean;
  }) => Promise<void>;
  closeGameDetailModal: () => void;
  syncGameAchievements: (force?: boolean) => Promise<void>;
  setGameDetailModalOpen: (open: boolean) => void;
}

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let userGamesRequestId = 0;
let activeGamesQuery: { genres?: string[]; sort: string } | null = null;
let gameDetailRequestId = 0;
let addGamesPromise: Promise<void> | null = null;
let gamesSyncRequest: { sessionVersion: number; promise: Promise<SyncResult> } | null = null;
let cooldownRequestId = 0;

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

// Helper: Convert root folders or folder details to CanvasItem list
const buildCanvasItems = (
  rootFolders: FolderResponse[] | undefined,
  currentFolder: FolderResponse | null,
  isRoot: boolean
): CanvasItem[] => {
  if (isRoot) {
    return (rootFolders || []).map((f) => ({
      type: 'FOLDER',
      id: f.id,
      name: f.name,
      positionX: f.positionX,
      positionY: f.positionY,
      themeColor: f.themeColor,
      icon: f.icon,
      depth: f.depth,
      gameCount: f.gameCount,
      childFolderCount: f.childFolderCount,
      folderData: f,
    }));
  }

  if (!currentFolder) return [];

  const folderItems: CanvasItem[] = (currentFolder.childFolders || []).map((f) => ({
    type: 'FOLDER',
    id: f.id,
    name: f.name,
    positionX: f.positionX,
    positionY: f.positionY,
    themeColor: f.themeColor,
    icon: f.icon,
    depth: f.depth,
    gameCount: f.gameCount,
    childFolderCount: f.childFolderCount,
    folderData: f,
  }));

  const gameItems: CanvasItem[] = (currentFolder.games || []).map((g) => ({
    type: 'GAME',
    id: g.id,
    name: g.name,
    positionX: g.positionX,
    positionY: g.positionY,
    appId: g.appId,
    headerImage: g.headerImage,
    genres: g.genres,
    playtimeForever: g.playtimeForever,
    lastPlayedAt: g.lastPlayedAt,
    totalAchievements: g.totalAchievements,
    achievedAchievements: g.achievedAchievements,
    achievementRate: g.achievementRate,
    gameData: g,
  }));

  return [...folderItems, ...gameItems];
};

// Helper: Find next available empty grid slot (6 columns: 0..5, rows: 0..)
const findNextEmptySlot = (items: CanvasItem[]): { x: number; y: number } => {
  const occupied = new Set<string>();
  items.forEach((it) => {
    occupied.add(`${it.positionX},${it.positionY}`);
  });

  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 6; x++) {
      if (!occupied.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
};

export const useShowcaseStore = create<ShowcaseState>((set, get) => ({
  showcase: null,
  currentFolderId: null,
  currentFolder: null,
  breadcrumbTrail: [{ id: null, name: '내 쇼케이스' }],
  items: [],
  isLoadingShowcase: false,

  userGames: [],
  gamesCursor: null,
  hasMoreGames: true,
  totalGamesCount: 0,
  isLoadingGames: false,
  isLoadingMoreGames: false,
  gamesError: null,
  isAddingGames: false,
  isSyncingGames: false,
  cooldownSeconds: 0,
  searchQuery: '',
  selectedGenre: '전체',
  selectedGameAppIds: [],

  selectedItemKeys: [],
  clipboard: null,
  toastMessage: null,
  contextMenu: null,

  isSettingsModalOpen: false,
  isAddGameModalOpen: false,
  isDirectLoginModalOpen: false,
  isCreateFolderModalOpen: false,
  isEditFolderModalOpen: false,
  editingFolder: null,

  isGameDetailModalOpen: false,
  selectedGameDetail: null,
  achievementDetail: null,
  isLoadingGameDetail: false,
  isSyncingAchievements: false,
  gameDetailError: null,

  setToastMessage: (msg: string | null) => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    set({ toastMessage: msg });
    if (msg) {
      toastTimeout = setTimeout(() => {
        set({ toastMessage: null });
      }, 3000);
    }
  },

  loadFolderView: async (folderId: number | null) => {
    if (folderId === null) {
      await get().fetchMyShowcase();
      return;
    }

    set({ isLoadingShowcase: true });
    try {
      let currentShowcase = get().showcase;
      if (!currentShowcase) {
        try {
          currentShowcase = await getMyShowcaseApi();
          set({ showcase: currentShowcase });
        } catch {
          // ignore unauthenticated error
        }
      }

      const folderDetail = await getFolderDetailApi(folderId);
      const items = buildCanvasItems([], folderDetail, false);

      const parentCrumbs: BreadcrumbItem[] = (folderDetail.breadcrumbs || []).map((b) => ({
        id: b.id,
        name: b.name,
      }));

      const trail: BreadcrumbItem[] = [
        { id: null, name: '내 쇼케이스' },
        ...parentCrumbs,
        { id: folderDetail.id, name: folderDetail.name },
      ];

      set({
        currentFolderId: folderId,
        currentFolder: folderDetail,
        breadcrumbTrail: trail,
        items,
        selectedItemKeys: [],
        isLoadingShowcase: false,
      });
    } catch (err: unknown) {
      console.error('Failed to load folder view by ID:', err);
      set({ isLoadingShowcase: false });
      throw err;
    }
  },

  fetchMyShowcase: async () => {
    set({ isLoadingShowcase: true });
    try {
      const showcase = await getMyShowcaseApi();
      const items = buildCanvasItems(showcase.rootFolders, null, true);
      set({
        showcase,
        currentFolderId: null,
        currentFolder: null,
        breadcrumbTrail: [{ id: null, name: '내 쇼케이스' }],
        items,
        selectedItemKeys: [],
        isLoadingShowcase: false,
      });
    } catch (err) {
      console.warn('Failed to fetch my showcase from backend:', err);
      set({ isLoadingShowcase: false });
    }
  },

  openFolder: async (folderId: number, folderName: string) => {
    set({ isLoadingShowcase: true });
    try {
      const folderDetail = await getFolderDetailApi(folderId);
      const items = buildCanvasItems([], folderDetail, false);

      const parentCrumbs: BreadcrumbItem[] = (folderDetail.breadcrumbs || []).map((b) => ({
        id: b.id,
        name: b.name,
      }));

      const newTrail: BreadcrumbItem[] = [
        { id: null, name: '내 쇼케이스' },
        ...parentCrumbs,
        { id: folderDetail.id, name: folderName },
      ];

      set({
        currentFolderId: folderId,
        currentFolder: folderDetail,
        breadcrumbTrail: newTrail,
        items,
        selectedItemKeys: [],
        isLoadingShowcase: false,
      });
    } catch (err) {
      console.error('Failed to open folder:', err);
      set({ isLoadingShowcase: false });
    }
  },

  navigateToBreadcrumb: async (index: number) => {
    const { breadcrumbTrail } = get();
    if (index < 0 || index >= breadcrumbTrail.length) return;

    const target = breadcrumbTrail[index];
    if (target.id === null) {
      await get().fetchMyShowcase();
    } else {
      await get().openFolder(target.id, target.name);
    }
  },

  refreshCurrentView: async () => {
    const { currentFolderId } = get();
    if (currentFolderId === null) {
      const showcase = await getMyShowcaseApi();
      const items = buildCanvasItems(showcase.rootFolders, null, true);
      set({ showcase, items });
    } else {
      const folderDetail = await getFolderDetailApi(currentFolderId);
      const items = buildCanvasItems([], folderDetail, false);

      const parentCrumbs: BreadcrumbItem[] = (folderDetail.breadcrumbs || []).map((b) => ({
        id: b.id,
        name: b.name,
      }));

      const trail: BreadcrumbItem[] = [
        { id: null, name: '내 쇼케이스' },
        ...parentCrumbs,
        { id: folderDetail.id, name: folderDetail.name },
      ];

      set({ currentFolder: folderDetail, items, breadcrumbTrail: trail });
    }
  },

  createFolder: async (name: string, themeColor?: string, icon?: string) => {
    const { currentFolderId, items, currentFolder } = get();
    if (currentFolder && currentFolder.depth !== undefined && currentFolder.depth >= 4) {
      throw new Error('폴더의 깊이는 최대 5개 까지 가능합니다.');
    }

    const { x, y } = findNextEmptySlot(items);

    try {
      await createFolderApi({
        name,
        parentFolderId: currentFolderId,
        themeColor: themeColor || '#00F0FF',
        icon: icon || 'folder',
        positionX: x,
        positionY: y,
      });

      get().setToastMessage(`'${name}' 폴더가 생성되었습니다.`);
      await get().refreshCurrentView();
    } catch (err: unknown) {
      console.error('Failed to create folder:', err);
      throw err;
    }
  },

  updateFolder: async (folderId: number, name?: string, themeColor?: string, icon?: string) => {
    await updateFolderApi(folderId, { name, themeColor, icon });
    get().setToastMessage('폴더 정보가 수정되었습니다.');
    await get().refreshCurrentView();
  },

  deleteFolder: async (folderId: number) => {
    await deleteFolderApi(folderId);
    get().setToastMessage('폴더가 삭제되었습니다.');
    await get().refreshCurrentView();
  },

  moveFolder: async (folderId: number, targetParentFolderId: number | null, posX?: number, posY?: number) => {
    try {
      await moveFolderApi(folderId, {
        targetParentFolderId,
        targetPositionX: posX,
        targetPositionY: posY,
      });
      get().setToastMessage('폴더가 이동되었습니다.');
      await get().refreshCurrentView();
    } catch (err: unknown) {
      console.error('Failed to move folder:', err);
      const errResponse = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (
        errResponse?.code === 'F005' ||
        errResponse?.message?.includes('깊이') ||
        errResponse?.message?.includes('5개') ||
        errResponse?.message?.includes('5단계')
      ) {
        get().setToastMessage('폴더의 깊이는 최대 5개 까지 가능합니다.');
      } else if (errResponse?.message) {
        get().setToastMessage(errResponse.message);
      } else {
        get().setToastMessage('폴더 이동에 실패했습니다.');
      }
      throw err;
    }
  },

  addSelectedGamesToFolder: () => {
    if (addGamesPromise) return addGamesPromise;

    const { currentFolderId, selectedGameAppIds, userGames } = get();
    if (currentFolderId === null) {
      get().setToastMessage('게임을 추가하려면 먼저 폴더 안으로 이동해 주세요!');
      return Promise.resolve();
    }

    const appIdsSet = new Set(selectedGameAppIds);
    userGames.filter((g) => g.selected).forEach((g) => appIdsSet.add(g.appId));

    if (appIdsSet.size === 0) return Promise.resolve();

    const appIds = Array.from(appIdsSet);
    set({ isAddingGames: true });
    addGamesPromise = (async () => {
      await batchAddFolderGamesApi(currentFolderId, { appIds });

      get().setAddGameModalOpen(false);
      set((state) => ({
        selectedGameAppIds: [],
        userGames: state.userGames.map((g) => ({ ...g, selected: false })),
      }));
      get().setToastMessage(`${appIds.length}개의 게임이 폴더에 추가되었습니다.`);

      try {
        await get().refreshCurrentView();
      } catch (err) {
        console.error('Failed to refresh folder after adding games:', err);
        get().setToastMessage('게임은 추가되었지만 폴더를 갱신하지 못했습니다. 페이지를 새로고침해 주세요.');
      }
    })().finally(() => {
      addGamesPromise = null;
      set({ isAddingGames: false });
    });
    return addGamesPromise;
  },

  addSingleGameToFolder: async (appId: number, posX?: number, posY?: number) => {
    const { currentFolderId, items } = get();
    if (currentFolderId === null) {
      get().setToastMessage('게임을 추가하려면 먼저 폴더 안으로 이동해 주세요!');
      return;
    }

    let targetX = posX;
    let targetY = posY;
    if (targetX === undefined || targetY === undefined) {
      const emptySlot = findNextEmptySlot(items);
      targetX = emptySlot.x;
      targetY = emptySlot.y;
    }

    await addGameToFolderApi(currentFolderId, {
      appId,
      positionX: targetX,
      positionY: targetY,
    });

    await get().refreshCurrentView();
  },

  removeGameFromFolder: async (folderGameId: number) => {
    const { currentFolderId } = get();
    if (currentFolderId === null) return;
    await removeFolderGameApi(currentFolderId, folderGameId);
    get().setToastMessage('게임이 폴더에서 제거되었습니다.');
    await get().refreshCurrentView();
  },

  removeSelectedGamesFromFolder: async () => {
    const { currentFolderId, selectedItemKeys } = get();
    if (currentFolderId === null && selectedItemKeys.length > 0) {
      const folderIdsToDelete = selectedItemKeys
        .filter((k) => k.startsWith('FOLDER_'))
        .map((k) => Number(k.replace('FOLDER_', '')));

      for (const folderId of folderIdsToDelete) {
        await deleteFolderApi(folderId);
      }
      set({ selectedItemKeys: [] });
      get().setToastMessage(`${folderIdsToDelete.length}개 폴더가 삭제되었습니다.`);
      await get().refreshCurrentView();
      return;
    }

    const gameIdsToDelete: number[] = [];
    const folderIdsToDelete: number[] = [];

    selectedItemKeys.forEach((key) => {
      const [type, idStr] = key.split('_');
      const id = Number(idStr);
      if (type === 'GAME') gameIdsToDelete.push(id);
      if (type === 'FOLDER') folderIdsToDelete.push(id);
    });

    if (gameIdsToDelete.length > 0) {
      await removeFolderGamesApi(currentFolderId!, { folderGameIds: gameIdsToDelete });
    }

    for (const folderId of folderIdsToDelete) {
      await deleteFolderApi(folderId);
    }

    const totalCount = gameIdsToDelete.length + folderIdsToDelete.length;
    if (totalCount > 0) {
      get().setToastMessage(`${totalCount}개 아이템이 삭제되었습니다.`);
    }

    set({ selectedItemKeys: [] });
    await get().refreshCurrentView();
  },

  moveGameToFolder: async (folderGameId: number, targetFolderId: number, posX?: number, posY?: number) => {
    const { currentFolderId } = get();
    if (currentFolderId === null) return;

    await moveGameToAnotherFolderApi(currentFolderId, folderGameId, {
      targetFolderId,
      targetPositionX: posX,
      targetPositionY: posY,
    });

    get().setToastMessage('게임이 대상 폴더로 이동되었습니다.');
    await get().refreshCurrentView();
  },

  moveItemPosition: async (type: 'FOLDER' | 'GAME', id: number, targetX: number, targetY: number) => {
    const { items } = get();

    const occupiedItem = items.find(
      (it) => it.positionX === targetX && it.positionY === targetY && !(it.type === type && it.id === id)
    );

    const sourceItem = items.find((it) => it.type === type && it.id === id);
    if (!sourceItem) return;

    const sourceX = sourceItem.positionX;
    const sourceY = sourceItem.positionY;

    // Optimistic local state update
    const updatedItems = items.map((it) => {
      if (it.type === type && it.id === id) {
        return { ...it, positionX: targetX, positionY: targetY };
      }
      if (occupiedItem && it.type === occupiedItem.type && it.id === occupiedItem.id) {
        return { ...it, positionX: sourceX, positionY: sourceY };
      }
      return it;
    });

    set({ items: updatedItems });

    try {
      const positions = [
        { type, id, positionX: targetX, positionY: targetY },
      ];
      if (occupiedItem) {
        positions.push({
          type: occupiedItem.type,
          id: occupiedItem.id,
          positionX: sourceX,
          positionY: sourceY,
        });
      }

      await updatePositionsApi({ positions });
    } catch (err) {
      console.error('Failed to update positions on backend:', err);
      await get().refreshCurrentView();
    }
  },

  selectItem: (key: string, isMulti: boolean) => {
    set((state) => {
      if (isMulti) {
        const exists = state.selectedItemKeys.includes(key);
        return {
          selectedItemKeys: exists
            ? state.selectedItemKeys.filter((k) => k !== key)
            : [...state.selectedItemKeys, key],
        };
      }
      return { selectedItemKeys: [key] };
    });
  },

  selectMultipleItems: (keys: string[]) => {
    set({ selectedItemKeys: keys });
  },

  clearSelection: () => set({ selectedItemKeys: [] }),

  copySelected: () => {
    const { selectedItemKeys, items, currentFolderId } = get();
    if (selectedItemKeys.length === 0) return;

    const entries: ClipboardEntry[] = [];
    selectedItemKeys.forEach((key) => {
      const [type, idStr] = key.split('_');
      const id = Number(idStr);
      const item = items.find((it) => it.type === type && it.id === id);
      if (item) {
        entries.push({
          type: item.type,
          id: item.id,
          appId: item.appId,
          name: item.name,
          themeColor: item.themeColor,
          icon: item.icon,
        });
      }
    });

    if (entries.length === 0) return;

    set({
      clipboard: {
        action: 'copy',
        sourceFolderId: currentFolderId,
        entries,
      },
    });

    if (entries.length === 1) {
      get().setToastMessage(`'${entries[0].name}' 복사됨 (Ctrl+V로 붙여넣기)`);
    } else {
      get().setToastMessage(`${entries.length}개 항목 복사됨 (Ctrl+V로 붙여넣기)`);
    }
  },

  cutSelected: () => {
    const { selectedItemKeys, items, currentFolderId } = get();
    if (selectedItemKeys.length === 0) return;

    const entries: ClipboardEntry[] = [];
    selectedItemKeys.forEach((key) => {
      const [type, idStr] = key.split('_');
      const id = Number(idStr);
      const item = items.find((it) => it.type === type && it.id === id);
      if (item) {
        entries.push({
          type: item.type,
          id: item.id,
          appId: item.appId,
          name: item.name,
          themeColor: item.themeColor,
          icon: item.icon,
        });
      }
    });

    if (entries.length === 0) return;

    set({
      clipboard: {
        action: 'cut',
        sourceFolderId: currentFolderId,
        entries,
      },
    });

    if (entries.length === 1) {
      get().setToastMessage(`'${entries[0].name}' 잘라내기됨 (Ctrl+V로 이동)`);
    } else {
      get().setToastMessage(`${entries.length}개 항목 잘라내기됨 (Ctrl+V로 이동)`);
    }
  },

  pasteClipboard: async () => {
    const { clipboard, currentFolderId, currentFolder, items } = get();
    if (!clipboard || !clipboard.entries || clipboard.entries.length === 0) {
      get().setToastMessage('클립보드가 비어있습니다. 먼저 복사(Ctrl+C)하세요.');
      return;
    }

    const { action, sourceFolderId, entries } = clipboard;
    const gameEntries = entries.filter((e) => e.type === 'GAME' && e.appId);
    const folderEntries = entries.filter((e) => e.type === 'FOLDER');

    // Preemptive depth validation: If already at depth 4 (5 levels: 0, 1, 2, 3, 4), cannot add subfolder
    if (folderEntries.length > 0 && currentFolder && currentFolder.depth !== undefined && currentFolder.depth >= 4) {
      get().setToastMessage('폴더의 깊이는 최대 5개 까지 가능합니다.');
      return;
    }

    try {
      let pastedCount = 0;

      // 1. Game Entries Processing
      if (gameEntries.length > 0) {
        if (currentFolderId === null) {
          get().setToastMessage('게임은 폴더 안에만 배치할 수 있습니다. 먼저 폴더를 열어주세요!');
          if (folderEntries.length === 0) return;
        } else {
          if (action === 'copy') {
            const appIds = gameEntries.map((g) => g.appId!);
            await batchAddFolderGamesApi(currentFolderId, { appIds });
            pastedCount += gameEntries.length;
          } else if (action === 'cut') {
            if (sourceFolderId !== null && sourceFolderId !== currentFolderId) {
              const folderGameIds = gameEntries.map((g) => g.id);
              await batchMoveFolderGamesApi(sourceFolderId, {
                folderGameIds,
                targetFolderId: currentFolderId,
              });
              pastedCount += gameEntries.length;
            }
          }
        }
      }

      // 2. Folder Entries Processing
      if (folderEntries.length > 0) {
        let currentItems = [...items];
        for (const folder of folderEntries) {
          const { x, y } = findNextEmptySlot(currentItems);
          if (action === 'copy') {
            await createFolderApi({
              name: `${folder.name} - 복사본`,
              parentFolderId: currentFolderId,
              positionX: x,
              positionY: y,
              themeColor: folder.themeColor || '#00F0FF',
              icon: folder.icon || 'folder',
            });
            pastedCount++;
          } else if (action === 'cut') {
            await moveFolderApi(folder.id, {
              targetParentFolderId: currentFolderId,
              targetPositionX: x,
              targetPositionY: y,
            });
            pastedCount++;
          }
          currentItems.push({
            type: 'FOLDER',
            id: Date.now() + Math.random(),
            name: folder.name,
            positionX: x,
            positionY: y,
          });
        }
      }

      if (action === 'cut') {
        set({ clipboard: null });
      }

      await get().refreshCurrentView();

      if (pastedCount > 0) {
        get().setToastMessage(`${pastedCount}개 항목을 성공적으로 붙여넣었습니다.`);
      }
    } catch (err: unknown) {
      console.error('Failed to paste items:', err);
      const errResponse = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
      if (
        errResponse?.code === 'F005' ||
        errResponse?.message?.includes('깊이') ||
        errResponse?.message?.includes('5개') ||
        errResponse?.message?.includes('5단계')
      ) {
        get().setToastMessage('폴더의 깊이는 최대 5개 까지 가능합니다.');
      } else if (errResponse?.message) {
        get().setToastMessage(errResponse.message);
      } else {
        get().setToastMessage('붙여넣기 처리에 실패했습니다.');
      }
    }
  },

  openContextMenu: (x: number, y: number, type: 'CANVAS' | 'FOLDER' | 'GAME', targetItem?: CanvasItem) => {
    set({ contextMenu: { isOpen: true, x, y, type, targetItem } });
  },

  closeContextMenu: () => set({ contextMenu: null }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSelectedGenre: (genre: string) => set({ selectedGenre: genre }),

  setCooldownSeconds: (seconds: number) => {
    cooldownRequestId++;
    startCooldownCountdown(seconds, set, get);
  },

  checkCooldown: async () => {
    const sessionVersion = getAuthSessionVersion();
    const requestId = ++cooldownRequestId;
    try {
      const status = await getSyncCooldownApi();
      if (sessionVersion !== getAuthSessionVersion() || requestId !== cooldownRequestId) return null;
      const remaining = status?.remainingSeconds ?? 0;
      startCooldownCountdown(remaining, set, get);
      return status;
    } catch (err) {
      console.warn('Failed to check sync cooldown:', err);
      return null;
    }
  },

  fetchUserGames: async (reset = true) => {
    const requestId = ++userGamesRequestId;
    activeGamesQuery = null;
    const selectedSet = new Set(get().selectedGameAppIds);
    get().userGames.filter((g) => g.selected).forEach((g) => selectedSet.add(g.appId));
    set({
      isLoadingGames: true,
      isLoadingMoreGames: false,
      gamesError: null,
      selectedGameAppIds: Array.from(selectedSet),
      ...(reset ? { userGames: [], gamesCursor: null, hasMoreGames: true } : {}),
    });

    try {
      const pageData = await getUserGamesCursorApi(null, 24);
      if (requestId !== userGamesRequestId) return;
      if (pageData && pageData.content) {
        const existingSelectedAppIds = new Set(get().selectedGameAppIds);
        const formattedGames: UserGame[] = pageData.content.map((g) => ({
          ...g,
          selected: existingSelectedAppIds.has(g.appId),
        }));

        set({
          userGames: formattedGames,
          gamesCursor: pageData.nextCursor,
          hasMoreGames: pageData.hasNext,
          totalGamesCount: pageData.totalElements,
          isLoadingGames: false,
        });
      } else {
        set({ isLoadingGames: false, hasMoreGames: false });
      }
    } catch (err) {
      if (requestId !== userGamesRequestId) return;
      console.warn('Backend getUserGamesCursor fallback:', err);
      try {
        const games = await getUserGamesApi();
        if (requestId !== userGamesRequestId) return;
        const existingSelectedAppIds = new Set(get().selectedGameAppIds);
        set({
          userGames: (games || []).map((g) => ({
            ...g,
            selected: existingSelectedAppIds.has(g.appId),
          })),
          gamesCursor: null,
          hasMoreGames: false,
          totalGamesCount: games?.length || 0,
          isLoadingGames: false,
        });
      } catch (fallbackErr) {
        if (requestId !== userGamesRequestId) return;
        console.error('Failed to load user games:', fallbackErr);
        set({
          isLoadingGames: false,
          hasMoreGames: false,
          gamesError: getErrorMessage(fallbackErr, '게임 목록을 불러오지 못했습니다.'),
        });
      }
    }
  },

  filterUserGames: async (genres?: string[], sort: string = 'playtime') => {
    const requestId = ++userGamesRequestId;
    activeGamesQuery = { genres: genres?.slice(), sort };
    const selectedSet = new Set(get().selectedGameAppIds);
    get().userGames.filter((g) => g.selected).forEach((g) => selectedSet.add(g.appId));
    set({
      isLoadingGames: true,
      isLoadingMoreGames: false,
      gamesCursor: null,
      hasMoreGames: false,
      selectedGameAppIds: Array.from(selectedSet),
    });

    try {
      const data = await filterUserGamesApi(genres, sort);
      if (requestId !== userGamesRequestId) return;
      const currentSelectedSet = new Set(get().selectedGameAppIds);
      const formattedGames: UserGame[] = (data.games || []).map((g) => ({
        ...g,
        selected: currentSelectedSet.has(g.appId),
      }));

      set({
        userGames: formattedGames,
        gamesCursor: null,
        hasMoreGames: false,
        totalGamesCount: data.totalCount,
        isLoadingGames: false,
        gamesError: null,
      });
    } catch (err) {
      if (requestId !== userGamesRequestId) return;
      console.error('Failed to filter user games:', err);
      set({
        isLoadingGames: false,
        gamesError: getErrorMessage(err, '게임 목록을 불러오지 못했습니다.'),
      });
    }
  },

  loadMoreGames: async () => {
    const { hasMoreGames, isLoadingMoreGames, isLoadingGames, gamesCursor } = get();
    if (!hasMoreGames || isLoadingMoreGames || isLoadingGames) return;

    const requestId = userGamesRequestId;
    set({ isLoadingMoreGames: true });
    try {
      const pageData = await getUserGamesCursorApi(gamesCursor, 24);
      if (requestId !== userGamesRequestId) return;
      if (pageData && pageData.content) {
        const { userGames, selectedGameAppIds } = get();
        const currentAppIds = new Set(userGames.map((g) => g.appId));
        const selectedSet = new Set(selectedGameAppIds);
        const newUniqueGames = pageData.content
          .filter((g) => !currentAppIds.has(g.appId))
          .map((g) => ({ ...g, selected: selectedSet.has(g.appId) }));

        set({
          userGames: [...userGames, ...newUniqueGames],
          gamesCursor: pageData.nextCursor,
          hasMoreGames: pageData.hasNext,
          totalGamesCount: pageData.totalElements,
          isLoadingMoreGames: false,
        });
      } else {
        set({ hasMoreGames: false, isLoadingMoreGames: false });
      }
    } catch (err) {
      if (requestId !== userGamesRequestId) return;
      console.error('Failed to load more games:', err);
      set({ isLoadingMoreGames: false });
    }
  },

  syncGames: () => {
    const sessionVersion = getAuthSessionVersion();
    if (gamesSyncRequest?.sessionVersion === sessionVersion) return gamesSyncRequest.promise;
    if (get().cooldownSeconds > 0) {
      return Promise.reject(new Error('동기화 쿨다운(5분) 제한 중입니다.'));
    }
    set({ isSyncingGames: true });
    const request = {
      sessionVersion,
      promise: Promise.resolve().then(async () => {
        try {
          if (sessionVersion !== getAuthSessionVersion()) throw new Error('로그인 상태가 변경되었습니다.');
          const result = await syncSteamGamesApi();
          if (sessionVersion !== getAuthSessionVersion()) throw new Error('로그인 상태가 변경되었습니다.');
          cooldownRequestId++;
          startCooldownCountdown(300, set, get);
          const query = activeGamesQuery;
          if (get().isAddGameModalOpen && query) {
            await get().filterUserGames(query.genres, query.sort);
          } else {
            await get().fetchUserGames(false);
          }
          if (sessionVersion !== getAuthSessionVersion()) throw new Error('로그인 상태가 변경되었습니다.');
          return result;
        } catch (err: unknown) {
          const errResponse = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data;
          if (sessionVersion === getAuthSessionVersion() &&
              (errResponse?.code === 'G005' || errResponse?.message?.includes('쿨다운'))) {
            await get().checkCooldown();
          }
          throw err;
        } finally {
          if (sessionVersion === getAuthSessionVersion()) set({ isSyncingGames: false });
          if (gamesSyncRequest === request) gamesSyncRequest = null;
        }
      }),
    };
    gamesSyncRequest = request;
    return request.promise;
  },

  toggleGameSelection: (appId: number) => {
    set((state) => {
      const nextSelected = new Set(state.selectedGameAppIds);
      if (nextSelected.has(appId)) {
        nextSelected.delete(appId);
      } else {
        nextSelected.add(appId);
      }
      return {
        selectedGameAppIds: Array.from(nextSelected),
        userGames: state.userGames.map((game) =>
          game.appId === appId ? { ...game, selected: nextSelected.has(appId) } : game
        ),
      };
    });
  },

  setSettingsModalOpen: (open: boolean) => {
    set({ isSettingsModalOpen: open });
    if (open) {
      get().checkCooldown();
    }
  },

  setAddGameModalOpen: (open: boolean) => {
    if (!open) userGamesRequestId++;
    set((state) => ({
      isAddGameModalOpen: open,
      selectedGameAppIds: [],
      userGames: state.userGames.map((g) => ({ ...g, selected: false })),
      ...(!open ? {
        isLoadingGames: false,
        isLoadingMoreGames: false,
        gamesError: null,
      } : {}),
    }));
  },

  setDirectLoginModalOpen: (open: boolean) => set({ isDirectLoginModalOpen: open }),

  setCreateFolderModalOpen: (open: boolean) => set({ isCreateFolderModalOpen: open }),

  setEditFolderModalOpen: (open: boolean, folder: FolderResponse | null = null) => {
    set({ isEditFolderModalOpen: open, editingFolder: folder });
  },

  openGameDetailModal: async (game: {
    appId: number;
    name: string;
    headerImage?: string;
    genres?: string[];
    playtimeForever?: number;
    lastPlayedAt?: string;
    totalAchievements?: number | null;
    achievedAchievements?: number | null;
    achievementRate?: number | null;
    isReadOnly?: boolean;
  }) => {
    const requestId = ++gameDetailRequestId;
    const isGuestOrReadOnly = Boolean(game.isReadOnly || !useAuthStore.getState().isAuthenticated);

    const matchingUserGame = get().userGames.find((g) => g.appId === game.appId);
    const playtimeForever = game.playtimeForever ?? matchingUserGame?.playtimeForever;
    const lastPlayedAt = game.lastPlayedAt ?? matchingUserGame?.lastPlayedAt;

    // 소유자가 이미 동기화해 둔 업적 정보가 있는 경우 즉시 객체 구성 (스팀 API 호출 0회)
    const cachedAchievements: GameAchievementDetail | null =
      game.totalAchievements !== null && game.totalAchievements !== undefined
        ? {
            appId: game.appId,
            gameName: game.name,
            totalAchievements: game.totalAchievements,
            achievedAchievements: game.achievedAchievements ?? 0,
            achievementRate: game.achievementRate ?? 0,
            playtimeForever,
            lastPlayedAt,
            achievements: [],
          }
        : null;

    set({
      isGameDetailModalOpen: true,
      selectedGameDetail: {
        appId: game.appId,
        name: game.name,
        headerImage: game.headerImage,
        genres: game.genres,
        playtimeForever,
        lastPlayedAt,
        totalAchievements: game.totalAchievements,
        achievedAchievements: game.achievedAchievements,
        achievementRate: game.achievementRate,
        isReadOnly: isGuestOrReadOnly,
      },
      achievementDetail: cachedAchievements,
      isLoadingGameDetail: !isGuestOrReadOnly,
      isSyncingAchievements: false,
      gameDetailError: null,
    });

    // 게스트이거나 읽기 전용(타인 쇼케이스)인 경우 /users/me API 호출 건너뛰기
    if (isGuestOrReadOnly) {
      return;
    }

    try {
      const data = await getGameAchievementsApi(game.appId);
      if (
        requestId !== gameDetailRequestId ||
        !get().isGameDetailModalOpen ||
        get().selectedGameDetail?.appId !== game.appId
      ) return;
      set((state) => ({
        achievementDetail: data,
        isLoadingGameDetail: false,
        selectedGameDetail: state.selectedGameDetail
          ? {
              ...state.selectedGameDetail,
              playtimeForever: data.playtimeForever ?? state.selectedGameDetail.playtimeForever,
              lastPlayedAt: (data.lastPlayedAt ?? state.selectedGameDetail.lastPlayedAt) || undefined,
              totalAchievements: data.totalAchievements,
              achievedAchievements: data.achievedAchievements,
              achievementRate: data.achievementRate,
            }
          : null,
      }));

      // Update userGames if present
      set((state) => ({
        userGames: state.userGames.map((g) =>
          g.appId === game.appId
            ? {
                ...g,
                totalAchievements: data.totalAchievements,
                achievedAchievements: data.achievedAchievements,
                achievementRate: data.achievementRate,
              }
            : g
        ),
      }));
    } catch (err: unknown) {
      if (requestId !== gameDetailRequestId) return;
      console.error('Failed to fetch game achievements detail:', err);
      const msg = getErrorMessage(err, '도전과제 정보를 불러오지 못했습니다.');
      set({
        gameDetailError: msg,
        isLoadingGameDetail: false,
      });
    }
  },

  closeGameDetailModal: () => {
    gameDetailRequestId++;
    set({
      isGameDetailModalOpen: false,
      selectedGameDetail: null,
      achievementDetail: null,
      gameDetailError: null,
      isLoadingGameDetail: false,
      isSyncingAchievements: false,
    });
  },

  syncGameAchievements: async (force = true) => {
    const { selectedGameDetail, isGameDetailModalOpen, isSyncingAchievements } = get();
    if (!selectedGameDetail || !isGameDetailModalOpen || selectedGameDetail.isReadOnly || isSyncingAchievements) return;

    const requestId = ++gameDetailRequestId;
    set({ isSyncingAchievements: true, isLoadingGameDetail: false, gameDetailError: null });
    try {
      const updated = await syncGameAchievementsApi(selectedGameDetail.appId, force);
      if (
        requestId !== gameDetailRequestId ||
        !get().isGameDetailModalOpen ||
        get().selectedGameDetail?.appId !== selectedGameDetail.appId
      ) return;
      set((state) => ({
        achievementDetail: updated,
        isSyncingAchievements: false,
        selectedGameDetail: state.selectedGameDetail ? {
          ...state.selectedGameDetail,
          playtimeForever: updated.playtimeForever ?? state.selectedGameDetail.playtimeForever,
          lastPlayedAt: (updated.lastPlayedAt ?? state.selectedGameDetail.lastPlayedAt) || undefined,
          totalAchievements: updated.totalAchievements,
          achievedAchievements: updated.achievedAchievements,
          achievementRate: updated.achievementRate,
        } : null,
        userGames: state.userGames.map((g) =>
          g.appId === selectedGameDetail.appId
            ? {
                ...g,
                totalAchievements: updated.totalAchievements,
                achievedAchievements: updated.achievedAchievements,
                achievementRate: updated.achievementRate,
              }
            : g
        ),
      }));
    } catch (err: unknown) {
      if (requestId !== gameDetailRequestId) return;
      console.error('Failed to sync game achievements:', err);
      const msg = getErrorMessage(err, '도전과제 동기화에 실패했습니다.');
      set({
        gameDetailError: msg,
        isSyncingAchievements: false,
      });
    }
  },

  setGameDetailModalOpen: (open: boolean) => {
    if (!open) {
      get().closeGameDetailModal();
    }
  },
}));

subscribeAuthSession(() => {
  cooldownRequestId++;
  userGamesRequestId++;
  gameDetailRequestId++;
  activeGamesQuery = null;
  if (countdownTimer) clearInterval(countdownTimer);
  if (toastTimeout) clearTimeout(toastTimeout);
  countdownTimer = null;
  toastTimeout = null;
  useShowcaseStore.setState(useShowcaseStore.getInitialState());
});
