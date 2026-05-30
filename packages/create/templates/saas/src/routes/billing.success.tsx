import { Link } from 'react-router';

export default function BillingSuccessPage() {
  return (
    <div>
      <h1>Welcome to Pro!</h1>
      <p>Your subscription is active. You now have access to all Pro features.</p>
      <Link to="/dashboard">Go to dashboard →</Link>
    </div>
  );
}
