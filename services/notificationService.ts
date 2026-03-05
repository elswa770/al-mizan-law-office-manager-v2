import { Appointment } from '../types';

export interface NotificationSettings {
  enabled: boolean;
  reminderMinutes: number[];
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  desktopNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface ScheduledNotification {
  id: string;
  appointmentId: string;
  title: string;
  message: string;
  scheduledTime: Date;
  reminderMinutes: number;
  type: 'reminder' | 'start' | 'end';
  isSent: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private notifications: Map<string, ScheduledNotification> = new Map();
  private settings: NotificationSettings = {
    enabled: true,
    reminderMinutes: [15, 30, 60], // 15, 30, 60 minutes before
    soundEnabled: true,
    vibrationEnabled: true,
    desktopNotifications: true,
    emailNotifications: false,
    smsNotifications: false
  };

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if ('Notification' in window) {
      try {
        // Check if permission is already granted
        if (Notification.permission === 'granted') {
          return true;
        }
        
        // Check if permission is denied
        if (Notification.permission === 'denied') {
          console.log('🔔 Notification permission denied by user');
          return false;
        }
        
        // Request permission
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return false;
  }

  // Schedule notifications for an appointment
  scheduleNotifications(appointment: Appointment): void {
    if (!this.settings.enabled) return;

    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`);
    
    // Schedule reminders
    this.settings.reminderMinutes.forEach(minutes => {
      const reminderTime = new Date(appointmentDateTime.getTime() - minutes * 60 * 1000);
      
      if (reminderTime > new Date()) {
        const notification: ScheduledNotification = {
          id: `${appointment.id}-reminder-${minutes}`,
          appointmentId: appointment.id,
          title: `تذكير: ${appointment.title}`,
          message: `موعدك "${appointment.title}" سيبدأ خلال ${minutes} دقيقة`,
          scheduledTime: reminderTime,
          reminderMinutes: minutes,
          type: 'reminder',
          isSent: false
        };
        
        this.notifications.set(notification.id, notification);
        this.scheduleNotification(notification);
      }
    });

    // Schedule start notification
    const startNotification: ScheduledNotification = {
      id: `${appointment.id}-start`,
      appointmentId: appointment.id,
      title: `بدء الموعد: ${appointment.title}`,
      message: `موعدك "${appointment.title}" قد بدأ الآن`,
      scheduledTime: appointmentDateTime,
      reminderMinutes: 0,
      type: 'start',
      isSent: false
    };
    
    this.notifications.set(startNotification.id, startNotification);
    this.scheduleNotification(startNotification);

    // Schedule end notification
    const endDateTime = new Date(`${appointment.date}T${appointment.endTime}`);
    const endNotification: ScheduledNotification = {
      id: `${appointment.id}-end`,
      appointmentId: appointment.id,
      title: `انتهاء الموعد: ${appointment.title}`,
      message: `موعدك "${appointment.title}" قد انتهى`,
      scheduledTime: endDateTime,
      reminderMinutes: 0,
      type: 'end',
      isSent: false
    };
    
    this.notifications.set(endNotification.id, endNotification);
    this.scheduleNotification(endNotification);
  }

  // Schedule a single notification
  private scheduleNotification(notification: ScheduledNotification): void {
    const delay = notification.scheduledTime.getTime() - Date.now();
    
    if (delay <= 0) return;

    setTimeout(() => {
      this.sendNotification(notification);
    }, delay);
  }

  // Send notification
  private async sendNotification(notification: ScheduledNotification): Promise<void> {
    if (notification.isSent) return;

    // Desktop notification
    if (this.settings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const desktopNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.appointmentId,
          requireInteraction: notification.type === 'start'
        });

        desktopNotification.onclick = () => {
          // Navigate to appointment details
          window.dispatchEvent(new CustomEvent('notification-click', {
            detail: { appointmentId: notification.appointmentId }
          }));
          desktopNotification.close();
        };

        // Auto-close after 10 seconds for reminders
        if (notification.type === 'reminder') {
          setTimeout(() => desktopNotification.close(), 10000);
        }
      } catch (error) {
        console.error('Error showing desktop notification:', error);
      }
    }

    // Sound notification
    if (this.settings.soundEnabled) {
      this.playNotificationSound();
    }

    // Vibration
    if (this.settings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // In-app notification
    this.showInAppNotification(notification);

    // Mark as sent
    notification.isSent = true;
    this.notifications.set(notification.id, notification);
  }

  // Play notification sound
  private playNotificationSound(): void {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(error => {
        console.log('Could not play notification sound:', error);
      });
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  }

  // Show in-app notification
  private showInAppNotification(notification: ScheduledNotification): void {
    // Dispatch custom event for in-app notifications
    window.dispatchEvent(new CustomEvent('in-app-notification', {
      detail: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        appointmentId: notification.appointmentId,
        timestamp: new Date().toISOString()
      }
    }));
  }

  // Cancel notifications for an appointment
  cancelNotifications(appointmentId: string): void {
    const notificationsToRemove = Array.from(this.notifications.entries())
      .filter(([_, notification]) => notification.appointmentId === appointmentId);

    notificationsToRemove.forEach(([id, _]) => {
      this.notifications.delete(id);
    });
  }

  // Update notification settings
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // Get notification settings
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  // Save settings to localStorage
  private saveSettings(): void {
    localStorage.setItem('notification-settings', JSON.stringify(this.settings));
  }

  // Load settings from localStorage
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('notification-settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  // Get scheduled notifications
  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.notifications.values());
  }

  // Test notification
  async testNotification(): Promise<void> {
    const testNotification: ScheduledNotification = {
      id: 'test-notification',
      appointmentId: 'test',
      title: 'اختبار الإشعار',
      message: 'هذا إشعار اختباري للتحقق من عمل الإشعارات',
      scheduledTime: new Date(),
      reminderMinutes: 0,
      type: 'reminder',
      isSent: false
    };

    await this.sendNotification(testNotification);
  }

  constructor() {
    this.loadSettings();
    this.requestPermission();
  }
}

export default NotificationService.getInstance();
