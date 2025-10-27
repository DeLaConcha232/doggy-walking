import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import WalkTracking from "./pages/WalkTracking";
import Profile from "./pages/Profile";
import MyWalks from "./pages/MyWalks";
import ScanQR from "./pages/ScanQR";
import GenerateQR from "./pages/GenerateQR";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/walk/:walkId" element={<WalkTracking />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-walks" element={<MyWalks />} />
          <Route path="/scan-qr" element={<ScanQR />} />
          <Route path="/generate-qr" element={<GenerateQR />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
