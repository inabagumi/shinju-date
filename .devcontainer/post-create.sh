#!/usr/bin/env bash
# Project-specific initialization of the Dev Container
# The OS-level setup (apt packages, pnpm) is in the Dockerfile.
# The rest is in scripts/setup-dev.sh, which the local machine and the Copilot agent also run.

set -euo pipefail

exec "$(dirname "${BASH_SOURCE[0]}")/../scripts/setup-dev.sh" "$@"
