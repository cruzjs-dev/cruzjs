# Pipeline Test Specifications

## Overview
Tests for pipeline CRUD, visual DAG editor with React Flow, stages, steps, versioning, templates, and cloning.

---

## 1. Pipeline List

### 1.1 Pipeline List Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/pipelines` | Pipeline list page loads |
| 2 | Verify pipeline cards/rows | All project pipelines listed |
| 3 | Each pipeline shows name | Pipeline names visible |
| 4 | Each pipeline shows stage count | Number of stages shown |
| 5 | Each pipeline shows last run status | Status indicator (if executed) |
| 6 | Verify "New Pipeline" button | Button visible |

### 1.2 Empty State
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View pipelines with none created | Empty state message |
| 2 | Verify CTA | "Create your first pipeline" or template option |
| 3 | Verify template suggestions | Pre-built templates offered |

---

## 2. Pipeline Creation

### 2.1 Create Pipeline Form
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/pipelines/new` | Create form loads |
| 2 | Verify name field | Pipeline name input visible |
| 3 | Verify description field | Description textarea visible |
| 4 | Verify template selector | Template options available |
| 5 | Verify create button | "Create Pipeline" button visible |

### 2.2 Create from Scratch
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter pipeline name "Deploy Flow" | Name accepted |
| 2 | Enter description | Description accepted |
| 3 | Click "Create Pipeline" | Loading state |
| 4 | Verify redirect | Navigate to visual editor |
| 5 | Verify empty canvas | Editor shows start node only |

### 2.3 Create from Template
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click template selector | Template list shown |
| 2 | Select a template (e.g., "CI/CD Basic") | Template preview shown |
| 3 | Click create | Pipeline created with template stages |
| 4 | Verify editor | Pre-configured stages visible |

### 2.4 Create Pipeline - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Submit with empty name | Error: "Name is required" |
| 2 | Submit with duplicate name in project | Error or warning |

---

## 3. Visual Pipeline Editor

### 3.1 Editor Display
**Priority**: Critical
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open pipeline editor | React Flow canvas loads |
| 2 | Verify toolbar | Toolbar with add/save/zoom controls |
| 3 | Verify minimap | Minimap for navigation (if enabled) |
| 4 | Verify canvas is interactive | Can pan and zoom |

### 3.2 Add Stage Node
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Add Stage" in toolbar | Stage creation dialog |
| 2 | Enter stage name "Build" | Name accepted |
| 3 | Select stage type "Agent" | Type selected |
| 4 | Click add | New stage node appears on canvas |
| 5 | Verify node styling | Node shows name, type icon, status color |

### 3.3 Stage Types
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create "Agent" stage | Agent icon, agent configuration panel |
| 2 | Create "Human Gate" stage | Gate icon, approval configuration |
| 3 | Create "Automation" stage | Automation icon, step-based config |
| 4 | Create "Parallel" stage | Parallel icon, branch configuration |

### 3.4 Connect Stages (Edges)
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click source handle on "Build" node | Connection line starts |
| 2 | Drag to target handle on "Test" node | Connection preview shown |
| 3 | Release on target | Edge created between stages |
| 4 | Verify arrow direction | Directional arrow visible |
| 5 | Verify DAG structure | Edge represents execution flow |

### 3.5 Remove Edge
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on an edge | Edge selected (highlighted) |
| 2 | Press Delete or click remove | Edge removed |
| 3 | Verify stages remain | Nodes still present, just disconnected |

### 3.6 Delete Stage Node
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select a stage node | Node selected |
| 2 | Click delete or press Delete key | Confirmation prompt |
| 3 | Confirm deletion | Node and its edges removed |
| 4 | Verify connected edges cleaned up | No orphan edges |

### 3.7 Move Stage Nodes
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Drag a stage node | Node follows cursor |
| 2 | Drop at new position | Node placed at new location |
| 3 | Verify edges follow | Connected edges update positions |
| 4 | Verify position persists | Refresh shows same layout |

### 3.8 Canvas Controls
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Scroll to zoom | Canvas zooms in/out |
| 2 | Click and drag canvas | Canvas pans |
| 3 | Click "Fit View" in toolbar | All nodes fit in viewport |
| 4 | Click zoom in/out buttons | Zoom level changes |

---

## 4. Stage Configuration

### 4.1 Stage Sidebar Panel
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a stage node | Stage sidebar panel opens |
| 2 | Verify stage name editable | Name field shown |
| 3 | Verify stage type | Type indicator shown |
| 4 | Verify steps section | Step list within stage |
| 5 | Verify configuration options | Type-specific settings |

### 4.2 Add Step to Stage
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open stage sidebar | Panel shown |
| 2 | Click "Add Step" | Step type selector |
| 3 | Select step type "Run Tests" | Step config form opens |
| 4 | Configure step parameters | Parameters accepted |
| 5 | Save step | Step added to stage |
| 6 | Verify step in list | Step visible in stage's step list |

### 4.3 Step Types
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify "Bash" step type | Shell command config |
| 2 | Verify "Claude Code" step type | AI agent config |
| 3 | Verify "Create Branch" step type | Branch naming config |
| 4 | Verify "Create PR" step type | PR template config |
| 5 | Verify "Merge PR" step type | Merge strategy config |
| 6 | Verify "Deploy Preview" step type | Deploy URL config |
| 7 | Verify "Run Tests" step type | Test command config |
| 8 | Verify "HTTP" step type | URL, method, headers config |
| 9 | Verify "Notification" step type | Channel and message config |
| 10 | Verify "Wait" step type | Duration/condition config |

### 4.4 Edit Step
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on existing step | Step config form opens |
| 2 | Modify parameters | Changes applied |
| 3 | Save | Step updated |

### 4.5 Remove Step
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click remove on a step | Confirmation |
| 2 | Confirm | Step removed from stage |

### 4.6 Reorder Steps
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Drag step within stage | Step reordered |
| 2 | Verify order persists | Steps execute in new order |

---

## 5. Sub-States

### 5.1 Configure Sub-States
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open Agent stage configuration | Sub-state section visible |
| 2 | Click "Add Sub-State" | Sub-state form opens |
| 3 | Enter sub-state name "Plan" | Name accepted |
| 4 | Enter persona prompt | Rich text prompt editor |
| 5 | Save sub-state | Sub-state created |
| 6 | Add another: "Implement" | Second sub-state added |
| 7 | Verify ordering | Sub-states shown in order |

### 5.2 Sub-State Context Windowing
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Configure sub-states with personas | Each has unique prompt |
| 2 | Verify checkpoint handoff config | Context passing configured |
| 3 | Verify execution order | Sequential execution defined |

---

## 6. Pipeline Versioning

### 6.1 Save Pipeline Version
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Make changes to pipeline editor | Changes made |
| 2 | Click "Save" | Pipeline saved |
| 3 | Verify version incremented | Version number increases |
| 4 | Verify version history | New version in history list |

### 6.2 View Version History
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open version history panel | Version list shown |
| 2 | Each version shows number | V1, V2, V3... |
| 3 | Each version shows timestamp | When saved |
| 4 | Each version shows author | Who saved it |

### 6.3 Rollback to Previous Version
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select previous version | Version selected |
| 2 | Click "Rollback" | Confirmation prompt |
| 3 | Confirm rollback | Pipeline restored to that version |
| 4 | Verify editor shows old state | Previous stages/edges/steps shown |
| 5 | Verify new version created | Rollback creates new version entry |

---

## 7. Pipeline Templates & Cloning

### 7.1 Clone Pipeline
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open pipeline actions menu | Clone option visible |
| 2 | Click "Clone" | Clone dialog opens |
| 3 | Enter new name | Name accepted |
| 4 | Confirm clone | New pipeline created |
| 5 | Verify clone | New pipeline with same stages/steps |
| 6 | Verify independence | Changes to clone don't affect original |

### 7.2 Template Selector
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open template selector on create | Templates listed |
| 2 | Preview a template | Stage/step overview shown |
| 3 | Select template | Pipeline pre-populated |

---

## 8. Pipeline Validation

### 8.1 Validate Pipeline Before Save
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create pipeline with disconnected stage | Stage not connected to DAG |
| 2 | Try to save | Validation warning |
| 3 | Create circular dependency | Edge creates cycle |
| 4 | Try to save | Error: "Pipeline cannot have cycles" |
| 5 | Create valid DAG | All stages connected, no cycles |
| 6 | Save | Pipeline saved successfully |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `pipeline.create` | Mutation | Create pipeline |
| `pipeline.get` | Query | Get pipeline with stages/steps |
| `pipeline.list` | Query | List project pipelines |
| `pipeline.update` | Mutation | Update pipeline definition |
| `pipeline.delete` | Mutation | Delete pipeline |
| `pipeline.addStage` | Mutation | Add stage to pipeline |
| `pipeline.updateStage` | Mutation | Update stage config |
| `pipeline.removeStage` | Mutation | Remove stage |
| `pipeline.addEdge` | Mutation | Connect stages |
| `pipeline.removeEdge` | Mutation | Disconnect stages |
| `pipeline.addStep` | Mutation | Add step to stage |
| `pipeline.updateStep` | Mutation | Update step config |
| `pipeline.removeStep` | Mutation | Remove step |
| `pipeline.getVersions` | Query | Version history |
| `pipeline.rollback` | Mutation | Rollback to version |
| `pipeline.clone` | Mutation | Clone pipeline |
| `subState.create` | Mutation | Add sub-state |
| `subState.update` | Mutation | Update sub-state |
| `subState.delete` | Mutation | Remove sub-state |
| `subState.list` | Query | List sub-states for stage |

---

## Test Data Requirements

### Test Pipelines
- "Deploy Flow" - Simple linear: Build → Test → Deploy
- "Full CI/CD" - Complex DAG with parallel stages
- "Review Pipeline" - Pipeline with human gates

### Stage Configuration
- Agent stage with 2 sub-states
- Human gate stage with approval config
- Automation stage with HTTP and Bash steps
