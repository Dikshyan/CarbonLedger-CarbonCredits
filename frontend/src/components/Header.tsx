import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard', protected: true },
    { label: 'Projects', href: '/projects', protected: true },
    { label: 'Maps & Charts', href: '/maps-charts', protected: true },
    { label: 'History', href: '/carbon-history', protected: true },
    { label: 'Admin', href: '/admin', protected: true, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.protected && !isAuthenticated) return false;
    if (item.adminOnly && user?.role !== 'Admin') return false;
    return true;
  });

  const userDisplayName =
    user && typeof user === 'object' && 'name' in user
      ? (user as { name?: string }).name ?? 'User'
      : user && typeof user === 'object' && 'email' in user
        ? (user as { email?: string }).email ?? 'User'
        : 'User';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setLocation('/')}
          >
            
            <img
              src="/manus-storage/bcr-logo_95923b37.png"
              alt="Blue Carbon Registry"
              className="h-8 w-8"
            />
            
            <span className="font-bold text-lg text-blue-900 hidden sm:inline">
              Blue Carbon
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => (
              <button
                key={item.href}
                onClick={() => setLocation(item.href)}
                className="px-3 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-sm text-slate-600">
                  {userDisplayName}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    setLocation('/');
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/login')}
                  className="hidden sm:inline-flex"
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => setLocation('/register')}
                >
                  Register
                </Button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 hover:bg-slate-100 rounded-md"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-slate-200">
            {visibleNavItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  setLocation(item.href);
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50"
              >
                {item.label}
              </button>
            ))}
            {!isAuthenticated && (
              <>
                <button
                  onClick={() => {
                    setLocation('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50"
                >
                  Login
                </button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
