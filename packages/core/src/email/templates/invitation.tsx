import React from 'react';
import { BaseLayout } from './base-layout';
import { Section, Text, Button, Link } from '@react-email/components';

type InvitationEmailProps = {
  inviterName: string;
  organizationName: string;
  role: string;
  acceptUrl: string;
  declineUrl: string;
};

export const InvitationEmail: React.FC<InvitationEmailProps> = ({
  inviterName,
  organizationName,
  role,
  acceptUrl,
  declineUrl,
}) => {
  return (
    <BaseLayout title="You've Been Invited">
      <Text style={paragraph}>
        Hi there,
      </Text>
      <Text style={paragraph}>
        <strong>{inviterName}</strong> has invited you to join <strong>{organizationName}</strong> as a <strong>{role}</strong>.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={acceptUrl}>
          Accept Invitation
        </Button>
      </Section>
      <Text style={paragraph}>
        Or copy and paste this link into your browser:
      </Text>
      <Text style={linkText}>
        {acceptUrl}
      </Text>
      <Text style={paragraph}>
        If you don't want to join this organization, you can{' '}
        <Link href={declineUrl} style={link}>
          decline the invitation
        </Link>.
      </Text>
      <Text style={paragraph}>
        This invitation will expire in 7 days.
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

const link = {
  color: '#4f46e5',
  textDecoration: 'underline',
};

