output "project_id" {
  description = "The ID of the Vercel project"
  value       = vercel_project.this.id
}

output "team_id" {
  description = "The team ID of the Vercel project"
  value       = vercel_project.this.team_id
}

output "project_name" {
  description = "The name of the Vercel project"
  value       = vercel_project.this.name
}
