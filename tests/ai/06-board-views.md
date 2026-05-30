# Board & List View Test Specifications

## Overview
Tests for Kanban board view, list view, drag-and-drop functionality, filtering, sorting, and view switching within projects.

---

## 1. Kanban Board View

### 1.1 Board Display
**Priority**: Critical
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key` | Board view loads |
| 2 | Verify columns present | One column per status (Backlog, Todo, In Progress, In Review, Done) |
| 3 | Verify column headers | Each column shows status name and item count |
| 4 | Verify cards in columns | Work items displayed as cards in correct status columns |
| 5 | Verify card content | Each card shows title, item number, priority icon, assignee avatar |

### 1.2 Kanban Card Content
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View a card on the board | Card rendered |
| 2 | Verify item number | Number shown (e.g., TEST-1) |
| 3 | Verify title | Title text visible |
| 4 | Verify priority indicator | Priority icon/color shown |
| 5 | Verify assignee avatar | Assignee avatar or initials shown |
| 6 | Verify labels | Label badges visible if assigned |

### 1.3 Click Card to Open Detail
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a Kanban card | Navigate to work item detail page |
| 2 | Verify URL | URL is `/orgs/:slug/projects/:key/items/:number` |
| 3 | Navigate back | Return to board with same scroll position |

---

## 2. Drag-and-Drop

### 2.1 Drag Card Between Columns
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Grab a card in "Todo" column | Card enters drag state (visual feedback) |
| 2 | Drag to "In Progress" column | Drop zone highlighted |
| 3 | Drop the card | Card moves to "In Progress" column |
| 4 | Verify status updated | Item status changed to "In Progress" |
| 5 | Verify column counts | Source count decremented, target incremented |
| 6 | Verify activity log | Status change recorded |

### 2.2 Drag Card Within Column (Reorder)
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Grab a card in a column with multiple items | Card enters drag state |
| 2 | Drag above another card in same column | Insertion indicator shown |
| 3 | Drop the card | Card reordered within column |
| 4 | Verify order persists | Refresh shows same order |

### 2.3 Drag to Empty Column
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Grab a card | Card in drag state |
| 2 | Drag to empty column | Empty column shows drop zone |
| 3 | Drop card | Card placed in empty column |
| 4 | Verify status change | Status updated to column status |

### 2.4 Drag Cancellation
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Grab a card | Card in drag state |
| 2 | Press Escape | Drag cancelled |
| 3 | Verify card returns | Card back in original position |
| 4 | Verify no status change | Status unchanged |

---

## 3. List View

### 3.1 List View Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Switch to list view | Table/list renders |
| 2 | Verify table headers | Number, Title, Status, Priority, Assignee, Labels, Updated |
| 3 | Verify rows | One row per work item |
| 4 | Verify row data | All columns populated correctly |

### 3.2 List View Pagination
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Have >25 items in project | Pagination controls visible |
| 2 | Verify page 1 | First page of items shown |
| 3 | Click "Next" | Second page loaded |
| 4 | Verify cursor-based pagination | Smooth transition, no duplicates |

### 3.3 Click Row to Open Detail
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a list row | Navigate to work item detail |
| 2 | Verify URL | Correct item URL |
| 3 | Navigate back | Return to list with same scroll/page |

---

## 4. View Switching

### 4.1 Switch Between Board and List
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View board (default) | Kanban board shown |
| 2 | Click "List" toggle | Switches to list view |
| 3 | Verify same items | Same items displayed in table |
| 4 | Click "Board" toggle | Switches back to Kanban |
| 5 | Verify persistence | View preference remembered |

### 4.2 Calendar View
**Priority**: Medium
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/calendar` | Calendar view loads |
| 2 | Verify month view | Calendar grid displayed |
| 3 | Verify items with dates | Items shown on their due dates |

---

## 5. Filtering

### 5.1 Filter by Status
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open filter panel | Filter options visible |
| 2 | Select status "In Progress" | Filter applied |
| 3 | Verify board/list | Only "In Progress" items shown |
| 4 | Clear filter | All items shown again |

### 5.2 Filter by Priority
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open filter panel | Filter options visible |
| 2 | Select priority "High" | Filter applied |
| 3 | Verify results | Only high priority items shown |

### 5.3 Filter by Assignee
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open filter panel | Filter options visible |
| 2 | Select an assignee | Filter applied |
| 3 | Verify results | Only items assigned to that person |
| 4 | Select "Unassigned" | Only unassigned items shown |

### 5.4 Filter by Label
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open filter panel | Filter options visible |
| 2 | Select label "Bug" | Filter applied |
| 3 | Verify results | Only items with "Bug" label |

### 5.5 Combined Filters
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter by status "In Progress" | Applied |
| 2 | Also filter by priority "High" | Both filters active |
| 3 | Verify results | Only high priority, in-progress items |
| 4 | Clear all filters | All items restored |

### 5.6 Empty Filter Results
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Apply filter combination with no matches | No results |
| 2 | Verify empty state | "No items match filters" message |
| 3 | Verify clear option | "Clear filters" button visible |

---

## 6. Sorting

### 6.1 Sort by Column (List View)
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Priority" column header | Items sorted by priority |
| 2 | Click again | Sort direction reversed |
| 3 | Click "Updated" header | Items sorted by last updated |
| 4 | Verify visual indicator | Sort arrow shows direction |

### 6.2 Sort by Title
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Title" header | Alphabetical sort A-Z |
| 2 | Click again | Reverse sort Z-A |

---

## 7. Saved Views

### 7.1 Save Current View
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Apply filters and sorting | View configured |
| 2 | Click "Save View" | Save dialog opens |
| 3 | Enter view name "My Bugs" | Name accepted |
| 4 | Save | View saved |
| 5 | Verify in view list | "My Bugs" appears in saved views |

### 7.2 Load Saved View
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on saved view "My Bugs" | View loaded |
| 2 | Verify filters applied | Same filters as when saved |
| 3 | Verify sort applied | Same sorting as when saved |

### 7.3 Delete Saved View
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on saved view | Confirmation |
| 2 | Confirm | View deleted |
| 3 | Verify removed from list | View no longer available |

---

## 8. Quick Actions

### 8.1 Create Item from Board
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "+" at bottom of a column | Quick-add input appears |
| 2 | Type item title | Title entered |
| 3 | Press Enter | Item created with column's status |
| 4 | Verify card appears | New card in that column |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `board.getBoard` | Query | Get Kanban board data |
| `board.getListData` | Query | Get list view data |
| `board.moveItem` | Mutation | Move item between columns/positions |
| `workItem.list` | Query | Filtered/sorted item list |
| `views.save` | Mutation | Save view configuration |
| `views.list` | Query | List saved views |
| `views.delete` | Mutation | Delete saved view |

---

## Test Data Requirements

### Board Setup
- Project with at least 10 work items across multiple statuses
- Items with varied priorities, assignees, and labels
- At least one empty status column
