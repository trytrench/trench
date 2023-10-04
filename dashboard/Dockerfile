# Base Image
FROM node:18 AS base

# Builder Stage
FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=dashboard --docker

# Installer Stage
FROM base AS installer
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install

COPY --from=builder /app/out/full/ .
RUN SKIP_ENV_VALIDATION=true pnpm run build

# Runner Stage
FROM base AS runner
RUN npm install -g pnpm
WORKDIR /app
COPY --from=installer /app .
CMD ["pnpm", "run", "start"]

EXPOSE 3000