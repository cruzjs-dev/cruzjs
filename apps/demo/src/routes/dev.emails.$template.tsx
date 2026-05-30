import { handleCruzLoader } from '@cruzjs/core/routing';
import { EmailTemplateService } from '@cruzjs/core/email/template.service';
import { previewSamples, allTemplateNames } from '@cruzjs/core/email/preview-samples';
import type { EmailTemplate, EmailTemplateData } from '@cruzjs/core/email/template.service';
import { useLoaderData, Link } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { useState } from 'react';

export const loader = (args: LoaderFunctionArgs) =>
  handleCruzLoader([args], async ({ params, container }) => {
    if (process.env.NODE_ENV === 'production') {
      throw new Response('Not Found', { status: 404 });
    }

    const name = params.template as string;
    if (!allTemplateNames.includes(name as EmailTemplate)) {
      throw new Response(`Template "${name}" not found`, { status: 404 });
    }

    const template = name as EmailTemplate;
    const service = container.get<EmailTemplateService>(EmailTemplateService);
    const data = previewSamples[template] as EmailTemplateData[typeof template];
    const { html, text } = await service.renderTemplate(template, data);

    return {
      name: template,
      subject: service.getSubject(template),
      html,
      text,
    };
  });

export default function DevEmailPreviewPage() {
  const { name, subject, html, text } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState<'html' | 'text'>('html');

  if (import.meta.env.PROD) {
    return <div>Not found.</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem', background: '#f9fafb' }}>
        <Link to="/dev/emails" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>
          ← All templates
        </Link>
        <span style={{ color: '#d1d5db' }}>|</span>
        <code style={{ fontFamily: 'monospace', fontWeight: 600 }}>{name}</code>
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Subject: {subject}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {(['html', 'text'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid #d1d5db',
                background: tab === t ? '#1d4ed8' : 'white',
                color: tab === t ? 'white' : '#374151',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'html' ? (
          <iframe
            srcDoc={html}
            title={`${name} email preview`}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <pre style={{ margin: 0, padding: '1.5rem', overflow: 'auto', height: '100%', whiteSpace: 'pre-wrap', fontSize: '0.875rem', background: 'white' }}>
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}
