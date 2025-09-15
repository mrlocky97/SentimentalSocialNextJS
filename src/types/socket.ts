/**
 * Socket.IO Type Extensions
 * Extends Socket.IO types to include custom data structures
 */

// Extend Socket.IO InterServerEvents and SocketData interfaces
declare module 'socket.io' {
  interface SocketData {
    user?: {
      id: string;
      email: string;
      role: string;
      fullName: string;
      connectedAt: Date;
      ipAddress?: string;
      organizationId?: string;
    };
  }
}

export interface WebSocketAuthUser {
  id: string;
  email: string;
  role: string;
  fullName: string;
  connectedAt: Date;
  ipAddress?: string;
  organizationId?: string;
}