# Agent Test Specifications

## Overview
Tests for agent registration, heartbeat monitoring, task polling, result reporting, agent pools, session logs, the real-time stream view, and emergency stop (Big Red Button).

---

## 1. Agent Registration

### 1.1 Agent List Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/agents` | Agent list page loads |
| 2 | Verify agent cards/rows | Registered agents listed |
| 3 | Each agent shows name | Agent names visible |
| 4 | Each agent shows status | Online/Offline indicator |
| 5 | Each agent shows last heartbeat | Timestamp or "never" |
| 6 | Verify "Register Agent" button | Button visible |

### 1.2 Register New Agent
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Register Agent" | Registration form opens |
| 2 | Enter agent name "Build Agent 1" | Name accepted |
| 3 | Configure agent capabilities | Capabilities set |
| 4 | Click register | Agent created |
| 5 | Verify agent ID generated | Unique ID assigned |
| 6 | Verify in agent list | New agent appears |
| 7 | Agent status initially "Offline" | No heartbeat yet |

### 1.3 Register Agent - Validation
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Register with empty name | Error: "Name is required" |
| 2 | Register with duplicate name | Error or allowed per policy |

### 1.4 Agent Detail Page
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/agents/:agentId` | Agent detail loads |
| 2 | Verify agent name and ID | Displayed correctly |
| 3 | Verify status badge | Online/Offline |
| 4 | Verify capabilities list | Agent capabilities shown |
| 5 | Verify recent sessions | Session log visible |
| 6 | Verify configuration options | Edit/delete available |

### 1.5 Update Agent
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click edit on agent detail | Edit form opens |
| 2 | Change agent name | Name updated |
| 3 | Update capabilities | Capabilities changed |
| 4 | Save | Agent updated |

### 1.6 Delete Agent
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click delete on agent | Confirmation dialog |
| 2 | Confirm deletion | Agent removed |
| 3 | Verify not in list | Agent no longer visible |
| 4 | Verify associated data | Sessions/logs retained or cleaned |

---

## 2. Agent Heartbeat

### 2.1 Heartbeat Updates Status
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Agent sends heartbeat via API | 200 OK |
| 2 | Check agent status in UI | Status changes to "Online" |
| 3 | Verify last heartbeat timestamp | Updated to current time |

### 2.2 Heartbeat Timeout
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Agent sends heartbeat | Status "Online" |
| 2 | Agent stops sending heartbeats | Heartbeats cease |
| 3 | Wait for timeout (120s TTL) | Status changes to "Offline" |
| 4 | Verify UI reflects offline | Offline indicator shown |

### 2.3 Heartbeat with Metadata
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Agent sends heartbeat with CPU/memory data | Accepted |
| 2 | View agent detail | System metrics shown |
| 3 | Verify data freshness | Metrics update on each heartbeat |

---

## 3. Task Polling

### 3.1 Agent Polls for Work
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Pipeline execution assigns work to agent type | Work queued |
| 2 | Agent polls `/agentExecution.poll` | Work assignment returned |
| 3 | Verify assignment contains | Stage ID, step config, context |
| 4 | Agent acknowledges assignment | Assignment marked "in_progress" |

### 3.2 Poll with No Available Work
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | No pending work for agent | Queue empty |
| 2 | Agent polls | Empty response (no work) |
| 3 | Agent continues polling | Next poll may have work |

### 3.3 Poll Respects Agent Capabilities
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Agent registered with capabilities ["build", "test"] | Capabilities set |
| 2 | Work queued requiring "deploy" | Not matching |
| 3 | Agent polls | No work returned (capability mismatch) |
| 4 | Work queued requiring "build" | Matching |
| 5 | Agent polls | Build work assigned |

---

## 4. Result Reporting

### 4.1 Report Success
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Agent completes work | Work done |
| 2 | Agent reports success to API | Result accepted |
| 3 | Verify step execution updated | Step status "done" |
| 4 | Verify stage progresses | Next step or stage starts |
| 5 | Verify logs stored | Execution logs persisted |

### 4.2 Report Failure
**Priority**: Critical
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Agent encounters error | Work failed |
| 2 | Agent reports failure with error details | Result accepted |
| 3 | Verify step execution failed | Step status "failed" |
| 4 | Verify error message stored | Error accessible in UI |
| 5 | Verify stage handles failure | Stage fails or retries per config |

### 4.3 Report Logs
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Agent streams logs during execution | Logs sent via API |
| 2 | View agent session detail | Logs visible in real-time |
| 3 | Verify log ordering | Chronological order |
| 4 | Verify log content | Stdout/stderr captured |

---

## 5. Agent Sessions

### 5.1 Session Log Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/agents/:id/sessions/:sessionId` | Session detail loads |
| 2 | Verify session timeline | Events in chronological order |
| 3 | Verify session status | Active/Complete/Failed |
| 4 | Verify execution logs | Step output visible |

### 5.2 Session History
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View agent detail | Recent sessions listed |
| 2 | Click on a session | Session detail opens |
| 3 | Verify session metadata | Duration, status, work item |

---

## 6. Agent Pools

### 6.1 Create Agent Pool
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to agent pool management | Pool list page |
| 2 | Click "Create Pool" | Pool creation form |
| 3 | Enter pool name "Build Agents" | Name accepted |
| 4 | Select agents for pool | Agents added |
| 5 | Save | Pool created |

### 6.2 Pool-Based Routing
**Priority**: Medium
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Configure pipeline stage to use pool "Build Agents" | Pool assigned |
| 2 | Trigger execution | Work queued for pool |
| 3 | Any agent in pool can pick up work | Work distributed |
| 4 | Verify load distribution | Work goes to available agent |

### 6.3 Edit Pool Members
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open pool settings | Member list shown |
| 2 | Add agent to pool | Agent added |
| 3 | Remove agent from pool | Agent removed |
| 4 | Verify routing updated | New member gets work, removed member doesn't |

---

## 7. Real-Time Stream View

### 7.1 Stream Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/agents/stream` | Stream view loads |
| 2 | Verify live event feed | Events streaming in real-time |
| 3 | Verify event types | Heartbeats, assignments, completions visible |
| 4 | Verify auto-scroll | New events scroll into view |

### 7.2 Stream Filtering
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Filter stream by agent | Only selected agent's events |
| 2 | Filter by event type | Only selected event types |
| 3 | Clear filters | All events shown |

### 7.3 Stream Event Details
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click on stream event | Event detail shown |
| 2 | Verify event payload | Full event data visible |
| 3 | Verify links to related entities | Agent, execution, step links |

---

## 8. Emergency Stop (Big Red Button)

### 8.1 Emergency Stop Activation
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify Big Red Button visible | Emergency stop button in UI |
| 2 | Click emergency stop | Confirmation dialog |
| 3 | Dialog warns about impact | "This will halt all agent work" |
| 4 | Confirm emergency stop | Stop flag set in KV |
| 5 | Verify all agents stop | Agents stop executing |
| 6 | Verify executions paused | Active executions pause/halt |

### 8.2 Emergency Stop Recovery
**Priority**: Critical
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Emergency stop is active | System halted |
| 2 | Click "Resume" or deactivate | Resume dialog |
| 3 | Confirm resume | Stop flag cleared |
| 4 | Verify agents resume polling | Agents start accepting work |
| 5 | Verify executions can continue | Paused executions resumable |

### 8.3 Emergency Stop Access Control
**Priority**: Critical
**Type**: Security

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as org admin | Emergency stop accessible |
| 2 | Login as org member | Emergency stop NOT accessible |
| 3 | Login as org viewer | Emergency stop NOT accessible |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `agent.register` | Mutation | Register new agent |
| `agent.list` | Query | List org agents |
| `agent.get` | Query | Get agent with live status |
| `agent.update` | Mutation | Update agent config |
| `agent.delete` | Mutation | Delete agent |
| `agentExecution.poll` | Query | Poll for work (API key auth) |
| `agentExecution.heartbeat` | Mutation | Send heartbeat (API key auth) |
| `agentExecution.reportResult` | Mutation | Report execution result |
| `agentExecution.reportLogs` | Mutation | Stream execution logs |
| `agentPool.create` | Mutation | Create agent pool |
| `agentPool.list` | Query | List pools |
| `agentPool.addMember` | Mutation | Add agent to pool |
| `agentPool.removeMember` | Mutation | Remove agent from pool |
| `realTime.getEvents` | Query | Get stream events |
| `realTime.getEventsSince` | Query | Get events since timestamp |

---

## Test Data Requirements

### Test Agents
- "Build Agent 1" - capabilities: ["build", "test"]
- "Deploy Agent 1" - capabilities: ["deploy"]
- "General Agent" - capabilities: ["build", "test", "deploy"]

### Test Pools
- "Build Agents" - contains Build Agent 1
- "All Agents" - contains all agents

### Execution Scenarios
- Agent picks up work and succeeds
- Agent picks up work and fails
- Multiple agents competing for same work
- Emergency stop during active execution
