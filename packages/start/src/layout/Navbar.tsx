import { OrgSwitcher } from '@cruzjs/start/orgs/components/OrgSwitcher';
import { useAuth } from '@cruzjs/core/auth/auth-provider';
import { clearSessionToken } from '@cruzjs/core/auth/auth-client';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { useNavigate, useLocation } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { getAppNavItems } from './nav-registry';

type NavbarProps = {
  fullWidth?: boolean;
};

const Navbar: React.FC<NavbarProps> = ({ fullWidth = false }) => {
  const trpc = getTRPC() as any;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const appNavItems = getAppNavItems();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore errors
    }
    clearSessionToken();
    navigate('/');
  };

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-surface-border">
      <div className={`${fullWidth ? 'px-6' : 'max-w-screen-2xl mx-auto px-6'} flex items-center h-11 gap-6`}>

        {/* Left: Org switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!loading && user ? (
            <OrgSwitcher />
          ) : (
            <span className="text-[13px] font-semibold text-text-strong">cruzjs</span>
          )}
        </div>

        {/* Center: app-registered primary nav (logged-in only) */}
        {!loading && user && appNavItems.length > 0 && (
          <nav className="flex items-center gap-1">
            {appNavItems.map((item) => {
              const active =
                location.pathname === item.to || location.pathname.startsWith(item.to + '/');
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={`text-[13px] font-medium px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    active
                      ? 'text-text-strong bg-surface-lighter'
                      : 'text-text-secondary hover:text-text-strong hover:bg-surface-lighter'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: User */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {!loading && user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-surface-lighter active:bg-surface-border transition-colors cursor-pointer"
              >
                <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                  {userInitial}
                </div>
                <span className="text-[13px] font-medium text-text-secondary hidden sm:inline">
                  {user.name || user.email?.split('@')[0]}
                </span>
                <svg className="w-3 h-3 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-lg bg-surface border border-surface-border shadow-lg py-1 z-50">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-[13px] text-text hover:bg-surface-light transition-colors cursor-pointer"
                    onClick={() => { setMenuOpen(false); navigate('/dashboard'); }}
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-[13px] text-text hover:bg-surface-light transition-colors cursor-pointer"
                    onClick={() => { setMenuOpen(false); navigate('/settings'); }}
                  >
                    My Settings
                  </button>
                  <div className="border-t border-surface-lighter my-1" />
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-[13px] text-danger hover:bg-red-50 hover:text-danger-dark transition-colors cursor-pointer"
                    onClick={handleLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : !loading ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="text-[13px] font-medium text-text-secondary hover:text-text-strong px-3 py-1.5 rounded-md hover:bg-surface-lighter transition-colors cursor-pointer"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth/register')}
                className="text-[13px] font-medium text-white px-4 py-1.5 rounded-md transition-colors cursor-pointer bg-primary hover:bg-primary-dark"
              >
                Get Started
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export { Navbar };
