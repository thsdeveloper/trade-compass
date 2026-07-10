# syntax=docker/dockerfile:1
# Build context = REPO ROOT (see .github/workflows/deploy-api.yml / fly deploy .)
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS build
# Copiar TODOS os manifests do workspace: --frozen-lockfile valida o workspace inteiro.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/front/package.json ./apps/front/
COPY apps/mobile/package.json ./apps/mobile/
# Instala só a subárvore do pacote `api` (leaf, sem deps de workspace).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter api... --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter api build
# `deploy --legacy` é exigido pelo pnpm 10; `--prod` gera node_modules isolado só de produção.
# `files: ["dist"]` no package.json garante que o dist/ compilado seja copiado.
RUN pnpm --filter api deploy --prod --legacy /prod/api

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/api ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
