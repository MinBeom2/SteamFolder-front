import { apiClient } from './client';
import type { ApiResponse } from '@/types/auth';
import type { UserGame, CursorPageResponse, SyncResult, CooldownStatus } from '@/types/game';

/**
 * No-Offset 커서 기반 유저 보유 게임 라이브러리 목록 페이징 조회 API
 */
export const getUserGamesCursorApi = async (
  cursor?: number | null,
  size: number = 24
): Promise<CursorPageResponse<UserGame>> => {
  const params: Record<string, unknown> = { size };
  if (cursor !== undefined && cursor !== null) {
    params.cursor = cursor;
  }
  const response = await apiClient.get<ApiResponse<CursorPageResponse<UserGame>>>(
    '/api/v1/users/me/games',
    { params }
  );
  return response.data.data;
};

/**
 * 유저의 보유 스팀 게임 전체 목록 조회 API (Legacy Fallback)
 */
export const getUserGamesApi = async (): Promise<UserGame[]> => {
  try {
    const pageData = await getUserGamesCursorApi(null, 100);
    return pageData.content;
  } catch {
    const response = await apiClient.get<ApiResponse<UserGame[]>>(
      '/api/v1/steam/user-games'
    );
    return response.data.data;
  }
};

/**
 * 스팀 Web API 게임 라이브러리 실시간 동기화 API
 */
export const syncSteamGamesApi = async (): Promise<SyncResult> => {
  const response = await apiClient.post<ApiResponse<SyncResult>>(
    '/api/v1/steam/sync'
  );
  return response.data.data;
};

/**
 * 스팀 동기화 쿨다운 상태 조회 API
 */
export const getSyncCooldownApi = async (): Promise<CooldownStatus> => {
  const response = await apiClient.get<ApiResponse<CooldownStatus>>(
    '/api/v1/steam/sync/cooldown'
  );
  return response.data.data;
};
