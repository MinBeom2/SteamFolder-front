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
  selected?: boolean;
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
