import { Switch, Route } from "wouter";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import VerifierDashboard from "@/pages/VerifierDashboard";
import CarbonHistory from "@/pages/CarbonHistory";
import MapsCharts from "@/pages/MapsCharts";
import ProjectRegistration from "@/pages/ProjectRegistration";
import Marketplace from "@/pages/Marketplace";
import Reports from "@/pages/Reports";
import Profile from "@/pages/Profile";
import AIExplorer from "@/pages/AIExplorer";
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
                {/* Public Routes */}
                <Route path="/" component={Landing} />
                <Route path="/ai-explorer" component={AIExplorer} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/marketplace" component={Marketplace} />

                {/* Protected Routes */}
                <Route path="/dashboard">
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                </Route>
                <Route path="/admin">
                  <ProtectedRoute adminOnly allowedRoles={['Admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                </Route>
                <Route path="/verifier">
                  <ProtectedRoute allowedRoles={['Government Official']}>
                    <VerifierDashboard />
                  </ProtectedRoute>
                </Route>
                <Route path="/carbon-history">
                  <ProtectedRoute>
                    <CarbonHistory />
                  </ProtectedRoute>
                </Route>
                <Route path="/maps-charts">
                  <ProtectedRoute>
                    <MapsCharts />
                  </ProtectedRoute>
                </Route>
                <Route path="/projects">
                  <ProtectedRoute>
                    <ProjectRegistration />
                  </ProtectedRoute>
                </Route>
                <Route path="/projects/new">
                  <ProtectedRoute>
                    <ProjectRegistration />
                  </ProtectedRoute>
                </Route>
                <Route path="/reports">
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                </Route>
                <Route path="/profile">
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                </Route>

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
