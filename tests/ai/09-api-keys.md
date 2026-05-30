# API Keys & History Test Specifications

## Overview
Tests for organization API key management, rate limiting, field change history, and status/assignee tracking history.

---

## 1. API Key Management

### 1.1 API Keys Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to org settings → API Keys | API keys page loads |
| 2 | Verify key list | Existing keys listed (if any) |
| 3 | Verify "Create API Key" button | Button visible (admin only) |
| 4 | Verify key info columns | Name, prefix, created date, last used, status |

### 1.2 Create API Key
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Create API Key" | Creation dialog opens |
| 2 | Enter key name "CI Pipeline Agent" | Name accepted |
| 3 | Click create | Key generated |
| 4 | Verify key displayed | Full key shown ONCE |
| 5 | Verify copy button | Can copy key to clipboard |
| 6 | Verify warning | "This key won't be shown again" warning |
| 7 | Close dialog | Key prefix shown in list (e.g., `ax_****...`) |

### 1.3 Create API Key - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create with empty name | Error: "Name is required" |
| 2 | Create with duplicate name | Error or allowed (depends on policy) |

### 1.4 View API Key Details
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View API key in list | Key row visible |
| 2 | Verify key prefix | Only first few chars shown |
| 3 | Verify creation date | Date displayed |
| 4 | Verify last used date | Date or "Never" |
| 5 | Full key NOT visible | Key is hashed, cannot be retrieved |

### 1.5 Revoke API Key
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click revoke on a key | Confirmation dialog |
| 2 | Dialog warns about impact | "Agents using this key will stop working" |
| 3 | Confirm revocation | Key status changes to "Revoked" |
| 4 | Verify key non-functional | API calls with revoked key return 401 |

### 1.6 API Key Authentication
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make API call with valid key in header | Request succeeds (200) |
| 2 | Make API call with invalid key | 401 Unauthorized |
| 3 | Make API call with revoked key | 401 Unauthorized |
| 4 | Make API call with no key | 401 Unauthorized |

### 1.7 API Key Rate Limiting
**Priority**: High
**Type**: Performance

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make rapid API calls with valid key | First N calls succeed |
| 2 | Exceed rate limit | 429 Too Many Requests returned |
| 3 | Wait for rate limit window | Calls succeed again |

### 1.8 API Key Access Control
**Priority**: High
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as org admin | Can create/revoke keys |
| 2 | Login as org member | Cannot create/revoke keys (or limited) |
| 3 | Login as org viewer | No access to API key management |

---

## 2. SCM Provider Settings

### 2.1 Configure SCM Provider
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to API keys / integrations | SCM section visible |
| 2 | Configure Bitbucket/GitHub provider | Provider form shown |
| 3 | Enter credentials/tokens | Credentials accepted |
| 4 | Save | Provider configured |
| 5 | Verify connection status | "Connected" indicator shown |

---

## 3. Field Change History

### 3.1 View Field Changes
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item with change history | Item detail page |
| 2 | Navigate to history section | History tab/section visible |
| 3 | Verify field changes listed | Changes with old → new values |
| 4 | Verify timestamp per change | When each change happened |
| 5 | Verify actor per change | Who made each change |

### 3.2 Status Transition History
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View status history | Timeline of status changes |
| 2 | Verify transitions | "Backlog → Todo → In Progress → Done" |
| 3 | Verify time-in-status | Duration spent in each status |
| 4 | Verify visual timeline | Visual representation of flow |

### 3.3 Assignee Change History
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View assignee history | Timeline of assignments |
| 2 | Verify transitions | "Unassigned → Alice → Bob → Alice" |
| 3 | Verify durations | Time each person was assigned |

### 3.4 Point-in-Time Snapshots
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View work item history | History available |
| 2 | Select a point in time | Snapshot requested |
| 3 | Verify snapshot data | Item state at that time shown |
| 4 | Verify all fields | Status, assignee, priority as of that date |

### 3.5 SLA Checking
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Item has SLA configuration | SLA rules set |
| 2 | View SLA status | Time remaining or breach indicator |
| 3 | Item exceeds SLA | SLA breach warning displayed |

---

## 4. Audit Log (Organization Level)

### 4.1 View Organization Audit Log
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to org admin area | Admin section |
| 2 | View audit log | All org actions listed |
| 3 | Verify entry details | User, action, resource, timestamp |
| 4 | Verify resource types | work_item, project, member, etc. |

### 4.2 Audit Log Filtering
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter by user | Only that user's actions |
| 2 | Filter by resource type | Only that resource's events |
| 3 | Filter by date range | Only events in range |
| 4 | Filter by action type | Create, update, delete |

### 4.3 Audit Log Security
**Priority**: Critical
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify audit entries cannot be modified | No edit capability |
| 2 | Verify audit entries cannot be deleted | No delete capability |
| 3 | Verify all security events logged | Login, key creation, permission changes |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `apiKey.create` | Mutation | Generate new API key |
| `apiKey.list` | Query | List org API keys |
| `apiKey.revoke` | Mutation | Revoke an API key |
| `apiKey.setScmProvider` | Mutation | Configure SCM provider settings |
| `statusHistory.getTimeline` | Query | Status transition timeline |
| `statusHistory.getTimeInStatus` | Query | Duration per status |
| `statusHistory.getFieldChanges` | Query | Field change history |
| `statusHistory.getAssigneeHistory` | Query | Assignee changes |
| `statusHistory.getSlaStatus` | Query | SLA compliance check |
| `statusHistory.getPointInTimeSnapshot` | Query | Historical snapshot |

---

## Test Data Requirements

### API Keys
- At least 2 API keys (one active, one revoked)
- Key names: "CI Pipeline Agent", "Staging Agent"

### History Data
- Work item with multiple status changes over time
- Work item reassigned multiple times
- Work item with custom field changes
