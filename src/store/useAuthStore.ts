import { create } from 'zustand';
import type { User, AuthResponse, UpdateProfileRequest } from '@/types/auth';
import {
  getMyProfileApi,
  updateProfileApi,
  updateVisibilityApi,
  deleteAccountApi,
} from '@/api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean; // 초기 토큰 검증 완료 여부 (화면 깜빡임 방지)
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (authData: AuthResponse) => void;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  updateVisibility: (isPublic: boolean) => Promise<void>;
  deleteAccount: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  setAuth: (authData: AuthResponse) => {
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);

    const user: User = {
      id: authData.userId,
      steamId: authData.steamId,
      username: authData.username,
      avatarUrl: authData.avatarUrl,
      themeColor: authData.themeColor || '#00F0FF',
      isPublic: true,
    };

    set({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user,
      isAuthenticated: true,
      isInitialized: true,
      error: null,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
      error: null,
    });
  },

  fetchProfile: async () => {
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    // 토큰이 아예 없는 경우: 비로그인 상태로 즉시 확정
    if (!token && !refreshToken) {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // 백엔드 GET /api/v1/users/me 호출로 실제 토큰 유효성 검증
      const user = await getMyProfileApi();
      set({
        user,
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      console.warn('토큰 검증 실패 또는 만료됨 (로그아웃 처리):', err);
      get().logout();
      set({ isInitialized: true, isLoading: false });
    }
  },

  updateProfile: async (data: UpdateProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateProfileApi(data);
      set({ user: updatedUser, isLoading: false });
    } catch (err: unknown) {
      console.error('Failed to update profile:', err);
      set({ isLoading: false, error: '프로필 설정 저장에 실패했습니다.' });
      throw err;
    }
  },

  updateVisibility: async (isPublic: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const updatedUser = await updateVisibilityApi({ isPublic });
      set({ user: updatedUser, isLoading: false });
    } catch (err: unknown) {
      console.error('Failed to update visibility:', err);
      set({ isLoading: false, error: '공개 범위 설정 변경에 실패했습니다.' });
      throw err;
    }
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      await deleteAccountApi();
      get().logout();
      set({ isLoading: false });
    } catch (err: unknown) {
      console.error('Failed to delete account:', err);
      set({ isLoading: false, error: '회원 탈퇴 처리에 실패했습니다.' });
      throw err;
    }
  },

  initializeAuth: async () => {
    await get().fetchProfile();
  },
}));

// Global auth:logout event listener
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}
