// client/src/components/ApiHealthCheck.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { IoCheckmarkCircle, IoCloseCircle, IoRefresh } from "react-icons/io5";
import { apiBase } from "../api/http";

const ApiHealthCheck = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [healthStatus, setHealthStatus] = useState({});
  const [loading, setLoading] = useState(false);

  const endpoints = [
    { name: "Health Check", url: "/health", auth: false },
    { name: "User Data", url: "/users/me", auth: true },
    { name: "User Stats", url: "/stats", auth: true },
    { name: "User Relapses", url: "/relapses", auth: true },
    { name: "Public Rankings", url: "/stats/rankings", auth: true },
  ];

  const checkEndpoint = async (endpoint) => {
    try {
      const response = await fetch(
        `${apiBase}${endpoint.url}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      return {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        data: response.ok ? await response.json() : null,
      };
    } catch (error) {
      return {
        status: 0,
        ok: false,
        statusText: error.message,
        data: null,
      };
    }
  };

  const runHealthCheck = async () => {
    setLoading(true);
    const results = {};

    for (const endpoint of endpoints) {
      const result = await checkEndpoint(endpoint);
      results[endpoint.name] = {
        ...result,
        endpoint: endpoint.url,
        requiresAuth: endpoint.auth,
      };
    }

    setHealthStatus(results);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  const getStatusIcon = (result) => {
    if (result.ok) {
      return <IoCheckmarkCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <IoCloseCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (result) => {
    if (result.ok) return "text-green-600";
    if (result.status === 401) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusDescription = (result) => {
    if (result.ok) return "Working";
    if (result.status === 401) return "Unauthorized (Login Required)";
    if (result.status === 404) return "Not Found";
    if (result.status === 0) return "Connection Failed";
    return `Error ${result.status}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg rounded-2xl border border-border max-w-3xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">
                API Health Check
              </h2>
              <p className="text-text-secondary">
                Check connection status to all API endpoints
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={runHealthCheck}
                disabled={loading}
                className="p-2 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <IoRefresh
                  className={`w-5 h-5 text-text-secondary ${loading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <span className="text-xl text-text-secondary">&times;</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <IoRefresh className="w-8 h-8 text-primary animate-spin" />
                <p className="text-text-secondary">Testing API endpoints...</p>
              </div>
            </div>
          ) : Object.keys(healthStatus).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-text-secondary">
                Click refresh to test endpoints
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(healthStatus).map(([name, result]) => (
                <div
                  key={name}
                  className="p-4 rounded-lg border border-border bg-surface"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result)}
                      <span className="font-semibold text-text-primary">
                        {name}
                      </span>
                      {result.requiresAuth && (
                        <span className="px-2 py-1 bg-yellow-500/10 text-yellow-600 text-xs rounded-full border border-yellow-500/20">
                          Auth Required
                        </span>
                      )}
                    </div>
                    <span className={`font-medium ${getStatusColor(result)}`}>
                      {getStatusDescription(result)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-text-secondary">Endpoint:</span>
                      <code className="ml-2 px-2 py-1 bg-secondary rounded text-xs">
                        {result.endpoint}
                      </code>
                    </div>
                    <div>
                      <span className="text-text-secondary">Status:</span>
                      <span
                        className={`ml-2 font-mono ${getStatusColor(result)}`}
                      >
                        {result.status} {result.statusText}
                      </span>
                    </div>
                  </div>

                  {result.data && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                        Show Response Data
                      </summary>
                      <pre className="mt-2 p-3 bg-secondary rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/50">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <div>
              <strong>API Base URL:</strong> {apiBase}
            </div>
            <div>Last check: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiHealthCheck;
