import React from "react";
import { BaseLayout } from './base-layout';
import { Section, Text, Button } from '@react-email/components';

type PasswordResetProps = {
  name: string;
  resetUrl: string;
};

export const PasswordResetEmail: React.FC<PasswordResetProps> = ({
  name,
  resetUrl,
}) => {
  return (
    <BaseLayout title="Reset Your Password">
      <Text style={paragraph}>
        Hi {name || 'there'},
      </Text>
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to create a new password:
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={resetUrl}>
          Reset Password
        </Button>
      </Section>
      <Text style={paragraph}>
        Or copy and paste this link into your browser:
      </Text>
      <Text style={linkText}>
        {resetUrl}
      </Text>
      <Text style={warning}>
        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
      </Text>
      <Text style={paragraph}>
        For security reasons, if you didn't request this password reset, please contact our support team immediately.
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

const linkText = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#4f46e5',
  wordBreak: 'break-all' as const,
  margin: '16px 0',
};

const warning = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#dc2626',
  fontWeight: 'bold',
  margin: '24px 0',
  padding: '12px',
  backgroundColor: '#fef2f2',
  borderRadius: '6px',
};

