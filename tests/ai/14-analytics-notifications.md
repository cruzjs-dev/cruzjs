# Analytics & Notifications Test Specifications

## Overview
Tests for cost analytics, pipeline analytics, dashboard configuration, in-app notifications, Slack integration, and notification preferences.

---

## 1. Cost Analytics

### 1.1 Cost Analytics Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/analytics/cost` | Cost analytics page loads |
| 2 | Verify total cost summary | Aggregate cost displayed |
| 3 | Verify cost breakdown chart | Chart showing costs over time |
| 4 | Verify per-pipeline costs | Pipeline-level breakdown |
| 5 | Verify per-agent costs | Agent-level breakdown |
| 6 | Verify date range selector | Can change time period |

### 1.2 Cost by Time Period
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select "Last 7 days" | Cost data for past week |
| 2 | Select "Last 30 days" | Cost data for past month |
| 3 | Select custom date range | Specific range applied |
| 4 | Verify chart updates | Chart reflects selected period |
| 5 | Verify totals update | Summary numbers recalculated |

### 1.3 Cost by Pipeline
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View pipeline cost breakdown | Per-pipeline costs |
| 2 | Click on a pipeline | Drill down to execution costs |
| 3 | Verify per-execution costs | Individual run costs shown |
| 4 | Verify per-step costs | Step-level cost granularity |

### 1.4 Cost Trend Analysis
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View cost trend chart | Line chart over time |
| 2 | Verify daily/weekly aggregation | Data points correct |
| 3 | Verify trend direction | Up/down trend indicator |
| 4 | Verify anomaly highlights | Unusual spikes flagged |

---

## 2. Pipeline Analytics

### 2.1 Pipeline Analytics Page Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/orgs/:slug/analytics/pipeline` | Pipeline analytics page loads |
| 2 | Verify execution metrics | Total runs, success rate, avg duration |
| 3 | Verify stage metrics | Per-stage performance |
| 4 | Verify failure analysis | Common failure points |

### 2.2 Execution Success Rate
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View success rate metric | Percentage displayed |
| 2 | Verify calculation | Successful / Total executions |
| 3 | Verify trend | Success rate over time chart |

### 2.3 Stage Performance Metrics
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View stage metrics | Per-stage breakdown |
| 2 | Verify average duration per stage | Time data correct |
| 3 | Verify failure rate per stage | Which stages fail most |
| 4 | Verify bottleneck identification | Slowest stages highlighted |

### 2.4 Gate Metrics
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View gate metrics | Gate-specific analytics |
| 2 | Verify average review time | Time from activation to action |
| 3 | Verify approval rate | % approved vs rejected |
| 4 | Verify iteration counts | Average iterations per gate |

### 2.5 Throughput Comparison
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View throughput metrics | Executions per day/week |
| 2 | Compare time periods | This week vs last week |
| 3 | Verify trend | Improving or declining |

---

## 3. Anomaly Detection

### 3.1 Cost Anomaly Alerts
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View anomaly alerts | Alert list shown |
| 2 | Verify alert details | What anomaly was detected |
| 3 | Verify alert includes context | Pipeline, time, magnitude |
| 4 | Click on alert | Navigate to relevant execution |

### 3.2 Performance Anomaly Detection
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Stage takes significantly longer than average | Anomaly detected |
| 2 | Alert generated | Performance anomaly alert |
| 3 | Verify baseline comparison | "3x slower than average" |

---

## 4. Dashboard

### 4.1 Dashboard Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to org dashboard | Dashboard loads |
| 2 | Verify widget areas | Dashboard widgets rendered |
| 3 | Verify data loading | Widgets show real data |

### 4.2 Dashboard Layout Configuration
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter dashboard edit mode | Edit controls visible |
| 2 | Drag widget to new position | Widget repositioned |
| 3 | Resize widget | Widget resized |
| 4 | Add new widget | Widget selector opens |
| 5 | Save layout | Layout persisted |
| 6 | Refresh page | Same layout shown |

### 4.3 Dashboard Widgets
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Verify "Active Executions" widget | Shows running pipelines |
| 2 | Verify "Recent Activity" widget | Recent events listed |
| 3 | Verify "Cost Summary" widget | Cost totals shown |
| 4 | Verify "Pending Approvals" widget | Gates awaiting review |
| 5 | Verify "Agent Status" widget | Online/offline agents |

---

## 5. In-App Notifications

### 5.1 Notification Bell Display
**Priority**: High
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View any page while logged in | Notification bell in header |
| 2 | Verify unread count | Badge shows unread count |
| 3 | Click bell | Notification dropdown opens |
| 4 | Verify notification list | Recent notifications shown |

### 5.2 Notification Types
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Gate requires review | "Review requested" notification |
| 2 | Execution completes | "Execution completed" notification |
| 3 | Execution fails | "Execution failed" notification |
| 4 | Assigned to work item | "Assigned to you" notification |
| 5 | Comment on your item | "New comment" notification |

### 5.3 Mark Notification as Read
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View unread notification | Unread styling (bold/highlight) |
| 2 | Click notification | Mark as read |
| 3 | Verify unread count decremented | Badge count decreases |
| 4 | Verify styling changes | No longer bold/highlighted |

### 5.4 Mark All as Read
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Multiple unread notifications | Count > 0 |
| 2 | Click "Mark All Read" | All marked read |
| 3 | Verify badge cleared | No unread count |

### 5.5 Notification Click-Through
**Priority**: High
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Review requested" notification | Navigate to gate review page |
| 2 | Click "Execution failed" notification | Navigate to execution detail |
| 3 | Click "Assigned to you" notification | Navigate to work item |

---

## 6. Notification Preferences

### 6.1 Preferences Page Display
**Priority**: Medium
**Type**: Smoke

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to notification preferences | Settings page |
| 2 | Verify notification categories | List of event types |
| 3 | Verify channel toggles | In-app, email, Slack per category |

### 6.2 Toggle Notification Channel
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find "Execution Failed" category | Category shown |
| 2 | Toggle off "In-App" | In-app notifications disabled |
| 3 | Toggle on "Email" | Email notifications enabled |
| 4 | Save preferences | Settings persisted |
| 5 | Trigger event | Only email sent, no in-app |

### 6.3 Disable All Notifications
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Toggle off all channels | All disabled |
| 2 | Save | Preferences saved |
| 3 | Trigger events | No notifications received |

---

## 7. Slack Integration

### 7.1 Connect Slack Workspace
**Priority**: Medium
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Slack integration settings | Slack config page |
| 2 | Click "Connect Slack" | OAuth flow initiated |
| 3 | Authorize in Slack | Workspace connected |
| 4 | Verify connection status | "Connected to [workspace]" shown |

### 7.2 Configure Slack Channel
**Priority**: Medium
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select default notification channel | Channel picker |
| 2 | Choose #pipeline-alerts | Channel set |
| 3 | Save configuration | Channel saved |

### 7.3 Slack Notification Delivery
**Priority**: Medium
**Type**: Integration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger event with Slack enabled | Event occurs |
| 2 | Check Slack channel | Notification message posted |
| 3 | Verify message format | Structured message with context |
| 4 | Verify action buttons | "Review" button in Slack message |
| 5 | Click action button | Opens CruzJS review page |

### 7.4 Disconnect Slack
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Disconnect" | Confirmation |
| 2 | Confirm | Slack disconnected |
| 3 | Verify no Slack notifications | Events don't post to Slack |

---

## 8. Feedback Velocity

### 8.1 Feedback Metrics
**Priority**: Low
**Type**: Functional

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | View analytics feedback section | Velocity metrics shown |
| 2 | Verify feedback response time | Average time to review |
| 3 | Verify trend | Improving or declining |

---

## API Endpoints to Test

| Procedure | Type | Description |
|-----------|------|-------------|
| `analytics.getCostAnalytics` | Query | Cost breakdown |
| `analytics.getAnomalyAlerts` | Query | Detected anomalies |
| `analytics.getFeedbackVelocity` | Query | Review speed metrics |
| `analytics.getTrends` | Query | Trend analysis |
| `analytics.getStageMetrics` | Query | Per-stage performance |
| `analytics.getGateMetrics` | Query | Gate performance |
| `analytics.getThroughputComparison` | Query | Throughput over time |
| `dashboard.getLayout` | Query | Get dashboard config |
| `dashboard.saveLayout` | Mutation | Save dashboard layout |
| `notification.list` | Query | Get user notifications |
| `notification.markRead` | Mutation | Mark notification read |
| `notification.markAllRead` | Mutation | Mark all read |
| `notification.getPreferences` | Query | Get notification prefs |
| `notification.updatePreferences` | Mutation | Update notification prefs |
| `notification.connectSlack` | Mutation | OAuth connect Slack |
| `notification.disconnectSlack` | Mutation | Disconnect Slack |

---

## Test Data Requirements

### Analytics Data
- Multiple pipeline executions with varied costs
- Executions over several days for trend data
- At least one anomalous execution (unusually expensive or slow)

### Notification Scenarios
- Gate pending review (triggers reviewer notification)
- Execution failure (triggers owner notification)
- Work item assignment (triggers assignee notification)
- Comment on assigned item (triggers notification)

### Dashboard
- At least 3 configured widgets
- Custom layout saved
