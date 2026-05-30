import { MembersList } from '../components/MembersList';
import { LoadingState } from '@cruzjs/ui';
import type { OrgContext } from '@cruzjs/ui';
import { useOutletContext } from 'react-router';

const OrgMembersPage: React.FC = () => {
  const { organization, currentUserRole, currentUserId, orgId } = useOutletContext<OrgContext>();

  if (!currentUserRole || !currentUserId || !orgId) {
    return <LoadingState size="xl" />;
  }

  return (
    <MembersList
      orgId={orgId}
      orgSlug={organization.slug}
      currentUserRole={currentUserRole}
      currentUserId={currentUserId}
    />
  );
};

export default OrgMembersPage;
