// client/src/pages/AdminDashboardPage.jsx
import { useState, useEffect, useContext, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { getAdminDashboard, getAdminLogs } from "../api/admin";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { useTranslation } from "react-i18next";

const ACTION_COLOR_MAP = {
  auth_login_success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  auth_login_failed: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  auth_logout: "border-blue-500/30 bg-blue-500/10 text-blue-500",
  auth_register: "border-primary/30 bg-primary/10 text-primary",
  user_profile_update: "border-indigo-500/30 bg-indigo-500/10 text-indigo-500",
  user_password_change: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
  user_password_change_failed:
    "border-rose-500/30 bg-rose-500/10 text-rose-500",
  user_language_change: "border-purple-500/30 bg-purple-500/10 text-purple-500",
  user_profile_picture_removed:
    "border-amber-500/30 bg-amber-500/10 text-amber-500",
  user_account_deleted: "border-rose-500/30 bg-rose-500/10 text-rose-500",
  user_account_delete_failed:
    "border-rose-500/30 bg-rose-500/10 text-rose-500",
  user_session_revoked: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  user_streak_started: "border-primary/30 bg-primary/10 text-primary",
  relapse_recorded: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  relapse_updated: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  relapse_deleted: "border-sky-500/30 bg-sky-500/10 text-sky-500",
  all_relapses_deleted: "border-rose-500/30 bg-rose-500/10 text-rose-500",
  security_ip_lock: "border-amber-500/30 bg-amber-500/10 text-amber-500",
  security_registration_block:
    "border-amber-500/30 bg-amber-500/10 text-amber-500",
  page_view: "border-text-secondary/20 bg-secondary/60 text-text-secondary",
  api_call: "border-text-secondary/20 bg-secondary/60 text-text-secondary",
};

const DEFAULT_ACTION_LABEL_CLASS =
  "border-text-secondary/20 bg-secondary/60 text-text-secondary";

const sortLogsByTimestamp = (logs, sortOrder = "newest") => {
  if (!Array.isArray(logs)) return [];
  const multiplier = sortOrder === "oldest" ? 1 : -1;
  return [...logs].sort((a, b) => {
    const timeA = new Date(a?.timestamp || 0).getTime();
    const timeB = new Date(b?.timestamp || 0).getTime();
    return (timeA - timeB) * multiplier;
  });
};

const toTitleCase = (value) =>
  value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const PAGE_VIEW_ROUTE_LABELS = {
  "/": "admin.pageViews.landing",
  "/dashboard": "admin.pageViews.dashboard",
  "/history": "admin.pageViews.history",
  "/stats": "admin.pageViews.stats",
  "/profile": "admin.pageViews.profile",
  "/settings": "admin.pageViews.settings",
  "/settings/edit-profile": "admin.pageViews.settings_editProfile",
  "/settings/sessions": "admin.pageViews.settings_sessions",
  "/settings/delete-account": "admin.pageViews.settings_deleteAccount",
  "/guide": "admin.pageViews.guide",
  "/admin-panel": "admin.pageViews.adminPanel",
  "/login": "admin.pageViews.login",
  "/register": "admin.pageViews.register",
};

const formatPathForDisplay = (path) => {
  if (!path || path === "/") {
    return "Landing Page";
  }
  return path
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(" / ");
};

const AdminDashboardPage = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [logParams, setLogParams] = useState({
    search: "",
    sort: "newest",
    filter: "all",
    page: 1,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailsLog, setDetailsLog] = useState(null);
  const [isDetailsOpen, setDetailsOpen] = useState(false);

  const logsInitRef = useRef(true);

  const fetchLogs = useCallback(
    async (params) => {
      const effectiveParams = params || {
        search: "",
        sort: "newest",
        filter: "all",
        page: 1,
      };
      setLogsLoading(true);
      try {
        const data = await getAdminLogs(effectiveParams);
        const sorted = sortLogsByTimestamp(
          data?.logs || [],
          effectiveParams.sort,
        );
        setLogs(sorted);
        setTotalPages(data?.totalPages || 1);
      } catch {
        toast.error(t("admin.logsError"));
      } finally {
        setLogsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!isAuthenticated) {
      logsInitRef.current = true;
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadInitial = async () => {
      setLoading(true);
      try {
        const dashData = await getAdminDashboard();
        if (!cancelled) {
          setDashboardData(dashData);
          await fetchLogs({
            search: "",
            sort: "newest",
            filter: "all",
            page: 1,
          });
        }
      } catch {
        if (!cancelled) {
          toast.error(t("admin.dashboardError"));
        }
      } finally {
        if (!cancelled) {
          logsInitRef.current = false;
          setLoading(false);
        }
      }
    };

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [fetchLogs, isAuthenticated, t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (logsInitRef.current) {
      return;
    }
    fetchLogs({ ...logParams });
  }, [fetchLogs, isAuthenticated, logParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogParams((prev) => {
        if (prev.search === searchQuery && prev.page === 1) {
          return prev;
        }
        return { ...prev, search: searchQuery, page: 1 };
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSortChange = (e) => {
    const value = e.target.value;
    setLogParams((prev) => ({ ...prev, sort: value, page: 1 }));
  };

  const handleFilterChange = (e) => {
    const value = e.target.value;
    setLogParams((prev) => ({ ...prev, filter: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setLogParams((prev) => ({ ...prev, page: newPage }));
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const dashData = await getAdminDashboard();
      setDashboardData(dashData);
      await fetchLogs({ ...logParams });
    } catch {
      toast.error(t("admin.refreshError"));
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchLogs, logParams, t]);

  const openDetails = (log) => {
    setDetailsLog(log);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsLog(null);
  };

  const resolveUsername = useCallback(
    (log) => {
      if (!log) return t("common.guestUser");

      const candidates = [
        log.user?.username,
        log.user?.name,
        log.details?.user?.username,
        log.details?.user?.name,
        log.details?.actor?.username,
        log.details?.actor?.name,
        log.details?.username,
        log.metadata?.username,
        log.username,
      ];

      const validCandidate = candidates.find((value) => {
        if (typeof value !== "string") return false;
        const trimmed = value.trim();
        if (!trimmed) return false;
        return trimmed.toLowerCase() !== "guest";
      });

      if (typeof validCandidate === "string") {
        return validCandidate.trim();
      }

      if (
        typeof log.username === "string" &&
        log.username.trim().length > 0 &&
        log.username.trim().toLowerCase() !== "guest"
      ) {
        return log.username.trim();
      }

      if (
        typeof log.user?.username === "string" &&
        log.user.username.trim().length > 0 &&
        log.user.username.trim().toLowerCase() !== "guest"
      ) {
        return log.user.username.trim();
      }

      return t("common.guestUser");
    },
    [t],
  );

  const resolveDisplayName = useCallback(
    (log) => {
      if (!log) return null;
      const names = [
        log.user?.nickname,
        log.user?.displayName,
        log.user?.name,
        log.details?.user?.nickname,
        log.details?.user?.displayName,
        log.details?.user?.name,
      ];

      const nameCandidate = names.find(
        (value) => typeof value === "string" && value.trim().length > 0,
      );

      if (!nameCandidate) return null;

      const normalizedName = nameCandidate.trim();
      const username = resolveUsername(log);

      if (
        username &&
        normalizedName.toLowerCase() === username.toLowerCase()
      ) {
        return null;
      }

      return normalizedName;
    },
    [resolveUsername],
  );

  const resolvePageViewLabel = useCallback(
    (log) => {
      const rawPath =
        log?.details?.path ||
        log?.details?.page ||
        log?.metadata?.path ||
        log?.url ||
        log?.details?.url;

      const sanitizedPath =
        typeof rawPath === "string"
          ? rawPath.split("#")[0].split("?")[0] || "/"
          : "/";

      const normalizedPath =
        sanitizedPath !== "/" && sanitizedPath.endsWith("/")
          ? sanitizedPath.replace(/\/+$/, "") || "/"
          : sanitizedPath;

      const translationKey = PAGE_VIEW_ROUTE_LABELS[normalizedPath];
      if (translationKey) {
        const translated = t(translationKey, { defaultValue: "" }).trim();
        if (translated.length > 0) {
          return translated;
        }
      }

      const fallback =
        normalizedPath === "/"
          ? t("admin.pageViews.landing")
          : formatPathForDisplay(normalizedPath);
      return t("admin.pageViews.generic", { page: fallback });
    },
    [t],
  );

  const getActionMeta = useCallback(
    (log) => {
      const action = log?.action;
      if (!action) {
        return {
          label: t("admin.actions.unknown", { action: "—" }),
          className: DEFAULT_ACTION_LABEL_CLASS,
        };
      }

      if (action === "page_view") {
        const label = resolvePageViewLabel(log);
        const className =
          ACTION_COLOR_MAP[action] || DEFAULT_ACTION_LABEL_CLASS;
        return { label, className };
      }

      const translationKey = `admin.actions.${action}`;
      const translatedRaw = t(translationKey, { defaultValue: "" });
      const translated =
        translatedRaw && translatedRaw !== translationKey
          ? translatedRaw.trim()
          : "";
      const label =
        translated.length > 0 ? translated : toTitleCase(action || "");
      const className = ACTION_COLOR_MAP[action] || DEFAULT_ACTION_LABEL_CLASS;
      return { label, className };
    },
    [resolvePageViewLabel, t],
  );

  const relapseChartData = dashboardData?.patterns.relapse_by_hour.map(
    (count, hour) => ({
      name: `${hour.toString().padStart(2, "0")}:00`,
      relapses: count,
    }),
  );
  const langChartData = dashboardData?.engagement.language_distribution.map(
    (item) => ({
      name: (item.language_pref || "not_set").toUpperCase(),
      value: item.user_count,
    }),
  );
  const COLORS = [
    "#0A84FF",
    "#34C759",
    "#FF9500",
    "#FF3B30",
    "#AF52DE",
    "#5856D6",
  ];

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">{t("admin.title")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl">
          <p className="text-text-secondary">{t("admin.totalUsers")}</p>
          <p className="text-4xl font-bold mt-2">
            {dashboardData?.summary.total_users}
          </p>
        </div>
        <div className="bg-surface p-6 rounded-2xl">
          <p className="text-text-secondary">{t("admin.registrations24h")}</p>
          <p className="text-4xl font-bold mt-2">
            {dashboardData?.summary_24h.new_registrations}
          </p>
        </div>
        <div className="bg-surface p-6 rounded-2xl">
          <p className="text-text-secondary">{t("admin.relapses24h")}</p>
          <p className="text-4xl font-bold mt-2">
            {dashboardData?.summary_24h.total_relapses}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">
            {t("admin.relapseChartTitle")}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={relapseChartData}>
              <XAxis
                dataKey="name"
                stroke="var(--custom-text-secondary)"
                fontSize={12}
              />
              <YAxis stroke="var(--custom-text-secondary)" />
              <Tooltip
                contentStyle={{
                  background: "var(--custom-secondary)",
                  border: "none",
                }}
              />
              <Bar dataKey="relapses" fill="var(--custom-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-surface p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4">
            {t("admin.languageChartTitle")}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={langChartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {langChartData?.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--custom-surface)",
                  border: "1px solid var(--custom-border)",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-xl font-bold">{t("admin.logsTitle")}</h2>
          <Button onClick={handleRefresh} size="sm" disabled={isRefreshing}>
            {isRefreshing ? t("admin.refreshing") : t("common.refresh")}
          </Button>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex gap-4 mb-4 flex-wrap"
        >
          <input
            type="text"
            placeholder={t("admin.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow min-w-[180px] px-4 py-2 bg-secondary rounded-lg"
          />
          <select
            value={logParams.filter}
            onChange={handleFilterChange}
            className="px-4 py-2 bg-secondary rounded-lg"
          >
            <option value="all">{t("admin.filterAll")}</option>
            <option value="auth_login_success">Login Berhasil</option>
            <option value="auth_login_failed">Login Gagal</option>
            <option value="auth_logout">Logout</option>
            <option value="auth_register">Registrasi</option>
            <option value="user_profile_update">Update Profil</option>
            <option value="user_password_change">Ubah Password</option>
            <option value="user_password_change_failed">
              Ubah Password Gagal
            </option>
            <option value="user_language_change">Ubah Bahasa</option>
            <option value="user_profile_picture_removed">
              Hapus Foto Profil
            </option>
            <option value="user_account_deleted">Hapus Akun</option>
            <option value="user_account_delete_failed">Hapus Akun Gagal</option>
            <option value="user_session_revoked">Sesi Dicabut</option>
            <option value="user_streak_started">Mulai Streak</option>
            <option value="relapse_recorded">Relapse Dicatat</option>
            <option value="relapse_updated">Relapse Diupdate</option>
            <option value="relapse_deleted">Relapse Dihapus</option>
            <option value="all_relapses_deleted">Semua Relapse Dihapus</option>
            <option value="security_ip_lock">IP Dikunci</option>
            <option value="security_registration_block">
              Registrasi Diblokir
            </option>
            <option value="page_view">Kunjungan Halaman</option>
            <option value="api_call">Panggilan API</option>
          </select>
          <select
            value={logParams.sort}
            onChange={handleSortChange}
            className="px-4 py-2 bg-secondary rounded-lg"
          >
            <option value="newest">{t("admin.sortNewest")}</option>
            <option value="oldest">{t("admin.sortOldest")}</option>
          </select>
        </form>
        <div className="-mx-4 overflow-x-auto pb-2 sm:mx-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-text-secondary uppercase">
              <tr>
                <th className="px-6 py-3">{t("admin.columnTime")}</th>
                <th className="px-6 py-3">{t("admin.columnUsername")}</th>
                <th className="px-6 py-3">{t("admin.columnAction")}</th>
                <th className="px-6 py-3">{t("admin.columnIp")}</th>
                <th className="px-6 py-3">{t("admin.columnDetails")}</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                Array.from({ length: 5 }).map((_, rowIdx) => (
                  <tr
                    key={`log-skeleton-${rowIdx}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="h-4 w-44 animate-pulse rounded bg-secondary/50" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-secondary/40" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-36 animate-pulse rounded bg-secondary/40" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-secondary/30" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-secondary/30" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-text-secondary"
                  >
                    {t("admin.logsEmpty")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const usernameDisplay = resolveUsername(log);
                  const displayName = resolveDisplayName(log);
                  const actionMeta = getActionMeta(log);

                  return (
                    <tr key={log._id} className="border-b border-border">
                      <td className="px-6 py-4 align-top text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-text-primary">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.user_agent && (
                            <span className="text-xs text-text-secondary">
                              {log.user_agent}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary">
                            {usernameDisplay}
                          </span>
                          {displayName && (
                            <span className="text-xs text-text-secondary">
                              {displayName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${actionMeta.className}`}
                        >
                          {actionMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-text-secondary">
                        {log.ip_address || "—"}
                      </td>
                      <td className="px-6 py-4 align-top">
                        {log.details ? (
                          <button
                            type="button"
                            onClick={() => openDetails(log)}
                            className="text-primary hover:underline"
                          >
                            {t("admin.viewDetails")}
                          </button>
                        ) : (
                          <span className="text-text-secondary">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-text-secondary">
            {t("admin.pagination", { page: logParams.page, total: totalPages })}
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => handlePageChange(logParams.page - 1)}
              disabled={logParams.page <= 1}
              size="sm"
            >
              {t("admin.prev")}
            </Button>
            <Button
              onClick={() => handlePageChange(logParams.page + 1)}
              disabled={logParams.page >= totalPages}
              size="sm"
            >
              {t("admin.next")}
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isDetailsOpen}
        onClose={closeDetails}
        title={t("admin.detailModalTitle")}
        size="lg"
      >
        <div className="px-6 pb-6 space-y-4">
          <div className="bg-secondary rounded-xl p-4 overflow-x-auto max-h-80">
            <pre className="text-xs whitespace-pre-wrap">
              {detailsLog?.details
                ? JSON.stringify(detailsLog.details, null, 2)
                : t("admin.noDetails")}
            </pre>
          </div>
          <div className="flex justify-end">
            <Button onClick={closeDetails} size="sm">
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboardPage;

const AdminDashboardSkeleton = () => (
  <div className="container mx-auto max-w-7xl p-6 space-y-8 animate-pulse">
    <div className="h-10 w-64 rounded bg-secondary" />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-surface p-6 rounded-2xl space-y-4">
          <div className="h-4 w-32 rounded bg-secondary/80" />
          <div className="h-10 w-24 rounded bg-secondary/60" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="bg-surface p-6 rounded-2xl space-y-4">
          <div className="h-6 w-48 rounded bg-secondary/80" />
          <div className="h-56 rounded-xl bg-secondary/40" />
        </div>
      ))}
    </div>

    <div className="bg-surface p-6 rounded-2xl space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="h-6 w-40 rounded bg-secondary/70" />
        <div className="h-9 w-24 rounded bg-secondary/50" />
      </div>

      <div className="flex gap-4 flex-wrap">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-10 w-44 rounded bg-secondary/60 grow max-w-xs"
          />
        ))}
      </div>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <div className="min-w-[720px] space-y-2">
          {Array.from({ length: 5 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="grid grid-cols-5 gap-4 rounded-xl border border-border bg-surface px-4 py-3"
            >
              {Array.from({ length: 5 }).map((__, colIdx) => (
                <div key={colIdx} className="h-4 rounded bg-secondary/50" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
