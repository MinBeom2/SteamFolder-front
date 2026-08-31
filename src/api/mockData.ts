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
  color?: string;
  gameCount: number;
  parentId?: string | null;
  subFolders?: FolderItem[];
}

export interface ShowcaseData {
  userId: string;
  username: string;
  customTitle: string;
  totalFolders: number;
  totalGames: number;
  themeColor: string;
  isPublic: boolean;
  folders: FolderItem[];
  games: GameItem[];
}

export const INITIAL_AVAILABLE_GAMES: GameItem[] = [
  {
    id: 'game-1',
    appId: 1245620,
    name: 'Elden Ring',
    headerImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg',
    playtimeHours: 240,
    genres: ['RPG', '액션'],
    rating: 9.5,
    selected: true,
  },
  {
    id: 'game-2',
    appId: 1091500,
    name: 'Cyberpunk 2077',
    headerImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg',
    playtimeHours: 185,
    genres: ['RPG', 'FPS', '액션'],
    rating: 9.0,
    selected: true,
  },
];
