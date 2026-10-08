FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages ./packages
RUN npm ci
COPY . .
RUN npm run build -w @tripora/types && npm run db:generate && npm run build -w @tripora/api && npm run build -w @tripora/worker

FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/deploy/start-backend.cjs ./deploy/start-backend.cjs
EXPOSE 4000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma && node deploy/start-backend.cjs"]
