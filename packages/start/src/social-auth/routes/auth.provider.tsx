/**
 * OAuth Provider Redirect Page
 *
 * Route: /auth/:provider
 *
 * Generates the OAuth authorization URL and redirects the user to the provider.
 * Stores the state and codeVerifier in sessionStorage for validation on callback.
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';

const AuthProviderPage: React.FC = () => {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider) {
      setError('No provider specified');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/${provider}/callback`;
    const returnTo = searchParams.get('returnTo') || '/dashboard';

    // Call the tRPC endpoint to get the auth URL
    // Using fetch directly here since this is a standalone redirect page
    const params = new URLSearchParams({
      input: JSON.stringify({ provider, redirectUri }),
    });

    fetch(`/api/trpc/socialAuth.getAuthUrl?${params}`)
      .then((res) => res.json() as Promise<{ result?: { data?: { url: string; state: string; codeVerifier?: string } } }>)
      .then((data: { result?: { data?: { url: string; state: string; codeVerifier?: string } } }) => {
        if (!data.result?.data?.url) {
          setError('Failed to generate authorization URL');
          return;
        }

        const { url, state, codeVerifier } = data.result.data;

        // Store state and codeVerifier in sessionStorage for callback validation
        sessionStorage.setItem(`oauth_state_${provider}`, state);
        if (codeVerifier) {
          sessionStorage.setItem(`oauth_verifier_${provider}`, codeVerifier);
        }
        sessionStorage.setItem(`oauth_return_${provider}`, returnTo);

        // Redirect to provider
        window.location.href = url;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to initiate OAuth flow');
      });
  }, [provider, searchParams]);

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <a href="/auth/login">Back to login</a>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to {provider}...</p>
    </div>
  );
};

export default AuthProviderPage;
