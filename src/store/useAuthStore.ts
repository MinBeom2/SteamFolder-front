import { create } from 'zustand';
import { getAuthSessionVersion, invalidateAuthSession } from '@/utils/authSession';
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
  setAuth: (authData: AuthResponse) => Promise<void>;
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

  setAuth: async (authData: AuthResponse) => {
    const sessionVersion = invalidateAuthSession();
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);

    set({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      isLoading: true,
      error: null,
    });

    try {
      // 로그인 응답에는 공개 범위가 없으므로 실제 프로필을 확인한 뒤 로그인 상태를 확정한다.
      const user = await getMyProfileApi();
      if (sessionVersion !== getAuthSessionVersion()) {
        throw new Error('로그인이 취소되었습니다. 다시 시도해 주세요.');
      }

      set({
        user,
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      if (sessionVersion === getAuthSessionVersion()) {
        get().logout();
        set({ error: '로그인 후 프로필 정보를 불러오지 못했습니다. 다시 시도해 주세요.' });
      }
      throw err;
    }
  },

  logout: () => {
    invalidateAuthSession();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
      error: null,
    });
  },

  fetchProfile: async () => {
    const sessionVersion = getAuthSessionVersion();
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
        error: null,
      });
      return;
    }

    set({ isLoading: true });
    try {
      // 백엔드 GET /api/v1/users/me 호출로 실제 토큰 유효성 검증
      const user = await getMyProfileApi();
      if (sessionVersion !== getAuthSessionVersion()) return;
      set({
        user,
        accessToken: localStorage.getItem('accessToken'),
        refreshToken: localStorage.getItem('refreshToken'),
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      if (sessionVersion !== getAuthSessionVersion()) return;
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) {
        get().logout();
      } else {
        set({
          isInitialized: true,
          isLoading: false,
          error: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        });
      }
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
