export interface ShowcaseRankingItemDto {
  rank: number | null;
  userId: number;
  username: string;
  avatarUrl: string;
  likeCount: number;
  totalGamesCount: number;
  isLiked: boolean;
  isPublic?: boolean;
}

export interface ShowcaseRankingResponse {
  content: ShowcaseRankingItemDto[];
  myRanking: ShowcaseRankingItemDto | null;
  nextCursorLikeCount: number | null;
  nextCursorUserId: number | null;
  hasNext: boolean;
  pageSize: number;
}
