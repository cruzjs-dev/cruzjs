# Pipeline Execution Test Specifications

## Overview
Tests for triggering pipeline executions, XState state machine transitions, stage/step execution tracking, execution history, replay, and the execution detail UI.

---

## 1. Trigger Execution

### 1.1 Trigger from Work Item
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open work item with linked pipeline | Work item detail page |
| 2 | Click "Run Pipeline" or trigger button | Execution confirmation dialog |
| 3 | Select pipeline (if multiple) | Pipeline chosen |
| 4 | Confirm execution | Execution triggered |
| 5 | Verify execution created | New execution in history |
| 6 | Verify initial state | Execution status "pending" → "in_progress" |

### 1.2 Trigger from Pipeline Page
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to pipeline detail | Pipeline page |
| 2 | Click "Run" button | Execution dialog |
| 3 | Select work item to associate | Item selected |
| 4 | Trigger | Execution starts |

### 1.3 Trigger Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Try to trigger pipeline with no stages | Error: "Pipeline has no stages" |
| 2 | Try to trigger with validation errors | Error with specific issues |
| 3 | Try to trigger while another execution is active | Warning or queue behavior |

---

## 2. Execution State Machine

### 2.1 Execution States
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger execution | State: "pending" |
| 2 | First stage starts | State: "in_progress" |
| 3 | All stages complete successfully | State: "done" |
| 4 | A stage fails | State: "failed" |
| 5 | Manual stop/cancel | State transitions appropriately |

### 2.2 Stage Execution States
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Stage queued | State: "pending" |
| 2 | Stage begins execution | State: "in_progress" |
| 3 | Stage hits human gate | State: "needs_review" |
| 4 | Stage awaiting dependency | State: "blocked" |
| 5 | Stage approved | State: "approved" |
| 6 | Stage completes | State: "done" |
| 7 | Stage fails | State: "failed" |
| 8 | Stage skipped | State: "skipped" |

### 2.3 Step Execution States
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Step queued | State: "pending" |
| 2 | Step executing | State: "in_progress" |
| 3 | Step succeeds | State: "done" |
| 4 | Step fails | State: "failed" |
| 5 | Step skipped (upstream failure) | State: "skipped" |

### 2.4 State Transition Logging
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Execution transitions through states | Transitions recorded |
| 2 | View transition log | All state changes listed |
| 3 | Each entry has timestamp | Precise transition times |
| 4 | Each entry has from/to states | "pending → in_progress" |

---

## 3. Execution Flow (DAG)

### 3.1 Sequential Execution
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Pipeline: Build → Test → Deploy | Linear flow |
| 2 | Trigger execution | Build starts first |
| 3 | Build completes | Test starts automatically |
| 4 | Test completes | Deploy starts automatically |
| 5 | Deploy completes | Execution marked "done" |

### 3.2 Parallel Execution
**Priority**: High
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Pipeline: Build → (Unit Tests + Integration Tests) → Deploy | Parallel branch |
| 2 | Build completes | Both test stages start simultaneously |
| 3 | Both tests complete | Deploy stage starts |
| 4 | Verify timing | Parallel stages overlap in time |

### 3.3 Failure Propagation
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Pipeline: Build → Test → Deploy | Linear flow |
| 2 | Trigger execution | Build starts |
| 3 | Build fails | Test and Deploy marked "skipped" |
| 4 | Execution marked "failed" | Overall execution fails |

### 3.4 Manual Override
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Execution has a failed stage | Failure state |
| 2 | Click "Override" on failed stage | Override dialog |
| 3 | Force stage to "done" | Stage overridden |
| 4 | Subsequent stages resume | Pipeline continues |

---

## 4. Execution List (History)

### 4.1 Execution History Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to work item → Pipeline History tab | Execution list loads |
| 2 | Verify execution rows | Each execution listed |
| 3 | Each row shows status | Status badge (done, failed, in_progress) |
| 4 | Each row shows timestamp | Start time displayed |
| 5 | Each row shows duration | Total execution time |
| 6 | Each row shows trigger info | Who/what triggered it |

### 4.2 Click to View Execution Detail
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on an execution row | Navigate to execution detail |
| 2 | Verify URL | `/orgs/:slug/projects/:key/items/:num/executions/:id` |

---

## 5. Execution Detail

### 5.1 Execution Detail Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to execution detail URL | Detail page loads |
| 2 | Verify execution status | Status badge prominent |
| 3 | Verify timeline visualization | Stage timeline or flow diagram |
| 4 | Verify stage list | All stages with statuses |
| 5 | Verify start/end times | Timestamps displayed |
| 6 | Verify total duration | Elapsed time shown |

### 5.2 Stage Detail Drill-Down
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a stage in execution detail | Stage detail view opens |
| 2 | Verify URL | `.../stages/:stageExecutionId` |
| 3 | Verify stage status | Current status shown |
| 4 | Verify step list | Steps within stage listed |
| 5 | Each step shows status | Step status badges |
| 6 | Each step shows duration | Step execution time |

### 5.3 Step Detail View
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on a step in stage detail | Step detail shown |
| 2 | Verify step configuration | Step type and params shown |
| 3 | Verify execution logs | Step output/logs displayed |
| 4 | Verify error details | If failed, error message shown |
| 5 | Verify timing | Start, end, duration |

### 5.4 Execution Timeline
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View execution detail | Timeline section |
| 2 | Verify visual timeline | Stages shown on timeline |
| 3 | Verify parallel visualization | Parallel stages shown side by side |
| 4 | Verify status colors | Green=done, Red=failed, Blue=in_progress |

---

## 6. Execution Replay

### 6.1 Replay Failed Execution
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View a failed execution | Detail page |
| 2 | Click "Replay" | Replay dialog |
| 3 | Confirm replay | New execution created |
| 4 | Verify new execution | Separate entry in history |
| 5 | Verify uses same pipeline version | Same stages/steps as original |

### 6.2 Replay from Specific Stage
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View failed execution | Detail page |
| 2 | Click "Retry from Stage X" | Replay from specific point |
| 3 | Verify earlier stages skipped | Previous stages not re-executed |
| 4 | Verify target stage runs | Failed stage re-executed |

---

## 7. Pipeline View (Visualization)

### 7.1 Pipeline View Page
**Priority**: Medium
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/projects/:key/pipeline-view` | Pipeline view loads |
| 2 | Verify active execution shown | Current execution visualized |
| 3 | Verify stage statuses | Real-time status updates on nodes |

---

## 8. Cost Tracking

### 8.1 Execution Cost Display
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View execution detail | Cost section visible |
| 2 | Verify total cost | Sum of all step costs |
| 3 | Verify per-stage costs | Cost breakdown by stage |
| 4 | Verify per-step costs | Individual step costs |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `execution.trigger` | Mutation | Start pipeline execution |
| `execution.get` | Query | Get execution detail |
| `execution.list` | Query | List executions for item |
| `execution.sendEvent` | Mutation | Send event to state machine |
| `execution.manualOverride` | Mutation | Override stage state |
| `execution.replayExecution` | Mutation | Replay execution |
| `execution.getStageDetail` | Query | Get stage execution detail |
| `execution.getStepDetail` | Query | Get step execution detail |

---

## Test Data Requirements

### Execution Scenarios
- Successful linear execution (3 stages, all pass)
- Failed execution (stage 2 fails)
- Execution with parallel branches
- Execution with human gate (paused for review)
- Replayed execution

### Timing Data
- Execution with varied stage durations for timeline testing
- Quick execution (<1 min) and long execution (>5 min)
