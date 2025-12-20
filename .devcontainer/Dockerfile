FROM mcr.microsoft.com/devcontainers/typescript-node:4-24-bookworm@sha256:634d3ffc8c37508259a23462b838fd85a9e5bb80dcdd0b31d673aa33dc4c8592

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# renovate: datasource=github-releases depName=pnpm packageName=pnpm/pnpm
ENV PNPM_VERSION=10.26.1

RUN su node -c "wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION sh -"

ENV UV_INSTALL_DIR=/usr/local/bin
# renovate: datasource=github-releases depName=uv packageName=astral-sh/uv
ENV UV_VERSION=0.9.18

RUN wget -qO-  https://astral.sh/uv/${UV_VERSION}/install.sh | sh
