# Project Management Test Specifications

## Overview
Tests for project creation, settings, labels, repository linking, and project-level configuration within an organization.

---

## 1. Project Creation

### 1.1 Create Project Form Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects` | Projects list page loads |
| 2 | Click "New Project" button | Navigate to `/orgs/:slug/projects/new` |
| 3 | Verify form fields | Name, Key, Description fields visible |
| 4 | Verify key auto-generation | Typing name auto-generates project key |
| 5 | Verify submit button | "Create Project" button visible |

### 1.2 Create Project - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit with empty name | Error: "Name is required" |
| 2 | Submit with empty key | Error: "Key is required" |
| 3 | Enter key with spaces or special chars | Error: key must be uppercase alphanumeric |
| 4 | Enter key that already exists in org | Error: "Project key already in use" |
| 5 | Enter very long name (>100 chars) | Error or truncation |

### 1.3 Create Project - Key Auto-Generation
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "My Test Project" in name | Key auto-populates with "MTP" or similar |
| 2 | Edit the key manually | Key field becomes user-controlled |
| 3 | Clear name and retype | Key updates if not manually edited |

### 1.4 Create Project - Success Flow
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter valid name "Sprint Board" | Name accepted |
| 2 | Verify key generated (e.g., "SB") | Key field populated |
| 3 | Enter optional description | Description accepted |
| 4 | Click "Create Project" | Loading state |
| 5 | Verify redirect | Navigate to project board `/orgs/:slug/projects/SB` |
| 6 | Verify project in sidebar | New project appears in org navigation |

---

## 2. Project List

### 2.1 Projects Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects` | Projects page loads |
| 2 | Verify project cards/list | All org projects displayed |
| 3 | Each project shows name | Project names visible |
| 4 | Each project shows key | Project keys visible |
| 5 | Each project shows work item count | Item counts displayed |

### 2.2 Empty State
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View projects page with no projects | Empty state message shown |
| 2 | Verify CTA | "Create your first project" button/link visible |
| 3 | Click CTA | Navigate to create project form |

### 2.3 Navigate to Project
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a project card | Navigate to project board view |
| 2 | Verify URL | URL is `/orgs/:slug/projects/:projectKey` |
| 3 | Verify board loads | Kanban or list view rendered |

---

## 3. Project Settings

### 3.1 Settings Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/settings` | Settings page loads |
| 2 | Verify name field | Current project name shown |
| 3 | Verify description field | Current description shown |
| 4 | Verify save button | "Save Changes" button visible |

### 3.2 Update Project Name
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Change project name | New name entered |
| 2 | Click save | Loading state |
| 3 | Verify success | Success toast message |
| 4 | Verify name updated | New name reflected in sidebar/header |

### 3.3 Update Project Description
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Update description text | New description entered |
| 2 | Click save | Loading state |
| 3 | Verify success | Success message |
| 4 | Refresh page | Description persisted |

### 3.4 Delete Project
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "Delete Project" in settings | Danger zone visible |
| 2 | Click delete | Confirmation modal |
| 3 | Modal requires typing project name | Safety confirmation |
| 4 | Confirm deletion | Processing state |
| 5 | Verify redirect | Navigate back to projects list |
| 6 | Verify project removed | Project no longer in list |

### 3.5 Settings Access Control
**Priority**: High
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as org admin | Full settings access |
| 2 | Login as org member | Settings may be limited |
| 3 | Login as org viewer | Settings not accessible or read-only |

---

## 4. Project Labels

### 4.1 Label Manager Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project settings labels section | Label manager loads |
| 2 | Verify existing labels | Labels listed with name and color |
| 3 | Verify "Add Label" button | Button visible |

### 4.2 Create Label
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Label" | Label creation form appears |
| 2 | Enter label name "Bug" | Name accepted |
| 3 | Select color (e.g., red) | Color picker works |
| 4 | Click save | Label created |
| 5 | Verify label in list | New label appears |

### 4.3 Edit Label
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on existing label | Edit form opens |
| 2 | Change name | Name updated |
| 3 | Change color | Color updated |
| 4 | Save changes | Label updated |
| 5 | Verify on work items | Updated label reflected on tagged items |

### 4.4 Delete Label
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on a label | Confirmation prompt |
| 2 | Confirm deletion | Label removed |
| 3 | Verify work items | Label removed from previously tagged items |

---

## 5. Repository Linking

### 5.1 Link Repository
**Priority**: High
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project settings | Settings page |
| 2 | Find "Repositories" section | Repository config visible |
| 3 | Click "Link Repository" | Repository form opens |
| 4 | Enter repository URL/name | URL accepted |
| 5 | Configure branch naming convention | Convention set |
| 6 | Configure PR template | Template saved |
| 7 | Save | Repository linked |
| 8 | Verify in list | Repository appears in linked repos |

### 5.2 Edit Repository Settings
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on linked repo | Edit form opens |
| 2 | Update branch naming convention | Convention updated |
| 3 | Update PR template | Template updated |
| 4 | Save | Changes persisted |

### 5.3 Unlink Repository
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click unlink/remove on repository | Confirmation prompt |
| 2 | Confirm removal | Repository unlinked |
| 3 | Verify not in list | Repository removed from linked repos |

---

## 6. Cycles (Sprints)

### 6.1 Cycle List Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/cycles` | Cycles page loads |
| 2 | Verify cycle list | Active and past cycles shown |
| 3 | Verify create button | "New Cycle" button visible |

### 6.2 Create Cycle
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "New Cycle" | Creation form opens |
| 2 | Enter cycle name | Name accepted |
| 3 | Set start and end dates | Date range set |
| 4 | Save | Cycle created |
| 5 | Verify in list | New cycle appears |

### 6.3 Add Items to Cycle
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open a cycle | Cycle detail view |
| 2 | Add work items to cycle | Items associated |
| 3 | Verify items appear | Items listed under cycle |
| 4 | Remove item from cycle | Item disassociated |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `project.create` | Mutation | Create new project |
| `project.list` | Query | List org projects |
| `project.getByKey` | Query | Get project by key |
| `project.update` | Mutation | Update project details |
| `project.delete` | Mutation | Delete project |
| `project.addLabel` | Mutation | Create project label |
| `project.updateLabel` | Mutation | Update label |
| `project.deleteLabel` | Mutation | Delete label |
| `project.linkRepository` | Mutation | Link git repository |
| `project.unlinkRepository` | Mutation | Remove repository link |
| `cycle.create` | Mutation | Create cycle |
| `cycle.list` | Query | List project cycles |
| `cycle.addItems` | Mutation | Add items to cycle |

---

## Test Data Requirements

### Test Project
- Name: Test Project
- Key: TEST
- Description: "Project for automated testing"

### Test Labels
- "Bug" (red), "Feature" (green), "Enhancement" (blue)

### Test Repository
- URL: `https://github.com/test-org/test-repo`
- Branch convention: `feature/{key}-{title}`
