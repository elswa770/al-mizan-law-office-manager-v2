import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Briefcase, 
  Users, 
  Calendar, 
  Menu, 
  X, 
  Plus,
  Search,
  Bell,
  Scale,
  CheckSquare,
  FileText,
  Wallet,
  BarChart3,
  Settings,
  User,
  LogOut,
  Map,
  Calculator,
  PenTool,
  Archive,
  BrainCircuit,
  Library
} from 'lucide-react';
import { AppUser } from '../types';

interface MobileNavigationProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser?: AppUser | null;
  notificationsCount?: number;
  onLogout?: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activePage,
  onNavigate,
  currentUser,
  notificationsCount = 0,
  onLogout
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isMenuOpen]);

  const primaryNavItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'cases', label: 'القضايا', icon: Briefcase },
    { id: 'clients', label: 'الموكلين', icon: Users },
    { id: 'appointments', label: 'المواعيد', icon: Calendar },
  ];

  const secondaryNavItems = [
    { id: 'hearings', label: 'الجلسات', icon: Scale },
    { id: 'tasks', label: 'المهام', icon: CheckSquare },
    { id: 'documents', label: 'المستندات', icon: FileText },
    { id: 'fees', label: 'الأتعاب', icon: Wallet },
    { id: 'reports', label: 'التقارير', icon: BarChart3 },
    { id: 'locations', label: 'دليل المحاكم', icon: Map },
    { id: 'calculators', label: 'الحاسبات', icon: Calculator },
    { id: 'generator', label: 'منشئ العقود', icon: PenTool },
    { id: 'archive', label: 'الأرشيف', icon: Archive },
    { id: 'lawyers', label: 'المحامون', icon: Users },
    { id: 'ai-assistant', label: 'المساعد الذكي', icon: BrainCircuit },
    { id: 'references', label: 'المراجع', icon: Library },
    { id: 'settings', label: 'الإعدادات', icon: Settings },
  ];

  // Handle navigation with better logging and menu closing
  const handleNavigate = (pageId: string) => {
    console.log('📱 MobileNavigation: Navigating to', pageId);
    setIsMenuOpen(false);
    onNavigate(pageId);
  };

  // Handle logout with confirmation
  const handleLogout = () => {
    if (onLogout) {
      setIsMenuOpen(false);
      onLogout();
    }
  };

  return (
    <>
      {/* Mobile Header - HIGHER Z-INDEX */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">الميزان</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigate('search')}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="البحث"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => handleNavigate('notifications')}
              className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                  {notificationsCount > 99 ? '99+' : notificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - HIGHER Z-INDEX */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-4 gap-1 p-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 scale-105' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }
                `}
                aria-label={item.label}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Slide Menu - HIGHEST Z-INDEX */}
      {isMenuOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-[70] animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="md:hidden fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-slate-800 z-[70] shadow-xl transform transition-transform animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">القائمة</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-6 overflow-y-auto h-full pb-20">
              {/* User Profile Section */}
              {currentUser && (
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                        {currentUser.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{currentUser.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser.roleLabel}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      aria-label="تسجيل الخروج"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">إجراءات سريعة</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleNavigate('cases')}
                    className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">قضية جديدة</span>
                  </button>
                  <button
                    onClick={() => handleNavigate('clients')}
                    className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">موكل جديد</span>
                  </button>
                </div>
              </div>
              
              {/* All Navigation Items */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">جميع الأقسام</h3>
                <div className="space-y-1">
                  {[...primaryNavItems, ...secondaryNavItems].map((item) => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-right
                          ${isActive 
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-md' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }
                        `}
                        aria-label={item.label}
                      >
                        {Icon && <Icon className="w-5 h-5" />}
                        <span className="font-medium">{item.label}</span>
                        {isActive && (
                          <div className="w-2 h-2 bg-primary-500 rounded-full mr-auto"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MobileNavigation;
