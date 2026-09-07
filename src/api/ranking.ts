import { apiClient } from './client';
import type { ApiResponse } from '@/types/auth';
import type { ShowcaseRankingResponse } from '@/types/ranking';

/**
 * No-Offset 커서 기반 인기 쇼케이스 랭킹 조회 API
 * - 게스트 및 비로그인 사용자 열람 가능
 * - 로그인 사용자의 경우 본인의 순위 및 좋아요 개수(myRanking)를 함께 반환
 */
export const getShowcaseRankingsApi = async (
  cursorLikeCount?: number | null,
  cursorUserId?: number | null,
  limit = 10
): Promise<ShowcaseRankingResponse> => {
  const params: Record<string, string | number> = { limit };

  if (cursorLikeCount !== undefined && cursorLikeCount !== null) {
    params.cursorLikeCount = cursorLikeCount;
  }
  if (cursorUserId !== undefined && cursorUserId !== null) {
    params.cursorUserId = cursorUserId;
  }

  const response = await apiClient.get<ApiResponse<ShowcaseRankingResponse>>(
    '/api/v1/rankings/showcases',
    { params }
  );

  return response.data.data;
};
