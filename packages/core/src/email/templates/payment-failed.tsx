import React from "react";
import { BaseLayout } from './base-layout';
import { Section, Text, Button } from '@react-email/components';

type PaymentFailedProps = {
  organizationName: string;
  planName: string;
  amount: string;
  billingUrl: string;
};

export const PaymentFailedEmail: React.FC<PaymentFailedProps> = ({
  organizationName,
  planName,
  amount,
  billingUrl,
}) => {
  return (
    <BaseLayout title="Payment Failed">
      <Text style={paragraph}>
        Hi there,
      </Text>
      <Text style={paragraph}>
        We were unable to process your payment for <strong>{organizationName}</strong>.
      </Text>
      <Text style={paragraph}>
        <strong>Plan:</strong> {planName}<br />
        <strong>Amount:</strong> {amount}
      </Text>
      <Text style={warning}>
        Your subscription will be suspended if payment is not updated within 3 days.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={billingUrl}>
          Update Payment Method
        </Button>
      </Section>
      <Text style={paragraph}>
        Common reasons for payment failure:
      </Text>
      <Text style={list}>
        • Expired credit card<br />
        • Insufficient funds<br />
        • Bank declined the transaction<br />
        • Billing address mismatch
      </Text>
      <Text style={paragraph}>
        Please update your payment method to continue using premium features. If you believe this is an error, please contact your bank or card issuer.
      </Text>
      <Text style={paragraph}>
        If you need help, our support team is here to assist you.
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
  backgroundColor: '#dc2626',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const warning = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#dc2626',
  fontWeight: 'bold',
  margin: '24px 0',
  padding: '12px',
  backgroundColor: '#fef2f2',
  borderRadius: '6px',
};

const list = {
  fontSize: '14px',
  lineHeight: '1.8',
  color: '#4a5568',
  margin: '16px 0',
};

