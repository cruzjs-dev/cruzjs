import React from 'react';

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#fafafa',
    color: '#1a1a1a',
    minHeight: '100vh',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box' as const,
  },
  card: {
    textAlign: 'center' as const,
    maxWidth: '480px',
    width: '100%',
  },
  illustration: {
    fontSize: '80px',
    fontWeight: 800 as const,
    color: '#e0e0e0',
    margin: '0 0 8px 0',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 700 as const,
    color: '#1a1a1a',
    margin: '0 0 12px 0',
  },
  description: {
    fontSize: '15px',
    color: '#666666',
    lineHeight: 1.6,
    margin: '0 0 32px 0',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 600 as const,
    color: '#ffffff',
    backgroundColor: '#1a1a2e',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.15s',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500 as const,
    color: '#555555',
    backgroundColor: 'transparent',
    border: '1px solid #d0d0d0',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'border-color 0.15s, color 0.15s',
  },
} as const;

export const NotFoundPage: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.illustration}>404</div>
        <h1 style={styles.heading}>Page not found</h1>
        <p style={styles.description}>
          The page you are looking for does not exist or has been moved.
        </p>

        <div style={styles.actions}>
          <a
            href="/"
            style={styles.primaryButton}
          >
            Go home
          </a>
          <a
            href="javascript:history.back()"
            style={styles.secondaryButton}
          >
            Go back
          </a>
        </div>
      </div>
    </div>
  );
};
