// client/src/pages/LoginPage.jsx
import { useState, useContext, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import toast from "react-hot-toast"; // Impor toast
import { useTranslation } from "react-i18next";
import PublicHeader from "../components/PublicHeader";

const LOGIN_LOCKOUT_KEY = "security:login-lockout";
const REGISTRATION_LOCKOUT_KEY = "security:registration-lockout";

const readStoredLockout = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.until || parsed.type !== "ip") {
      localStorage.removeItem(key);
      return null;
    }
    if (new Date(parsed.until).getTime() <= Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const LoginPage = () => {
  const { t } = useTranslation();
  const formatCountdown = useCallback(
    (ms) => {
      if (ms <= 0) return "";
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const secondsString = seconds.toString().padStart(2, "0");
      if (minutes > 0) {
        return t("common.countdownMinutes", {
          minutes,
          seconds: secondsString,
        });
      }
      return t("common.countdownSeconds", { seconds: secondsString });
    },
    [t],
  );

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [error, setError] = useState("");
  const [lockoutInfo, setLockoutInfo] = useState(() =>
    readStoredLockout(LOGIN_LOCKOUT_KEY),
  );
  const [lockoutCountdown, setLockoutCountdown] = useState("");
  const [accountLockInfo, setAccountLockInfo] = useState(null);
  const [accountLockCountdown, setAccountLockCountdown] = useState("");
  const { login, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!lockoutInfo) {
      setLockoutCountdown("");
      return;
    }

    const updateCountdown = () => {
      const target = new Date(lockoutInfo.until).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        setLockoutInfo(null);
        setLockoutCountdown("");
        try {
          localStorage.removeItem(LOGIN_LOCKOUT_KEY);
          localStorage.removeItem(REGISTRATION_LOCKOUT_KEY);
        } catch (storageError) {
          console.warn("Failed clearing lockout storage", storageError);
        }
        return;
      }
      setLockoutCountdown(formatCountdown(diff));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lockoutInfo, formatCountdown]);

  useEffect(() => {
    if (!accountLockInfo) {
      setAccountLockCountdown("");
      return;
    }

    const updateCountdown = () => {
      const target = new Date(accountLockInfo.until).getTime();
      const diff = target - Date.now();
      if (diff <= 0) {
        setAccountLockInfo(null);
        setAccountLockCountdown("");
        return;
      }
      setAccountLockCountdown(formatCountdown(diff));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [accountLockInfo, formatCountdown]);

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const isIpLockActive = Boolean(
    lockoutInfo && new Date(lockoutInfo.until).getTime() > Date.now(),
  );

  const isAccountLocked = Boolean(
    accountLockInfo && new Date(accountLockInfo.until).getTime() > Date.now(),
  );

  const isFormDisabled = isIpLockActive || isAccountLocked;

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isFormDisabled) {
      setError(t("login.lockoutForm"));
      return;
    }

    if (!formData.username || !formData.password) {
      setError(t("login.errorMissing"));
      return;
    }
    const result = await login(formData);
    if (!result.ok) {
      if (result.lockout?.type === "user" && result.lockout?.until) {
        setAccountLockInfo({ until: result.lockout.until });
        setError("");
        setLockoutInfo(null);
        try {
          localStorage.removeItem(LOGIN_LOCKOUT_KEY);
          localStorage.removeItem(REGISTRATION_LOCKOUT_KEY);
        } catch (storageError) {
          console.warn("Failed clearing lockout storage", storageError);
        }
        return;
      }

      let message = result.msg || t("login.errorGeneric");
      if (
        typeof result.attemptsRemaining === "number" &&
        result.attemptsRemaining >= 0
      ) {
        message = `${message} ${t("login.attemptsRemaining", { count: result.attemptsRemaining })}`;
      }
      setError(message);

      if (result.lockout?.type === "ip" && result.lockout?.until) {
        const info = {
          type: "ip",
          until: result.lockout.until,
        };
        setLockoutInfo(info);
        try {
          localStorage.setItem(LOGIN_LOCKOUT_KEY, JSON.stringify(info));
          const registrationInfo = {
            type: "registration",
            until: result.lockout.until,
            message: t("login.ipLockRegistrationMessage"),
          };
          localStorage.setItem(
            REGISTRATION_LOCKOUT_KEY,
            JSON.stringify(registrationInfo),
          );
        } catch (storageError) {
          console.warn("Failed storing lockout info", storageError);
        }
      }
      return;
    }

    try {
      localStorage.removeItem(LOGIN_LOCKOUT_KEY);
      localStorage.removeItem(REGISTRATION_LOCKOUT_KEY);
    } catch (storageError) {
      console.warn("Failed clearing lockout storage", storageError);
    }

    setLockoutInfo(null);
    setLockoutCountdown("");
    setAccountLockInfo(null);
    setAccountLockCountdown("");

    toast.success(t("login.toastWelcome", { username: formData.username }));
    // Navigation will happen automatically via useEffect when isAuthenticated becomes true
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <PublicHeader showBackButton={true} />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-sm p-8 space-y-4">

        <h1 className="text-4xl font-bold">{t("login.title")}</h1>
        <p className="text-text-secondary">{t("login.subtitle")}</p>

        {isIpLockActive && (
          <div className="p-3 text-sm bg-secondary border border-border rounded-lg">
            <p className="font-medium text-text-primary">
              {lockoutInfo?.message || t("login.lockoutActive")}
            </p>
            {lockoutCountdown && (
              <p className="mt-1 text-text-secondary">
                {t("login.lockoutCountdown", { time: lockoutCountdown })}
              </p>
            )}
          </div>
        )}

        {accountLockInfo && (
          <div className="p-3 text-sm bg-secondary border border-border rounded-lg">
            <p className="font-medium text-text-primary">
              {t("login.userLockNotice", { time: accountLockCountdown })}
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-danger bg-danger/10 border border-custom-danger/20 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              {t("login.usernameLabel")}
            </label>
            <input
              type="text"
              name="username"
              id="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isFormDisabled}
              className="w-full px-4 py-3 text-text-primary bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-secondary"
            />
          </div>

          <PasswordInput
            label={t("login.passwordLabel")}
            name="password"
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isFormDisabled}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              name="rememberMe"
              id="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              disabled={isFormDisabled}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 text-sm text-text-secondary"
            >
              {t("login.rememberMe")}
            </label>
          </div>

          <button
            type="submit"
            disabled={isFormDisabled}
            className="w-full py-4 mt-2 font-bold text-white bg-primary rounded-xl hover:opacity-85 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {t("login.submit")}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-sm text-text-secondary">
            {t("login.noAccount")}{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              {t("login.registerLink")}
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LoginPage;
