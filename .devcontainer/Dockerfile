FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-bookworm@sha256:7958dd7e6fe4242fce6ba4f57b9de561ea82233d5542921b5335d435c2c78791

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# renovate: datasource=github-releases depName=pnpm packageName=pnpm/pnpm
ENV PNPM_VERSION=10.30.0

RUN su node -c "wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION sh -"

ENV UV_INSTALL_DIR=/usr/local/bin
# renovate: datasource=github-releases depName=uv packageName=astral-sh/uv
ENV UV_VERSION=0.9.18

RUN wget -qO-  https://astral.sh/uv/${UV_VERSION}/install.sh | sh
