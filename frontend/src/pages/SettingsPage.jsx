// client/src/pages/SettingsPage.jsx
import { useContext, useState, useEffect, useCallback, useMemo } from "react"; // Impor useState
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import { usePWAInstall } from "../hooks/usePWAInstall";
import ConfirmationModal from "../components/ConfirmationModal"; // Impor modal konfirmasi
import LanguageSelector from "../components/LanguageSelector";
import { useTranslation } from "react-i18next";
import { deleteAllRelapses } from "../api/relapses";
import {
  clearDebugLogs,
  debugLog,
  getActiveDebugUser,
  getDebugEntries,
  getDebugLogText,
  listDebugUsers,
} from "../utils/debugLogger";

const SettingsPage = () => {
  const { logout, userData, refreshData } = useContext(AuthContext);
  const { canInstall, isStandalone, triggerInstall } = usePWAInstall();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); // State untuk modal
  const [isClearRelapseModalOpen, setIsClearRelapseModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { t } = useTranslation();
  const [debugText, setDebugText] = useState("");
  const [debugCount, setDebugCount] = useState(0);
  const [selectedDebugKey, setSelectedDebugKey] = useState(
    () => getActiveDebugUser() || "anonymous",
  );
  const [availableDebugKeys, setAvailableDebugKeys] = useState(() =>
    listDebugUsers(),
  );
  const debugKeysForDisplay = useMemo(() => {
    const keys = availableDebugKeys.includes(selectedDebugKey)
      ? availableDebugKeys
      : [...availableDebugKeys, selectedDebugKey].filter(Boolean);
    return Array.from(new Set(keys));
  }, [availableDebugKeys, selectedDebugKey]);
  const isDev = import.meta.env.DEV;

  const getPWAButtonText = () => {
    if (isStandalone) return t("settings.pwaInstalled");
    if (canInstall) return t("settings.pwaInstall");
    return t("settings.pwaUnsupported");
  };

  // Fungsi untuk membuka modal
  const handleLogoutClick = () => {
    debugLog("settings:logout_modal_open");
    setIsLogoutModalOpen(true);
  };

  // Fungsi yang akan dijalankan saat user konfirmasi logout
  const confirmLogout = () => {
    debugLog("settings:logout_confirmed");
    logout();
    toast.success(t("settings.logoutSuccess"));
    setIsLogoutModalOpen(false);
  };

  // Fungsi untuk membuka modal clear relapse
  const handleClearRelapseClick = () => {
    debugLog("settings:clear_relapses_modal_open");
    setIsClearRelapseModalOpen(true);
  };

  // Fungsi untuk menghapus semua riwayat relapse
  const confirmClearRelapses = async () => {
    debugLog("settings:clear_relapses_confirmed");
    setIsClearing(true);
    const loadingToast = toast.loading(t("settings.clearingRelapses"));

    try {
      const result = await deleteAllRelapses();
      debugLog("settings:clear_relapses_success", {
        deletedCount: result?.deleted_count,
      });
      toast.success(result.msg || t("settings.relapsesCleared"), {
        id: loadingToast,
      });
      setIsClearRelapseModalOpen(false);
      await refreshData(); // Refresh data untuk update UI
    } catch (error) {
      debugLog("settings:clear_relapses_failed", {
        message: error?.message,
        status: error?.status,
      });
      toast.error(error.message || t("settings.clearRelapsesFailed"), {
        id: loadingToast,
      });
    } finally {
      setIsClearing(false);
    }
  };

  const refreshDebugLogs = useCallback(() => {
    if (!isDev) return;
    const keys = listDebugUsers();
    setAvailableDebugKeys(keys);

    let keyToUse = selectedDebugKey;
    if (!keyToUse || !keys.includes(keyToUse)) {
      const activeKey = getActiveDebugUser();
      if (activeKey && keys.includes(activeKey)) {
        keyToUse = activeKey;
      } else {
        keyToUse = keys[0] || "anonymous";
      }
      if (keyToUse !== selectedDebugKey) {
        setSelectedDebugKey(keyToUse);
      }
    }

    const entries = keyToUse ? getDebugEntries(keyToUse) : [];
    setDebugCount(entries.length);
    setDebugText(keyToUse ? getDebugLogText(keyToUse) : "");
  }, [isDev, selectedDebugKey]);

  useEffect(() => {
    if (!isDev) return undefined;
    refreshDebugLogs();
    const intervalId = window.setInterval(refreshDebugLogs, 3000);
    return () => window.clearInterval(intervalId);
  }, [isDev, refreshDebugLogs]);

  const handleCopyLogs = async () => {
    if (!isDev) return;
    try {
      await navigator.clipboard.writeText(debugText);
      debugLog("settings:debug_logs_copied", {
        entryCount: debugCount,
        key: selectedDebugKey,
      });
      toast.success("Debug log copied to clipboard.");
    } catch (error) {
      debugLog("settings:debug_logs_copy_failed", { message: error?.message });
      toast.error("Failed to copy debug log.");
    }
  };

  const handleClearLogs = () => {
    if (!isDev) return;
    clearDebugLogs(selectedDebugKey);
    debugLog("settings:debug_logs_cleared", { key: selectedDebugKey });
    refreshDebugLogs();
    toast.success("Debug log cleared for this session.");
  };

  return (
    <>
      <div className="container mx-auto max-w-2xl p-6 space-y-8 text-text-primary">
        <h2 className="text-3xl font-bold">{t("settings.title")}</h2>
        {/* Appearance Section */}
        <div>
          <h3 className="text-sm uppercase text-text-secondary mb-2">
            {t("settings.appearance")}
          </h3>
          <div className="bg-surface rounded-xl divide-y divide-border">
            <div className="p-4 flex justify-between items-center">
              <span>{t("settings.darkMode")}</span>
              <ThemeToggle />
            </div>
            <div className="p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {t("settings.languageLabel")}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">
                  {t("settings.languageDescription")}
                </p>
                <LanguageSelector />
              </div>
            </div>
          </div>
        </div>

        {/* PWA Features Section */}
        <div>
          <h3 className="text-sm uppercase text-text-secondary mb-2">
            {t("settings.pwaFeatures")}
          </h3>
          <div className="bg-surface rounded-xl">
            <button
              onClick={triggerInstall}
              disabled={!canInstall || isStandalone}
              className="w-full p-4 text-center text-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getPWAButtonText()}
            </button>
          </div>
        </div>

        {/* Account Section */}
        <div>
          <h3 className="text-sm uppercase text-text-secondary mb-2">
            {t("settings.account")}
          </h3>
          <div className="bg-surface rounded-xl divide-y divide-border">
            <Link
              to="/settings/edit-profile"
              className="block p-4 hover:bg-secondary transition-colors"
            >
              {t("settings.editProfile")}
            </Link>
            <Link
              to="/settings/sessions"
              className="block p-4 hover:bg-secondary transition-colors"
            >
              {t("settings.manageSessions")}
            </Link>
            <button
              onClick={handleClearRelapseClick}
              className="w-full p-4 hover:bg-secondary transition-colors text-left cursor-pointer"
            >
              {t("settings.clearRelapseHistory")}
            </button>
          </div>
        </div>

        {/* Admin Panel Section (Conditional) */}
        {userData?.role === "admin" && (
          <div>
            <h3 className="text-sm uppercase text-text-secondary mb-2">
              {t("settings.special")}
            </h3>
            <div className="bg-surface rounded-xl">
              <Link
                to="/admin-panel"
                className="block p-4 hover:bg-secondary transition-colors"
              >
                {t("settings.adminPanel")}
              </Link>
            </div>
          </div>
        )}

        {/* Other Section */}
        <div>
          <h3 className="text-sm uppercase text-text-secondary mb-2">
            {t("settings.other")}
          </h3>
          <div className="bg-surface rounded-xl divide-y divide-border">
            {/* Tombol logout sekarang memanggil handleLogoutClick */}
            <button
              onClick={handleLogoutClick}
              className="w-full p-4 text-danger text-left hover:bg-secondary transition-colors cursor-pointer"
            >
              {t("settings.logout")}
            </button>
            <Link
              to="/settings/delete-account"
              className="block p-4 text-danger hover:bg-secondary transition-colors"
            >
              {t("settings.deleteAccount")}
            </Link>
          </div>
        </div>

        {isDev && (
          <div>
            <h3 className="text-sm uppercase text-text-secondary mb-2">
              Development Debug Log
            </h3>
            <div className="bg-surface rounded-xl border border-border p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span>Viewing log for:</span>
                <select
                  value={selectedDebugKey}
                  onChange={(event) => setSelectedDebugKey(event.target.value)}
                  className="px-2 py-1 rounded-lg border border-border bg-secondary text-text-primary text-sm"
                >
                  {debugKeysForDisplay.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <span className="text-text-secondary/80">
                  Entries:{" "}
                  <span className="text-text-primary font-semibold">
                    {debugCount}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>
                  Debug logs persist locally per user in development builds
                  only. Use the selector above to review previous sessions.
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={refreshDebugLogs}
                  className="px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors text-sm font-medium"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="px-3 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition-colors text-sm font-medium"
                >
                  Copy All
                </button>
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-3 py-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors text-sm font-medium"
                >
                  Clear
                </button>
              </div>
              <textarea
                className="w-full h-64 text-xs font-mono bg-secondary/50 border border-border rounded-lg p-3 resize-y"
                value={debugText}
                readOnly
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Logout */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title={t("settings.logoutConfirmTitle")}
      >
        {t("settings.logoutConfirmMessage")}
      </ConfirmationModal>

      {/* Modal Konfirmasi Clear All Relapses */}
      <ConfirmationModal
        isOpen={isClearRelapseModalOpen}
        onClose={() => setIsClearRelapseModalOpen(false)}
        onConfirm={confirmClearRelapses}
        title={t("settings.clearRelapseConfirmTitle")}
        confirmButtonText={
          isClearing ? t("settings.clearingRelapses") : "Hapus Semua"
        }
        isLoading={isClearing}
      >
        <div className="space-y-3">
          <p>{t("settings.clearRelapseConfirmMessage")}</p>
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
            <p className="text-sm text-danger font-medium">
              {t("settings.clearRelapseWarning")}
            </p>
            <p className="text-sm text-danger/80 mt-1">
              {t("settings.clearRelapseWarningText")}
            </p>
          </div>
        </div>
      </ConfirmationModal>
    </>
  );
};

export default SettingsPage;
