# REST API Specification

A list of REST endpoints exposed by the NestJS API backend on `http://localhost:3001/api`.

---

## 🔐 Authentication Module

### 1. Register User
- **Route**: `POST /auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Response**: `201 Created` returning JWT tokens.

### 2. Login User
- **Route**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: `200 OK` returning access token and setting HTTP-only refresh cookie.

### 3. Token Refresh
- **Route**: `POST /auth/refresh`
- **Response**: `200 OK` signs new access token.

---

## 🏢 Organizations & Workspaces

### 1. Create Organization
- **Route**: `POST /organizations`
- **Headers**: `Authorization: Bearer <Token>`
- **Body**: `{ "name": "Aether Inc" }`

### 2. Create Workspace
- **Route**: `POST /organizations/:orgId/workspaces`
- **Headers**: `Authorization: Bearer <Token>`
- **Body**: `{ "name": "Main Whiteboard" }`

---

## 💬 Collaborative Comments

### 1. List Comments
- **Route**: `GET /comments/workspace/:boardId`
- **Headers**: `Authorization: Bearer <Token>`
- **Response**: List of threaded comments and nested replies.

### 2. Create Comment / Reply
- **Route**: `POST /comments`
- **Headers**: `Authorization: Bearer <Token>`
- **Body**:
  ```json
  {
    "workspaceId": "board-uuid",
    "content": "Look at this workflow node!",
    "x": 120.5,
    "y": -340.0,
    "parentId": "optional-parent-comment-id"
  }
  ```

---

## 🧠 AI Assistant & Generations (Gemini)

### 1. Assistant Chat
- **Route**: `POST /ai/chat`
- **Body**: `{ "message": "Explain this canvas diagram", "boardContext": "{...}" }`

### 2. Generate Architecture Nodes
- **Route**: `POST /ai/generate-architecture`
- **Body**: `{ "prompt": "Distributed redis caching" }`
- **Response**: React Flow JSON array representing diagrams.
