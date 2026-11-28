FROM mcr.microsoft.com/devcontainers/typescript-node:5-26-bookworm@sha256:621f218f22c2ad132a715c26f64b13bfe030ada64d64d6dcaa50a5dbcbcb3203

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Docker-in-Docker の dockerd の設定（ビルドのコンテキストはプロジェクトのルート）
COPY config/docker/daemon.json /etc/docker/daemon.json

# renovate: datasource=github-releases depName=pnpm packageName=pnpm/pnpm
ENV PNPM_VERSION=12.23.0

RUN su node -c "wget -qO- https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION sh -"
