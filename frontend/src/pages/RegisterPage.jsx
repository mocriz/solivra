// src/pages/RegisterPage.jsx
import { useState, useEffect, useMemo, useCallback, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { registerUser } from "../api/auth";
import axios from "axios";
import PasswordInput from "../components/PasswordInput";
import Turnstile from "../components/Turnstile";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../context/AuthContext";
import { apiBase } from "../api/http";
import PublicHeader from "../components/PublicHeader";
import {
  canonicalizeUsername,
  sanitizeUsernameInput,
  USERNAME_PATTERN,
  isStrongPassword,
} from "../utils/validation";

const REGISTRATION_LOCKOUT_KEY = "security:registration-lockout";

const readStoredLockout = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REGISTRATION_LOCKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.until) {
      localStorage.removeItem(REGISTRATION_LOCKOUT_KEY);
      return null;
    }
    if (new Date(parsed.until).getTime() <= Date.now()) {
      localStorage.removeItem(REGISTRATION_LOCKOUT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const formatRemaining = (ms) => {
  if (ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes} menit ${seconds.toString().padStart(2, "0")} detik`;
  }
  return `${seconds} detik`;
};

const RegisterPage = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    nickname: "",
    username: "",
    password: "",
    confirm_password: "",
  });
  const [lockoutInfo, setLockoutInfo] = useState(() => readStoredLockout());
  const [lockoutCountdown, setLockoutCountdown] = useState("");
  const navigate = useNavigate();

  const [usernameStatus, setUsernameStatus] = useState("idle");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState(null);

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
          localStorage.removeItem(REGISTRATION_LOCKOUT_KEY);
        } catch {
          // ignore storage errors
        }
        return;
      }
      setLockoutCountdown(formatRemaining(diff));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lockoutInfo]);

  useEffect(() => {
    const raw = formData.username;

    if (!raw) {
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }

    const sanitized = sanitizeUsernameInput(raw);
    if (sanitized !== raw) {
      setFormData((prev) => ({ ...prev, username: sanitized }));
    }

    const canonical = canonicalizeUsername(sanitized);

    if (canonical.length === 0) {
      setUsernameStatus("invalid");
      setUsernameMessage(t("register.usernameRequired"));
      return;
    }

    if (!USERNAME_PATTERN.test(canonical)) {
      setUsernameStatus("invalid");
      setUsernameMessage(t("register.usernameInvalid"));
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();

    setUsernameStatus("checking");
    setUsernameMessage("");

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${apiBase}/users/check-username/${canonical}`,
          { withCredentials: true, signal: controller.signal },
        );
        if (isCancelled) return;
        const currentCanonical = canonicalizeUsername(formData.username);
        if (currentCanonical !== canonical) {
          return;
        }
        if (res.data?.available) {
          setUsernameStatus("available");
          setUsernameMessage("");
        } else {
          setUsernameStatus("taken");
          setUsernameMessage("");
        }
      } catch (error) {
        if (controller.signal.aborted || error?.code === "ERR_CANCELED") {
          return;
        }
        setUsernameStatus("error");
        setUsernameMessage(t("register.usernameCheckFailed"));
      }
    }, 400);

    return () => {
      isCancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [formData.username, t]);

  const handleTurnstileVerify = useCallback((token) => {
    setTurnstileToken(token); // enable tombol
  }, []);

  const handleTurnstileFail = useCallback(() => {
    setTurnstileToken(null); // disable tombol
  }, []);

  const isLockoutActive = Boolean(
    lockoutInfo && new Date(lockoutInfo.until).getTime() > Date.now(),
  );

  const isChecking = usernameStatus === "checking";
  const isUsernameAvailable = usernameStatus === "available";
  const usernameHasError = ["invalid", "taken", "error"].includes(
    usernameStatus,
  );

  const usernameHelperText = useMemo(() => {
    switch (usernameStatus) {
      case "checking":
        return t("register.usernameChecking");
      case "invalid":
        return usernameMessage || t("register.usernameInvalid");
      case "taken":
        return usernameMessage || t("register.usernameTaken");
      case "available":
        return usernameMessage || t("register.usernameAvailable");
      case "error":
        return usernameMessage || t("register.usernameCheckFailed");
      default:
        return "";
    }
  }, [usernameStatus, usernameMessage, t]);

  const isPasswordStrong = isStrongPassword(formData.password);
  const isPasswordInvalid = formData.password.length > 0 && !isPasswordStrong;
  const passwordHelperText = isPasswordInvalid
    ? t("register.passwordRequirements")
    : "";

  const usernameInputClasses = `w-full px-4 py-3 text-text-primary bg-surface border ${
    usernameHasError
      ? "border-danger focus:ring-[var(--custom-danger)]"
      : "border-border focus:ring-primary focus:border-primary"
  } rounded-xl focus:outline-none focus:ring-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-secondary`;

  const isFormValid = useMemo(() => {
    const canonical = canonicalizeUsername(formData.username);

    return (
      formData.nickname.trim() !== "" &&
      canonical.length >= 1 &&
      formData.password === formData.confirm_password &&
      isPasswordStrong &&
      isUsernameAvailable &&
      !isChecking &&
      !!turnstileToken &&
      !isLockoutActive
    );
  }, [
    formData.nickname,
    formData.username,
    formData.password,
    formData.confirm_password,
    isPasswordStrong,
    isUsernameAvailable,
    isChecking,
    turnstileToken,
    isLockoutActive,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "username") {
      const sanitized = sanitizeUsernameInput(value);
      setFormData((prev) => ({ ...prev, username: sanitized }));
      setUsernameStatus("idle");
      setUsernameMessage("");
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Don't render register form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLockoutActive) {
      toast.error(lockoutInfo?.message || t("register.lockoutActive"));
      return;
    }
    if (!isFormValid) {
      toast.error(t("register.errorIncomplete"));
      return;
    }

    const loadingToast = toast.loading(t("register.loading"));
    try {
      const { confirm_password: _ignored, ...rest } = formData;
      const payload = {
        ...rest,
        username: canonicalizeUsername(rest.username),
      };

      // kirim token ke server juga kalau endpoint lu verifikasi turnstile
      // payload.cf_turnstile_token = turnstileToken;

      await registerUser(payload);
      try {
        localStorage.removeItem(REGISTRATION_LOCKOUT_KEY);
      } catch {
        // ignore
      }
      setLockoutInfo(null);
      setLockoutCountdown("");
      toast.success(t("register.success"), { id: loadingToast });
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || t("register.errorGeneral"), {
        id: loadingToast,
      });
      if (err?.data?.lockout?.until) {
        const info = {
          type: err.data.lockout.type,
          until: err.data.lockout.until,
          message: err.message || t("register.lockoutActive"),
        };
        setLockoutInfo(info);
        try {
          localStorage.setItem(REGISTRATION_LOCKOUT_KEY, JSON.stringify(info));
        } catch {
          // ignore storage errors
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <PublicHeader showBackButton={true} />

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
      <div className="w-full max-w-sm p-8 space-y-4">

        <h1 className="text-4xl font-bold">{t("register.title")}</h1>
        <p className="text-text-secondary">{t("register.subtitle")}</p>

        {isLockoutActive && (
          <div className="p-3 text-sm bg-secondary border border-border rounded-lg">
            <p className="font-medium text-text-primary">
              {lockoutInfo?.message || t("register.lockoutActive")}
            </p>
            {lockoutCountdown && (
              <p className="mt-1 text-text-secondary">
                {t("register.lockoutCountdown", { time: lockoutCountdown })}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              {t("register.nicknameLabel")}
            </label>
            <input
              type="text"
              id="nickname"
              name="nickname"
              autoComplete="name"
              value={formData.nickname}
              onChange={handleChange}
              required
              disabled={isLockoutActive}
              className="w-full px-4 py-3 text-text-primary bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-secondary"
            />
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-text-secondary mb-2"
            >
              {t("register.usernameLabel")}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={isLockoutActive}
              className={usernameInputClasses}
            />
            {usernameHelperText ? (
              <p
                className={`text-xs mt-1 ${
                  usernameStatus === "available"
                    ? "text-success"
                    : usernameHasError
                      ? "text-danger"
                      : "text-text-secondary"
                }`}
              >
                {usernameHelperText}
              </p>
            ) : null}
          </div>

          <PasswordInput
            label={t("register.passwordLabel")}
            name="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={isLockoutActive}
            isInvalid={isPasswordInvalid}
            helperText={passwordHelperText}
            autoComplete="new-password"
          />
          <PasswordInput
            label={t("register.passwordConfirmLabel")}
            name="confirm_password"
            id="confirm_password"
            value={formData.confirm_password}
            onChange={handleChange}
            required
            disabled={isLockoutActive}
            autoComplete="new-password"
          />

          <div
            className={`flex justify-center pt-2 ${isLockoutActive ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Turnstile
              onVerify={handleTurnstileVerify}
              onFail={handleTurnstileFail}
            />
          </div>

          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full py-4 mt-2 font-bold text-white bg-primary rounded-xl hover:opacity-85 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {t("register.submit")}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-sm text-text-secondary">
            {t("register.alreadyHaveAccount")}{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              {t("register.loginLink")}
            </Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default RegisterPage;
