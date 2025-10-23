#!/bin/bash

set -e

sudo npm uninstall -g pnpm
sudo corepack enable

COREPACK_ENABLE_DOWNLOAD_PROMPT=0 pnpm --version

# Install Poetry for Python development
pip3 install poetry

pnpm install
pnpm build --filter={./packages/*}...
