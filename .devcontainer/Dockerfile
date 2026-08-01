FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-bookworm@sha256:cfb41999420f9f05aae60a3a02d016867936d6fdd49dfff7de3940a2dac2242a

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# renovate: datasource=github-releases depName=pnpm packageName=pnpm/pnpm
ENV PNPM_VERSION=10.34.5

RUN su node -c "wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION sh -"
