import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';

type BaseLayoutProps = {
  children: React.ReactNode;
  title?: string;
};

export const BaseLayout: React.FC<BaseLayoutProps> = ({ children, title }) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>Aurora</Text>
          </Section>
          <Section style={content}>
            {title && <Text style={titleStyle}>{title}</Text>}
            {children}
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Aurora. All rights reserved.
            </Text>
            <Text style={footerText}>
              <Link href="#" style={footerLink}>
                Privacy Policy
              </Link>{' '}
              |{' '}
              <Link href="#" style={footerLink}>
                Terms of Service
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#4f46e5',
};

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '0',
};

const content = {
  padding: '0 24px',
};

const titleStyle = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: 'bold',
  color: '#1a202c',
  margin: '32px 0 24px',
};

const hr = {
  borderColor: '#e2e8f0',
  margin: '32px 0',
};

const footer = {
  padding: '0 24px',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '1.5',
  color: '#718096',
  textAlign: 'center' as const,
  margin: '8px 0',
};

const footerLink = {
  color: '#4f46e5',
  textDecoration: 'underline',
};
