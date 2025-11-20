// client/src/utils/api.js
import { apiBase } from "../api/http";

export const API_BASE = apiBase.replace(/\/+$/, "");
export const API_ORIGIN = API_BASE.replace(/\/api$/, "");

const buildUrl = (path) => {
  const normalisedPath = path.startsWith("/api/")
    ? path
    : `/api/${path.replace(/^\/+/, "")}`;
  return `${API_ORIGIN}${normalisedPath}`;
};

// simple wrapper untuk GET yang include cookie
export async function apiGet(path) {
  const res = await fetch(buildUrl(path), {
    method: "GET",
    credentials: "include", // penting: kirim cookie httpOnly
    headers: {
      Accept: "application/json",
    },
  });
  return res;
}

// checkAuth: panggil /api/users/me atau /api/auth/me (sesuaikan route server lo)
export async function checkAuth() {
  try {
    const res = await apiGet("/api/users/me"); // pastiin route ini ada dan mengecek cookie
    if (!res.ok) return null;
    const data = await res.json();
    // return user object (atau minimal { id, username })
    return data;
  } catch (err) {
    console.error("checkAuth error", err);
    return null;
  }
}
