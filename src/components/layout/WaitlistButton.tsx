import { useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type Props = {
  className?: string;
  children?: ReactNode;
};

export const WaitlistButton = ({ className, children = "Join the waitlist" }: Props) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const openDialog = () => {
    setSubmitted(false);
    setEmail("");
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setSubmitted(true);
  };

  return (
    <>
      <button type="button" onClick={openDialog} className={className}>
        {children}
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent className="max-w-sm p-0 gap-0 border-border rounded-2xl bg-white dark:bg-[#141C18]">
          <div className="p-6 flex flex-col gap-4">
            {!submitted ? (
              <>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold">Stay in the loop</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Be notified when NitroCat goes live and get early access to enzyme ordering.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    style={{ background: "var(--primary-500)", color: "#fff" }}
                    className="w-full py-[11px] rounded-[9px] text-[13.5px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    Notify me
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center text-4xl pt-1">✅</div>
                <div className="text-xl font-bold text-center">You're on the list!</div>
                <p className="text-sm text-muted-foreground text-center">
                  We'll let you know at <span className="text-foreground font-medium">{email}</span> when NitroCat launches.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: "var(--primary-500)", color: "#fff" }}
                  className="w-full py-[11px] rounded-[9px] text-[13.5px] font-semibold border-none cursor-pointer hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
