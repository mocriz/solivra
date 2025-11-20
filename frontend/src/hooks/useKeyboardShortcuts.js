// client/src/hooks/useKeyboardShortcuts.js
import { useEffect, useCallback, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import { debugLog } from "../utils/debugLogger";

export const useKeyboardShortcuts = ({
  onToggleSidebar,
  onOpenRelapseModal,
  onToggleHelpModal,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useContext(AuthContext);
  const { t } = useTranslation();

  // Define keyboard shortcuts
  const shortcuts = {
    navigation: [
      { key: "1", description: t("shortcuts.dashboard"), path: "/dashboard" },
      { key: "2", description: t("shortcuts.history"), path: "/history" },
      { key: "3", description: t("shortcuts.stats"), path: "/stats" },
      { key: "4", description: t("shortcuts.profile"), path: "/profile" },
      { key: "5", description: t("shortcuts.settings"), path: "/settings" },
      { key: "6", description: t("shortcuts.guide"), path: "/guide" },
    ],
    actions: [
      {
        key: "f",
        description: t("shortcuts.relapseModal"),
        availableOn: ["/dashboard"],
      },
      {
        key: "s",
        description: t("shortcuts.toggleSidebar"),
        desktopOnly: true,
      },
    ],
    help: [
      {
        key: "?",
        description: t("shortcuts.helpModal"),
      },
    ],
  };

  const handleKeyPress = useCallback(
    (event) => {
      // Don't trigger shortcuts if user is typing in an input, textarea, or contenteditable
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.contentEditable === "true" ||
          activeElement.getAttribute("role") === "textbox");

      if (isTyping) {
        debugLog("shortcuts:ignored_typing", {
          key: event.key,
          path: location.pathname,
        });
        return;
      }
      if (event.repeat) {
        debugLog("shortcuts:ignored_repeat", {
          key: event.key,
          path: location.pathname,
        });
        return;
      }

      // Don't trigger shortcuts on non-authenticated pages
      const publicPaths = ["/", "/login", "/register"];
      if (!isAuthenticated && !publicPaths.includes(location.pathname)) return;

      const key = event.key.toLowerCase();
      const isShiftPressed = event.shiftKey;

      // Handle help modal (?)
      if (key === "?" || (isShiftPressed && key === "/")) {
        event.preventDefault();
        if (onToggleHelpModal) onToggleHelpModal();
        debugLog("shortcuts:toggled_help_modal", {
          key: event.key,
          path: location.pathname,
        });
        return;
      }

      // Only proceed with other shortcuts if user is authenticated
      if (!isAuthenticated) return;

      // Handle navigation shortcuts (1-6)
      const navShortcut = shortcuts.navigation.find((s) => s.key === key);
      if (navShortcut && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        navigate(navShortcut.path);
        debugLog("shortcuts:navigated", {
          key: event.key,
          to: navShortcut.path,
        });
        return;
      }

      // Handle action shortcuts
      const actionShortcut = shortcuts.actions.find((s) => s.key === key);
      if (actionShortcut && !event.ctrlKey && !event.metaKey && !event.altKey) {
        // Check if shortcut is available on current page
        if (
          actionShortcut.availableOn &&
          !actionShortcut.availableOn.includes(location.pathname)
        ) {
          return;
        }

        // Check if it's desktop only
        if (actionShortcut.desktopOnly && window.innerWidth < 768) {
          return;
        }

        event.preventDefault();

        // Execute appropriate action based on key
        if (key === "f" && onOpenRelapseModal) {
          debugLog("shortcuts:trigger_relapse_modal", {
            key: event.key,
            path: location.pathname,
          });
          onOpenRelapseModal();
        } else if (key === "s" && onToggleSidebar) {
          debugLog("shortcuts:toggled_sidebar", {
            key: event.key,
          });
          onToggleSidebar();
        }
        return;
      }
      debugLog("shortcuts:ignored_key", {
        key: event.key,
        path: location.pathname,
      });
    },
    [
      isAuthenticated,
      location.pathname,
      navigate,
      onToggleSidebar,
      onOpenRelapseModal,
      onToggleHelpModal,
      t,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  return { shortcuts };
};

export default useKeyboardShortcuts;
