import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Menu, X, User as UserIcon, ChevronDown, LogOut,
  LayoutDashboard, FileText, History, MapPin, ShieldCheck,
  ClipboardCheck, Settings,
} from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import logoFull from '@/assets/logo-full.svg';
import logoIcon from '@/assets/logo.svg';

/* ───────────────────────────────────────────────
   Navigation item type
─────────────────────────────────────────────── */
interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

/* ───────────────────────────────────────────────
   Hook: click-outside detection
─────────────────────────────────────────────── */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const moreRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  /* ── Close everything on route change ── */
  useEffect(() => {
    setMobileMenuOpen(false);
    setMoreOpen(false);
    setProfileOpen(false);
  }, [location]);

  /* ── Click-outside handlers ── */
  useClickOutside(moreRef, () => setMoreOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  // Click outside mobile menu (but not the hamburger button)
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const listener = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(target) &&
        hamburgerRef.current && !hamburgerRef.current.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [mobileMenuOpen]);

  /* ── Escape key closes everything ── */
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setMobileMenuOpen(false);
      setMoreOpen(false);
      setProfileOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  /* ── Prevent body scroll when mobile menu is open ── */
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  /* ── Role helpers ── */
  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const isVerifier = role === 'Government Official';
  const isNGO = role === 'NGO Representative';
  const isBuyer = role === 'Company Buyer';

  /* ── Primary nav (always visible on desktop) ── */
  const primaryNav: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'AI Explorer', href: '/ai-explorer' },
    { label: 'Marketplace', href: '/marketplace' },
  ];

  /* ── More dropdown items (role-aware) ── */
  const moreItems: NavItem[] = [];
  if (isAuthenticated) {
    moreItems.push({ label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> });
    if (isNGO) {
      moreItems.push({ label: 'Register Project', href: '/projects', icon: <FileText className="h-4 w-4" /> });
    }
    if (isAdmin) {
      moreItems.push({ label: 'Admin Panel', href: '/admin', icon: <Settings className="h-4 w-4" /> });
    }
    if (isVerifier) {
      moreItems.push({ label: 'Verifier Queue', href: '/verifier', icon: <ClipboardCheck className="h-4 w-4" /> });
    }
    moreItems.push({ label: 'Reports', href: '/reports', icon: <ShieldCheck className="h-4 w-4" /> });
    moreItems.push({ label: 'Maps & Charts', href: '/maps-charts', icon: <MapPin className="h-4 w-4" /> });
    moreItems.push({ label: 'History', href: '/carbon-history', icon: <History className="h-4 w-4" /> });
  }

  /* ── Profile dropdown items ── */
  const profileItems: NavItem[] = [];
  if (isAuthenticated) {
    profileItems.push({ label: 'Profile', href: '/profile', icon: <UserIcon className="h-4 w-4" /> });
  }

  /* ── Mobile nav (merged) ── */
  const mobileNav: NavItem[] = [
    ...primaryNav,
    ...(isAuthenticated ? [
      { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      ...(isNGO ? [{ label: 'Register Project', href: '/projects', icon: <FileText className="h-4 w-4" /> }] : []),
      ...(isAdmin ? [{ label: 'Admin Panel', href: '/admin', icon: <Settings className="h-4 w-4" /> }] : []),
      ...(isVerifier ? [{ label: 'Verifier Queue', href: '/verifier', icon: <ClipboardCheck className="h-4 w-4" /> }] : []),
      { label: 'Reports', href: '/reports', icon: <ShieldCheck className="h-4 w-4" /> },
      { label: 'Maps & Charts', href: '/maps-charts', icon: <MapPin className="h-4 w-4" /> },
      { label: 'History', href: '/carbon-history', icon: <History className="h-4 w-4" /> },
      { label: 'Profile', href: '/profile', icon: <UserIcon className="h-4 w-4" /> },
    ] : []),
  ];

  const userDisplayName =
    user && typeof user === 'object' && 'username' in user
      ? (user as { username?: string }).username ?? 'User'
      : user && typeof user === 'object' && 'email' in user
        ? (user as { email?: string }).email ?? 'User'
        : 'User';

  const navigate = (href: string) => {
    setLocation(href);
    setMobileMenuOpen(false);
    setMoreOpen(false);
    setProfileOpen(false);
  };

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <header
      className="sticky top-0 z-50 bg-[#0d3b3b] border-b border-[#1a5c45]"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <button
            className="flex items-center gap-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80cbc4] rounded-md"
            onClick={() => navigate('/')}
            aria-label="Go to home page"
          >
            <img
              src={logoFull}
              alt="BlueChain"
              className="hidden sm:block h-[34px] w-auto"
            />
            <img
              src={logoIcon}
              alt="BlueChain"
              className="block sm:hidden h-[34px] w-auto"
            />
          </button>

          {/* ── Desktop Navigation ── */}
          <nav className="hidden lg:flex items-center gap-1 ml-8" aria-label="Primary navigation">
            {/* Primary links */}
            {primaryNav.map((item) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150
                  ${isActive(item.href)
                    ? 'text-white bg-[#1a5c45]'
                    : 'text-[#b2dfdb] hover:text-white hover:bg-[#1a5c45]/60'
                  }
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80cbc4]`}
              >
                {item.label}
              </button>
            ))}

            {/* More dropdown (only when logged in) */}
            {isAuthenticated && moreItems.length > 0 && (
              <div ref={moreRef} className="relative">
                <button
                  onClick={() => { setMoreOpen(!moreOpen); setProfileOpen(false); }}
                  aria-expanded={moreOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150
                    ${moreOpen
                      ? 'text-white bg-[#1a5c45]'
                      : 'text-[#b2dfdb] hover:text-white hover:bg-[#1a5c45]/60'
                    }
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80cbc4]`}
                >
                  More
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
                </button>

                {moreOpen && (
                  <div
                    className="absolute top-full left-0 mt-1.5 w-52 bg-[#0f4444] border border-[#1a5c45] rounded-xl shadow-xl py-1.5 z-50"
                    role="menu"
                  >
                    {moreItems.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        role="menuitem"
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                          ${isActive(item.href)
                            ? 'text-white bg-[#1a5c45] font-medium'
                            : 'text-[#b2dfdb] hover:text-white hover:bg-[#1a5c45]/70'
                          }
                          focus:outline-none focus-visible:bg-[#1a5c45] focus-visible:text-white`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* ── Right side: Auth buttons / Profile ── */}
          <div className="flex items-center gap-2 ml-auto">
            {isAuthenticated ? (
              /* Profile dropdown */
              <div ref={profileRef} className="relative hidden lg:block">
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setMoreOpen(false); }}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-150
                    ${profileOpen
                      ? 'bg-[#1a5c45] text-white'
                      : 'text-[#b2dfdb] hover:text-white hover:bg-[#1a5c45]/60'
                    }
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80cbc4]`}
                >
                  <div className="h-7 w-7 rounded-full bg-[#80cbc4] flex items-center justify-center text-[#0d3b3b] text-xs font-bold shrink-0">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium max-w-[120px] truncate">{userDisplayName}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <div
                    className="absolute top-full right-0 mt-1.5 w-56 bg-[#0f4444] border border-[#1a5c45] rounded-xl shadow-xl py-1.5 z-50"
                    role="menu"
                  >
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-[#1a5c45]">
                      <p className="text-sm font-semibold text-white truncate">{userDisplayName}</p>
                      <p className="text-xs text-[#80cbc4] mt-0.5">{role || 'Member'}</p>
                    </div>

                    {profileItems.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => navigate(item.href)}
                        role="menuitem"
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors
                          ${isActive(item.href)
                            ? 'text-white bg-[#1a5c45] font-medium'
                            : 'text-[#b2dfdb] hover:text-white hover:bg-[#1a5c45]/70'
                          }
                          focus:outline-none focus-visible:bg-[#1a5c45] focus-visible:text-white`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}

                    <div className="border-t border-[#1a5c45] mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          navigate('/');
                        }}
                        role="menuitem"
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-300 hover:text-red-200 hover:bg-red-900/30 transition-colors
                          focus:outline-none focus-visible:bg-red-900/30"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Login / Register buttons */
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="text-sm h-9 border-[#1a5c45] bg-transparent text-[#b2dfdb] hover:bg-[#1a5c45] hover:text-white"
                >
                  Login
                </Button>
                <button
                  onClick={() => navigate('/register')}
                  className="bg-[#80cbc4] hover:bg-[#a7dbd8] text-[#0d3b3b] text-sm h-9 px-5 rounded-lg font-semibold transition-colors shadow-sm"
                >
                  Register
                </button>
              </div>
            )}

            {/* ── Hamburger (mobile/tablet) ── */}
            <button
              ref={hamburgerRef}
              className="lg:hidden p-2 hover:bg-[#1a5c45] text-[#b2dfdb] hover:text-white rounded-lg transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80cbc4]"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Navigation Overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 lg:hidden" aria-hidden="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <nav
            ref={mobileMenuRef}
            id="mobile-menu"
            className="absolute top-0 right-0 w-full max-w-sm h-[calc(100vh-4rem)] bg-[#0d3b3b] border-l border-[#1a5c45] shadow-2xl overflow-y-auto"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="py-3 px-4 space-y-1">
              {mobileNav.map((item) => (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive(item.href)
                      ? 'text-white bg-[#1a5c45]'
                      : 'text-[#b2dfdb] hover:text-white hover:bg-[#1a5c45]/70'
                    }
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#80cbc4]`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Mobile auth section */}
            <div className="border-t border-[#1a5c45] px-4 py-4 mt-2">
              {isAuthenticated ? (
                <div className="space-y-3">
                  {/* User info */}
                  <div className="flex items-center gap-3 px-2 pb-3 border-b border-[#1a5c45]">
                    <div className="h-9 w-9 rounded-full bg-[#80cbc4] flex items-center justify-center text-[#0d3b3b] text-sm font-bold shrink-0">
                      {userDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{userDisplayName}</p>
                      <p className="text-xs text-[#80cbc4]">{role || 'Member'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      navigate('/');
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
                      text-red-300 hover:text-red-200 bg-red-900/20 hover:bg-red-900/40 border border-red-800/30 transition-colors
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/login')}
                    className="flex-1 text-sm border-[#1a5c45] bg-transparent text-[#b2dfdb] hover:bg-[#1a5c45] hover:text-white"
                  >
                    Login
                  </Button>
                  <button
                    onClick={() => navigate('/register')}
                    className="flex-1 bg-[#80cbc4] hover:bg-[#a7dbd8] text-[#0d3b3b] text-sm h-9 px-4 rounded-lg font-semibold transition-colors"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
