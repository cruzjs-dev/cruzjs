# Verification Instructions

## Dev Server

- **URL**: http://localhost:5000
- **Start**: Use the `dev_start` MCP tool
- **Check Ready**: Use `dev_terminal` MCP tool and look for "ready" or "listening" in the output
- **Stop**: Use `dev_kill_all` MCP tool to clean up all processes

## Login

1. Navigate to http://localhost:5000/auth/login
2. Use test credentials (check seed data or register a new account)
3. Verify the dashboard loads after login

## Key Pages to Check

- `/dashboard` - Main dashboard
- `/auth/login` - Login page
- `/auth/register` - Registration
- `/profile` - User profile

## TypeScript Check

Run `dev_typecheck` MCP tool to verify no type errors exist.

## After Testing

Always run `dev_kill_all` to clean up managed processes.
