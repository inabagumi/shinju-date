# Migration Guide: Branch Protection Settings

## Overview

After merging the unified CI workflow, you need to update the branch protection settings to use the new status check.

## Current Status Checks (Old Workflows)

The old workflows had multiple status checks that needed to be tracked:

**From `node.js.yml`**:
- Install Dependencies
- Lint
- Test
- Build
- E2E Tests (web)
- E2E Tests (admin)
- E2E Tests (batch)

**From `python.yml`**:
- python

## New Status Check (Unified Workflow)

The unified workflow has a single status check:

- **CI Summary**

## How to Update Branch Protection

### Step 1: Go to Repository Settings

1. Navigate to your repository on GitHub
2. Click on "Settings"
3. Click on "Branches" in the left sidebar
4. Find your branch protection rule (typically for `main` branch)
5. Click "Edit" on the rule

### Step 2: Update Required Status Checks

1. Scroll down to "Require status checks to pass before merging"
2. Remove all old status checks:
   - Remove "Install Dependencies"
   - Remove "Lint"
   - Remove "Test"
   - Remove "Build"
   - Remove "E2E Tests (web)"
   - Remove "E2E Tests (admin)"
   - Remove "E2E Tests (batch)"
   - Remove "python"
3. Add the new status check:
   - Search for and add "CI Summary"
4. Click "Save changes"

### Step 3: Verify

1. Create a test pull request
2. Verify that the "CI Summary" check appears in the PR
3. Verify that the PR cannot be merged until "CI Summary" passes

## Visual Guide

### Before (Multiple Checks)

```
Required status checks:
☑ Install Dependencies
☑ Lint
☑ Test
☑ Build
☑ E2E Tests (web)
☑ E2E Tests (admin)
☑ E2E Tests (batch)
☑ python
```

### After (Single Check)

```
Required status checks:
☑ CI Summary
```

## Benefits of the New Approach

1. **Simpler Management**: Only one status check to configure
2. **Better Visibility**: Single check that represents overall CI health
3. **Easier Maintenance**: Adding new packages doesn't require updating branch protection
4. **Clearer Status**: One check makes it obvious if CI passed or failed

## Rollback (If Needed)

If you need to rollback to the old workflows:

1. Re-add the old workflow files:
   - `.github/workflows/node.js.yml`
   - `.github/workflows/python.yml`
2. Restore the old status checks in branch protection
3. Remove the new CI workflow: `.github/workflows/ci.yml`

Note: The old workflow files are still in git history, so you can retrieve them with:

```bash
git show HEAD~1:.github/workflows/node.js.yml > .github/workflows/node.js.yml
git show HEAD~1:.github/workflows/python.yml > .github/workflows/python.yml
```

## Troubleshooting

### Issue: "CI Summary" check doesn't appear

**Solution**: 
- Make sure the PR has triggered the workflow at least once
- Check the "Actions" tab to see if the workflow is running
- The status check will appear after the first workflow run

### Issue: Some tests are failing that passed before

**Solution**:
- Check the individual matrix jobs in the "Actions" tab
- The new workflow runs the same tests, so failures indicate real issues
- Review the specific failing job logs for details

### Issue: Workflow is slower than before

**Solution**:
- The matrix strategy should actually be faster due to parallelization
- Check if Playwright browsers are being cached properly
- Verify that Turbo cache is configured (TURBO_TOKEN secret)

## Questions or Issues?

If you encounter any issues during migration, please:

1. Check the workflow run logs in the "Actions" tab
2. Refer to the [CI Workflow Architecture documentation](./ci-workflow-architecture.md)
3. Open an issue in the repository with:
   - Description of the problem
   - Link to the failing workflow run
   - Any error messages
