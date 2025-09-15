/**
 * WebSocket Service
 * Manages real-time communication for scraping progress and other events
 */

import { Socket, Server as SocketIOServer } from 'socket.io';
import { systemLogger } from '../lib/observability/logger';

export interface WebSocketRoom {
  campaignId: string;
  userId?: string;
  organizationId?: string;
}

export interface ClientInfo {
  id: string;
  userId?: string;
  organizationId?: string;
  joinedRooms: string[];
  connectedAt: Date;
}

class WebSocketService {
  private io: SocketIOServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private roomMembers: Map<string, Set<string>> = new Map();

  /**
   * Initialize WebSocket server
   */
  initialize(io: SocketIOServer): void {
    this.io = io;

    io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    systemLogger.info('WebSocket service initialized');
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    
    // Get authenticated user data from socket.data (set by authentication middleware)
    const userData = socket.data.user;

    // Store client info with authenticated user data
    this.clients.set(clientId, {
      id: clientId,
      userId: userData?.id,
      organizationId: userData?.organizationId, // Add if available in your user model
      joinedRooms: [],
      connectedAt: new Date(),
    });

    systemLogger.info(`WebSocket client connected: ${clientId} (User: ${userData?.email || 'unknown'})`);

    // Handle joining campaign room
    socket.on('join-campaign', (campaignId: string) => {
      this.joinCampaignRoom(socket, campaignId);
    });

    // Handle leaving campaign room
    socket.on('leave-campaign', (campaignId: string) => {
      this.leaveCampaignRoom(socket, campaignId);
    });

    // Handle user info request
    socket.on('get-user-info', () => {
      socket.emit('user-info', {
        userId: userData?.id,
        email: userData?.email,
        role: userData?.role,
        fullName: userData?.fullName,
        connectedAt: userData?.connectedAt
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      systemLogger.error(`WebSocket error for client ${clientId}:`, error);
    });
  }

  /**
   * Join campaign room for progress updates
   */
  private joinCampaignRoom(socket: Socket, campaignId: string): void {
    const roomName = `campaign-${campaignId}`;

    socket.join(roomName);

    // Update client info
    const clientInfo = this.clients.get(socket.id);
    if (clientInfo) {
      clientInfo.joinedRooms.push(roomName);
      this.clients.set(socket.id, clientInfo);
    }

    // Update room members
    if (!this.roomMembers.has(roomName)) {
      this.roomMembers.set(roomName, new Set());
    }
    this.roomMembers.get(roomName)!.add(socket.id);

    systemLogger.info(`Client ${socket.id} joined campaign room: ${campaignId}`);
    socket.emit('joined-campaign', { campaignId, roomName });
  }

  /**
   * Leave campaign room
   */
  private leaveCampaignRoom(socket: Socket, campaignId: string): void {
    const roomName = `campaign-${campaignId}`;

    socket.leave(roomName);

    // Update client info
    const clientInfo = this.clients.get(socket.id);
    if (clientInfo) {
      clientInfo.joinedRooms = clientInfo.joinedRooms.filter((room) => room !== roomName);
      this.clients.set(socket.id, clientInfo);
    }

    // Update room members
    const roomMembers = this.roomMembers.get(roomName);
    if (roomMembers) {
      roomMembers.delete(socket.id);
      if (roomMembers.size === 0) {
        this.roomMembers.delete(roomName);
      }
    }

    systemLogger.info(`Client ${socket.id} left campaign room: ${campaignId}`);
    socket.emit('left-campaign', { campaignId });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket): void {
    const clientInfo = this.clients.get(socket.id);

    if (clientInfo) {
      // Remove from all rooms
      clientInfo.joinedRooms.forEach((roomName) => {
        const roomMembers = this.roomMembers.get(roomName);
        if (roomMembers) {
          roomMembers.delete(socket.id);
          if (roomMembers.size === 0) {
            this.roomMembers.delete(roomName);
          }
        }
      });

      this.clients.delete(socket.id);
    }

    systemLogger.info(`WebSocket client disconnected: ${socket.id}`);
  }

  /**
   * Emit to specific campaign room
   */
  emitToCampaign(campaignId: string, event: string, data: any): void {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot emit event');
      return;
    }

    const roomName = `campaign-${campaignId}`;
    this.io.to(roomName).emit(event, data);

    systemLogger.debug(`Emitted ${event} to campaign ${campaignId}`, {
      roomName,
      data: typeof data,
    });
  }

  /**
   * Emit to specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot emit event');
      return;
    }

    // Find all sockets for this user
    const userSockets: string[] = [];
    this.clients.forEach((clientInfo, socketId) => {
      if (clientInfo.userId === userId) {
        userSockets.push(socketId);
      }
    });

    userSockets.forEach((socketId) => {
      this.io!.to(socketId).emit(event, data);
    });

    systemLogger.debug(`Emitted ${event} to user ${userId}`, {
      socketsCount: userSockets.length,
      data: typeof data,
    });
  }

  /**
   * Emit to organization
   */
  emitToOrganization(organizationId: string, event: string, data: any): void {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot emit event');
      return;
    }

    // Find all sockets for this organization
    const orgSockets: string[] = [];
    this.clients.forEach((clientInfo, socketId) => {
      if (clientInfo.organizationId === organizationId) {
        orgSockets.push(socketId);
      }
    });

    orgSockets.forEach((socketId) => {
      this.io!.to(socketId).emit(event, data);
    });

    systemLogger.debug(`Emitted ${event} to organization ${organizationId}`, {
      socketsCount: orgSockets.length,
      data: typeof data,
    });
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event: string, data: any): void {
    if (!this.io) {
      systemLogger.warn('WebSocket not initialized, cannot broadcast event');
      return;
    }

    this.io.emit(event, data);
    systemLogger.debug(`Broadcasted ${event} to all clients`, { data: typeof data });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    connectedClients: number;
    activeRooms: number;
    roomDetails: { [roomName: string]: number };
  } {
    const roomDetails: { [roomName: string]: number } = {};
    this.roomMembers.forEach((members, roomName) => {
      roomDetails[roomName] = members.size;
    });

    return {
      connectedClients: this.clients.size,
      activeRooms: this.roomMembers.size,
      roomDetails,
    };
  }

  /**
   * Check if WebSocket is initialized
   */
  isInitialized(): boolean {
    return this.io !== null;
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
