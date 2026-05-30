# Human Gates & Approvals Test Specifications

## Overview
Tests for human gate configuration, approval/rejection workflows, feedback iterations, gate review pages, and batch approval operations.

---

## 1. Gate Configuration

### 1.1 Configure Human Gate Stage
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open pipeline editor | Editor loads |
| 2 | Add a "Human Gate" stage | Gate stage added |
| 3 | Open stage configuration | Gate settings panel |
| 4 | Set gate name "Code Review" | Name accepted |
| 5 | Configure required approvers | Approver list set |
| 6 | Set approval threshold | e.g., "1 of 2 approvers" |
| 7 | Save pipeline | Gate configuration saved |

### 1.2 Gate with Specific Reviewers
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open gate configuration | Settings panel |
| 2 | Add specific reviewers by name | Reviewers added |
| 3 | Set review type "All must approve" | Threshold set |
| 4 | Save | Config saved |
| 5 | Verify reviewer list | Names shown in config |

### 1.3 Gate with Role-Based Reviewers
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Configure gate for "Admin" role | Role-based config |
| 2 | Any org admin can review | Dynamic reviewer pool |

---

## 2. Gate Activation

### 2.1 Gate Triggers During Execution
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger pipeline with human gate | Execution starts |
| 2 | Execution reaches gate stage | Stage status: "needs_review" |
| 3 | Execution pauses at gate | Downstream stages blocked |
| 4 | Verify notification sent | Reviewers notified |
| 5 | Verify gate activation record | Gate activation created in DB |

### 2.2 Gate Pending State
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Execution paused at gate | Gate active |
| 2 | View execution detail | Gate stage shows "Awaiting Review" |
| 3 | Verify visual indicator | Review icon/badge on stage |
| 4 | Verify timer | Time waiting for review shown |

---

## 3. Gate Review Page

### 3.1 Review Page Display
**Priority**: Critical
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/gate-review/:activationId` | Review page loads |
| 2 | Verify gate name | "Code Review" shown |
| 3 | Verify context | Work item details visible |
| 4 | Verify execution context | Pipeline stage context shown |
| 5 | Verify action buttons | "Approve" and "Request Changes" visible |
| 6 | Verify feedback area | Comment/feedback text area |

### 3.2 Approve Gate
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open gate review page | Page loads |
| 2 | Optionally add approval comment | Comment entered |
| 3 | Click "Approve" | Loading state |
| 4 | Verify gate approved | Status changes to "approved" |
| 5 | Verify execution continues | Downstream stages start |
| 6 | Verify activity log | "approved by X" recorded |

### 3.3 Request Changes
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open gate review page | Page loads |
| 2 | Enter feedback "Need to fix error handling" | Feedback entered |
| 3 | Click "Request Changes" | Loading state |
| 4 | Verify gate returns to work | Stage loops back |
| 5 | Verify feedback stored | Feedback visible in iteration |
| 6 | Verify iteration counter | Iteration incremented |

### 3.4 Review Access Control
**Priority**: High
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Designated reviewer opens page | Full access to approve/reject |
| 2 | Non-reviewer opens page | Read-only or access denied |
| 3 | Verify reviewer validation | Only authorized users can take action |

---

## 4. Feedback Iterations

### 4.1 View Iteration History
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Gate has been through multiple iterations | History exists |
| 2 | View gate review page | Iteration history shown |
| 3 | Verify iteration list | "Iteration 1: Changes requested", "Iteration 2: Approved" |
| 4 | Each iteration shows feedback | Reviewer comments visible |
| 5 | Each iteration shows timestamp | When action was taken |

### 4.2 Multiple Feedback Cycles
**Priority**: High
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Reviewer requests changes (iteration 1) | Work returns to agent |
| 2 | Agent makes changes | Work re-submitted |
| 3 | Gate re-activates (iteration 2) | Reviewer notified again |
| 4 | Reviewer requests changes again | Another feedback cycle |
| 5 | Verify iteration count | "Iteration 3" shown |
| 6 | Reviewer approves | Gate passes, pipeline continues |

### 4.3 Feedback Visibility
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View execution detail | Gate feedback accessible |
| 2 | View work item detail | Gate feedback linked |
| 3 | All stakeholders can see feedback | Visibility to team |

---

## 5. Approval Queue

### 5.1 Approval Queue Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/approvals` | Approval queue page loads |
| 2 | Verify pending approvals list | All pending gates listed |
| 3 | Each item shows pipeline name | Pipeline context visible |
| 4 | Each item shows work item | Associated work item |
| 5 | Each item shows wait time | How long it's been pending |
| 6 | Each item shows gate name | "Code Review", etc. |

### 5.2 Take Action from Queue
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a pending approval | Navigate to review page |
| 2 | Take action (approve/reject) | Action processed |
| 3 | Return to queue | Item removed from pending list |

### 5.3 Filter Approval Queue
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter by project | Only that project's gates |
| 2 | Filter by pipeline | Only that pipeline's gates |
| 3 | Filter by assigned to me | Only gates I'm reviewer for |

---

## 6. Batch Approvals

### 6.1 Select Multiple Gates
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View approval queue | Multiple pending gates |
| 2 | Select checkboxes on multiple gates | Gates selected |
| 3 | "Approve Selected" button appears | Bulk action available |

### 6.2 Batch Approve
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select multiple gates | Gates checked |
| 2 | Click "Approve Selected" | Confirmation dialog |
| 3 | Optionally add batch comment | Comment for all |
| 4 | Confirm | All selected gates approved |
| 5 | Verify all executions continue | Downstream stages start |

---

## 7. Notifications for Gates

### 7.1 Reviewer Notification
**Priority**: High
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Gate activates during execution | Activation occurs |
| 2 | Designated reviewer gets notification | In-app notification |
| 3 | Notification has link to review page | Direct link to gate review |
| 4 | If Slack connected | Slack message sent |

### 7.2 Gate Timeout Warning
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Gate has been pending for extended time | Long wait |
| 2 | Verify reminder notification | Follow-up notification sent |
| 3 | Verify escalation | If configured, escalation triggered |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `humanGate.configure` | Mutation | Set gate configuration |
| `humanGate.getActivation` | Query | Get gate activation details |
| `humanGate.takeAction` | Mutation | Approve or request changes |
| `humanGate.listPending` | Query | List pending approvals |
| `humanGate.getIterations` | Query | Get feedback iterations |
| `humanGate.batchApprove` | Mutation | Approve multiple gates |

---

## Test Data Requirements

### Gate Scenarios
- Gate pending review (no action taken)
- Gate approved on first try
- Gate with 3 iterations of feedback
- Gate with multiple required reviewers

### Test Reviewers
- Admin user (designated reviewer)
- Member user (not a reviewer)
- Multiple reviewers for threshold testing
