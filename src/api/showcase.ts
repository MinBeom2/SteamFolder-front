import { apiClient } from './client';
import type { ApiResponse } from '@/types/auth';
import type { ShowcaseResponse } from '@/types/showcase';

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
