import { create } from "zustand";
import { apiClient, setAuthCallbacks } from "../api/client";
import { clearTokens, getTokens, saveTokens } from "../auth/tokenStorage";

export interface AuthUser {
  id: number;
  storeId: number;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  initializeAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Wire up the axios interceptor callbacks
  setAuthCallbacks({
    onAuthFailed: () => {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: "Session expired. Please log in again.",
      });
    },
    onTokensUpdated: ({ accessToken, refreshToken }) => {
      set({ accessToken, refreshToken });
    },
  });

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    clearError: () => set({ error: null }),

    setTokens: ({ accessToken, refreshToken }) => {
      set({ accessToken, refreshToken });
    },

    initializeAuth: async () => {
      set({ isLoading: true, error: null });
      try {
        const { accessToken, refreshToken } = await getTokens();

        if (!accessToken && !refreshToken) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        // Fetch user profile from /me endpoint
        const response = await apiClient.get<{
          user: {
            userId: number;
            storeId: number;
            role: "ADMIN" | "CUSTOMER";
            email: string;
          };
        }>("/api/auth/me");

        const userData = response.data.user;
        const currentTokens = await getTokens();

        set({
          user: {
            id: userData.userId,
            storeId: userData.storeId,
            name: userData.email.split("@")[0], // Fallback name
            email: userData.email,
            role: userData.role,
          },
          accessToken: currentTokens.accessToken ?? accessToken,
          refreshToken: currentTokens.refreshToken ?? refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        await clearTokens();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.post<{
          message: string;
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>("/api/auth/login", {
          email,
          password,
        });

        const { user, accessToken, refreshToken } = response.data;

        await saveTokens({ accessToken, refreshToken });

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return true;
      } catch (err: any) {
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Unable to connect to server";

        set({
          isLoading: false,
          error: message,
        });
        return false;
      }
    },

    register: async (name: string, email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await apiClient.post<{
          message: string;
          user: AuthUser;
          accessToken: string;
          refreshToken: string;
        }>("/api/auth/register", {
          name,
          email,
          password,
        });

        const { user, accessToken, refreshToken } = response.data;

        await saveTokens({ accessToken, refreshToken });

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return true;
      } catch (err: any) {
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Unable to register account";

        set({
          isLoading: false,
          error: message,
        });
        return false;
      }
    },

    logout: async () => {
      const { refreshToken } = get();

      // Fire-and-forget logout on server to invalidate token
      if (refreshToken) {
        try {
          await apiClient.post("/api/auth/logout", { refreshToken });
        } catch {
          // Ignore network errors on logout
        }
      }

      await clearTokens();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    },
  };
});
