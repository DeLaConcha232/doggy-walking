import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ScanQR from "./pages/ScanQR";
import GenerateQR from "./pages/GenerateQR";
import WalkTracking from "./pages/WalkTracking";
import MyWalks from "./pages/MyWalks";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import WalkerDashboard from "./pages/WalkerDashboard";
import Discover from "./pages/Discover";
import Settings from "./pages/Settings";
import MyRequests from "./pages/MyRequests";
import WalkerRequests from "./pages/WalkerRequests";
import MyWalkers from "./pages/MyWalkers";
import WhatsAppButton from "./components/WhatsAppButton";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/my-requests" element={<MyRequests />} />
            <Route path="/my-walkers" element={<MyWalkers />} />
            <Route path="/scan-qr" element={<ScanQR />} />
            <Route path="/generate-qr" element={<GenerateQR />} />
            <Route path="/walk/:walkId" element={<WalkTracking />} />
            <Route path="/my-walks" element={<MyWalks />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/walker-dashboard" element={<WalkerDashboard />} />
            <Route path="/walker-requests" element={<WalkerRequests />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <WhatsAppButton />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
