// client/src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { useTranslation } from 'react-i18next';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { t } = useTranslation();
  const navItems = [
    { path: "/dashboard", label: t('navigation.dashboard') },
    { path: "/history", label: t('navigation.history') },
    { path: "/stats", label: t('navigation.stats') },
    { path: "/profile", label: t('navigation.profile') },
    { path: "/settings", label: t('navigation.settings') },
    { path: "/guide", label: t('navigation.guide') },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen  transition-all duration-300 ease-in-out ${
        isOpen ? "w-64 bg-surface" : "w-10"
      } hidden md:block`}
    >
      {/* Tombol Toggle yang menjadi bagian dari sidebar */}
      <div className={`absolute top-5 z-50 ${isOpen ? "right-[-0.5rem]" : "right-[-2rem]"}`}>
        <button
          onClick={toggleSidebar}
          // Desain Tombol (Tetap menggunakan yang ditingkatkan)
          className="h-14 w-14 bg-custom-accent hover:bg-custom-accent-dark text-white rounded-xl 
                   flex flex-col items-center justify-center transition-all duration-300 
                   focus:outline-none transform hover:scale-105 active:scale-95 space-y-1.5 cursor-pointer"
          aria-label="Toggle navigation"
        >
          {/* Bar Bagian Atas */}
          <span
            className={`block h-0.5 w-6 bg-sidebar rounded-full transition-all duration-300 ease-in-out ${
              isOpen ? "translate-y-2 rotate-45" : ""
            }`}
          ></span>

          {/* Bar Tengah */}
          <span
            className={`block h-0.5 w-6 bg-sidebar rounded-full transition-all duration-300 ease-in-out ${
              isOpen ? "opacity-0" : ""
            }`}
          ></span>

          {/* Bar Bagian Bawah */}
          <span
            className={`block h-0.5 w-6 bg-sidebar rounded-full transition-all duration-300 ease-in-out ${
              isOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          ></span>
        </button>
      </div>

      <div className="h-full px-6 py-8 overflow-y-auto overflow-x-hidden">
        <div
          className={`transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <h2 className="text-2xl font-bold text-text-primary mb-12">
            Solivra
          </h2>
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center p-3 rounded-lg  hover:bg-secondary hover:text-text-primary transition-colors duration-200
                                        ${
                                          isActive
                                            ? "bg-primary/10 border border-primary text-primary font-bold"
                                            : "text-text-secondary"
                                        }`
                  }
                >
                  <span className="ml-3">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
