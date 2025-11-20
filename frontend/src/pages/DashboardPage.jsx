// client/src/pages/DashboardPage.jsx
import { useContext, useState, useEffect, useCallback, useRef } from "react";
import { useOutletContext, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { addRelapse } from "../api/relapses";
import StreakTimer from "../components/StreakTimer";
import Modal from "../components/Modal";
import Button from "../components/Button";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { debugLog } from "../utils/debugLogger";

const DashboardPage = () => {
  const { userData, stats, refreshData } = useContext(AuthContext);
  const { t } = useTranslation();
  const {
    relapseModalTrigger,
    lastRelapseModalTrigger,
    markRelapseTriggerHandled,
  } = useOutletContext();
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [relapseNote, setRelapseNote] = useState("");
  const [relapseTime, setRelapseTime] = useState(new Date());
  const processedTriggerRef = useRef(null);

  const handleOpenModal = useCallback(() => {
    const isFirstTime = stats.streakStarted === false;
    const message = isFirstTime
      ? t("dashboard.toastStart")
      : t("dashboard.toastRelapse");
    debugLog("dashboard:open_relapse_modal", { isFirstTime });
    toast(message, { icon: "📝" });

    setRelapseTime(new Date());
    setRelapseNote("");
    setModalOpen(true);
  }, [stats.streakStarted, t]);

  // Reset modal state when navigating away and back
  useEffect(() => {
    setModalOpen(false);
    setRelapseNote("");
    setRelapseTime(new Date());
  }, [location.pathname]);

  // Listen for keyboard shortcut trigger - only on dashboard
  useEffect(() => {
    if (location.pathname !== "/dashboard") return;
    if (!relapseModalTrigger) return;
    if (relapseModalTrigger !== lastRelapseModalTrigger) return;
    if (processedTriggerRef.current === relapseModalTrigger) return;

    processedTriggerRef.current = relapseModalTrigger;

    if (isModalOpen) {
      debugLog("dashboard:modal_trigger_toggle_close", {
        trigger: relapseModalTrigger,
      });
      setModalOpen(false);
      markRelapseTriggerHandled(relapseModalTrigger);
      return;
    }

    debugLog("dashboard:modal_trigger_received", {
      trigger: relapseModalTrigger,
    });
    handleOpenModal();
    markRelapseTriggerHandled(relapseModalTrigger);
  }, [
    location.pathname,
    relapseModalTrigger,
    lastRelapseModalTrigger,
    isModalOpen,
    handleOpenModal,
    markRelapseTriggerHandled,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (relapseTime > new Date()) {
      debugLog("dashboard:submit_relapse_rejected_future_time", {
        attemptedTime: relapseTime.toISOString(),
      });
      return toast.error(t("dashboard.errorFutureTime"));
    }

    const isFirstTime = stats.streakStarted === false;
    const loadingToast = toast.loading(
      isFirstTime ? t("dashboard.loadingStart") : t("dashboard.loadingRelapse")
    );

    debugLog("dashboard:submit_relapse_begin", {
      isFirstTime,
      relapseTime: relapseTime.toISOString(),
      noteLength: relapseNote.length,
    });

    try {
      await addRelapse({
        relapse_time: relapseTime.toISOString(),
        relapse_note: relapseNote,
      });
      debugLog("dashboard:submit_relapse_success", { isFirstTime });

      const successMessage = isFirstTime
        ? t("dashboard.successStart")
        : t("dashboard.successRelapse");
      toast.success(successMessage, { id: loadingToast });
      setModalOpen(false);
      await refreshData();
    } catch (error) {
      debugLog("dashboard:submit_relapse_error", {
        message: error?.message,
        status: error?.status,
      });
      toast.error(t("dashboard.errorSave"), { id: loadingToast });
    } finally {
      debugLog("dashboard:submit_relapse_complete");
      setModalOpen(false);
    }
  };

  const formatForInput = (date) => {
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );
    return localDate.toISOString().slice(0, 16);
  };

  const formatLongestStreak = (totalSeconds) => {
    if (!totalSeconds || totalSeconds < 0) return t("dashboard.zeroDuration");
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    let parts = [];
    if (days > 0) parts.push(t("dashboard.days", { count: days }));
    if (hours > 0) parts.push(t("dashboard.hours", { count: hours }));
    if (minutes > 0 || hours > 0 || days > 0)
      parts.push(t("dashboard.minutes", { count: minutes }));
    return parts.join(" ") || t("dashboard.zeroDuration");
  };

  if (!stats || !userData) {
    return (
      <div className="text-center p-10 text-text-secondary">
        {t("dashboard.loading")}
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto max-w-2xl p-6  space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            {t("dashboard.greeting", { name: userData.nickname })}
          </h1>
          <p className="text-text-secondary mt-1">
            {stats.streakStarted === false
              ? t("dashboard.welcomeMessage")
              : t("dashboard.encouragement")}
          </p>
        </div>

        {stats.streakStarted === false ? (
          // --- TAMPILAN UNTUK PENGGUNA BARU (STREAK BELUM DIMULAI) ---
          <>
            <div className="p-8 bg-surface rounded-2xl text-center space-y-4">
              <p className="text-text-secondary">
                {t("dashboard.notStartedTitle")}
              </p>
              <p className="text-base">
                {t("dashboard.notStartedDescription")}
              </p>
            </div>
            <Button
              onClick={handleOpenModal}
              variant="primary"
              size="lg"
              className="w-full "
            >
              🚀 {t("dashboard.startButton")}
            </Button>
          </>
        ) : (
          // --- TAMPILAN DASHBOARD LENGKAP (STREAK SUDAH BERJALAN) ---
          <>
            <div className="p-8 bg-surface rounded-2xl text-center space-y-4">
              <p className="text-base uppercase tracking-wider text-text-secondary">
                {t("dashboard.cleanTime")}
              </p>
              <p className="text-5xl font-bold text-primary">
                {Math.floor(stats.currentStreak / 86400)} hr
              </p>
            </div>
            <Button
              onClick={handleOpenModal}
              variant="danger"
              size="lg"
              className="w-full"
            >
              💥 {t("dashboard.relapseButton")}
            </Button>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-surface rounded-2xl text-center">
                <p className="text-sm uppercase text-text-secondary">
                  {t("dashboard.currentStreak")}
                </p>
                <p className="text-2xl font-bold mt-2 text-text-primary">
                  <StreakTimer
                    initialSeconds={stats.currentStreak}
                    syncedAt={stats.syncedAt}
                    isRunning={stats.streakStarted !== false}
                  />
                </p>
              </div>
              <div className="p-5 bg-surface rounded-2xl text-center">
                <p className="text-sm uppercase text-text-secondary">
                  {t("dashboard.longestStreak")}
                </p>
                <p className="text-2xl font-bold mt-2 text-text-primary">
                  {formatLongestStreak(stats.longestStreak)}
                </p>
              </div>
            </div>
            <p className="text-center text-text-secondary italic pt-4">
              "{t("dashboard.quote")}"
            </p>
          </>
        )}
      </div>

      {/* MODAL (digunakan untuk kedua kondisi) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        title={
          stats.streakStarted === false
            ? t("dashboard.modalTitleStart")
            : t("dashboard.modalTitleRelapse")
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 mt-6 mb-0">
          <p className="text-sm text-center text-text-secondary">
            {stats.streakStarted === false
              ? t("dashboard.modalDescriptionStart")
              : t("dashboard.modalDescriptionRelapse")}
          </p>
          <div className="mx-6">
            <label
              htmlFor="modal_time"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              {stats.streakStarted === false
                ? t("dashboard.modalTimeStart")
                : t("dashboard.modalTimeRelapse")}
            </label>
            <input
              type="datetime-local"
              id="modal_time"
              value={formatForInput(relapseTime)}
              onChange={(e) => setRelapseTime(new Date(e.target.value))}
              className="w-full px-4 py-3 text-text-primary bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="mx-6">
            <label
              htmlFor="relapse_note"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              {t("dashboard.modalNoteLabel")}
            </label>
            <textarea
              id="relapse_note"
              value={relapseNote}
              maxLength={108}
              onChange={(e) => setRelapseNote(e.target.value)}
              rows="3"
              className="w-full min-h-[100px] max-h-[100px] px-4 py-3 text-text-primary bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("dashboard.modalNotePlaceholder")}
            ></textarea>
          </div>

          <div className="flex gap-4 justify-evenly border-t border-border">
            <Button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full hover:bg-white/0  bg-white/0 group"
            >
              <span className="text-danger group-hover:text-danger-hover">{t("common.cancel")}</span>
            </Button>
            <span className="border-l border-border"></span>
            <Button
              className="w-full hover:bg-white/0  bg-white/0 shadow-none group"
              type="submit"
            >
              <span className="text-primary group-hover:text-primary-hover">
                {stats.streakStarted === false
                  ? t("dashboard.modalSubmitStart")
                  : t("dashboard.modalSubmitRelapse")}
              </span>
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default DashboardPage;
