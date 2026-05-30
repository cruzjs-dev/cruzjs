import { useLoaderData } from 'react-router';
import { trpc } from '../trpc/client';

export default function BillingPage() {
  const { data: subscription } = trpc.billing.subscription.useQuery();

  const isPro = subscription?.plan === 'pro';

  return (
    <div>
      <h1>Billing</h1>
      <p>Current plan: <strong>{isPro ? 'Pro' : 'Free'}</strong></p>

      {!isPro && (
        <div>
          <h2>Upgrade to Pro</h2>
          <ul>
            <li>Unlimited projects</li>
            <li>Priority support</li>
            <li>Advanced analytics</li>
          </ul>
          <a href="/billing/checkout">Upgrade to Pro →</a>
        </div>
      )}

      {isPro && (
        <div>
          <p>You're on the Pro plan.</p>
          <a href="/billing/portal">Manage subscription</a>
        </div>
      )}
    </div>
  );
}
