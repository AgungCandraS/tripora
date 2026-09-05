# Tripora API (NestJS) — build dari root monorepo: docker build -f apps/api/Dockerfile .
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
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build -w @tripora/api

FROM node:20-bookworm-slim AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/prisma ./prisma
EXPOSE 4000
# migrate deploy jalan tiap boot agar skema selalu sinkron, lalu start server.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
