// client/src/api/stats.js
import apiClient, { parseError } from "../utils/apiClient";

export const getStats = async () => {
  try {
    const res = await apiClient.get("/stats");
    return res.data;
  } catch (error) {
    throw parseError(error, "Failed to fetch stats");
  }
};

export const getRankings = async () => {
  try {
    const res = await apiClient.get("/stats/rankings");
    return res.data;
  } catch (error) {
    throw parseError(error, "Failed to get rankings");
  }
};
