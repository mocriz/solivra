// client/src/components/Navbar.jsx
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoHome,
  IoTime,
  IoStatsChart,
  IoPerson,
  IoSettings,
} from "react-icons/io5";

const Navbar = () => {
  const { t } = useTranslation();
  const navItems = [
    { path: "/dashboard", label: t("navigation.dashboard"), icon: IoHome },
    { path: "/history", label: t("navigation.history"), icon: IoTime },
    { path: "/stats", label: t("navigation.stats"), icon: IoStatsChart },
    { path: "/profile", label: t("navigation.profile"), icon: IoPerson },
    { path: "/settings", label: t("navigation.settings"), icon: IoSettings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-sm md:hidden shadow z-50">
      <div className="mx-auto flex w-full max-w-3xl items-stretch gap-px px-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center justify-center gap-1  py-2 text-xs transition-all duration-200 ${
                  isActive
                    ? "border-b border-primary text-primary shadow-light"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`
              }
            >
              <Icon className="h-6 w-6" aria-hidden />
              <span className="sr-only">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
