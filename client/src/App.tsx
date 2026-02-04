import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, ProtectedRoute } from "@/lib/auth";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import SubmissionsPage from "@/pages/submissions";
import SubmissionDetailPage from "@/pages/submission-detail";
import NewSubmissionPage from "@/pages/new-submission";
import OcrUploadPage from "@/pages/ocr-upload";
import OcrReviewPage from "@/pages/ocr-review";
import GoogleFormsPage from "@/pages/google-forms";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [location] = useLocation();

  if (location === "/login") {
    return <LoginPage />;
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/submissions" component={SubmissionsPage} />
          <Route path="/submissions/new" component={NewSubmissionPage} />
          <Route path="/submissions/:id" component={SubmissionDetailPage} />
          <Route path="/ocr" component={OcrUploadPage} />
          <Route path="/ocr/:id/review" component={OcrReviewPage} />
          <Route path="/google-forms" component={GoogleFormsPage} />
          <Route component={NotFound} />
        </Switch>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
