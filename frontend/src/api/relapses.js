// client/src/api/relapses.js
import apiClient, { parseError } from "../utils/apiClient";
import { debugLog } from "../utils/debugLogger";

export const addRelapse = async (relapseData) => {
  try {
    debugLog("relapses:add_request", relapseData);
    const res = await apiClient.post("/relapses", relapseData);
    debugLog("relapses:add_success", res.data);
    return res.data;
  } catch (error) {
    debugLog("relapses:add_error", {
      message: error?.message,
      status: error?.status,
    });
    throw parseError(error, "Failed to add relapse");
  }
};

export const getUserRelapses = async () => {
  try {
    debugLog("relapses:list_request");
    const res = await apiClient.get("/relapses");
    debugLog("relapses:list_success", { count: Array.isArray(res.data) ? res.data.length : null });
    return res.data;
  } catch (error) {
    debugLog("relapses:list_error", {
      message: error?.message,
      status: error?.status,
    });
    throw parseError(error, "Failed to get relapses");
  }
};

export const updateRelapse = async (relapseId, relapseData) => {
  try {
    debugLog("relapses:update_request", { relapseId, relapseData });
    const res = await apiClient.put(`/relapses/${relapseId}`, relapseData);
    debugLog("relapses:update_success", res.data);
    return res.data;
  } catch (error) {
    debugLog("relapses:update_error", {
      relapseId,
      message: error?.message,
      status: error?.status,
    });
    throw parseError(error, "Failed to update relapse");
  }
};

export const deleteRelapse = async (relapseId) => {
  try {
    debugLog("relapses:delete_request", { relapseId });
    const res = await apiClient.delete(`/relapses/${relapseId}`);
    debugLog("relapses:delete_success", res.data);
    return res.data;
  } catch (error) {
    debugLog("relapses:delete_error", {
      relapseId,
      message: error?.message,
      status: error?.status,
    });
    throw parseError(error, "Failed to delete relapse");
  }
};

export const deleteAllRelapses = async () => {
  try {
    debugLog("relapses:delete_all_request");
    const res = await apiClient.delete("/relapses");
    debugLog("relapses:delete_all_success", res.data);
    return res.data;
  } catch (error) {
    debugLog("relapses:delete_all_error", {
      message: error?.message,
      status: error?.status,
    });
    throw parseError(error, "Failed to delete all relapses");
  }
};
