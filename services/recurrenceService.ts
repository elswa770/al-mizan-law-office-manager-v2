import { Appointment } from '../types';

export interface RecurrenceRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  weekOfMonth?: number;
  endDate?: string;
  occurrences?: number;
}

export class RecurrenceService {
  private static instance: RecurrenceService;

  static getInstance(): RecurrenceService {
    if (!RecurrenceService.instance) {
      RecurrenceService.instance = new RecurrenceService();
    }
    return RecurrenceService.instance;
  }

  // Generate recurring appointments
  generateRecurringAppointments(baseAppointment: Appointment): Appointment[] {
    if (!baseAppointment.isRecurring || !baseAppointment.recurrencePattern) {
      return [baseAppointment];
    }

    const appointments: Appointment[] = [];
    const pattern = baseAppointment.recurrencePattern;
    const startDate = new Date(baseAppointment.date);
    
    let currentDate = new Date(startDate);
    let occurrenceCount = 0;
    const maxOccurrences = pattern.occurrences || 1000; // Prevent infinite loops
    const endDate = pattern.endDate ? new Date(pattern.endDate) : null;

    while (occurrenceCount < maxOccurrences && (!endDate || currentDate <= endDate)) {
      // Create appointment instance
      const appointmentInstance: Appointment = {
        ...baseAppointment,
        id: `${baseAppointment.id}-instance-${occurrenceCount}`,
        date: currentDate.toISOString().split('T')[0],
        parentAppointmentId: baseAppointment.id,
        createdAt: new Date().toISOString()
      };

      appointments.push(appointmentInstance);
      occurrenceCount++;

      // Calculate next occurrence
      currentDate = this.getNextOccurrence(currentDate, pattern);
      
      // Break if we've exceeded reasonable limits
      if (occurrenceCount > 365) break; // Max 1 year of occurrences
    }

    return appointments;
  }

  // Calculate next occurrence date
  private getNextOccurrence(currentDate: Date, pattern: RecurrenceRule): Date {
    const nextDate = new Date(currentDate);
    
    switch (pattern.type) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + pattern.interval);
        break;
        
      case 'weekly':
        if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // Find next valid day of week
          let daysToAdd = 1;
          let found = false;
          
          while (!found && daysToAdd <= 7) {
            const testDate = new Date(currentDate);
            testDate.setDate(testDate.getDate() + daysToAdd);
            const dayOfWeek = testDate.getDay();
            
            if (pattern.daysOfWeek.includes(dayOfWeek)) {
              const finalDate = new Date(currentDate);
              finalDate.setDate(finalDate.getDate() + daysToAdd);
              
              // Add interval weeks after finding next valid day
              if (found && pattern.interval > 1) {
                finalDate.setDate(finalDate.getDate() + (pattern.interval - 1) * 7);
              }
              return finalDate;
            } else {
              daysToAdd++;
            }
          }
          
          // If no day found, add a week and try again
          nextDate.setDate(nextDate.getDate() + 7);
        } else {
          nextDate.setDate(nextDate.getDate() + (pattern.interval * 7));
        }
        break;
        
      case 'monthly':
        if (pattern.dayOfMonth) {
          // Specific day of month
          nextDate.setMonth(nextDate.getMonth() + pattern.interval);
          nextDate.setDate(Math.min(pattern.dayOfMonth, this.getDaysInMonth(nextDate.getFullYear(), nextDate.getMonth())));
        } else if (pattern.weekOfMonth && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
          // Nth weekday of month (e.g., "second Tuesday")
          nextDate.setMonth(nextDate.getMonth() + pattern.interval);
          const targetDayOfWeek = pattern.daysOfWeek[0];
          const newDate = this.getNthWeekdayOfMonth(nextDate.getFullYear(), nextDate.getMonth(), pattern.weekOfMonth, targetDayOfWeek);
          nextDate.setTime(newDate.getTime());
        } else {
          // Same day of month as original
          nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        }
        break;
        
      case 'yearly':
        nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
        break;
    }
    
    return nextDate;
  }

  // Get days in month
  private getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  // Get Nth weekday of month
  private getNthWeekdayOfMonth(year: number, month: number, weekOfMonth: number, dayOfWeek: number): Date {
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();
    
    // Calculate first occurrence of the target weekday
    let daysToAdd = (dayOfWeek - firstDayOfWeek + 7) % 7;
    const firstOccurrence = new Date(year, month, 1 + daysToAdd);
    
    // Add (weekOfMonth - 1) weeks
    const targetDate = new Date(firstOccurrence);
    targetDate.setDate(targetDate.getDate() + (weekOfMonth - 1) * 7);
    
    return targetDate;
  }

  // Update recurring appointment series
  updateRecurringSeries(appointment: Appointment, updates: Partial<Appointment>): Appointment[] {
    if (!appointment.parentAppointmentId) {
      // This is the master appointment - update all instances
      const updatedBaseAppointment = { ...appointment, ...updates };
      return this.generateRecurringAppointments(updatedBaseAppointment);
    } else {
      // This is an instance - create exception
      const exceptionAppointment = { ...appointment, ...updates, isException: true };
      return [exceptionAppointment];
    }
  }

  // Delete recurring appointment series
  deleteRecurringSeries(appointment: Appointment, deleteType: 'this' | 'following' | 'all'): string[] {
    const deletedIds: string[] = [];
    
    if (appointment.parentAppointmentId) {
      // This is an instance
      if (deleteType === 'this') {
        deletedIds.push(appointment.id);
      } else if (deleteType === 'following') {
        // Delete this and all following instances
        deletedIds.push(appointment.id);
        // TODO: Implement logic to find and delete following instances
      }
    } else {
      // This is the master appointment
      if (deleteType === 'all') {
        deletedIds.push(appointment.id);
        // TODO: Implement logic to delete all instances
      }
    }
    
    return deletedIds;
  }

  // Check if date matches recurrence pattern
  matchesPattern(date: Date, pattern: RecurrenceRule, startDate: Date): boolean {
    const testDate = new Date(date);
    const start = new Date(startDate);
    
    if (testDate < start) return false;
    
    switch (pattern.type) {
      case 'daily':
        return this.matchesDailyPattern(testDate, start, pattern.interval);
        
      case 'weekly':
        return this.matchesWeeklyPattern(testDate, start, pattern);
        
      case 'monthly':
        return this.matchesMonthlyPattern(testDate, start, pattern);
        
      case 'yearly':
        return this.matchesYearlyPattern(testDate, start, pattern.interval);
        
      default:
        return false;
    }
  }

  private matchesDailyPattern(date: Date, startDate: Date, interval: number): boolean {
    const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff % interval === 0;
  }

  private matchesWeeklyPattern(date: Date, startDate: Date, pattern: RecurrenceRule): boolean {
    if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
      const weeksDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff % pattern.interval === 0;
    }
    
    const dayOfWeek = date.getDay();
    if (!pattern.daysOfWeek.includes(dayOfWeek)) return false;
    
    const weeksDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return weeksDiff % pattern.interval === 0;
  }

  private matchesMonthlyPattern(date: Date, startDate: Date, pattern: RecurrenceRule): boolean {
    const monthsDiff = (date.getFullYear() - startDate.getFullYear()) * 12 + (date.getMonth() - startDate.getMonth());
    if (monthsDiff % pattern.interval !== 0) return false;
    
    if (pattern.dayOfMonth) {
      return date.getDate() === pattern.dayOfMonth;
    } else if (pattern.weekOfMonth && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
      const targetDayOfWeek = pattern.daysOfWeek[0];
      if (date.getDay() !== targetDayOfWeek) return false;
      
      const weekOfMonth = Math.ceil(date.getDate() / 7);
      return weekOfMonth === pattern.weekOfMonth;
    }
    
    return true;
  }

  private matchesYearlyPattern(date: Date, startDate: Date, interval: number): boolean {
    const yearsDiff = date.getFullYear() - startDate.getFullYear();
    return yearsDiff % interval === 0 && 
           date.getMonth() === startDate.getMonth() && 
           date.getDate() === startDate.getDate();
  }

  // Get next occurrence after a specific date
  getNextOccurrenceAfter(date: Date, pattern: RecurrenceRule): Date | null {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1); // Start checking from tomorrow
    
    let attempts = 0;
    const maxAttempts = 365; // Check up to a year ahead
    
    while (attempts < maxAttempts) {
      if (this.matchesPattern(nextDate, pattern, date)) {
        return nextDate;
      }
      nextDate.setDate(nextDate.getDate() + 1);
      attempts++;
    }
    
    return null;
  }
}

export default RecurrenceService.getInstance();
