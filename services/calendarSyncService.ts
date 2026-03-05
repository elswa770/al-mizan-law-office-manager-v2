// Calendar Sync Service
export interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'apple';
  isConnected: boolean;
  lastSync?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface SyncedEvent {
  id: string;
  calendarId: string;
  externalId: string;
  appointmentId: string;
  lastSynced: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

export class CalendarSyncService {
  private static instance: CalendarSyncService;
  private providers: Map<string, CalendarProvider> = new Map();

  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  // Connect to Google Calendar
  async connectGoogleCalendar(): Promise<CalendarProvider> {
    try {
      // OAuth 2.0 flow for Google
      const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const params = new URLSearchParams({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
        redirect_uri: `${window.location.origin}/auth/google/callback`,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar',
        access_type: 'offline',
        prompt: 'consent'
      });

      // Open popup for OAuth
      const popup = window.open(`${authUrl}?${params}`, 'google-auth', 'width=500,height=600');
      
      return new Promise((resolve, reject) => {
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            reject(new Error('Authentication cancelled'));
          }
        }, 1000);

        // Listen for message from popup
        window.addEventListener('message', (event) => {
          if (event.origin === window.location.origin) {
            clearInterval(checkPopup);
            popup?.close();
            
            if (event.data.type === 'google-auth-success') {
              const provider: CalendarProvider = {
                id: 'google-calendar',
                name: 'Google Calendar',
                type: 'google',
                isConnected: true,
                accessToken: event.data.accessToken,
                refreshToken: event.data.refreshToken,
                lastSync: new Date().toISOString()
              };
              
              this.providers.set('google-calendar', provider);
              resolve(provider);
            } else {
              reject(new Error(event.data.error || 'Authentication failed'));
            }
          }
        });
      });
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      throw error;
    }
  }

  // Connect to Outlook Calendar
  async connectOutlookCalendar(): Promise<CalendarProvider> {
    try {
      // OAuth 2.0 flow for Microsoft
      const authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
      const params = new URLSearchParams({
        client_id: process.env.REACT_APP_OUTLOOK_CLIENT_ID || '',
        redirect_uri: `${window.location.origin}/auth/outlook/callback`,
        response_type: 'code',
        scope: 'https://graph.microsoft.com/Calendars.ReadWrite',
        response_mode: 'query'
      });

      const popup = window.open(`${authUrl}?${params}`, 'outlook-auth', 'width=500,height=600');
      
      return new Promise((resolve, reject) => {
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            reject(new Error('Authentication cancelled'));
          }
        }, 1000);

        window.addEventListener('message', (event) => {
          if (event.origin === window.location.origin) {
            clearInterval(checkPopup);
            popup?.close();
            
            if (event.data.type === 'outlook-auth-success') {
              const provider: CalendarProvider = {
                id: 'outlook-calendar',
                name: 'Outlook Calendar',
                type: 'outlook',
                isConnected: true,
                accessToken: event.data.accessToken,
                refreshToken: event.data.refreshToken,
                lastSync: new Date().toISOString()
              };
              
              this.providers.set('outlook-calendar', provider);
              resolve(provider);
            } else {
              reject(new Error(event.data.error || 'Authentication failed'));
            }
          }
        });
      });
    } catch (error) {
      console.error('Error connecting to Outlook Calendar:', error);
      throw error;
    }
  }

  // Sync appointment to Google Calendar
  async syncToGoogleCalendar(appointment: any, provider: CalendarProvider): Promise<string> {
    try {
      const event = {
        summary: appointment.title,
        description: appointment.description,
        start: {
          dateTime: `${appointment.date}T${appointment.startTime}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: `${appointment.date}T${appointment.endTime}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: appointment.location,
        attendees: appointment.attendees?.map((email: string) => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: appointment.reminderMinutes ? [
            { method: 'email', minutes: appointment.reminderMinutes },
            { method: 'popup', minutes: appointment.reminderMinutes }
          ] : []
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
      throw error;
    }
  }

  // Sync appointment to Outlook Calendar
  async syncToOutlookCalendar(appointment: any, provider: CalendarProvider): Promise<string> {
    try {
      const event = {
        subject: appointment.title,
        body: {
          contentType: 'HTML',
          content: appointment.description || ''
        },
        start: {
          dateTime: `${appointment.date}T${appointment.startTime}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: `${appointment.date}T${appointment.endTime}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        location: {
          displayName: appointment.location || ''
        },
        attendees: appointment.attendees?.map((email: string) => ({
          emailAddress: { address: email }
        })) || []
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Outlook Calendar API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Error syncing to Outlook Calendar:', error);
      throw error;
    }
  }

  // Get connected providers
  getConnectedProviders(): CalendarProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isConnected);
  }

  // Disconnect provider
  async disconnectProvider(providerId: string): Promise<void> {
    this.providers.delete(providerId);
    // TODO: Revoke tokens if needed
  }

  // Sync all appointments
  async syncAllAppointments(appointments: any[]): Promise<void> {
    const providers = this.getConnectedProviders();
    
    for (const provider of providers) {
      for (const appointment of appointments) {
        try {
          if (provider.type === 'google') {
            await this.syncToGoogleCalendar(appointment, provider);
          } else if (provider.type === 'outlook') {
            await this.syncToOutlookCalendar(appointment, provider);
          }
        } catch (error) {
          console.error(`Failed to sync appointment ${appointment.id} to ${provider.name}:`, error);
        }
      }
    }
  }
}

export default CalendarSyncService.getInstance();
