import React, { useState, useCallback } from 'react';

type ErrorOverlayProps = {
  error: Error;
  onDismiss: () => void;
};

const styles = {
  backdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box' as const,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    border: '1px solid #2a2a4a',
    maxWidth: '720px',
    width: '100%',
    maxHeight: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #2a2a4a',
    gap: '16px',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  errorLabel: {
    fontSize: '11px',
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#ff6b6b',
    marginBottom: '6px',
  },
  errorMessage: {
    fontSize: '16px',
    fontWeight: 600 as const,
    color: '#ffffff',
    margin: 0,
    lineHeight: 1.4,
    wordBreak: 'break-word' as const,
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  button: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 500 as const,
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: '#aaaacc',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  dismissButton: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 500 as const,
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '6px',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    color: '#ff6b6b',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'background-color 0.15s',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '20px 24px',
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
    fontSize: '12px',
    lineHeight: 1.7,
    margin: 0,
    padding: 0,
    listStyle: 'none',
    color: '#ccccdd',
  },
  stackLine: {
    padding: '3px 10px',
    borderRadius: '4px',
  },
  stackLineHighlight: {
    padding: '3px 10px',
    borderRadius: '4px',
    backgroundColor: 'rgba(123, 104, 238, 0.08)',
  },
  stackPrefix: {
    color: '#555577',
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
  copiedBadge: {
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 500 as const,
    border: '1px solid rgba(75, 181, 67, 0.3)',
    borderRadius: '6px',
    backgroundColor: 'rgba(75, 181, 67, 0.1)',
    color: '#4bb543',
    cursor: 'default',
    whiteSpace: 'nowrap' as const,
  },
} as const;

function parseStackLine(line: string, index: number): React.ReactNode {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith('Error:') || trimmed.startsWith('TypeError:') || trimmed.startsWith('ReferenceError:')) {
    return null;
  }

  const matchWithFn = trimmed.match(/^at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
  if (matchWithFn) {
    const [, fnName, filePath, lineNum, colNum] = matchWithFn;
    const isNodeModule = filePath.includes('node_modules');
    return (
      <li key={index} style={isNodeModule ? styles.stackLine : styles.stackLineHighlight}>
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

  const matchFilePath = trimmed.match(/^at\s+(.+?):(\d+):(\d+)$/);
  if (matchFilePath) {
    const [, filePath, lineNum, colNum] = matchFilePath;
    const isNodeModule = filePath.includes('node_modules');
    return (
      <li key={index} style={isNodeModule ? styles.stackLine : styles.stackLineHighlight}>
        <span style={styles.stackPrefix}>at </span>
        <span style={isNodeModule ? styles.stackNative : styles.stackFilePath}>{filePath}</span>
        <span style={styles.stackPrefix}>:</span>
        <span style={styles.stackLineNumber}>{lineNum}</span>
        <span style={styles.stackPrefix}>:</span>
        <span style={styles.stackLineNumber}>{colNum}</span>
      </li>
    );
  }

  return (
    <li key={index} style={styles.stackLine}>
      <span style={styles.stackNative}>{trimmed}</span>
    </li>
  );
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ error, onDismiss }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = `${error.name}: ${error.message}\n\n${error.stack ?? ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [error]);

  const stackLines = error.stack?.split('\n').filter(Boolean) ?? [];

  return (
    <div style={styles.backdrop} onClick={onDismiss}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.errorLabel}>{error.name || 'Runtime Error'}</div>
            <p style={styles.errorMessage}>{error.message}</p>
          </div>
          <div style={styles.headerActions}>
            {copied ? (
              <span style={styles.copiedBadge}>Copied</span>
            ) : (
              <button style={styles.button} onClick={handleCopy} type="button">
                Copy error
              </button>
            )}
            <button style={styles.dismissButton} onClick={onDismiss} type="button">
              Dismiss
            </button>
          </div>
        </div>

        <div style={styles.body}>
          {stackLines.length > 0 && (
            <>
              <h3 style={styles.sectionTitle}>Stack Trace</h3>
              <ul style={styles.stackContainer}>
                {stackLines.map((line, i) => parseStackLine(line, i))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
