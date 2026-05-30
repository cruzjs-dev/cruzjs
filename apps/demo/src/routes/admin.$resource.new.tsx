import { useParams } from 'react-router';
import { AdminCreatePage } from '@cruzjs/start/pages/admin/AdminCreatePage';

const AdminResourceNewRoute: React.FC = () => {
  const { resource } = useParams<{ resource: string }>();
  if (!resource) return null;
  return <AdminCreatePage resource={resource} />;
};

export default AdminResourceNewRoute;
