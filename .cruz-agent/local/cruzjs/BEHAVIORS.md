# Social Auth Enhancement Behaviors

## Data Ownership
- Social accounts are user-specific (not org-scoped): queries filter by userId
- Each user can have one connection per provider (unique constraint on userId+provider)
- Each provider account can only be linked to one user (unique constraint on provider+providerUserId)

## Token Security
- Access tokens and refresh tokens are encrypted with AES-256-GCM before storage
- Each token has its own IV (accessTokenIv, refreshTokenIv) stored alongside
- Encryption uses Web Crypto API (Cloudflare Workers compatible)
- Encryption key from SCM_ENCRYPTION_KEY env var (64-char hex, 32 bytes)
- Tokens are never exposed via tRPC -- listConnections/getConnection exclude token fields

## OAuth State
- encodeOAuthState/decodeOAuthState use base64url-encoded JSON
- State includes: nonce (CSRF), createdAt (timestamp), redirectTo, userId (for linking)
- States expire after 10 minutes (MAX_STATE_AGE_MS)
- validateState uses constant-time comparison (timing-attack resistant)

## PKCE
- Providers declare requiresPkce flag: Google, Twitter, Microsoft = true; GitHub, Discord, LinkedIn = false
- Apple uses JWT client_secret instead of PKCE (handled separately in AppleProvider)
- Code verifier: 128-char URL-safe random string (base64url)
- Code challenge: SHA-256 hash of verifier, base64url-encoded

## Profile Sync
- syncProfile fetches fresh profile data from provider using stored access token
- If access token is expired and provider supports refresh, token is refreshed first
- Updates email, displayName, avatarUrl, username, metadata, lastSyncedAt

## REST API Router
- SocialAuthApiRouter provides /api/auth/social/:provider for server-side OAuth initiate
- SocialAuthApiRouter provides /api/auth/social/:provider/callback for server-side callback
- OAuth state is stored in a short-lived httpOnly cookie (10 min max-age)
- On callback success, session token is set via Set-Cookie and user is redirected

## Provider Specifics
- GitHub: username = login field; no PKCE; comma-separated scopes
- Google: PKCE required; space-separated scopes; refresh token via access_type=offline
- Discord: username = username field; avatar URL constructed from id+hash
- Twitter: PKCE required; Basic Auth for token exchange; email via placeholder (v2 API limitation)
- LinkedIn: OpenID Connect userinfo endpoint; space-separated scopes
- Microsoft: PKCE supported; configurable tenant (default: common)
- Apple: JWT client_secret (ES256); form_post response mode; id_token for profile

---

# Two-Factor Authentication Behaviors

## Data Ownership
- 2FA secrets are user-specific (not org-scoped): queries filter by userId
- Trusted devices are also user-specific
- No orgId on TwoFactorSecret or TrustedDevice tables

## TOTP Implementation
- RFC 6238 compliant using Web Crypto API (no Node.js crypto)
- HMAC-SHA1 for code generation (per spec)
- 30-second time step, 6-digit codes
- Clock skew tolerance: 1 window before and after (configurable)
- Base32 encoding for secrets (standard for authenticator apps)
- 160-bit (20-byte) secrets generated via crypto.getRandomValues

## Security
- Timing-safe string comparison for TOTP code verification
- SHA-256 hashing for backup codes (Web Crypto)
- XOR-based encryption for stored secrets using configurable key (TWO_FACTOR_ENCRYPTION_KEY or APP_SECRET)
- Backup codes normalized to lowercase before hashing

## Backup Codes
- 10 codes generated per user, 8 alphanumeric characters each
- Excludes confusing characters (0, o, 1, l, i)
- Each code is single-use (removed from stored array after verification)
- Codes stored as SHA-256 hashes (raw codes shown once to user)
- Regenerating codes replaces all existing backup codes on all verified methods

## Trusted Devices
- Default trust period: 30 days (configurable up to 365)
- Identified by device fingerprint string
- Re-trusting a device replaces the existing trust record
- Expired trusts are automatically excluded from isDeviceTrusted check

## Enforcement Middleware
- Configurable TwoFactorPolicy: required, allowedMethods, gracePeriodDays
- When required=false, middleware passes through immediately
- When 2FA service is not available (module not loaded), passes through
- Checks both isEnabled and getMethods against allowedMethods list
- Throws FORBIDDEN with descriptive message when 2FA not enrolled or wrong method

## OTP via SMS/Email
- Requires a TwoFactorAdapter to be bound (optional dependency)
- Generates 6-digit numeric codes
- Code is encrypted and stored in the secret field (temporary)
- Twilio adapter uses REST API with fetch (no SDK)
- Email adapter uses existing EmailService infrastructure

## tRPC Router
- All endpoints use protectedProcedure (user-scoped, no org context needed)
- setupTOTP: removes unverified TOTP records before creating new one
- verifySetup: validates code then marks as verified and stores hashed backup codes
- getStatus: returns { enabled, methods } without exposing secrets
- disable without method param removes ALL methods and trusted devices

## Adapter Pattern
- Cloudflare: CloudflareTwilioTwoFactorAdapter (Twilio via fetch)
- AWS: AWSSNSTwoFactorAdapter (placeholder for @aws-sdk/client-sns)
- GCP: GCPTwilioTwoFactorAdapter (Twilio via fetch)
- Azure: AzureCommServicesTwoFactorAdapter (placeholder for @azure/communication-sms)
- DigitalOcean: DOTwilioTwoFactorAdapter (Twilio via fetch)
- Docker: DockerTwilioTwoFactorAdapter (Twilio via fetch)

---

# Social OAuth Behaviors

## Data Ownership
- Social accounts are user-specific (not org-scoped): queries filter by userId
- No orgId on the SocialAccount table -- personal identity connections

## Security
- CSRF protection via state parameter (64-byte random hex, constant-time comparison)
- PKCE for Google, Twitter, Microsoft providers (code_verifier/code_challenge with SHA-256)
- Apple Sign In uses JWT client_secret signed with ES256 via Web Crypto
- State and codeVerifier stored in sessionStorage (browser-only, not cookies)
- Tokens stored as-is for MVP (TODO: encrypt with @cruzjs/core/shared/encryption)

## Provider Behavior
- GitHub: Falls back to /user/emails endpoint if email is not public
- Google: Always requests refresh token (access_type=offline, prompt=consent)
- Discord: Constructs avatar URL from CDN pattern
- Twitter: Requires PKCE; email not available via v2 API (placeholder used)
- LinkedIn: Uses OpenID Connect /v2/userinfo endpoint
- Microsoft: Defaults to "common" tenant, configurable via config.tenant
- Apple: User info only in id_token (no userinfo endpoint), first auth only provides email/name

## Auto-registration
- If no user exists with the provider's email, a new AuthIdentity is created
- IdentityCreatedEvent is dispatched for downstream profile creation
- Email is marked as verified (OAuth providers verify email)

## Account Linking
- If a user with the same email exists, the social account is linked automatically
- If currentUserId is provided to handleCallback, the account is explicitly linked
- Cannot link a provider account that belongs to another user
- Cannot have two connections to the same provider per user

---

# Webhook Behaviors

## Data Ownership
- Webhooks are org-scoped: all queries filter by orgId
- createdById tracks the user who registered the webhook
- Cascade delete on org and user foreign keys

## Schema Conventions
- Uses text-mode timestamps (ISO8601 strings) matching core schema conventions
- Events stored as JSON text (array of event type strings)
- Payload stored as JSON text in deliveries
- Status enum: 'pending' | 'success' | 'failed'

## HMAC Signing
- Uses Web Crypto API (compatible with CF Workers, Node 18+)
- HMAC-SHA256 with hex-encoded signature
- Secret auto-generated as 64-char hex (32 bytes entropy) on webhook creation
- Signature sent in X-Webhook-Signature header
- Event type sent in X-Webhook-Event header

## Dispatch Logic
- Fire-and-forget: creates delivery records and enqueues jobs, does not await delivery
- Filters active webhooks by orgId
- Matches events: wildcard '*' matches all events, otherwise exact match
- One delivery record per matching webhook
- Each delivery enqueued as 'webhook-delivery' job via JobService

## Delivery
- HTTP POST with JSON body to webhook URL
- 30-second timeout per request
- Response body truncated to 4096 chars for storage
- Success: HTTP 2xx status code
- Failure: non-2xx or network error

## Retry Policy
- Exponential backoff with jitter: 30s, 5min, 30min, 2h, 8h
- Maximum 5 attempts total
- Jitter factor: 10% of base delay (random)
- Failed deliveries scheduled for retry via JobService.createJob with scheduledFor
- After 5 attempts, status set to 'failed' permanently

## Redelivery
- Resets attempts to 0, clears error/status/response fields
- Creates a new job for immediate delivery

## Test Endpoint
- Dispatches a 'webhook.test' event to the specified webhook
- Payload includes message, triggeredBy (userId), webhookId, timestamp

## Incoming Verification
- verifyWebhookRequest() reads request body and checks signature header
- Default header: x-webhook-signature (configurable)
- Returns { verified: boolean, payload: string }
- Returns verified: false on missing header, empty body, or bad signature

## tRPC Router
- All endpoints use orgProcedure (org-scoped auth)
- create: generates secret, returns full webhook object
- list: ordered by createdAt descending
- get/update/delete: verify webhook belongs to org before operating
- deliveries: verify webhook belongs to org, supports limit and status filter
- redeliver: verify delivery's webhook belongs to org

---

# Maintenance Mode Behaviors

## State Storage
- Maintenance state is stored in KV cache under prefix `maintenance:state`
- Uses KVCacheServiceFactory to create a namespaced cache instance
- Default state is inactive with empty message and 3600s retryAfter

## Enable/Disable
- `enable()` writes a full MaintenanceState object (active, message, retryAfter, secret, enabledAt, enabledBy)
- `disable()` overwrites state with DEFAULT_MAINTENANCE_STATE (active=false)
- Secret and enabledBy are optional; both default to null

## Public Status
- `getStatus()` never exposes the bypass secret
- Returns only: active, message, retryAfter, enabledAt
- When inactive, returns only `{ active: false }` (no extra fields)

## Bypass Logic
- Bypass requires a secret to be configured at enable time
- Checks query param `?bypass=<secret>` first, then cookie `maintenance_bypass`
- Returns false (no bypass) when no secret is configured, even with a bypass param
- When bypassed via query param, the framework sets an httpOnly cookie (Max-Age=86400, SameSite=Lax)

## Middleware (withMaintenanceCheck)
- Returns null if maintenance is inactive (fast path)
- Returns null if request path matches an excluded path
- Returns null if request is bypassed (valid secret)
- Returns 503 Response with JSON body and Retry-After header when blocked
- Default excluded paths: /api/health, /api/trpc/maintenance.status, /api/trpc/maintenance.enable, /api/trpc/maintenance.disable
- Wildcard exclusions supported (e.g., `/api/admin/*`)

## createCruzApp Integration
- Set `maintenanceMode: true` or `maintenanceMode: { excludePaths: [...] }` in config
- Maintenance check runs before servePages() in the fetch handler
- If MaintenanceService is not bound in the container, the check is skipped
- If maintenance check throws, the error is logged and the request proceeds normally
- When bypassed via query param, the downstream response gets a Set-Cookie header

## tRPC Router
- `maintenance.status` is a public procedure (no auth required)
- `maintenance.enable` and `maintenance.disable` are protected procedures (require auth)
- `enable` records the authenticated user ID as enabledBy

---

# Rate Limiting Behaviors

## Named Limiters
- Limiters must be registered with `defineLimiter(name, config)` before use
- Calling `hit()` or `check()` with an unregistered name throws an error
- Multiple limiters can be registered via `defineLimiters([...])`

## Sliding Window Algorithm (default)
- Tracks individual request timestamps
- Expired timestamps (outside window) are pruned on each hit
- Remaining count is exact at any point in time
- A 0-second window means all requests immediately expire (always allowed)

## Fixed Window Algorithm (fallback)
- Uses discrete time windows based on first request timestamp
- Counter resets when current time exceeds windowStart + windowMs
- Less memory per key than sliding window
- Can allow up to 2x burst at window boundaries

## Rate Limit Service
- Falls back to in-memory SlidingWindowRateLimitAdapter when no adapter injected
- Keys are prefixed: `ratelimit:{keyPrefix}:{key}`
- keyPrefix defaults to limiter name if not specified in config
- `check()` reads remaining count without consuming a request
- `hit()` records a request and returns allowed/remaining/retryAfter

## Key Strategies
- `keyFromIp(request)`: extracts first IP from x-forwarded-for, prefixed with `ip:`
- `keyFromUser(userId)`: prefixed with `user:`
- `keyFromOrg(orgId)`: prefixed with `org:`
- `keyFromToken(tokenId)`: prefixed with `token:`

## tRPC Middleware
- Returns TRPCError with code `TOO_MANY_REQUESTS` when blocked
- Error message includes retryAfter seconds
- On success, attaches `rateLimit: { limit, remaining, retryAfter }` to context
- Default key extractor uses IP from request headers

## Adapter Pattern
- Cloudflare: uses KV with JSON-stored count + windowStart, auto-expiring TTL
- AWS/GCP/Azure/DO/Docker: Redis-based adapters with fallback to in-memory
- All Redis adapters document the MULTI/EXEC pattern for future implementation
- getRateLimiter() is optional on RuntimeAdapter (method may not exist)
