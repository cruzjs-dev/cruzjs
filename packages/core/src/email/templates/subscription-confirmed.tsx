import React from "react";
import { BaseLayout } from './base-layout';
import { Section, Text, Button } from '@react-email/components';

type SubscriptionConfirmedProps = {
  organizationName: string;
  planName: string;
  billingUrl: string;
};

export const SubscriptionConfirmedEmail: React.FC<SubscriptionConfirmedProps> = ({
  organizationName,
  planName,
  billingUrl,
}) => {
  return (
    <BaseLayout title="Subscription Confirmed">
      <Text style={paragraph}>
        Hi there,
      </Text>
      <Text style={paragraph}>
        Your subscription for <strong>{organizationName}</strong> has been confirmed!
      </Text>
      <Text style={paragraph}>
        <strong>Plan:</strong> {planName}
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={billingUrl}>
          View Subscription
        </Button>
      </Section>
      <Text style={paragraph}>
        Thank you for your subscription. You now have access to all premium features.
      </Text>
      <Text style={paragraph}>
        If you have any questions, feel free to reach out to our support team.
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

