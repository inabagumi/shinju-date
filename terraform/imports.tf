# Import blocks for migrating existing resources to module-based structure
# These import blocks allow Terraform to adopt existing resources without recreating them
#
# IMPORTANT: Before using these import blocks, you must:
# 1. Find your actual Vercel project IDs from Terraform state or Vercel dashboard
# 2. Replace the placeholder IDs below with actual IDs
# 3. Run: terraform plan -generate-config-out=generated.tf (if needed)
#
# To find project IDs, run: terraform state list | grep vercel_project
# Or check: https://vercel.com/your-team/settings/projects

# Web project imports
# Replace prj_XXX_WEB with actual project ID from: terraform state show vercel_project.this
import {
  to = module.web.vercel_project.this
  id = "prj_XXX_WEB"  # TODO: Replace with actual web project ID
}

import {
  to = module.web.vercel_project_deployment_retention.this
  id = "prj_XXX_WEB"  # TODO: Same as project ID above
}

# Admin project imports  
# Replace prj_XXX_ADMIN with actual project ID from: terraform state show vercel_project.admin
import {
  to = module.admin.vercel_project.this
  id = "prj_XXX_ADMIN"  # TODO: Replace with actual admin project ID
}

import {
  to = module.admin.vercel_project_deployment_retention.this
  id = "prj_XXX_ADMIN"  # TODO: Same as project ID above
}

# Batch project imports
# Replace prj_XXX_BATCH with actual project ID from: terraform state show vercel_project.batch
import {
  to = module.batch.vercel_project.this
  id = "prj_XXX_BATCH"  # TODO: Replace with actual batch project ID
}

import {
  to = module.batch.vercel_project_deployment_retention.this
  id = "prj_XXX_BATCH"  # TODO: Same as project ID above
}

# Note: Environment variables cannot be imported using import blocks.
# They will be recreated, which is safe as long as the values match.
# Terraform will detect them as already existing if the configuration is identical.
