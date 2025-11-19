output "domain" {
  description = "The domain name"
  value       = vercel_project_domain.this.domain
}

output "id" {
  description = "The ID of the project domain"
  value       = vercel_project_domain.this.id
}
