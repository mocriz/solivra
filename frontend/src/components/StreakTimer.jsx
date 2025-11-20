// client/src/components/StreakTimer.jsx
import { useState, useEffect, useMemo } from "react";

const formatTimeDetailed = (totalSeconds) => {
  if (totalSeconds < 0) totalSeconds = 0;

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}hr`);
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}d`);

  if (parts.length === 1 && totalSeconds < 1) return "0d";
  return parts.join(" ");
};

const computeBaseSeconds = (initialSeconds, syncedAt, isRunning) => {
  const base = Math.floor(initialSeconds || 0);
  if (!isRunning || !syncedAt) {
    return base;
  }
  const elapsed = Math.max(0, Math.floor((Date.now() - syncedAt) / 1000));
  return base + elapsed;
};

const StreakTimer = ({ initialSeconds = 0, syncedAt = null, isRunning = true }) => {
  const baseSeconds = useMemo(
    () => computeBaseSeconds(initialSeconds, syncedAt, isRunning),
    [initialSeconds, syncedAt, isRunning],
  );

  const [seconds, setSeconds] = useState(baseSeconds);

  useEffect(() => {
    setSeconds(baseSeconds);
  }, [baseSeconds]);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, baseSeconds]);

  return <>{formatTimeDetailed(seconds)}</>;
};

export default StreakTimer;
