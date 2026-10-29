# KL Residencies web portal (React/Vite SPA) served by unprivileged nginx on port 8080.
# VITE_API_URL is empty: the browser calls /api on the same address and the ingress sends it to the API.
#   docker build -f deploy/docker/web.Dockerfile -t kl-hostel-web .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /src
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
COPY apps/web-vite/package.json apps/web-vite/
RUN pnpm install --frozen-lockfile --filter "@klu/web-vite..."
COPY apps/web-vite apps/web-vite
ENV VITE_API_URL=""
RUN pnpm --filter @klu/web-vite build

FROM nginxinc/nginx-unprivileged:1.29-alpine
# pick up Alpine security fixes published after the base image was built (the scan fails on fixable CRITICALs)
USER root
RUN apk upgrade --no-cache
USER 101
COPY deploy/docker/web-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/apps/web-vite/dist /usr/share/nginx/html
EXPOSE 8080
