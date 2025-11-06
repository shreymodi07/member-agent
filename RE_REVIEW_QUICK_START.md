# Re-Review Quick Start

## 🚀 Quick Start (3 Steps)

### Step 1: Initial Review
```bash
teladoc-agent review --changes
```
**Output:** Saves review with ID like `review-20250129-143022`

### Step 2: Fix Issues
Make code changes to address the issues found.

### Step 3: Verify Fixes
```bash
teladoc-agent re-review
```
**Output:** Shows what's fixed, what's not, and any new issues.

---

## 📊 What You'll See

```
================================================================================
RE-REVIEW - Verification & Progress Check
================================================================================

✓ FIXED ISSUES: 2          ← Issues that are resolved
✗ STILL PRESENT: 1         ← Issues that still need work
⚠ NEW ISSUES: 1            ← New problems introduced

Progress: [████████░░░░] 50%

Status: ⚠ 1 unfixed + 1 new issues need attention.
```

---

## 🎯 Common Workflows

### Daily Development
```bash
# Morning
teladoc-agent review --changes

# After fixes
teladoc-agent re-review

# Repeat until clean
teladoc-agent re-review
```

### Before Merge
```bash
# Final check
teladoc-agent re-review

# If all clear:
# Status: ✓ All issues resolved! Ready to merge.
```

---

## 💡 Tips

1. **Run re-review after each fix round** - Track progress
2. **Watch for new issues** - Your fix might introduce problems
3. **Use progress bar** - Know when you're done
4. **Share review IDs** - Team collaboration

---

## 🔧 Advanced

### Review Specific Past Review
```bash
teladoc-agent re-review --review-id review-20250129-143022
```

### View Review History
```bash
ls .teladoc-reviews/
```

### Get Help
```bash
teladoc-agent re-review --help
```

---

## ❓ Troubleshooting

**"No previous review found"**
→ Run `teladoc-agent review --changes` first

**Too many new issues showing**
→ They're likely real - your fixes may have side effects

**Progress stuck at same percentage**
→ Check the "STILL PRESENT" section for what needs fixing

---

## 📁 Where Reviews Are Stored

```
.teladoc-reviews/
├── latest                    # Points to most recent
└── review-*.json            # Individual reviews
```

Automatically added to `.gitignore` - won't be committed.

---

## ✅ Success Looks Like

```
Progress: [████████████████████] 100%

Status: ✓ All issues resolved! Ready to merge.
```

---

**Full Documentation:** See `RE_REVIEW_GUIDE.md`



