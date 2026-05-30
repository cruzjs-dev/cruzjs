import React from "react";
import { BaseLayout } from './base-layout';
import { Section, Text, Button } from '@react-email/components';

type SubscriptionCanceledProps = {
  organizationName: string;
  planName: string;
  cancelDate: string;
  billingUrl: string;
};

export const SubscriptionCanceledEmail: React.FC<SubscriptionCanceledProps> = ({
  organizationName,
  planName,
  cancelDate,
  billingUrl,
}) => {
  return (
    <BaseLayout title="Subscription Canceled">
      <Text style={paragraph}>
        Hi there,
      </Text>
      <Text style={paragraph}>
        Your subscription for <strong>{organizationName}</strong> has been canceled.
      </Text>
      <Text style={paragraph}>
        <strong>Plan:</strong> {planName}<br />
        <strong>Access ends:</strong> {cancelDate}
      </Text>
      <Text style={paragraph}>
        You'll continue to have access to premium features until {cancelDate}. After that, your account will be downgraded to the free plan.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={billingUrl}>
          Manage Subscription
        </Button>
      </Section>
      <Text style={paragraph}>
        If you change your mind, you can reactivate your subscription anytime before {cancelDate}.
      </Text>
      <Text style={paragraph}>
        We're sorry to see you go. If there's anything we can do to help, please reach out to our support team.
      </Text>
    </BaseLayout>
  );
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#2d3748',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#4f46e5',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

