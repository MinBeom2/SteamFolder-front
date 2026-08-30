import { apiClient } from './client';
import type { ApiResponse } from '@/types/auth';
import type { UserGame, SyncResult, CooldownStatus } from '@/types/game';

/**
 * 유저의 보유 스팀 게임 목록 조회 API
 */
export const getUserGamesApi = async (): Promise<UserGame[]> => {
  const response = await apiClient.get<ApiResponse<UserGame[]>>(
    '/api/v1/steam/user-games'
  );
  return response.data.data;
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
