// client/src/api/honeypot.js
import http from "./http";
import { parseError } from "../utils/apiClient";

export const logAdminAccess = async (
  fallbackMessage = "Failed to log admin access",
) => {
  try {
    const response = await http.get("/honeypot/admin-access");
    return response.data;
  } catch (error) {
    throw parseError(error, fallbackMessage);
  }
};
export const submitFakeLogin = async (
  credentials,
  fallbackMessage = "Login failed",
) => {
  try {
    const response = await http.post("/honeypot/admin-login", credentials);
    return response.data;
  } catch (error) {
    throw parseError(error, fallbackMessage);
  }
};
export const getHoneypotStats = async (
  fallbackMessage = "Failed to get honeypot stats",
) => {
  try {
    const response = await http.get("/honeypot/stats");
    return response.data;
  } catch (error) {
    throw parseError(error, fallbackMessage);
  }
};
