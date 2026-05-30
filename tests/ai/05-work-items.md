# Work Item Test Specifications

## Overview
Tests for work item creation, editing, rich text descriptions, status management, priority, assignment, sub-tasks, acceptance criteria, and linking.

---

## 1. Work Item Creation

### 1.1 Create Work Item Form Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/items/new` | Create form loads |
| 2 | Verify title field | Title input visible |
| 3 | Verify description editor | Tiptap rich text editor visible |
| 4 | Verify status selector | Status dropdown with options |
| 5 | Verify priority selector | Priority dropdown (None, Low, Medium, High, Urgent) |
| 6 | Verify assignee selector | Assignee dropdown with org members |
| 7 | Verify label selector | Label multi-select with project labels |
| 8 | Verify submit button | "Create" button visible |

### 1.2 Create Work Item - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit with empty title | Error: "Title is required" |
| 2 | Enter very long title (>200 chars) | Error or truncation |
| 3 | Submit with only title | Item created with defaults (Backlog status, no priority) |

### 1.3 Create Work Item - Success Flow
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter title "Implement login page" | Title accepted |
| 2 | Add rich text description | Description saved |
| 3 | Set status to "Todo" | Status selected |
| 4 | Set priority to "High" | Priority selected |
| 5 | Assign to team member | Assignee set |
| 6 | Add labels "Feature", "Frontend" | Labels attached |
| 7 | Click "Create" | Loading state |
| 8 | Verify redirect | Navigate to work item detail |
| 9 | Verify item number | Auto-generated number (e.g., TEST-1) |
| 10 | Verify all fields saved | Title, description, status, priority, assignee, labels correct |

### 1.4 Create Work Item - Auto-Numbering
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create first item in project | Item number is `{KEY}-1` |
| 2 | Create second item | Item number is `{KEY}-2` |
| 3 | Delete first item, create third | Item number is `{KEY}-3` (no reuse) |

---

## 2. Work Item Detail

### 2.1 Detail Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/items/:number` | Detail page loads |
| 2 | Verify title displayed | Work item title shown |
| 3 | Verify item number | Number shown (e.g., TEST-1) |
| 4 | Verify description | Rich text description rendered |
| 5 | Verify sidebar metadata | Status, priority, assignee, labels shown |
| 6 | Verify tabs/sections | Discussions, Activity, Links, Attachments visible |

### 2.2 Edit Work Item Title
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on title to edit | Title becomes editable |
| 2 | Change title text | New title entered |
| 3 | Save (blur or Enter) | Title updated |
| 4 | Verify activity log | "changed title" entry in activity |

### 2.3 Edit Work Item Description
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click description to edit | Tiptap editor activated |
| 2 | Add formatted text (bold, italic, code) | Formatting applied |
| 3 | Add bullet list | List rendered |
| 4 | Add code block | Code block with syntax highlighting |
| 5 | Add task list | Checkboxes rendered |
| 6 | Save changes | Description updated |

---

## 3. Rich Text Editor (Tiptap)

### 3.1 Text Formatting
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type text and select it | Text selected |
| 2 | Click bold button (or Ctrl+B) | Text becomes bold |
| 3 | Click italic button (or Ctrl+I) | Text becomes italic |
| 4 | Click strikethrough | Text gets strikethrough |
| 5 | Click inline code | Text wrapped in code formatting |

### 3.2 Block Elements
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type `/` to open command menu | Slash command menu appears |
| 2 | Select "Heading 1" | Text becomes H1 |
| 3 | Select "Bullet List" | Bullet list created |
| 4 | Select "Numbered List" | Ordered list created |
| 5 | Select "Code Block" | Code block inserted |
| 6 | Select "Task List" | Task list with checkboxes |
| 7 | Select "Blockquote" | Blockquote formatting |

### 3.3 Task List Interactions
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Insert task list | Checkboxes appear |
| 2 | Click checkbox | Task marked complete |
| 3 | Click again | Task marked incomplete |
| 4 | Add multiple items | Multiple tasks with independent checkboxes |

### 3.4 Keyboard Shortcuts
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ctrl+B | Toggle bold |
| 2 | Ctrl+I | Toggle italic |
| 3 | Ctrl+Shift+X | Toggle strikethrough |
| 4 | Ctrl+E | Toggle code |
| 5 | Ctrl+Shift+7 | Toggle ordered list |
| 6 | Ctrl+Shift+8 | Toggle bullet list |

---

## 4. Status Management

### 4.1 Change Status
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Current status shown |
| 2 | Click status dropdown | Status options displayed |
| 3 | Select "In Progress" | Status updated immediately |
| 4 | Verify status badge color | Color matches new status |
| 5 | Verify activity log | "changed status" entry recorded |

### 4.2 Status Options
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open status dropdown | All statuses visible |
| 2 | Verify standard statuses | Backlog, Todo, In Progress, In Review, Done, Cancelled |
| 3 | Each status has distinct color | Colors differentiate statuses |

### 4.3 Status History
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change status multiple times | Transitions recorded |
| 2 | View status history section | All transitions listed with timestamps |
| 3 | Verify time-in-status | Duration in each status calculated |

---

## 5. Priority Management

### 5.1 Set Priority
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Current priority shown |
| 2 | Click priority dropdown | Priority options displayed |
| 3 | Select "Urgent" | Priority updated |
| 4 | Verify priority icon/color | Visual indicator matches |
| 5 | Verify activity log | "changed priority" recorded |

### 5.2 Priority Options
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open priority dropdown | All priorities visible |
| 2 | Verify options | None, Low, Medium, High, Urgent |
| 3 | Each priority has distinct icon | Icons differentiate priorities |

---

## 6. Assignment

### 6.1 Assign Work Item
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Assignee section visible |
| 2 | Click assignee field | Member dropdown appears |
| 3 | Select a team member | Assignee set |
| 4 | Verify avatar/name shown | Assignee displayed |
| 5 | Verify activity log | "assigned to X" recorded |

### 6.2 Reassign Work Item
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click current assignee | Dropdown opens |
| 2 | Select different member | Assignee changed |
| 3 | Verify activity log | "reassigned from X to Y" recorded |

### 6.3 Unassign Work Item
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click current assignee | Dropdown opens |
| 2 | Select "Unassigned" or clear | Assignee removed |
| 3 | Verify "Unassigned" shown | No assignee displayed |

---

## 7. Sub-Tasks

### 7.1 Add Sub-Task
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Sub-tasks section visible |
| 2 | Click "Add Sub-Task" | Input field appears |
| 3 | Enter sub-task title | Title accepted |
| 4 | Save sub-task | Sub-task created with checkbox |
| 5 | Verify in list | Sub-task appears under parent |

### 7.2 Complete Sub-Task
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click checkbox on sub-task | Sub-task marked complete |
| 2 | Verify visual state | Strikethrough or completed styling |
| 3 | Verify progress indicator | Parent shows completion count (e.g., 1/3) |

### 7.3 Delete Sub-Task
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Hover over sub-task | Delete button appears |
| 2 | Click delete | Sub-task removed |
| 3 | Verify progress updates | Count decremented |

---

## 8. Acceptance Criteria

### 8.1 Add Acceptance Criteria
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Acceptance criteria section visible |
| 2 | Click "Add Criteria" | Input field appears |
| 3 | Enter criteria text | Text accepted |
| 4 | Save | Criteria added with checkbox |

### 8.2 Complete Acceptance Criteria
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click checkbox on criteria | Criteria marked met |
| 2 | Verify completion tracking | Shows met/total count |
| 3 | Mark all criteria met | 100% completion indicator |

---

## 9. Labels

### 9.1 Add Labels to Work Item
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Labels section visible |
| 2 | Click "Add Label" | Label dropdown with project labels |
| 3 | Select one or more labels | Labels attached |
| 4 | Verify label badges | Colored label badges displayed |

### 9.2 Remove Label from Work Item
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click X on a label badge | Label removed |
| 2 | Verify label gone | Label no longer shown on item |

---

## 10. Work Item Deletion

### 10.1 Delete Work Item
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Item displayed |
| 2 | Click delete/archive action | Confirmation modal |
| 3 | Confirm deletion | Item deleted |
| 4 | Verify redirect | Navigate back to board/list |
| 5 | Verify item removed | Item no longer in views |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `workItem.create` | Mutation | Create work item |
| `workItem.getByNumber` | Query | Get item by project key + number |
| `workItem.list` | Query | List items with filters |
| `workItem.update` | Mutation | Update item fields |
| `workItem.delete` | Mutation | Delete work item |
| `workItem.assign` | Mutation | Assign/reassign item |
| `workItem.link` | Mutation | Link two items |
| `workItem.unlink` | Mutation | Remove link |

---

## Test Data Requirements

### Test Work Items
- "Implement login page" (Todo, High, assigned)
- "Fix header alignment" (In Progress, Medium, assigned)
- "Write API docs" (Backlog, Low, unassigned)
- "Deploy to staging" (Done, Urgent, assigned)
