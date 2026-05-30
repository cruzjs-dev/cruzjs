# CruzJS Test Specifications Overview

This directory contains comprehensive test specifications for the CruzJS application. Each file outlines manual and automated test scenarios to validate that features work correctly.

## Test Specification Files

| File | Description | Phase |
|------|-------------|-------|
| [01-authentication.md](./01-authentication.md) | User registration, login, password reset, email verification | Core |
| [02-user-profile.md](./02-user-profile.md) | Profile management, settings | Core |
| [03-organizations.md](./03-organizations.md) | Organization creation, members, invitations, settings, billing | Core |
| [04-projects.md](./04-projects.md) | Project CRUD, settings, labels, repository linking | Phase 01 |
| [05-work-items.md](./05-work-items.md) | Work item CRUD, rich text editor, status, priority, sub-tasks | Phase 01 |
| [06-board-views.md](./06-board-views.md) | Kanban board, list view, drag-and-drop, filtering, sorting | Phase 01 |
| [07-discussions-activity.md](./07-discussions-activity.md) | Work item links, discussions, comments, activity feed | Phase 01 |
| [08-custom-fields-attachments.md](./08-custom-fields-attachments.md) | Custom field definitions/values, file attachments, versioning | Phase 02 |
| [09-api-keys.md](./09-api-keys.md) | API key management, status history, field change history | Phase 01/02 |
| [10-pipelines.md](./10-pipelines.md) | Pipeline CRUD, visual editor, stages, steps, versioning, templates | Phase 03 |
| [11-pipeline-execution.md](./11-pipeline-execution.md) | Execution trigger, state machine, stage/step tracking, replay | Phase 03 |
| [12-agents.md](./12-agents.md) | Agent registration, polling, heartbeat, sessions, pools, stream | Phase 04 |
| [13-human-gates.md](./13-human-gates.md) | Gate configuration, review workflows, feedback, batch approvals | Phase 05 |
| [14-analytics-notifications.md](./14-analytics-notifications.md) | Cost analytics, pipeline metrics, dashboards, notifications, Slack | Phase 07 |

## Test Categories

### Smoke Tests
Quick sanity checks to verify core functionality works:
- User can login
- Dashboard loads
- Projects page is accessible
- Work items table renders
- Pipeline editor opens

### Functional Tests
Comprehensive tests for each feature:
- All CRUD operations
- Form validations
- Error handling
- Edge cases

### Integration Tests
End-to-end workflows spanning multiple features:
- Create project → Add work item → Assign → Track on board
- Create pipeline → Add stages/steps → Trigger execution → Monitor
- Register agent → Poll for work → Execute → Report results
- Configure gate → Trigger review → Approve/reject → Continue pipeline

### Regression Tests
Tests for previously reported bugs and fixed issues.

## Test Environment

### Prerequisites
- Node.js 20+
- Cloudflare D1 database (local via Miniflare)
- Cloudflare R2 (local via Miniflare)
- Environment variables configured

### Test Users
| Email | Password | Role | Notes |
|-------|----------|------|-------|
| admin@cruzjs.dev | Temp123! | Admin | Primary test account |
| member@cruzjs.dev | Test123! | Member | Secondary test account |

### Test Organization
- **Name**: CruzJS Dev
- **Slug**: cruzjs-dev
- **Plan**: Active subscription

### Test Project
- **Name**: Test Project
- **Key**: TEST
- **URL**: `/orgs/cruzjs-dev/projects/TEST`

## Running Tests

### E2E Tests (Playwright)
```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/tests/cruzjs.projects.spec.ts

# Run with UI
npm run test:e2e -- --ui
```

### Unit Tests (Vitest)
```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage
```

## Test Naming Conventions

- **Descriptive names**: `should display work items board with drag-and-drop`
- **Given-When-Then**: Implied in test structure
- **Feature prefix**: `[WorkItems] should filter by status`

## Reporting Issues

When a test fails, document:
1. Steps to reproduce
2. Expected vs actual behavior
3. Screenshots/recordings
4. Browser/environment info
5. Related test specification section
