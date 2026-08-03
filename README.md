# Aether Workspace Setup Guide

Welcome to **Aether**, a next-generation real-time collaborative workspace. This guide will walk you through setting up and launching the monorepo on your local machine.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **PostgreSQL**: A local PostgreSQL database server, or a remote database connection string (such as from Neon)
- **Git** (optional, for code versioning)

---

## 🚀 Quick Start Steps

Follow these steps to configure your environment and boot the application:

### 1. Configure the Environment
We require database settings and security keys. Create a `.env` file in the backend folder:
```bash
# Go to the workspace directory: c:\Users\Shreyansh\Desktop\pulse
cp apps/api/.env.example apps/api/.env
```

Open `apps/api/.env` and update:
- `DATABASE_URL`: Add your PostgreSQL connection string.
- `JWT_SECRET`: Update to a custom secure string for security.

### 2. Boot Local Services (PostgreSQL & Redis)
Aether requires PostgreSQL and Redis. Start them in the background using Docker Compose:
```bash
docker compose up -d
```
*Note: This starts an `aether-postgres` container on port `5432` and an `aether-redis` container on port `6379` with persistent volumes.*

### 3. Generate and Sync the Database Schema
We use Prisma ORM to map the models. Sync your database with the defined schema:
```bash
npx prisma db push --schema=apps/api/prisma/schema.prisma
```
*Note: This command connects to your database, applies the tables (User, Session, Organization, Workspace, Member, Comment), and completes the Prisma Client generation.*

### 4. Launch Development Servers
Launch both the frontend client and the backend API concurrently:
```bash
npm run dev
```

The servers will boot:
- **Web Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **NestJS backend REST API**: [http://localhost:3001/api](http://localhost:3001/api)

---

## 📁 Monorepo Workspace Map

Here is the directory structure:

```
pulse/
├── apps/
│   ├── web/             # Next.js 15 Client (Dashboard, Login, Landing Page)
│   └── api/             # NestJS API Backend (JWT Sessions, RBAC Guards, Prisma)
├── packages/
│   ├── ui/              # Shared Minimalist UI Primitive Library (GlassPanel, Button, Input)
│   ├── types/           # Shared TypeScript Models & Interfaces
│   └── config/          # Shared Configuration Bases (TSConfigs, ESLint)
├── package.json         # Workspace scripts & dependency settings
└── turbo.json           # Turborepo task caching definitions
```

---

## 🛠 Useful CLI Commands

Run these commands from the root directory (`pulse/`):

- **Build everything**:
  ```bash
  npm run build
  ```
- **Sync Prisma schema manually**:
  ```bash
  npx prisma generate --schema=apps/api/prisma/schema.prisma
  ```
- **Format code rules**:
  ```bash
  npm run format
  ```
