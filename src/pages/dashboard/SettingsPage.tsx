import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: Array<{ id: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }> = [
  { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

export const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    toast({ title: 'Theme updated', description: `Theme set to ${newTheme}.` });
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-lg mx-auto space-y-8">
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure your NitroCat experience</p>
        </div>

        {/* Appearance */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Appearance</h2>
            <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
          </div>
          <div className="flex gap-3">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleThemeChange(opt.id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-all",
                  theme === opt.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/50 hover:text-foreground"
                )}
              >
                {opt.icon}
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
