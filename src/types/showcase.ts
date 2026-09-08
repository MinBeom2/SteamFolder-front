export interface FolderGameDto {
  id: number; // folderGameId
  appId: number;
  name: string;
  headerImage: string;
  positionX: number;
  positionY: number;
  genres?: string[];
  playtimeForever?: number;
  lastPlayedAt?: string;
}

export interface FolderResponse {
  id: number;
  name: string;
  themeColor: string;
  icon?: string;
  positionX: number;
  positionY: number;
  depth: number;
  isOpen?: boolean;
  parentFolderId?: number | null;
  gameCount: number;
  childFolderCount: number;
  childFolders?: FolderResponse[];
  games?: FolderGameDto[];
  breadcrumbs?: BreadcrumbItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ShowcaseUserDto {
  id: number;
  steamId: string;
  username: string;
  avatarUrl: string;
  themeColor: string;
  isPublic: boolean;
  likeCount?: number;
  isLiked?: boolean;
}

export interface ShowcaseLikeResponse {
  targetUserId: number;
  liked: boolean;
  totalLikeCount: number;
}

export interface ShowcaseStatsDto {
  totalFolders: number;
  totalGamesInFolders: number;
  totalOwnedGames: number;
  totalPlaytimeForever: number; // 분 단위
}

export interface ShowcaseResponse {
  user: ShowcaseUserDto;
  stats: ShowcaseStatsDto;
  rootFolders: FolderResponse[];
}

export interface FolderGameDetailResponse {
  id: number; // folderGameId
  folderId: number;
  appId: number;
  name: string;
  headerImage: string;
  positionX: number;
  positionY: number;
  genres?: string[];
  playtimeForever?: number;
  lastPlayedAt?: string;
  createdAt?: string;
}

// 2D Canvas Unified Grid Item
export type CanvasItemType = 'FOLDER' | 'GAME';

export interface CanvasItem {
  type: CanvasItemType;
  id: number; // folderId or folderGameId
  name: string;
  positionX: number;
  positionY: number;
  // Folder specific
  themeColor?: string;
  icon?: string;
  depth?: number;
  gameCount?: number;
  childFolderCount?: number;
  folderData?: FolderResponse;
  // Game specific
  appId?: number;
  headerImage?: string;
  genres?: string[];
  playtimeForever?: number;
  lastPlayedAt?: string;
  playtimeHours?: number;
  gameData?: FolderGameDto;
}

// Breadcrumb Item
export interface BreadcrumbItem {
  id: number | null; // null for Root Showcase
  name: string;
}

// Clipboard Item for Multi-selection Ctrl+C / Ctrl+X / Ctrl+V
export interface ClipboardEntry {
  type: CanvasItemType;
  id: number; // folderGameId or folderId
  appId?: number;
  name: string;
  themeColor?: string;
  icon?: string;
}

export interface ClipboardItem {
  action: 'copy' | 'cut';
  sourceFolderId: number | null;
  entries: ClipboardEntry[];
}

// Liked Showcase Models
export interface LikedShowcaseItemDto {
  likeId: number;
  userId: number;
  steamId: string;
  username: string;
  avatarUrl: string;
  themeColor: string;
  likeCount: number;
  totalGamesCount: number;
  isLiked: boolean;
  likedAt: string;
}

export interface LikedShowcasePageResponse {
  content: LikedShowcaseItemDto[];
  nextCursor: number | null;
  hasNext: boolean;
  totalElements: number;
  pageSize: number;
}



