type OrgHeaderProps = {
  name: string;
  slug: string;
  avatarUrl?: string | null;
  memberCount: number;
  status?: 'active' | 'inactive';
};

const OrgHeader: React.FC<OrgHeaderProps> = ({ name, slug, avatarUrl, memberCount, status = 'active' }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 shadow-lg">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-primary-lighter/30 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative flex items-center gap-5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-16 h-16 rounded-xl object-cover ring-2 ring-white/30 shadow-xl"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-2xl shadow-xl ring-2 ring-white/20">
            {name?.charAt?.(0)?.toUpperCase() || 'O'}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-white/70 font-mono">/{slug}</span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="text-sm text-white/70">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/40" />
            {status === 'active' && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
                </span>
                Active
              </span>
            )}
            {status === 'inactive' && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white/50" />
                Inactive
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { OrgHeader };

