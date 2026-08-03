# Deployment Guide

Detailed guidelines to deploy Aether in production environments using Docker Compose.

---

## 📋 Environment Configuration

Create a production `.env` file at the root or within target containers:

```bash
# Database connections
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"

# Security keys
JWT_SECRET="generate-a-secure-long-string-value"
CLIENT_URL="http://localhost:3000"

# AI Integrations
GEMINI_API_KEY="your-gemini-google-developer-key"

# Monitoring
SENTRY_DSN="https://your-sentry-ingest-url"
```

---

## 🐳 Docker Deployment Setup

Build and run the entire application stack in the background:

```bash
# Build production images and start services
docker compose up -d --build
```

This launches:
1. `aether-postgres` on port `5432`
2. `aether-redis` on port `6379`
3. `aether-api` (NestJS application) on port `3001`
4. `aether-web` (Next.js client) on port `3000`

---

## 📈 Health Checking & Logs

Verify service health:
```bash
# View active container status
docker compose ps

# Check NestJS server logs
docker compose logs api -f
```
