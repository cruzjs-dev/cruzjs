# Discussions & Activity Test Specifications

## Overview
Tests for work item linking, discussion threads, comments, activity feed, and audit log tracking.

---

## 1. Work Item Links

### 1.1 Link Two Items
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Detail page loads |
| 2 | Find "Linked Items" section | Section visible |
| 3 | Click "Add Link" | Link dialog opens |
| 4 | Search for target item by number or title | Search results shown |
| 5 | Select link type "Blocks" | Relationship type set |
| 6 | Select target item | Item selected |
| 7 | Save link | Link created |
| 8 | Verify link displayed | "Blocks TEST-2" shown in linked items |

### 1.2 Link Types
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open link dialog | Link type dropdown visible |
| 2 | Verify "Blocks" option | Available |
| 3 | Verify "Is blocked by" option | Available |
| 4 | Verify "Relates to" option | Available |
| 5 | Verify "Duplicates" option | Available |

### 1.3 Bidirectional Links
**Priority**: High
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On TEST-1, create link "Blocks TEST-2" | Link saved |
| 2 | Navigate to TEST-2 | Detail page |
| 3 | Verify reverse link | "Is blocked by TEST-1" shown |

### 1.4 Remove Link
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View linked items | Links listed |
| 2 | Click remove/unlink on a link | Confirmation |
| 3 | Confirm removal | Link deleted |
| 4 | Verify both sides | Link removed from both items |

### 1.5 Link Validation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to link item to itself | Error: cannot self-link |
| 2 | Try to create duplicate link | Error: link already exists |

---

## 2. Discussions

### 2.1 Discussion Thread Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Discussions tab visible |
| 2 | Click Discussions tab | Discussion threads listed |
| 3 | Verify empty state | "No discussions yet" if none |
| 4 | Verify "Start Discussion" button | Button visible |

### 2.2 Start New Discussion
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Start Discussion" | Discussion form opens |
| 2 | Enter discussion title | Title accepted |
| 3 | Enter initial comment | Rich text editor with content |
| 4 | Submit | Discussion thread created |
| 5 | Verify thread appears | New thread in discussion list |
| 6 | Verify author | Creator name and avatar shown |
| 7 | Verify timestamp | Creation time displayed |

### 2.3 Reply to Discussion
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open existing discussion thread | Thread detail shown |
| 2 | Type reply in comment box | Text entered |
| 3 | Submit reply | Comment added to thread |
| 4 | Verify comment appears | New comment at end of thread |
| 5 | Verify author and timestamp | Correct user and time |

### 2.4 Pin Discussion
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click pin icon on discussion | Discussion pinned |
| 2 | Verify pin indicator | Pin icon shown |
| 3 | Verify pinned at top | Pinned discussions listed first |
| 4 | Unpin discussion | Discussion unpinned |

### 2.5 Edit Comment
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hover over own comment | Edit button appears |
| 2 | Click edit | Comment enters edit mode |
| 3 | Modify text | Changes applied |
| 4 | Save | Comment updated |
| 5 | Verify "edited" indicator | Timestamp shows "edited" |

### 2.6 Delete Comment
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hover over own comment | Delete button appears |
| 2 | Click delete | Confirmation prompt |
| 3 | Confirm | Comment removed |
| 4 | Verify thread integrity | Other comments unaffected |

### 2.7 Cannot Edit Others' Comments
**Priority**: High
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View another user's comment | Comment visible |
| 2 | Verify no edit button | Edit not available for others' comments |
| 3 | Verify no delete button | Delete not available (unless admin) |

---

## 3. Activity Feed

### 3.1 Activity Timeline Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Activity tab visible |
| 2 | Click Activity tab | Activity timeline loads |
| 3 | Verify entries | List of activity entries with timestamps |
| 4 | Verify avatars | User avatars shown for each entry |

### 3.2 Activity Entry Types
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create a work item | "created this item" entry |
| 2 | Change status | "changed status from X to Y" entry |
| 3 | Change priority | "changed priority from X to Y" entry |
| 4 | Assign to user | "assigned to X" entry |
| 5 | Add a label | "added label X" entry |
| 6 | Add a comment | "commented" entry |
| 7 | Link to another item | "linked to X" entry |
| 8 | Upload attachment | "attached file X" entry |

### 3.3 Activity Chronological Order
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View activity feed | Entries shown |
| 2 | Verify order | Most recent first (or chronological) |
| 3 | Verify timestamps | Accurate relative times ("2 min ago") |

### 3.4 Activity Filtering
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | If filter available | Filter options shown |
| 2 | Filter by type (comments only) | Only comment entries |
| 3 | Filter by type (changes only) | Only field change entries |

---

## 4. Audit Log

### 4.1 Immutable Audit Trail
**Priority**: Critical
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Perform multiple actions on work item | Actions recorded |
| 2 | View audit log | All actions listed |
| 3 | Verify entries include user | Actor recorded |
| 4 | Verify entries include timestamp | Precise timestamp |
| 5 | Verify entries include change details | Old value → new value |
| 6 | Verify entries are immutable | No edit/delete on audit entries |

### 4.2 Audit Log Details
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View an audit entry | Entry detail shown |
| 2 | Verify resource type | "workItem", "discussion", etc. |
| 3 | Verify action type | "create", "update", "delete" |
| 4 | Verify changes field | JSON diff of old/new values |
| 5 | Verify IP address captured | IP logged (for security) |

---

## 5. Status History

### 5.1 Status Timeline
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change item status multiple times | Transitions recorded |
| 2 | View status history section | Timeline of transitions |
| 3 | Each entry shows from/to status | "Todo → In Progress" |
| 4 | Each entry shows timestamp | When transition happened |
| 5 | Each entry shows who changed | User who made the change |

### 5.2 Time-in-Status Metrics
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View status history | History shown |
| 2 | Verify time-in-status | Duration spent in each status |
| 3 | Verify format | "2d 4h in Todo", "1d 2h in In Progress" |

### 5.3 Assignee History
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Reassign item multiple times | Changes recorded |
| 2 | View assignee history | Timeline of assignments |
| 3 | Each entry shows from/to | "Unassigned → Alice → Bob" |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `workItem.link` | Mutation | Create item link |
| `workItem.unlink` | Mutation | Remove item link |
| `discussion.create` | Mutation | Start new discussion thread |
| `discussion.addComment` | Mutation | Reply to discussion |
| `discussion.pin` | Mutation | Pin/unpin discussion |
| `discussion.updateComment` | Mutation | Edit comment |
| `discussion.deleteComment` | Mutation | Delete comment |
| `activity.list` | Query | Get activity feed |
| `activityFeed.list` | Query | Extended activity feed |
| `statusHistory.getTimeline` | Query | Status transition timeline |
| `statusHistory.getTimeInStatus` | Query | Duration per status |
| `statusHistory.getAssigneeHistory` | Query | Assignee change log |

---

## Test Data Requirements

### Discussion Scenarios
- Thread with multiple comments from different users
- Pinned and unpinned discussions
- Edited comments with edit history

### Link Scenarios
- Item blocking another item
- Related items
- Duplicate items
