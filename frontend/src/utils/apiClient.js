// client/src/utils/apiClient.js
import axios from "axios";
import http, { apiBase } from "../api/http";
import { debugLog } from "./debugLogger";

const ACCESS_TOKEN_KEY = "auth:access_token";
const REFRESH_TOKEN_KEY = "auth:refresh_token";
const SESSION_TOKEN_KEY = "auth:session_token";

const isBrowser = typeof window !== "undefined";

const storage = {
  get(key) {
    if (!isBrowser) return null;
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    if (!isBrowser) return;
    try {
      if (value === null || value === undefined) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // ignore quota errors
    }
  },
};

export const parseError = (error, fallbackMessage) => {
  if (error.code === "ERR_BLOCKED_BY_CLIENT") {
    return new Error(
      "Request blocked by browser. Please disable ad blocker or try incognito mode.",
    );
  }
  if (error.response) {
    const err = new Error(error.response.data?.msg || fallbackMessage);
    err.status = error.response.status;
    err.data = error.response.data;
    return err;
  }
  return new Error(error.message || fallbackMessage);
};

const refreshClient = axios.create({
  baseURL: apiBase,
  withCredentials: true,
});

const applyAccessTokenHeader = (token) => {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete http.defaults.headers.common.Authorization;
  }
};

const applySessionTokenHeader = (token) => {
  if (token) {
    http.defaults.headers.common["X-Session-Token"] = token;
  } else {
    delete http.defaults.headers.common["X-Session-Token"];
  }
};

const applyRefreshTokenHeader = (token) => {
  if (token) {
    refreshClient.defaults.headers.common["X-Refresh-Token"] = token;
  } else {
    delete refreshClient.defaults.headers.common["X-Refresh-Token"];
  }
};

export const getStoredAuthTokens = () => ({
  accessToken: storage.get(ACCESS_TOKEN_KEY),
  refreshToken: storage.get(REFRESH_TOKEN_KEY),
  sessionToken: storage.get(SESSION_TOKEN_KEY),
});

export const persistAuthTokens = ({
  accessToken,
  refreshToken,
  sessionToken,
} = {}) => {
  if (accessToken !== undefined) {
    storage.set(ACCESS_TOKEN_KEY, accessToken ?? null);
    applyAccessTokenHeader(accessToken);
  }
  if (sessionToken !== undefined) {
    storage.set(SESSION_TOKEN_KEY, sessionToken ?? null);
    applySessionTokenHeader(sessionToken);
  }
  if (refreshToken !== undefined) {
    storage.set(REFRESH_TOKEN_KEY, refreshToken ?? null);
    applyRefreshTokenHeader(refreshToken);
  }
};

export const clearAuthTokens = () => {
  persistAuthTokens({
    accessToken: null,
    refreshToken: null,
    sessionToken: null,
  });
};

// Initialize headers from storage on load
const initialTokens = getStoredAuthTokens();
applyAccessTokenHeader(initialTokens.accessToken);
applySessionTokenHeader(initialTokens.sessionToken);
applyRefreshTokenHeader(initialTokens.refreshToken);

let isRefreshing = false;
const refreshQueue = [];

const enqueueRefresh = (callback) => {
  refreshQueue.push(callback);
};

const resolveRefreshQueue = (error) => {
  while (refreshQueue.length > 0) {
    const queued = refreshQueue.shift();
    queued(error);
  }
};

const shouldSkipRefresh = (config) => {
  if (!config?.url) return true;
  const url = config.url;
  const skipEndpoints = [
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ];
  return skipEndpoints.some((endpoint) => url.includes(endpoint));
};

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error || {};
    const status = response?.status;
    const originalRequest = config;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh(originalRequest)
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          enqueueRefresh((queueError) => {
            if (queueError) {
              reject(queueError);
            } else {
              resolve(http(originalRequest));
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await refreshClient.post("/auth/refresh");
        persistAuthTokens({
          accessToken: refreshResponse?.data?.access_token,
          refreshToken: refreshResponse?.data?.refresh_token,
        });
        isRefreshing = false;
        resolveRefreshQueue(null);
        return http(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        clearAuthTokens();
        resolveRefreshQueue(refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

if (import.meta.env.DEV) {
  http.interceptors.request.use((config) => {
    debugLog("api:request", {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      params: config.params,
      data: config.data,
    });
    return config;
  });

  http.interceptors.response.use(
    (response) => {
      debugLog("api:response", {
        method: response.config?.method,
        url: response.config?.url,
        status: response.status,
        statusText: response.statusText,
      });
      return response;
    },
    (error) => {
      // Don't log 401 errors to console (expected for unauthenticated users)
      if (error.response?.status !== 401) {
        debugLog("api:error", {
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
      }
      return Promise.reject(error);
    },
  );
}

export default http;
