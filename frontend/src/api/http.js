import axios from "axios";

const apiOrigin =
  import.meta.env.VITE_API_BASE ||
  (import.meta.env.PROD
    ? "https://opposite-bessy-kiizzki-53d11d96.koyeb.app/"
    : "http://localhost:5000"); // Standardize on localhost:5000 for dev to match backend cookie domain

export const apiBase = `${apiOrigin.replace(/\/$/, "")}/api`;

export const http = axios.create({
  baseURL: apiBase,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default http;
