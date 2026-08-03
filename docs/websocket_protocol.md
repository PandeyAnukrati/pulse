# WebSocket Protocol Specification

Details on real-time event packets sent between Next.js client and NestJS gateway channels.

---

## Connection Setup
Clients connect to Socket.IO port `3001` passing the authorization header as a query token:
```typescript
const socket = io("http://localhost:3001", {
  query: { token: accessToken }
});
```

---

## Gateway Socket Messages

### 1. `join-board` (Client → Server)
- **Purpose**: Subscribes the socket to a specific board's communication room.
- **Payload**:
  ```json
  { "boardId": "board-uuid" }
  ```

### 2. `yjs-update` (Client ↔ Server)
- **Purpose**: Distributes binary document delta edits conflict-free.
- **Payload**: Base64 encoded update binary string.

### 3. `cursor-move` (Client → Server / Server → Room)
- **Purpose**: Shares user cursor (x, y) coordinates for live rendering.
- **Payload**:
  ```json
  { "x": 340.5, "y": 120.0 }
  ```

### 4. `canvas-event` (Client → Server / Server → Room)
- **Purpose**: Appends transaction events to the database history log and synchronizes them to other boards.
- **Payload**:
  ```json
  {
    "eventType": "CREATE_NODE",
    "payload": {
      "id": "node-1",
      "type": "shape",
      "position": { "x": 100, "y": 100 },
      "data": { "type": "rectangle", "label": "API" }
    }
  }
  ```

### 5. `comment-created` (Server → Room)
- **Purpose**: Broadcasts new comment thread or reply instantly.
- **Payload**: Comment object including author user details.
