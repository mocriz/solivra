import { useEffect, useState, useCallback, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Button from "../components/Button";
import { getUserSessions, revokeUserSession } from "../api/users";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { summarizeUserAgent } from "../utils/userAgent";

const formatDateTime = (value) => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
};

const ManageSessionsPage = () => {
  const { logout, refreshData } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const loadSessions = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getUserSessions();
      setSessions(data.sessions || []);
    } catch (error) {
      toast.error(error.message || t("sessions.errorLoad"));
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (sessionId) => {
    setRevokingId(sessionId);
    try {
      const response = await revokeUserSession(sessionId);
      if (response.isCurrent) {
        toast.success(response.msg || t("sessions.currentEnded"));
        try {
          await logout();
        } catch {
          // ignore
        }
        navigate("/login");
        return;
      }

      toast.success(response.msg || t("sessions.revokeSuccess"));
      await loadSessions();
      await refreshData();
    } catch (error) {
      toast.error(error.message || t("sessions.revokeError"));
    } finally {
      setRevokingId(null);
    }
  };

  const enrichedSessions = useMemo(
    () =>
      sessions.map((session) => {
        const isActive = !session.revoked_at;
        const isCurrent = Boolean(session.is_current);
        const uaSummary = summarizeUserAgent(session.user_agent);
        const statusTone = isCurrent
          ? "bg-primary/10 text-primary border-primary/20"
          : isActive
          ? "bg-success/10 text-success border-success/20"
          : "bg-text-secondary/10 text-text-secondary border-border";

        return {
          ...session,
          isActive,
          isCurrent,
          uaSummary,
          statusTone,
        };
      }),
    [sessions]
  );

  return (
    <div className="container mx-auto max-w-4xl p-6 space-y-6 text-text-primary">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
            {t("sessions.title")}
          </h1>
          <p className="text-xs uppercase tracking-wide text-text-secondary sm:text-sm">
            {t("sessions.subtitle")}
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={refreshing}
          onClick={loadSessions}
          className="w-full sm:w-auto"
        >
          {refreshing ? t("sessions.refreshing") : t("common.refresh")}
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {loading ? (
          <div className="p-6 text-center text-text-secondary">
            {t("sessions.loading")}
          </div>
        ) : enrichedSessions.length === 0 ? (
          <div className="p-6 text-center text-text-secondary">
            {t("sessions.empty")}
          </div>
        ) : (
          <div className="grid gap-4">
            {enrichedSessions.map((session) => (
              <article
                key={session.id}
                className={`w-full rounded-2xl border bg-secondary/50 p-4 transition hover:bg-secondary/60 ${
                  session.isCurrent ? "ring-1 ring-primary/30" : ""
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ">
                    <div className="space-y-1">
                      <p className="break-words text-sm font-medium text-text-primary sm:text-base">
                        {session.uaSummary.device}
                      </p>
                      <p className="break-words text-xs text-text-secondary sm:text-sm">
                        {session.uaSummary.browser}
                      </p>
                    </div>
                    <span
                      className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium sm:text-xs ${session.statusTone}`}
                    >
                      {session.isCurrent
                        ? t("sessions.current")
                        : session.isActive
                        ? t("sessions.active")
                        : t("sessions.revoked")}
                    </span>
                  </div>
                  <div className="grid gap-2 text-xs text-text-secondary sm:grid-cols-2 sm:text-sm">
                    <InfoRow
                      label={t("sessions.ipAddress")}
                      value={session.ip_address || t("sessions.ipUnknown")}
                    />
                    <InfoRow
                      label={t("sessions.lastActive")}
                      value={formatDateTime(session.last_active_time)}
                    />
                    <InfoRow
                      label={t("sessions.loginAt")}
                      value={formatDateTime(session.created_at)}
                    />
                  </div>
                  {session.isActive && !session.isCurrent ? (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={revokingId === session.id}
                        onClick={() => handleRevoke(session.id)}
                        className="w-full sm:w-auto"
                      >
                        {revokingId === session.id
                          ? t("sessions.revoking")
                          : t("sessions.revokeButton")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSessionsPage;

const InfoRow = ({ label, value }) => (
  <div className="flex flex-col gap-1 rounded-xl bg-surface px-3 py-2">
    <span className="text-[11px] uppercase tracking-wide text-text-secondary/80 sm:text-xs">
      {label}
    </span>
    <span className="break-words text-sm font-medium text-text-primary sm:text-base">
      {value}
    </span>
  </div>
);
