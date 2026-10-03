import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, TokenRefreshResponse } from '@/types/auth';
import { getAuthSessionVersion, invalidateAuthSession } from '@/utils/authSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

type SessionRequest = InternalAxiosRequestConfig & {
  _authSession?: number;
  _retry?: boolean;
};

let refreshRequest: {
  sessionVersion: number;
  promise: Promise<TokenRefreshResponse>;
} | null = null;

const sessionChangedError = () => new Error('로그인 상태가 변경되었습니다. 다시 시도해 주세요.');

const expireSession = (sessionVersion: number) => {
  if (sessionVersion !== getAuthSessionVersion()) return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  invalidateAuthSession();
  window.dispatchEvent(new Event('auth:logout'));
};

const refreshSession = (sessionVersion: number, refreshToken: string) => {
  if (refreshRequest?.sessionVersion === sessionVersion) return refreshRequest.promise;

  const request = {
    sessionVersion,
    promise: axios.post<ApiResponse<TokenRefreshResponse>>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refreshToken },
      { withCredentials: true, timeout: 15000 }
    ).then((response) => {
      if (sessionVersion !== getAuthSessionVersion()) throw sessionChangedError();
      const tokens = response.data.data;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      return tokens;
    }).catch((error: unknown) => {
      const status = (error as AxiosError)?.response?.status;
      if (status === 401 || status === 403) expireSession(sessionVersion);
      throw error;
    }).finally(() => {
      if (refreshRequest === request) refreshRequest = null;
    }),
  };
  refreshRequest = request;
  return request.promise;
};

apiClient.interceptors.request.use((config: SessionRequest) => {
  const sessionVersion = getAuthSessionVersion();
  if (config._authSession !== undefined && config._authSession !== sessionVersion) {
    throw sessionChangedError();
  }
  config._authSession = sessionVersion;
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  else delete config.headers.Authorization;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if ((response.config as SessionRequest)._authSession !== getAuthSessionVersion()) {
      throw sessionChangedError();
    }
    return response;
  },
  async (error: AxiosError) => {
    const request = error.config as SessionRequest | undefined;
    if (
      error.response?.status !== 401 ||
      !request ||
      request.url?.includes('/api/v1/auth/refresh') ||
      request.url?.includes('/api/v1/auth/steam/login')
    ) {
      throw error;
    }

    const sessionVersion = request._authSession;
    if (sessionVersion === undefined || sessionVersion !== getAuthSessionVersion()) {
      throw sessionChangedError();
    }
    if (request._retry) {
      expireSession(sessionVersion);
      throw error;
    }
    request._retry = true;

    // Another request may have rotated the token before this 401 arrived.
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && request.headers.Authorization !== `Bearer ${accessToken}`) {
      return apiClient(request);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      if (accessToken) expireSession(sessionVersion);
      throw error;
    }

    await refreshSession(sessionVersion, refreshToken);
    if (sessionVersion !== getAuthSessionVersion()) throw sessionChangedError();
    return apiClient(request);
  }
);
