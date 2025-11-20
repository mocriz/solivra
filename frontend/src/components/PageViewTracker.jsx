import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { API_ORIGIN } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const TRACKED_PATHS = new Set(['/', '/login', '/register']);

const PageViewTracker = () => {
  const location = useLocation();
  const { userData } = useAuth();

  useEffect(() => {
    if (!TRACKED_PATHS.has(location.pathname)) {
      return undefined;
    }

    const controller = new AbortController();

    const body = {
      path: location.pathname,
    };

    if (userData?.username) {
      body.username = userData.username;
    }

    fetch(`${API_ORIGIN}/api/track-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify(body),
    }).catch(() => {});

    return () => controller.abort();
  }, [location.pathname, userData?.username]);

  return null;
};

export default PageViewTracker;
