export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  token: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  user?: User;
  organizationId: string;
  role: Role;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  organizationId: string;
  canvasData?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasEvent {
  id: string;
  workspaceId: string;
  eventType: string;
  payload: any;
  userId?: string;
  sequence: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  workspaceId: string;
  userId: string;
  user?: User;
  content: string;
  x: number;
  y: number;
  nodeId?: string;
  parentId?: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface AuditLog {
  id: string;
  workspaceId?: string;
  userId: string;
  action: string;
  details: any;
  createdAt: string;
}

// Authentication DTO response structures
export interface AuthResponse {
  user: User;
  accessToken: string;
}
