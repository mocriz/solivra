// client/src/utils/debugLogger.js
const isDev = import.meta.env.DEV;
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";
const STORAGE_PREFIX = "continuum_dev_debug_log_v1_";
const MAX_ENTRIES = 1000;

const createEntry = (label, details) => ({
  timestamp: new Date().toISOString(),
  label,
  details,
});

const safeSerialize = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
};

const knownKeys = new Set();
const logStore = new Map();
let activeKey = "anonymous";

const registerKey = (key) => {
  if (!key) return;
  knownKeys.add(key);
};

if (isDev && isBrowser) {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      registerKey(key.slice(STORAGE_PREFIX.length));
    }
  }
}
registerKey(activeKey);

const storageKeyFor = (key) => `${STORAGE_PREFIX}${key}`;

const readStoredEntries = (key) => {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(storageKeyFor(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

const persistEntries = (key, entries) => {
  if (!isBrowser) return;
  try {
    if (!entries || entries.length === 0) {
      window.localStorage.removeItem(storageKeyFor(key));
      return;
    }
    window.localStorage.setItem(storageKeyFor(key), JSON.stringify(entries));
  } catch {
    // Swallow quota errors silently
  }
};

const ensureBucket = (key) => {
  if (!logStore.has(key)) {
    const stored = readStoredEntries(key);
    if (stored.length > MAX_ENTRIES) {
      stored.splice(0, stored.length - MAX_ENTRIES);
      persistEntries(key, stored);
    }
    logStore.set(key, stored);
    registerKey(key);
  }
  return logStore.get(key);
};

export const setDebugUser = (key, context = {}) => {
  if (!isDev) return;
  activeKey = key || "anonymous";
  ensureBucket(activeKey);
  registerKey(activeKey);
  debugLog("debug:user_context_set", { userKey: activeKey, context });
};

export const debugLog = (label, payload) => {
  if (!isDev) return;
  const entry = createEntry(label, safeSerialize(payload));
  const bucket = ensureBucket(activeKey);
  bucket.push(entry);
  if (bucket.length > MAX_ENTRIES) {
    bucket.splice(0, bucket.length - MAX_ENTRIES);
  }
  persistEntries(activeKey, bucket);
  if (typeof console !== "undefined" && console.debug) {
    console.debug(`[debug:${label}]`, entry);
  }
};

export const getDebugEntries = (key = activeKey) => {
  if (!isDev) return [];
  const bucket = ensureBucket(key);
  return bucket.slice();
};

export const getDebugLogText = (key = activeKey) => {
  if (!isDev) return "";
  const entries = getDebugEntries(key);
  return entries
    .map(({ timestamp, label, details }) => {
      const serialized =
        details === undefined
          ? ""
          : typeof details === "string"
            ? details
            : JSON.stringify(details, null, 2);
      return `[${timestamp}] ${label}${serialized ? `\n${serialized}` : ""}`;
    })
    .join("\n\n");
};

export const clearDebugLogs = (key = activeKey) => {
  if (!isDev) return;
  logStore.set(key, []);
  if (isBrowser) {
    window.localStorage.removeItem(storageKeyFor(key));
  }
  registerKey(key);
};

export const getActiveDebugUser = () => (isDev ? activeKey : null);

export const listDebugUsers = () => {
  if (!isDev) return [];
  const keys = new Set(knownKeys);
  for (const key of logStore.keys()) {
    keys.add(key);
  }
  return Array.from(keys).sort();
};
