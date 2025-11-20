// client/src/api/admin.js
import apiClient, { parseError } from "../utils/apiClient";

export const getAdminDashboard = async () => {
  try {
    const res = await apiClient.get("/admin/dashboard");
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal memuat data dashboard admin");
  }
};

export const getAdminLogs = async (params) => {
  try {
    const res = await apiClient.get("/admin/logs", { params });
    return res.data;
  } catch (error) {
    throw parseError(error, "Gagal memuat log admin");
  }
};
