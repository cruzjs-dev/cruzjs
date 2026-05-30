import React from 'react';

type ProdErrorPageProps = {
  statusCode?: number;
  supportEmail?: string;
};

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
  statusCode: {
    fontSize: '72px',
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
  supportSection: {
    marginTop: '40px',
    paddingTop: '24px',
    borderTop: '1px solid #e8e8e8',
  },
  supportText: {
    fontSize: '13px',
    color: '#999999',
    margin: '0 0 4px 0',
  },
  supportLink: {
    fontSize: '13px',
    color: '#4a6cf7',
    textDecoration: 'none',
    fontWeight: 500 as const,
  },
} as const;

function getStatusMessage(statusCode?: number): { heading: string; description: string } {
  switch (statusCode) {
    case 400:
      return { heading: 'Bad Request', description: 'The server could not process your request. Please check your input and try again.' };
    case 401:
      return { heading: 'Unauthorized', description: 'You need to sign in to access this page.' };
    case 403:
      return { heading: 'Forbidden', description: 'You do not have permission to access this resource.' };
    case 404:
      return { heading: 'Page Not Found', description: 'The page you are looking for does not exist or has been moved.' };
    case 500:
    default:
      return { heading: 'Something went wrong', description: 'An unexpected error occurred. Our team has been notified and is working on a fix.' };
  }
}

export const ProdErrorPage: React.FC<ProdErrorPageProps> = ({ statusCode = 500, supportEmail }) => {
  const { heading, description } = getStatusMessage(statusCode);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.statusCode}>{statusCode}</div>
        <h1 style={styles.heading}>{heading}</h1>
        <p style={styles.description}>{description}</p>

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

        {supportEmail && (
          <div style={styles.supportSection}>
            <p style={styles.supportText}>Need help?</p>
            <a href={`mailto:${supportEmail}`} style={styles.supportLink}>
              {supportEmail}
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
