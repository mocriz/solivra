import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import StreakTimer from "../components/StreakTimer";
import RelapseCalendar from "../components/RelapseCalendar";
import Rankings from "../components/Rankings";
import ApiHealthCheck from "../components/ApiHealthCheck";
import { getUserRelapses } from "../api/relapses";
import { useTranslation } from "react-i18next";
import { debugLog } from "../utils/debugLogger";
import {
  IoCalendar,
  IoTrendingUp,
  IoTime,
  IoStatsChart,
  IoTrophy,
  IoSparkles,
  IoHeart,
  IoFlame,
  IoRocket,
  IoStar,
} from "react-icons/io5";

const RELAPSE_CACHE_PREFIX = "stats_relapses_cache_v1";
const RELAPSE_CACHE_TTL = 5 * 60 * 1000;

const getRelapseCacheKey = (userData) => {
  if (!userData) return null;
  const identifier =
    userData._id || userData.id || userData.username || userData.email;
  if (!identifier) return null;
  return `${RELAPSE_CACHE_PREFIX}_${identifier}`;
};

const readRelapseCache = (cacheKey) => {
  if (typeof window === "undefined" || !cacheKey) return null;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed.data) ||
      typeof parsed.timestamp !== "number" ||
      parsed.timestamp <= 0
    ) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const writeRelapseCache = (cacheKey, data) => {
  if (typeof window === "undefined" || !cacheKey) return;
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {
    // Swallow quota errors quietly
  }
};

const calculateAdditionalStats = (relapseData) => {
  const now = new Date();
  const validRelapses = Array.isArray(relapseData) ? relapseData : [];

  const thisMonth = validRelapses.filter((r) => {
    const relapseDate = new Date(r.relapse_time);
    return (
      relapseDate.getMonth() === now.getMonth() &&
      relapseDate.getFullYear() === now.getFullYear()
    );
  });

  const thisWeek = validRelapses.filter((r) => {
    const relapseDate = new Date(r.relapse_time);
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - now.getDay());
    return relapseDate >= weekStart;
  });

  let averageStreak = 0;
  if (validRelapses.length > 1) {
    const streaks = [];
    for (let i = 1; i < validRelapses.length; i++) {
      const prevRelapse = new Date(validRelapses[i].relapse_time);
      const currentRelapse = new Date(validRelapses[i - 1].relapse_time);
      const streakDuration = Math.floor((currentRelapse - prevRelapse) / 1000);
      if (streakDuration > 0) {
        streaks.push(streakDuration);
      }
    }
    if (streaks.length > 0) {
      averageStreak = streaks.reduce((a, b) => a + b, 0) / streaks.length;
    }
  }

  return {
    totalRelapses: validRelapses.length,
    thisMonthRelapses: thisMonth.length,
    thisWeekRelapses: thisWeek.length,
    averageStreak,
  };
};

const createEmptyAdditionalStats = () => ({
  totalRelapses: 0,
  thisMonthRelapses: 0,
  thisWeekRelapses: 0,
  averageStreak: 0,
});

const StatsPage = () => {
  const { stats, userData } = useContext(AuthContext);
  const { t } = useTranslation();
  const [relapses, setRelapses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [additionalStats, setAdditionalStats] = useState(
    createEmptyAdditionalStats(),
  );
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const cacheKeyRef = useRef(null);

  const formatStreak = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return t("stats.zeroDuration");
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let parts = [];
    if (days > 0) parts.push(t("stats.days", { count: days }));
    if (hours > 0) parts.push(t("stats.hours", { count: hours }));
    if (minutes > 0 || hours > 0 || days > 0)
      parts.push(t("stats.minutes", { count: minutes }));
    if (parts.length === 0) return t("stats.zeroDuration");
    return parts.join(" ");
  };

  useEffect(() => {
    const cacheKey = getRelapseCacheKey(userData);
    cacheKeyRef.current = cacheKey;

    if (!cacheKey) {
      debugLog("stats:cache_unavailable", { reason: "missing_cache_key" });
      setRelapses([]);
      setAdditionalStats(createEmptyAdditionalStats());
      setLoading(Boolean(stats));
      return;
    }

    const cached = readRelapseCache(cacheKey);
    debugLog("stats:cache_loaded", {
      cacheKey,
      hasCached: Boolean(cached),
      cachedCount: Array.isArray(cached?.data) ? cached.data.length : 0,
      cacheAgeMs: cached ? Date.now() - cached.timestamp : null,
    });
    if (cached) {
      setRelapses(cached.data);
      setAdditionalStats(calculateAdditionalStats(cached.data));
      if (Date.now() - cached.timestamp <= RELAPSE_CACHE_TTL) {
        setLoading(false);
      }
    } else {
      setRelapses([]);
      setAdditionalStats(createEmptyAdditionalStats());
    }
  }, [userData, stats]);

  useEffect(() => {
    if (!userData || !stats) {
      return;
    }

    const cacheKey = cacheKeyRef.current || getRelapseCacheKey(userData);
    cacheKeyRef.current = cacheKey;
    const cached = readRelapseCache(cacheKey);
    const hasCache = Boolean(cached?.data);
    const cacheFresh =
      hasCache && Date.now() - cached.timestamp <= RELAPSE_CACHE_TTL;

    debugLog("stats:fetch_relapses_effect", {
      streakStarted: stats.streakStarted,
      cacheKey,
      hasCache,
      cacheFresh,
    });

    if (stats.streakStarted === false) {
      debugLog("stats:streak_not_started");
      setRelapses([]);
      setAdditionalStats(createEmptyAdditionalStats());
      if (!cacheFresh) {
        writeRelapseCache(cacheKey, []);
      }
      setLoading(false);
      return;
    }

    let cancelled = false;

    if (cacheFresh) {
      setLoading(false);
      return;
    }

    if (!hasCache) {
      setLoading(true);
    }

    const fetchRelapseData = async () => {
      try {
        debugLog("stats:fetch_relapses_begin", {
          cacheKey,
          hasCache,
          cacheFresh,
        });
        const relapseData = await getUserRelapses();
        if (cancelled) return;

        const safeData = Array.isArray(relapseData) ? relapseData : [];
        setRelapses(safeData);
        setAdditionalStats(calculateAdditionalStats(safeData));
        writeRelapseCache(cacheKey, safeData);
        debugLog("stats:fetch_relapses_success", {
          count: safeData.length,
        });
      } catch (error) {
        console.error("Failed to fetch relapse data:", error);
        debugLog("stats:fetch_relapses_error", {
          message: error?.message,
          status: error?.status,
        });
        if (!hasCache && !cancelled) {
          setRelapses([]);
          setAdditionalStats(createEmptyAdditionalStats());
        }
      } finally {
        if (!hasCache && !cancelled) {
          setLoading(false);
        }
        debugLog("stats:fetch_relapses_complete", { cancelled });
      }
    };

    fetchRelapseData();

    return () => {
      cancelled = true;
    };
  }, [stats, userData]);

  // Dynamic motivational messages based on streak progress
  const getMotivationalMessage = () => {
    if (!stats || !stats.streakStarted) {
      return {
        icon: <IoRocket className="w-5 h-5 text-primary" />,
        title: t("stats.motivation.notStarted.title"),
        message: t("stats.motivation.notStarted.message"),
        color: "bg-primary/10 border-primary/20 text-primary",
      };
    }

    const days = Math.floor(stats.currentStreak / 86400);
    const hours = Math.floor((stats.currentStreak % 86400) / 3600);

    // First day motivation
    if (days === 0 && hours < 24) {
      return {
        icon: <IoStar className="w-5 h-5 text-yellow-500" />,
        title: t("stats.motivation.firstDay.title"),
        message: t("stats.motivation.firstDay.message"),
        color: "bg-yellow-500/10 border-yellow-500/20 text-yellow-600",
      };
    }

    // First week
    if (days >= 1 && days < 7) {
      return {
        icon: <IoSparkles className="w-5 h-5 text-blue-500" />,
        title: t("stats.motivation.firstWeek.title", { days }),
        message: t("stats.motivation.firstWeek.message"),
        color: "bg-blue-500/10 border-blue-500/20 text-blue-600",
      };
    }

    // First month
    if (days >= 7 && days < 30) {
      return {
        icon: <IoFlame className="w-5 h-5 text-orange-500" />,
        title: t("stats.motivation.buildingStreak.title", { days }),
        message: t("stats.motivation.buildingStreak.message"),
        color: "bg-orange-500/10 border-orange-500/20 text-orange-600",
      };
    }

    // One month milestone
    if (days >= 30 && days < 90) {
      return {
        icon: <IoTrophy className="w-5 h-5 text-purple-500" />,
        title: t("stats.motivation.milestone.title", { days }),
        message: t("stats.motivation.milestone.message"),
        color: "bg-purple-500/10 border-purple-500/20 text-purple-600",
      };
    }

    // Long streak (90+ days)
    if (days >= 90) {
      return {
        icon: <IoHeart className="w-5 h-5 text-pink-500" />,
        title: t("stats.motivation.champion.title", { days }),
        message: t("stats.motivation.champion.message"),
        color: "bg-pink-500/10 border-pink-500/20 text-pink-600",
      };
    }

    // Default fallback
    return {
      icon: <IoSparkles className="w-5 h-5 text-primary" />,
      title: t("stats.motivation.default.title"),
      message: t("stats.motivation.default.message"),
      color: "bg-primary/10 border-primary/20 text-primary",
    };
  };

  const motivationData = getMotivationalMessage();

  if (!stats) {
    return <StatsSkeleton />;
  }

  if (loading && stats.streakStarted !== false) {
    return <StatsSkeleton />;
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IoStatsChart className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold text-text-primary">
            {t("stats.title")}
          </h2>
        </div>
        {/* Debug button - only show in development */}
        {import.meta.env.DEV && (
          <button
            onClick={() => setIsHealthCheckOpen(true)}
            className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 rounded-lg transition-colors text-sm font-medium"
            title="Debug API Connection"
          >
            Debug API
          </button>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-surface rounded-2xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <IoTime className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase text-text-secondary">
              {t("stats.currentStreak")}
            </p>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            <StreakTimer
              initialSeconds={stats.currentStreak || 0}
              syncedAt={stats.syncedAt}
              isRunning={stats.streakStarted !== false}
            />
          </p>
        </div>
        <div className="p-5 bg-surface rounded-2xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <IoTrendingUp className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase text-text-secondary">
              {t("stats.longestStreak")}
            </p>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {formatStreak(stats.longestStreak)}
          </p>
        </div>
        <div className="p-5 bg-surface rounded-2xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <IoStatsChart className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase text-text-secondary">
              {t("stats.averageStreak")}
            </p>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {additionalStats.averageStreak > 0
              ? formatStreak(additionalStats.averageStreak)
              : t("stats.noData")}
          </p>
        </div>
        <div className="p-5 bg-surface rounded-2xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <IoCalendar className="w-5 h-5 text-primary" />
            <p className="text-sm uppercase text-text-secondary">
              {t("stats.totalRelapses")}
            </p>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {additionalStats.totalRelapses || 0}
          </p>
        </div>
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-text-primary mb-4">
            {t("stats.periodStats")}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">{t("stats.thisWeek")}</span>
              <span className="font-bold text-text-primary">
                {additionalStats.thisWeekRelapses || 0} {t("stats.relapses")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">
                {t("stats.thisMonth")}
              </span>
              <span className="font-bold text-text-primary">
                {additionalStats.thisMonthRelapses || 0} {t("stats.relapses")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">{t("stats.allTime")}</span>
              <span className="font-bold text-text-primary">
                {additionalStats.totalRelapses || 0} {t("stats.relapses")}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-text-primary">
              {t("stats.motivationTitle")}
            </h3>
            <button
              onClick={() => setIsRankingsOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium cursor-pointer"
            >
              <IoTrophy className="w-4 h-4" />
              {t("stats.viewRankings")}
            </button>
          </div>
          <div className="space-y-4">
            {/* Dynamic Motivational Message */}
            <div className={`p-4 rounded-lg border ${motivationData.color}`}>
              <div className="flex items-start gap-3">
                {motivationData.icon}
                <div>
                  <h4 className="font-semibold mb-1">{motivationData.title}</h4>
                  <p className="text-sm opacity-90">{motivationData.message}</p>
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            {additionalStats.totalRelapses > 0 && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="font-semibold text-text-primary">
                    {additionalStats.thisWeekRelapses || 0}
                  </div>
                  <div className="text-text-secondary">
                    {t("stats.thisWeekRelapses")}
                  </div>
                </div>
                <div className="text-center p-3 bg-secondary rounded-lg">
                  <div className="font-semibold text-text-primary">
                    {additionalStats.thisMonthRelapses || 0}
                  </div>
                  <div className="text-text-secondary">
                    {t("stats.thisMonthRelapses")}
                  </div>
                </div>
              </div>
            )}

            {/* Quote */}
            <div className="text-center">
              <p className="text-sm text-text-secondary italic">
                "{t("stats.quote")}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Relapse Calendar */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <IoCalendar className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-text-primary">
            {t("stats.relapseCalendar")}
          </h2>
        </div>
        <RelapseCalendar relapses={relapses || []} />
      </div>

      {/* Rankings Modal */}
      <Rankings
        isOpen={isRankingsOpen}
        onClose={() => setIsRankingsOpen(false)}
      />

      {/* API Health Check Modal */}
      <ApiHealthCheck
        isOpen={isHealthCheckOpen}
        onClose={() => setIsHealthCheckOpen(false)}
      />
    </div>
  );
};

const StatsSkeleton = () => (
  <div className="container mx-auto max-w-6xl p-6 space-y-8 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-secondary" />
        <div className="h-8 w-40 rounded bg-secondary" />
      </div>
      <div className="hidden sm:block h-9 w-28 rounded bg-secondary" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="p-5 bg-surface rounded-2xl space-y-4">
          <div className="h-4 w-24 rounded bg-secondary/80" />
          <div className="h-8 w-32 rounded bg-secondary/60" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="bg-surface rounded-2xl p-6 space-y-4">
          <div className="h-6 w-48 rounded bg-secondary/80" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((__, innerIndex) => (
              <div
                key={innerIndex}
                className="flex items-center justify-between"
              >
                <div className="h-4 w-24 rounded bg-secondary/60" />
                <div className="h-4 w-16 rounded bg-secondary/40" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="space-y-4">
      <div className="h-8 w-56 rounded bg-secondary/80" />
      <div className="h-64 rounded-2xl bg-surface" />
    </div>
  </div>
);

export default StatsPage;
