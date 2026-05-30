import { NavLink, useNavigate } from 'react-router';
import { getTRPC } from '@cruzjs/core/trpc/client';
import { clearSessionToken } from '@cruzjs/core/auth/auth-client';
import { useAuth } from '@cruzjs/core/auth/auth-provider';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const trpc = getTRPC() as any;
  const navigate = useNavigate();
  const { user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const { data: resources } = trpc.admin.listResources.useQuery(undefined, {
    staleTime: 60_000,
  });

  const handleLogout = async () => {
    try { await logoutMutation.mutateAsync(); } catch { /* ignore */ }
    clearSessionToken();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="px-4 py-5 border-b border-slate-700">
          <span className="text-white font-semibold text-sm">Admin Panel</span>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-sm transition-colors ${isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`
            }
          >
            Overview
          </NavLink>
          <NavLink
            to="/admin/jobs"
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-sm transition-colors ${isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`
            }
          >
            Jobs
          </NavLink>
          {resources?.map((r: { name: string }) => (
            <NavLink
              key={r.name}
              to={`/admin/${r.name}`}
              className={({ isActive }) =>
                `flex items-center px-4 py-2 text-sm capitalize transition-colors ${isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`
              }
            >
              {r.name}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-700 text-xs">
          <div className="text-slate-400 mb-2 truncate">{user?.email}</div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
