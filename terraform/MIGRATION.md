# Terraform Migration Guide

This guide explains the Terraform refactoring that was done to organize the configuration using modules and add the missing `shinju-date-insights` project.

## What Changed

### 1. Module-based Structure
- Created a reusable `vercel_project` module in `terraform/modules/vercel_project/`
- This module encapsulates common patterns for Vercel projects:
  - Project configuration
  - Common environment variables (Corepack, Bytecode Caching)
  - Redis environment variables
  - Custom environment variables
  - Deployment retention settings

### 2. New Project Added
- Added `shinju-date-insights` project for the Python FastAPI application
- Configured with appropriate environment variables for Supabase
- Set timeout to 60 seconds for API operations

### 3. File Organization
- `projects.tf` - All project definitions using modules
- `imports.tf` - Import blocks for migrating existing resources
- `domain.tf` - Updated to use module outputs
- `dns.tf` - Updated to use module outputs
- `modules/vercel_project/` - Reusable module for Vercel projects

### 4. Reduced Duplication
- Before: ~270 lines with repeated patterns
- After: ~120 lines + 80 lines in reusable module
- Easier to maintain and add new projects

## Migration Steps

⚠️ **Important**: Before running these commands, ensure you have:
1. Terraform Cloud access configured
2. All required variables set in Terraform Cloud workspace
3. Added the new variables: `supabase_url` and `supabase_service_role_key`

### Step 1: Initialize Terraform

```bash
cd terraform
terraform init
```

### Step 2: Review Import Plan

The `imports.tf` file contains import blocks that will adopt existing resources into the new module structure. However, you need to update the project IDs in this file first.

To get the current project IDs, run:

```bash
# This will show the current state
terraform show
```

Or check Vercel dashboard for the project IDs.

### Step 3: Update Import IDs (REQUIRED)

Edit `imports.tf` and replace the placeholder IDs with actual project IDs:

```hcl
import {
  to = module.web.vercel_project.this
  id = "prj_ACTUAL_WEB_PROJECT_ID"  # ← Update this
}
```

You need to update IDs for:
- Web project
- Admin project  
- Batch project

### Step 4: Generate Import Commands

Since we're migrating existing resources to modules, we need to use `terraform import` commands for resources that don't support `import` blocks yet (like environment variables).

Run a plan to see what needs to be imported:

```bash
terraform plan
```

### Step 5: Import Existing Resources

For each existing environment variable and other resources, you may need to run import commands. The exact commands depend on the current state.

Example format:
```bash
terraform import 'module.web.vercel_project_environment_variable.custom["NEXT_PUBLIC_BASE_URL"]' prj_XXX/env_YYY
```

### Step 6: Remove Old Configuration

Once all imports are successful and `terraform plan` shows no unexpected changes, you can remove the old `project.tf` file (it has been replaced by `projects.tf`).

```bash
git rm project.tf
```

### Step 7: Verify Configuration

Run a final plan to ensure no resources will be destroyed or recreated:

```bash
terraform plan
```

Expected output: "No changes. Your infrastructure matches the configuration."

### Step 8: Apply (if needed)

If there are only additions (like the new insights project), apply the changes:

```bash
terraform apply
```

## Alternative: Start Fresh (if import is too complex)

If the import process is too complex, you can:

1. Keep both old and new configurations temporarily
2. Create the insights project manually in Vercel
3. Then import just the new project into Terraform
4. Gradually migrate other projects one by one

## Module Benefits

### Easy to Add New Projects

Adding a new project now requires just a few lines:

```hcl
module "new_app" {
  source = "./modules/vercel_project"
  
  project_name     = "shinju-date-new-app"
  root_directory   = "apps/new-app"
  team_id          = var.vercel_team_id
  
  # All common settings are inherited from module defaults
}
```

### Consistent Configuration

All projects now share:
- Same git repository settings
- Same authentication settings
- Consistent deployment retention
- Standard CPU types and timeouts

### Easy Updates

To change a common setting across all projects, just update the module once instead of updating each project individually.

## Troubleshooting

### Issue: Import blocks not supported

If your Terraform version doesn't support `import` blocks, use manual import commands:

```bash
terraform import 'module.web.vercel_project.this' prj_XXX
terraform import 'module.web.vercel_project_deployment_retention.this' prj_XXX
```

### Issue: State conflicts

If you encounter state conflicts, you can use:

```bash
terraform state rm 'old_resource_address'
terraform import 'new_resource_address' resource_id
```

### Issue: Environment variables not importing

Environment variables may need manual recreation or import. Check the resource IDs in Vercel API or dashboard.

## New Variables Required

Add these to your Terraform Cloud workspace:

- `supabase_url` - Your Supabase project URL
- `supabase_service_role_key` - Your Supabase service role key (mark as sensitive)

## Support

If you encounter issues during migration, refer to:
- [Terraform Import Documentation](https://developer.hashicorp.com/terraform/cli/import)
- [Vercel Terraform Provider Documentation](https://registry.terraform.io/providers/vercel/vercel/latest/docs)
