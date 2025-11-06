import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WalkTracking = lazy(() => import("./pages/WalkTracking"));
const Profile = lazy(() => import("./pages/Profile"));
const MyWalks = lazy(() => import("./pages/MyWalks"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const GenerateQR = lazy(() => import("./pages/GenerateQR"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando…</div>}>
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
