import { AdminLayout } from '@cruzjs/start/pages/admin/AdminLayout';
import { JobsDashboard } from '@cruzjs/start/dashboard/JobsDashboard';

const AdminJobsRoute: React.FC = () => (
  <AdminLayout>
    <JobsDashboard />
  </AdminLayout>
);

export default AdminJobsRoute;
