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
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builder /app/out/full/ .
RUN SKIP_ENV_VALIDATION=true npm run build

# Runner Stage
FROM base AS runner
WORKDIR /app
COPY --from=installer /app .
CMD ["npm", "run", "start"]

EXPOSE 3000