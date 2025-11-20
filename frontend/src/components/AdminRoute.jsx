// client/src/components/AdminRoute.jsx
import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import MainLayout from "./MainLayout";
import { useTranslation } from "react-i18next";

const AdminRoute = ({ isSidebarOpen, toggleSidebar }) => {
  const { userData, isLoading, isAuthenticated } = useContext(AuthContext);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        {t("common.loading")}
      </div>
    );
  }

  // Redirect unauthenticated users to landing page
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Redirect non-admin users to dashboard
  if (userData && userData.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return userData ? (
    <MainLayout isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
  ) : null;
};

export default AdminRoute;
