/**
 * MongoDB Connection Manager - Enhanced with Auto-Reconnection
 * Singleton pattern for database connection with improved error handling
 */

import mongoose from 'mongoose';
import { databaseConfig } from '../config/database';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 5000; // 5 seconds

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('✅ MongoDB already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('⏳ MongoDB connection in progress...');
      return;
    }

    this.isConnecting = true;

    try {
      const mongoUri = databaseConfig.mongodb.uri;

      if (!mongoUri) {
        throw new Error('MongoDB URI is not defined in environment variables');
      }

      console.log('🔌 Connecting to MongoDB...');
      console.log(`📍 URI: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs

      // Set mongoose configuration
      mongoose.set('strictQuery', false);

      await mongoose.connect(mongoUri, {
        ...databaseConfig.mongodb.options,
      } as mongoose.ConnectOptions);

      this.isConnected = true;
      this.isConnecting = false;
      this.connectionAttempts = 0;

      console.log('✅ MongoDB connected successfully');
      console.log(`🏷️  Database: ${mongoose.connection.db?.databaseName}`);

      // Setup event handlers
      this.setupEventHandlers();
    } catch (error) {
      this.isConnecting = false;
      this.connectionAttempts++;

      console.error(
        `❌ MongoDB connection failed (attempt ${this.connectionAttempts}/${this.maxRetries}):`,
        error
      );

      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying connection in ${this.retryDelay / 1000} seconds...`);
        setTimeout(() => this.connect(), this.retryDelay);
        return;
      }

      console.error('💥 Maximum connection attempts exceeded. Please check MongoDB service.');
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Setup MongoDB event handlers
   */
  private setupEventHandlers(): void {
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected - attempting reconnection...');
      this.isConnected = false;
      // Auto-reconnect after disconnection
      setTimeout(() => {
        if (!this.isConnected && !this.isConnecting) {
          this.connect().catch((err) => console.error('Auto-reconnect failed:', err));
        }
      }, this.retryDelay);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('📦 Gracefully shutting down MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('📦 Gracefully shutting down MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📴 MongoDB disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnection(): typeof mongoose {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return mongoose;
  }

  isHealthy(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async healthCheck(): Promise<{
    connected: boolean;
    readyState: number;
    readyStateText: string;
    host: string;
    port: number;
    database: string;
  }> {
    const readyStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      connected: this.isConnected,
      readyState: mongoose.connection.readyState,
      readyStateText:
        readyStates[mongoose.connection.readyState as keyof typeof readyStates] || 'unknown',
      host: mongoose.connection.host || 'unknown',
      port: mongoose.connection.port || 0,
      database: mongoose.connection.db?.databaseName || 'unknown',
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Simple ping to test connection
      await mongoose.connection.db?.admin().ping();
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection test failed:', error);
      return false;
    }
  }
}

export default DatabaseConnection.getInstance();
