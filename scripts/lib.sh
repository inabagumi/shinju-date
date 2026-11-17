# shellcheck shell=bash
# Shared preamble of the shell scripts in this directory.
# Source it at the top of a script:
#
#   source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

# The scripts that source this file use these variables
# shellcheck disable=SC2034

# Absolute path of the repository root (the parent of this directory)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
