import { apiClient } from './client';
import type { ApiResponse } from '@/types/auth';
import type {
  ShowcaseResponse,
  ShowcaseLikeResponse,
  LikedShowcasePageResponse,
} from '@/types/showcase';

/**
 * 1. 로그인한 본인의 전체 쇼케이스 뷰 조회 API
 */
export const getMyShowcaseApi = async (): Promise<ShowcaseResponse> => {
  const response = await apiClient.get<ApiResponse<ShowcaseResponse>>(
    '/api/v1/showcases/me'
  );
  return response.data.data;
};

/**
 * 2. 게스트 및 타 유저의 공개 쇼케이스 뷰 조회 API (steamId 또는 username)
 */
export const getPublicShowcaseApi = async (
  identifier: string
): Promise<ShowcaseResponse> => {
  const response = await apiClient.get<ApiResponse<ShowcaseResponse>>(
    `/api/v1/showcases/${encodeURIComponent(identifier)}`
  );
  return response.data.data;
};

/**
 * 3. 타 유저 쇼케이스 좋아요 토글 API
 */
export const toggleShowcaseLikeApi = async (
  targetUserId: number
): Promise<ShowcaseLikeResponse> => {
  const response = await apiClient.post<ApiResponse<ShowcaseLikeResponse>>(
    `/api/v1/showcases/${targetUserId}/likes`
  );
  return response.data.data;
};

/**
 * 4. 내가 좋아요 누른 쇼케이스 목록 조회 API (커서 기반 페이징)
 */
export const getMyLikedShowcasesApi = async (
  cursor?: number | null,
  size: number = 20
): Promise<LikedShowcasePageResponse> => {
  const params: Record<string, unknown> = { size };
  if (cursor !== undefined && cursor !== null) {
    params.cursor = cursor;
  }
  const response = await apiClient.get<ApiResponse<LikedShowcasePageResponse>>(
    '/api/v1/showcases/me/likes',
    { params }
  );
  return response.data.data;
};


