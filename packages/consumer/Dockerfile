FROM node:20-alpine AS base
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY packages/consumer/package.json packages/consumer/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
COPY apps/web/prisma/ apps/web/prisma/
RUN npm ci --ignore-scripts

# Build
FROM deps AS builder
COPY packages/shared/ packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
RUN npm run build --workspace=packages/shared
COPY packages/consumer/ packages/consumer/
RUN npx -w packages/consumer prisma generate --schema=../../apps/web/prisma/schema.prisma
RUN npm run build --workspace=packages/consumer

# Production image
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY --from=builder /app/packages/consumer/dist ./packages/consumer/dist
COPY --from=builder /app/packages/consumer/package.json ./packages/consumer/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

CMD ["node", "packages/consumer/dist/index.js"]
