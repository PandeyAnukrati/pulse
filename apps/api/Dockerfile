FROM node:20-alpine AS builder
WORKDIR /app

# Copy lock files and workspaces configs
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN npm ci

# Copy sources
COPY apps/api ./apps/api
COPY packages ./packages

# Generate Prisma Client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build the api
RUN npm run build --workspace=@aether/api

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
