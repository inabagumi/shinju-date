FROM mcr.microsoft.com/devcontainers/typescript-node:5-24-bookworm@sha256:d7e88ca9d7e48412c4f9afed316dac5a830e194c10bf0bea5912f524e14925dc

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# renovate: datasource=github-releases depName=pnpm packageName=pnpm/pnpm
ENV PNPM_VERSION=10.34.5

RUN su node -c "wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION sh -"
