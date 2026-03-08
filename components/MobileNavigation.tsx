import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { canUseVoiceSearch, canUseSearch, canAccessNotifications } from '../utils/permissions';
import { storeVoiceSearch } from '../utils/voiceSearchHelper';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  pinned?: boolean;
}

interface MobileNavigationProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser?: AppUser | null;
  notificationsCount?: number;
  onLogout?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  customNavItems?: NavItem[];
  pinnedItems?: string[];
}

const MobileNavigationComponent: React.FC<MobileNavigationProps> = ({ 
  activePage, 
  onNavigate, 
  currentUser, 
  notificationsCount = 0, 
  onLogout, 
  theme = 'auto', 
  customNavItems = [], 
  pinnedItems = [] 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [userPinnedItems, setUserPinnedItems] = useState<string[]>(pinnedItems);

  // Load saved menu state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('mobileMenuState');
    if (savedState) {
      setIsMenuOpen(JSON.parse(savedState));
    }
    const savedPinnedItems = localStorage.getItem('pinnedNavItems');
    if (savedPinnedItems) {
      setUserPinnedItems(JSON.parse(savedPinnedItems));
    }
  }, []);

  // Save menu state to localStorage
  useEffect(() => {
    localStorage.setItem('mobileMenuState', JSON.stringify(isMenuOpen));
  }, [isMenuOpen]);

  // Save pinned items to localStorage
  useEffect(() => {
    localStorage.setItem('pinnedNavItems', JSON.stringify(userPinnedItems));
  }, [userPinnedItems]);

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

  // Memoized navigation items for better performance
  const primaryNavItems = useMemo(() => [
    { id: 'dashboard', label: 'الرئيسية', icon: Home },
    { id: 'cases', label: 'القضايا', icon: Briefcase },
    { id: 'clients', label: 'الموكلين', icon: Users },
    { id: 'appointments', label: 'المواعيد', icon: Calendar },
  ], []);

  const secondaryNavItems = useMemo(() => [
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
  ], []);

  // Filter navigation items based on search query
  const filteredSecondaryItems = useMemo(() => 
    secondaryNavItems.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery, secondaryNavItems]
  );

  // Navigation colors constants
  const navColors = {
    active: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 shadow-md',
    inactive: 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
  };

  // Handle navigation with better logging and menu closing - optimized with useCallback
  const handleNavigate = useCallback((pageId: string) => {
    console.log('📱 MobileNavigation: Navigating to', pageId);
    setIsMenuOpen(false);
    setSearchQuery('');
    onNavigate(pageId);
  }, [onNavigate]);

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent, pageId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate(pageId);
    }
  }, [handleNavigate]);

  // Handle logout with confirmation
  const handleLogout = useCallback(() => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      if (onLogout) {
        setIsMenuOpen(false);
        onLogout();
      }
    }
  }, [onLogout]);

  // Toggle pinned items
  const togglePinItem = useCallback((itemId: string) => {
    setUserPinnedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // Perform actual voice search
  const performVoiceSearch = useCallback((query: string) => {
    try {
      console.log('🔍 بدأ البحث الصوتي في الصفحة المفتوحة:', query);
      
      // Store search query in localStorage
      localStorage.setItem('voiceSearchQuery', query);
      localStorage.setItem('voiceSearchTimestamp', Date.now().toString());
      localStorage.setItem('searchType', 'voice');
      localStorage.setItem('searchInCurrentPage', 'true'); // New flag for current page search
      
      // Show success message
      setTimeout(() => {
        alert(`جاري البحث الصوتي عن: "${query}"\nسيتم البحث في الصفحة المفتوحة حالياً`);
      }, 500);
      
    } catch (error) {
      console.error('❌ خطأ في البحث الصوتي:', error);
      alert('حدث خطأ في تنفيذ البحث الصوتي');
    }
  }, []);

  // Voice search functionality
  const handleVoiceSearch = useCallback(async () => {
    // Check voice search permission first
    if (!canUseVoiceSearch(currentUser)) {
      alert('عفواً، لا تملك صلاحية للوصول إلى البحث الصوتي. يرجى التواصل مع مدير النظام.');
      return;
    }

    try {
      // Check if browser supports speech recognition
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('البحث الصوتي غير مدعوم في متصفحك');
        return;
      }

      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      } catch (error) {
        if (error instanceof Error && error.name === 'NotAllowedError') {
          alert('يرجى السماح بالوصول إلى الميكروفون لاستخدام البحث الصوتي. يمكنك تفعيله من إعدادات المتصفح.');
          return;
        } else if (error instanceof Error && error.name === 'NotFoundError') {
          alert('لم يتم العثور على ميكروفون. يرجى توصيل ميكروفون والمحاولة مرة أخرى.');
          return;
        } else {
          alert('حدث خطأ في الوصول إلى الميكروفون: ' + error.message);
          return;
        }
      }

      // Initialize speech recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Enhanced settings for better recognition
      recognition.lang = 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = true; // Enable interim results for better feedback
      recognition.maxAlternatives = 3; // Get multiple alternatives
      recognition.serviceURI = 'wss://www.google.com/speech-api/v1/recognize'; // Use Google's service
      
      // Additional settings for better accuracy
      if ('grammars' in recognition) {
        const SpeechGrammarList = (window as any).SpeechGrammarList;
        const grammarList = new SpeechGrammarList();
        
        // Add legal terms grammar for better recognition
        const legalGrammar = `#JSGF V1.0;
          grammar legalTerms;
          public <legalTerms> = قضية | حكم | استئناف | دعوى | طعن | مستأنف | 
                                 محكمة | قاضي | جلسة | حكم نهائي | حكم ابتدائي | 
                                 نقض | خصم | الخصومة | محاكم | موكل | عميل | 
                                 شيك | رهن | طلاق | زواج | إيجار | بيع | شراء;
        `;
        
        grammarList.addFromString(legalGrammar, 1);
        recognition.grammars = grammarList;
      }

      recognition.onstart = () => {
        setIsListening(true);
        console.log('🎤 بدأ التسجيل الصوتي...');
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log('🎤 انتهى التسجيل الصوتي');
      };

      recognition.onresult = (event: any) => {
        let bestTranscript = '';
        let bestConfidence = 0;
        
        // Process all results and alternatives to find the best one
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            // Check all alternatives for this result
            for (let j = 0; j < result.length && j < 3; j++) {
              const alternative = result[j];
              const transcript = alternative.transcript;
              const confidence = alternative.confidence || 0;
              
              console.log(`🎤 البديل ${j + 1}: "${transcript}" (الثقة: ${confidence})`);
              
              // Choose the alternative with highest confidence
              if (confidence > bestConfidence) {
                bestTranscript = transcript;
                bestConfidence = confidence;
              }
            }
          }
        }
        
        console.log('🎤 أفضل نتيجة:', bestTranscript, 'الثقة:', bestConfidence);
        
        // Lower confidence threshold for better usability
        if (bestConfidence > 0.3 && bestTranscript.trim().length > 0) {
          setSearchQuery(bestTranscript);
          
          // Perform voice search directly
          performVoiceSearch(bestTranscript);
        } else {
          // Silent feedback - no annoying alerts for low confidence
          console.log(`🎤 ثقة منخفضة (${(bestConfidence * 100).toFixed(0)}%): "${bestTranscript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error('🎤 خطأ في التعرف الصوتي:', event.error);
        
        switch (event.error) {
          case 'no-speech':
            // Silent - no annoying alerts
            console.log('🎤 لم يتم اكتشاف صوت');
            break;
          case 'audio-capture':
            alert('يرجى السماح بالوصول للميكروفون في المتصفح');
            break;
          case 'not-allowed':
            alert('يرجى السماح بالوصول للميكروفون من أيقونة القفل في شريط العنوان');
            break;
          case 'network':
            // Silent - network issues are temporary
            console.log('🎤 مشكلة في الشبكة');
            break;
          case 'service-not-allowed':
            alert('يرجى استخدام متصفح Chrome أو Edge للبحث الصوتي');
            break;
          case 'aborted':
            console.log('🎤 تم إلغاء التسجيل الصوتي');
            break;
          default:
            // Silent for minor errors
            console.log('🎤 خطأ في التعرف الصوتي:', event.error);
        }
      };

      recognition.onspeechstart = () => {
        console.log('🎤 تم اكتشاف الكلام...');
        // Silent feedback - no annoying alerts
      };

      recognition.onspeechend = () => {
        console.log('🎤 انتهى الكلام، جاري المعالجة...');
        // Silent feedback - no annoying alerts
      };

      recognition.onnomatch = () => {
        console.log('🎤 لا توجد نتائج مطابقة');
        // Silent feedback - no annoying alerts
      };

      // Start recognition
      recognition.start();
      
    } catch (error) {
      setIsListening(false);
      console.error('🎤 خطأ عام في البحث الصوتي:', error);
      alert('حدث خطأ غير متوقع في البحث الصوتي. يرجى المحاولة مرة أخرى.');
    }
  }, [currentUser, handleNavigate]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('تم تفعيل الإشعارات بنجاح');
      }
    }
  }, []);

  return (
    <>
      {/* Mobile Header - HIGHER Z-INDEX */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 ease-in-out"
              aria-label="فتح القائمة"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">الميزان</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Search Button - Check permissions */}
            {canUseSearch(currentUser) && (
              <button
                onClick={() => handleNavigate('search')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 ease-in-out"
                aria-label="البحث"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, 'search')}
              >
                <Search className="w-5 h-5" />
              </button>
            )}
            
            {/* Voice Search Button - Check permissions */}
            {canUseVoiceSearch(currentUser) && (
              <button
                onClick={handleVoiceSearch}
                className={`p-2 rounded-lg transition-all duration-300 ease-in-out ${
                  isListening 
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
                aria-label={isListening ? 'إيقاف البحث الصوتي' : 'بدء البحث الصوتي'}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleVoiceSearch();
                  }
                }}
              >
                <BrainCircuit className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
              </button>
            )}
            
            {/* Notifications Button - Check permissions */}
            {canAccessNotifications(currentUser) && (
              <button
                onClick={() => handleNavigate('notifications')}
                className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 ease-in-out"
                aria-label="الإشعارات"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, 'notifications')}
              >
                <Bell className="w-5 h-5" />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {notificationsCount > 99 ? '99+' : notificationsCount}
                  </span>
                )}
              </button>
            )}
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
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 ease-in-out
                  ${isActive 
                    ? navColors.active + ' scale-105' 
                    : navColors.inactive
                  }
                `}
                aria-label={item.label}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
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
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 ease-in-out"
                      aria-label="تسجيل الخروج"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleLogout();
                        }
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Notification Settings */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                    <span className="text-sm text-slate-600 dark:text-slate-400">الإشعارات</span>
                    <button
                      onClick={requestNotificationPermission}
                      className="text-xs px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-all duration-300 ease-in-out"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          requestNotificationPermission();
                        }
                      }}
                    >
                      تفعيل
                    </button>
                  </div>
                </div>
              )}
              
              {/* Search Bar */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">البحث السريع</h3>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في الأقسام..."
                    className="w-full p-3 pr-10 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-300 ease-in-out"
                    dir="rtl"
                  />
                  <Search className="absolute right-3 top-3.5 w-4 h-4 text-slate-400" />
                </div>
              </div>
              
              {/* Quick Actions */}
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3">إجراءات سريعة</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleNavigate('cases')}
                    className="flex items-center gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-all duration-300 ease-in-out"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, 'cases')}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">قضية جديدة</span>
                  </button>
                  <button
                    onClick={() => handleNavigate('clients')}
                    className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300 ease-in-out"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, 'clients')}
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
                  {/* Pinned Items First */}
                  {[...primaryNavItems, ...filteredSecondaryItems]
                    .filter(item => userPinnedItems.includes(item.id))
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      
                      return (
                        <button
                          key={`pinned-${item.id}`}
                          onClick={() => handleNavigate(item.id)}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out text-right
                            ${isActive 
                              ? navColors.active
                              : navColors.inactive
                            }
                          `}
                          aria-label={`${item.label} (مثبت)`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => handleKeyDown(e, item.id)}
                        >
                          {Icon && <Icon className="w-5 h-5" />}
                          <span className="font-medium">{item.label}</span>
                          <div className="flex items-center gap-1 mr-auto">
                            <span className="text-xs text-amber-500">📌</span>
                            {isActive && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  
                  {/* Regular Items */}
                  {[...primaryNavItems, ...filteredSecondaryItems]
                    .filter(item => !userPinnedItems.includes(item.id))
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.id)}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-in-out text-right group
                            ${isActive 
                              ? navColors.active
                              : navColors.inactive
                            }
                          `}
                          aria-label={item.label}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => handleKeyDown(e, item.id)}
                        >
                          {Icon && <Icon className="w-5 h-5" />}
                          <span className="font-medium">{item.label}</span>
                          <div className="flex items-center gap-1 mr-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinItem(item.id);
                              }}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-all duration-200"
                              aria-label={`تثبيت ${item.label}`}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  togglePinItem(item.id);
                                }
                              }}
                            >
                              <span className="text-xs">📌</span>
                            </button>
                            {isActive && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                            )}
                          </div>
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

// Wrap with React.memo for performance optimization
const MobileNavigation = React.memo(MobileNavigationComponent);
MobileNavigation.displayName = 'MobileNavigation';

export default MobileNavigation;
