import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "@/lib/context/SidebarContext";

const MobileBackdrop = () => {
  const { mobileOpen, setMobileOpen, isMobile } = useSidebar();
  if (!isMobile || !mobileOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
      onClick={() => setMobileOpen(false)}
      aria-hidden="true"
    />
  );
};

export const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <MobileBackdrop />
        <div className="relative flex flex-col flex-1 overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
