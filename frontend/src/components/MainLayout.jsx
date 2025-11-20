// client/src/components/MainLayout.jsx
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const MainLayout = ({
  isSidebarOpen,
  toggleSidebar,
  relapseModalTrigger,
  lastRelapseModalTrigger,
  markRelapseTriggerHandled,
}) => {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      {/* Beri ruang untuk sidebar di desktop, lebarnya disesuaikan */}
      <div
        className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? "md:ml-64" : "md:ml-20"}`}
      >
        <main className="pb-20 md:pb-0">
          <Outlet
            context={{
              relapseModalTrigger,
              lastRelapseModalTrigger,
              markRelapseTriggerHandled,
            }}
          />
        </main>
      </div>
      <Navbar /> {/* Navbar mobile tetap di bawah dan tidak berubah */}
    </div>
  );
};

export default MainLayout;
