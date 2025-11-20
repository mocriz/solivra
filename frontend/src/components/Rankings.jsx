// client/src/components/Rankings.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getRankings } from "../api/stats";
import {
  IoTrophy,
  IoMedal,
  IoRibbon,
  IoStatsChart,
  IoRefresh,
} from "react-icons/io5";

const MIN_VALID_STREAK = 1;

const Rankings = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      const data = await getRankings();
      const rankingsData = Array.isArray(data?.rankings) ? data.rankings : [];
      const sanitized = rankingsData.filter(
        (entry) =>
          entry &&
          typeof entry.username === "string" &&
          (entry.current_streak || 0) >= MIN_VALID_STREAK
      );

      const hasCurrentUser = sanitized.some((entry) => entry.is_current_user);

      setRankings(sanitized);
      setCurrentUserRank(
        hasCurrentUser && typeof data?.current_user_rank === "number"
          ? data.current_user_rank
          : null
      );
      setTotalUsers(data?.total_users || sanitized.length);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch rankings:", error);
      if (error?.status === 401) {
        setError("rankings.unauthorized");
      } else {
        setError("rankings.error");
      }
      setRankings([]);
      setCurrentUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRankings();
    }
  }, [isOpen]);

  const formatStreak = (totalSeconds) => {
    if (
      totalSeconds === null ||
      totalSeconds === undefined ||
      Number.isNaN(Number(totalSeconds)) ||
      totalSeconds <= 0
    ) {
      return t("rankings.noStreak");
    }

    const safeSeconds = Number(totalSeconds);
    const days = Math.floor(safeSeconds / 86400);
    const hours = Math.floor((safeSeconds % 86400) / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <IoTrophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <IoMedal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <IoRibbon className="w-5 h-5 text-orange-500" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-text-secondary">
            #{rank}
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 sm:items-center">
      <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-bg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary sm:text-lg">
                {t("rankings.title")}
              </h2>
              <p className="text-[11px] text-text-secondary sm:text-xs">
                {t("rankings.subtitle", { total: totalUsers })}
              </p>
            </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRankings}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/60 text-text-secondary transition hover:bg-secondary disabled:opacity-50"
              title={t("common.refresh")}
            >
              <IoRefresh
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary/60 text-text-secondary transition hover:bg-secondary"
            >
              <span className="text-lg">&times;</span>
            </button>
          </div>
        </div>

        {/* Current User Snapshot */}
        {currentUserRank && (
          <div className="border-b border-border px-5 py-4 ">
            <div className="flex justify-between gap-3 rounded-2xl bg-primary/10 p-4 max-[765px]:flex-col">
              <div className="flex gap-3 flex-row items-center justify-center">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 text-text-primary">
                    {/* {getRankIcon(currentUserRank)} */}
                    <span className="font-semibold">
                      {t("rankings.yourRank")}
                    </span>
                  </span>
                </div>
                <span className="text-xs text-text-secondary">
                  {currentUserRank} {t("rankings.outOf", { total: totalUsers })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-scroll py-4">
          <div className="flex-1 overflow-scroll px-5 py-4 min-w-[600px]">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-text-secondary">
                  <IoRefresh className="h-6 w-6 animate-spin" />
                  <span className="text-sm">{t("rankings.loading")}</span>
                </div>
              </div>
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-text-secondary">
                <IoStatsChart className="h-10 w-10 text-danger/70" />
                <p>{t(error)}</p>
              </div>
            ) : rankings.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-text-secondary">
                <IoStatsChart className="h-10 w-10 opacity-40" />
                <p className="text-sm">{t("rankings.empty")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankings.map((user) => (
                  <div
                    key={user.user_id || `${user.username}-${user.rank}`}
                    className={`rounded-2xl border p-4 transition ${
                      user.is_current_user
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-secondary/40 hover:bg-secondary/60"
                    }`}
                  >
                    <article className="flex justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary/70">
                          {getRankIcon(user.rank)}
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-text-secondary sm:text-sm">
                            @{user.username}
                          </span>
                        </div>

                        {user.is_current_user && (
                          <span className="rounded-full bg-primary/15 px-2 py-1 text-[11px] font-medium text-primary">
                            {t("rankings.you")}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 w-2/4 justify-end">
                        <div className="flex gap-2">
                          <SnapshotPill
                            label={t("rankings.current")}
                            value={formatStreak(user.current_streak)}
                          />
                          <SnapshotPill
                            label={t("rankings.longest")}
                            value={formatStreak(user.longest_streak)}
                            flex={"flex-col"}
                            gap={"gap-0"}
                          />
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-secondary/60 px-5 py-3 text-xs text-text-secondary">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <LegendItem
              icon={<IoTrophy className="h-4 w-4 text-yellow-500" />}
              label={t("rankings.legend.first")}
            />
            <LegendItem
              icon={<IoMedal className="h-4 w-4 text-gray-400" />}
              label={t("rankings.legend.second")}
            />
            <LegendItem
              icon={<IoRibbon className="h-4 w-4 text-orange-500" />}
              label={t("rankings.legend.third")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rankings;

const StatBadge = ({ icon, label, value }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 px-3 py-2 sm:flex-col sm:items-end sm:justify-start sm:text-right">
    <span className="flex items-center gap-2 text-text-secondary sm:justify-end">
      {icon}
      <span>{label}</span>
    </span>
    <span className="font-semibold text-text-primary">{value}</span>
  </div>
);

const SnapshotPill = ({ icon, label, value, flex, gap }) => (
  <div className={`w-full`}>
    <div
      className={`flex items-center justify-center flex-col rounded-xl bg-primary/15 px-3 py-2 text-xs text-primary sm:text-sm w-full ${flex} ${
        gap || `gap-0`
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  </div>
);

const LegendItem = ({ icon, label }) => (
  <span className="flex items-center gap-2">
    {icon}
    <span>{label}</span>
  </span>
);
