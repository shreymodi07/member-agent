# Re-Review Feature Guide

## Overview

The **re-review** feature tracks code review progress by comparing current code against previous review findings. It shows what's been fixed, what's still broken, and any new issues introduced.

## How It Works

### 1. Initial Review
```bash
teladoc-agent review --changes
```

This creates a review and saves it to `.teladoc-reviews/` directory:
- Stores all issues found (with IDs like S1, S2, S3...)
- Saves file snapshots
- Records git commit hash
- Generates unique review ID

**Output:**
```
================================================================================
CODE REVIEW - Principal Engineer Assessment
================================================================================

... review content ...

================================================================================
SUMMARY
================================================================================

Total Issues: 4
----------------------------------------
Critical: 0
High:     2
Medium:   2
Low:      0

Status: ⚠ High priority issues should be addressed

Review ID: review-20250129-143022
To verify fixes later, run: teladoc-agent re-review
```

### 2. Developer Fixes Issues

Developer makes changes to address the issues found in the review.

### 3. Re-Review to Verify Fixes
```bash
teladoc-agent re-review
```

This command:
1. Loads the latest review
2. Checks current code for each previous issue
3. Uses AI to verify if issues are actually fixed
4. Detects any NEW issues introduced
5. Shows progress report

**Output:**
```
================================================================================
RE-REVIEW - Verification & Progress Check
================================================================================

PREVIOUS REVIEW:
  ID: review-20250129-143022
  Date: 1/29/2025, 2:30:22 PM
  Files: 3
  Issues Found: 4

================================================================================
✓ FIXED ISSUES: 2
================================================================================

✓ [S1] src/auth/login.ts:45
  Missing input validation on email field

✓ [S3] src/api/users.ts:120
  SQL injection vulnerability in user query

================================================================================
✗ STILL PRESENT: 2
================================================================================

✗ [S2] [HIGH] src/auth/session.ts:67
  Issue: Session tokens not properly encrypted
  Fix: Use crypto.createCipheriv with AES-256-GCM

------------------------------------------------------------

✗ [S4] [MEDIUM] src/utils/logger.ts:34
  Issue: Logging sensitive user data (email, phone)
  Fix: Sanitize logs to remove PII before writing

================================================================================
⚠ NEW ISSUES: 1
================================================================================

⚠ [N1] [MEDIUM] src/auth/login.ts:52
  Issue: New rate limiting logic has off-by-one error
  Fix: Change <= to < in rate limit check

================================================================================
SUMMARY
================================================================================

Progress:
  Previous Issues: 4
  Fixed: 2 (50%)
  Unfixed: 2
  New: 1

Progress: [████████████████████░░░░░░░░░░░░░░░░░░░░] 50%

Assessment:
Good progress on fixing critical security issues. The SQL injection and input 
validation issues are resolved. However, session encryption and PII logging 
still need attention. The new rate limiting code introduced a logic error that 
should be fixed before merge.

Status: ⚠ 2 unfixed + 1 new issues need attention.
```

## Advanced Usage

### Review Specific Previous Review
```bash
teladoc-agent re-review --review-id review-20250129-143022
```

### List All Reviews
```bash
ls .teladoc-reviews/
```

### View Review History
The `.teladoc-reviews/` directory contains:
- `review-YYYYMMDD-HHMMSS.json` - Individual review files
- `latest` - Pointer to most recent review

## Features

### ✓ Fixed Issues
- Shows which issues from previous review are resolved
- AI verifies the fix is actually correct
- Green checkmarks for visual clarity

### ✗ Still Present
- Lists issues that still exist
- Shows original severity and fix suggestions
- Red X marks for attention

### ⚠ New Issues
- Detects issues introduced AFTER the previous review
- Helps catch regressions from fixes
- Yellow warning symbols

### Progress Tracking
- Visual progress bar
- Percentage completion
- AI-generated assessment

## Workflow Example

```bash
# Day 1: Initial review
teladoc-agent review --changes
# Output: 5 issues found (2 high, 3 medium)

# Developer fixes 3 issues

# Day 2: Verify fixes
teladoc-agent re-review
# Output: 3 fixed, 2 unfixed, 1 new issue

# Developer fixes remaining issues

# Day 3: Final verification
teladoc-agent re-review
# Output: All issues resolved! Ready to merge.
```

## Storage Location

Reviews are stored in `.teladoc-reviews/` directory:
- Automatically added to `.gitignore`
- JSON format for easy parsing
- Includes full review text and metadata

## Benefits

1. **Track Progress** - See what's been fixed over time
2. **Verify Fixes** - AI confirms issues are actually resolved
3. **Catch Regressions** - Detect new issues from fixes
4. **Team Accountability** - Clear record of review history
5. **Merge Confidence** - Know when code is truly ready

## Tips

- Run `re-review` after each round of fixes
- Use the progress bar to track completion
- Pay attention to new issues - they might indicate the fix approach is wrong
- Keep review history for audit trails
- Share review IDs with team members for reference

## Integration with CI/CD

```yaml
# .github/workflows/code-review.yml
- name: Code Review
  run: teladoc-agent review --changes

- name: Re-Review (if previous review exists)
  run: teladoc-agent re-review || echo "No previous review"
  continue-on-error: true
```

## Troubleshooting

**"No previous review found"**
- Run `teladoc-agent review --changes` first

**"File not found" errors**
- Files may have been moved/deleted since review
- These are automatically marked as "fixed"

**New issues seem similar to old ones**
- The AI filters out duplicates based on file/line proximity
- If you see duplicates, they're likely in different locations



