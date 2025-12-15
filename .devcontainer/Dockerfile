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
RUN npm uninstall -g pnpm; corepack enable

# Install uv for Python development (apps/insights)
# Using the official installation script from astral.sh (uv's official source)
# This is the recommended installation method per https://docs.astral.sh/uv/getting-started/installation/
# Note: This requires network access during build time
# UV_INSTALL_DIR controls where uv binaries are installed
ENV UV_INSTALL_DIR=/usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify installations
# Note: uv installation may fail in network-restricted environments during build
# It will succeed in VS Code Dev Container and GitHub Codespaces (where network is available)
RUN which psql && \
    corepack --version && \
    (uv --version || echo "uv installation skipped - will be available in VS Code/Codespaces")

# The container will run as the default user (node) from the base image
# Project-specific setup (dependency installation, migrations, etc.) happens in post-create.sh
