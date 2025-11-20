const BROWSER_PATTERNS = [
  { name: "Microsoft Edge", regex: /edg\/([\d.]+)/i },
  { name: "Opera", regex: /op(?:era|r)\/([\d.]+)/i },
  { name: "Firefox", regex: /firefox\/([\d.]+)/i },
  { name: "Samsung Internet", regex: /samsungbrowser\/([\d.]+)/i },
  { name: "Chrome", regex: /chrome\/([\d.]+)/i, exclude: /edg|opr|brave/i },
  { name: "Brave", regex: /brave\/([\d.]+)/i },
  { name: "Safari", regex: /version\/([\d.]+).*safari/i },
];

const OS_PATTERNS = [
  { name: "iPhone", regex: /iphone/i },
  { name: "iPad", regex: /ipad/i },
  { name: "Android", regex: /android/i },
  { name: "Windows", regex: /windows nt/i },
  { name: "macOS", regex: /macintosh|mac os x/i },
  { name: "Linux", regex: /linux/i },
];

export const summarizeUserAgent = (userAgent) => {
  if (typeof userAgent !== "string" || userAgent.trim().length === 0) {
    return {
      device: "Unknown device",
      browser: "Unknown browser",
      summary: "Unknown device · Unknown browser",
    };
  }

  const ua = userAgent.trim();

  const osMatch =
    OS_PATTERNS.find((pattern) => pattern.regex.test(ua))?.name ||
    "Unknown device";

  const browserEntry = BROWSER_PATTERNS.find((pattern) => {
    if (pattern.exclude && pattern.exclude.test(ua)) {
      return false;
    }
    return pattern.regex.test(ua);
  });

  const browserVersionMatch = browserEntry
    ? ua.match(browserEntry.regex)?.[1]
    : null;

  const browserName = browserEntry?.name || "Unknown browser";
  const browserVersion = browserVersionMatch
    ? browserVersionMatch.split(".")[0]
    : null;
  const browserLabel = browserVersion
    ? `${browserName} ${browserVersion}`
    : browserName;

  const summary = `${osMatch} · ${browserLabel}`;

  return {
    device: osMatch,
    browser: browserLabel,
    summary,
  };
};

