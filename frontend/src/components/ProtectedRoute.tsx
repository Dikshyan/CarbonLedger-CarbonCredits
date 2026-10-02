import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  children,
  adminOnly = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      const currentPath = window.location.pathname + window.location.search;
      const redirectPath: string =
        currentPath && !currentPath.startsWith('/login')
          ? currentPath
          : location || '/dashboard';
      setLocation(`/login?next=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const role = user?.role;

    if (adminOnly && role !== 'Admin') {
      setLocation('/dashboard');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
      setLocation('/dashboard');
      return;
    }
  }, [isAuthenticated, adminOnly, allowedRoles, user?.role, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (adminOnly && user?.role !== 'Admin') {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!user?.role || !allowedRoles.includes(user.role))) {
    return null;
  }

  return <>{children}</>;
}

