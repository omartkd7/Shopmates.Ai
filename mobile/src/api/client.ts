import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/api";
import { clearTokens, getTokens, saveTokens } from "../auth/tokenStorage";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Callback to notify auth store when a clean logout is needed
let onAuthFailedCallback: (() => void) | null = null;
let onTokensUpdatedCallback:
  | ((tokens: { accessToken: string; refreshToken: string }) => void)
  | null = null;

export function setAuthCallbacks(callbacks: {
  onAuthFailed: () => void;
  onTokensUpdated: (tokens: { accessToken: string; refreshToken: string }) => void;
}) {
  onAuthFailedCallback = callbacks.onAuthFailed;
  onTokensUpdatedCallback = callbacks.onTokensUpdated;
}

// Request Interceptor: Attach access token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken } = await getTokens();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Active refresh promise to deduplicate concurrent refresh calls
let refreshPromise: Promise<string> | null = null;

// Response Interceptor: Handle 401, refresh token once, retry or log out
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If no response or status is not 401, reject immediately
    if (!error.response || error.response.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Do not retry refresh or login endpoints to prevent infinite loops
    const requestUrl = originalRequest.url || "";
    if (
      requestUrl.includes("/api/auth/refresh") ||
      requestUrl.includes("/api/auth/login") ||
      originalRequest._retry
    ) {
      await clearTokens();
      if (onAuthFailedCallback) {
        onAuthFailedCallback();
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const { refreshToken } = await getTokens();

          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          // Call refresh endpoint with raw axios to bypass interceptor
          const refreshResponse = await axios.post<{
            accessToken: string;
            refreshToken: string;
          }>(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            refreshResponse.data;

          // Persist newly rotated tokens
          await saveTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          if (onTokensUpdatedCallback) {
            onTokensUpdatedCallback({
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
            });
          }

          return newAccessToken;
        })().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      // Update failed request's Authorization header and retry
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh failed or revoked: log out cleanly
      await clearTokens();
      if (onAuthFailedCallback) {
        onAuthFailedCallback();
      }
      return Promise.reject(refreshError);
    }
  }
);
