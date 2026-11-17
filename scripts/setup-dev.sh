#!/usr/bin/env bash
set -euo pipefail

# Set up the local development environment
#
# The local machine, the Dev Container (.devcontainer/post-create.sh) and the
# Copilot agent (.github/workflows/copilot-setup-steps.yml) all run this script.
# It is safe to run again: every step does nothing when its work is already done.
#
# Development does not always need Supabase or Redis, and a Dev Container must
# come up even when they do not start, so that they can be fixed from inside it.
# So when starting them or generating the types fails, the script warns and
# goes on. Run it again after fixing the cause.
#
# Usage:
#   ./scripts/setup-dev.sh            # Keep the existing .env.local files
#   ./scripts/setup-dev.sh --force    # Overwrite the .env.local files

# shellcheck source=scripts/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

SECRETS_FILE="config/dev-secrets.env"
# The URL that compose.yml publishes the Redis HTTP API on
LOCAL_REDIS_URL="http://localhost:8079"

usage() {
    cat <<'EOF'
Usage: ./scripts/setup-dev.sh [--force]

Set up the local development environment:
  1. Install the dependencies (pnpm install)
  2. Start Supabase (pnpm exec supabase start)
  3. Start Redis (docker compose up -d --wait)
  4. Create apps/{web,admin,batch}/.env.local from .env.local.sample
  5. Generate the type definitions of the packages (pnpm typegen)

A failure in steps 2 to 5 is reported as a warning, and the script goes on.

Options:
  --force     Overwrite the existing .env.local files
  -h, --help  Show this help
EOF
}

step() {
    echo ""
    echo -e "${GREEN}==> $1${NC}"
}

fail() {
    echo -e "${RED}Error: $1${NC}" >&2
    exit 1
}

WARNINGS=()

warn() {
    echo -e "${YELLOW}Warning: $1${NC}" >&2
    WARNINGS+=("$1")
}

FORCE=false

for arg in "$@"; do
    case "$arg" in
        --force)
            FORCE=true
            ;;
        -h | --help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            fail "Unknown option: ${arg}"
            ;;
    esac
done

cd "$PROJECT_ROOT"

step "Installing the dependencies"
pnpm install

# Does nothing when Supabase is already running.
# The first start applies the migrations and the seed.
step "Starting Supabase"

if ! pnpm exec supabase start; then
    warn "Supabase did not start. Start it with: pnpm exec supabase start"
fi

# The Redis HTTP API accepts this token
redis_token="$(sed -n 's/^SRH_TOKEN=//p' "$SECRETS_FILE")"

if [ -z "$redis_token" ]; then
    fail "SRH_TOKEN is not set in ${SECRETS_FILE}"
fi

# In the Dev Container, the outer Docker Compose has already started Redis,
# and UPSTASH_REDIS_REST_URL points to it
redis_url="${UPSTASH_REDIS_REST_URL:-$LOCAL_REDIS_URL}"

redis_is_running() {
    curl --fail --silent --max-time 5 \
        -X POST \
        -H "Authorization: Bearer ${redis_token}" \
        -H 'Content-Type: application/json' \
        -d '["PING"]' \
        "$redis_url" 2> /dev/null | grep -q 'PONG'
}

step "Starting Redis"

if redis_is_running; then
    echo "Redis is already running at ${redis_url}"
elif ! docker compose up -d --wait; then
    warn "Redis did not start. Start it with: docker compose up -d --wait"
fi

step "Creating the .env.local files"

# `supabase status -o env` prints the values as NAME="value" lines
supabase_status="$(pnpm exec supabase status -o env 2> /dev/null || true)"

supabase_value() {
    sed -n "s/^$1=\"\(.*\)\"\$/\1/p" <<< "$supabase_status"
}

supabase_url="$(supabase_value API_URL)"
supabase_anon_key="$(supabase_value ANON_KEY)"
supabase_service_role_key="$(supabase_value SERVICE_ROLE_KEY)"

# Copy .env.local.sample to .env.local, replacing the values of the variables
# that the sample assigns (a variable that the sample does not have is not added).
#
# With enable_msw=true, the commented `# ENABLE_MSW=true` of the sample is
# enabled. Admin and batch do not start without the keys of the YouTube and
# Twitch APIs unless ENABLE_MSW=true, and MSW mocks Supabase and Upstash only at
# their fake URLs, so the apps still use the local Supabase and Redis.
write_env_local() {
    local sample="$1/.env.local.sample"
    local target="$1/.env.local"
    local enable_msw="$2"

    if [ -f "$target" ] && [ "$FORCE" != true ]; then
        echo -e "${YELLOW}${target} already exists, so it is kept (--force overwrites it)${NC}"
        return
    fi

    awk \
        -v supabase_url="$supabase_url" \
        -v supabase_anon_key="$supabase_anon_key" \
        -v supabase_service_role_key="$supabase_service_role_key" \
        -v redis_token="$redis_token" \
        -v enable_msw="$enable_msw" \
        '
        BEGIN {
            values["NEXT_PUBLIC_SUPABASE_URL"] = supabase_url
            values["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = supabase_anon_key
            values["SUPABASE_SERVICE_ROLE_KEY"] = supabase_service_role_key
            values["UPSTASH_REDIS_REST_TOKEN"] = redis_token
        }
        match($0, /^[A-Za-z_][A-Za-z0-9_]*=/) {
            name = substr($0, 1, RLENGTH - 1)
            if (name in values) {
                print name "=\"" values[name] "\""
                next
            }
        }
        enable_msw == "true" && /^# ENABLE_MSW=true$/ {
            print "ENABLE_MSW=true"
            next
        }
        { print }
        ' "$sample" > "$target"

    echo "Created ${target}"
}

# Without the URL and the keys of Supabase, a .env.local would be kept with
# empty values on the next run, so it is not created until Supabase is running
if [ -z "$supabase_url" ] || [ -z "$supabase_anon_key" ] || [ -z "$supabase_service_role_key" ]; then
    warn "The .env.local files were not created, because Supabase is not running. Run this script again after starting Supabase"
else
    write_env_local apps/web false
    write_env_local apps/admin true
    write_env_local apps/batch true
fi

step "Generating the type definitions of the packages"

if ! pnpm typegen; then
    warn "Generating the type definitions failed. Run it again with: pnpm typegen"
fi

echo ""

if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo -e "${YELLOW}The setup finished with ${#WARNINGS[@]} warning(s):${NC}"
    for warning in "${WARNINGS[@]}"; do
        echo -e "${YELLOW}  - ${warning}${NC}"
    done
else
    echo -e "${GREEN}The development environment is ready.${NC}"
fi

echo "Start the development servers with: pnpm dev"
