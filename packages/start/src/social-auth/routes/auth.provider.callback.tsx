/**
 * OAuth Provider Callback Page
 *
 * Route: /auth/:provider/callback
 *
 * Handles the OAuth callback from the provider. Reads the authorization code
 * and state from URL params, validates state against sessionStorage, and
 * exchanges the code for a session via the tRPC endpoint.
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import { storeSessionToken } from '@cruzjs/core/auth/auth-client';

const AuthProviderCallbackPage: React.FC = () => {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider) {
      setError('No provider specified');
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle provider-side errors
    if (errorParam) {
      setError(errorDescription || errorParam);
      return;
    }

    if (!code || !state) {
      setError('Missing authorization code or state parameter');
      return;
    }

    // Retrieve stored state and code verifier
    const expectedState = sessionStorage.getItem(`oauth_state_${provider}`);
    const codeVerifier = sessionStorage.getItem(`oauth_verifier_${provider}`);
    const returnTo = sessionStorage.getItem(`oauth_return_${provider}`) || '/dashboard';

    // Clean up sessionStorage
    sessionStorage.removeItem(`oauth_state_${provider}`);
    sessionStorage.removeItem(`oauth_verifier_${provider}`);
    sessionStorage.removeItem(`oauth_return_${provider}`);

    if (!expectedState) {
      setError('OAuth state not found. Please try again.');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/${provider}/callback`;

    // Call the handleCallback endpoint
    fetch('/api/trpc/socialAuth.handleCallback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        code,
        state,
        expectedState,
        redirectUri,
        codeVerifier: codeVerifier || undefined,
      }),
    })
      .then((res) => res.json() as Promise<{
        result?: {
          data?: {
            user: { id: string; email: string };
            session: { token: string; expiresAt: string };
            isNewUser: boolean;
          };
        };
        error?: { message: string };
      }>)
      .then((data: {
        result?: {
          data?: {
            user: { id: string; email: string };
            session: { token: string; expiresAt: string };
            isNewUser: boolean;
          };
        };
        error?: { message: string };
      }) => {
        if (data.error) {
          setError(data.error.message || 'Authentication failed');
          return;
        }

        const result = data.result?.data;
        if (!result?.session?.token) {
          setError('Authentication failed: no session returned');
          return;
        }

        // Store session token
        storeSessionToken(result.session.token);

        // Redirect to dashboard or onboarding
        if (result.isNewUser) {
          navigate('/profile/settings');
        } else {
          navigate(returnTo);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      });
  }, [provider, searchParams, navigate]);

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
      <p>Completing authentication...</p>
    </div>
  );
};

export default AuthProviderCallbackPage;
