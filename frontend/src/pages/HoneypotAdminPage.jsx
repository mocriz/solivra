// client/src/pages/HoneypotAdminPage.jsx
import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { logAdminAccess, submitFakeLogin } from "../api/honeypot";
import { debugLog } from "../utils/debugLogger";

const PHASES = {
  CHECKING: "checking",
  LOGIN_FORM: "loginForm",
  NON_ADMIN_LOADER: "nonAdminLoader",
  MODAL: "modal",
  RICKROLL: "rickroll",
};

const HoneypotAdminPage = () => {
  const { isAuthenticated, userData, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phase, setPhase] = useState(PHASES.CHECKING);
  const [preloadVideo, setPreloadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const loaderTimeoutRef = useRef(null);
  const nonAdminSequenceStartedRef = useRef(false);

  const clearLoaderTimeout = () => {
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
  };

  const startLoaderSequence = (duration = 5000) => {
    clearLoaderTimeout();
    setPhase(PHASES.NON_ADMIN_LOADER);
    loaderTimeoutRef.current = setTimeout(() => {
      loaderTimeoutRef.current = null;
      setPhase(PHASES.MODAL);
    }, duration);
  };

  // Log admin access attempt and preload video for all non-authenticated users
  useEffect(() => {
    const logAccess = async () => {
      try {
        await logAdminAccess();
      } catch (error) {
        debugLog("honeypot:log_access_failed", { message: error?.message });
      }
    };
    logAccess();
  }, []);

  // Handle authenticated users with non-admin role
  useEffect(() => {
    if (isLoading) {
      setPhase(PHASES.CHECKING);
      return;
    }

    if (!isAuthenticated) {
      nonAdminSequenceStartedRef.current = false;
      setPreloadVideo(true);
      setPhase(PHASES.LOGIN_FORM);
      return;
    }

    if (!userData) {
      setPhase(PHASES.CHECKING);
      return;
    }

    if (userData.role === "admin") {
      navigate("/admin-panel", { replace: true });
      return;
    }

    setPreloadVideo(true);

    if (!nonAdminSequenceStartedRef.current) {
      nonAdminSequenceStartedRef.current = true;
      startLoaderSequence();
    }
  }, [isAuthenticated, userData, isLoading, navigate]);

  useEffect(() => {
    return () => {
      clearLoaderTimeout();
    };
  }, []);

  // Preload rickroll video
  useEffect(() => {
    if (preloadVideo && !videoReady) {
      const video = document.createElement("video");
      video.src = "/rickroll.mp4";
      video.preload = "auto";
      video.muted = true; // Start muted for preloading
      video.playsInline = true;
      video.style.display = "none";
      video.style.position = "absolute";
      video.style.top = "-9999px";

      video.oncanplaythrough = () => {
        debugLog("honeypot:video_preloaded_ready");
        setVideoReady(true);
      };

      video.onerror = () => {
        console.error("Failed to preload video");
      };

      document.body.appendChild(video);

      // Cleanup function
      return () => {
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
      };
    }
  }, [preloadVideo, videoReady]);

  const handleInputChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value,
    });
    setLoginError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLoginError("");
    // Video should already be preloaded at this point

    try {
      const response = await submitFakeLogin(
        loginData,
        t("honeypot.errors.loginFailed")
      );

      if (response.success && response.triggerRickroll) {
        startLoaderSequence(4000);
      } else {
        setLoginError(response.message || t("honeypot.errors.loginFailed"));
      }
    } catch (error) {
      setLoginError(error.message || t("honeypot.errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalOk = () => {
    setPhase(PHASES.RICKROLL);
  };

  const renderPreloadAssets = () => {
    if (!preloadVideo) {
      return null;
    }

    return (
      <>
        <link rel="preload" href="/rickroll.mp4" as="video" type="video/mp4" />
        {!videoReady && (
          <div className="fixed bottom-4 right-4 text-xs text-text-secondary bg-surface px-2 py-1 rounded">
            {t("honeypot.loader.preloading")}
          </div>
        )}
        <video
          src="/rickroll.mp4"
          preload="auto"
          muted
          playsInline
          style={{
            display: "none",
            position: "absolute",
            top: "-9999px",
            left: "-9999px",
          }}
          onLoadedData={() => debugLog("honeypot:video_preloaded_loaded_data")}
          onCanPlayThrough={() => {
            debugLog("honeypot:video_buffered");
            setVideoReady(true);
          }}
        />
      </>
    );
  };

  if (phase === PHASES.CHECKING) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-success font-medium mb-2">
            {t("honeypot.loader.initialTitle")}
          </div>
          <div className="text-text-secondary">
            {t("honeypot.loader.initialSubtitle")}
          </div>
        </div>
      </div>
    );
  }

  if (phase === PHASES.NON_ADMIN_LOADER) {
    const isVerifyingAdmin =
      isAuthenticated && userData && userData.role !== "admin";

    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        {renderPreloadAssets()}
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-success font-medium mb-2">
            {isVerifyingAdmin
              ? t("honeypot.loader.verifyingTitle")
              : t("honeypot.loader.successTitle")}
          </div>
          <div className="text-text-secondary">
            {isVerifyingAdmin
              ? t("honeypot.loader.verifyingSubtitle")
              : t("honeypot.loader.successSubtitle")}
          </div>
        </div>
      </div>
    );
  }

  if (phase === PHASES.RICKROLL) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h2 className="text-4xl font-bold mb-8 animate-bounce">
          {t("honeypot.rickroll.title")}
        </h2>
        <div className="w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
          <video
            width="100%"
            height="100%"
            src="/rickroll.mp4"
            autoPlay
            loop
            muted={false}
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
            playsInline
            className="w-full h-full object-cover"
            style={{
              pointerEvents: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
            onContextMenu={(e) => e.preventDefault()}
            onPlay={() => debugLog("honeypot:video_started")}
            onError={(e) => console.error("Video error:", e)}
            ref={(video) => {
              if (video && videoReady) {
                video.muted = false;
                video.play().catch((e) => {
                  debugLog("honeypot:video_autoplay_blocked", {
                    message: e?.message,
                  });
                  video.muted = true;
                  video.play();
                });
              }
            }}
          />
        </div>
        <p className="mt-4 text-lg text-center max-w-2xl">
          {t("honeypot.rickroll.message")}
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-3 bg-primary text-white rounded-lg hover:opacity-85 transition"
        >
          {t("honeypot.rickroll.backButton")}
        </button>
      </div>
    );
  }

  if (phase === PHASES.MODAL) {
    return (
      <div className="min-h-screen bg-bg text-text-primary">
        {renderPreloadAssets()}
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-2xl p-8 max-w-md w-full mx-4 border border-border">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-success mb-4">
                {t("honeypot.modal.title")}
              </h3>
              <p className="text-text-primary mb-6">
                {t("honeypot.modal.message")}
              </p>
              <button
                onClick={handleModalOk}
                className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-85 transition"
              >
                {t("honeypot.modal.confirm")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase !== PHASES.LOGIN_FORM) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {renderPreloadAssets()}

      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8 bg-surface rounded-2xl border border-border">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">
              {t("honeypot.page.title")}
            </h1>
            <p className="text-text-secondary mt-2">
              {t("honeypot.page.subtitle")}
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-danger text-sm">{loginError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t("honeypot.form.usernameLabel")}
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={loginData.username}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 text-text-primary bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
                placeholder={t("honeypot.form.usernamePlaceholder")}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                {t("honeypot.form.passwordLabel")}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={loginData.password}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 text-text-primary bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60"
                placeholder={t("honeypot.form.passwordPlaceholder")}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 font-bold text-white bg-primary rounded-xl hover:opacity-85 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? t("honeypot.form.submitLoading")
                : t("honeypot.form.submit")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-text-secondary">
              {t("honeypot.page.restrictedNotice")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HoneypotAdminPage;
