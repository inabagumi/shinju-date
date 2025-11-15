# Terraform Quick Start Guide

This guide helps you quickly understand and use the new Terraform configuration.

## For Users: What You Need to Know

### What Changed?

1. ✅ **Added `shinju-date-insights` project** - Python FastAPI app is now deployed
2. ✅ **Organized code with modules** - Reduced duplication, easier to maintain
3. ✅ **Fixed deprecation warnings** - Using latest Vercel provider features
4. ✅ **Comprehensive documentation** - README, migration guide, and examples

### What You Need to Do

#### 1. Add Supabase Variables to Terraform Cloud

In your Terraform Cloud workspace, add these new variables:

- `supabase_url` - Your Supabase project URL (e.g., `https://xxx.supabase.co`)
- `supabase_service_role_key` - Your Supabase service role key (mark as **sensitive**)

#### 2. Update Import IDs (One-Time Setup)

Edit `terraform/imports.tf` and replace the placeholder IDs with actual project IDs.

To find your project IDs, run:
```bash
cd terraform
terraform init
terraform state list | grep vercel_project
```

Or check the Vercel dashboard: `https://vercel.com/<team>/settings/projects`

Update these lines in `imports.tf`:
```hcl
# Replace prj_XXX_WEB with actual ID
import {
  to = module.web.vercel_project.this
  id = "prj_ACTUAL_ID_HERE"
}
```

Do this for web, admin, and batch projects.

#### 3. Run Terraform Plan

```bash
cd terraform
terraform init
terraform plan
```

**Expected output**: 
- Existing resources will be imported (no changes)
- Only the new `shinju-date-insights` project will be created
- No resources will be destroyed or recreated

#### 4. Apply Changes

If the plan looks good:
```bash
terraform apply
```

This will create the new insights project.

## For Developers: Adding a New Project

Adding a new Vercel project is now super simple!

### Step 1: Add Module Block

Edit `terraform/projects.tf`:

```hcl
module "my_app" {
  source = "./modules/vercel_project"

  project_name         = "shinju-date-my-app"
  root_directory       = "apps/my-app"
  team_id              = var.vercel_team_id
  
  # Optional: Override defaults
  framework                = "nextjs"  # or null
  function_default_timeout = 30
  
  # Optional: Custom environment variables
  environment_variables = {
    MY_CUSTOM_VAR = {
      value  = "my-value"
      target = ["production", "preview"]
    }
  }
}
```

### Step 2: Add Domain (Optional)

If you need a custom domain, edit `terraform/domain.tf`:

```hcl
resource "vercel_project_domain" "my_app" {
  domain     = "my-app.shinju.date"
  project_id = module.my_app.project_id
  team_id    = module.my_app.team_id
}
```

### Step 3: Apply

```bash
cd terraform
terraform plan
terraform apply
```

That's it! Your new project is deployed. 🚀

## Common Module Options

### All Options

```hcl
module "example" {
  source = "./modules/vercel_project"

  # Required
  project_name   = "project-name"
  root_directory = "apps/example"
  team_id        = var.vercel_team_id

  # Optional - Framework
  framework = "nextjs"  # or null for non-Next.js apps

  # Optional - Performance
  function_default_cpu_type = "standard"        # or "standard_legacy"
  function_default_timeout  = 30                # seconds
  function_default_regions  = ["hnd1"]          # Tokyo

  # Optional - Common Features
  enable_corepack           = true   # Enable for Node.js projects
  enable_bytecode_caching   = true   # Enable for Next.js projects
  enable_redis              = true   # Enable if using Upstash Redis

  # Optional - Redis Configuration
  upstash_redis_rest_token     = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url       = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev   = var.upstash_redis_rest_url_dev

  # Optional - Custom Environment Variables
  environment_variables = {
    VAR_NAME = {
      value  = "var-value"
      target = ["production", "preview", "development"]
    }
  }

  # Optional - Deployment Retention
  deployment_retention = {
    expiration_canceled   = "1m"
    expiration_errored    = "1m"
    expiration_preview    = "1m"
    expiration_production = "unlimited"
  }
}
```

### Common Patterns

#### Next.js Application (Default)
```hcl
module "nextjs_app" {
  source = "./modules/vercel_project"
  
  project_name   = "my-nextjs-app"
  root_directory = "apps/nextjs"
  team_id        = var.vercel_team_id
  
  # All defaults are optimized for Next.js
  # Corepack, bytecode caching, and Redis are enabled by default
}
```

#### Python/FastAPI Application
```hcl
module "python_app" {
  source = "./modules/vercel_project"
  
  project_name   = "my-python-app"
  root_directory = "apps/python"
  team_id        = var.vercel_team_id
  framework      = null  # Not Next.js
  
  # Disable Node.js features
  enable_corepack         = false
  enable_bytecode_caching = false
  enable_redis            = false  # Unless your Python app uses Redis
  
  environment_variables = {
    PYTHON_VERSION = {
      value  = "3.12"
      target = ["production"]
    }
  }
}
```

#### Long-Running Functions (Batch Jobs)
```hcl
module "batch_app" {
  source = "./modules/vercel_project"
  
  project_name   = "my-batch-app"
  root_directory = "apps/batch"
  team_id        = var.vercel_team_id
  
  # Increase timeout for long-running jobs
  function_default_timeout = 120  # 2 minutes
}
```

## Troubleshooting

### Issue: Import Fails

**Error**: `Error: resource already managed by Terraform`

**Solution**: The resource is already imported. Remove the import block from `imports.tf`.

### Issue: Environment Variable Already Exists

**Error**: `environment variable already exists`

**Solution**: This is expected during migration. The module will update existing variables if values match.

### Issue: Vercel API Rate Limit

**Error**: `429 Too Many Requests`

**Solution**: Wait a few minutes and try again. Consider reducing the number of resources being created at once.

### Issue: Project ID Not Found

**Error**: `resource not found`

**Solution**: Check that the project ID in `imports.tf` is correct. List projects with `terraform state list`.

## Need Help?

1. 📖 Read [README.md](README.md) for detailed documentation
2. 🔄 Check [MIGRATION.md](MIGRATION.md) for migration help
3. 📊 See [SUMMARY.md](SUMMARY.md) for change overview
4. 🔍 View [COMPARISON.md](COMPARISON.md) for before/after examples

## Additional Resources

- [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)
- [Vercel Terraform Provider](https://registry.terraform.io/providers/vercel/vercel/latest/docs)
- [Terraform Cloud](https://app.terraform.io/)

---

**Quick Links**:
- 📦 [Module Variables](modules/vercel_project/variables.tf)
- 🔧 [Module Resources](modules/vercel_project/main.tf)
- 📤 [Module Outputs](modules/vercel_project/outputs.tf)
