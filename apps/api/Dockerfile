FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter @rentalos/api... --no-frozen-lockfile
COPY apps/api apps/api
RUN pnpm --filter @rentalos/api prisma:generate && pnpm --filter @rentalos/api build
FROM node:22-alpine
WORKDIR /app/apps/api
ENV NODE_ENV=production
# pnpm uses symlinks from the workspace package into the root virtual store.
# Preserve both paths and the app directory layout in the runtime image.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main"]
