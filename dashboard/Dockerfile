# https://github.com/vercel/turbo/blob/main/examples/with-docker/apps/web/Dockerfile

FROM node:18-alpine AS base
 
FROM base AS builder
RUN apk add --no-cache libc6-compat
RUN apk update
# Set working directory
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune dashboard --docker
 
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat
RUN apk update
WORKDIR /app
RUN npm install -g turbo pnpm
 
# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install
 
# Build the project
COPY --from=builder /app/out/full/ .
RUN turbo run build --filter=dashboard...
 
FROM base AS runner
WORKDIR /app
 
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs
RUN ls -la /app
 
COPY --from=installer /app/dashboard/next.config.js .
COPY --from=installer /app/dashboard/package.json .
 
# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=installer --chown=nextjs:nodejs /app/dashboard/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/dashboard/.next/static ./dashboard/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/dashboard/public ./dashboard/public
 
CMD node dashboard/server.js