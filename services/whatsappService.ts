// WhatsApp Notification Service
// Handles sending WhatsApp notifications through Twilio API

import { db } from '../services/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Client, Hearing, Task } from '../types';

interface NotificationSettings {
  whatsappEnabled: boolean;
  whatsappApiKey: string;
  whatsappPhoneNumber: string;
  whatsappTemplate: string;
  sessionReminders: boolean;
  sessionReminderHours: number;
  taskReminders: boolean;
  taskReminderHours: number;
  backupNotifications: boolean;
}

class WhatsAppNotificationService {
  private settings: NotificationSettings | null = null;

  // Load notification settings from Firebase
  async loadSettings(): Promise<void> {
    try {
      const docRef = doc(db, 'settings', 'notifications');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.settings = docSnap.data() as NotificationSettings;
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  }

  // Get client WhatsApp number
  private async getClientWhatsAppNumber(clientId: string): Promise<string | null> {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      
      if (clientSnap.exists()) {
        const client = clientSnap.data() as Client;
        
        // Priority 1: Client's WhatsApp number
        if (client.whatsapp) {
          return client.whatsapp;
        }
        
        // Priority 2: Client's preferred contact is WhatsApp
        if (client.preferredContact === 'whatsapp' && client.phone) {
          return client.phone;
        }
        
        // Priority 3: Client has WhatsApp notifications enabled
        if (client.notifications?.whatsapp && client.phone) {
          return client.phone;
        }
        
        // Priority 4: Default to phone number
        return client.phone || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting client WhatsApp number:', error);
      return null;
    }
  }

  // Send WhatsApp message
  private async sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
    if (!this.settings?.whatsappEnabled || !this.settings?.whatsappApiKey) {
      return false;
    }

    try {
      // In production, this would be the actual Twilio API call
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Actual implementation would be:
      /*
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.settings.whatsappApiKey}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${this.settings.whatsappApiKey}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'To': `whatsapp:${to}`,
          'From': `whatsapp:${this.settings.whatsappPhoneNumber}`,
          'Body': message
        })
      });
      
      return response.ok;
      */
      
      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return false;
    }
  }

  // Send session reminder
  async sendSessionReminder(hearing: Hearing, caseTitle: string, clientName: string): Promise<void> {
    if (!this.settings?.sessionReminders) {
      return;
    }

    const clientWhatsApp = await this.getClientWhatsAppNumber(hearing.caseId);
    if (!clientWhatsApp) {
      return;
    }

    // Check if client notifications are enabled for this hearing
    if (hearing.clientNotifications?.whatsapp === false) {
      return;
    }

    const message = this.settings.whatsappTemplate === 'ar' ? 
      `🔔 *تذكير جلسة*\n\n📋 القضية: ${caseTitle}\n👤 العميل: ${clientName}\n📅 التاريخ: ${hearing.date}\n⏰ الوقت: ${hearing.time || 'غير محدد'}\n📍 المحكمة: غير محدد\n\nيرجى الحضور في الوقت المحدد` :
      `🔔 *Session Reminder*\n\n📋 Case: ${caseTitle}\n👤 Client: ${clientName}\n📅 Date: ${hearing.date}\n⏰ Time: ${hearing.time || 'Not specified'}\n📍 Court: Not specified\n\nPlease attend on time`;

    await this.sendWhatsAppMessage(clientWhatsApp, message);
  }

  // Send task reminder
  async sendTaskReminder(task: Task, caseTitle: string, clientName: string): Promise<void> {
    if (!this.settings?.taskReminders) {
      return;
    }

    const clientWhatsApp = await this.getClientWhatsAppNumber(task.relatedCaseId || '');
    if (!clientWhatsApp) {
      console.log(`No WhatsApp number found for task ${task.id}`);
      return;
    }

    // Check if client notifications are enabled for this task
    if (task.clientNotifications?.whatsapp === false) {
      return;
    }

    const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
    
    const message = this.settings.whatsappTemplate === 'ar' ? 
      `📝 *تذكير مهمة*\n\n${priorityEmoji} المهمة: ${task.title}\n📋 القضية: ${caseTitle}\n👤 العميل: ${clientName}\n⏰ الموعد النهائي: ${task.dueDate}\n🎯 الأولوية: ${task.priority}\n\nيرجى إنجاز المهمة في الوقت المحدد` :
      `📝 *Task Reminder*\n\n${priorityEmoji} Task: ${task.title}\n📋 Case: ${caseTitle}\n👤 Client: ${clientName}\n⏰ Due Date: ${task.dueDate}\n🎯 Priority: ${task.priority}\n\nPlease complete the task on time`;

    await this.sendWhatsAppMessage(clientWhatsApp, message);
  }

  // Send overdue task notification
  async sendOverdueTaskNotification(task: Task, caseTitle: string, clientName: string): Promise<void> {
    if (!this.settings?.taskReminders) {
      return;
    }

    const clientWhatsApp = await this.getClientWhatsAppNumber(task.relatedCaseId || '');
    if (!clientWhatsApp) {
      console.log(`No WhatsApp number found for task ${task.id}`);
      return;
    }

    // Check if client notifications are enabled for this task
    if (task.clientNotifications?.whatsapp === false) {
      return;
    }

    const message = this.settings.whatsappTemplate === 'ar' ? 
      `⚠️ *مهمة متأخرة*\n\n🔴 المهمة: ${task.title}\n📋 القضية: ${caseTitle}\n👤 العميل: ${clientName}\n⏰ الموعد النهائي: ${task.dueDate}\n📅 اليوم: ${new Date().toLocaleDateString('ar-SA')}\n\nالمهمة متأخرة! يرجى إنجازها فوراً` :
      `⚠️ *Overdue Task*\n\n🔴 Task: ${task.title}\n📋 Case: ${caseTitle}\n👤 Client: ${clientName}\n⏰ Due Date: ${task.dueDate}\n📅 Today: ${new Date().toLocaleDateString()}\n\nTask is overdue! Please complete it immediately`;

    await this.sendWhatsAppMessage(clientWhatsApp, message);
  }

  // Send system notification
  async sendSystemNotification(message: string, targetWhatsApp?: string): Promise<void> {
    if (!this.settings?.whatsappEnabled) {
      return;
    }

    const toNumber = targetWhatsApp || '+966500000000'; // Default admin number
    
    const formattedMessage = this.settings.whatsappTemplate === 'ar' ? 
      `🔔 *تنبيه النظام*\n\n${message}` :
      `🔔 *System Notification*\n\n${message}`;

    await this.sendWhatsAppMessage(toNumber, formattedMessage);
  }

  // Send backup notification
  async sendBackupNotification(status: 'success' | 'failed', details?: string): Promise<void> {
    if (!this.settings?.backupNotifications) {
      return;
    }

    const statusEmoji = status === 'success' ? '✅' : '❌';
    const statusText = status === 'success' ? 'نجح' : 'فشل';
    
    const message = this.settings.whatsappTemplate === 'ar' ? 
      `${statusEmoji} *نسخ احتياطي*\n\nالحالة: ${statusText}\n${details ? `التفاصيل: ${details}` : ''}\n📅 التاريخ: ${new Date().toLocaleDateString('ar-SA')}` :
      `${statusEmoji} *Backup*\n\nStatus: ${status}\n${details ? `Details: ${details}` : ''}\n📅 Date: ${new Date().toLocaleDateString()}`;

    await this.sendSystemNotification(message);
  }
}

export const whatsappService = new WhatsAppNotificationService();
