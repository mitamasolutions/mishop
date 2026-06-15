# --- Stage 1: deps (instala dependencias del workspace completo) -------------
FROM node:22-alpine AS deps
WORKDIR /repo

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

# Copia metadatos del monorepo para que yarn pueda resolver workspaces.
COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY .yarn ./.yarn
COPY packages packages
COPY apps apps
COPY tools tools

# Instala TODO el monorepo (necesario para que turbo y workspaces resuelvan).
RUN yarn install --immutable

# --- Stage 2: build (genera Prisma client + compila TS) ----------------------
FROM node:22-alpine AS build
WORKDIR /repo

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

COPY --from=deps /repo /repo

# Genera Prisma Client y compila todos los workspaces (turbo respeta DAG).
RUN yarn workspace @mitama/db db:generate
RUN yarn build

# --- Stage 3: runtime (solo lo necesario para el API) ------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl tini && \
    addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production
ENV API_PORT=3000

# Copia todo el árbol (Prisma client vive en node_modules raíz por hoist).
# Una imagen más pequeña requeriría un paso adicional de poda con
# `yarn workspaces focus --production`; se deja como mejora futura.
COPY --from=build --chown=app:app /repo /app

USER app
EXPOSE 3000

# Healthcheck: el endpoint /health del API responde sin tocar DB.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${API_PORT}/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]
