export interface CreateFolderRequest {
  name: string;
  parentFolderId?: number | null;
  themeColor?: string;
  icon?: string;
  positionX?: number;
  positionY?: number;
}

export interface UpdateFolderRequest {
  name?: string;
  themeColor?: string;
  icon?: string;
}

export interface MoveFolderRequest {
  targetParentFolderId?: number | null;
  targetPositionX?: number;
  targetPositionY?: number;
}

export interface ItemPositionDto {
  type: 'FOLDER' | 'GAME';
  id: number; // folderId or folderGameId
  positionX: number;
  positionY: number;
}

export interface UpdatePositionsRequest {
  positions: ItemPositionDto[];
}

export interface AddFolderGameRequest {
  appId: number;
  positionX?: number;
  positionY?: number;
}

export interface BatchAddFolderGamesRequest {
  appIds: number[];
}

export interface MoveFolderGameRequest {
  targetFolderId: number;
  targetPositionX?: number;
  targetPositionY?: number;
}

export interface BatchMoveFolderGamesRequest {
  folderGameIds: number[];
  targetFolderId: number;
}

export interface RemoveFolderGamesRequest {
  folderGameIds: number[];
}
