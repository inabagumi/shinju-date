# Migration Guide: From Supabase CLI to Docker Compose

## Overview

This guide helps developers migrate from using `supabase start` to the new Docker Compose-based development workflow.

## What Changed?

### Before (Supabase CLI)
```bash
# Install Supabase CLI globally
npm install -g supabase

# Start Supabase services
supabase start

# Check status
supabase status
```

### After (Docker Compose)
```bash
# Start all services (from project root)
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## Migration Steps

### 1. Stop Existing Supabase Services

If you have Supabase services running from the old setup:

```bash
supabase stop
```

### 2. Start New Docker Compose Services

```bash
# From project root (not .devcontainer)
docker compose up -d
```

Optional: override any Supabase secrets or DB credentials at runtime:

```bash
SUPABASE_ANON_KEY=... \
SUPABASE_SERVICE_ROLE_KEY=... \
SUPABASE_JWT_SECRET=... \
SUPABASE_POSTGRES_PASSWORD=... \
docker compose up -d
```

### 4. Verify Services Are Running

```bash
docker compose ps
```

You should see all services in "running" or "healthy" state.

### 5. Access Supabase Studio

Open http://localhost:54323 in your browser to access Supabase Studio.

## Key Differences

### Service URLs

| Service | Old | New | Notes |
|---------|-----|-----|-------|
| API Gateway | http://127.0.0.1:54321 | http://localhost:54321 | Same port |
| Studio | http://127.0.0.1:54323 | http://localhost:54323 | Same port |
| Database | 127.0.0.1:54322 | localhost:54322 | Same port |
| Email (Inbucket→Mailpit) | http://127.0.0.1:54324 | http://localhost:54324 | Different service, same port |

### Authentication Keys

The authentication keys remain the same:

- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU`

### Common Commands

| Task | Old Command | New Command |
|------|-------------|-------------|
| Start services | `supabase start` | `docker compose up -d` |
| Stop services | `supabase stop` | `docker compose down` |
| Check status | `supabase status` | `docker compose ps` |
| View logs | `supabase logs` | `docker compose logs -f` |
| Reset database | `supabase db reset` | `docker compose down -v && docker compose up -d` |
| Generate types | `supabase gen types typescript --local` | `pnpm db:schema` |
| Import data | `pnpm db:import` | `pnpm db:import` (script updated internally) |

## Troubleshooting

### Services Won't Start

```bash
# Check for port conflicts
lsof -i :54321
lsof -i :54322
lsof -i :54323

# Reset everything
docker compose down -v
docker compose up -d
```

### Database Connection Issues

```bash
# Check database is ready
docker compose exec db pg_isready -U supabase_admin

# Connect to database
docker compose exec db psql -U supabase_admin -d postgres
```

### Can't Access Studio

1. Check if Kong is healthy:
   ```bash
   docker compose ps kong
   ```

2. Check Kong logs:
   ```bash
   docker compose logs kong
   ```

3. Try restarting Kong:
   ```bash
   docker compose restart kong
   ```

### Old Data Migration

If you want to preserve data from the old Supabase setup:

1. Export your data first:
   ```bash
   supabase db dump -f /tmp/backup.sql
   ```

2. Start new services:
   ```bash
   cd .devcontainer
   docker compose up -d
   ```

3. Import the backup:
   ```bash
   docker compose exec -T db psql -U supabase_admin -d postgres < /tmp/backup.sql
   ```

## Benefits of New Approach

✅ **No global CLI dependency** - Everything runs in Docker
✅ **Better service isolation** - Each service has its own container
✅ **Easier debugging** - Individual service logs and status
✅ **Consistent with CI** - Same setup for local and CI environments
✅ **Version controlled** - All configuration in repository
✅ **Easier customization** - Edit compose.yml for your needs

## FAQ

### Q: Do I need to uninstall Supabase CLI?

A: No, but it's no longer required for local development. You may want to keep it for production database operations.

### Q: Will this work with my existing .env.local files?

A: Yes! Your existing .env.local files in apps/ directories will work without changes.

### Q: Can I still use Supabase CLI commands?

A: Some commands still work (like `supabase gen types` for remote databases), but local development commands are replaced by Docker Compose.

### Q: What about migrations?

A: Migrations in `supabase/migrations/` are automatically applied when the database container starts for the first time.

### Q: How do I add a new migration?

A: Create a new SQL file in `supabase/migrations/` with the naming pattern `YYYYMMDDHHMMSS_description.sql`, then restart the database:

```bash
docker compose down db
docker compose up -d db
```

## Getting Help

If you encounter issues:

1. Check the [.devcontainer/README.md](.devcontainer/README.md) for detailed service documentation
2. Review the [setup guide](docs/setup-guide.md) for complete setup instructions
3. Check Docker Compose logs: `docker compose logs -f`
4. Open an issue with your error logs and steps to reproduce

---

**Note**: This migration improves development stability and aligns with modern containerization practices. If you have any concerns or need assistance, please reach out to the team!
