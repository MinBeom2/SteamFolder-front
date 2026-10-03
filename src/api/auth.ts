import { apiClient } from './client';
import type {
  ApiResponse,
  AuthResponse,
  SteamLoginRequest,
  TokenRefreshRequest,
  TokenRefreshResponse,
  UpdateProfileRequest,
  UpdateVisibilityRequest,
  User,
} from '@/types/auth';

/**
 * 스팀 OpenID 로그인 / 신규 회원가입 API
 */
export const loginWithSteamApi = async (
  request: SteamLoginRequest
): Promise<AuthResponse> => {
  const response = await apiClient.post<ApiResponse<AuthResponse>>(
    '/api/v1/auth/steam/login',
    request
  );
  return response.data.data;
};

/**
 * JWT Access Token 재발급 API
 */
export const refreshTokenApi = async (
  request: TokenRefreshRequest
): Promise<TokenRefreshResponse> => {
  const response = await apiClient.post<ApiResponse<TokenRefreshResponse>>(
    '/api/v1/auth/refresh',
    request
  );
  return response.data.data;
};

/**
 * 내 프로필 정보 조회 API
 */
export const getMyProfileApi = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<User>>('/api/v1/users/me', { timeout: 15000 });
  return response.data.data;
};

/**
 * 프로필 커스텀 설정(테마 색상, 닉네임) 수정 API
 */
export const updateProfileApi = async (
  request: UpdateProfileRequest
): Promise<User> => {
  const response = await apiClient.patch<ApiResponse<User>>(
    '/api/v1/users/me/profile',
    request
  );
  return response.data.data;
};

/**
 * 쇼케이스 공개 범위 (Public/Private) 설정 수정 API
 */
export const updateVisibilityApi = async (
  request: UpdateVisibilityRequest
): Promise<User> => {
  const response = await apiClient.patch<ApiResponse<User>>(
    '/api/v1/users/me/visibility',
    request
  );
  return response.data.data;
};

/**
 * 회원 탈퇴 API
 */
export const deleteAccountApi = async (): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>('/api/v1/users/me');
};

/**
 * 작업 공간 초기화 API
 * 폴더와 폴더에 배치된 게임만 삭제하며 Steam 보유 게임/업적은 유지합니다.
 */
export const resetWorkspaceApi = async (): Promise<void> => {
  await apiClient.delete<ApiResponse<void>>('/api/v1/users/me/workspace');
};
