// client/src/App.jsx
import { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";
import KeyboardShortcutsHelp from "./components/KeyboardShortcutsHelp";
import ErrorBoundary from "./components/ErrorBoundary";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import GuidePage from "./pages/GuidePage";
import HistoryPage from "./pages/HistoryPage";
import StatsPage from "./pages/StatsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import EditProfilePage from "./pages/EditProfilePage";
import DeleteAccountPage from "./pages/DeleteAccountPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ManageSessionsPage from "./pages/ManageSessionsPage";
import ErrorPage from "./pages/ErrorPage.jsx";
import HoneypotAdminPage from "./pages/HoneypotAdminPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import PageViewTracker from "./components/PageViewTracker";
import MainLayout from "./components/MainLayout";

function App() {
  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    const asciiArt = `
    ███████████████████████████████████████
    █                                       █
    █   ░██████╗ ░█████╗ ░██╗      ███████╗█
    █   ██╔════╝ ██╔══██╗██║      ██╔════╝█
    █   ███████╗ ███████║██║█████╗███████╗█
    █   ╚════██║ ██╔══██║██║╚════╝╚════██║█
    █   ███████║ ██║  ██║███████╗ ███████║█
    █   ╚══════╝ ╚═╝  ╚═╝╚══════╝ ╚══════╝█
    █                                       █
    █   Transform Your Habits, Track       █
    █   Your Progress                       █
    █                                       █
    █   Welcome to Solivra! 🚀              █
    █   Made with ❤️  for your success      █
    █                                       █
    ███████████████████████████████████████
  `;

    console.log(asciiArt);
    console.log(
      "%cSolivra - Habit Tracker %c%cVisit: solivra.kiizzki.my.id",
      "color: #00ff88; font-size: 16px; font-weight: bold;",
      "color: default;",
      "color: #00ccff; font-size: 12px; text-decoration: underline;"
    );
    console.log(
      "%c💡 Tip: Press ? to see keyboard shortcuts and transform your habits faster!",
      "color: #ffaa00; font-size: 12px; font-style: italic;"
    );
  }, []);

  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    const savedState = localStorage.getItem("sidebarState");
    return savedState ? JSON.parse(savedState) : true;
  });
  const [isHelpModalOpen, setHelpModalOpen] = useState(false);
  const [relapseModalTrigger, setRelapseModalTrigger] = useState(0);
  const [lastRelapseModalTrigger, setLastRelapseModalTrigger] = useState(0);

  useEffect(() => {
    localStorage.setItem("sidebarState", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  const toggleSidebar = () => setSidebarOpen((prevState) => !prevState);
  const toggleHelpModal = () => setHelpModalOpen((prev) => !prev);
  const triggerRelapseModal = () => {
    const newTrigger = Date.now();
    setRelapseModalTrigger(newTrigger);
    setLastRelapseModalTrigger(newTrigger);
  };

  const markRelapseTriggerHandled = useCallback((triggerId) => {
    setRelapseModalTrigger((prev) => (prev === triggerId ? 0 : prev));
    setLastRelapseModalTrigger((prev) => (prev === triggerId ? 0 : prev));
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Router>
            <KeyboardShortcutsWrapper
              onToggleSidebar={toggleSidebar}
              onOpenRelapseModal={triggerRelapseModal}
              onToggleHelpModal={toggleHelpModal}
            />
            <PageViewTracker />
            <Toaster
              position="top-center"
              reverseOrder={false}
              toastOptions={{
                style: {
                  background: "var(--custom-surface)",
                  color: "var(--custom-text-primary)",
                  border: "1px solid var(--custom-border)",
                },
              }}
            />
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin" element={<HoneypotAdminPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <MainLayout
                      isSidebarOpen={isSidebarOpen}
                      toggleSidebar={toggleSidebar}
                      relapseModalTrigger={relapseModalTrigger}
                      lastRelapseModalTrigger={lastRelapseModalTrigger}
                      markRelapseTriggerHandled={markRelapseTriggerHandled}
                    />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/settings/edit-profile"
                  element={<EditProfilePage />}
                />
                <Route
                  path="/settings/sessions"
                  element={<ManageSessionsPage />}
                />
                <Route
                  path="/settings/delete-account"
                  element={<DeleteAccountPage />}
                />
                <Route path="/guide" element={<GuidePage />} />
              </Route>
              <Route path="*" element={<ErrorPage code={404} />} />
              <Route
                element={
                  <AdminRoute
                    isSidebarOpen={isSidebarOpen}
                    toggleSidebar={toggleSidebar}
                  />
                }
              >
                <Route path="/admin-panel" element={<AdminDashboardPage />} />
              </Route>
            </Routes>

            {/* Keyboard Shortcuts Help Modal */}
            <KeyboardShortcutsHelp
              isOpen={isHelpModalOpen}
              onClose={() => setHelpModalOpen(false)}
            />
          </Router>
        </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Wrapper component to handle keyboard shortcuts inside Router context
const KeyboardShortcutsWrapper = ({
  onToggleSidebar,
  onOpenRelapseModal,
  onToggleHelpModal,
}) => {
  useKeyboardShortcuts({
    onToggleSidebar,
    onOpenRelapseModal,
    onToggleHelpModal,
  });

  return null;
};

export default App;
