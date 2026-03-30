FROM node:20-alpine AS base
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
RUN npm ci --ignore-scripts

# Build shared package
FROM deps AS shared
COPY packages/shared/ packages/shared/
COPY packages/tsconfig/ packages/tsconfig/
RUN npm run build --workspace=packages/shared

# Build web app
FROM shared AS builder
COPY apps/web/ apps/web/
RUN npx -w apps/web prisma generate
RUN npm run build --workspace=apps/web

# Production image
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
