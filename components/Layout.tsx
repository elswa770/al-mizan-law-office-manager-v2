
import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Briefcase, Users, Gavel, FileText, BrainCircuit, LogOut, Menu, Bell, Calendar, X, Clock, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Settings, BarChart3, Wallet, File, Search, Library, PlusCircle, Shield, CheckSquare, Map, Calculator, PenTool, Archive } from 'lucide-react';
import { AppUser } from '../types';
import { AuthUser } from '../services/authService';

interface NotificationItem {
  id: string;
  date: string;
  time?: string;
  title: string;
  message?: string;
  caseNumber?: string;
  clientName?: string;
  court?: string;
  caseId?: string; 
  clientId?: string;
  hearingId?: string;
  type: 'hearing' | 'poa_expiry' | 'task'; 
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  notifications?: NotificationItem[];
  onNotificationClick?: (id: string, type: 'hearing' | 'poa_expiry' | 'task') => void;
  currentUser?: AppUser | null;
  authUser?: AuthUser | null;
  onLogout?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, notifications = [], onNotificationClick, currentUser, authUser, onLogout }) => {
  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Notification State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const mobileNotificationRef = useRef<HTMLDivElement>(null);

  // Close notifications when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isDesktopInside = notificationRef.current && notificationRef.current.contains(target);
      const isMobileInside = mobileNotificationRef.current && mobileNotificationRef.current.contains(target);

      if (!isDesktopInside && !isMobileInside) {
        setIsNotificationsOpen(false);
      }
    }
    
    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen]);

  // Helper to format time
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'م' : 'ص';
    const h = hours % 12 || 12;
    return `${h}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Helper for notification styling
  const getNotificationStyle = (urgency: string) => {
    switch (urgency) {
      case 'critical': return { bg: 'bg-red-50', border: 'border-red-100', icon: 'text-red-600', text: 'text-red-800' };
      case 'high': return { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'text-amber-600', text: 'text-amber-800' };
      case 'medium': return { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'text-blue-600', text: 'text-blue-800' };
      default: return { bg: 'bg-slate-50', border: 'border-slate-100', icon: 'text-slate-500', text: 'text-slate-700' };
    }
  };

  const getNotificationIcon = (type: string, urgency: string) => {
    if (type === 'poa_expiry') return AlertTriangle;
    if (type === 'task') return CheckCircle;
    if (urgency === 'critical') return AlertTriangle;
    return Calendar;
  };

  // Navigation Groups Configuration
  const navGroups = [
    {
      title: 'الرئيسية',
      items: [
        { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
        { id: 'ai-assistant', label: 'المساعد الذكي', icon: BrainCircuit, special: true },
      ]
    },
    {
      title: 'إدارة العمل',
      items: [
        { id: 'cases', label: 'القضايا', icon: Briefcase },
        { id: 'hearings', label: 'الجلسات', icon: Gavel },
        { id: 'tasks', label: 'المهام', icon: CheckSquare },
        { id: 'generator', label: 'منشئ العقود', icon: PenTool },
        { id: 'clients', label: 'الموكلين', icon: Users },
        { id: 'locations', label: 'دليل المحاكم', icon: Map },
        { id: 'references', label: 'المراجع القانونية', icon: Library },
        { id: 'calculators', label: 'الحاسبات القانونية', icon: Calculator },
      ]
    },
    {
      title: 'المكتب والإدارة',
      items: [
        { id: 'documents', label: 'المستندات', icon: File },
        { id: 'archive', label: 'إدارة الأرشيف', icon: Archive },
        { id: 'lawyers', label: 'إدارة المحامين', icon: Users },
        { id: 'fees', label: 'الأتعاب والمصروفات', icon: Wallet },
        { id: 'reports', label: 'التقارير', icon: BarChart3 },
      ]
    },
    {
      title: 'النظام',
      items: [
        { id: 'settings', label: 'الإعدادات', icon: Settings },
      ]
    }
  ];

  // Helper to check permissions
  const checkPermission = (moduleId: string): boolean => {
    if (!currentUser || !currentUser.permissions) return false;
    // Special handling for 'fees'
    if (moduleId === 'fees') {
       const hasFees = currentUser.permissions.find(p => p.moduleId === 'fees')?.access !== 'none';
       const hasExpenses = currentUser.permissions.find(p => p.moduleId === 'expenses')?.access !== 'none';
       return hasFees || hasExpenses;
    }
    
    // Check main permissions
    const permission = currentUser.permissions.find(p => p.moduleId === moduleId);
    return permission ? permission.access !== 'none' : false;
  };

  // Get REALISTIC badge count (Urgent only)
  const getBadgeCount = (id: string) => {
    const urgentNotifications = notifications.filter(n => n.urgency === 'critical' || n.urgency === 'high');

    if (id === 'hearings') return urgentNotifications.filter(n => n.type === 'hearing').length;
    if (id === 'clients') return urgentNotifications.filter(n => n.type === 'poa_expiry').length;
    return 0;
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'case-details': return 'تفاصيل القضية';
      case 'client-details': return 'ملف الموكل';
      case 'locations': return 'دليل المحاكم والجهات';
      case 'calculators': return 'الحاسبات القانونية';
      case 'generator': return 'منشئ العقود والمحررات';
      case 'archive': return 'إدارة الأرشيف';
      default: 
        return navGroups.flatMap(g => g.items).find(n => n.id === activePage)?.label || 'الميزان';
    }
  };

  const renderNotificationsList = () => (
    <div className="max-h-80 overflow-y-auto">
      {notifications.length > 0 ? (
        <div className="divide-y divide-slate-50 dark:divide-slate-700">
          {notifications.map((notif) => {
            const style = getNotificationStyle(notif.urgency);
            const Icon = getNotificationIcon(notif.type, notif.urgency);
            
            return (
              <div 
                key={notif.id} 
                onClick={() => {
                  if (onNotificationClick) {
                    const targetId = notif.type === 'poa_expiry' ? notif.clientId : notif.caseId;
                    onNotificationClick(targetId || '', notif.type);
                  }
                  setIsNotificationsOpen(false);
                }}
                className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border-l-4 ${style.border.replace('border', 'border-l')}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${style.bg} p-2 rounded-lg shrink-0`}>
                    <Icon className={`w-4 h-4 ${style.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                       <p className={`text-sm font-bold truncate pl-2 ${style.text}`} title={notif.title}>
                         {notif.title}
                       </p>
                       <div className="flex flex-col items-end gap-1">
                         <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 whitespace-nowrap">
                           {notif.date}
                         </span>
                       </div>
                    </div>
                    {notif.message && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">{notif.message}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                       {notif.clientName && <span className="font-medium text-slate-500 dark:text-slate-400">{notif.clientName}</span>}
                       {notif.time && <span className="font-bold text-primary-600">• {formatTime(notif.time)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-400">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">لا توجد تنبيهات جديدة</p>
        </div>
      )}
    </div>
  );

  // Filter groups
  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => checkPermission(item.id))
  })).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      
      {/* --- Mobile Header --- */}
      <div className="md:hidden bg-white dark:bg-slate-900 p-4 flex justify-between items-center shadow-sm border-b border-slate-200 dark:border-slate-800 z-50">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Gavel className="w-6 h-6 text-primary-600" />
          الميزان
        </h1>
        <div className="flex items-center gap-4">
          <button 
            className="relative text-slate-600 dark:text-slate-300"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          >
             <Bell className="w-6 h-6" />
             {notifications.length > 0 && (
               <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                 {notifications.length}
               </span>
             )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      {/* --- Sidebar (Desktop & Mobile) --- */}
      <aside className={`
        fixed md:static inset-y-0 right-0 z-50 bg-slate-900 dark:bg-slate-900 text-slate-100 transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0 w-64' : 'translate-x-full md:translate-x-0'}
        ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
        flex flex-col shadow-2xl md:shadow-none border-l border-slate-800
      `}>
        
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-5'} border-b border-slate-800 transition-all duration-300`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-1.5 rounded-lg shadow-lg shadow-primary-900/50">
                <Gavel className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold tracking-wide">الميزان</h1>
            </div>
          )}
          {isSidebarCollapsed && (
             <div className="bg-gradient-to-br from-primary-500 to-indigo-600 p-2 rounded-lg">
                <Gavel className="w-6 h-6 text-white" />
             </div>
          )}
          {/* Collapse Toggle (Desktop only) */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        {/* Quick Action Button - Hide if no permissions for Cases */}
        {checkPermission('cases') && (
          <div className={`px-4 py-4 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
             <button 
               onClick={() => onNavigate('cases')}
               className={`
                 flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white rounded-xl shadow-lg shadow-primary-900/20 transition-all duration-300
                 ${isSidebarCollapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5 px-3'}
               `}
               title="قضية جديدة"
             >
                <PlusCircle className="w-5 h-5" />
                {!isSidebarCollapsed && <span className="font-bold text-sm">قضية جديدة</span>}
             </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {visibleGroups.map((group, groupIndex) => (
             <div key={groupIndex}>
                {!isSidebarCollapsed && (
                   <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {group.title}
                   </h3>
                )}
                <div className="space-y-1">
                   {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      const badgeCount = getBadgeCount(item.id);

                      return (
                         <button
                            key={item.id}
                            onClick={() => {
                               onNavigate(item.id);
                               setIsMobileMenuOpen(false);
                            }}
                            className={`
                               w-full flex items-center relative group rounded-xl transition-all duration-200
                               ${isSidebarCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 gap-3'}
                               ${isActive 
                                  ? 'bg-slate-800 text-white shadow-md shadow-slate-900/20' 
                                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                               }
                               ${item.special && !isActive ? 'text-indigo-400 hover:text-indigo-300' : ''}
                            `}
                            title={isSidebarCollapsed ? item.label : ''}
                         >
                            {/* Active Indicator Line (Left) */}
                            {isActive && (
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-l-full"></div>
                            )}

                            <Icon className={`
                               ${isSidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'} 
                               ${isActive ? 'text-primary-400' : ''} 
                               ${item.special && !isActive ? 'text-indigo-400' : ''}
                               transition-colors
                            `} />
                            
                            {!isSidebarCollapsed && (
                               <div className="flex-1 flex justify-between items-center">
                                  <span className={`font-medium text-sm ${isActive ? 'text-white' : ''}`}>
                                     {item.label}
                                  </span>
                                  {badgeCount > 0 && (
                                     <span className="bg-red-500 text-white text-[10px] px-1.5 min-w-[1.25rem] h-5 rounded-full flex items-center justify-center font-bold">
                                        {badgeCount}
                                     </span>
                                  )}
                               </div>
                            )}

                            {/* Collapsed Mode Badge */}
                            {isSidebarCollapsed && badgeCount > 0 && (
                               <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
                            )}

                            {/* Tooltip for collapsed mode */}
                            {isSidebarCollapsed && (
                               <div className="absolute right-full mr-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700 font-medium">
                                  {item.label}
                               </div>
                            )}
                         </button>
                      );
                   })}
                </div>
             </div>
          ))}
        </nav>

        {/* Footer / User Profile */}
        <div className="border-t border-slate-800 bg-slate-900/50 p-2">
           <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="relative">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-slate-800 overflow-hidden">
                    {currentUser?.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : currentUser?.name?.charAt(0) || authUser?.email?.charAt(0)?.toUpperCase() || 'U'}
                 </div>
                 <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              
              {!isSidebarCollapsed && (
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {currentUser?.name || authUser?.email?.split('@')[0] || 'مستخدم'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {currentUser?.roleLabel || 'مستخدم'}
                    </p>
                 </div>
              )}
              
              {!isSidebarCollapsed && (
                 <button onClick={onLogout} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-colors" title="تسجيل الخروج">
                    <LogOut className="w-4 h-4" />
                 </button>
              )}
           </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 h-[calc(100vh-64px)] md:h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950 relative flex flex-col transition-colors duration-300">
        {/* Desktop Topbar */}
        <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 px-8 py-4 hidden md:flex justify-between items-center sticky top-0 z-30 transition-colors duration-300">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
             {activePage === 'ai-assistant' && <BrainCircuit className="w-6 h-6 text-indigo-500"/>}
             {getPageTitle()}
          </h2>
          
          <div className="flex items-center gap-6">
            {/* Global Search */}
            <div className="relative hidden lg:block">
               <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input type="text" placeholder="بحث عام (قضية، موكل، مستند)..." className="pl-4 pr-9 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm w-72 focus:ring-2 focus:ring-primary-500 transition-all dark:text-white" />
            </div>

            {/* Notifications Bell */}
            <div className="relative" ref={notificationRef}>
              <button 
                className="relative p-2.5 text-slate-500 hover:text-primary-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 rounded-full w-2 h-2 border border-white dark:border-slate-900"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute left-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                   <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm">التنبيهات</h3>
                      {notifications.length > 0 && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">
                          {notifications.length} جديد
                        </span>
                      )}
                   </div>
                   {renderNotificationsList()}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Notification Dropdown Overlay */}
        {isNotificationsOpen && (
           <div 
             className="fixed inset-0 bg-black/50 z-40 md:hidden"
             onClick={() => setIsNotificationsOpen(false)}
           >
              <div 
                className="absolute top-16 left-4 right-4 bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
                ref={mobileNotificationRef}
              >
                  <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm">التنبيهات</h3>
                      <button onClick={() => setIsNotificationsOpen(false)}>
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                   </div>
                   {renderNotificationsList()}
              </div>
           </div>
        )}

        {/* Page Content */}
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
