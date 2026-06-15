# --- Stage 1: deps -----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /repo

RUN apk add --no-cache libc6-compat
RUN corepack enable

COPY package.json yarn.lock .yarnrc.yml turbo.json ./
COPY .yarn ./.yarn
COPY packages packages
COPY apps apps
COPY tools tools

RUN yarn install --immutable

# --- Stage 2: build (genera Prisma + build de Next con output standalone) ----
FROM node:22-alpine AS build
WORKDIR /repo

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

COPY --from=deps /repo /repo

ENV NEXT_OUTPUT_TRACING_ROOT=/repo
ENV NEXT_TELEMETRY_DISABLED=1

# El admin no toca Prisma directamente, pero @mitama/db es dep transitiva.
RUN yarn workspace @mitama/db db:generate
RUN yarn workspace @mitama/admin build

# --- Stage 3: runtime (solo el bundle standalone) ----------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache libc6-compat tini && \
    addgroup -S app && adduser -S app -G app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

# Next.js `output: standalone` produce un mini servidor con sus deps en
# `.next/standalone`. `static/` y `public/` se copian aparte.
COPY --from=build --chown=app:app /repo/apps/admin/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=app:app /repo/apps/admin/public ./apps/admin/public

USER app
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/admin/server.js"]
