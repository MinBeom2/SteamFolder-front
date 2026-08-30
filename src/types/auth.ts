// Standard API response wrappers matching Backend ApiResponse<T>
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface FieldErrorDetail {
  field: string;
  value: string;
  reason: string;
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  code: string;
  status: number;
  timestamp: string;
  errors?: FieldErrorDetail[];
}

// User & Authentication Models
export interface User {
  id: number;
  steamId: string;
  username: string;
  avatarUrl: string | null;
  themeColor: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  steamId: string;
  username: string;
  avatarUrl: string | null;
  themeColor: string;
  isNewUser: boolean;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SteamLoginRequest {
  openIdParams?: Record<string, string>;
  steamId?: string;
  username?: string;
  avatarUrl?: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface UpdateProfileRequest {
  themeColor?: string;
  username?: string;
}

export interface UpdateVisibilityRequest {
  isPublic: boolean;
}
