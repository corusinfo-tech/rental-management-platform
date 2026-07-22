FROM node:22-alpine AS build
ARG RELEASE_SHA
WORKDIR /app
RUN corepack enable

RUN printf '%s\n' "$RELEASE_SHA" | grep -Eq '^[0-9a-f]{40}$'

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json prisma.config.ts ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/scheduler/package.json apps/scheduler/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/notifications/package.json packages/notifications/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate --schema prisma/schemas
RUN pnpm --filter @noagent4u/worker build
RUN pnpm --filter @noagent4u/worker --prod deploy --legacy --prefer-offline /opt/noagent4u-worker
RUN cp -R node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/. /opt/noagent4u-worker/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/

RUN SOURCE_CLIENT="$(readlink -f /app/node_modules/@prisma/client)" && \
    SOURCE_NODE_MODULES="$(dirname "$(dirname "$SOURCE_CLIENT")")" && \
    DEST_CLIENT="$(readlink -f /opt/noagent4u-worker/node_modules/@prisma/client)" && \
    DEST_NODE_MODULES="$(dirname "$(dirname "$DEST_CLIENT")")" && \
    rm -rf "$DEST_NODE_MODULES/.prisma" && \
    cp -a "$SOURCE_NODE_MODULES/.prisma" "$DEST_NODE_MODULES/.prisma"

FROM node:22-alpine
ARG RELEASE_SHA
WORKDIR /app
ENV NODE_ENV=production

RUN printf '%s\n' "$RELEASE_SHA" | grep -Eq '^[0-9a-f]{40}$'
LABEL org.opencontainers.image.source="https://github.com/corusinfo-tech/rental-management-platform" \
      org.opencontainers.image.revision="$RELEASE_SHA"

COPY --from=build /opt/noagent4u-worker ./
COPY --from=build /app/apps/worker/dist ./dist

EXPOSE 3011
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3011/health/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
