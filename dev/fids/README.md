# 📋 Feature ID (FID) Files

This directory contains individual FID files for planned and in-progress features.

## Structure

- Active FIDs stored directly in this folder
- Completed FIDs automatically moved to `archives/YYYY-MM/` by AUTO_UPDATE_COMPLETED()
- FID files NEVER deleted - always preserved in archives

## FID Naming Convention

`FID-YYYYMMDD-XXX.md`

Where:
- `YYYY` = Year
- `MM` = Month
- `DD` = Day
- `XXX` = Sequential number (001, 002, etc.)

## FID File Structure

```markdown
# [FID-YYYYMMDD-XXX] Feature Title

**Status:** PLANNED|IN_PROGRESS|COMPLETED
**Priority:** HIGH|MED|LOW
**Complexity:** 1-5
**Created:** YYYY-MM-DD
**Started:** YYYY-MM-DD (when work begins)
**Completed:** YYYY-MM-DD (when finished)
**Estimated:** Xh

## Description
[Purpose and business value]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Implementation Approach
[Strategy and high-level plan]

## Files
- [NEW] `/path/to/new/file.ts` - Description
- [MOD] `/path/to/existing/file.ts` - Changes
- [DEL] `/path/to/removed/file.ts` - Reason

## Dependencies
- FID-YYYYMMDD-XXX: Dependency description
- OR: None

## Notes
[Key decisions, blockers, learnings]
```

## Usage

1. AUTO_UPDATE_PLANNED() creates FID files automatically
2. FID contains complete feature specification
3. Reference FID during implementation (FLAWLESS Protocol Step 1)
4. AUTO_UPDATE_COMPLETED() archives FID when done

