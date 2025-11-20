// client/src/api/auth.js
import apiClient, { parseError } from "../utils/apiClient";

export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post("/auth/login", credentials);
    return response.data;
  } catch (error) {
    throw parseError(error, "Login gagal");
  }
};

export const logoutUser = async () => {
  try {
    await apiClient.post("/auth/logout");
  } catch (error) {
    // Continue with logout even if server call fails
    console.warn("Server logout failed:", error);
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  } catch (error) {
    throw parseError(error, "Registrasi gagal");
  }
};
