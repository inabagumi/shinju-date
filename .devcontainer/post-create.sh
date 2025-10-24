#!/bin/bash

set -e

sudo npm uninstall -g pnpm
sudo corepack enable

COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version

# Install uv for Python development
curl -LsSf https://astral.sh/uv/install.sh | sh

pnpm install
pnpm build --filter={./packages/*}...
