import { apiClient } from './client';
import type { ApiResponse } from '@/types/auth';
import type {
  FolderResponse,
  FolderGameDetailResponse,
} from '@/types/showcase';
import type {
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
  UpdatePositionsRequest,
  AddFolderGameRequest,
  BatchAddFolderGamesRequest,
  MoveFolderGameRequest,
  BatchMoveFolderGamesRequest,
  RemoveFolderGamesRequest,
} from '@/types/folder';

/**
 * 1. 폴더 생성 API
 */
export const createFolderApi = async (
  request: CreateFolderRequest
): Promise<FolderResponse> => {
  const response = await apiClient.post<ApiResponse<FolderResponse>>(
    '/api/v1/folders',
    request
  );
  return response.data.data;
};

/**
 * 2. 내 전체 폴더 계층 목록 조회 API
 */
export const getMyFoldersApi = async (): Promise<FolderResponse[]> => {
  const response = await apiClient.get<ApiResponse<FolderResponse[]>>(
    '/api/v1/folders'
  );
  return response.data.data;
};

/**
 * 3. 특정 폴더 상세 조회 API (직속 자식 폴더 및 직속 게임 목록 포함)
 */
export const getFolderDetailApi = async (
  folderId: number
): Promise<FolderResponse> => {
  const response = await apiClient.get<ApiResponse<FolderResponse>>(
    `/api/v1/folders/${folderId}`
  );
  return response.data.data;
};

/**
 * 4. 폴더 정보(이름, 색상, 아이콘) 수정 API
 */
export const updateFolderApi = async (
  folderId: number,
  request: UpdateFolderRequest
): Promise<FolderResponse> => {
  const response = await apiClient.patch<ApiResponse<FolderResponse>>(
    `/api/v1/folders/${folderId}`,
    request
  );
  return response.data.data;
};

/**
 * 5. 폴더 이동 API (부모 변경, 2D 위치 변경, 순환 참조 차단)
 */
export const moveFolderApi = async (
  folderId: number,
  request: MoveFolderRequest
): Promise<FolderResponse> => {
  const response = await apiClient.patch<ApiResponse<FolderResponse>>(
    `/api/v1/folders/${folderId}/move`,
    request
  );
  return response.data.data;
};

/**
 * 6. 2D 격자 좌표 일괄 업데이트(드래그 앤 드롭) API
 */
export const updatePositionsApi = async (
  request: UpdatePositionsRequest
): Promise<void> => {
  await apiClient.patch<ApiResponse<void>>(
    '/api/v1/folders/positions',
    request
  );
};

/**
 * 7. 폴더 삭제 API (하위 자식 폴더 연쇄 삭제)
 */
export const deleteFolderApi = async (folderId: number): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(`/api/v1/folders/${folderId}`);
};

/**
 * 8. 폴더 내 게임 단일 추가 API (동일 게임 다중 복제 지원)
 */
export const addGameToFolderApi = async (
  folderId: number,
  request: AddFolderGameRequest
): Promise<FolderGameDetailResponse> => {
  const response = await apiClient.post<ApiResponse<FolderGameDetailResponse>>(
    `/api/v1/folders/${folderId}/games`,
    request
  );
  return response.data.data;
};

/**
 * 9. 폴더 내 게임 여러 개 일괄 추가 및 복사 붙여넣기 API
 */
export const batchAddFolderGamesApi = async (
  folderId: number,
  request: BatchAddFolderGamesRequest
): Promise<FolderGameDetailResponse[]> => {
  const response = await apiClient.post<ApiResponse<FolderGameDetailResponse[]>>(
    `/api/v1/folders/${folderId}/games/batch`,
    request
  );
  return response.data.data;
};

/**
 * 10. 폴더 내 특정 게임 인스턴스 단일 삭제 API
 */
export const removeFolderGameApi = async (
  folderId: number,
  folderGameId: number
): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(
    `/api/v1/folders/${folderId}/games/${folderGameId}`
  );
};

/**
 * 11. 폴더 내 선택한 게임 인스턴스들 일괄 삭제 API
 */
export const removeFolderGamesApi = async (
  folderId: number,
  request: RemoveFolderGamesRequest
): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>(
    `/api/v1/folders/${folderId}/games`,
    { data: request }
  );
};

/**
 * 12. 폴더 간 단일 게임 이동(잘라내기/붙여넣기) API
 */
export const moveGameToAnotherFolderApi = async (
  folderId: number,
  folderGameId: number,
  request: MoveFolderGameRequest
): Promise<FolderGameDetailResponse> => {
  const response = await apiClient.patch<ApiResponse<FolderGameDetailResponse>>(
    `/api/v1/folders/${folderId}/games/${folderGameId}/move`,
    request
  );
  return response.data.data;
};

/**
 * 13. 폴더 간 여러 게임 일괄 이동(잘라내기/붙여넣기) API
 */
export const batchMoveFolderGamesApi = async (
  folderId: number,
  request: BatchMoveFolderGamesRequest
): Promise<FolderGameDetailResponse[]> => {
  const response = await apiClient.patch<ApiResponse<FolderGameDetailResponse[]>>(
    `/api/v1/folders/${folderId}/games/move`,
    request
  );
  return response.data.data;
};
