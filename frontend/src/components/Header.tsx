import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import logoFull from '@/assets/logo-full.svg';
import logoIcon from '@/assets/logo.svg';

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Dashboard', href: '/dashboard', protected: true },
    { label: 'Marketplace', href: '/marketplace', protected: false },
    { label: 'Reports', href: '/reports', protected: false },
    { label: 'Register Project', href: '/projects', protected: true },
    { label: 'Maps & Charts', href: '/maps-charts', protected: true },
    { label: 'History', href: '/carbon-history', protected: true },
    { label: 'Profile', href: '/profile', protected: true },
    { label: 'Admin', href: '/admin', protected: true, adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.protected && !isAuthenticated) return false;
    if (item.adminOnly && user?.role !== 'Admin') return false;
    return true;
  });

  const userDisplayName =
    user && typeof user === 'object' && 'username' in user
      ? (user as { username?: string }).username ?? 'User'
      : user && typeof user === 'object' && 'email' in user
        ? (user as { email?: string }).email ?? 'User'
        : 'User';

  return (
    <header
      className="sticky top-0 z-50 bg-[#0d3b3b] border-b border-[#1a5c45]"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setLocation('/')}
          >
            {/* Desktop version (full logo with wordmark) */}
            <img
              src={logoFull}
              alt="CarbonLedger"
              className="hidden sm:block h-[36px] w-auto"
            />
            {/* Mobile version (icon only) */}
            <img
              src={logoIcon}
              alt="CarbonLedger"
              className="block sm:hidden h-[36px] w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const active = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-b-2 border-[#80cbc4] text-white rounded-none'
                      : 'border-b-2 border-transparent text-[#e0f2f1] hover:text-white hover:bg-[#1a5c45] rounded-md'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLocation('/profile')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#e0f2f1] hover:bg-[#1a5c45] hover:text-white transition-colors"
                >
                  <UserIcon className="h-3.5 w-3.5 text-[#80cbc4]" />
                  <span className="hidden sm:inline font-semibold">{userDisplayName}</span>
                </button>
                <button
                  onClick={() => {
                    logout();
                    setLocation('/');
                  }}
                  className="text-xs h-8 px-4 rounded-md border border-[#80cbc4] text-[#80cbc4] hover:bg-[#80cbc4] hover:text-[#0d3b3b] bg-transparent font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/login')}
                  className="hidden sm:inline-flex text-xs h-8 border-transparent bg-transparent text-[#e0f2f1] hover:bg-[#1a5c45] hover:text-white"
                >
                  Login
                </Button>
                <button
                  onClick={() => setLocation('/register')}
                  className="bg-[#80cbc4] hover:opacity-95 text-[#0d3b3b] text-xs h-8 px-4 rounded-md font-semibold transition-colors shadow-xs"
                >
                  Register
                </button>
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-[#1a5c45] text-[#e0f2f1] hover:text-white rounded-md"
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
          <nav className="lg:hidden pb-4 border-t border-[#1a5c45] space-y-1 pt-2 bg-[#0d3b3b]">
            {visibleNavItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  setLocation(item.href);
                  setMobileMenuOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 text-sm font-medium rounded-md ${
                  location === item.href
                    ? 'text-white bg-[#1a5c45]'
                    : 'text-[#e0f2f1] hover:text-white hover:bg-[#1a5c45]'
                }`}
              >
                {item.label}
              </button>
            ))}
            {!isAuthenticated && (
              <div className="pt-2 border-t border-[#1a5c45] flex gap-2 px-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLocation('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 text-xs border-transparent bg-transparent text-[#e0f2f1] hover:bg-[#1a5c45] hover:text-white"
                >
                  Login
                </Button>
                <button
                  onClick={() => {
                    setLocation('/register');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 bg-[#80cbc4] hover:opacity-95 text-[#0d3b3b] text-xs h-8 px-4 rounded-md font-semibold"
                >
                  Register
                </button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
