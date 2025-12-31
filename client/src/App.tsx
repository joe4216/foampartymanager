import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import OwnerSidebar from "@/components/OwnerSidebar";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/HomePage";
import OwnerDashboard from "@/pages/OwnerDashboard";
import CalendarView from "@/pages/CalendarView";
import KanbanView from "@/pages/KanbanView";
import PaymentsSettings from "@/pages/PaymentsSettings";
import IntegrationsPage from "@/pages/IntegrationsPage";
import NewsFeedPage from "@/pages/NewsFeedPage";
import AuthPage from "@/pages/AuthPage";
import BookingSuccess from "@/pages/BookingSuccess";
import BookingCancelled from "@/pages/BookingCancelled";
import VenmoBookingSuccess from "@/pages/VenmoBookingSuccess";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function OwnerLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <OwnerSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="md:hidden flex items-center gap-3 p-4 border-b bg-background sticky top-0 z-10">
            <SidebarTrigger data-testid="button-mobile-menu" />
            <h1 className="font-semibold font-['Poppins']">Foam Works Party Co</h1>
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/booking-success" component={BookingSuccess} />
      <Route path="/booking-cancelled" component={BookingCancelled} />
      <Route path="/venmo-booking-success" component={VenmoBookingSuccess} />
      <ProtectedRoute 
        path="/owner/dashboard" 
        component={() => (
          <OwnerLayout>
            <OwnerDashboard />
          </OwnerLayout>
        )}
      />
      <ProtectedRoute 
        path="/owner/calendar" 
        component={() => (
          <OwnerLayout>
            <CalendarView />
          </OwnerLayout>
        )}
      />
      <ProtectedRoute 
        path="/owner/kanban" 
        component={() => (
          <OwnerLayout>
            <KanbanView />
          </OwnerLayout>
        )}
      />
      <ProtectedRoute 
        path="/owner/payments" 
        component={() => (
          <OwnerLayout>
            <PaymentsSettings />
          </OwnerLayout>
        )}
      />
      <ProtectedRoute 
        path="/owner/integrations" 
        component={() => (
          <OwnerLayout>
            <IntegrationsPage />
          </OwnerLayout>
        )}
      />
      <ProtectedRoute 
        path="/owner/news-feed" 
        component={() => (
          <OwnerLayout>
            <NewsFeedPage />
          </OwnerLayout>
        )}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
