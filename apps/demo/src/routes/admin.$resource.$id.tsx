import { useParams } from 'react-router';
import { AdminDetailPage } from '@cruzjs/start/pages/admin/AdminDetailPage';

const AdminResourceDetailRoute: React.FC = () => {
  const { resource, id } = useParams<{ resource: string; id: string }>();
  if (!resource || !id) return null;
  return <AdminDetailPage resource={resource} id={id} />;
};

export default AdminResourceDetailRoute;
