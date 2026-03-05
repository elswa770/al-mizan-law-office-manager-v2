import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, MapPin, Users, Video, Phone, Building2, 
  AlertCircle, Plus, Search, Filter, Edit3, Trash2, Bell,
  Wifi, WifiOff, User, FileText, CheckCircle, XCircle, Timer,
  TrendingUp, BarChart3, Activity, Settings, Download, Upload,
  List, Tag, Target
} from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { offlineManager } from '../services/offlineManager';
import { Appointment } from '../types';
import MonthlyCalendar from '../components/MonthlyCalendar';
import notificationService from '../services/notificationService';
import calendarSyncService from '../services/calendarSyncService';
import RecurrenceManager from '../components/RecurrenceManager';

// --- Types ---
export interface AppointmentStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

interface AppointmentsProps {
  appointments: Appointment[];
  cases: any[];
  clients: any[];
  users: any[];
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
  onCaseClick?: (caseId: string) => void;
  readOnly?: boolean;
  forceUpdate?: number;
  refreshKey?: number;
}

const Appointments: React.FC<AppointmentsProps> = ({
  appointments,
  cases,
  clients,
  users,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onCaseClick,
  readOnly = false,
  forceUpdate = 0,
  refreshKey = 0
}) => {
  // --- Offline Status ---
  const offlineStatus = useOfflineStatus();
  const isOnline = offlineStatus?.online ?? true;
  const pendingCount = offlineStatus?.pendingActions ?? 0;

  // --- State ---
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'stats'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Initialize with today's date
  const today = new Date();
  // Use local date instead of UTC to avoid timezone issues
  const todayString = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
  
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedDateString, setSelectedDateString] = useState(todayString);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [expandedWeekDay, setExpandedWeekDay] = useState<number | null>(null);
  
  // Debug log for initial date
  console.log('📅 Initial Date Setup - Today:', todayString, 'Selected Date:', selectedDateString, 'Local Date:', today.toLocaleDateString('ar-SA'));
  const [formData, setFormData] = useState<Partial<Appointment>>({
    title: '',
    description: '',
    date: todayString,
    startTime: '09:00',
    endTime: '10:00',
    type: 'meeting',
    priority: 'medium',
    status: 'scheduled',
    location: '',
    relatedClientId: '',
    relatedCaseId: '',
    attendees: [],
    reminderMinutes: 15,
    notes: '',
    tags: [],
    estimatedDuration: 60,
    attachments: []
  });

  // --- Filtering ---
  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter(appointment => {
      const matchesSearch = appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            appointment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            appointment.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || appointment.type === filterType;
      const matchesStatus = filterStatus === 'all' || appointment.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
    
    // Debug logs
    console.log('🔍 Debug - Appointments:', appointments);
    console.log('🔍 Debug - Selected Date String:', selectedDateString);
    console.log('🔍 Debug - Selected Date:', selectedDate);
    console.log('🔍 Debug - Filtered Appointments:', filtered);
    console.log('🔍 Debug - Today Appointments:', filtered.filter(a => a.date === selectedDateString));
    
    return filtered;
  }, [appointments, searchTerm, filterType, filterStatus, forceUpdate, refreshKey, selectedDateString]);

  // --- Stats ---
  const stats = useMemo((): AppointmentStats => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const total = appointments.length;
    const todayCount = appointments.filter(a => a.date === today).length;
    const thisWeekCount = appointments.filter(a => {
      const date = new Date(a.date);
      return date >= weekStart && date <= weekEnd;
    }).length;
    const thisMonthCount = appointments.filter(a => {
      const date = new Date(a.date);
      return date >= monthStart && date <= monthEnd;
    }).length;
    const upcomingCount = appointments.filter(a => 
      a.status === 'scheduled' && new Date(a.date + ' ' + a.startTime) > now
    ).length;
    const completedCount = appointments.filter(a => a.status === 'completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

    const byType = appointments.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = appointments.reduce((acc, a) => {
      acc[a.priority] = (acc[a.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      upcoming: upcomingCount,
      completed: completedCount,
      cancelled: cancelledCount,
      byType,
      byPriority
    };
  }, [appointments]);

  // --- Notifications Effect ---
  useEffect(() => {
    // Schedule notifications for all appointments
    appointments.forEach(appointment => {
      notificationService.scheduleNotifications(appointment);
    });

    // Listen for notification clicks
    const handleNotificationClick = (event: CustomEvent) => {
      const { appointmentId } = event.detail;
      const appointment = appointments.find(a => a.id === appointmentId);
      if (appointment) {
        handleOpenModal(appointment);
      }
    };

    window.addEventListener('notification-click', handleNotificationClick as EventListener);
    window.addEventListener('in-app-notification', handleNotificationClick as EventListener);

    return () => {
      window.removeEventListener('notification-click', handleNotificationClick as EventListener);
      window.removeEventListener('in-app-notification', handleNotificationClick as EventListener);
    };
  }, [appointments]);

  // --- Handlers ---
  const handleOpenModal = (appointment?: Appointment) => {
    if (appointment) {
      setEditingAppointment(appointment);
      setFormData({ ...appointment });
    } else {
      setEditingAppointment(null);
      setFormData({
        title: '',
        description: '',
        date: selectedDate.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled',
        location: '',
        onlineMeetingUrl: '',
        phoneNumber: '',
        attendees: [],
        relatedCaseId: '',
        relatedClientId: '',
        reminderMinutes: 15,
        notes: '',
        tags: [],
        estimatedDuration: 60,
        attachments: []
      });
    }
    setIsModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(date);
    setSelectedDateString(dateString);
    
    // Open modal for new appointment on the selected date
    handleOpenModal();
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    handleOpenModal(appointment);
  };

  // Test notification handler
  const handleTestNotification = async () => {
    try {
      // Request permission if not granted
      const hasPermission = await notificationService.requestPermission();
      
      if (!hasPermission) {
        alert('يرجى السماح بالإشعارات من إعدادات المتصفح');
        return;
      }

      // Send test notification
      await notificationService.testNotification();
      
    } catch (error) {
      console.error('Test notification error:', error);
      alert('فشل إرسال الإشعار: ' + (error as Error).message);
    }
  };

  // Calendar sync handler
  const handleSyncCalendars = async () => {
    try {
      const providers = calendarSyncService.getConnectedProviders();
      
      if (providers.length === 0) {
        // Show connect calendar modal or message
        alert('يرجى ربط حساب تقويم خارجي أولاً (Google Calendar أو Outlook)');
        return;
      }

      // Show loading state
      const syncButton = document.querySelector('[title="مزامنة مع التقويم الخارجي"]') as HTMLButtonElement;
      if (syncButton) {
        syncButton.disabled = true;
        syncButton.innerHTML = '<div class="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div> جاري المزامنة...';
      }

      await calendarSyncService.syncAllAppointments(appointments);
      
      // Show success message
      alert('تمت مزامنة المواعيد بنجاح!');
      
    } catch (error) {
      console.error('Calendar sync error:', error);
      alert('فشلت المزامنة: ' + (error as Error).message);
    } finally {
      // Reset button state
      const syncButton = document.querySelector('[title="مزامنة مع التقويم الخارجي"]') as HTMLButtonElement;
      if (syncButton) {
        syncButton.disabled = false;
        syncButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg> مزامنة التقويم';
      }
    }
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      const appointmentData = {
        ...formData,
        id: editingAppointment?.id || Math.random().toString(36).substring(2, 9),
        createdAt: editingAppointment?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Appointment;

      // Always update local state immediately for better UX
      if (editingAppointment) {
        onUpdateAppointment(appointmentData);
      } else {
        onAddAppointment(appointmentData);
        
        // Auto-select the date of the new appointment if it's today
        const today = new Date().toISOString().split('T')[0];
        if (appointmentData.date === today) {
          setSelectedDateString(today);
          setSelectedDate(new Date(today));
        }
      }

      // Then handle online/offline logic
      if (isOnline) {
        // Online: Already handled above
        console.log('✅ Appointment saved online');
      } else {
        // Offline: Add to pending actions
        await offlineManager.addPendingAction({
          type: editingAppointment ? 'update' : 'create',
          entity: 'appointment',
          data: appointmentData
        });
        console.log('📱 Appointment saved offline');
      }

      // Close modal
      setIsModalOpen(false);
      
      // Reset form
      setEditingAppointment(null);
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        type: 'meeting',
        priority: 'medium',
        status: 'scheduled'
      });
      
      // Show success message
      const action = editingAppointment ? 'تعديل' : 'إضافة';
      alert(`✅ تم ${action} الموعد بنجاح!`);
      
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('حدث خطأ أثناء حفظ الموعد');
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;

    try {
      if (isOnline) {
        onDeleteAppointment(appointmentId);
      } else {
        await offlineManager.addPendingAction({
          type: 'delete',
          entity: 'appointment',
          data: { id: appointmentId }
        });
        
        // Update local state immediately
        onDeleteAppointment(appointmentId);
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('حدث خطأ أثناء حذف الموعد');
    }
  };

  const handleChangeStatus = async (appointmentId: string, newStatus: Appointment['status']) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    try {
      const updatedAppointment = {
        ...appointment,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
      };

      if (isOnline) {
        onUpdateAppointment(updatedAppointment);
      } else {
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'appointment',
          data: updatedAppointment
        });
        
        // Update local state immediately
        onUpdateAppointment(updatedAppointment);
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  // --- Auto-update selected date when view changes ---
  useEffect(() => {
    if (calendarView === 'day') {
      // Always use today's date for day view
      const today = new Date();
      // Use local date instead of UTC to avoid timezone issues
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      setSelectedDate(today);
      setSelectedDateString(todayString);
      console.log('📅 Auto-updated to today for day view:', todayString, 'Local Date:', today.toLocaleDateString('ar-SA'));
    } else if (calendarView === 'month') {
      // Always use today's date for month view
      const today = new Date();
      // Use local date instead of UTC to avoid timezone issues
      const todayString = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      setSelectedDate(today);
      setSelectedDateString(todayString);
      console.log('📅 Auto-updated to today for month view:', todayString, 'Local Date:', today.toLocaleDateString('ar-SA'));
    }
  }, [calendarView]);
  const getTypeIcon = (type: Appointment['type']) => {
    switch (type) {
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'court': return <Building2 className="w-4 h-4" />;
      case 'client': return <User className="w-4 h-4" />;
      case 'video_call': return <Video className="w-4 h-4" />;
      case 'phone_call': return <Phone className="w-4 h-4" />;
      case 'internal': return <FileText className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: Appointment['type']) => {
    switch (type) {
      case 'meeting': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'court': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'client': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'video_call': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'phone_call': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'internal': return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'in_progress': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'postponed': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: Appointment['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  const getUserName = (userId?: string) => {
    if (!userId) return 'غير محدد';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'مستخدم محذوف';
  };

  const getCaseName = (caseId?: string) => {
    if (!caseId) return null;
    const case_ = cases.find(c => c.id === caseId);
    return case_ ? case_.title : null;
  };

  const getClientName = (clientId?: string) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : null;
  };

  // --- Render Functions ---
  const renderAppointmentCard = (appointment: Appointment) => (
    <div key={appointment.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getPriorityColor(appointment.priority)}`}>
            {appointment.priority === 'high' ? 'عاجل' : appointment.priority === 'medium' ? 'متوسط' : 'عادي'}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded ${getTypeColor(appointment.type)}`}>
            {appointment.type === 'meeting' ? 'اجتماع' : 
             appointment.type === 'court' ? 'محكمة' :
             appointment.type === 'client' ? 'موكل' :
             appointment.type === 'video_call' ? 'مكالمة فيديو' :
             appointment.type === 'phone_call' ? 'مكالمة هاتفية' :
             appointment.type === 'internal' ? 'داخلي' : 'أخرى'}
          </span>
        </div>
        
        {!readOnly && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button onClick={() => handleOpenModal(appointment)} className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDeleteAppointment(appointment.id)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      
      {/* Title and Description */}
      <h4 className="font-bold text-slate-800 dark:text-white mb-2">{appointment.title}</h4>
      {appointment.description && (
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{appointment.description}</p>
      )}
      
      {/* Tags */}
      {appointment.tags && appointment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {appointment.tags.map((tag, index) => (
            <span key={index} className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Appointment Details */}
      <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3 h-3" />
          <span>{appointment.date}</span>
          <Clock className="w-3 h-3 ml-2" />
          <span>{appointment.startTime} - {appointment.endTime}</span>
        </div>
        
        {appointment.location && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3 h-3" />
            <span>{appointment.location}</span>
          </div>
        )}
        
        {appointment.onlineMeetingUrl && (
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
            <Video className="w-3 h-3" />
            <a href={appointment.onlineMeetingUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
              رابط الاجتماع
            </a>
          </div>
        )}
        
        {appointment.phoneNumber && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Phone className="w-3 h-3" />
            <span>{appointment.phoneNumber}</span>
          </div>
        )}
        
        {/* Related Entities */}
        <div className="flex flex-wrap gap-2 mt-2">
          {appointment.relatedCaseId && (
            <div className="text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
              القضية: {getCaseName(appointment.relatedCaseId)}
            </div>
          )}
          {appointment.relatedClientId && (
            <div className="text-xs text-green-600 dark:text-green-400">
              الموكل: {getClientName(appointment.relatedClientId)}
            </div>
          )}
        </div>
        
        {/* Attendees */}
        {appointment.attendees && appointment.attendees.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Users className="w-3 h-3" />
            <span>{appointment.attendees.map(getUserName).join(', ')}</span>
          </div>
        )}
      </div>
      
      {/* Status and Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
        <span className={`text-[10px] px-2 py-0.5 rounded ${getStatusColor(appointment.status)}`}>
          {appointment.status === 'scheduled' ? 'مجدول' :
           appointment.status === 'in_progress' ? 'قيد التنفيذ' :
           appointment.status === 'completed' ? 'منجز' :
           appointment.status === 'cancelled' ? 'ملغي' : 'مؤجل'}
        </span>
        
        {!readOnly && (
          <select 
            className="text-[10px] bg-transparent border border-slate-200 dark:border-slate-600 rounded p-1 outline-none cursor-pointer"
            value={appointment.status}
            onChange={(e) => handleChangeStatus(appointment.id, e.target.value as any)}
          >
            <option value="scheduled">مجدول</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="completed">منجز</option>
            <option value="cancelled">ملغي</option>
            <option value="postponed">مؤجل</option>
          </select>
        )}
      </div>
      
      {/* Additional Info */}
      {appointment.notes && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">ملاحظات:</span> {appointment.notes}
          </div>
        </div>
      )}
      
      {/* Attachments */}
      {appointment.attachments && appointment.attachments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
            المرفقات ({appointment.attachments.length})
          </div>
          <div className="space-y-1">
            {appointment.attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2">
                <FileText className="w-3 h-3 text-slate-400" />
                <a 
                  href={attachment} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {attachment.split('/').pop() || attachment}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCalendarView = () => (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            التقويم
          </h3>
          <div className="flex gap-2">
            <select
              value={calendarView}
              onChange={(e) => setCalendarView(e.target.value as 'month' | 'week' | 'day')}
              className="border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            >
              <option value="month">شهري</option>
              <option value="week">أسبوعي</option>
              <option value="day">يومي</option>
            </select>
            <input
              type="date"
              value={selectedDateString}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                setSelectedDate(newDate);
                setSelectedDateString(e.target.value);
              }}
              className="border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            />
          </div>
        </div>
      </div>
      
      {/* Monthly Calendar */}
      {calendarView === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <MonthlyCalendar
              appointments={filteredAppointments}
              onAppointmentClick={handleAppointmentClick}
              onDateClick={handleDateClick}
              selectedDate={selectedDate}
            />
          </div>
          
          {/* Side Panel - Selected Date Details */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold text-slate-800 dark:text-white mb-4">
                مواعيد {selectedDate.toLocaleDateString('ar-SA')}
              </h4>
              <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {/* Debug info */}
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  التاريخ المحدد: {selectedDateString} | إجمالي المواعيد: {appointments.length} | مواعيد اليوم: {filteredAppointments.filter(a => a.date === selectedDateString).length}
                </div>
                {filteredAppointments
                  .filter(a => a.date === selectedDateString)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(renderAppointmentCard)}
                {filteredAppointments.filter(a => a.date === selectedDateString).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-slate-500 dark:text-slate-400">
                      لا توجد مواعيد في هذا اليوم
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      التاريخ: {selectedDateString}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Week View */}
      {calendarView === 'week' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              عرض الأسبوعي
            </h3>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(selectedDate);
                const dayStart = new Date(date.setDate(date.getDate() - date.getDay() + i));
                const dayEnd = new Date(dayStart);
                dayEnd.setHours(23, 59, 59, 999);
                const dayString = dayStart.toISOString().split('T')[0];
                const dayAppointments = filteredAppointments.filter(a => a.date === dayString);
                const isExpanded = expandedWeekDay === i;
                const isToday = dayString === new Date().toISOString().split('T')[0];
                
                return (
                  <div 
                    key={i} 
                    className={`border rounded-lg p-2 min-h-[140px] transition-all ${
                      isToday 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-slate-200 dark:border-slate-700'
                    } ${isExpanded ? 'col-span-2 row-span-2' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className={`text-xs font-medium ${
                        isToday 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {dayStart.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' })}
                      </div>
                      {dayAppointments.length > 0 && (
                        <button
                          onClick={() => setExpandedWeekDay(isExpanded ? null : i)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          {isExpanded ? '✕' : '+'}
                        </button>
                      )}
                    </div>
                    
                    {isExpanded ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                          جميع مواعيد اليوم ({dayAppointments.length})
                        </div>
                        {dayAppointments
                          .sort((a, b) => a.startTime.localeCompare(b.startTime))
                          .map(appointment => (
                            <div
                              key={appointment.id}
                              className="p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer"
                              onClick={() => handleAppointmentClick(appointment)}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                  {appointment.startTime} - {appointment.endTime}
                                </div>
                                <span className={`text-xs px-1 py-0.5 rounded ${getPriorityColor(appointment.priority)}`}>
                                  {appointment.priority === 'high' ? 'عاجل' : appointment.priority === 'medium' ? 'متوسط' : 'عادي'}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-slate-800 dark:text-white mb-1">
                                {appointment.title}
                              </div>
                              {appointment.description && (
                                <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                  {appointment.description}
                                </div>
                              )}
                              <div className="flex items-center gap-1 mt-1">
                                <span className={`text-xs px-1 py-0.5 rounded ${getTypeColor(appointment.type)}`}>
                                  {appointment.type === 'meeting' ? 'اجتماع' : 
                                   appointment.type === 'court' ? 'محكمة' :
                                   appointment.type === 'client' ? 'موكل' :
                                   appointment.type === 'video_call' ? 'مكالمة فيديو' :
                                   appointment.type === 'phone_call' ? 'مكالمة هاتفية' :
                                   appointment.type === 'internal' ? 'داخلي' : 'أخرى'}
                                </span>
                              </div>
                              {!readOnly && (
                                <div className="flex gap-1 mt-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenModal(appointment);
                                    }}
                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    title="تعديل"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAppointment(appointment.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dayAppointments.length === 0 ? (
                          <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
                            لا توجد مواعيد
                          </div>
                        ) : (
                          <>
                            {dayAppointments
                              .sort((a, b) => a.startTime.localeCompare(b.startTime))
                              .slice(0, 3)
                              .map(appointment => (
                                <div
                                  key={appointment.id}
                                  className="text-xs p-1 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 truncate cursor-pointer hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                                  onClick={() => handleAppointmentClick(appointment)}
                                >
                                  {appointment.startTime} {appointment.title}
                                </div>
                              ))}
                            {dayAppointments.length > 3 && (
                              <div 
                                className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                                onClick={() => setExpandedWeekDay(i)}
                              >
                                +{dayAppointments.length - 3} أخرى
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Day View */}
      {calendarView === 'day' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
              عرض اليومي - {selectedDate.toLocaleDateString('ar-SA')}
            </h3>
            <div className="space-y-2">
              {filteredAppointments
                .filter(a => a.date === selectedDateString)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map(appointment => (
                  <div
                    key={appointment.id}
                    className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="flex-shrink-0">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {appointment.startTime}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {appointment.endTime}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-800 dark:text-white">
                        {appointment.title}
                      </div>
                      {appointment.description && (
                        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {appointment.description}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(appointment.priority)}`}>
                          {appointment.priority === 'high' ? 'عاجل' : appointment.priority === 'medium' ? 'متوسط' : 'عادي'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${getTypeColor(appointment.type)}`}>
                          {appointment.type === 'meeting' ? 'اجتماع' : 
                           appointment.type === 'court' ? 'محكمة' :
                           appointment.type === 'client' ? 'موكل' :
                           appointment.type === 'video_call' ? 'مكالمة فيديو' :
                           appointment.type === 'phone_call' ? 'مكالمة هاتفية' :
                           appointment.type === 'internal' ? 'داخلي' : 'أخرى'}
                        </span>
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(appointment);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAppointment(appointment.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              {filteredAppointments.filter(a => a.date === selectedDateString).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500 dark:text-slate-400">
                    لا توجد مواعيد في هذا اليوم
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {filteredAppointments
        .sort((a, b) => {
          const dateA = new Date(a.date + ' ' + a.startTime);
          const dateB = new Date(b.date + ' ' + b.startTime);
          return dateB.getTime() - dateA.getTime();
        })
        .map(renderAppointmentCard)}
    </div>
  );

  const renderStatsView = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">الإجمالي</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.total}</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">اليوم</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.today}</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">قادمة</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.upcoming}</div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">منجزة</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.completed}</div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            حسب النوع
          </h4>
          <div className="space-y-3">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(type as Appointment['type'])}
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {type === 'meeting' ? 'اجتماع' : 
                     type === 'court' ? 'محكمة' :
                     type === 'client' ? 'موكل' :
                     type === 'video_call' ? 'مكالمة فيديو' :
                     type === 'phone_call' ? 'مكالمة هاتفية' :
                     type === 'internal' ? 'داخلي' : 'أخرى'}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* By Priority */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            حسب الأولوية
          </h4>
          <div className="space-y-3">
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className={`text-sm px-2 py-1 rounded ${getPriorityColor(priority as Appointment['priority'])}`}>
                  {priority === 'high' ? 'عاجل' : priority === 'medium' ? 'متوسط' : 'عادي'}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* Offline Status Indicator */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              وضع عدم الاتصال - سيتم حفظ المواعيد محلياً
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {pendingCount} موعد تنتظر المزامنة
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary-600" />
              جدول المواعيد والأعمال
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-500" />
              )}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              إدارة جميع المواعيد والاجتماعات ({appointments.length} موعد)
            </p>
          </div>
          
          <div className="flex gap-2">
            {!readOnly && (
              <button onClick={() => handleOpenModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors">
                <Plus className="w-4 h-4" />
                موعد جديد
              </button>
            )}
            <button 
              onClick={handleSyncCalendars}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              title="مزامنة مع التقويم الخارجي"
            >
              <Download className="w-4 h-4" />
              مزامنة التقويم
            </button>
            <button 
              onClick={handleTestNotification}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              title="اختبار الإشعارات"
            >
              <Bell className="w-4 h-4" />
              اختبار الإشعار
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters and View Mode */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="بحث في المواعيد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"
            >
              <option value="all">جميع الأنواع</option>
              <option value="meeting">اجتماع</option>
              <option value="court">محكمة</option>
              <option value="client">موكل</option>
              <option value="video_call">مكالمة فيديو</option>
              <option value="phone_call">مكالمة هاتفية</option>
              <option value="internal">داخلي</option>
              <option value="other">أخرى</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 dark:text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="scheduled">مجدول</option>
              <option value="in_progress">قيد التنفيذ</option>
              <option value="completed">منجز</option>
              <option value="cancelled">ملغي</option>
              <option value="postponed">مؤجل</option>
            </select>
          </div>
          
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'stats' 
                  ? 'bg-white dark:bg-slate-600 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="min-h-[400px]">
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'list' && renderListView()}
        {viewMode === 'stats' && renderStatsView()}
      </div>
      
      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3">
              {editingAppointment ? 'تعديل موعد' : 'إضافة موعد جديد'}
            </h3>
            
            <form onSubmit={handleSaveAppointment} className="space-y-4">
              {/* Basic Information */}
              <div className="border-b pb-4 mb-4">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  المعلومات الأساسية
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان الموعد <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="مثال: اجتماع مع الموكل"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الوصف</label>
                    <textarea
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      rows={3}
                      value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="تفاصيل إضافية عن الموعد..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Date and Time */}
              <div className="border-b pb-4 mb-4">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  التاريخ والوقت
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وقت البدء <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      required
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.startTime}
                      onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وقت الانتهاء <span className="text-red-500">*</span></label>
                    <input
                      type="time"
                      required
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.endTime}
                      onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المدة التقديرية (دقائق)</label>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.estimatedDuration || ''}
                      onChange={(e) => setFormData({...formData, estimatedDuration: parseInt(e.target.value) || undefined})}
                      placeholder="مثال: 60"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التذكير (دقائق قبل الموعد)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.reminderMinutes || ''}
                      onChange={(e) => setFormData({...formData, reminderMinutes: parseInt(e.target.value) || undefined})}
                      placeholder="مثال: 15"
                    />
                  </div>
                </div>
              </div>
              
              {/* Type and Priority */}
              <div className="border-b pb-4 mb-4">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  النوع والأولوية
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الموعد</label>
                    <select
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    >
                      <option value="meeting">اجتماع</option>
                      <option value="court">محكمة</option>
                      <option value="client">موكل</option>
                      <option value="video_call">مكالمة فيديو</option>
                      <option value="phone_call">مكالمة هاتفية</option>
                      <option value="internal">داخلي</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الأولوية</label>
                    <select
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                    >
                      <option value="low">عادي</option>
                      <option value="medium">متوسط</option>
                      <option value="high">عاجل</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الحالة</label>
                    <select
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="scheduled">مجدول</option>
                      <option value="in_progress">قيد التنفيذ</option>
                      <option value="completed">منجز</option>
                      <option value="cancelled">ملغي</option>
                      <option value="postponed">مؤجل</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Location and Contact */}
              <div className="border-b pb-4 mb-4">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  الموقع والتواصل
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الموقع</label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="مثال: المكتب، المحكمة، عنوان محدد"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.phoneNumber || ''}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="مثال: 0501234567"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رابط الاجتماع (للمكالمات الفيديو)</label>
                    <input
                      type="url"
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.onlineMeetingUrl || ''}
                      onChange={(e) => setFormData({...formData, onlineMeetingUrl: e.target.value})}
                      placeholder="مثال: https://zoom.us/j/123456789"
                    />
                  </div>
                </div>
              </div>
              
              {/* Related Entities */}
              <div className="border-b pb-4 mb-4">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  الكيانات المرتبطة
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مرتبط بقضية</label>
                    <select
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.relatedCaseId || ''}
                      onChange={(e) => setFormData({...formData, relatedCaseId: e.target.value})}
                    >
                      <option value="">-- بدون ارتباط --</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مرتبط بموكل</label>
                    <select
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.relatedClientId || ''}
                      onChange={(e) => setFormData({...formData, relatedClientId: e.target.value})}
                    >
                      <option value="">-- بدون ارتباط --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الحضور (اختر الموظفين)</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2 bg-slate-50 dark:bg-slate-700">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={formData.attendees?.includes(user.id) || false}
                            onChange={(e) => {
                              const attendees = formData.attendees || [];
                              if (e.target.checked) {
                                setFormData({...formData, attendees: [...attendees, user.id]});
                              } else {
                                setFormData({...formData, attendees: attendees.filter(id => id !== user.id)});
                              }
                            }}
                            className="rounded"
                          />
                          <span>{user.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Tags and Notes */}
              <div className="border-b pb-4 mb-4">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  الوسوم والملاحظات
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وسوم (افصل بين الوسوم بفاصلة)</label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => setFormData({...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)})}
                      placeholder="مثال: عاجل، محكمة، موهم"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية</label>
                    <textarea
                      className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      rows={2}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="ملاحظات داخلية أو متطلبات خاصة..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Recurrence Settings */}
              <RecurrenceManager
                isRecurring={formData.isRecurring || false}
                recurrencePattern={formData.recurrencePattern}
                onRecurrenceChange={(isRecurring, pattern) => {
                  setFormData({
                    ...formData,
                    isRecurring,
                    recurrencePattern: pattern
                  });
                }}
              />
              
              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300">
                  إلغاء
                </button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                  {editingAppointment ? 'تحديث الموعد' : 'حفظ الموعد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
