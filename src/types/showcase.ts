export interface GameItem {
  id: string;
  appId: number;
  name: string;
  headerImage: string;
  playtimeHours: number;
  genres: string[];
  rating?: number;
  selected?: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  color?: string; // Theme color (cyan, purple, green, etc.)
  gameCount: number;
  parentId?: string | null;
  subFolders?: FolderItem[];
  games?: GameItem[];
  previewImages?: string[]; // 2x2 grid image preview URLs
}

export interface ShowcaseData {
  userId: number | string;
  username: string;
  customTitle: string;
  totalFolders: number;
  totalGames: number;
  themeColor: string;
  isPublic: boolean;
  folders: FolderItem[];
  games: GameItem[];
}
