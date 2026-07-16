FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @noagent4u/web build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV API_INTERNAL_URL=http://api:3001

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
