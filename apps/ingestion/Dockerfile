FROM node:20-alpine AS base
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/ingestion/package.json apps/ingestion/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
RUN npm ci --ignore-scripts

# Build
FROM deps AS builder
COPY packages/shared/ packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
RUN npm run build --workspace=packages/shared
COPY apps/ingestion/ apps/ingestion/
RUN npx -w apps/ingestion prisma generate --schema=../../apps/web/prisma/schema.prisma 2>/dev/null || true
RUN npm run build --workspace=apps/ingestion

# Production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY --from=builder /app/apps/ingestion/dist ./apps/ingestion/dist
COPY --from=builder /app/apps/ingestion/package.json ./apps/ingestion/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

EXPOSE 3001
CMD ["node", "apps/ingestion/dist/index.js"]
