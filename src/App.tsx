import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthProvider } from "@/lib/auth/context";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";
import NewReactionPage from "@/pages/NewReactionPage";
import HistoryPage from "@/pages/dashboard/HistoryPage";
import DemoPage from "@/pages/dashboard/DemoPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import TestReactionPage from "@/pages/dashboard/TestReactionPage";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              {/* Dashboard routes wrapped in DashboardLayout */}
              <Route element={<DashboardLayout />}>
                <Route path="/reactions/new" element={<NewReactionPage />} />
                <Route path="/reactions/test/result" element={<TestReactionPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
