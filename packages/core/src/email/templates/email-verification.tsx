import React from "react";
import { BaseLayout } from './base-layout';
import { Section, Text, Button } from '@react-email/components';

type EmailVerificationProps = {
  name: string;
  verificationUrl: string;
};

export const EmailVerificationEmail: React.FC<EmailVerificationProps> = ({
  name,
  verificationUrl,
}) => {
  return (
    <BaseLayout title="Verify Your Email">
      <Text style={paragraph}>
        Hi {name || 'there'},
      </Text>
      <Text style={paragraph}>
        Please verify your email address by clicking the button below:
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={verificationUrl}>
          Verify Email
        </Button>
      </Section>
      <Text style={paragraph}>
        Or copy and paste this link into your browser:
      </Text>
      <Text style={linkText}>
        {verificationUrl}
      </Text>
      <Text style={paragraph}>
        This link will expire in 24 hours.
      </Text>
      <Text style={paragraph}>
        If you didn't create an account, you can safely ignore this email.
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

const linkText = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#4f46e5',
  wordBreak: 'break-all' as const,
  margin: '16px 0',
};

