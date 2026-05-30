# Full Development Pipeline

Complete autonomous development workflow for CruzJS with review loops.

## Pipeline Stages

```
Phase 1: Spec Building    → checkpoint 01-spec.json
Phase 2: Build            → checkpoint 02-build.json
Phase 3: Iterate/Validate → checkpoint 03-iterate.json (BROWSER TESTING REQUIRED)
Phase 4: UX Review        → checkpoint 04-ux-review.json (max 2 iterations)
Phase 5: UI Review        → checkpoint 05-ui-review.json (max 2 iterations)
Phase 6: Code Review      → checkpoint 06-code-review.json (max 2 iterations)
Phase 7: QA               → checkpoint 07-qa.json (max 2 iterations)
Phase 8: Finalize         → checkpoint 08-finalize.json (PR created)
```

## Stage Definitions

```typescript
const fullDevPipeline = {
  stages: [
    // Phase 1: Spec & Planning
    {
      name: 'spec',
      persona: 'personas/architect.md',
      output: 'checkpoint 01-spec.json',
    },

    // Phase 2: Build
    {
      name: 'build',
      persona: 'personas/developer.md',
      output: 'checkpoint 02-build.json',
    },

    // Phase 3: Iterate & Validate
    {
      name: 'iterate',
      persona: 'personas/developer.md',
      output: 'checkpoint 03-iterate.json',
      note: 'BROWSER TESTING MANDATORY for frontend features',
    },

    // Review Loop 1: UX
    {
      type: 'review-loop',
      name: 'ux-review',
      reviewer: 'personas/ux-designer.md',
      fixer: 'personas/developer-fix.md',
      maxIterations: 2,
    },

    // Review Loop 2: UI
    {
      type: 'review-loop',
      name: 'ui-review',
      reviewer: 'personas/ui-designer.md',
      fixer: 'personas/developer-fix.md',
      maxIterations: 2,
    },

    // Review Loop 3: Code
    {
      type: 'review-loop',
      name: 'code-review',
      reviewer: 'personas/code-reviewer.md',
      fixer: 'personas/developer-fix.md',
      maxIterations: 2,
    },

    // Review Loop 4: QA
    {
      type: 'review-loop',
      name: 'qa',
      reviewer: 'personas/qa-engineer.md',
      fixer: 'personas/developer-fix.md',
      maxIterations: 2,
    },

    // Phase 8: Finalize
    {
      name: 'finalize',
      persona: 'personas/developer.md',
      output: 'PR created on GitHub',
    },
  ],
};
```

## Stage Flow

```
For each stage:
  1. Read persona instructions
  2. Execute phase work
  3. Write checkpoint JSON
  4. Output stage signal
```

## Review Loop Flow

```
For each review loop:
  iteration = 1

  while iteration <= maxIterations:
    1. Run reviewer persona
    2. Parse REVIEW_VERDICT from output

    if APPROVED:
      write checkpoint
      break

    if NEEDS_WORK:
      run developer-fix persona
      parse FIXES_COMPLETE
      commit fixes

      if iteration == maxIterations:
        force approve with note
        break

      iteration++
```

## Output Signals

| Signal | Meaning |
|--------|---------|
| `STAGE_COMPLETE: {name}` | Phase completed, proceed |
| `REVIEW_VERDICT: APPROVED` | Review passed |
| `REVIEW_VERDICT: NEEDS_WORK` | Review failed, needs fixes |
| `FIXES_COMPLETE` | Developer-fix done, re-review |
| `PR_CREATED: {url}` | Finalize completed |
| `WORKFLOW_COMPLETE` | All phases done |
| `WORKFLOW_BLOCKED: {reason}` | Cannot continue |

## Checkpoint Format

```json
{
  "phase": "{phase-name}",
  "phaseNumber": N,
  "status": "completed",
  "timestamp": "{ISO-8601}",
  "summary": "{brief description}",
  "filesCreated": ["list"],
  "filesModified": ["list"],
  "notes": "{any relevant notes}"
}
```

Review phase checkpoint:
```json
{
  "phase": "{review-name}",
  "phaseNumber": N,
  "status": "completed",
  "timestamp": "{ISO-8601}",
  "iterations": N,
  "verdict": "APPROVED",
  "feedbackFiles": ["feedback-file.md"],
  "fixesApplied": ["fix 1", "fix 2"],
  "browserTestingPerformed": true
}
```

## Error Recovery

1. Log error in PROGRESS.md
2. Attempt autonomous fix
3. If compilation errors: fix and retry
4. If unfixable: document as blocker, output `WORKFLOW_BLOCKED: {reason}`
5. Never stop without output signal
