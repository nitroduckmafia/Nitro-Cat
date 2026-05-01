import { WaitlistButton } from "./WaitlistButton";

export const Header = () => {
  return (
    <div className="dashboard-top-actions">
      <a href="mailto:mafia@nitroduck.tech" className="dashboard-contact-link">
        Contact us
      </a>
      <WaitlistButton className="dashboard-waitlist-btn">Join the waitlist</WaitlistButton>
    </div>
  );
};
