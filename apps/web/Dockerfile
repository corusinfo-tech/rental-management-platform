FROM node:22-alpine AS build
ARG RELEASE_SHA
WORKDIR /app
RUN corepack enable

RUN printf '%s\n' "$RELEASE_SHA" | grep -Eq '^[0-9a-f]{40}$'

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @noagent4u/web build

FROM node:22-alpine
ARG RELEASE_SHA
WORKDIR /app
ENV NODE_ENV=production
ENV API_INTERNAL_URL=http://api:3001

RUN printf '%s\n' "$RELEASE_SHA" | grep -Eq '^[0-9a-f]{40}$'
LABEL org.opencontainers.image.source="https://github.com/corusinfo-tech/rental-management-platform" \
      org.opencontainers.image.revision="$RELEASE_SHA"

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
