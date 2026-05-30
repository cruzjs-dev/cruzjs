import React from 'react';

type DevErrorPageProps = {
  error: Error | unknown;
  url?: string;
  method?: string;
  statusCode?: number;
};

const styles = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    minHeight: '100vh',
    margin: 0,
    padding: '24px',
    boxSizing: 'border-box' as const,
  },
  wrapper: {
    maxWidth: '960px',
    margin: '0 auto',
  },
  header: {
    borderBottom: '1px solid #2a2a4a',
    paddingBottom: '20px',
    marginBottom: '0',
  },
  errorType: {
    fontSize: '13px',
    fontWeight: 600 as const,
    color: '#ff6b6b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '8px',
  },
  errorMessage: {
    fontSize: '22px',
    fontWeight: 700 as const,
    color: '#ffffff',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
    wordBreak: 'break-word' as const,
  },
  routeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#8888aa',
  },
  routeMethod: {
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    fontSize: '11px',
    fontWeight: 600 as const,
    color: '#7b68ee',
    backgroundColor: 'rgba(123, 104, 238, 0.15)',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  routePath: {
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    color: '#9999bb',
  },
  section: {
    borderBottom: '1px solid #2a2a4a',
    padding: '20px 0',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#6666aa',
    margin: '0 0 12px 0',
  },
  stackContainer: {
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    fontSize: '13px',
    lineHeight: 1.7,
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  stackLine: {
    padding: '4px 12px',
    borderRadius: '4px',
    transition: 'background-color 0.1s',
  },
  stackLineHighlight: {
    padding: '4px 12px',
    borderRadius: '4px',
    backgroundColor: 'rgba(123, 104, 238, 0.08)',
  },
  stackPrefix: {
    color: '#555577',
    marginRight: '4px',
  },
  stackFunction: {
    color: '#e0e0e0',
  },
  stackFilePath: {
    color: '#7b68ee',
  },
  stackLineNumber: {
    color: '#ff9f43',
  },
  stackNative: {
    color: '#555577',
    fontStyle: 'italic' as const,
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: '8px 16px',
    fontSize: '13px',
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
  },
  detailLabel: {
    color: '#6666aa',
    fontWeight: 500 as const,
  },
  detailValue: {
    color: '#ccccdd',
    wordBreak: 'break-all' as const,
  },
  statusBadge: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 600 as const,
    color: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    padding: '2px 8px',
    borderRadius: '3px',
  },
  footer: {
    padding: '20px 0 0 0',
    fontSize: '12px',
    color: '#444466',
  },
  footerLink: {
    color: '#7b68ee',
    textDecoration: 'none',
  },
} as const;

function parseStackLine(line: string): React.ReactNode {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('Error:') || trimmed.startsWith('TRPCError:')) {
    return null;
  }

  // Match: "at FunctionName (filepath:line:col)"
  const matchWithFn = trimmed.match(/^at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
  if (matchWithFn) {
    const [, fnName, filePath, lineNum, colNum] = matchWithFn;
    const isNodeModule = filePath.includes('node_modules');
    return (
      <li style={isNodeModule ? styles.stackLine : styles.stackLineHighlight}>
        <span style={styles.stackPrefix}>at </span>
        <span style={isNodeModule ? styles.stackNative : styles.stackFunction}>{fnName}</span>
        <span style={styles.stackPrefix}> (</span>
        <span style={isNodeModule ? styles.stackNative : styles.stackFilePath}>{filePath}</span>
        <span style={styles.stackPrefix}>:</span>
        <span style={styles.stackLineNumber}>{lineNum}</span>
        <span style={styles.stackPrefix}>:</span>
        <span style={styles.stackLineNumber}>{colNum}</span>
        <span style={styles.stackPrefix}>)</span>
      </li>
    );
  }

  // Match: "at filepath:line:col"
  const matchFilePath = trimmed.match(/^at\s+(.+?):(\d+):(\d+)$/);
  if (matchFilePath) {
    const [, filePath, lineNum, colNum] = matchFilePath;
    const isNodeModule = filePath.includes('node_modules');
    return (
      <li style={isNodeModule ? styles.stackLine : styles.stackLineHighlight}>
        <span style={styles.stackPrefix}>at </span>
        <span style={isNodeModule ? styles.stackNative : styles.stackFilePath}>{filePath}</span>
        <span style={styles.stackPrefix}>:</span>
        <span style={styles.stackLineNumber}>{lineNum}</span>
        <span style={styles.stackPrefix}>:</span>
        <span style={styles.stackLineNumber}>{colNum}</span>
      </li>
    );
  }

  // Fallback
  return (
    <li style={styles.stackLine}>
      <span style={styles.stackNative}>{trimmed}</span>
    </li>
  );
}

function getErrorInfo(error: Error | unknown): { name: string; message: string; stack: string[] } {
  if (error instanceof Error) {
    const stackLines = error.stack?.split('\n').filter(Boolean) ?? [];
    return {
      name: error.name || 'Error',
      message: error.message || 'An unknown error occurred',
      stack: stackLines,
    };
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: error, stack: [] };
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return {
      name: (error as any).name || 'Error',
      message: String((error as any).message),
      stack: [],
    };
  }

  return { name: 'Error', message: 'An unknown error occurred', stack: [] };
}

export const DevErrorPage: React.FC<DevErrorPageProps> = ({ error, url, method, statusCode }) => {
  const { name, message, stack } = getErrorInfo(error);

  let parsedUrl: URL | null = null;
  try {
    if (url) {
      parsedUrl = new URL(url);
    }
  } catch {
    // ignore invalid URLs
  }

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.errorType}>
            {statusCode ? `${statusCode} ` : ''}
            {name}
          </div>
          <h1 style={styles.errorMessage}>{message}</h1>
          {(method || parsedUrl) && (
            <div style={styles.routeBadge}>
              {method && <span style={styles.routeMethod}>{method}</span>}
              {parsedUrl && <span style={styles.routePath}>{parsedUrl.pathname + parsedUrl.search}</span>}
            </div>
          )}
        </div>

        {/* Stack Trace */}
        {stack.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Stack Trace</h2>
            <ul style={styles.stackContainer}>
              {stack.map((line, i) => {
                const parsed = parseStackLine(line);
                return parsed ? <React.Fragment key={i}>{parsed}</React.Fragment> : null;
              })}
            </ul>
          </div>
        )}

        {/* Request Details */}
        {(method || url || statusCode) && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Request Details</h2>
            <div style={styles.detailsGrid}>
              {statusCode && (
                <>
                  <span style={styles.detailLabel}>Status</span>
                  <span><span style={styles.statusBadge}>{statusCode}</span></span>
                </>
              )}
              {method && (
                <>
                  <span style={styles.detailLabel}>Method</span>
                  <span style={styles.detailValue}>{method}</span>
                </>
              )}
              {url && (
                <>
                  <span style={styles.detailLabel}>URL</span>
                  <span style={styles.detailValue}>{url}</span>
                </>
              )}
              {parsedUrl?.hostname && (
                <>
                  <span style={styles.detailLabel}>Host</span>
                  <span style={styles.detailValue}>{parsedUrl.hostname}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          CruzJS Development Server &mdash; This error page is only shown in development mode.
        </div>
      </div>
    </div>
  );
};
