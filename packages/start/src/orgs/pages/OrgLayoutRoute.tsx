import { OrgLayout } from '../components/OrgLayout';

/**
 * Organization layout route - handles /orgs/:slug
 * Renders OrgLayout with nested routes for tabs
 * OrgLayout will render the Outlet with context internally
 */
const OrgLayoutRoute: React.FC = () => {
  return <OrgLayout />;
};

export default OrgLayoutRoute;
