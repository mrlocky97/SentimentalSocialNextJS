/**
 * WebSocket Service
 * Manages real-time communication for scraping progress and other events
 */

import jwt from 'jsonwebtoken';
import { Socket, Server as SocketIOServer } from 'socket.io';
import { systemLogger } from '../lib/observability/logger';
import { tokenBlacklistService } from '../lib/security/token-blacklist';

export interface WebSocketRoom {
  campaignId: string;
  userId?: string;
  organizationId?: string;
}

export interface ClientInfo {
  id: string;
  userId?: string;
  organizationId?: string;
  joinedRooms: Set<string>; // Cambiado a Set para mejor performance
  connectedAt: Date;
  lastActivity: Date; // Añadido para tracking de actividad
}

export interface UserData {
  id: string;
  email?: string;
  role?: string;
  fullName?: string;
  organizationId?: string;
}

export interface ConnectionStats {
  connectedClients: number;
  activeRooms: number;
  roomDetails: Record<string, number>;
  userConnections: Record<string, number>;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private clients = new Map<string, ClientInfo>();
  private roomMembers = new Map<string, Set<string>>();
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 segundos
  private readonly CONNECTION_TIMEOUT = 60000; // 60 segundos
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(io: SocketIOServer): void {
    if (this.io) {
      systemLogger.warn('WebSocket service already initialized');
      return;
    }

    this.io = io;

    // Configurar middleware de autenticación
    io.use(this.authenticationMiddleware.bind(this));

    io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    // Iniciar heartbeat para limpiar conexiones inactivas
    this.startHeartbeat();

    systemLogger.info('WebSocket service initialized');
  }

  /**
   * Middleware de autenticación
   */
  private authenticationMiddleware(socket: Socket, next: (err?: Error) => void): void {
    try {
      // Aquí deberías implementar tu lógica de autenticación real
      // Por ejemplo, verificar JWT token del handshake
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Simular validación de token (reemplazar con tu lógica real)
      const userData = this.validateToken(token as string);
      if (!userData) {
        return next(new Error('Invalid authentication token'));
      }

      socket.data.user = userData;
      next();
    } catch (error) {
      systemLogger.error('Authentication middleware error:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Validate JWT token using the same security standards as Express middleware
   */
  private validateToken(token: string): UserData | null {
    try {
      // Basic token validation
      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        systemLogger.warn('WebSocket: Empty or invalid token format');
        return null;
      }

      // Get JWT secret (same as Express middleware)
      const JWT_SECRET = (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          systemLogger.error('JWT_SECRET environment variable is required for WebSocket auth');
          return null;
        }
        return secret;
      })();

      if (!JWT_SECRET) {
        return null;
      }

      // SECURITY: Check if token is blacklisted (logout protection)
      if (tokenBlacklistService.isTokenBlacklisted(token)) {
        systemLogger.warn('WebSocket: Rejected blacklisted token');
        return null;
      }

      // Verify and decode JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
        fullName: string;
        iat?: number;
        exp?: number;
      };

      // Validate required fields
      if (!decoded.id || !decoded.email || !decoded.role) {
        systemLogger.warn('WebSocket: Invalid token payload structure');
        return null;
      }

      // Return user data in expected format
      const userData: UserData = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        fullName: decoded.fullName || decoded.email, // Fallback to email if no fullName
        organizationId: undefined, // Will be set by user service if needed
      };

      systemLogger.debug(`WebSocket: Token validated for user ${decoded.email} (${decoded.id})`);
      return userData;

    } catch (error) {
      // Handle specific JWT errors
      if (error && typeof error === 'object' && 'name' in error) {
        const jwtError = error as { name: string; message?: string };
        switch (jwtError.name) {
          case 'TokenExpiredError':
            systemLogger.info('WebSocket: Token expired');
            break;
          case 'JsonWebTokenError':
            systemLogger.warn('WebSocket: Invalid JWT token');
            break;
          case 'NotBeforeError':
            systemLogger.warn('WebSocket: Token used before valid');
            break;
          default:
            systemLogger.error('WebSocket: Token validation error:', {
              error: jwtError.message || 'Unknown error',
              name: jwtError.name,
            });
        }
      } else {
        systemLogger.error('WebSocket: Unexpected token validation error:', error);
      }

      return null;
    }
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    const userData = socket.data.user as UserData;

    if (!userData) {
      systemLogger.error(`No user data found for socket ${clientId}`);
      socket.disconnect();
      return;
    }

    // Store client info with authenticated user data
    const clientInfo: ClientInfo = {
      id: clientId,
      userId: userData.id,
      organizationId: userData.organizationId,
      joinedRooms: new Set<string>(),
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.clients.set(clientId, clientInfo);

    systemLogger.info(`WebSocket client connected: ${clientId} (User: ${userData.email})`);

    // Configurar event handlers
    this.setupSocketHandlers(socket, userData);

    // Enviar confirmación de conexión
    socket.emit('connected', {
      clientId,
      connectedAt: clientInfo.connectedAt,
      serverTime: new Date().toISOString(),
    });
  }

  /**
   * Configurar manejadores de eventos del socket
   */
  private setupSocketHandlers(socket: Socket, userData: UserData): void {
    // Update activity on any event
    const updateActivity = () => {
      const clientInfo = this.clients.get(socket.id);
      if (clientInfo) {
        clientInfo.lastActivity = new Date();
      }
    };

    // Handle joining campaign room
    socket.on('join-campaign', (campaignId: string) => {
      updateActivity();
      this.joinCampaignRoom(socket, campaignId);
    });

    // Handle leaving campaign room
    socket.on('leave-campaign', (campaignId: string) => {
      updateActivity();
      this.leaveCampaignRoom(socket, campaignId);
    });

    // Handle user info request
    socket.on('get-user-info', () => {
      updateActivity();
      socket.emit('user-info', {
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        fullName: userData.fullName,
        organizationId: userData.organizationId,
        connectedAt: this.clients.get(socket.id)?.connectedAt,
      });
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      updateActivity();
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      systemLogger.error(`WebSocket error for client ${socket.id}:`, {
        error: error.message,
        stack: error.stack,
        userId: userData.id,
      });
    });
  }

  /**
   * Join campaign room for progress updates
   */
  private joinCampaignRoom(socket: Socket, campaignId: string): void {
    if (!campaignId || typeof campaignId !== 'string') {
      socket.emit('error', { message: 'Invalid campaign ID' });
      return;
    }

    const roomName = `campaign-${campaignId}`;
    const clientInfo = this.clients.get(socket.id);

    if (!clientInfo) {
      socket.emit('error', { message: 'Client not found' });
      return;
    }

    // Verificar si ya está en la room
    if (clientInfo.joinedRooms.has(roomName)) {
      socket.emit('already-in-campaign', { campaignId });
      return;
    }

    socket.join(roomName);

    // Update client info
    clientInfo.joinedRooms.add(roomName);

    // Update room members
    if (!this.roomMembers.has(roomName)) {
      this.roomMembers.set(roomName, new Set());
    }
    this.roomMembers.get(roomName)!.add(socket.id);

    systemLogger.info(`Client ${socket.id} joined campaign room: ${campaignId}`);
    socket.emit('joined-campaign', {
      campaignId,
      roomName,
      membersCount: this.roomMembers.get(roomName)?.size || 0,
    });
  }

  /**
   * Leave campaign room
   */
  private leaveCampaignRoom(socket: Socket, campaignId: string): void {
    if (!campaignId || typeof campaignId !== 'string') {
      socket.emit('error', { message: 'Invalid campaign ID' });
      return;
    }

    const roomName = `campaign-${campaignId}`;
    const clientInfo = this.clients.get(socket.id);

    if (!clientInfo) {
      socket.emit('error', { message: 'Client not found' });
      return;
    }

    socket.leave(roomName);

    // Update client info
    clientInfo.joinedRooms.delete(roomName);

    // Update room members
    const roomMembers = this.roomMembers.get(roomName);
    if (roomMembers) {
      roomMembers.delete(socket.id);
      if (roomMembers.size === 0) {
        this.roomMembers.delete(roomName);
      }
    }

    systemLogger.info(`Client ${socket.id} left campaign room: ${campaignId}`);
    socket.emit('left-campaign', {
      campaignId,
      membersCount: roomMembers?.size || 0,
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket, reason?: string): void {
    const clientInfo = this.clients.get(socket.id);

    if (clientInfo) {
      // Remove from all rooms efficiently
      for (const roomName of clientInfo.joinedRooms) {
        const roomMembers = this.roomMembers.get(roomName);
        if (roomMembers) {
          roomMembers.delete(socket.id);
          if (roomMembers.size === 0) {
            this.roomMembers.delete(roomName);
          }
        }
      }

      this.clients.delete(socket.id);
    }

    systemLogger.info(`WebSocket client disconnected: ${socket.id}`, {
      reason,
      userId: clientInfo?.userId,
      duration: clientInfo ? Date.now() - clientInfo.connectedAt.getTime() : 0,
    });
  }

  /**
   * Start heartbeat to clean inactive connections
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.cleanupInactiveConnections();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Clean up inactive connections
   */
  private cleanupInactiveConnections(): void {
    const now = Date.now();
    const inactiveClients: string[] = [];

    this.clients.forEach((clientInfo, socketId) => {
      const timeSinceLastActivity = now - clientInfo.lastActivity.getTime();
      if (timeSinceLastActivity > this.CONNECTION_TIMEOUT) {
        inactiveClients.push(socketId);
      }
    });

    inactiveClients.forEach((socketId) => {
      const socket = this.io?.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      } else {
        // Socket already disconnected, just clean up
        this.handleDisconnection({ id: socketId } as Socket);
      }
    });

    if (inactiveClients.length > 0) {
      systemLogger.info(`Cleaned up ${inactiveClients.length} inactive connections`);
    }
  }

  /**
   * Emit to specific campaign room
   */
  emitToCampaign(campaignId: string, event: string, data: any): boolean {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot emit event');
      return false;
    }

    if (!campaignId || !event) {
      systemLogger.warn('Invalid parameters for emitToCampaign', { campaignId, event });
      return false;
    }

    const roomName = `campaign-${campaignId}`;
    const membersCount = this.roomMembers.get(roomName)?.size || 0;

    if (membersCount === 0) {
      systemLogger.debug(`No members in campaign room ${campaignId}, skipping emit`);
      return false;
    }

    this.io.to(roomName).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      campaignId,
    });

    systemLogger.debug(`Emitted ${event} to campaign ${campaignId}`, {
      roomName,
      membersCount,
      dataType: typeof data,
    });

    return true;
  }

  /**
   * Emit to specific user
   */
  emitToUser(userId: string, event: string, data: any): boolean {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot emit event');
      return false;
    }

    if (!userId || !event) {
      systemLogger.warn('Invalid parameters for emitToUser', { userId, event });
      return false;
    }

    // Find all sockets for this user más eficientemente
    const userSockets = Array.from(this.clients.entries())
      .filter(([, clientInfo]) => clientInfo.userId === userId)
      .map(([socketId]) => socketId);

    if (userSockets.length === 0) {
      systemLogger.debug(`No sockets found for user ${userId}`);
      return false;
    }

    const enrichedData = {
      ...data,
      timestamp: new Date().toISOString(),
      userId,
    };

    userSockets.forEach((socketId) => {
      this.io!.to(socketId).emit(event, enrichedData);
    });

    systemLogger.debug(`Emitted ${event} to user ${userId}`, {
      socketsCount: userSockets.length,
      dataType: typeof data,
    });

    return true;
  }

  /**
   * Emit to organization
   */
  emitToOrganization(organizationId: string, event: string, data: any): boolean {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot emit event');
      return false;
    }

    if (!organizationId || !event) {
      systemLogger.warn('Invalid parameters for emitToOrganization', { organizationId, event });
      return false;
    }

    // Find all sockets for this organization más eficientemente
    const orgSockets = Array.from(this.clients.entries())
      .filter(([, clientInfo]) => clientInfo.organizationId === organizationId)
      .map(([socketId]) => socketId);

    if (orgSockets.length === 0) {
      systemLogger.debug(`No sockets found for organization ${organizationId}`);
      return false;
    }

    const enrichedData = {
      ...data,
      timestamp: new Date().toISOString(),
      organizationId,
    };

    orgSockets.forEach((socketId) => {
      this.io!.to(socketId).emit(event, enrichedData);
    });

    systemLogger.debug(`Emitted ${event} to organization ${organizationId}`, {
      socketsCount: orgSockets.length,
      dataType: typeof data,
    });

    return true;
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): boolean {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot broadcast event');
      return false;
    }

    if (!event) {
      systemLogger.warn('Invalid event name for broadcast');
      return false;
    }

    const enrichedData = {
      ...data,
      timestamp: new Date().toISOString(),
    };

    this.io.emit(event, enrichedData);
    systemLogger.debug(`Broadcasted ${event} to all clients`, {
      dataType: typeof data,
      clientsCount: this.clients.size,
    });

    return true;
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    const roomDetails: Record<string, number> = {};
    const userConnections: Record<string, number> = {};

    this.roomMembers.forEach((members, roomName) => {
      roomDetails[roomName] = members.size;
    });

    // Count connections per user
    this.clients.forEach((clientInfo) => {
      if (clientInfo.userId) {
        userConnections[clientInfo.userId] = (userConnections[clientInfo.userId] || 0) + 1;
      }
    });

    return {
      connectedClients: this.clients.size,
      activeRooms: this.roomMembers.size,
      roomDetails,
      userConnections,
    };
  }

  /**
   * Get client info by socket ID
   */
  getClientInfo(socketId: string): ClientInfo | undefined {
    return this.clients.get(socketId);
  }

  /**
   * Get all clients for a user
   */
  getUserClients(userId: string): ClientInfo[] {
    return Array.from(this.clients.values()).filter((client) => client.userId === userId);
  }

  /**
   * Check if WebSocket is initialized
   */
  isInitialized(): boolean {
    return this.io !== null;
  }

  /**
   * Gracefully shutdown the service
   */
  shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.io) {
      systemLogger.info('Shutting down WebSocket service');
      this.io.close();
      this.io = null;
    }

    this.clients.clear();
    this.roomMembers.clear();
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
