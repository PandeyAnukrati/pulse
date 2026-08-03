# Authentication Flow

This document details the security and lifecycle flow of tokens inside Aether.

## Flow Mechanics

```mermaid
sequenceDiagram
    participant User as Next.js Client
    participant Auth as NestJS Auth Controller
    participant DB as PostgreSQL DB

    User->>Auth: POST /auth/login (Credentials)
    Auth->>DB: Query User
    DB-->>Auth: Password Hash Match
    Auth->>Auth: Sign Access Token (expires 15m)
    Auth->>Auth: Sign Refresh Token (expires 7d)
    Auth-->>User: Return Access Token & Set Refresh Cookie (HTTP-Only)
    
    Note over User, Auth: Submitting authenticated requests
    User->>Auth: GET /organizations (Bearer Access Token)
    Auth-->>User: 200 OK
    
    Note over User, Auth: Access Token Expires
    User->>Auth: POST /auth/refresh (Sends Refresh Cookie)
    Auth-->>User: Return new Access Token
```

## Security Toggles
1. **HTTP-Only Cookies**: Refresh tokens are stored in secure cookies preventing XSS accesses.
2. **Access Token Lifetimes**: Short 15-minute expirations restrict replay attacks.
3. **Silent Refresh Interceptor**: The client REST utility intercepts `401 Unauthorized` responses, calls `/auth/refresh` in the background, and retries the original request seamlessly.
