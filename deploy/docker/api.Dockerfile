# KL Residencies API (NestJS). Build from the repo root:
#   docker build -f deploy/docker/api.Dockerfile -t kl-hostel-api .
# Runs as the unprivileged "node" user on API_PORT 4000; health: GET /api/healthz
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /src
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
COPY apps/web-vite/package.json apps/web-vite/
RUN pnpm install --frozen-lockfile --filter "@klu/api..."
COPY packages/db packages/db
COPY apps/api apps/api
RUN pnpm --filter @klu/db build && pnpm --filter @klu/api build

FROM node:22-alpine
RUN apk add --no-cache tini
ENV NODE_ENV=production API_PORT=4000 TESSDATA_DIR=/tmp/tessdata
# same paths as the build stage: pnpm's node_modules are symlinks into /src/node_modules/.pnpm
COPY --from=build --chown=node:node /src/node_modules /src/node_modules
COPY --from=build --chown=node:node /src/packages/db /src/packages/db
COPY --from=build --chown=node:node /src/apps/api/package.json /src/apps/api/package.json
COPY --from=build --chown=node:node /src/apps/api/node_modules /src/apps/api/node_modules
COPY --from=build --chown=node:node /src/apps/api/dist /src/apps/api/dist
WORKDIR /src/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:4000/api/healthz || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/main.js"]
