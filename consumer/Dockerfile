# Base Image
FROM node:18 AS base

# Builder Stage
FROM base AS builder
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=consumer --docker

# Installer Stage
FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm install

COPY --from=builder /app/out/full/ .
RUN npm run build

# Runner Stage
FROM base AS runner
WORKDIR /app
COPY --from=installer /app .

CMD ["node", "consumer/dist/index.js"]
