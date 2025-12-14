# Docker Image Digest Management

## Overview

This project uses **tag+digest format** (e.g., `image:tag@sha256:digest`) for all Docker image references to enhance security and prevent supply chain attacks. This ensures that:

1. **Immutability**: Even if a tag is overwritten, the digest ensures the exact same image is used.
2. **Security**: Prevents malicious image substitution attacks.
3. **Reproducibility**: Guarantees consistent builds across environments.

## Current Docker Images

All Docker images in this project are referenced with both tags and digests in the following files:

- `compose.yml` (root) - Development services
- `.devcontainer/compose.yml` - Dev Container configuration
- `.github/workflows/copilot-setup-steps.yml` - CI workflows

## How to Update Image Digests

When updating Docker images to newer versions, you must update both the tag and digest.

### Method 1: Using `docker buildx imagetools inspect`

```bash
# Get the digest for a specific image:tag
docker buildx imagetools inspect IMAGE:TAG --format '{{json .Manifest}}' | jq -r '.digest'

# Example:
docker buildx imagetools inspect redis:8.4.0-bookworm --format '{{json .Manifest}}' | jq -r '.digest'
# Output: sha256:3906b477e4b60250660573105110c28bfce93b01243eab37610a484daebceb04
```

### Method 2: Using `docker pull`

```bash
# Pull the image and extract the digest
docker pull IMAGE:TAG 2>&1 | grep -i digest

# Example:
docker pull redis:8.4.0-bookworm 2>&1 | grep -i digest
# Output: Digest: sha256:3906b477e4b60250660573105110c28bfce93b01243eab37610a484daebceb04
```

### Method 3: Using Docker Hub or Registry API

For images hosted on Docker Hub, you can also visit:
```
https://hub.docker.com/r/[namespace]/[image]/tags
```

And look for the SHA256 digest of the specific tag.

## Bulk Update Script

A helper script is available at `/tmp/get-digests.sh` (generated during this update) that can fetch digests for all images:

```bash
#!/bin/bash
# Script to get Docker image digests for tag+digest format

images=(
  "redis:8.4.0-bookworm"
  "hiett/serverless-redis-http:0.0.10"
  "supabase/postgres:17.6.1.064"
  # ... add more images as needed
)

for image in "${images[@]}"; do
  echo "Fetching digest for $image..."
  digest=$(docker buildx imagetools inspect "$image" --format '{{json .Manifest}}' 2>/dev/null | jq -r '.digest // empty')
  if [ -n "$digest" ]; then
    echo "$image@$digest"
  else
    echo "ERROR: Could not fetch digest for $image"
  fi
  echo "---"
done
```

## Update Process

1. **Identify the new version**: Check for updates from Renovate or upstream release notes.

2. **Get the digest**: Use one of the methods above to get the SHA256 digest.

3. **Update the file**: Replace the image reference in the format:
   ```yaml
   # Before:
   image: redis:8.4.0-bookworm
   
   # After:
   image: redis:8.4.0-bookworm@sha256:3906b477e4b60250660573105110c28bfce93b01243eab37610a484daebceb04
   ```

4. **Test locally**: Ensure the new image works correctly:
   ```bash
   docker compose up -d
   # or for devcontainer
   devcontainer up --workspace-folder .
   ```

5. **Commit the changes**: Use conventional commit format:
   ```bash
   git commit -m "chore: update redis image digest to 8.4.0"
   ```

## Security Considerations

### Why Tag+Digest Format?

- **Tags are mutable**: Repository owners can push a new image with the same tag, potentially introducing vulnerabilities or malicious code.
- **Digests are immutable**: A digest is a cryptographic hash of the image content and cannot be changed without creating a different digest.

### Renovate Integration

This project uses Renovate for dependency updates. Renovate can be configured to automatically update both tags and digests. See `.github/renovate.json` for configuration.

### Monitoring for Updates

Regularly check for:
1. Security patches for base images
2. New versions of Supabase services
3. Updates to development tools

## Current Images in Use

| Image | Tag | Purpose | File Location |
|-------|-----|---------|---------------|
| redis | 8.4.0-bookworm | Caching and session management | compose.yml |
| hiett/serverless-redis-http | 0.0.10 | Redis HTTP API (Upstash compatible) | compose.yml |
| supabase/postgres | 17.6.1.064 | PostgreSQL database | compose.yml |
| kong | 2.8.5 | API Gateway | compose.yml |
| supabase/gotrue | v2.184.0 | Authentication service | compose.yml |
| postgrest/postgrest | v13.0.8 | REST API service | compose.yml |
| supabase/realtime | v2.68.4 | Realtime service | compose.yml |
| supabase/storage-api | v1.33.0 | Storage API service | compose.yml |
| axllent/mailpit | v1.28.0 | Email testing | compose.yml |
| supabase/studio | 2025.12.09-sha-434634f | Supabase Studio | compose.yml |
| supabase/postgres-meta | v0.95.1 | Database introspection | compose.yml |
| supabase/edge-runtime | v1.69.28 | Edge Functions runtime | compose.yml |
| supabase/logflare | 1.27.0 | Analytics service | compose.yml |
| timberio/vector | 0.51.1-alpine | Log aggregation | compose.yml |
| mcr.microsoft.com/devcontainers/typescript-node | 4-24-bookworm | Dev Container | .devcontainer/compose.yml |
| redis | 8.4.0-bookworm | CI/CD Redis service | .github/workflows/copilot-setup-steps.yml |

## References

- [Docker Content Trust](https://docs.docker.com/engine/security/trust/)
- [Docker Image Digests](https://docs.docker.com/engine/reference/commandline/pull/#pull-an-image-by-digest-immutable-identifier)
- [Supply Chain Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
