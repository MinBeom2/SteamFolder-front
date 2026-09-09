export interface UserGame {
  userGameId: number;
  appId: number;
  name: string;
  playtimeForever: number; // in minutes
  lastPlayedAt?: string;
  headerImage: string;
  heroImage?: string;
  genres: string[];
  developer?: string;
  totalAchievements?: number;
  achievedAchievements?: number;
  achievementRate?: number;
  selected?: boolean;
}

export interface CursorPageResponse<T> {
  content: T[];
  nextCursor: number | null;
  hasNext: boolean;
  totalElements: number;
  pageSize: number;
}

export interface FilteredGamesResponse {
  totalCount: number;
  games: UserGame[];
  content?: UserGame[];
}

export interface SyncResult {
  syncedGameCount: number;
  newlyAddedCount: number;
  lastSyncedAt: string;
}

export interface CooldownStatus {
  cooldownActive?: boolean;
  isCooldownActive?: boolean;
  remainingSeconds: number;
  lastSyncedAt?: string;
}

export interface AchievementItem {
  apiName: string;
  achieved: boolean;
  unlockTime?: string | null;
}

export interface GameAchievementDetail {
  appId: number;
  gameName: string;
  totalAchievements: number;
  achievedAchievements: number;
  achievementRate: number; // 0.0 ~ 100.0 %
  playtimeForever?: number;
  lastPlayedAt?: string | null;
  syncedAt?: string | null;
  achievements: AchievementItem[];
}
