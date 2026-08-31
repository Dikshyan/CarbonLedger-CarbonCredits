import { Switch, Route } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import CarbonHistory from "@/pages/CarbonHistory";
import MapsCharts from "@/pages/MapsCharts";
import ProjectRegistration from "@/pages/ProjectRegistration";
import Marketplace from "@/pages/Marketplace";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import NotFound from "@/pages/NotFound";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={false}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Switch>
                <Route path="/" component={Landing} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/carbon-history" component={CarbonHistory} />
                <Route path="/maps-charts" component={MapsCharts} />
                <Route path="/projects" component={ProjectRegistration} />
                <Route path="/projects/new" component={ProjectRegistration} />
                <Route path="/marketplace" component={Marketplace} />
                <Route path="/reports" component={Reports} />
                <Route path="/profile" component={Profile} />
                <Route component={NotFound} />
              </Switch>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
