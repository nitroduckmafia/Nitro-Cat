import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/images/nitroduck-logo.png" className="h-8" alt="Nitroduck" />
          <span className="text-sm font-bold tracking-widest uppercase text-foreground">Nitroduck</span>
        </div>
      </header>

      {/* Hero */}
      <section className="min-h-[calc(100vh-57px)] flex flex-col items-center justify-center text-center">
        <h1 className="text-6xl font-bold tracking-tight text-foreground">NitroCat</h1>
        <div className="flex gap-4 mt-10">
          <Button
            variant="outline"
            className="group w-72 h-36 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 hover:text-primary transition-all flex flex-col gap-1"
            onClick={() => navigate('/reactions/new')}
          >
            <Upload className="w-7 h-7" />
            <span className="text-lg font-semibold">Find Biocatalyst</span>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
