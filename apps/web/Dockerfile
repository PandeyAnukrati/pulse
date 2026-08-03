FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

RUN npm ci

COPY apps/web ./apps/web
COPY packages ./packages

# Build the web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@aether/web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

EXPOSE 3000
CMD ["npm", "start", "--workspace=@aether/web"]
