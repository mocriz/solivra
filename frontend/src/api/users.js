import apiClient, { parseError } from "../utils/apiClient";

export const getUserData = async () => {
  try {
    const response = await apiClient.get("/users/me");
    return response.data;
  } catch (error) {
    throw parseError(error, "Gagal memuat data pengguna");
  }
};

export const updateProfile = async (formData) => {
  try {
    const res = await apiClient.put("/users/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal memperbarui profil");
  }
};

export const updatePassword = async (passwords) => {
  try {
    const res = await apiClient.put("/users/password", passwords);
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal memperbarui password");
  }
};

export const deleteAccount = async (password) => {
  try {
    const res = await apiClient.delete("/users", { data: { password } });
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal menghapus akun");
  }
};

export const removeProfilePicture = async () => {
  try {
    const res = await apiClient.delete("/users/profile-picture");
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal menghapus foto profil");
  }
};

export const startStreak = async (startTime) => {
  try {
    const res = await apiClient.post("/users/start-streak", {
      start_time: startTime,
    });
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal memulai streak");
  }
};

export const getUserSessions = async () => {
  try {
    const res = await apiClient.get("/users/sessions");
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal memuat sesi pengguna");
  }
};

export const revokeUserSession = async (sessionId) => {
  try {
    const res = await apiClient.delete(`/users/sessions/${sessionId}`);
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal mengakhiri sesi");
  }
};

export const updateLanguagePreference = async (language) => {
  try {
    const res = await apiClient.put("/users/language", { language });
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal memperbarui bahasa");
  }
};
