#!/bin/bash

set -e

sudo npm uninstall -g pnpm
sudo corepack enable

COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version

# Install uv for Python development
curl -LsSf https://astral.sh/uv/install.sh | sh

pnpm install
pnpm typegen

if pnpm exec supabase start; then
  pnpm exec supabase status \
    -o env \
    --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
    --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
    --override-name auth.service_role_key=SUPABASE_SERVICE_KEY | grep SUPABASE_ > .env.local
fi
