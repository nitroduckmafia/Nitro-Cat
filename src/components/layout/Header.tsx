import { Mail, Menu } from "lucide-react";
import { useSidebar } from "@/lib/context/SidebarContext";
import { WaitlistButton } from "./WaitlistButton";

export const Header = () => {
  const { setMobileOpen } = useSidebar();
  return (
    <>
      <button
        type="button"
        className="dashboard-mobile-menu-btn md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="dashboard-top-actions">
        <a
          href="mailto:mafia@nitroduck.tech"
          className="dashboard-contact-link"
          aria-label="Contact us"
        >
          <Mail className="w-3.5 h-3.5 sm:hidden" />
          <span className="hidden sm:inline">Contact us</span>
        </a>
        <WaitlistButton className="dashboard-waitlist-btn">
          <span className="sm:hidden">Waitlist</span>
          <span className="hidden sm:inline">Join the waitlist</span>
        </WaitlistButton>
      </div>
    </>
  );
};
