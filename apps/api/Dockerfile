# syntax=docker/dockerfile:1.7
# Yoyo API image. Build from the repository root (pnpm workspace):
#   docker build -f apps/api/Dockerfile -t yoyo-api .

FROM node:24-slim AS build
ENV TURBO_TELEMETRY_DISABLED=1 CI=1
WORKDIR /repo
RUN npm install -g pnpm@12.16.1
COPY . .
# Install only the API and the workspace packages it depends on.
RUN pnpm install --frozen-lockfile --filter "@yoyo/api..."
RUN pnpm turbo run build --filter=@yoyo/api
# Self-contained production bundle: dist, Prisma schema/migrations and prod dependencies only.
RUN pnpm --filter @yoyo/api deploy --prod /out

FROM node:24-slim AS runtime
ENV NODE_ENV=production
# Prisma's schema engine (used by `migrate deploy`) needs OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE 4000
# Apply pending migrations, then start. PORT comes from the host (Render sets it).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
