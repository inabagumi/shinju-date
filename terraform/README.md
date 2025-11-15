# Terraform Configuration for SHINJU DATE

This directory contains the Terraform configuration for managing infrastructure for the SHINJU DATE project, specifically Vercel deployments.

## Structure

```
terraform/
├── main.tf              # Provider and backend configuration
├── versions.tf          # Terraform and provider version constraints
├── variables.tf         # Input variables
├── projects.tf          # Project definitions using modules
├── domain.tf            # Domain and redirect configurations
├── dns.tf               # DNS records for shinju.date
├── imports.tf           # Import blocks for resource migration (needs configuration)
├── MIGRATION.md         # Detailed migration guide
├── modules/
│   └── vercel_project/  # Reusable module for Vercel projects
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── .gitignore
```

## Managed Resources

### Projects

1. **shinju-date** (web)
   - Public website at https://shinju.date
   - Next.js application from `apps/web`
   - Redis caching enabled

2. **shinju-date-admin**
   - Admin dashboard at https://admin.shinju.date
   - Next.js application from `apps/admin`
   - Redis caching enabled

3. **shinju-date-batch**
   - Batch processing (Nitro)
   - Cron job functions from `apps/batch`
   - YouTube Data API integration
   - Redis caching enabled

4. **shinju-date-insights** ✨ NEW
   - Python FastAPI application from `apps/insights`
   - Term extraction and analysis API
   - Supabase integration

### Additional Resources

- Domain configurations and redirects
- DNS records for shinju.date
- Deployment retention policies
- Environment variables for all projects

## Module: vercel_project

A reusable module that encapsulates common patterns for Vercel projects.

### Features

- Standardized project configuration
- Automatic environment variable management:
  - Corepack support
  - Bytecode caching
  - Upstash Redis
  - Custom variables
- Deployment retention settings
- Flexible configuration

### Usage Example

```hcl
module "my_app" {
  source = "./modules/vercel_project"

  project_name     = "shinju-date-my-app"
  root_directory   = "apps/my-app"
  team_id          = var.vercel_team_id
  
  # Optional overrides
  framework                  = "nextjs"
  function_default_timeout   = 30
  upstash_redis_rest_token   = var.upstash_redis_rest_token
  upstash_redis_rest_token_dev = var.upstash_redis_rest_token_dev
  upstash_redis_rest_url     = var.upstash_redis_rest_url
  upstash_redis_rest_url_dev = var.upstash_redis_rest_url_dev
  
  environment_variables = {
    MY_CUSTOM_VAR = {
      value  = "my-value"
      target = ["production", "preview"]
    }
  }
}
```

## Required Variables

These variables must be set in Terraform Cloud workspace:

- `vercel_api_token` - Vercel API token
- `vercel_team_id` - Vercel team ID
- `google_api_key` - Google API key for YouTube Data API
- `upstash_redis_rest_token` - Redis REST token (production)
- `upstash_redis_rest_token_dev` - Redis REST token (preview/dev)
- `upstash_redis_rest_url` - Redis REST URL (production)
- `upstash_redis_rest_url_dev` - Redis REST URL (preview/dev)
- `supabase_url` - Supabase project URL
- `supabase_service_role_key` - Supabase service role key (sensitive)

## Getting Started

### Prerequisites

- Terraform >= 1.13
- Terraform Cloud account with workspace configured
- Vercel account with team access
- All required variables set in Terraform Cloud

### First Time Setup (New Workspace)

If starting fresh:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Migrating from Old Configuration

If you have existing infrastructure managed by the old configuration:

1. Read [MIGRATION.md](MIGRATION.md) thoroughly
2. Update `imports.tf` with actual project IDs
3. Follow the migration steps carefully

## Common Operations

### Add a New Project

1. Add a new module block in `projects.tf`:

```hcl
module "new_app" {
  source = "./modules/vercel_project"
  
  project_name   = "shinju-date-new-app"
  root_directory = "apps/new-app"
  team_id        = var.vercel_team_id
  
  # Configure as needed
}
```

2. If domain is needed, add to `domain.tf`:

```hcl
resource "vercel_project_domain" "new_app" {
  domain     = "new-app.shinju.date"
  project_id = module.new_app.project_id
  team_id    = module.new_app.team_id
}
```

3. Apply changes:

```bash
terraform plan
terraform apply
```

### Update Environment Variables

Edit the `environment_variables` map in the module block:

```hcl
module "web" {
  # ...
  environment_variables = {
    NEXT_PUBLIC_BASE_URL = {
      value  = "https://shinju.date"
      target = ["production"]
    }
    NEW_VARIABLE = {
      value  = "new-value"
      target = ["production", "preview"]
    }
  }
}
```

### Change Timeout or CPU Type

Update the module parameters:

```hcl
module "batch" {
  # ...
  function_default_timeout  = 180  # Increase to 3 minutes
  function_default_cpu_type = "performance"
}
```

## Troubleshooting

### Changes to Existing Projects

If you see unexpected changes when running `terraform plan`:

1. Check that `imports.tf` has correct project IDs
2. Verify environment variable names and targets match
3. Review the migration guide

### Import Errors

If import blocks fail:

1. Check Terraform version supports import blocks (>= 1.5)
2. Verify project IDs are correct
3. Use manual import commands as fallback

### Environment Variable Conflicts

Environment variables might show as needing recreation. This is usually safe if:
- The key and value are identical
- Only the resource address is changing

## Maintenance

### Updating Module

To update the module behavior:

1. Edit files in `modules/vercel_project/`
2. Test changes: `terraform plan`
3. Apply changes: `terraform apply`

Changes to the module automatically affect all projects using it.

### Version Updates

To update Terraform or provider versions:

1. Edit `versions.tf`
2. Run `terraform init -upgrade`
3. Test with `terraform plan`

## Best Practices

1. **Always run plan before apply**: Review changes carefully
2. **Use modules for consistency**: Don't duplicate project configurations
3. **Document custom variables**: Add descriptions for clarity
4. **Keep sensitive data in Terraform Cloud**: Never commit secrets
5. **Version control everything**: Except sensitive variables and state

## Links

- [Vercel Terraform Provider](https://registry.terraform.io/providers/vercel/vercel/latest/docs)
- [Terraform Cloud](https://app.terraform.io/)
- [Project Repository](https://github.com/inabagumi/shinju-date)

## Support

For questions or issues:
- Check [MIGRATION.md](MIGRATION.md) for migration help
- Review Terraform documentation
- Contact team maintainers
