import { Link } from 'react-router';

export default function BillingCanceledPage() {
  return (
    <div>
      <h1>Upgrade canceled</h1>
      <p>No changes were made to your subscription.</p>
      <Link to="/billing">Back to billing</Link>
    </div>
  );
}
