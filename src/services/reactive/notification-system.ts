/**
 * Simple Notifications System
 * Lightweight notification system with multiple channels
 */

import { Observable, Subject, BehaviorSubject, timer } from 'rxjs';
import { 
  map, 
  filter, 
  mergeMap, 
  catchError, 
  retry, 
  throttleTime,
  tap
} from 'rxjs/operators';

export interface NotificationPayload {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'crisis';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
}

export interface NotificationChannel {
  id: string;
  type: 'console' | 'webhook' | 'email' | 'file';
  name: string;
  endpoint?: string;
  enabled: boolean;
  config?: any;
}

export interface NotificationStats {
  totalSent: number;
  successful: number;
  failed: number;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
}

class SimpleNotificationSystem {
  private notificationQueue$ = new Subject<NotificationPayload>();
  private stats$ = new BehaviorSubject<NotificationStats>({
    totalSent: 0,
    successful: 0,
    failed: 0,
    byChannel: {},
    byType: {}
  });

  private channels: NotificationChannel[] = [
    {
      id: 'console',
      type: 'console',
      name: 'Console Logger',
      enabled: true
    },
    {
      id: 'file',
      type: 'file',
      name: 'File Logger',
      enabled: true,
      config: { logPath: './logs/notifications.log' }
    }
  ];

  constructor() {
    this.initializeProcessing();
  }

  /**
   * Initialize notification processing
   */
  private initializeProcessing(): void {
    this.notificationQueue$.pipe(
      // Throttle to prevent spam
      throttleTime(100),
      // Process notifications
      mergeMap(notification => this.processNotification(notification), 5),
      // Handle errors gracefully
      catchError(error => {
        console.error('Notification processing error:', error);
        return [];
      })
    ).subscribe();
  }

  /**
   * Send notification to all enabled channels
   */
  notify(payload: Omit<NotificationPayload, 'id' | 'timestamp'>): Observable<boolean> {
    const notification: NotificationPayload = {
      ...payload,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.notificationQueue$.next(notification);
    
    return new Observable<boolean>(subscriber => {
      this.processNotification(notification).subscribe({
        next: (success) => {
          subscriber.next(success);
          subscriber.complete();
        },
        error: (error) => {
          subscriber.error(error);
        }
      });
    });
  }

  /**
   * Send crisis alert (high priority)
   */
  sendCrisisAlert(title: string, message: string, data?: any): Observable<boolean> {
    return this.notify({
      type: 'crisis',
      title: `🚨 CRISIS ALERT: ${title}`,
      message,
      data,
      priority: 'high'
    });
  }

  /**
   * Send success notification
   */
  sendSuccess(title: string, message: string, data?: any): Observable<boolean> {
    return this.notify({
      type: 'success',
      title: `✅ ${title}`,
      message,
      data,
      priority: 'medium'
    });
  }

  /**
   * Send warning notification
   */
  sendWarning(title: string, message: string, data?: any): Observable<boolean> {
    return this.notify({
      type: 'warning',
      title: `⚠️ ${title}`,
      message,
      data,
      priority: 'medium'
    });
  }

  /**
   * Send error notification
   */
  sendError(title: string, message: string, data?: any): Observable<boolean> {
    return this.notify({
      type: 'error',
      title: `❌ ${title}`,
      message,
      data,
      priority: 'high'
    });
  }

  /**
   * Add notification channel
   */
  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  /**
   * Get notification statistics
   */
  getStats(): Observable<NotificationStats> {
    return this.stats$.asObservable();
  }

  /**
   * Get active channels
   */
  getChannels(): NotificationChannel[] {
    return this.channels.filter(channel => channel.enabled);
  }

  /**
   * Process single notification
   */
  private processNotification(notification: NotificationPayload): Observable<boolean> {
    const enabledChannels = this.channels.filter(ch => ch.enabled);
    let successCount = 0;
    
    const channelPromises = enabledChannels.map(channel => 
      this.sendToChannel(notification, channel)
        .then(success => {
          if (success) successCount++;
          this.updateChannelStats(channel.id, success);
          return success;
        })
        .catch(() => {
          this.updateChannelStats(channel.id, false);
          return false;
        })
    );

    return new Observable<boolean>(subscriber => {
      Promise.all(channelPromises).then(results => {
        const overallSuccess = results.some(r => r);
        this.updateStats(notification, overallSuccess);
        subscriber.next(overallSuccess);
        subscriber.complete();
      }).catch(error => {
        this.updateStats(notification, false);
        subscriber.error(error);
      });
    });
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(notification: NotificationPayload, channel: NotificationChannel): Promise<boolean> {
    try {
      switch (channel.type) {
        case 'console':
          return this.sendToConsole(notification);
        
        case 'file':
          return this.sendToFile(notification, channel.config?.logPath);
        
        case 'webhook':
          return this.sendToWebhook(notification, channel.endpoint);
        
        case 'email':
          return this.sendToEmail(notification, channel.config);
        
        default:
          console.warn(`Unknown channel type: ${channel.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error sending to channel ${channel.id}:`, error);
      return false;
    }
  }

  /**
   * Send to console
   */
  private sendToConsole(notification: NotificationPayload): Promise<boolean> {
    const timestamp = notification.timestamp.toISOString();
    const prefix = this.getLogPrefix(notification.type);
    
    console.log(`[${timestamp}] ${prefix} ${notification.title}`);
    console.log(`  Message: ${notification.message}`);
    
    if (notification.data) {
      console.log(`  Data:`, notification.data);
    }
    
    return Promise.resolve(true);
  }

  /**
   * Send to file (simplified)
   */
  private sendToFile(notification: NotificationPayload, logPath: string = './logs/notifications.log'): Promise<boolean> {
    // In a real implementation, you would write to file using fs
    console.log(`[FILE LOG] Would write to ${logPath}:`, notification);
    return Promise.resolve(true);
  }

  /**
   * Send to webhook (simplified)
   */
  private sendToWebhook(notification: NotificationPayload, endpoint?: string): Promise<boolean> {
    if (!endpoint) return Promise.resolve(false);
    
    // In a real implementation, you would make HTTP request
    console.log(`[WEBHOOK] Would send to ${endpoint}:`, notification);
    return Promise.resolve(true);
  }

  /**
   * Send to email (simplified)
   */
  private sendToEmail(notification: NotificationPayload, config: any): Promise<boolean> {
    // In a real implementation, you would send email
    console.log(`[EMAIL] Would send email:`, notification);
    return Promise.resolve(true);
  }

  /**
   * Get log prefix for notification type
   */
  private getLogPrefix(type: string): string {
    const prefixes: Record<string, string> = {
      info: 'ℹ️  INFO',
      warning: '⚠️  WARNING',
      error: '❌ ERROR',
      success: '✅ SUCCESS',
      crisis: '🚨 CRISIS'
    };
    return prefixes[type] || 'ℹ️  INFO';
  }

  /**
   * Update notification statistics
   */
  private updateStats(notification: NotificationPayload, success: boolean): void {
    const current = this.stats$.value;
    
    this.stats$.next({
      totalSent: current.totalSent + 1,
      successful: current.successful + (success ? 1 : 0),
      failed: current.failed + (success ? 0 : 1),
      byChannel: current.byChannel,
      byType: {
        ...current.byType,
        [notification.type]: (current.byType[notification.type] || 0) + 1
      }
    });
  }

  /**
   * Update channel statistics
   */
  private updateChannelStats(channelId: string, success: boolean): void {
    const current = this.stats$.value;
    
    this.stats$.next({
      ...current,
      byChannel: {
        ...current.byChannel,
        [channelId]: (current.byChannel[channelId] || 0) + (success ? 1 : 0)
      }
    });
  }

  /**
   * Clean up resources
   */
  shutdown(): void {
    this.notificationQueue$.complete();
    this.stats$.complete();
  }
}

// Export singleton instance
export const notificationSystem = new SimpleNotificationSystem();
