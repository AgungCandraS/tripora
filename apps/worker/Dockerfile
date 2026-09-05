# Tripora Worker (BullMQ) — build dari root monorepo: docker build -f apps/worker/Dockerfile .
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages ./packages
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/worker
RUN npm run build -w @tripora/worker

FROM node:20-bookworm-slim AS runner
WORKDIR /app/apps/worker
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/worker/dist ./dist
COPY --from=build /app/apps/worker/package.json ./package.json
# Sweeper rekonsiliasi + email; butuh DATABASE_URL & QUEUE_REDIS_* dari env.
CMD ["node", "dist/index.js"]
