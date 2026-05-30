import { Button, Section, Text } from '@react-email/components';
import React from 'react';
import { BaseLayout } from './base-layout';

type WelcomeEmailProps = {
  name: string;
  email: string;
  appUrl: string;
};

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  name,
  email,
  appUrl,
}) => {
  return (
    <BaseLayout title="Welcome!">
      <Text style={paragraph}>Hi {name || 'there'},</Text>
      <Text style={paragraph}>
        Welcome to Aurora! We're excited to have you on board.
      </Text>
      <Text style={paragraph}>
        Your account has been created with the email: <strong>{email}</strong>
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={appUrl}>
          Get Started
        </Button>
      </Section>
      <Text style={paragraph}>
        If you have any questions, feel free to reach out to our support team.
      </Text>
      <Text style={paragraph}>
        Best regards,
        <br />
        The Aurora Team
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
