import { config } from '../../shared/config';
import { useNavigate } from 'react-router';

type AuthLayoutProps = {
  title?: string;
  children: React.ReactNode;
};

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const appName = (config as any).appName ?? 'CruzJS';

  return (
    <div className="min-h-screen bg-auth-bg flex flex-col">
      <div className="flex justify-center pt-12 pb-2">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-0.5 select-none"
          aria-label="Back to home"
        >
          <span className="text-2xl font-bold text-text-strong tracking-tight">cruz</span>
          <span className="text-2xl font-bold text-primary tracking-tight">js</span>
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="pb-8 text-center">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-text-muted hover:text-text transition-colors"
        >
          &larr; Back to {appName}
        </button>
      </div>
    </div>
  );
};

export { AuthLayout };
