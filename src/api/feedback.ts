import { apiClient } from './client';
import type { ApiResponse } from '@/types/auth';

export type FeedbackCategory = 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL';

export interface SubmitFeedbackRequest {
  category: FeedbackCategory;
  content: string;
}

export interface SubmitFeedbackResponse {
  feedbackId: number;
  createdAt: string;
}

export const submitFeedbackApi = async (
  request: SubmitFeedbackRequest
): Promise<SubmitFeedbackResponse> => {
  const response = await apiClient.post<ApiResponse<SubmitFeedbackResponse>>(
    '/api/v1/feedbacks',
    request
  );
  return response.data.data;
};
