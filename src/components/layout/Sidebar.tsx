import { useNavigate, useLocation } from "react-router-dom";
import { useSidebar } from "@/lib/context/SidebarContext";
import {
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
  Gamepad2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const { collapsed, setCollapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-sidebar-border">
        {!collapsed && (
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/images/nitroduck-logo.png" className="h-9 w-9 object-contain shrink-0" alt="" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-foreground">NitroCat</span>
              <span className="text-[11px] font-medium text-muted-foreground">by NitroDuck</span>
            </span>
          </button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:text-foreground"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Find Biocatalyst Button */}
      <div className="p-2 pb-2">
        <Button
          onClick={() => navigate('/reactions/new')}
          variant="outline"
          className={cn(
            "w-full border-dashed border-sidebar-border text-sidebar-foreground hover:text-foreground hover:border-primary",
            collapsed ? "px-0 justify-center" : "justify-start"
          )}
          size="sm"
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Find Biocatalyst</span>}
        </Button>
      </div>

      {/* Nav links */}
      {!collapsed && (
        <div className="px-2 pb-2 space-y-1">
          <button
            onClick={() => navigate('/demo')}
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
            onClick={() => navigate('/history')}
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
          onClick={() => navigate('/settings')}
          className={cn(
            "w-full text-sidebar-foreground hover:text-foreground",
            collapsed ? "px-0 justify-center" : "justify-start",
            isActive('/settings') && "bg-accent text-accent-foreground"
          )}
          size="sm"
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Settings</span>}
        </Button>
      </div>
    </aside>
  );
};
