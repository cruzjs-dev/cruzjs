import { OrgRoleValues, type OrgRole } from '@cruzjs/core/database/schema';

type RoleSelectorProps = {
  value: OrgRole;
  onChange: (role: OrgRole) => void;
  disabled?: boolean;
};

const roleLabels: Record<OrgRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
};

const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-3">
      {OrgRoleValues.map((role) => (
        <label
          key={role}
          className={`flex items-center gap-2.5 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <input
            type="radio"
            name="org-role"
            value={role}
            checked={value === role}
            onChange={() => !disabled && onChange(role)}
            disabled={disabled}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm text-text-strong">{roleLabels[role]}</span>
        </label>
      ))}
    </div>
  );
};

export { RoleSelector };
