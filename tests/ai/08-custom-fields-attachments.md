# Custom Fields & Attachments Test Specifications

## Overview
Tests for custom field definitions, field groups, field values on work items, computed/formula fields, file attachments, versioning, and bulk download.

---

## 1. Custom Field Groups

### 1.1 Create Field Group
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to project settings → Custom Fields | Field management page loads |
| 2 | Click "Add Group" | Group creation form |
| 3 | Enter group name "Sprint Details" | Name accepted |
| 4 | Save | Group created |
| 5 | Verify in list | Group appears with expand/collapse |

### 1.2 Reorder Field Groups
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Drag group to new position | Group reordered |
| 2 | Verify order persists | Refresh shows same order |

---

## 2. Custom Field Definitions

### 2.1 Create Text Field
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Field" in a group | Field creation form |
| 2 | Enter name "Sprint Goal" | Name accepted |
| 3 | Select type "Text" | Text type selected |
| 4 | Set as optional | Required toggle off |
| 5 | Save | Field definition created |
| 6 | Verify on work item form | Text input appears on items |

### 2.2 Create Number Field
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add field "Story Points" | Name accepted |
| 2 | Select type "Number" | Number type selected |
| 3 | Set min value 0 | Minimum set |
| 4 | Set max value 100 | Maximum set |
| 5 | Save | Field created |
| 6 | Verify on work item | Number input with min/max validation |

### 2.3 Create Select Field
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add field "Component" | Name accepted |
| 2 | Select type "Select" | Select type chosen |
| 3 | Add options: "Frontend", "Backend", "API" | Options created |
| 4 | Save | Field created |
| 5 | Verify on work item | Dropdown with defined options |

### 2.4 Create Date Field
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add field "Due Date" | Name accepted |
| 2 | Select type "Date" | Date type chosen |
| 3 | Save | Field created |
| 4 | Verify on work item | Date picker appears |

### 2.5 Create Formula/Computed Field
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Add field "Weighted Score" | Name accepted |
| 2 | Select type "Formula" | Formula editor shown |
| 3 | Enter formula referencing other fields | Formula accepted |
| 4 | Validate formula | Formula validation passes |
| 5 | Save | Computed field created |
| 6 | Verify on work item | Computed value displayed (read-only) |

### 2.6 Field Definition Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create field with empty name | Error: "Name is required" |
| 2 | Create field with duplicate name in project | Error: "Field name already exists" |
| 3 | Enter invalid formula | Error: formula validation message |

### 2.7 Edit Field Definition
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on existing field | Edit form opens |
| 2 | Change field name | Name updated |
| 3 | Add new select option | Option added |
| 4 | Save | Changes applied |
| 5 | Verify existing values unaffected | Previous values still valid |

### 2.8 Delete Field Definition
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on field | Confirmation warning |
| 2 | Warning shows impact | "This will remove values from X items" |
| 3 | Confirm deletion | Field and all values deleted |

---

## 3. Custom Field Values

### 3.1 Set Text Field Value
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Custom fields section visible |
| 2 | Find "Sprint Goal" text field | Input visible |
| 3 | Enter value "Complete auth flow" | Text entered |
| 4 | Save/blur | Value persisted |
| 5 | Refresh page | Value still present |

### 3.2 Set Number Field Value
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "Story Points" field | Number input visible |
| 2 | Enter value 8 | Number accepted |
| 3 | Verify validation | Min/max enforced |
| 4 | Enter -1 | Error: below minimum |
| 5 | Enter 200 | Error: above maximum |

### 3.3 Set Select Field Value
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "Component" field | Dropdown visible |
| 2 | Click dropdown | Options shown (Frontend, Backend, API) |
| 3 | Select "Frontend" | Value set |
| 4 | Verify selection | "Frontend" displayed |

### 3.4 Set Date Field Value
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "Due Date" field | Date picker visible |
| 2 | Click to open picker | Calendar shown |
| 3 | Select a date | Date set |
| 4 | Verify format | Date displayed correctly |

### 3.5 Clear Field Value
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Field with existing value | Value shown |
| 2 | Clear the field | Value removed |
| 3 | Save | Empty value persisted |

### 3.6 Filter by Custom Fields
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open board/list filter panel | Custom field filters available |
| 2 | Filter by "Component = Frontend" | Only frontend items shown |
| 3 | Filter by "Story Points > 5" | Only items with >5 points |
| 4 | Combined custom + standard filters | Both applied correctly |

---

## 4. File Attachments

### 4.1 Upload Attachment
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item detail | Attachments section visible |
| 2 | Click "Upload" or drag file | File upload initiated |
| 3 | Select a file (e.g., screenshot.png) | File selected |
| 4 | Upload progress shown | Progress bar or spinner |
| 5 | Upload completes | File appears in attachments list |
| 6 | Verify file name | Original filename shown |
| 7 | Verify file size | Size displayed |

### 4.2 Drag-and-Drop Upload
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Drag file from desktop to drop zone | Drop zone highlighted |
| 2 | Drop file | Upload starts |
| 3 | Verify upload | File attached to work item |

### 4.3 Multiple File Upload
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select multiple files | Multiple files chosen |
| 2 | Upload | All files upload |
| 3 | Verify all in list | All files shown in attachments |

### 4.4 Download Attachment
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on attachment | Download initiated |
| 2 | Verify file downloads | File saved locally |
| 3 | Verify file integrity | Content matches uploaded file |

### 4.5 Delete Attachment
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on attachment | Confirmation prompt |
| 2 | Confirm deletion | Attachment removed |
| 3 | Verify not in list | File no longer shown |

### 4.6 File Type Restrictions
**Priority**: High
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload allowed types (png, jpg, pdf, txt) | Upload succeeds |
| 2 | Upload large file (>50MB) | Error: file too large |
| 3 | Verify MIME type checking | Only allowed types accepted |

---

## 5. Attachment Versioning

### 5.1 Upload New Version
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload file "design.png" | V1 created |
| 2 | Upload same filename again | Version dialog or auto-version |
| 3 | Verify version indicator | "V2" or version number shown |
| 4 | Verify both versions accessible | Version history visible |

### 5.2 View Version History
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click version indicator | Version list shown |
| 2 | Verify versions listed | V1, V2 with timestamps |
| 3 | Download specific version | Correct version downloaded |

---

## 6. Bulk Attachment Operations

### 6.1 Bulk Download
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select multiple attachments | Checkboxes checked |
| 2 | Click "Download Selected" | ZIP download initiated |
| 3 | Verify ZIP contents | All selected files included |

### 6.2 Filter Attachments
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open attachment list with many files | List shown |
| 2 | Filter by file type | Only matching types shown |
| 3 | Search by filename | Matching files shown |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `customField.createGroup` | Mutation | Create field group |
| `customField.createDefinition` | Mutation | Create field definition |
| `customField.updateDefinition` | Mutation | Update field definition |
| `customField.deleteDefinition` | Mutation | Delete field definition |
| `customField.setValue` | Mutation | Set field value on item |
| `customField.getValues` | Query | Get field values for item |
| `customField.validateFormula` | Query | Validate formula syntax |
| `attachment.upload` | Mutation | Upload file to R2 |
| `attachment.list` | Query | List item attachments |
| `attachment.delete` | Mutation | Delete attachment |
| `attachment.bulkDownload` | Query | Generate bulk download |

---

## Test Data Requirements

### Custom Fields
- Text: "Sprint Goal"
- Number: "Story Points" (0-100)
- Select: "Component" (Frontend, Backend, API)
- Date: "Due Date"
- Formula: "Weighted Score"

### Attachments
- Small image file (<1MB)
- PDF document
- Large file (near limit)
- Multiple versions of same file
