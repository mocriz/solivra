/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { loginUser, logoutUser } from "../api/auth";
import { getUserData } from "../api/users";
import { getStats } from "../api/stats";
import { apiBase } from "../api/http";
import i18n from "../i18n";
import {
  debugLog,
  getActiveDebugUser,
  setDebugUser,
} from "../utils/debugLogger";
import { clearAuthTokens, persistAuthTokens } from "../utils/apiClient";

export const AuthContext = createContext(null);

const PROFILE_PICTURE_CACHE_PREFIX = "profile_picture_cache_";

const getProfileCacheKey = (user) => {
  if (!user) return null;
  const identifier = user._id || user.id || user.username;
  if (!identifier) return null;
  return `${PROFILE_PICTURE_CACHE_PREFIX}${identifier}`;
};

const readCachedProfilePicture = (cacheKey, url) => {
  if (typeof window === "undefined" || !cacheKey || !url) return null;
  try {
    const stored = localStorage.getItem(cacheKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.url === url && typeof parsed.dataUrl === "string") {
      return parsed.dataUrl;
    }
    localStorage.removeItem(cacheKey);
  } catch {
    localStorage.removeItem(cacheKey);
  }
  return null;
};

const writeCachedProfilePicture = (cacheKey, url, dataUrl) => {
  if (typeof window === "undefined" || !cacheKey) return;
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ url, dataUrl, timestamp: Date.now() }),
    );
  } catch {
    // Ignore quota errors
  }
};

const removeCachedProfilePicture = (cacheKey) => {
  if (typeof window === "undefined" || !cacheKey) return;
  localStorage.removeItem(cacheKey);
};

const resolveProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return null;

  if (profilePicture.startsWith("data:") || profilePicture.startsWith("http")) {
    return profilePicture;
  }

  if (profilePicture.includes("default.png")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/default.png`;
    }
    return "/default.png";
  }

  const baseUrl = apiBase;
  if (!baseUrl) return profilePicture;
  try {
    return new URL(profilePicture, baseUrl).href;
  } catch {
    return profilePicture;
  }
};

const fetchProfilePictureDataUrl = async (profilePicture) => {
  if (typeof window === "undefined") return null;
  const resolvedUrl = resolveProfilePictureUrl(profilePicture);
  if (!resolvedUrl || resolvedUrl.startsWith("data:")) {
    return null;
  }

  try {
    const resolvedOrigin = (() => {
      try {
        return new URL(resolvedUrl).origin;
      } catch {
        return null;
      }
    })();

    const localOrigin =
      typeof window !== "undefined" ? window.location.origin : null;
    const apiOrigin = (() => {
      if (!apiBase) return null;
      try {
        return new URL(apiBase).origin;
      } catch {
        return null;
      }
    })();

    const shouldIncludeCredentials =
      resolvedOrigin &&
      (resolvedOrigin === localOrigin || resolvedOrigin === apiOrigin);

    const response = await fetch(resolvedUrl, {
      credentials: shouldIncludeCredentials ? "include" : "omit",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch profile picture: ${response.status}`);
    }

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error("Failed to read profile picture data"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Profile picture caching skipped:", error);
    }
    return null;
  }
};

const cacheProfilePicture = async (cacheKey, profilePicture) => {
  if (
    typeof window === "undefined" ||
    !cacheKey ||
    !profilePicture ||
    profilePicture.startsWith("data:")
  ) {
    return null;
  }

  if (profilePicture.includes("default.png")) {
    return null;
  }

  const dataUrl = await fetchProfilePictureDataUrl(profilePicture);
  if (dataUrl) {
    writeCachedProfilePicture(cacheKey, profilePicture, dataUrl);
    return dataUrl;
  }

  removeCachedProfilePicture(cacheKey);
  return null;
};

export const AuthProvider = ({ children }) => {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const profileCacheKeyRef = useRef(null);
  const hasFetchedRef = useRef(false);

  const clearCachedProfilePicture = useCallback(() => {
    if (typeof window === "undefined") return;
    if (profileCacheKeyRef.current) {
      localStorage.removeItem(profileCacheKeyRef.current);
      profileCacheKeyRef.current = null;
    }
  }, []);

  const fetchAuthData = useCallback(
    async ({ silent = false } = {}) => {
      debugLog("auth:fetch_start", { silent });
      if (!silent) {
        setIsLoading(true);
      }

      try {
        const user = await getUserData();
        const userKey = user?._id || user?.id || user?.username || "anonymous";
        setDebugUser(userKey, {
          username: user?.username,
          role: user?.role,
          language_pref: user?.language_pref,
        });
        debugLog("auth:user_fetch_success", {
          userId: user?._id,
          username: user?.username,
          role: user?.role,
          streak_start_date: user?.streak_start_date,
        });
        const cacheKey = getProfileCacheKey(user);
        profileCacheKeyRef.current = cacheKey;

        let userForState = user;
        let picturePromise = null;

        if (cacheKey) {
          if (!user.profile_picture) {
            removeCachedProfilePicture(cacheKey);
          } else {
            const cachedDataUrl = readCachedProfilePicture(
              cacheKey,
              user.profile_picture,
            );
            if (cachedDataUrl) {
              userForState = {
                ...user,
                profile_picture: cachedDataUrl,
              };
            } else if (!user.profile_picture.startsWith("data:")) {
              picturePromise = cacheProfilePicture(
                cacheKey,
                user.profile_picture,
              );
            }
          }
        } else {
          clearCachedProfilePicture();
        }

        setUserData(userForState);

        if (user?.language_pref) {
          const lang = user.language_pref;
          if (typeof window !== "undefined") {
            localStorage.setItem("language", lang);
          }
          i18n.changeLanguage(lang);
        }

        if (picturePromise) {
          picturePromise
            .then((dataUrl) => {
              if (!dataUrl) return;
              if (profileCacheKeyRef.current !== cacheKey) return;
              setUserData((previous) => {
                if (!previous) return previous;
                if (previous.profile_picture === dataUrl) return previous;
                return { ...previous, profile_picture: dataUrl };
              });
            })
            .catch(() => {});
        }

        try {
          const statsResponse = await getStats();
          debugLog("auth:stats_fetch_success", {
            currentStreak: statsResponse?.currentStreak,
            longestStreak: statsResponse?.longestStreak,
            streakStarted: statsResponse?.streakStarted,
          });
          setStats({
            ...statsResponse,
            syncedAt: Date.now(),
          });
        } catch (statsError) {
          debugLog("auth:stats_fetch_error", {
            status: statsError?.status,
            message: statsError?.message,
          });
          if (statsError.status === 401) {
            clearCachedProfilePicture();
            clearAuthTokens();
            setUserData(null);
            setStats(null);
          } else {
            console.error("Gagal memuat statistik:", statsError);
            setStats(null);
          }
        }
      } catch (userError) {
        debugLog("auth:user_fetch_error", {
          status: userError?.status,
          message: userError?.message,
        });
        if (userError.status === 401) {
          // Silent 401 - user not authenticated, don't log error
          clearAuthTokens();
          clearCachedProfilePicture();
          setUserData(null);
          setStats(null);
        } else {
          console.error("Auth error:", userError);
          clearAuthTokens();
          clearCachedProfilePicture();
          setUserData(null);
          setStats(null);
        }
      } finally {
        debugLog("auth:fetch_complete", { silent });
        setIsLoading(false);
      }
    },
    [clearCachedProfilePicture],
  );

  useEffect(() => {
    // Only fetch auth data once on mount to check for existing session
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAuthData({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async ({ username, password, rememberMe }) => {
      debugLog("auth:login_attempt", {
        username,
        rememberMe: Boolean(rememberMe),
      });
      try {
        const response = await loginUser({ username, password, rememberMe });
        if (!response.ok) {
          debugLog("auth:login_failed_response", {
            username,
            message: response.msg,
          });
          return {
            ok: false,
            msg: response.msg || i18n.t("login.errorGeneric"),
          };
        }
        persistAuthTokens({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          sessionToken: response.session_token,
        });
        // After successful login, fetch auth data
        await fetchAuthData({ silent: false });
        debugLog("auth:login_success", {
          username,
          userId: response.user?.id || response.user?._id,
        });
        return { ok: true, user: response.user };
      } catch (error) {
        const message = error.message || i18n.t("login.errorGeneric");
        debugLog("auth:login_error", {
          username,
          message,
          status: error?.status,
          lockout: error?.data?.lockout,
        });
        clearAuthTokens();
        return {
          ok: false,
          msg: message,
          lockout: error.data?.lockout,
          attemptsRemaining: error.data?.attemptsRemaining,
        };
      }
    },
    [fetchAuthData],
  );

  const logout = useCallback(async () => {
    const previousKey = getActiveDebugUser();
    debugLog("auth:logout_request", { previousKey });
    try {
      await logoutUser(); // This will clear tokens
    } catch (error) {
      console.error("Logout error:", error);
      debugLog("auth:logout_error", { message: error?.message });
    } finally {
      clearAuthTokens();
      clearCachedProfilePicture();
      setUserData(null);
      setStats(null);
      setDebugUser("anonymous", { previousUserKey: previousKey });
      debugLog("auth:logout_state_reset", { previousKey });
      if (typeof window !== "undefined") {
        const fallbackLang = localStorage.getItem("language") || "id";
        i18n.changeLanguage(fallbackLang);
      } else {
        i18n.changeLanguage("id");
      }
    }
  }, [clearCachedProfilePicture]);

  const refreshData = useCallback(
    () => fetchAuthData({ silent: true }),
    [fetchAuthData],
  );

  const value = useMemo(
    () => ({
      userData,
      stats,
      isLoading,
      isAuthenticated: Boolean(userData),
      login,
      logout,
      refreshData,
    }),
    [userData, stats, isLoading, login, logout, refreshData],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
