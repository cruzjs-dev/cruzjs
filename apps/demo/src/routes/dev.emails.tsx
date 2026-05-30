import { Link } from 'react-router';
import { allTemplateNames } from '@cruzjs/core/email/preview-samples';

export default function DevEmailsListPage() {
  if (import.meta.env.PROD) {
    return <div>Not found.</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Email Preview</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Dev only — renders templates with sample data, no emails sent.
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Template</th>
          </tr>
        </thead>
        <tbody>
          {allTemplateNames.map((name) => (
            <tr key={name} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '10px 12px' }}>
                <Link
                  to={`/dev/emails/${name}`}
                  style={{ color: '#2563eb', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.95rem' }}
                >
                  {name}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
