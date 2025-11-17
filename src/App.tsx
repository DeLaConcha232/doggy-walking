import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WhatsAppButton from "@/components/WhatsAppButton";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const WalkTracking = lazy(() => import("./pages/WalkTracking"));
const Profile = lazy(() => import("./pages/Profile"));
const MyWalks = lazy(() => import("./pages/MyWalks"));
const ScanQR = lazy(() => import("./pages/ScanQR"));
const GenerateQR = lazy(() => import("./pages/GenerateQR"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          </div>
        }>
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
          <WhatsAppButton />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
