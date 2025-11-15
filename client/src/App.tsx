import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Home from "@/pages/Home";
import ArticlePage from "@/pages/ArticlePage";
import AdminDashboard from "@/pages/AdminDashboard";
import ArticleEditor from "@/pages/ArticleEditor";
import NotFound from "@/pages/not-found";
import RiverConditions from "@/pages/RiverConditions";
import Weather from "@/pages/Weather"; // ✅ Added import for Weather page

// --------------------------------------
// All app routes live here
// --------------------------------------
function AppRouter() {
  return (
    <Switch>
      {/* Existing routes */}
      <Route path="/" component={Home} />
      <Route path="/article/:id" component={ArticlePage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/new" component={ArticleEditor} />
      <Route path="/admin/edit/:id" component={ArticleEditor} />

      {/* ✅ New pages */}
      <Route path="/river-conditions" component={RiverConditions} />
      <Route path="/weather" component={Weather} /> {/* <-- Added Weather route */}

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

// --------------------------------------
// App wrapper with providers + Wouter Router
// --------------------------------------
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
