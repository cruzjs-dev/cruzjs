import type { OrgRole } from '@cruzjs/saas';
import type { BillingPlan } from '../../billing/billing.models';
import { getTRPC } from '@cruzjs/core/trpc/client';
import {
  PageHeader,
  SectionCard,
  PermissionDenied,
  LoadingState,
  useToast,
} from '@cruzjs/ui';
import type { OrgContext } from '@cruzjs/ui';
import { useState } from 'react';
import { useOutletContext } from 'react-router';

const InfoIcon = () => (
  <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const OrgBillingPage: React.FC = () => {
  const trpc = getTRPC();
  const context = useOutletContext<OrgContext>();
  if (!context) return <LoadingState size="xl" />;
  const { organization, currentUserRole, orgId } = context;

  const toast = useToast();

  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  const canManageBilling = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const { data: subscriptionData, isLoading: subscriptionLoading } = trpc.billing.subscription.useQuery(undefined, {
    enabled: !!orgId && canManageBilling,
  });

  const { data: plansData } = trpc.billing.plans.useQuery(undefined, {
    enabled: canManageBilling,
  });

  const { data: upgradeablePlansData } = trpc.billing.upgradeablePlans.useQuery(undefined, {
    enabled: !!orgId && canManageBilling,
  });

  const subscription = subscriptionData || null;
  const plans = plansData?.plans || [];
  const upgradeablePlans = upgradeablePlansData?.plans || [];
  const plan = subscription?.planId
    ? plans.find((p: BillingPlan) => p.id === subscription.planId) || null
    : null;
  const loading = subscriptionLoading;

  const createPortalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data: any) => {
      const url = typeof data.session === 'string' ? data.session : (data.session as { url?: string })?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast({ title: 'Error', description: 'No portal URL returned', status: 'error', duration: 5000, isClosable: true });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to open customer portal', status: 'error', duration: 5000, isClosable: true });
    },
  });

  const createCheckoutMutation = trpc.billing.createCheckout.useMutation({
    onSuccess: (data: any) => {
      const url = typeof data.session === 'string' ? data.session : (data.session as { url?: string })?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast({ title: 'Error', description: 'No checkout URL returned', status: 'error', duration: 5000, isClosable: true });
        setCheckingOut(null);
      }
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to start checkout', status: 'error', duration: 5000, isClosable: true });
      setCheckingOut(null);
    },
  });

  const handleOpenPortal = async () => {
    const returnUrl = `${window.location.origin}/orgs/${organization.slug}/billing`;
    await createPortalMutation.mutateAsync({ returnUrl });
  };

  const handleCheckout = async (planId: string) => {
    setCheckingOut(planId);
    const successUrl = `${window.location.origin}/orgs/${organization.slug}/billing`;
    const cancelUrl = `${window.location.origin}/orgs/${organization.slug}/billing`;
    try {
      await createCheckoutMutation.mutateAsync({ planId, interval: billingInterval, successUrl, cancelUrl });
    } catch {
      setCheckingOut(null);
    }
  };

  const getStatusBadgeClasses = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'trialing': return 'bg-blue-100 text-blue-700';
      case 'past_due': return 'bg-amber-100 text-amber-700';
      case 'canceled':
      case 'unpaid': return 'bg-red-100 text-red-700';
      default: return 'bg-surface-light text-text';
    }
  };

  const formatCurrency = (cents: number, currency: string = 'usd'): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
  };

  const getPlanPrice = (plan: BillingPlan, interval: 'month' | 'year'): number => {
    return interval === 'year' ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!canManageBilling) {
    return (
      <PermissionDenied message="You don't have permission to view billing information. Only owners and admins can access billing." />
    );
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Billing" />
        <LoadingState size="xl" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Billing" />

      <div className="flex flex-col gap-6 mt-6">
        {/* Subscription Status */}
        {subscription ? (
          <SectionCard>
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <h3 className="text-lg font-semibold text-text-strong">Current Subscription</h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClasses(subscription.status)}`}>
                      {subscription.status.toUpperCase()}
                    </span>
                    {subscription.cancelAtPeriodEnd && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                        Cancels at period end
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleOpenPortal}
                  disabled={createPortalMutation.isPending}
                >
                  {createPortalMutation.isPending ? 'Opening...' : 'Manage Subscription'}
                </button>
              </div>

              {plan && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Current Plan</p>
                  <p className="text-2xl font-bold text-text-strong mt-1">{plan.name}</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {formatCurrency(getPlanPrice(plan, subscription?.planId === 'free' ? 'month' : billingInterval), plan.currency)}/
                    {subscription?.planId === 'free' ? 'month' : billingInterval}
                  </p>
                </div>
              )}

              {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">Billing Period</p>
                  <p className="text-sm text-text">{formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}</p>
                  {subscription.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-3 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <InfoIcon />
                      <p className="text-sm text-blue-800">
                        Your subscription will cancel on {formatDate(subscription.currentPeriodEnd)}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard>
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-text-strong">No Active Subscription</h3>
              <p className="text-sm text-text-secondary">This organization doesn't have an active subscription. Subscribe to a plan to get started.</p>

              {/* Billing interval toggle */}
              <div className="inline-flex rounded-lg border border-surface-border overflow-hidden self-start">
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    billingInterval === 'month'
                      ? 'bg-primary text-white'
                      : 'bg-surface-light text-text-muted hover:text-text-secondary'
                  }`}
                  onClick={() => setBillingInterval('month')}
                >
                  Monthly
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    billingInterval === 'year'
                      ? 'bg-primary text-white'
                      : 'bg-surface-light text-text-muted hover:text-text-secondary'
                  }`}
                  onClick={() => setBillingInterval('year')}
                >
                  Yearly
                </button>
              </div>

              {upgradeablePlans.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {upgradeablePlans.map((p: BillingPlan) => (
                    <button
                      key={p.id}
                      className="px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleCheckout(p.id)}
                      disabled={checkingOut === p.id}
                    >
                      {checkingOut === p.id
                        ? 'Loading...'
                        : `Subscribe to ${p.name} - ${formatCurrency(getPlanPrice(p, billingInterval), p.currency)}/${billingInterval === 'year' ? 'year' : 'month'}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No plans available at this time.</p>
              )}
            </div>
          </SectionCard>
        )}

        {/* Upgradeable Plans */}
        {upgradeablePlans.length > 0 && (
          <SectionCard>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-text-strong">Available Upgrades</h3>
                  <p className="text-sm text-text-secondary mt-1">Upgrade your plan to unlock more features and capabilities.</p>
                </div>

                {/* Billing interval toggle */}
                <div className="inline-flex rounded-lg border border-surface-border overflow-hidden">
                  <button
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      billingInterval === 'month'
                        ? 'bg-primary text-white'
                        : 'bg-surface-light text-text-muted hover:text-text-secondary'
                    }`}
                    onClick={() => setBillingInterval('month')}
                  >
                    Monthly
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      billingInterval === 'year'
                        ? 'bg-primary text-white'
                        : 'bg-surface-light text-text-muted hover:text-text-secondary'
                    }`}
                    onClick={() => setBillingInterval('year')}
                  >
                    Yearly
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Plan</th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Price</th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Features</th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upgradeablePlans.map((p: BillingPlan) => {
                      const price = getPlanPrice(p, billingInterval);
                      const savings = billingInterval === 'year' && p.monthlyPrice
                        ? Math.round(((p.monthlyPrice * 12 - p.yearlyPrice) / (p.monthlyPrice * 12)) * 100)
                        : 0;
                      return (
                        <tr key={p.id} className="border-b border-surface-border last:border-b-0">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-text-strong">{p.name}</p>
                              <p className="text-xs text-text-secondary mt-0.5">{p.description}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-text-strong">
                                {formatCurrency(price, p.currency)}/{billingInterval === 'year' ? 'year' : 'month'}
                              </p>
                              {billingInterval === 'year' && savings > 0 && (
                                <p className="text-xs text-emerald-600 mt-0.5">Save {savings}%</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-0.5">
                              {p.features.slice(0, 3).map((feature, idx) => (
                                <p key={idx} className="text-sm text-text-secondary">&bull; {feature}</p>
                              ))}
                              {p.features.length > 3 && (
                                <p className="text-sm text-text-muted">+{p.features.length - 3} more</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              onClick={() => handleCheckout(p.id)}
                              disabled={checkingOut === p.id}
                            >
                              {checkingOut === p.id ? 'Loading...' : `Upgrade to ${p.name}`}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        )}

        {/* All Available Plans */}
        {plans.length > 0 && (
          <SectionCard>
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold text-text-strong">All Plans</h3>
                <p className="text-sm text-text-secondary mt-1">View all available plans for reference.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border">
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Plan</th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Price</th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Features</th>
                      <th className="text-left py-3 px-4 text-xs font-medium uppercase tracking-wide text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p: BillingPlan) => (
                      <tr key={p.id} className="border-b border-surface-border last:border-b-0">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-text-strong">{p.name}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{p.description}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-semibold text-text-strong">{formatCurrency(getPlanPrice(p, 'month'), p.currency)}/month</p>
                            <p className="text-xs text-text-muted mt-0.5">or {formatCurrency(getPlanPrice(p, 'year'), p.currency)}/year</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            {p.features.slice(0, 3).map((feature, idx) => (
                              <p key={idx} className="text-sm text-text-secondary">&bull; {feature}</p>
                            ))}
                            {p.features.length > 3 && (
                              <p className="text-sm text-text-muted">+{p.features.length - 3} more</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {subscription?.planId === p.id ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Current Plan
                            </span>
                          ) : upgradeablePlans.some((up: BillingPlan) => up.id === p.id) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              Available Upgrade
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-light text-text">
                              Not Available
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Usage Information */}
        {subscription && (
          <SectionCard>
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-text-strong">Usage</h3>
              <p className="text-sm text-text-secondary">Usage tracking will be available soon.</p>
            </div>
          </SectionCard>
        )}
      </div>
    </>
  );
};

export default OrgBillingPage;
