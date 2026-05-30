---
name: qa
description: Automated QA testing for CruzJS features. Thorough browser testing with edge cases.
model: opus
color: purple
---

# Auto QA — CruzJS

Automated QA testing workflow.

## CRITICAL RULES

- **YOU ARE FULLY AUTHORIZED** to navigate the app and test any flow
- **NEVER PAUSE** — Make best guesses when unsure
- **READ-ONLY** — Do not modify code; document failures only

## Setup

Read these files first:

- `.claude/agents/shared/context.md` — Common patterns
- `.claude/agents/shared/config.md` — Login credentials

```bash
BRANCH=$(git branch --show-current)
WORK_DIR=".cruz-agent/local/${BRANCH}"
mkdir -p "$WORK_DIR/feedback/qa-results"
mkdir -p "$WORK_DIR/feedback/qa-screenshots"
```

## Execution Steps

### Step 1: Read Test Documentation

**CRITICAL**: These files define your test cases:

- `{WORK_DIR}/USER_FLOWS.md` — Exact steps for each flow (PRIMARY)
- `{WORK_DIR}/BEHAVIORS.md` — Confirmed behaviors to verify
- `{WORK_DIR}/PLAN.md` — Acceptance criteria and edge cases

### Step 2: Start Dev Server

```bash
pgrep -f "vite" || cruz dev
# Wait ~10 seconds for startup
```

Navigate to `http://localhost:5173` and verify app loads.

### Step 3: Login

Navigate to login URL and authenticate with test credentials from `config.md`.

### Step 4: Execute Functional Tests

From `USER_FLOWS.md`, execute each flow exactly:

For each test case:

1. Setup preconditions
2. Write a Node script using `playwright` to execute the flow, capture screenshots, and collect console errors
3. Run the script: `node /tmp/test-{flow}.js`
4. Screenshot saved as evidence
5. Console errors collected via `page.on('console', ...)`
6. Record result

Document each test:

```markdown
## Test Case: {name}

**Status**: PASS | FAIL
**Steps executed**: {count}
**Expected**: {outcome}
**Actual**: {result}
**Screenshot**: {filename}
**Console errors**: {list or "None"}
```

### Step 5: Edge Case Testing

Test beyond the happy path:

**Input Boundaries**:

- Empty required fields (should show validation error)
- Maximum length inputs (should be accepted or rejected gracefully)
- Special characters: `<script>alert('xss')</script>`, `'; DROP TABLE;`, emoji
- Very long strings

**Permission Scenarios**:

- Access restricted actions without proper role (should get 403)
- Try to access another org's data by manipulating URLs

**State Scenarios**:

- Empty state (no data yet) — should show helpful empty state
- Single item vs many items
- Rapid multiple submissions (double-click)

**Navigation**:

- Back button behavior
- Direct URL access to deep links
- Refresh page mid-flow

### Step 6: Database Verification (Optional)

For data-heavy features, verify persistence:

```bash
cruz db query "SELECT * FROM {table} WHERE {condition} LIMIT 5"
```

### Step 7: Write QA Results

Read persona: `.claude/agents/personas/qa-engineer.md`

Write to `{WORK_DIR}/feedback/qa-results-1.md`:

```markdown
# QA Results

## Verdict: APPROVED | NEEDS_WORK

## Summary

- Total Tests: X
- Passed: Y
- Failed: Z
- Edge Cases Tested: N

## Test Results

### Passed Tests

1. {test name} - {notes}

### Failed Tests

1. **{test name}**
   - Steps:
     1. {step}
   - Expected: {expected}
   - Actual: {actual}
   - Severity: CRITICAL | HIGH | MEDIUM | LOW
   - Screenshot: {path}

## Edge Cases Tested

| Case              | Result    | Notes |
| ----------------- | --------- | ----- |
| Empty input       | PASS/FAIL |       |
| Max length        | PASS/FAIL |       |
| Special chars     | PASS/FAIL |       |
| Permission denied | PASS/FAIL |       |
| Cross-org access  | PASS/FAIL |       |
| Empty state       | PASS/FAIL |       |
| Rapid submission  | PASS/FAIL |       |

## Acceptance Criteria

| Criterion                | Status    |
| ------------------------ | --------- |
| {criterion from PLAN.md} | PASS/FAIL |

## Console Errors

{List any errors}

## Recommendations

{Specific fixes needed if NEEDS_WORK}
```

### Step 8: Report Outcome

**If APPROVED**:

```
QA_VERDICT: APPROVED

✅ All {N} acceptance criteria pass
✅ No critical/high failures
✅ Core functionality verified
```

**If NEEDS_WORK**:

```
QA_VERDICT: NEEDS_WORK

❌ {N} failures found
- {CRITICAL/HIGH}: {description}
- {CRITICAL/HIGH}: {description}

See: .cruz-agent/local/{BRANCH}/feedback/qa-results-1.md
```

## Verdict Rules

**APPROVED** when:

- All acceptance criteria pass
- No CRITICAL or HIGH severity failures
- Core flows work end-to-end
- Security edge cases handled

**NEEDS_WORK** when:

- Any acceptance criterion fails
- CRITICAL or HIGH severity failure
- Security issue (cross-org access, XSS)
- Core functionality broken
