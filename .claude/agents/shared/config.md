# Agent Configuration

Central configuration for all autonomous agents. Update these values to change behavior globally.

## Git Configuration

```yaml
base_branch: main
pr_target_branch: main
```

## Local Development

```yaml
# Dev server (Vite + React Router v7)
dev_url: http://localhost:5173
dev_port: 5173

# Auth
login_path: /login
```

## Test Credentials

Update these with actual test account credentials:

```yaml
# Admin/Owner account
admin:
  email: admin@example.com
  password: test-password
  login_path: /login

# Org member account
member:
  email: member@example.com
  password: test-password
  login_path: /login
```

**To switch users**: Navigate to `/logout` first, then login with new credentials.

## Merge Before Work

All autonomous commands should merge the base branch before starting work:

```bash
git fetch origin main
git merge origin/main

# If conflicts, resolve and commit:
# git add . && git commit -m "{BRANCH}: Merge main"
```

## Work Directory

All agent artifacts go in:
```
.cruz-agent/local/{BRANCH_NAME}/
```

This directory is gitignored — it's local working state only.

## Package References

```yaml
# Core framework
core_package: "@cruzjs/core"
ui_package: "@cruzjs/start"
pro_package: "@cruzjs/saas"

# App packages use @cruzjs/ naming
```
