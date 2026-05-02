import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "@/lib/context/SidebarContext";
import {
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
  Gamepad2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen, isMobile } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const go = (path: string) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };

  // On mobile, the sidebar is always shown in expanded width when open.
  const showFull = isMobile ? true : !collapsed;

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border shrink-0",
        // Desktop: in-flow, width animates between collapsed/expanded
        "md:static md:transition-all md:duration-300",
        collapsed ? "md:w-14" : "md:w-64",
        // Mobile: fixed drawer that slides in from the left
        "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 md:transform-none md:transition-all",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
      aria-hidden={isMobile && !mobileOpen}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        {showFull && (
          <button
            onClick={() => go('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/images/nitroduck-logo.png" className="h-9 w-9 object-contain shrink-0" alt="" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-foreground">NitroCat</span>
              <span className="text-[11px] font-medium text-muted-foreground">by NitroDuck</span>
            </span>
          </button>
        )}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:text-foreground"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Find Biocatalyst Button */}
      <div className="p-2 pb-2">
        <Button
          onClick={() => go('/reactions/new')}
          variant="outline"
          className={cn(
            "w-full border-dashed border-sidebar-border text-sidebar-foreground hover:text-foreground hover:border-primary",
            showFull ? "justify-start" : "px-0 justify-center"
          )}
          size="sm"
        >
          <Plus className="w-4 h-4" />
          {showFull && <span className="ml-2">Find Biocatalyst</span>}
        </Button>
      </div>

      {/* Nav links */}
      {showFull && (
        <div className="px-2 pb-2 space-y-1">
          <button
            onClick={() => go('/demo')}
            className={cn(
              "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
              isActive('/demo')
                ? "bg-accent text-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}
          >
            <Gamepad2 className="w-4 h-4" />
            Game
          </button>
          <button
            onClick={() => go('/history')}
            className={cn(
              "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
              isActive('/history')
                ? "bg-accent text-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>
      )}

      {/* Session history — empty for now */}
      <div className="flex-1 overflow-y-auto" />

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <Button
          variant="ghost"
          onClick={() => go('/settings')}
          className={cn(
            "w-full text-sidebar-foreground hover:text-foreground",
            showFull ? "justify-start" : "px-0 justify-center",
            isActive('/settings') && "bg-accent text-accent-foreground"
          )}
          size="sm"
        >
          <Settings className="w-4 h-4" />
          {showFull && <span className="ml-2">Settings</span>}
        </Button>
      </div>
    </aside>
  );
};
