import { useParams, useNavigate } from 'react-router';
import { AdminListPage } from '@cruzjs/start/pages/admin/AdminListPage';

const AdminResourceListRoute: React.FC = () => {
  const { resource } = useParams<{ resource: string }>();
  const navigate = useNavigate();

  if (!resource) return null;

  return (
    <AdminListPage
      resource={resource}
      onRowClick={(row) => navigate(`/admin/${resource}/${row.id}`)}
    />
  );
};

export default AdminResourceListRoute;
