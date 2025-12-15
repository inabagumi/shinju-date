# Dev Container base image with OS-level dependencies
# This Dockerfile consolidates OS-level setup (apt packages, corepack, uv)
# Project-specific initialization is handled by post-create.sh

FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-bookworm@sha256:2baba848f88e02278bcf59e072752f7371534ccfc67afcd8e0ee6b293865c6f9

# Install OS-level dependencies
# - postgresql-client: Required for psql command in database operations
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configure pnpm via corepack
# Note: The base image already has Node.js and npm installed
# We uninstall any globally installed pnpm and use corepack instead
RUN npm uninstall -g pnpm || true \
    && corepack enable

# Install uv for Python development (apps/insights)
# Install as root but make it available to all users via /usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
    && mv /root/.local/bin/uv /usr/local/bin/uv \
    && mv /root/.local/bin/uvx /usr/local/bin/uvx || true

# Verify installations
RUN which psql \
    && corepack --version \
    && uv --version

# The container will run as the default user (node) from the base image
# Project-specific setup (dependency installation, migrations, etc.) happens in post-create.sh
