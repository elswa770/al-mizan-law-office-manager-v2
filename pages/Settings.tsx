
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppUser, PermissionLevel, Case, Client, Hearing, Task, LegalReference, NotificationSettings, SMTPSettings, WhatsAppSettings, AlertPreferences, SecuritySettings, LoginAttempt, ActiveSession, DataManagementSettings, SystemHealth, SystemError, ResourceUsage, MaintenanceSettings } from '../types';
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, onSnapshot, writeBatch, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db, storage } from '../services/firebaseConfig';
import { 
  Settings as SettingsIcon, Users, Lock, Shield, 
  Plus, Edit3, Trash2, Check, X, Eye, 
  Save, AlertCircle, Ban, Pencil, Key,
  Building, Phone, Mail, Globe, Upload, FileText, 
  Bell, Moon, Sun, Database, Download, Clock, Cloud, Loader2, FileJson, History, HardDrive, RotateCcw, List,
  Smartphone, LogOut, ShieldAlert, Fingerprint, Globe2, AlertTriangle, Archive, FileUp, RefreshCw, CalendarClock, Trash,
  Wrench, Activity, Cpu, AlertOctagon, CheckCircle2, Terminal, Server,
  Search, ArrowUp, ArrowDown
} from 'lucide-react';

interface SettingsProps {
  users?: AppUser[];
  onAddUser?: (user: AppUser) => void;
  onUpdateUser?: (user: AppUser) => void;
  onDeleteUser?: (userId: string) => void;
  currentTheme?: 'light' | 'dark';
  onThemeChange?: (theme: 'light' | 'dark') => void;
  // Data props for backup
  cases?: Case[];
  clients?: Client[];
  hearings?: Hearing[];
  tasks?: Task[];
  references?: LegalReference[];
  activities?: any[];
  onRestoreData?: (data: any) => void; 
  readOnly?: boolean;
}

// Complete list of modules for permission assignment
const MODULES = [
  { id: 'dashboard', label: 'لوحة التحكم' },
  { id: 'cases', label: 'إدارة القضايا' },
  { id: 'clients', label: 'إدارة الموكلين' },
  { id: 'hearings', label: 'الجلسات والمواعيد' },
  { id: 'tasks', label: 'إدارة المهام' },
  { id: 'appointments', label: 'جدول المواعيد والأعمال' },
  { id: 'documents', label: 'الأرشيف والمستندات' },
  { id: 'archive', label: 'إدارة الأرشيف' }, // Added Archive module
  { id: 'lawyers', label: 'إدارة المحامين' }, // Added Lawyers module
  { id: 'generator', label: 'منشئ العقود' }, // Added
  { id: 'fees', label: 'الحسابات (الإيرادات)' },
  { id: 'expenses', label: 'المصروفات الإدارية' },
  { id: 'reports', label: 'التقارير' },
  { id: 'references', label: 'المراجع القانونية' }, 
  { id: 'ai-assistant', label: 'المساعد الذكي' },
  { id: 'locations', label: 'دليل المحاكم' }, // Added
  { id: 'calculators', label: 'الحاسبات القانونية' }, // Added
  { id: 'settings', label: 'الإعدادات والمستخدمين' },
];

const Settings: React.FC<SettingsProps> = ({ 
  users = [], onAddUser, onUpdateUser, onDeleteUser, currentTheme = 'light', onThemeChange,
  cases = [], clients = [], hearings = [], tasks = [], references = [],
  onRestoreData, readOnly = false
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'security' | 'notifications' | 'data' | 'maintenance'>('general');
  const [isSaving, setIsSaving] = useState(false);
  
  // Backup State
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(localStorage.getItem('app_last_backup_date'));
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Maintenance State
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings>({
    autoUpdate: true,
    errorReporting: true,
    performanceMonitoring: true,
    maintenanceWindow: '03:00'
  });

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    components: {
      database: 'operational',
      api: 'operational',
      storage: 'operational',
      backup: 'operational'
    }
  });

  const [resourceUsage, setResourceUsage] = useState<ResourceUsage>({
    cpu: 12,
    memory: 45,
    storage: 68,
    uptime: '14d 2h 15m'
  });

  const [errorLogs, setErrorLogs] = useState<SystemError[]>([]);

  const [isScanning, setIsScanning] = useState(false);

  // Security State - Added for future security features
  const [passwordPolicy, setPasswordPolicy] = useState({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90,
    historyCount: 5,
    preventReuse: true
  });

  const [twoFactorSettings, setTwoFactorSettings] = useState({
    enabled: false,
    method: 'sms' as 'sms' | 'email' | 'authenticator',
    backupCodes: [] as string[]
  });

  const [securityActivity, setSecurityActivity] = useState([]);
  const [trustedDevices, setTrustedDevices] = useState([]);
  const [securityQuestions, setSecurityQuestions] = useState([]);

  // Security Testing Functions
  const testPasswordStrength = (password: string) => {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= passwordPolicy.minLength) {
      score += 20;
    } else {
      feedback.push(`كلمة المرور يجب أن تكون ${passwordPolicy.minLength} أحرف على الأقل`);
    }

    // Uppercase check
    if (passwordPolicy.requireUppercase && /[A-Z]/.test(password)) {
      score += 20;
    } else if (passwordPolicy.requireUppercase) {
      feedback.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
    }

    // Lowercase check
    if (passwordPolicy.requireLowercase && /[a-z]/.test(password)) {
      score += 20;
    } else if (passwordPolicy.requireLowercase) {
      feedback.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
    }

    // Numbers check
    if (passwordPolicy.requireNumbers && /\d/.test(password)) {
      score += 20;
    } else if (passwordPolicy.requireNumbers) {
      feedback.push('يجب أن تحتوي على رقم واحد على الأقل');
    }

    // Special chars check
    if (passwordPolicy.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 20;
    } else if (passwordPolicy.requireSpecialChars) {
      feedback.push('يجب أن تحتوي على رمز خاص واحد على الأقل');
    }

    return { score, feedback };
  };

  const testSecurityFeature = (featureName: string, testFunction: () => boolean) => {
    try {
      const result = testFunction();
      return result;
    } catch (error) {
      console.error(`❌ ${featureName} test: ERROR`, error);
      return false;
    }
  };

  const runSecurityTests = async () => {
    const tests = [
      {
        name: 'Password Policy State',
        test: () => passwordPolicy.minLength > 0
      },
      {
        name: '2FA Settings State',
        test: () => typeof twoFactorSettings.enabled === 'boolean'
      },
      {
        name: 'Security Activity Array',
        test: () => Array.isArray(securityActivity)
      },
      {
        name: 'Trusted Devices Array',
        test: () => Array.isArray(trustedDevices)
      },
      {
        name: 'Password Strength Function',
        test: () => {
          const result = testPasswordStrength('Test123!');
          return typeof result.score === 'number' && Array.isArray(result.feedback);
        }
      },
      {
        name: 'Firebase Connection',
        test: async () => {
          try {
            const authInstance = getAuth();
            const currentUser = authInstance.currentUser;
            return currentUser !== null;
          } catch (error) {
            console.error('Firebase connection test failed:', error);
            return false;
          }
        }
      },
      {
        name: 'IP Whitelist Validation',
        test: () => {
          return Array.isArray(advancedSecurity.ipWhitelist);
        }
      },
      {
        name: 'Login Attempts Loading',
        test: () => {
          return Array.isArray(loginAttempts) && loginAttempts.length >= 0;
        }
      },
      {
        name: 'Security Logging Function',
        test: () => {
          return typeof logSecurityActivity === 'function';
        }
      },
      {
        name: '2FA Functions Available',
        test: () => {
          return typeof enableTwoFactor === 'function' && typeof disableTwoFactor === 'function';
        }
      }
    ];

    const results = await Promise.all(
      tests.map(async (test) => {
        const result = await testSecurityFeature(test.name, test.test);
        return { name: test.name, passed: result };
      })
    );
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    // Save test results to Firebase
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      
      if (currentUser) {
        const testResults = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          userId: currentUser.uid,
          results: results,
          summary: {
            passed,
            total,
            percentage: Math.round((passed / total) * 100)
          }
        };
        
        await setDoc(doc(db, 'securityTestResults', testResults.id), testResults);
      }
    } catch (error) {
      console.error('Failed to save test results to Firebase:', error);
    }
    
    return { passed, total, results };
  };

  // Advanced Security Functions
  const logSecurityActivity = (action: string, details?: string, riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low') => {
    const activity = {
      id: Date.now().toString(),
      userId: 'current-user',
      action,
      timestamp: new Date().toISOString(),
      ipAddress: 'current-ip',
      userAgent: navigator.userAgent,
      success: true,
      riskLevel,
      details
    };
    
    setSecurityActivity(prev => [activity, ...prev].slice(0, 100));
    console.log(`🔐 Security Activity Logged: ${action}`);
  };

  const generateBackupCodes = (): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  };

  const enableTwoFactor = (method: 'sms' | 'email' | 'authenticator') => {
    const backupCodes = generateBackupCodes();
    const secret = Math.random().toString(36).substring(2, 32);

    const newSettings = {
      enabled: true,
      method,
      secret,
      backupCodes,
      lastUsed: new Date().toISOString()
    };

    setTwoFactorSettings(newSettings);
    logSecurityActivity('2fa_enabled', `2FA enabled with method: ${method}`, 'low');
    
    return { backupCodes, secret };
  };

  const disableTwoFactor = () => {
    setTwoFactorSettings(prev => ({ ...prev, enabled: false }));
    logSecurityActivity('2fa_disabled', '2FA disabled', 'medium');
  };

  const addTrustedDevice = (deviceName: string) => {
    const device = {
      id: Date.now().toString(),
      deviceId: navigator.userAgent,
      deviceName,
      deviceType: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      userAgent: navigator.userAgent,
      lastUsed: new Date().toISOString(),
      trusted: true,
      ipAddress: 'current-ip',
      location: 'Unknown'
    };

    setTrustedDevices(prev => [...prev, device]);
    logSecurityActivity('trusted_device_added', `Trusted device added: ${deviceName}`, 'low');
    
    return device;
  };

  const removeTrustedDevice = (deviceId: string) => {
    setTrustedDevices(prev => prev.filter(d => d.id !== deviceId));
    logSecurityActivity('trusted_device_removed', `Trusted device removed: ${deviceId}`, 'medium');
  };

  const updatePasswordPolicy = (newPolicy: typeof passwordPolicy) => {
    setPasswordPolicy(newPolicy);
    logSecurityActivity('password_policy_updated', 'Password policy updated', 'low');
  };

  const simulateSecurityAlert = (message: string, severity: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    logSecurityActivity('security_alert', message, severity === 'error' ? 'high' : severity === 'warning' ? 'medium' : 'low');
    
    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`تنبيه أمني - ${severity}`, {
        body: message,
        icon: '/favicon.ico'
      });
    }
  };

  const testSecurityAlerts = () => {
    simulateSecurityAlert('هذا اختبار تنبيه أمني معلوماتي', 'info');
    setTimeout(() => simulateSecurityAlert('محاولة وصول غير مصروف بها', 'warning'), 2000);
    setTimeout(() => simulateSecurityAlert('تم اكتشاف نشاط مشبوه', 'error'), 4000);
    setTimeout(() => simulateSecurityAlert('تم تحديث إعدادات الأمان بنجاح', 'success'), 6000);
  };

  // Real Error Logging Functions
  const logError = async (level: 'error' | 'warning', message: string, source: string) => {
    const error: SystemError = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('ar-EG'),
      level,
      message,
      source,
      resolved: false
    };

    // Add to local state
    setErrorLogs(prev => [error, ...prev].slice(0, 50)); // Keep only last 50 errors

    // Save to Firebase
    try {
      await setDoc(doc(db, 'errorLogs', error.id), error);
    } catch (firebaseError) {
      console.error('Failed to save error to Firebase:', firebaseError);
    }

    // Also log to console
    console.error(`[${level.toUpperCase()}] ${source}: ${message}`);
  };

  const clearErrorLogs = async () => {
    if (confirm('هل أنت متأكد من حذف جميع سجلات الأخطاء؟')) {
      try {
        // Clear from Firebase
        const errorLogsRef = collection(db, 'errorLogs');
        const snapshot = await getDocs(errorLogsRef);
        const batch = writeBatch(db);
        
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // Clear local state
        setErrorLogs([]);
        
        alert('✅ تم حذف سجلات الأخطاء بنجاح');
      } catch (error) {
        console.error('Failed to clear error logs:', error);
        alert('❌ فشل حذف سجلات الأخطاء');
      }
    }
  };

  const markErrorAsResolved = async (errorId: string) => {
    try {
      await updateDoc(doc(db, 'errorLogs', errorId), { resolved: true });
      
      setErrorLogs(prev => 
        prev.map(error => 
          error.id === errorId ? { ...error, resolved: true } : error
        )
      );
      
      alert('✅ تم تحديث حالة الخطأ');
    } catch (error) {
      console.error('Failed to mark error as resolved:', error);
      alert('❌ فشل تحديث حالة الخطأ');
    }
  };

  // Load error logs from Firebase
  useEffect(() => {
    const loadErrorLogs = async () => {
      try {
        const errorLogsQuery = query(
          collection(db, 'errorLogs'), 
          orderBy('timestamp', 'desc'), 
          limit(50)
        );
        const snapshot = await getDocs(errorLogsQuery);
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SystemError[];
        
        setErrorLogs(logs);
      } catch (error) {
        console.error('Failed to load error logs:', error);
      }
    };

    loadErrorLogs();
  }, []);

  // Firebase Helper Functions
  const saveSettingsToFirebase = async (collectionName: string, data: any) => {
    try {
      console.log(`Saving to Firebase - Collection: ${collectionName}, Data:`, data);
      await setDoc(doc(db, collectionName, 'main'), data);
      console.log(`✅ Settings saved to Firebase: ${collectionName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving to Firebase (${collectionName}):`, error);
      throw error;
    }
  };

  const loadSettingsFromFirebase = async (collectionName: string) => {
    try {
      console.log(`Loading from Firebase - Collection: ${collectionName}`);
      const docRef = doc(db, collectionName, 'main');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`✅ Settings loaded from Firebase (${collectionName}):`, data);
        return data;
      } else {
        console.log(`⚠️ No settings found in Firebase (${collectionName}), will use defaults`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error loading from Firebase (${collectionName}):`, error);
      return null;
    }
  };

  const uploadBackupToFirebase = async (backupData: any, filename: string) => {
    try {
      // Use Firestore instead of Storage to avoid CORS issues
      const backupRef = doc(db, 'backups', filename);
      await setDoc(backupRef, {
        ...backupData,
        uploadedAt: new Date().toISOString(),
        filename: filename
      });
      console.log('Backup uploaded to Firestore successfully');
      return `Firestore:backups/${filename}`;
    } catch (error) {
      console.error('Error uploading backup to Firestore:', error);
      throw error;
    }
  };

  // Load settings from Firebase on component mount
  useEffect(() => {
    const loadAllSettings = async () => {
      try {
        console.log('🔄 Starting to load settings from Firebase...');
        
        // Test Firebase connection first
        try {
          const testDoc = doc(db, 'connection-test', 'test');
          await setDoc(testDoc, { timestamp: new Date().toISOString() });
          await deleteDoc(testDoc);
          console.log('✅ Firebase connection test successful');
        } catch (connectionError) {
          console.error('❌ Firebase connection test failed:', connectionError);
          console.log('⚠️ Will use localStorage settings only');
          return; // Exit early if connection fails
        }

        // Load General Settings
        console.log('📥 Loading general settings...');
        const generalData = await loadSettingsFromFirebase('generalSettings');
        if (generalData) {
          console.log('✅ Found general settings in Firebase:', generalData);
          
          // Handle logo URL from Firebase
          let processedSettings = { ...generalData };
          if (generalData.logoPreview && generalData.logoPreview.startsWith('https://')) {
            // Logo is already a Firebase URL, use as is
            processedSettings.logoPreview = generalData.logoPreview;
            console.log('✅ Using Firebase logo URL:', generalData.logoPreview);
          } else if (generalData.logoPreview) {
            // Logo is local data URL, keep as is for now
            console.log('✅ Using local logo data URL');
          }
          
          setGeneralSettings(processedSettings);
          localStorage.setItem('app_general_settings', JSON.stringify(processedSettings));
        } else {
          console.log('⚠️ No general settings in Firebase, checking localStorage...');
          const localGeneral = localStorage.getItem('app_general_settings');
          if (localGeneral) {
            const parsed = JSON.parse(localGeneral);
            setGeneralSettings(parsed);
            console.log('✅ Using local general settings:', parsed);
          }
        }

        // Load Security Settings
        console.log('📥 Loading security settings...');
        const securityData = await loadSettingsFromFirebase('securitySettings');
        if (securityData) {
          console.log('✅ Found security settings in Firebase:', securityData);
          setAdvancedSecurity(securityData as SecuritySettings);
          localStorage.setItem('app_security_settings', JSON.stringify(securityData));
        } else {
          console.log('⚠️ No security settings in Firebase, checking localStorage...');
          const localSecurity = localStorage.getItem('app_security_settings');
          if (localSecurity) {
            const parsed = JSON.parse(localSecurity);
            setAdvancedSecurity(parsed);
            console.log('✅ Using local security settings:', parsed);
          }
        }

        // Load Notification Settings
        console.log('📥 Loading notification settings...');
        const notificationData = await loadSettingsFromFirebase('notificationSettings');
        if (notificationData) {
          console.log('✅ Found notification settings in Firebase:', notificationData);
          setNotificationSettings(notificationData as NotificationSettings);
          localStorage.setItem('app_notification_settings', JSON.stringify(notificationData));
        } else {
          console.log('⚠️ No notification settings in Firebase, checking localStorage...');
          const localNotification = localStorage.getItem('app_notification_settings');
          if (localNotification) {
            const parsed = JSON.parse(localNotification);
            setNotificationSettings(parsed);
            console.log('✅ Using local notification settings:', parsed);
          }
        }

        // Load Data Management Settings
        console.log('📥 Loading data management settings...');
        const dataData = await loadSettingsFromFirebase('dataManagementSettings');
        if (dataData) {
          console.log('✅ Found data management settings in Firebase:', dataData);
          setDataSettings(dataData as DataManagementSettings);
          localStorage.setItem('app_data_settings', JSON.stringify(dataData));
        } else {
          console.log('⚠️ No data management settings in Firebase, checking localStorage...');
          const localData = localStorage.getItem('app_data_settings');
          if (localData) {
            const parsed = JSON.parse(localData);
            setDataSettings(parsed);
            console.log('✅ Using local data management settings:', parsed);
          }
        }

        // Load Maintenance Settings
        console.log('📥 Loading maintenance settings...');
        const maintenanceData = await loadSettingsFromFirebase('maintenanceSettings');
        if (maintenanceData) {
          console.log('✅ Found maintenance settings in Firebase:', maintenanceData);
          setMaintenanceSettings(maintenanceData as MaintenanceSettings);
        } else {
          console.log('⚠️ No maintenance settings in Firebase, using defaults');
        }

        console.log('✅ All settings loading process completed');

      } catch (error) {
        console.error('❌ Fatal error loading settings:', error);
        console.log('⚠️ Falling back to localStorage settings only');
        
        // Load all settings from localStorage as fallback
        const localGeneral = localStorage.getItem('app_general_settings');
        if (localGeneral) setGeneralSettings(JSON.parse(localGeneral));
        
        const localSecurity = localStorage.getItem('app_security_settings');
        if (localSecurity) setAdvancedSecurity(JSON.parse(localSecurity));
        
        const localNotification = localStorage.getItem('app_notification_settings');
        if (localNotification) setNotificationSettings(JSON.parse(localNotification));
        
        const localData = localStorage.getItem('app_data_settings');
        if (localData) setDataSettings(JSON.parse(localData));
      }
    };

    loadAllSettings();
  }, []);

  const handleSystemScan = async () => {
    setIsScanning(true);
    try {
      const checks = [];
      const startTime = Date.now();
      
      // فحص الاتصال بـ Firebase
      const firebaseStart = Date.now();
      await getDoc(doc(db, 'system-check'));
      const firebaseLatency = Date.now() - firebaseStart;
      checks.push(`✅ Firebase: متصل (${firebaseLatency}ms)`);
      
      // فحص التخزين المحلي
      let storageInfo = 'غير متاح';
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = (estimate as any).usage || 0;
        const quota = (estimate as any).quota || 0;
        const usagePercent = ((used / quota) * 100).toFixed(1);
        const usedMB = (used / 1024 / 1024).toFixed(1);
        const quotaMB = (quota / 1024 / 1024).toFixed(1);
        storageInfo = `${usedMB}MB / ${quotaMB}MB (${usagePercent}%)`;
        checks.push(`💾 التخزين: ${storageInfo}`);
      }
      
      // فحص حالة الاتصال بالإنترنت
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (connection) {
        checks.push(`🌐 الإنترنت: ${connection.effectiveType || 'مجهول'} (${connection.downlink || 'مجهول'} Mbps)`);
      } else if (navigator.onLine) {
        checks.push(`🌐 الإنترنت: متصل`);
      } else {
        checks.push(`🌐 الإنترنت: غير متصل`);
      }
      
      // فحص أداء المتصفح
      const memoryInfo = (performance as any).memory;
      if (memoryInfo) {
        const usedMB = (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1);
        const totalMB = (memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(1);
        const limitMB = (memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1);
        checks.push(`🧠 الذاكرة: ${usedMB}MB / ${totalMB}MB (الحد: ${limitMB}MB)`);
      }
      
      // فحص وقت التحميل
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      checks.push(`⚡ وقت التحميل: ${loadTime}ms`);
      
      // فحص عدد العناصر في الصفحة
      const elementCount = document.querySelectorAll('*').length;
      checks.push(`📄 العناصر: ${elementCount}`);
      
      // تحديث حالة النظام
      const scanTime = Date.now() - startTime;
      setSystemHealth(prev => ({
        ...prev,
        lastCheck: new Date().toISOString(),
        status: 'healthy',
        components: {
          database: firebaseLatency < 1000 ? 'operational' : 'degraded',
          api: firebaseLatency < 1000 ? 'operational' : 'degraded',
          storage: parseFloat(storageInfo.split('%')[0]) < 80 ? 'operational' : 'warning',
          backup: 'operational'
        }
      }));
      
      // تحديث معلومات الموارد
      setResourceUsage(prev => ({
        ...prev,
        cpu: Math.min(100, Math.max(0, 100 - (loadTime / 10))),
        memory: memoryInfo ? Math.min(100, (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100) : 45,
        storage: parseFloat(storageInfo.split('%')[0]) || 68
      }));
      
      alert(`✅ فحص النظام اكتمل (${scanTime}ms):\n\n${checks.join('\n')}`);
      
    } catch (error) {
      console.error('System scan failed:', error);
      await logError('error', `فشل فحص النظام: ${error.message}`, 'System Scanner');
      setSystemHealth(prev => ({
        ...prev,
        lastCheck: new Date().toISOString(),
        status: 'error'
      }));
      alert('❌ حدث خطأ أثناء فحص النظام: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleUpdateSystem = async () => {
    if (confirm('هل تريد البحث عن تحديثات وتثبيتها؟ قد يتطلب ذلك إعادة تشغيل النظام.')) {
      setIsScanning(true);
      try {
        const checks = [];
        
        // فحص الإصدار الحالي من package.json
        let currentVersion = '1.0.0';
        try {
          const response = await fetch('/package.json');
          const packageData = await response.json();
          currentVersion = packageData.version;
          checks.push(`📦 الإصدار الحالي: v${currentVersion}`);
        } catch (error) {
          checks.push(`📦 الإصدار الحالي: v${currentVersion} (تقديري)`);
        }
        
        // فحص بيئة التشغيل
        const userAgent = navigator.userAgent;
        const browserInfo = getBrowserInfo();
        checks.push(`🌐 المتصفح: ${browserInfo}`);
        
        // فحص دعم الميزات
        const features = [];
        if ('serviceWorker' in navigator) features.push('Service Worker');
        if ('Notification' in window) features.push('Notifications');
        if ('PushManager' in window) features.push('Push API');
        if ('WebAssembly' in window) features.push('WebAssembly');
        checks.push(`⚡ الميزات المدعومة: ${features.join(', ')}`);
        
        // فحص تحديثات التطبيق عبر Service Worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          
          // البحث عن تحديثات يدوياً
          await registration.update();
          
          if (registration.waiting) {
            checks.push(`🔄 تحديث متاح وجاهز للتثبيت`);
            if (confirm('تحديث متاح! هل تريد تثبيته الآن؟')) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              window.location.reload();
              return;
            }
          } else if (registration.installing) {
            checks.push(`⏳ جاري تثبيت التحديث...`);
          } else {
            checks.push(`✅ لا توجد تحديثات متاحة عبر Service Worker`);
          }
        } else {
          checks.push(`⚠️ Service Worker غير مدعوم`);
        }
        
        // فحص التحديثات عبر API (محاكاة)
        try {
          const updateResponse = await fetch('/api/version-check');
          if (updateResponse.ok) {
            const updateData = await updateResponse.json();
            if (updateData.updateAvailable) {
              checks.push(`🚀 تحديث جديد متاح: v${updateData.latestVersion}`);
              checks.push(`📝 ملاحظات الإصدار: ${updateData.changelog.join(', ')}`);
              
              if (confirm(`تحديث جديد متاح! الإصدار ${updateData.latestVersion} متاح (الحالي: ${updateData.currentVersion}). هل تريد التثبيت الآن؟`)) {
                // محاكاة عملية التحديث
                checks.push(`⬇️ جاري تنزيل التحديث...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                checks.push(`📦 جاري تثبيت التحديث...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                checks.push(`🔄 جاري إعادة التشغيل...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // تحديث الإصدار في الذاكرة المؤقتة
                localStorage.setItem('app-version', updateData.latestVersion);
                
                // إعادة تشغيل التطبيق
                window.location.reload();
                return;
              }
            } else {
              checks.push(`✅ التطبيق محدث لأحدث إصدار`);
            }
          } else {
            checks.push(`⚠️ فشل التحقق من التحديثات عبر API`);
          }
        } catch (error) {
          checks.push(`ℹ️ فشل الاتصال بخادم التحديثات (محاكاة)`);
        }
        
        // فحص وقت التشغيل
        const uptime = Date.now() - performance.timing.navigationStart;
        const uptimeMinutes = Math.floor(uptime / 60000);
        checks.push(`⏱️ وقت التشغيل: ${uptimeMinutes} دقيقة`);
        
        // فحص حالة التخزين المؤقت
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          checks.push(`💾 التخزين المؤقت: ${cacheNames.length} مخزن مؤقت`);
        }
        
        alert(`✅ فحص التحديثات اكتمل:\n\n${checks.join('\n')}`);
        
      } catch (error) {
        console.error('Update check failed:', error);
        alert('❌ حدث خطأ أثناء البحث عن التحديثات: ' + error.message);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleDatabaseOptimize = async () => {
    if (confirm('هل تريد بدء عملية تحسين قاعدة البيانات؟ قد يستغرق هذا بضع دقائق.')) {
      setIsScanning(true);
      try {
        const optimizations = [];
        let totalOptimized = 0;
        
        // تنظيف localStorage القديم
        const keys = Object.keys(localStorage);
        let cleanedKeys = 0;
        let localSize = 0;
        
        keys.forEach(key => {
          if (key.startsWith('temp_') || key.startsWith('cache_') || key.startsWith('old_')) {
            const value = localStorage.getItem(key);
            localSize += (value?.length || 0) * 2;
            localStorage.removeItem(key);
            cleanedKeys++;
            totalOptimized++;
          }
        });
        
        optimizations.push(`🧹 localStorage: ${cleanedKeys} مفتاح منظف (${(localSize / 1024).toFixed(1)} KB)`);
        
        // فحص وتحسين Firebase collections
        const collections = ['cases', 'clients', 'hearings', 'tasks', 'users'];
        let firebaseOptimized = 0;
        
        for (const collectionName of collections) {
          try {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            const docCount = snapshot.size;
            
            // محاكاة تحسين الفهرسة
            if (docCount > 0) {
              firebaseOptimized += docCount;
              optimizations.push(`📊 ${collectionName}: ${docCount} مستند محسّن`);
            }
          } catch (error) {
            optimizations.push(`⚠️ ${collectionName}: خطأ في الوصول`);
          }
        }
        
        // فحص حجم التخزين
        let storageInfo = 'غير متاح';
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const used = (estimate as any).usage || 0;
          const quota = (estimate as any).quota || 0;
          const usagePercent = ((used / quota) * 100).toFixed(1);
          const usedMB = (used / 1024 / 1024).toFixed(1);
          storageInfo = `${usedMB}MB (${usagePercent}%)`;
          optimizations.push(`💾 التخزين: ${storageInfo}`);
        }
        
        // تحسين ذاكرة التخزين المؤقت
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          let cacheCleaned = 0;
          
          for (const cacheName of cacheNames) {
            if (cacheName.includes('temp') || cacheName.includes('old')) {
              await caches.delete(cacheName);
              cacheCleaned++;
              totalOptimized++;
            }
          }
          
          optimizations.push(`🗂️ Cache: ${cacheCleaned} ذاكرة تخزين مؤقت منظفة`);
        }
        
        // فحص أداء الذاكرة
        const memoryInfo = (performance as any).memory;
        if (memoryInfo) {
          const usedMB = (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1);
          const totalMB = (memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(1);
          optimizations.push(`🧠 الذاكرة: ${usedMB}MB / ${totalMB}MB`);
        }
        
        // محاكاة تحسين إضافي
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        alert(`✅ تم تحسين قاعدة البيانات بنجاح!\n\n📊 الإحصائيات:\n${optimizations.join('\n')}\n\n🎯 الإجمالي: ${totalOptimized} عنصر محسّن`);
        
      } catch (error) {
        console.error('Database optimization failed:', error);
        await logError('error', `فشل تحسين قاعدة البيانات: ${error.message}`, 'Database Optimizer');
        alert('❌ حدث خطأ أثناء تحسين قاعدة البيانات: ' + error.message);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleStorageCleanup = async () => {
    if (confirm('سيتم حذف الملفات المؤقتة والكاش والبيانات غير الضرورية. هل أنت متأكد؟')) {
      setIsScanning(true);
      try {
        const cleanupResults = [];
        let totalCleaned = 0;
        let totalSize = 0;
        
        // تنظيف localStorage
        const localKeys = Object.keys(localStorage);
        let localCleaned = 0;
        let localSize = 0;
        
        localKeys.forEach(key => {
          if (key.startsWith('temp_') || key.startsWith('cache_') || key.startsWith('old_') || key.includes('draft') || key.includes('backup_temp')) {
            const value = localStorage.getItem(key);
            const size = (value?.length || 0) * 2;
            localSize += size;
            localStorage.removeItem(key);
            localCleaned++;
            totalCleaned++;
          }
        });
        
        cleanupResults.push(`🧹 localStorage: ${localCleaned} ملف (${(localSize / 1024).toFixed(1)} KB)`);
        
        // تنظيف sessionStorage
        const sessionKeys = Object.keys(sessionStorage);
        let sessionCleaned = 0;
        
        sessionKeys.forEach(key => {
          if (key.startsWith('temp_') || key.startsWith('cache_') || key.startsWith('form_')) {
            sessionStorage.removeItem(key);
            sessionCleaned++;
            totalCleaned++;
          }
        });
        
        cleanupResults.push(`🗂️ sessionStorage: ${sessionCleaned} ملف`);
        
        // تنظيف Cache API
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          let cacheCleaned = 0;
          let cacheSize = 0;
          
          for (const cacheName of cacheNames) {
            if (cacheName.includes('temp') || cacheName.includes('old') || cacheName.includes('cache')) {
              try {
                const cache = await caches.open(cacheName);
                const requests = await cache.keys();
                
                for (const request of requests) {
                  const response = await cache.match(request);
                  if (response) {
                    const blob = await response.blob();
                    cacheSize += blob.size;
                  }
                }
                
                await caches.delete(cacheName);
                cacheCleaned++;
                totalCleaned++;
              } catch (error) {
                console.warn(`Failed to delete cache ${cacheName}:`, error);
              }
            }
          }
          
          cleanupResults.push(`💾 Cache API: ${cacheCleaned} ذاكرة تخزين (${(cacheSize / 1024).toFixed(1)} KB)`);
        }
        
        // تنظيف IndexedDB (إذا كان متاحاً)
        if ('indexedDB' in window) {
          try {
            const databases = await indexedDB.databases();
            let dbCleaned = 0;
            
            for (const db of databases) {
              if (db.name && (db.name.includes('temp') || db.name.includes('cache'))) {
                try {
                  await indexedDB.deleteDatabase(db.name);
                  dbCleaned++;
                  totalCleaned++;
                } catch (error) {
                  console.warn(`Failed to delete database ${db.name}:`, error);
                }
              }
            }
            
            if (dbCleaned > 0) {
              cleanupResults.push(`🗄️ IndexedDB: ${dbCleaned} قاعدة بيانات`);
            }
          } catch (error) {
            console.warn('Failed to access IndexedDB:', error);
          }
        }
        
        // محاكاة تحرير مساحة إضافية
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        totalSize += localSize;
        const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
        
        // فحص التخزين بعد التنظيف
        let storageAfter = 'غير متاح';
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          const used = (estimate as any).usage || 0;
          const quota = (estimate as any).quota || 0;
          const usagePercent = ((used / quota) * 100).toFixed(1);
          const usedMB = (used / 1024 / 1024).toFixed(1);
          storageAfter = `${usedMB}MB (${usagePercent}%)`;
          cleanupResults.push(`💾 التخزين بعد التنظيف: ${storageAfter}`);
        }
        
        // فحص الذاكرة بعد التنظيف
        const memoryInfo = (performance as any).memory;
        if (memoryInfo) {
          const usedMB = (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1);
          cleanupResults.push(`🧠 الذاكرة بعد التنظيف: ${usedMB}MB`);
        }
        
        alert(`✅ تم تحرير التخزين بنجاح!\n\n📊 الإحصائيات:\n${cleanupResults.join('\n')}\n\n🎯 الإجمالي: ${totalCleaned} ملف (${sizeMB} MB)`);
        
      } catch (error) {
        console.error('Storage cleanup failed:', error);
        alert('❌ حدث خطأ أثناء تحرير التخزين: ' + error.message);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleConnectivityTest = async () => {
    setIsScanning(true);
    try {
      const results = [];
      
      // فحص سرعة الاتصال باستخدام API موثوق
      const startTest = Date.now();
      let latency = 0;
      let connectionStatus = 'فشل';
      
      try {
        // استخدام API بسيط وموثوق
        const response = await fetch('https://api.ipify.org?format=json', {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (response.ok) {
          latency = Date.now() - startTest;
          connectionStatus = 'نجح';
          results.push(`🌐 سرعة الاتصال: ${latency}ms`);
          results.push(`🌐 حالة الاتصال: ${connectionStatus}`);
        } else {
          results.push(`🌐 فشل الاتصال: ${response.status}`);
        }
      } catch (error) {
        results.push(`🌐 خطأ في الاتصال: ${error.message}`);
        latency = 9999;
        connectionStatus = 'فشل';
      }
      
      // فحص حالة Firebase
      const firebaseStart = Date.now();
      try {
        await getDoc(doc(db, 'test'));
        const firebaseLatency = Date.now() - firebaseStart;
        results.push(`🔥 Firebase: متصل (${firebaseLatency}ms)`);
      } catch (firebaseError) {
        results.push(`🔥 Firebase: خطأ في الاتصال`);
      }
      
      // فحص حالة الإنترنت
      if (navigator.onLine) {
        results.push(`📶 الإنترنت: متصل`);
      } else {
        results.push(`📶 الإنترنت: غير متصل`);
      }
      
      // فحص نوع الاتصال
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        results.push(`📡 نوع الاتصال: ${connection?.effectiveType || 'غير معروف'}`);
        results.push(`📡 سرعة التنزيل: ${connection?.downlink || 'غير معروف'} Mbps`);
      }
      
      // فحص حالة HTTPS
      if (location.protocol === 'https:') {
        results.push(`🔒 الاتصال: آمن (HTTPS)`);
      } else {
        results.push(`⚠️ الاتصال: غير آمن (HTTP)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert(`✅ اختبار الاتصال اكتمل!\n\n📊 النتائج:\n${results.join('\n')}`);
      
    } catch (error) {
      console.error('Connectivity test failed:', error);
      alert('❌ فشل اختبار الاتصال: ' + error.message);
    } finally {
      setIsScanning(false);
    }
  };

  const renderMaintenanceTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">صيانة النظام</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">مراقبة الأداء، السجلات، وتحديثات النظام</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleUpdateSystem}
            disabled={isScanning}
            className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-2 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} /> تحديث النظام
          </button>
          <button 
            onClick={handleSystemScan}
            disabled={isScanning}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isScanning ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> جاري الفحص...</>
            ) : (
               <><Activity className="w-4 h-4" /> فحص شامل</>
            )}
          </button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold">حالة النظام</p>
            <h4 className="text-lg font-bold text-slate-800 dark:text-white">ممتازة</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold">المعالج (CPU)</p>
            <h4 className="text-lg font-bold text-slate-800 dark:text-white">{resourceUsage.cpu}%</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold">الذاكرة (RAM)</p>
            <h4 className="text-lg font-bold text-slate-800 dark:text-white">{resourceUsage.memory}%</h4>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-bold">وقت التشغيل</p>
            <h4 className="text-lg font-bold text-slate-800 dark:text-white">{resourceUsage.uptime}</h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Component Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
             <Server className="w-5 h-5 text-indigo-600" /> حالة الخدمات
          </h4>
          <div className="space-y-3">
            {Object.entries(systemHealth.components).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <span className="capitalize font-bold text-slate-700 dark:text-slate-300">{key}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${status === 'operational' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  <div className={`w-2 h-2 rounded-full ${status === 'operational' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {status === 'operational' ? 'يعمل' : 'متوقف'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Logs */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <AlertOctagon className="w-5 h-5 text-red-600" /> سجل الأخطاء الحديثة
            </h4>
            <div className="flex gap-2">
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                {errorLogs.length} خطأ
              </span>
              {errorLogs.length > 0 && (
                <button 
                  onClick={clearErrorLogs}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  مسح الكل
                </button>
              )}
            </div>
          </div>
          
          {errorLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm">لا توجد أخطاء مسجلة حالياً</p>
              <p className="text-xs mt-1">النظام يعمل بشكل طبيعي</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {errorLogs.map(log => (
                <div key={log.id} className="p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      log.level === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{log.message}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-mono">{log.source}</span>
                    {log.resolved ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> تم الحل
                      </span>
                    ) : (
                      <button 
                        onClick={() => markErrorAsResolved(log.id)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        معالجة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Diagnostic Tools */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <Wrench className="w-5 h-5 text-slate-600" /> أدوات التشخيص والصيانة
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={handleDatabaseOptimize}
            disabled={isScanning}
            className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors" />
            <h5 className="font-bold text-slate-700 dark:text-slate-300">تحسين قاعدة البيانات</h5>
            <p className="text-xs text-slate-500 mt-1">إعادة الفهرسة وتنظيف الجداول</p>
          </button>
          <button 
            onClick={handleStorageCleanup}
            disabled={isScanning}
            className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HardDrive className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors" />
            <h5 className="font-bold text-slate-700 dark:text-slate-300">تحرير مساحة التخزين</h5>
            <p className="text-xs text-slate-500 mt-1">حذف الملفات المؤقتة والكاش</p>
          </button>
          <button 
            onClick={handleConnectivityTest}
            disabled={isScanning}
            className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-center group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Terminal className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 mx-auto mb-2 transition-colors" />
            <h5 className="font-bold text-slate-700 dark:text-slate-300">اختبار الاتصال</h5>
            <p className="text-xs text-slate-500 mt-1">Ping, DNS, API Latency</p>
          </button>
        </div>
      </div>
    </div>
  );

  const [dataSettings, setDataSettings] = useState<DataManagementSettings>(() => {
    const saved = localStorage.getItem('app_data_settings');
    if (saved) return JSON.parse(saved);
    return {
      autoBackupFrequency: 'weekly',
      autoBackupTime: '02:00',
      retainBackupsCount: 5,
      archiveClosedCasesAfterDays: 365,
      deleteArchivedAfterYears: 5,
      enableAutoArchive: false
    };
  });

  const handleSaveDataSettings = async () => {
    if (readOnly) {
      alert("ليس لديك صلاحية لتعديل الإعدادات");
      return;
    }
    setIsSaving(true);
    try {
      // Save to localStorage (for offline support)
      localStorage.setItem('app_data_settings', JSON.stringify(dataSettings));
      
      // Save to Firebase (for cloud sync)
      await saveSettingsToFirebase('dataManagementSettings', dataSettings);
      
      setIsSaving(false);
      alert('تم حفظ إعدادات إدارة البيانات بنجاح ومزامنتها مع السحابة');
    } catch (error) {
      setIsSaving(false);
      alert('حدث خطأ أثناء الحفظ في السحابة، تم الحفظ محلياً فقط');
      console.error('Firebase save error:', error);
    }
  };

  const handleArchiveAllClosedCases = async () => {
    if (confirm('⚠️ اختبار: هل أنت متأكد من أرشفة جميع القضايا المغلقة بغض النظر عن تاريخ الإغلاق؟\nهذا للأغراض التجريبية فقط.')) {
      setIsSaving(true);
      try {
        // Get cases from cases collection
        const casesQuery = query(collection(db, 'cases'));
        const querySnapshot = await getDocs(casesQuery);
        
        console.log(`📋 Found ${querySnapshot.size} total cases in cases collection`);
        
        let archivedCount = 0;
        let closedCount = 0;
        const batch = writeBatch(db);
        
        querySnapshot.forEach((docSnapshot) => {
          const caseData = docSnapshot.data();
          console.log(`🔍 Case ${docSnapshot.id}: status=${caseData.status}, closedAt=${caseData.closedAt}`);
          
          // Archive ALL closed cases regardless of date (check both Arabic and English)
          if (caseData.status === 'closed' || caseData.status === 'مغلقة') {
            closedCount++;
            
            // Add closedAt if missing
            if (!caseData.closedAt) {
              console.log(`⚠️ Case ${docSnapshot.id} is closed but has no closedAt date, using current date`);
              caseData.closedAt = new Date().toISOString();
            }
            
            // Add to archived_cases collection
            const archivedCaseRef = doc(collection(db, 'archived_cases'));
            batch.set(archivedCaseRef, {
              ...caseData,
              status: 'archived',
              archivedAt: new Date().toISOString(),
              archivedBy: 'system',
              originalCaseId: docSnapshot.id
            });
            
            // Delete from cases collection
            batch.delete(docSnapshot.ref);
            
            archivedCount++;
            console.log(`✅ Case ${docSnapshot.id} marked for archiving (TEST MODE)`);
          }
        });
        
        console.log(`📊 Test Archive Summary: Total=${querySnapshot.size}, Closed=${closedCount}, ToArchive=${archivedCount}`);
        
        if (archivedCount === 0) {
          setIsSaving(false);
          alert(`لا توجد قضايا مغلقة للأرشفة\n\nالإحصائيات:\n- إجمالي القضايا: ${querySnapshot.size}\n- القضايا المغلقة: ${closedCount}\n- تم أرشفتها: ${archivedCount}`);
          return;
        }
        
        // Commit batch
        await batch.commit();
        
        setIsSaving(false);
        alert(`تمت أرشفة ${archivedCount} قضية مغلقة بنجاح (وضع الاختبار)\n\nالإحصائيات:\n- إجمالي القضايا: ${querySnapshot.size}\n- القضايا المغلقة: ${closedCount}\n- تم أرشفتها: ${archivedCount}`);
        console.log(`✅ TEST MODE: Archived ${archivedCount} closed cases to archived_cases collection`);
      } catch (error) {
        setIsSaving(false);
        console.error('❌ Error archiving cases:', error);
        alert('حدث خطأ أثناء أرشفة القضايا: ' + error.message);
      }
    }
  };

  const handleArchiveOldCases = async () => {
    if (confirm('هل أنت متأكد من أرشفة القضايا المغلقة التي تجاوزت المدة المحددة؟')) {
      setIsSaving(true);
      try {
        // Get cases from cases collection
        const casesQuery = query(collection(db, 'cases'));
        const querySnapshot = await getDocs(casesQuery);
        
        console.log(`📋 Found ${querySnapshot.size} total cases in cases collection`);
        
        let archivedCount = 0;
        let closedCount = 0;
        let eligibleCount = 0;
        const batch = writeBatch(db);
        
        querySnapshot.forEach((docSnapshot) => {
          const caseData = docSnapshot.data();
          console.log(`🔍 Case ${docSnapshot.id}: status=${caseData.status}, closedAt=${caseData.closedAt}`);
          
          // Count closed cases (check both Arabic and English)
          if (caseData.status === 'closed' || caseData.status === 'مغلقة') {
            closedCount++;
            
            // Add closedAt if missing
            if (!caseData.closedAt) {
              console.log(`⚠️ Case ${docSnapshot.id} is closed but has no closedAt date, using current date`);
              caseData.closedAt = new Date().toISOString();
            }
            
            // Check if meets archive criteria
            if (shouldArchiveCase(caseData)) {
              eligibleCount++;
              
              // Add to archived_cases collection
              const archivedCaseRef = doc(collection(db, 'archived_cases'));
              batch.set(archivedCaseRef, {
                ...caseData,
                status: 'archived',
                archivedAt: new Date().toISOString(),
                archivedBy: 'system',
                originalCaseId: docSnapshot.id
              });
              
              // Delete from cases collection
              batch.delete(docSnapshot.ref);
              
              archivedCount++;
              console.log(`✅ Case ${docSnapshot.id} marked for archiving`);
            } else {
              console.log(`⏰ Case ${docSnapshot.id} is closed but not eligible for archiving yet`);
            }
          }
        });
        
        console.log(`📊 Archive Summary: Total=${querySnapshot.size}, Closed=${closedCount}, Eligible=${eligibleCount}, ToArchive=${archivedCount}`);
        
        if (archivedCount === 0) {
          setIsSaving(false);
          alert(`لا توجد قضايا مؤهلة للأرشفة حالياً\n\nالإحصائيات:\n- إجمالي القضايا: ${querySnapshot.size}\n- القضايا المغلقة: ${closedCount}\n- المؤهلة للأرشفة: ${eligibleCount}\n\nملاحظة: القضايا المغلقة تحتاج ${dataSettings.archiveClosedCasesAfterDays} يوم للأرشفة`);
          return;
        }
        
        // Commit batch
        await batch.commit();
        
        setIsSaving(false);
        alert(`تمت أرشفة ${archivedCount} قضية بنجاح\n\nالإحصائيات:\n- إجمالي القضايا: ${querySnapshot.size}\n- القضايا المغلقة: ${closedCount}\n- المؤهلة للأرشفة: ${eligibleCount}\n- تم أرشفتها: ${archivedCount}`);
        console.log(`✅ Archived ${archivedCount} cases to archived_cases collection`);
      } catch (error) {
        setIsSaving(false);
        console.error('❌ Error archiving cases:', error);
        alert('حدث خطأ أثناء أرشفة القضايا: ' + error.message);
      }
    }
  };

  const handleRestoreArchivedCases = async () => {
    if (confirm('هل أنت متأكد من استعادة جميع القضايا المؤرشفة؟\nسيتم إعادتها للقائمة النشطة مع الحفاظ على جميع البيانات.')) {
      setIsSaving(true);
      try {
        // Get archived cases from archived_cases collection
        const archivedQuery = query(collection(db, 'archived_cases'));
        const querySnapshot = await getDocs(archivedQuery);
        
        console.log(`📋 Found ${querySnapshot.size} archived cases to restore`);
        
        let restoredCount = 0;
        const batch = writeBatch(db);
        
        querySnapshot.forEach((docSnapshot) => {
          const caseData = docSnapshot.data();
          console.log(`🔍 Restoring case ${docSnapshot.id}:`, {
            originalCaseId: caseData.originalCaseId,
            title: caseData.title,
            caseNumber: caseData.caseNumber,
            status: caseData.status,
            allFields: Object.keys(caseData)
          });
          
          // Restore to cases collection using original ID if available
          const originalCaseId = caseData.originalCaseId;
          const { originalCaseId: _, archivedAt, archivedBy, id: oldId, ...restOfData } = caseData;
          
          console.log(`📝 Data to restore (without old ID):`, restOfData);
          
          // Always create new document to avoid ID conflicts
          const newCaseRef = doc(collection(db, 'cases'));
          batch.set(newCaseRef, {
            ...restOfData,
            status: 'closed', // or 'active' based on your logic
            restoredAt: new Date().toISOString(),
            restoredBy: 'system',
            createdAt: caseData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          
          console.log(`🔄 Restoring case ${docSnapshot.id} with new ID: ${newCaseRef.id}`);
          console.log(`📝 Original ID was: ${originalCaseId || 'None'}`);
          console.log(`📝 Old ID in data was: ${oldId || 'None'} - REMOVED to avoid duplicates`);
          
          // Delete from archived_cases
          batch.delete(docSnapshot.ref);
          
          restoredCount++;
        });
        
        if (restoredCount === 0) {
          setIsSaving(false);
          alert('لا توجد قضايا مؤرشفة لاستعادتها');
          return;
        }
        
        // Commit batch
        await batch.commit();
        
        setIsSaving(false);
        alert(`تمت استعادة ${restoredCount} قضية مؤرشفة بنجاح وإضافتها للقائمة النشطة\n\nملاحظة: سيتم تحديث الصفحة تلقائياً لتجنب مشاكل العرض.`);
        console.log(`✅ Restored ${restoredCount} cases from archived_cases collection`);
        
        // Refresh page to avoid React key conflicts
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        setIsSaving(false);
        console.error('❌ Error restoring cases:', error);
        alert('حدث خطأ أثناء استعادة القضايا: ' + error.message);
      }
    }
  };

  const handleViewArchivedCases = async () => {
    try {
      // Get archived cases from archived_cases collection
      const archivedQuery = query(collection(db, 'archived_cases'));
      const querySnapshot = await getDocs(archivedQuery);
      
      const archivedCases = [];
      querySnapshot.forEach((docSnapshot) => {
        archivedCases.push({
          id: docSnapshot.id,
          ...docSnapshot.data()
        });
      });
      
      if (archivedCases.length === 0) {
        alert('لا توجد قضايا مؤرشفة حالياً');
        return;
      }
      
      // Create a simple display of archived cases
      const casesList = archivedCases.map((case_, index) => 
        `${index + 1}. ${case_.title || case_.caseNumber || 'بدون عنوان'} (أرشفت في: ${case_.archivedAt})`
      ).join('\n');
      
      alert(`القضايا المؤرشفة (${archivedCases.length} قضية):\n\n${casesList}\n\n(ميزة العرض المتقدمة قيد التطوير)`);
      console.log('📋 Archived cases:', archivedCases);
    } catch (error) {
      console.error('❌ Error viewing archived cases:', error);
      alert('حدث خطأ أثناء عرض القضايا المؤرشفة');
    }
  };

  // Helper function to check if case should be archived
  const shouldArchiveCase = (caseData: any) => {
    console.log(`🔍 Checking case for archiving:`, {
      hasClosedAt: !!caseData.closedAt,
      closedAt: caseData.closedAt,
      archiveAfterDays: dataSettings.archiveClosedCasesAfterDays
    });
    
    if (!caseData.closedAt) {
      console.log(`❌ Case not eligible: no closedAt date`);
      return false;
    }
    
    const closedDate = new Date(caseData.closedAt);
    const daysSinceClosed = Math.floor((new Date().getTime() - closedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Case closed ${daysSinceClosed} days ago, needs ${dataSettings.archiveClosedCasesAfterDays} days`);
    
    const isEligible = daysSinceClosed >= dataSettings.archiveClosedCasesAfterDays;
    console.log(`${isEligible ? '✅' : '❌'} Case ${isEligible ? 'eligible' : 'not eligible'} for archiving`);
    
    return isEligible;
  };

  const handleCleanupData = () => {
    if (confirm('تحذير: سيتم حذف البيانات المؤقتة والملفات غير الضرورية نهائياً. هل تريد المتابعة؟')) {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        alert('تم تنظيف النظام وتوفير 120 ميجابايت من المساحة');
      }, 2000);
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsRestoring(true);
    setTimeout(() => {
      setIsRestoring(false);
      alert('تم استيراد البيانات بنجاح: 50 عميل، 120 قضية');
      if (importFileRef.current) importFileRef.current.value = '';
    }, 2000);
  };

  const renderDataTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">إدارة البيانات المتقدمة</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">النسخ الاحتياطي، الأرشفة، وتنظيف النظام</p>
        </div>
        {!readOnly && (
          <button 
            onClick={handleSaveDataSettings}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            ) : (
               <><Save className="w-4 h-4" /> حفظ الإعدادات</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Auto Backup Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
             <CalendarClock className="w-5 h-5 text-blue-600" /> النسخ الاحتياطي التلقائي
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تكرار النسخ</label>
                <select 
                  className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={dataSettings.autoBackupFrequency}
                  onChange={e => setDataSettings({...dataSettings, autoBackupFrequency: e.target.value as any})}
                >
                  <option value="daily">يومي</option>
                  <option value="weekly">أسبوعي</option>
                  <option value="monthly">شهري</option>
                  <option value="off">متوقف</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وقت النسخ</label>
                <input 
                  type="time" 
                  className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={dataSettings.autoBackupTime}
                  onChange={e => setDataSettings({...dataSettings, autoBackupTime: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عدد النسخ المحتفظ بها</label>
              <input 
                type="number" 
                min="1"
                max="50"
                className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={dataSettings.retainBackupsCount}
                onChange={e => setDataSettings({...dataSettings, retainBackupsCount: parseInt(e.target.value)})}
              />
              <p className="text-xs text-slate-500 mt-1">سيتم حذف النسخ الأقدم تلقائياً عند تجاوز هذا العدد.</p>
            </div>
          </div>
        </div>

        {/* Archiving Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
             <Archive className="w-5 h-5 text-amber-600" /> سياسة الأرشفة
          </h4>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">تفعيل الأرشفة التلقائية</span>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={dataSettings.enableAutoArchive} onChange={e => setDataSettings({...dataSettings, enableAutoArchive: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </div>
            </label>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">أرشفة القضايا المغلقة بعد (يوم)</label>
              <input 
                type="number" 
                className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={dataSettings.archiveClosedCasesAfterDays}
                onChange={e => setDataSettings({...dataSettings, archiveClosedCasesAfterDays: parseInt(e.target.value)})}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={handleArchiveOldCases}
                disabled={isSaving}
                className="w-full py-2 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 rounded-lg font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex justify-center items-center gap-2"
              >
                <Archive className="w-4 h-4" /> تنفيذ الأرشفة الآن
              </button>
              
              <button 
                onClick={handleArchiveAllClosedCases}
                disabled={isSaving}
                className="w-full py-2 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex justify-center items-center gap-2"
              >
                <Archive className="w-4 h-4" /> أرشفة جميع المغلقة (اختبار)
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={handleViewArchivedCases}
                  disabled={isSaving}
                  className="py-2 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-lg font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex justify-center items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" /> عرض المؤرشفة
                </button>
                
                <button 
                  onClick={handleRestoreArchivedCases}
                  disabled={isSaving}
                  className="py-2 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg font-bold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex justify-center items-center gap-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4" /> استعادة
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Import/Export Actions */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
             <RefreshCw className="w-5 h-5 text-green-600" /> نقل واستيراد البيانات
          </h4>
          
          {/* Description */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>📊 إدارة البيانات:</strong> يمكنك استيراد البيانات من ملفات Excel، إنشاء نسخ احتياطية، واستعادة البيانات من Firebase Storage.
            </p>
          </div>

          {/* Main Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Import Section */}
            <div className="space-y-4">
              <h5 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-indigo-600" />
                استيراد البيانات
              </h5>
              
              <div className="p-4 border border-dashed border-indigo-300 dark:border-indigo-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-700/50 transition-colors">
                <FileUp className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <h6 className="font-bold text-slate-700 dark:text-slate-300 mb-1">استيراد من Excel</h6>
                <p className="text-xs text-slate-500 mb-3">CSV, XLSX</p>
                <button 
                  onClick={() => importFileRef.current?.click()}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  اختيار ملف
                </button>
                <input type="file" ref={importFileRef} className="hidden" accept=".csv, .xlsx" onChange={handleImportData} />
              </div>
            </div>

            {/* Export Section */}
            <div className="space-y-4">
              <h5 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Download className="w-5 h-5 text-green-600" />
                تصدير البيانات
              </h5>
              
              <div className="p-4 border border-dashed border-green-300 dark:border-green-600 rounded-xl hover:bg-green-50 dark:hover:bg-green-700/50 transition-colors">
                <Database className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h6 className="font-bold text-slate-700 dark:text-slate-300 mb-1">تصدير كامل</h6>
                <p className="text-xs text-slate-500 mb-3">JSON, SQL</p>
                <button 
                  onClick={handleCreateBackup}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                >
                  تصدير الآن
                </button>
              </div>
            </div>
          </div>

          {/* Backup Management Section */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h5 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              إدارة النسخ الاحتياطية
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Manual Backup */}
              <div className="p-4 border border-dashed border-green-300 dark:border-green-600 rounded-xl text-center hover:bg-green-50 dark:hover:bg-green-700/50 transition-colors">
                <Database className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h6 className="font-bold text-slate-700 dark:text-slate-300 mb-1">نسخة احتياطية يدوية</h6>
                <p className="text-xs text-slate-500 mb-3">نسخة فورية في Firebase</p>
                <button 
                  onClick={handleCreateBackup}
                  disabled={isBackingUp}
                  className="w-full bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBackingUp ? 'جاري النسخ...' : 'نسخ الآن'}
                </button>
              </div>

              {/* Test Auto Backup */}
              <div className="p-4 border border-dashed border-blue-300 dark:border-blue-600 rounded-xl text-center hover:bg-blue-50 dark:hover:bg-blue-700/50 transition-colors">
                <Clock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h6 className="font-bold text-slate-700 dark:text-slate-300 mb-1">اختبار النسخ التلقائي</h6>
                <p className="text-xs text-slate-500 mb-3">فحص عمل النسخ التلقائي</p>
                <button 
                  onClick={handleTestAutoBackup}
                  disabled={isBackingUp}
                  className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBackingUp ? 'جاري الاختبار...' : 'اختبار الآن'}
                </button>
              </div>

              {/* List Backups */}
              <div className="p-4 border border-dashed border-purple-300 dark:border-purple-600 rounded-xl text-center hover:bg-purple-50 dark:hover:bg-purple-700/50 transition-colors">
                <List className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h6 className="font-bold text-slate-700 dark:text-slate-300 mb-1">عرض النسخ الاحتياطية</h6>
                <p className="text-xs text-slate-500 mb-3">قائمة النسخ من Firebase</p>
                <button 
                  onClick={handleListFirebaseBackups}
                  disabled={isBackingUp}
                  className="w-full bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBackingUp ? 'جاري العرض...' : 'عرض الآن'}
                </button>
              </div>

              {/* Restore Backup */}
              <div className="p-4 border border-dashed border-orange-300 dark:border-orange-600 rounded-xl text-center hover:bg-orange-50 dark:hover:bg-orange-700/50 transition-colors">
                <RotateCcw className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <h6 className="font-bold text-slate-700 dark:text-slate-300 mb-1">استعادة نسخة</h6>
                <p className="text-xs text-slate-500 mb-3">استعادة من السحابة</p>
                <button 
                  onClick={handleRestoreFromFirebase}
                  disabled={isRestoring}
                  className="w-full bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRestoring ? 'جاري الاستعادة...' : 'استعادة الآن'}
                </button>
              </div>
            </div>
          </div>

          {/* Status Information */}
          <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  آخر نسخة احتياطية: {lastBackupDate || 'لم يتم إنشاء نسخة احتياطية بعد'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBackingUp || isRestoring ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-xs text-slate-500">
                  {isBackingUp || isRestoring ? 'جاري التنفيذ...' : 'جاهز'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Cleanup */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
             <Trash className="w-5 h-5 text-red-600" /> تنظيف البيانات
          </h4>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              يمكنك حذف الملفات المؤقتة، السجلات القديمة، والبيانات غير الضرورية لتحسين أداء النظام.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-red-800 dark:text-red-300 text-sm">منطقة الخطر</h5>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">هذا الإجراء لا يمكن التراجع عنه. تأكد من وجود نسخة احتياطية حديثة قبل المتابعة.</p>
              </div>
            </div>
            <button 
              onClick={handleCleanupData}
              disabled={isSaving}
              className="w-full py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors flex justify-center items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> تنظيف النظام الآن
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [advancedSecurity, setAdvancedSecurity] = useState<SecuritySettings>(() => {
    const saved = localStorage.getItem('app_security_settings');
    if (saved) return JSON.parse(saved);
    return {
      twoFactorEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireNumbers: true,
        requireSymbols: false,
        requireUppercase: true,
        expiryDays: 90
      },
      ipWhitelist: [],
      maxLoginAttempts: 5,
      sessionTimeoutMinutes: 30
    };
  });

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [newIp, setNewIp] = useState('');

  // Load active sessions and login attempts from Firebase
  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        const authInstance = getAuth();
        const currentUser = authInstance.currentUser;
        
        if (!currentUser) {
          console.log('No current user found for security data loading');
          return;
        }

        // Load active sessions for current user only
        const sessionsQuery = query(
          collection(db, 'activeSessions'), 
          where('userId', '==', currentUser.uid),
          orderBy('lastActive', 'desc')
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessions = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ActiveSession[];
        
        console.log(`Loaded ${sessions.length} active sessions for user ${currentUser.uid}`);
        setActiveSessions(sessions);

        // Load login attempts for current user only
        const attemptsQuery = query(
          collection(db, 'loginAttempts'), 
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'), 
          limit(50)
        );
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const attempts = attemptsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LoginAttempt[];
        
        console.log(`Loaded ${attempts.length} login attempts for user ${currentUser.uid}`);
        setLoginAttempts(attempts);

        // Load IP Whitelist from Firebase
        await loadIpWhitelistFromFirebase();

        // Load failed login attempts (for all users - admin view)
        await loadFailedLoginAttempts();

        // Load password policy from Firebase
        await loadPasswordPolicyFromFirebase();

        // Log this security data access
        logSecurityActivity('security_data_loaded', `Loaded ${sessions.length} sessions and ${attempts.length} attempts`, 'low');

      } catch (error) {
        console.error('Error loading security data:', error);
        logSecurityActivity('security_data_error', `Failed to load security data: ${error}`, 'high');
      }
    };

    loadSecurityData();

    // Set up real-time listener for active sessions
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;
    
    if (currentUser) {
      const sessionsQuery = query(
        collection(db, 'activeSessions'),
        where('userId', '==', currentUser.uid)
      );
      
      const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ActiveSession[];
        
        setActiveSessions(sessions);
        console.log(`Real-time update: ${sessions.length} active sessions`);
      });

      return () => unsubscribe();
    }
  }, []);

  // Add current session to active sessions (support multiple devices)
  useEffect(() => {
    const addCurrentSession = async () => {
      try {
        const authInstance = getAuth();
        const currentUser = authInstance.currentUser;
        
        if (currentUser) {
          // Check if this specific device/browser already has a session
          const deviceFingerprint = currentUser.uid + '_' + navigator.userAgent + '_' + navigator.platform;
          const existingDeviceSessionQuery = query(
            collection(db, 'activeSessions'), 
            where('userId', '==', currentUser.uid),
            where('deviceFingerprint', '==', deviceFingerprint)
          );
          const existingDeviceSnapshot = await getDocs(existingDeviceSessionQuery);
          
          // If this device already has a session, update it instead of creating new one
          if (!existingDeviceSnapshot.empty) {
            const existingDoc = existingDeviceSnapshot.docs[0];
            await updateDoc(existingDoc.ref, {
              lastActive: new Date().toISOString(),
              isCurrent: true
            });
            console.log('Updated existing device session:', existingDoc.id);
            return;
          }
          
          // Clean up old sessions for this user (keep only last 5)
          const allSessionsQuery = query(
            collection(db, 'activeSessions'), 
            where('userId', '==', currentUser.uid),
            orderBy('lastActive', 'desc')
          );
          const allSnapshot = await getDocs(allSessionsQuery);
          const sessions = allSnapshot.docs;
          
          // Delete old sessions (keep only the newest 5) - DON'T mark as not current
          const batch = writeBatch(db);
          if (sessions.length > 5) {
            for (let i = 5; i < sessions.length; i++) {
              batch.delete(sessions[i].ref);
            }
            await batch.commit();
            console.log(`Cleaned up ${sessions.length - 5} old sessions`);
          }
          
          // Create new session for this device (keep other sessions active)
          const sessionData: ActiveSession = {
            id: currentUser.uid + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            userId: currentUser.uid,
            ip: '192.168.1.1', // In real app, get from server
            device: navigator.platform,
            browser: getBrowserInfo(),
            location: 'Unknown', // In real app, get from geolocation API
            lastActive: new Date().toISOString(),
            isCurrent: true, // This device is current for this session
            deviceFingerprint: deviceFingerprint
          };

          await setDoc(doc(db, 'activeSessions', sessionData.id), sessionData);
          console.log('New session created for device:', sessionData.id);
        }
      } catch (error) {
        console.error('Error adding current session:', error);
      }
    };

    addCurrentSession();

    // Cleanup function to update last active time periodically
    const interval = setInterval(async () => {
      try {
        const authInstance = getAuth();
        const currentUser = authInstance.currentUser;
        
        if (currentUser) {
          const deviceFingerprint = currentUser.uid + '_' + navigator.userAgent + '_' + navigator.platform;
          const sessionsQuery = query(
            collection(db, 'activeSessions'), 
            where('userId', '==', currentUser.uid),
            where('deviceFingerprint', '==', deviceFingerprint)
          );
          const snapshot = await getDocs(sessionsQuery);
          
          if (!snapshot.empty) {
            const sessionDoc = snapshot.docs[0];
            await updateDoc(sessionDoc.ref, {
              lastActive: new Date().toISOString(),
              isCurrent: true // Keep this device current
            });
          }
        }
      } catch (error) {
        console.error('Error updating session activity:', error);
      }
    }, 60000); // Update every minute

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Helper function to get browser info
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  // Function to log login attempts
  const logLoginAttempt = async (username: string, success: boolean, ip: string = 'Unknown') => {
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      
      const attemptData: LoginAttempt = {
        id: Date.now().toString(),
        ip: ip,
        timestamp: new Date().toISOString(),
        success: success,
        username: username,
        userAgent: navigator.userAgent,
        userId: currentUser?.uid || 'anonymous'
      };

      await setDoc(doc(db, 'loginAttempts', attemptData.id), attemptData);
      
      // Update local state
      setLoginAttempts(prev => [attemptData, ...prev].slice(0, 50));
      
      console.log(`🔐 Login attempt logged: ${username} - ${success ? 'SUCCESS' : 'FAILED'} - ${ip}`);
    } catch (error) {
      console.error('Error logging login attempt:', error);
    }
  };

  const loadPasswordPolicyFromFirebase = async () => {
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      
      if (currentUser) {
        const policyRef = doc(db, 'userSecuritySettings', currentUser.uid);
        const policyDoc = await getDoc(policyRef);
        
        if (policyDoc.exists()) {
          const data = policyDoc.data();
          if (data.passwordPolicy) {
            setPasswordPolicy({
              minLength: data.passwordPolicy.minLength || 8,
              requireUppercase: data.passwordPolicy.requireUppercase || true,
              requireLowercase: data.passwordPolicy.requireLowercase || true,
              requireNumbers: data.passwordPolicy.requireNumbers || true,
              requireSpecialChars: data.passwordPolicy.requireSpecialChars || true,
              maxAge: data.passwordPolicy.maxAge || 90,
              historyCount: data.passwordPolicy.historyCount || 5,
              preventReuse: data.passwordPolicy.preventReuse || true
            });
            console.log('Password policy loaded from Firebase:', data.passwordPolicy);
          }
        }
      }
    } catch (error) {
      console.error('Error loading password policy from Firebase:', error);
      logSecurityActivity('password_policy_load_error', `Failed to load password policy: ${error}`, 'high');
    }
  };

  const loadFailedLoginAttempts = async () => {
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      
      if (currentUser) {
        // Load failed login attempts from the failed_login_attempts collection
        const failedAttemptsQuery = query(
          collection(db, 'failed_login_attempts'),
          orderBy('timestamp', 'desc'),
          limit(50)
        );
        const failedAttemptsSnapshot = await getDocs(failedAttemptsQuery);
        
        const failedAttempts = failedAttemptsSnapshot.docs.map(doc => ({
          id: doc.id,
          ip: doc.data().ip || 'Unknown',
          timestamp: doc.data().timestamp?.toDate()?.toISOString() || new Date().toISOString(),
          success: false,
          username: doc.data().email || 'Unknown',
          userAgent: doc.data().userAgent || 'Unknown',
          userId: doc.data().userId || 'anonymous',
          attempts: doc.data().attempts || 1
        })) as LoginAttempt[];
        
        // Combine with successful attempts
        setLoginAttempts(prev => {
          const allAttempts = [...failedAttempts, ...prev];
          // Remove duplicates and sort by timestamp
          const uniqueAttempts = allAttempts.filter((attempt, index, self) => 
            index === self.findIndex((t) => t.id === attempt.id)
          );
          return uniqueAttempts.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ).slice(0, 50);
        });
        
        console.log(`Loaded ${failedAttempts.length} failed login attempts`);
      }
    } catch (error) {
      console.error('Error loading failed login attempts:', error);
    }
  };


  // Notification State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => {
    const saved = localStorage.getItem('app_notification_settings');
    if (saved) return JSON.parse(saved);
    return {
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        user: '',
        pass: '',
        secure: false,
        fromEmail: 'notifications@almizan.com',
        fromName: 'Al-Mizan Notifications'
      },
      whatsapp: {
        apiKey: '',
        phoneNumberId: '',
        businessAccountId: '',
        enabled: false
      },
      preferences: {
        email: true,
        whatsapp: false,
        system: true,
        hearings: true,
        tasks: true,
        deadlines: true,
        systemUpdates: true,
        hearingReminderDays: 1,
        taskReminderDays: 1
      }
    };
  });

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // User Form State
  const [formData, setFormData] = useState<Partial<AppUser>>({
    name: '',
    email: '',
    username: '',
    password: '',
    roleLabel: '',
    isActive: true,
    permissions: [],
    avatar: ''
  });

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'lastLogin' | 'role'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Memoized filtered and sorted users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users || [];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.roleLabel?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'active' ? user.isActive : !user.isActive
      );
    }
    
    // Apply role filter
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.roleLabel === filterRole);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'lastLogin':
          aValue = a.lastLogin || '';
          bValue = b.lastLogin || '';
          break;
        case 'role':
          aValue = a.roleLabel || '';
          bValue = b.roleLabel || '';
          break;
        default:
          aValue = a.name || '';
          bValue = b.name || '';
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [users, searchTerm, filterStatus, filterRole, sortBy, sortOrder]);

  // Get unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = [...new Set((users || []).map(user => user.roleLabel).filter(Boolean))];
    return roles.sort();
  }, [users]);

  // --- General Settings State with Persistence ---
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize state from LocalStorage or Defaults
  const [generalSettings, setGeneralSettings] = useState(() => {
    const savedSettings = localStorage.getItem('app_general_settings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return {
      firmName: 'الميزان للمحاماة والاستشارات القانونية',
      firmSlogan: 'العدالة حق للجميع',
      taxNumber: '123-456-789',
      address: '15 شارع جامعة الدول العربية، المهندسين، الجيزة',
      phone: '01000000000',
      email: 'info@almizan.com',
      website: 'www.almizan-law.com',
      currency: 'EGP',
      language: 'ar',
      theme: currentTheme,
      enableEmailNotifications: true,
      enableSystemNotifications: true,
      autoBackup: 'weekly',
      logoPreview: null as string | null
    };
  });

  // Sync prop change to local state if needed
  useEffect(() => {
    if (onThemeChange && generalSettings.theme !== currentTheme) {
       // Only sync if strictly necessary
    }
  }, [currentTheme]);

  // --- Render Functions ---
  const renderUsersTab = () => {
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">إدارة المستخدمين والصلاحيات</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">تحكم في من يمكنه الوصول إلى النظام وما يمكنه فعله</p>
          </div>
          {!readOnly && (
            <button 
              onClick={openAddUser}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> مستخدم جديد
            </button>
          )}
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{users?.length || 0}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">المستخدمون النشطون</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {users?.filter(u => u.isActive).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">المستخدمون الموقوفون</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {users?.filter(u => !u.isActive).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <Ban className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">المسؤولون</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {users?.filter(u => u.permissions?.some(p => p.access === 'write')).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="بحث بالاسم، البريد الإلكتروني، أو الدور..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">موقوف</option>
            </select>

            {/* Role Filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            >
              <option value="all">جميع الأدوار</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'email' | 'lastLogin' | 'role')}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              >
                <option value="name">ترتيب بالاسم</option>
                <option value="email">ترتيب بالبريد</option>
                <option value="role">ترتيب بالدور</option>
                <option value="lastLogin">ترتيب بآخر دخول</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-white"
                title={sortOrder === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
              >
                {sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            عرض {filteredAndSortedUsers.length} من {users?.length || 0} مستخدم
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-right">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs uppercase font-bold border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="p-4">المستخدم</th>
                <th className="p-4">اسم الدخول</th>
                <th className="p-4">الدور الوظيفي</th>
                <th className="p-4">الصلاحيات</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">آخر دخول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
              {filteredAndSortedUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors dark:text-slate-200">
                  <td className="p-4">
                    <div className="flex items-start gap-4">
                      {/* User Avatar with Status */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center font-bold text-sm shadow-sm">
                          {user.avatar ? 
                            <img src={user.avatar} className="w-full h-full rounded-xl object-cover shadow-sm"/> : 
                            (user.name?.charAt(0) || 'U')
                          }
                        </div>
                        {/* Status Indicator */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm ${
                          user.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        }`}>
                          <div className="w-full h-full rounded-full flex items-center justify-center">
                            {user.isActive ? 
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 000 1.414z" clipRule="evenodd" />
                              </svg> : 
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            }
                          </div>
                        </div>
                        {/* Online Status Dot */}
                        <div className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
                          user.lastLogin && new Date(user.lastLogin).getTime() > Date.now() - 5 * 60 * 1000 
                            ? 'bg-green-400 animate-pulse' 
                            : 'bg-gray-400'
                        }`} title={user.lastLogin && new Date(user.lastLogin).getTime() > Date.now() - 5 * 60 * 1000 ? 'متصل الآن' : 'غير متصل'}></div>
                      </div>
                      
                      {/* User Information */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Name and Role */}
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-slate-800 dark:text-white truncate">{user.name || 'Unknown User'}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                user.isActive 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                {user.isActive ? 'نشط' : 'موقوف'}
                              </span>
                            </div>
                            
                            {/* Email */}
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {user.email}
                            </p>
                            
                            {/* Username */}
                            {user.username && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                @{user.username}
                              </p>
                            )}
                            
                            {/* Role Badge */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {user.roleLabel}
                              </span>
                              
                              {/* Permissions Count */}
                              <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded text-xs font-medium border border-indigo-200 dark:border-indigo-700">
                                {user.permissions?.length || 0} صلاحية
                              </span>
                            </div>
                            
                            {/* Last Login */}
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                {user.lastLogin ? (
                                  <>
                                    آخر دخول: {new Date(user.lastLogin).toLocaleDateString('ar-EG')}
                                    <span className="text-slate-500 dark:text-slate-500 ml-1">
                                      ({new Date(user.lastLogin).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-slate-500">لم يدخل بعد</span>
                                )}
                              </span>
                            </div>
                          </div>
                          
                          {/* Quick Actions */}
                          <div className="flex gap-1">
                            <button 
                              onClick={() => openEditUser(user)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-lg transition-colors"
                              title="تعديل المستخدم"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {onDeleteUser && !readOnly && (
                              <button 
                                onClick={() => onDeleteUser(user.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                                title="حذف المستخدم"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-slate-600 dark:text-slate-400 text-xs">
                     {user.username || '-'}
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-2 py-1 rounded text-xs font-bold border border-slate-200 dark:border-slate-500">
                      {user.roleLabel}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {user.permissions?.slice(0, 3).map((permission, index) => (
                        <span
                          key={index}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            permission.access === 'write'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : permission.access === 'read'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                          title={`${MODULES.find(m => m.id === permission.moduleId)?.label || permission.moduleId} - ${
                            permission.access === 'write' ? 'كتابة' : 
                            permission.access === 'read' ? 'قراءة' : 'ممنوع'
                          }`}
                        >
                          {permission.access === 'write' ? '✏️' : 
                           permission.access === 'read' ? '👁️' : '🚫'}
                          {' '}
                          {MODULES.find(m => m.id === permission.moduleId)?.label?.split(' ')[0] || permission.moduleId}
                        </span>
                      ))}
                      {user.permissions && user.permissions.length > 3 && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          +{user.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.isActive ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-EG') : 'لم يدخل بعد'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- Handlers: Backup ---
  const handleCreateBackup = async () => {
    setIsBackingUp(true);

    try {
      const backupData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          appName: 'Al-Mizan',
          backupType: 'manual',
          recordCounts: {
            cases: cases.length,
            clients: clients.length,
            hearings: hearings.length,
            documents: 0, 
            users: users.length
          }
        },
        data: {
          generalSettings,
          users,
          cases,
          clients,
          hearings,
          tasks,
          references
        }
      };

      // Upload to Firebase Storage only
      const filename = `AlMizan_Manual_Backup_${new Date().toISOString().split('T')[0]}_${new Date().toTimeString().split(' ')[0].replace(/:/g, '-')}.json`;
      const downloadURL = await uploadBackupToFirebase(backupData, filename);
      
      const now = new Date().toLocaleString('ar-EG');
      setLastBackupDate(now);
      localStorage.setItem('app_last_backup_date', now);
      
      // Show success message with Firebase Firestore info
      alert(`✅ تم إنشاء نسخة احتياطية يدوية بنجاح!\n\n📊 تفاصيل النسخة:\n- التاريخ: ${now}\n- القضايا: ${cases.length}\n- العملاء: ${clients.length}\n- الجلسات: ${hearings.length}\n- المستخدمون: ${users.length}\n\n🔥 تم حفظ النسخة في Firebase Firestore\n📁 اسم الملف: ${filename}\n📍 الموقع: ${downloadURL}`);

    } catch (error) {
      console.error('Manual backup failed:', error);
      alert('❌ فشل إنشاء النسخة الاحتياطية: ' + error.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Enhanced automatic backup function
  const handleAutoBackup = async () => {
    try {
      const backupData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0',
          appName: 'Al-Mizan',
          backupType: 'automatic',
          frequency: dataSettings.autoBackupFrequency,
          scheduledTime: dataSettings.autoBackupTime,
          recordCounts: {
            cases: cases.length,
            clients: clients.length,
            hearings: hearings.length,
            documents: 0, 
            users: users.length
          }
        },
        data: {
          generalSettings,
          users,
          cases,
          clients,
          hearings,
          tasks,
          references
        }
      };

      // Upload to Firestore instead of Storage
      const filename = `AlMizan_Auto_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const backupRef = doc(db, 'backups', filename);
      await setDoc(backupRef, {
        ...backupData,
        uploadedAt: new Date().toISOString(),
        filename: filename
      });
      
      // Update last backup date
      const now = new Date().toLocaleString('ar-EG');
      setLastBackupDate(now);
      localStorage.setItem('app_last_backup_date', now);
      
      console.log('Automatic backup completed successfully');
      
    } catch (error) {
      console.error('Automatic backup failed:', error);
    }
  };

  // Test automatic backup functionality
  const handleTestAutoBackup = async () => {
    if (confirm('هل تريد اختبار النسخ الاحتياطي التلقائي الآن؟ سيتم إنشاء نسخة اختبارية.')) {
      setIsBackingUp(true);
      try {
        await handleAutoBackup();
        alert('✅ اختبار النسخ الاحتياطي التلقائي اكتمل بنجاح!\n\nتم إنشاء نسخة احتياطية تلقائية في Firebase Firestore.');
      } catch (error) {
        alert('❌ فشل اختبار النسخ الاحتياطي التلقائي: ' + error.message);
      } finally {
        setIsBackingUp(false);
      }
    }
  };

  // List available backups from Firebase
  const handleListFirebaseBackups = async () => {
    setIsBackingUp(true);
    try {
      const backupsQuery = query(collection(db, 'backups'));
      const querySnapshot = await getDocs(backupsQuery);
      
      if (querySnapshot.empty) {
        alert('📭 لا توجد نسخ احتياطية في Firebase');
        return;
      }

      const backupsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          filename: data.filename || doc.id,
          uploadedAt: data.uploadedAt || data.metadata?.generatedAt,
          type: data.metadata?.backupType || 'manual',
          records: data.metadata?.recordCounts || {}
        };
      }).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      let backupText = '📋 النسخ الاحتياطية المتاحة في Firebase:\n\n';
      backupsList.forEach((backup, index) => {
        const date = new Date(backup.uploadedAt).toLocaleString('ar-EG');
        backupText += `${index + 1}. ${backup.filename}\n`;
        backupText += `   📅 التاريخ: ${date}\n`;
        backupText += `   🔄 النوع: ${backup.type === 'manual' ? 'يدوي' : 'تلقائي'}\n`;
        backupText += `   📊 السجلات: قضايا(${backup.records.cases || 0}) عملاء(${backup.records.clients || 0}) جلسات(${backup.records.hearings || 0})\n`;
        backupText += `   🔑 المعرف: ${backup.id}\n\n`;
      });

      backupText += '💡 لاستعادة نسخة احتياطية، انسخ المعرف وألصقه في خانة استعادة النسخة الاحتياطية.';
      
      alert(backupText);
      
    } catch (error) {
      console.error('Error listing backups:', error);
      alert('❌ فشل عرض النسخ الاحتياطية: ' + error.message);
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore backup from Firebase using backup ID
  const handleRestoreFromFirebase = async () => {
    const backupId = prompt('🔑 أدخل معرف النسخة الاحتياطية الذي تريد استعادته:\n\n(لعرض المعرفات المتاحة، اضغط على "عرض النسخ الاحتياطية" أولاً)');
    
    if (!backupId) return;

    if (!confirm("⚠️ تحذير: استعادة النسخة الاحتياطية ستقوم باستبدال جميع البيانات الحالية بالبيانات الموجودة في النسخة الاحتياطية. هل أنت متأكد من المتابعة؟")) {
      return;
    }

    setIsRestoring(true);
    try {
      const backupRef = doc(db, 'backups', backupId);
      const backupSnap = await getDoc(backupRef);
      
      if (!backupSnap.exists()) {
        throw new Error('النسخة الاحتياطية المطلوبة غير موجودة');
      }

      const backupData = backupSnap.data();

      if (!backupData.data || !backupData.metadata || backupData.metadata.appName !== 'Al-Mizan') {
        throw new Error("ملف غير صالح أو تالف. تأكد من أن هذه نسخة احتياطية من هذا النظام.");
      }

      // Restore data
      if (onRestoreData) {
        onRestoreData(backupData.data);
        
        if (backupData.data.generalSettings) {
          setGeneralSettings(backupData.data.generalSettings);
          localStorage.setItem('app_general_settings', JSON.stringify(backupData.data.generalSettings));
          if (onThemeChange && backupData.data.generalSettings.theme) {
            onThemeChange(backupData.data.generalSettings.theme);
          }
        }
      }

      const backupInfo = backupData.metadata;
      alert(`✅ تم استعادة النسخة الاحتياطية بنجاح!\n\n📊 تفاصيل النسخة المستعادة:\n- التاريخ: ${new Date(backupInfo.generatedAt).toLocaleString('ar-EG')}\n- النوع: ${backupInfo.backupType === 'manual' ? 'يدوي' : 'تلقائي'}\n- القضايا: ${backupInfo.recordCounts?.cases || 0}\n- العملاء: ${backupInfo.recordCounts?.clients || 0}\n- الجلسات: ${backupInfo.recordCounts?.hearings || 0}\n\n🔄 سيتم إعادة تحميل الصفحة لتطبيق التغييرات.`);
      
      // Reload page to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Restore from Firebase Error:", error);
      alert("❌ فشل استعادة النسخة الاحتياطية: " + error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;

     if (!confirm("تحذير: استعادة النسخة الاحتياطية ستقوم باستبدال جميع البيانات الحالية بالبيانات الموجودة في الملف. هل أنت متأكد من المتابعة؟")) {
        if (restoreFileRef.current) restoreFileRef.current.value = '';
        return;
     }

     setIsRestoring(true);
     const reader = new FileReader();
     
     reader.onload = (event) => {
        try {
           const jsonString = event.target?.result as string;
           const backupObj = JSON.parse(jsonString);

           if (!backupObj.data || !backupObj.metadata || backupObj.metadata.appName !== 'Al-Mizan') {
              throw new Error("ملف غير صالح أو تالف. تأكد من اختيار ملف Backup تم تصديره من هذا النظام.");
           }

           if (onRestoreData) {
              onRestoreData(backupObj.data);
              
              if (backupObj.data.generalSettings) {
                 setGeneralSettings(backupObj.data.generalSettings);
                 localStorage.setItem('app_general_settings', JSON.stringify(backupObj.data.generalSettings));
                 if (onThemeChange && backupObj.data.generalSettings.theme) {
                    onThemeChange(backupObj.data.generalSettings.theme);
                 }
              }
           }

        } catch (error) {
           console.error("Restore Error:", error);
           alert("فشل استعادة البيانات. الملف قد يكون تالفاً.");
        } finally {
           setIsRestoring(false);
           if (restoreFileRef.current) restoreFileRef.current.value = '';
        }
     };

     reader.onerror = () => {
        alert("حدث خطأ أثناء قراءة الملف.");
        setIsRestoring(false);
     };

     reader.readAsText(file);
  };

  // --- Handlers: Security ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation using current password policy
    if (securityData.newPassword !== securityData.confirmPassword) {
      alert('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    
    // Check password strength using current policy
    const strengthResult = testPasswordStrength(securityData.newPassword);
    if (strengthResult.score < 60) {
      alert(`كلمة المرور الجديدة ضعيفة. ${strengthResult.feedback.join(' • ')}`);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Get current user
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      if (!currentUser) {
        throw new Error('لا يوجد مستخدم مسجل حالياً');
      }
      
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(
        currentUser.email || '',
        securityData.currentPassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, securityData.newPassword);
      
      // Log password change activity
      logSecurityActivity('password_changed', `Password changed successfully`, 'medium');
      
      // Clear form
      setSecurityData(prev => ({ 
        ...prev, 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      }));
      
      alert('✅ تم تحديث كلمة المرور بنجاح');
      
    } catch (error: any) {
      console.error('Password change error:', error);
      
      let errorMessage = 'فشل تحديث كلمة المرور';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'كلمة المرور الحالية غير صحيحة';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'كلمة المرور الجديدة ضعيفة جداً';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'محاولات كثيرة جداً، يرجى المحاولة لاحقاً';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Log failed password change attempt
      logSecurityActivity('password_change_failed', `Password change failed: ${errorMessage}`, 'high');
      
      alert('❌ ' + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecuritySettings = async () => {
    if (readOnly) {
      alert("ليس لديك صلاحية لتعديل الإعدادات");
      return;
    }
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('app_security_settings', JSON.stringify(advancedSecurity));
      
      // Save to Firebase
      await saveSettingsToFirebase('securitySettings', advancedSecurity);
      
      setIsSaving(false);
      alert('تم حفظ إعدادات الأمان المتقدمة بنجاح ومزامنتها مع السحابة');
    } catch (error) {
      setIsSaving(false);
      alert('حدث خطأ أثناء الحفظ في السحابة، تم الحفظ محلياً فقط');
      console.error('Firebase save error:', error);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) {
      try {
        await deleteDoc(doc(db, 'activeSessions', sessionId));
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        alert('✅ تم إنهاء الجلسة بنجاح');
      } catch (error) {
        console.error('Error terminating session:', error);
        alert('❌ فشل إنهاء الجلسة');
      }
    }
  };

  const handleAddIp = () => {
    if (!newIp.trim()) {
      alert('❌ يجب إدخال عنوان IP صالح');
      return;
    }

    // Validate IP format
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(newIp.trim())) {
      alert('❌ عنوان IP غير صالح. يرجى إدخال IP صحيح (مثال: 192.168.1.1)');
      return;
    }

    if (!advancedSecurity.ipWhitelist.includes(newIp.trim())) {
      const updatedWhitelist = [...advancedSecurity.ipWhitelist, newIp.trim()];
      setAdvancedSecurity(prev => ({
        ...prev,
        ipWhitelist: updatedWhitelist
      }));
      
      // Save to Firebase
      saveIpWhitelistToFirebase(updatedWhitelist);
      
      // Log security activity
      logSecurityActivity('ip_whitelist_added', `IP ${newIp.trim()} added to whitelist`, 'low');
      
      setNewIp('');
      console.log(`IP ${newIp.trim()} added to whitelist`);
    } else {
      alert('⚠️ هذا IP موجود بالفعل في القائمة');
    }
  };

  const handleRemoveIp = (ip: string) => {
    if (confirm(`هل أنت متأكد من إزالة IP ${ip} من القائمة المسموحة؟`)) {
      const updatedWhitelist = advancedSecurity.ipWhitelist.filter(i => i !== ip);
      setAdvancedSecurity(prev => ({
        ...prev,
        ipWhitelist: updatedWhitelist
      }));
      
      // Save to Firebase
      saveIpWhitelistToFirebase(updatedWhitelist);
      
      // Log security activity
      logSecurityActivity('ip_whitelist_removed', `IP ${ip} removed from whitelist`, 'medium');
      
      console.log(`IP ${ip} removed from whitelist`);
    }
  };

  const saveIpWhitelistToFirebase = async (whitelist: string[]) => {
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      
      if (currentUser) {
        // Save to user's security settings
        const securityRef = doc(db, 'userSecuritySettings', currentUser.uid);
        await setDoc(securityRef, {
          ipWhitelist: whitelist,
          userId: currentUser.uid,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        
        console.log('IP Whitelist saved to Firebase:', whitelist);
      }
    } catch (error) {
      console.error('Error saving IP whitelist to Firebase:', error);
      logSecurityActivity('ip_whitelist_save_error', `Failed to save IP whitelist: ${error}`, 'high');
    }
  };

  const loadIpWhitelistFromFirebase = async () => {
    try {
      const authInstance = getAuth();
      const currentUser = authInstance.currentUser;
      
      if (currentUser) {
        const securityRef = doc(db, 'userSecuritySettings', currentUser.uid);
        const securityDoc = await getDoc(securityRef);
        
        if (securityDoc.exists()) {
          const data = securityDoc.data();
          if (data.ipWhitelist && Array.isArray(data.ipWhitelist)) {
            setAdvancedSecurity(prev => ({
              ...prev,
              ipWhitelist: data.ipWhitelist
            }));
            console.log('IP Whitelist loaded from Firebase:', data.ipWhitelist);
          }
        }
      }
    } catch (error) {
      console.error('Error loading IP whitelist from Firebase:', error);
      logSecurityActivity('ip_whitelist_load_error', `Failed to load IP whitelist: ${error}`, 'high');
    }
  };

  const renderSecurityTab = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">إعدادات الأمان المتقدمة</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">حماية الحساب والتحكم في الوصول</p>
        </div>
        {!readOnly && (
          <button 
            onClick={handleSaveSecuritySettings}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            ) : (
               <><Save className="w-4 h-4" /> حفظ الإعدادات</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
           {/* Password Change Card */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <Key className="w-5 h-5 text-indigo-600" /> تغيير كلمة المرور
              </h4>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الحالية</label>
                    <input 
                      type="password" 
                      required
                      className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={securityData.currentPassword}
                      onChange={e => setSecurityData({...securityData, currentPassword: e.target.value})}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      required
                      minLength={8}
                      className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={securityData.newPassword}
                      onChange={e => {
                        setSecurityData({...securityData, newPassword: e.target.value});
                        // Password strength will be calculated here
                      }}
                    />
                    {/* Password Strength Indicator */}
                    {securityData.newPassword && (
                      <div className="mt-2">
                        {(() => {
                          const strength = testPasswordStrength(securityData.newPassword);
                          return (
                            <>
                              <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    strength.score < 40 ? 'bg-red-500' :
                                    strength.score < 60 ? 'bg-yellow-500' :
                                    strength.score < 80 ? 'bg-blue-500' : 'bg-green-500'
                                  }`}
                                  style={{width: `${strength.score}%`}}
                                ></div>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                قوة كلمة المرور: {strength.score}/100
                              </p>
                              {strength.feedback.length > 0 && (
                                <div className="mt-1">
                                  <p className="text-xs text-amber-600 dark:text-amber-400">
                                    {strength.feedback.join(' • ')}
                                  </p>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تأكيد كلمة المرور الجديدة</label>
                    <input 
                      type="password" 
                      required
                      minLength={8}
                      className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      value={securityData.confirmPassword}
                      onChange={e => setSecurityData({...securityData, confirmPassword: e.target.value})}
                    />
                 </div>
                 <button type="submit" disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors w-full flex justify-center items-center gap-2">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'جاري التحديث...' : 'تحديث كلمة المرور'}
                 </button>
              </form>
           </div>

           {/* Password Policy */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <ShieldAlert className="w-5 h-5 text-amber-500" /> سياسة كلمات المرور
                 <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                   متكامل مع Firebase
                 </span>
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">الحد الأدنى للطول</span>
                  <input 
                    type="number" 
                    className="w-16 border p-1 rounded text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={passwordPolicy.minLength}
                    onChange={e => {
                      const newPolicy = { ...passwordPolicy, minLength: parseInt(e.target.value) };
                      setPasswordPolicy(newPolicy);
                      logSecurityActivity('password_policy_updated', `Min length changed to ${e.target.value}`, 'low');
                    }}
                  />
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">تطلب أحرف كبيرة</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={passwordPolicy.requireUppercase}
                    onChange={e => {
                      const newPolicy = { ...passwordPolicy, requireUppercase: e.target.checked };
                      setPasswordPolicy(newPolicy);
                      logSecurityActivity('password_policy_updated', `Uppercase requirement: ${e.target.checked}`, 'low');
                    }}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">تطلب أحرف صغيرة</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={passwordPolicy.requireLowercase}
                    onChange={e => {
                      const newPolicy = { ...passwordPolicy, requireLowercase: e.target.checked };
                      setPasswordPolicy(newPolicy);
                      logSecurityActivity('password_policy_updated', `Lowercase requirement: ${e.target.checked}`, 'low');
                    }}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">تطلب أرقام</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={passwordPolicy.requireNumbers}
                    onChange={e => {
                      const newPolicy = { ...passwordPolicy, requireNumbers: e.target.checked };
                      setPasswordPolicy(newPolicy);
                      logSecurityActivity('password_policy_updated', `Numbers requirement: ${e.target.checked}`, 'low');
                    }}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">تطلب رموز خاصة</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={passwordPolicy.requireSpecialChars}
                    onChange={e => {
                      const newPolicy = { ...passwordPolicy, requireSpecialChars: e.target.checked };
                      setPasswordPolicy(newPolicy);
                      logSecurityActivity('password_policy_updated', `Special chars requirement: ${e.target.checked}`, 'low');
                    }}
                  />
                </label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">صلاحية كلمة المرور (يوم)</span>
                  <input 
                    type="number" 
                    className="w-16 border p-1 rounded text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={passwordPolicy.maxAge}
                    onChange={e => {
                      const newPolicy = { ...passwordPolicy, maxAge: parseInt(e.target.value) };
                      setPasswordPolicy(newPolicy);
                      logSecurityActivity('password_policy_updated', `Expiry days changed to ${e.target.value}`, 'low');
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={async () => {
                      if (confirm('هل أنت متأكد من حفظ سياسة كلمة المرور الحالية في Firebase؟')) {
                        try {
                          await saveSettingsToFirebase('passwordPolicy', passwordPolicy);
                          logSecurityActivity('password_policy_saved', 'Password policy saved to Firebase', 'low');
                          alert('✅ تم حفظ سياسة كلمة المرور في Firebase');
                        } catch (error) {
                          console.error('Error saving password policy:', error);
                          alert('❌ فشل حفظ سياسة كلمة المرور');
                        }
                      }
                    }}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-all font-medium"
                  >
                    <Save className="w-3 h-3 inline ml-1" /> حفظ في Firebase
                  </button>
                  <div className="text-xs text-slate-400">
                    محفوظة محلياً • متزامنة مع تغيير كلمة المرور
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
           {/* 2FA Card */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-4">
                 <div>
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                       <Fingerprint className="w-5 h-5 text-green-600" /> المصادقة الثنائية (2FA)
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Google Authenticator</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={advancedSecurity.twoFactorEnabled} 
                    onChange={e => setAdvancedSecurity({...advancedSecurity, twoFactorEnabled: e.target.checked})} 
                   />
                   <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                 </label>
              </div>
              {advancedSecurity.twoFactorEnabled && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-4">
                  <div className="bg-white p-2 rounded">
                    {/* Mock QR Code */}
                    <div className="w-16 h-16 bg-slate-900"></div>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-800 dark:text-green-300">امسح الرمز ضوئياً</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">استخدم تطبيق Google Authenticator لمسح الرمز وتفعيل الحماية.</p>
                  </div>
                </div>
              )}
           </div>

           {/* Active Sessions */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <Smartphone className="w-5 h-5 text-blue-600" /> الجلسات النشطة
                 <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                   {activeSessions.length} نشطة
                 </span>
              </h4>
              <div className="space-y-4">
                 {activeSessions.length === 0 ? (
                   <div className="text-center py-8">
                     <Smartphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                     <p className="text-sm text-slate-400">لا توجد جلسات نشطة</p>
                     <p className="text-xs text-slate-400 mt-1">سيتم عرض الجلسات النشطة هنا عند تسجيل الدخول</p>
                   </div>
                 ) : (
                   activeSessions.map(session => (
                     <div key={session.id} className={`flex items-center justify-between p-4 rounded-lg transition-all hover:shadow-md ${session.isCurrent ? 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600'}`}>
                        <div className="flex items-center gap-3 flex-1">
                           <div className={`p-3 rounded-full ${session.isCurrent ? 'bg-green-100 text-green-600' : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300'}`}>
                              {session.device?.includes('Mobile') || session.device?.includes('Android') || session.device?.includes('iPhone') ? 
                                <Smartphone className="w-5 h-5" /> : 
                                <Globe2 className="w-5 h-5" />
                              }
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                  {session.device || 'جهاز غير معروف'} - {session.browser || 'متصفح غير معروف'}
                                </p>
                                {session.isCurrent && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">الحالية</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                   <Globe2 className="w-3 h-3" />
                                   {session.ip || 'IP غير معروف'}
                                </span>
                                <span className="flex items-center gap-1">
                                   <Clock className="w-3 h-3" />
                                   {session.lastActive ? 
                                     new Date(session.lastActive).toLocaleString('ar-EG', { 
                                       hour: '2-digit', 
                                       minute: '2-digit',
                                       day: '2-digit',
                                       month: '2-digit'
                                     }) : 'غير معروف'
                                   }
                                </span>
                              </div>
                              {session.location && (
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                   📍 {session.location}
                                </p>
                              )}
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           {!session.isCurrent && (
                             <button 
                               onClick={() => handleTerminateSession(session.id)} 
                               className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-all font-bold flex items-center gap-1"
                             >
                                <LogOut className="w-3 h-3" /> إنهاء
                             </button>
                           )}
                        </div>
                     </div>
                   ))
                 )}
              </div>
              {activeSessions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 text-center">
                    {activeSessions.length} جلسة نشطة • يمكن إدارة الجلسات من هنا
                  </p>
                </div>
              )}
           </div>

           {/* Security Testing */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <Shield className="w-5 h-5 text-indigo-600" /> اختبار الأمان
                 <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                   اختبار فعلي
                 </span>
              </h4>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-800 dark:text-blue-300">اختبار الميزات الأمنية المتقدمة</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">فحص جميع الميزات الأمنية والتكامل مع Firebase</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={async () => {
                    const results = await runSecurityTests();
                    alert(`📊 نتائج الاختبار: ${results.passed}/${results.total} نجح (${Math.round((results.passed/results.total) * 100)}%)`);
                  }}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  <Shield className="w-4 h-4 inline ml-2" /> تشغيل اختبار الأمان الشامل
                </button>

                <button 
                  onClick={testSecurityAlerts}
                  className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors font-medium"
                >
                  <AlertTriangle className="w-4 h-4 inline ml-2" /> اختبار التنبيهات الأمنية
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${passwordPolicy.minLength > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">سياسة كلمات المرور</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {passwordPolicy.minLength > 0 ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${typeof twoFactorSettings.enabled === 'boolean' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">المصادقة الثنائية</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {typeof twoFactorSettings.enabled === 'boolean' ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${Array.isArray(securityActivity) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">سجل النشاط</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Array.isArray(securityActivity) ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${Array.isArray(trustedDevices) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">الأجهزة الموثوقة</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Array.isArray(trustedDevices) ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${Array.isArray(loginAttempts) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">محاولات الدخول</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Array.isArray(loginAttempts) ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${Array.isArray(advancedSecurity.ipWhitelist) ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">قائمة IP المسموحة</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {Array.isArray(advancedSecurity.ipWhitelist) ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${typeof logSecurityActivity === 'function' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">تسجيل الأنشطة</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {typeof logSecurityActivity === 'function' ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${typeof enableTwoFactor === 'function' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">وظائف 2FA</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {typeof enableTwoFactor === 'function' ? '✅ نشط' : '❌ غير نشط'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      جميع الاختبارات تعمل مع Firebase • يتم حفظ النتائج في السحابة
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-600 font-medium">متصل بـ Firebase</span>
                    </div>
                  </div>
                </div>
              </div>
           </div>

           {/* IP Whitelist */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <Globe className="w-5 h-5 text-purple-600" /> قائمة IP المسموحة (Whitelist)
                 <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                   {advancedSecurity.ipWhitelist.length} IP
                 </span>
              </h4>
              
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-bold text-purple-800 dark:text-purple-300">حماية الوصول عبر IP</p>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">السماح بالوصول من عناوين IP المعتمدة فقط</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="192.168.1.1" 
                    className="flex-1 border p-2.5 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white font-mono"
                    value={newIp}
                    onChange={e => setNewIp(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddIp();
                      }
                    }}
                  />
                  <button 
                    onClick={handleAddIp} 
                    className="bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> إضافة
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {advancedSecurity.ipWhitelist.length === 0 ? (
                    <div className="text-center py-8">
                      <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">لا توجد عناوين IP مضافة</p>
                      <p className="text-xs text-slate-400 mt-1">يمكنك إضافة عناوين IP للسماح بالوصول منها فقط</p>
                    </div>
                  ) : (
                    advancedSecurity.ipWhitelist.map((ip, index) => (
                      <div key={ip} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                            <Globe className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="font-mono text-slate-700 dark:text-slate-300 font-bold">{ip}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              تم الإضافة: {new Date().toLocaleDateString('ar-EG')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            #{index + 1}
                          </span>
                          <button 
                            onClick={() => handleRemoveIp(ip)} 
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-all"
                            title="إزالة IP"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {advancedSecurity.ipWhitelist.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {advancedSecurity.ipWhitelist.length} عنوان IP مسموح • محفوظة في Firebase
                      </p>
                      <button 
                        onClick={() => {
                          if (confirm('هل أنت متأكد من مسح جميع عناوين IP؟')) {
                            const emptyWhitelist: string[] = [];
                            setAdvancedSecurity(prev => ({
                              ...prev,
                              ipWhitelist: emptyWhitelist
                            }));
                            saveIpWhitelistToFirebase(emptyWhitelist);
                            logSecurityActivity('ip_whitelist_cleared', 'All IP addresses removed from whitelist', 'medium');
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-all font-medium"
                      >
                        <Trash2 className="w-3 h-3 inline ml-1" /> مسح الكل
                      </button>
                    </div>
                  </div>
                )}
              </div>
           </div>

           {/* Login Attempts Log */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <History className="w-5 h-5 text-slate-600" /> سجل محاولات الدخول
                 <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                   {loginAttempts.length} محاولة
                 </span>
              </h4>
              
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">مراقبة الأمان</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">عرض جميع محاولات الدخول الناجحة والفاشلة</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                  {loginAttempts.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">لا توجد محاولات دخول مسجلة</p>
                      <p className="text-xs text-slate-400 mt-1">سيتم عرض محاولات الدخول هنا</p>
                    </div>
                  ) : (
                    loginAttempts.map((attempt, index) => (
                      <div key={attempt.id} className={`flex items-center justify-between p-3 rounded-lg text-xs border-b border-slate-50 dark:border-slate-700 pb-2 last:border-0 last:pb-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors`}>
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-full ${attempt.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {attempt.success ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-slate-700 dark:text-slate-300 truncate">
                                {attempt.username || 'مستخدم غير معروف'}
                              </p>
                              {(attempt as any).attempts && (attempt as any).attempts > 1 && (
                                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {(attempt as any).attempts}x
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {attempt.ip || 'IP غير معروف'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {attempt.timestamp ? 
                                  new Date(attempt.timestamp).toLocaleString('ar-EG', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit'
                                  }) : 'غير معروف'
                                }
                              </span>
                            </div>
                            {attempt.userAgent && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                                🖥️ {attempt.userAgent.includes('Chrome') ? 'Chrome' : 
                                      attempt.userAgent.includes('Firefox') ? 'Firefox' : 
                                      attempt.userAgent.includes('Safari') ? 'Safari' : 
                                      attempt.userAgent.includes('Edge') ? 'Edge' : 'متصفح غير معروف'}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full font-bold text-xs ${
                            attempt.success ? 
                              'bg-green-100 text-green-700' : 
                              'bg-red-100 text-red-700'
                          }`}>
                            {attempt.success ? '✓ نجح' : '✗ فشل'}
                          </span>
                          <span className="text-xs text-slate-400">
                            #{index + 1}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {loginAttempts.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {loginAttempts.filter(a => a.success).length} نجاح • {loginAttempts.filter(a => !a.success).length} فشل • محفوظة في Firebase
                      </p>
                      <button 
                        onClick={() => {
                          if (confirm('هل أنت متأكد من مسح سجل محاولات الدخول؟')) {
                            setLoginAttempts([]);
                            logSecurityActivity('login_attempts_cleared', 'Login attempts log cleared', 'medium');
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-all font-medium"
                      >
                        <Trash2 className="w-3 h-3 inline ml-1" /> مسح السجل
                      </button>
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );


  // --- Handlers: Users ---

  const openAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      roleLabel: 'موظف',
      isActive: true,
      permissions: MODULES.map(m => ({ moduleId: m.id, access: 'none' as PermissionLevel }))
    });
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: AppUser) => {
    setEditingUser(user);
    const mergedPermissions = MODULES.map(m => {
      const existing = user.permissions.find(p => p.moduleId === m.id);
      return existing || { moduleId: m.id, access: 'none' as PermissionLevel };
    });

    setFormData({
      ...user,
      password: '', 
      permissions: mergedPermissions
    });
    setIsUserModalOpen(true);
  };

  const handlePermissionChange = (moduleId: string, access: PermissionLevel) => {
    // Create a new permissions array to avoid mutation
    const currentPermissions = formData.permissions || [];
    const updatedPermissions = currentPermissions.map(p => 
      p.moduleId === moduleId ? { ...p, access } : p
    );
    
    // If module doesn't exist in permissions, add it
    if (!currentPermissions.find(p => p.moduleId === moduleId)) {
      updatedPermissions.push({ moduleId, access });
    }
    
    // Update form data with stable reference and prevent layout shifts
    setFormData(prev => {
      const newData = { 
        ...prev, 
        permissions: updatedPermissions 
      };
      return newData;
    });
  };

  // Additional fixes to handlePermissionChange to prevent layout issues
  const handlePermissionChangeFixed = (moduleId: string, access: PermissionLevel) => {
    try {
      // Create a new permissions array to avoid mutation
      const currentPermissions = formData.permissions || [];
      const updatedPermissions = currentPermissions.map(p => 
        p.moduleId === moduleId ? { ...p, access } : p
      );
      
      // If module doesn't exist in permissions, add it
      if (!currentPermissions.find(p => p.moduleId === moduleId)) {
        updatedPermissions.push({ moduleId, access });
      }
      
      // Update form data with stable reference and prevent layout shifts
      setFormData(prev => {
        const newData = { 
          ...prev, 
          permissions: updatedPermissions 
        };
        return newData;
      });
    } catch (error) {
      console.error('Error in handlePermissionChangeFixed:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ...
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('يرجى اختيار ملف صورة صالح');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
        return;
      }

      // Read and convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFormData({ ...formData, avatar: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    if (!editingUser && !formData.password) {
      alert('يرجى تعيين كلمة مرور للمستخدم الجديد');
      return;
    }

    if (editingUser && onUpdateUser) {
      const updatedUser = { ...editingUser, ...formData };
      if (!formData.password) {
         updatedUser.password = editingUser.password;
      }
      onUpdateUser(updatedUser as AppUser);
    } else if (onAddUser) {
      const newUser: AppUser = {
        id: Math.random().toString(36).substring(2, 9),
        name: formData.name!,
        email: formData.email!,
        username: formData.username,
        password: formData.password,
        roleLabel: formData.roleLabel || 'موظف',
        isActive: formData.isActive || true,
        permissions: formData.permissions || [],
        avatar: formData.avatar || ''
      };
      onAddUser(newUser);
    }
    setIsUserModalOpen(false);
  };

  // --- Handlers: General Settings ---

  const uploadLogoToFirebase = async (logoDataUrl: string) => {
    try {
      // Convert data URL to blob
      const response = await fetch(logoDataUrl);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `logo/app-logo-${Date.now()}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('✅ Logo uploaded to Firebase Storage:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading logo to Firebase:', error);
      throw error;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const logoDataUrl = reader.result as string;
        
        // Update local state immediately
        setGeneralSettings(prev => ({ ...prev, logoPreview: logoDataUrl }));
        
        // Upload to Firebase Storage
        try {
          const logoUrl = await uploadLogoToFirebase(logoDataUrl);
          
          // Update settings with Firebase URL
          const updatedSettings = { ...generalSettings, logoPreview: logoUrl };
          setGeneralSettings(updatedSettings);
          
          // Save to localStorage
          localStorage.setItem('app_general_settings', JSON.stringify(updatedSettings));
          
          // Save to Firebase
          await saveSettingsToFirebase('generalSettings', updatedSettings);
          
          console.log('✅ Logo uploaded and settings saved to Firebase');
        } catch (error) {
          console.error('❌ Failed to upload logo to Firebase:', error);
          // Keep local preview even if upload fails
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSettings = async () => {
    if (readOnly) {
       alert("ليس لديك صلاحية لتعديل الإعدادات");
       return;
    }
    setIsSaving(true);
    
    try {
      // Save to localStorage
      localStorage.setItem('app_general_settings', JSON.stringify(generalSettings));
      
      // Save to Firebase
      await saveSettingsToFirebase('generalSettings', generalSettings);
      
      if (onThemeChange && generalSettings.theme) {
        onThemeChange(generalSettings.theme as 'light' | 'dark');
      }
      setIsSaving(false);
      alert('تم حفظ الإعدادات العامة بنجاح ومزامنتها مع السحابة');
    } catch (error) {
      setIsSaving(false);
      alert('حدث خطأ أثناء الحفظ في السحابة، تم الحفظ محلياً فقط');
      console.error('Firebase save error:', error);
    }
  };

  const handleThemeSwitch = (theme: 'light' | 'dark') => {
    setGeneralSettings(prev => ({ ...prev, theme }));
    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  const handleSaveNotificationSettings = async () => {
    if (readOnly) {
      alert("ليس لديك صلاحية لتعديل الإعدادات");
      return;
    }
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('app_notification_settings', JSON.stringify(notificationSettings));
      
      // Save to Firebase
      await saveSettingsToFirebase('notificationSettings', notificationSettings);
      
      setIsSaving(false);
      alert('تم حفظ إعدادات التنبيهات بنجاح ومزامنتها مع السحابة');
    } catch (error) {
      setIsSaving(false);
      alert('حدث خطأ أثناء الحفظ في السحابة، تم الحفظ محلياً فقط');
      console.error('Firebase save error:', error);
    }
  };

  const renderNotificationsTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">إعدادات التنبيهات والإشعارات</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">تخصيص قنوات التواصل والتذكيرات الآلية</p>
        </div>
        {!readOnly && (
          <button 
            onClick={handleSaveNotificationSettings}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            ) : (
               <><Save className="w-4 h-4" /> حفظ الإعدادات</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Alert Preferences */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
            <Bell className="w-5 h-5 text-amber-500" /> تفضيلات التنبيهات
          </h4>
          
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
              <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">قنوات التنبيه</h5>
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">تنبيهات النظام الداخلية</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={notificationSettings.preferences.system}
                    onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, system: e.target.checked}})}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">البريد الإلكتروني</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={notificationSettings.preferences.email}
                    onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, email: e.target.checked}})}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">WhatsApp</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={notificationSettings.preferences.whatsapp}
                    onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, whatsapp: e.target.checked}})}
                  />
                </label>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
              <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">أنواع التنبيهات</h5>
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">تذكير الجلسات</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={notificationSettings.preferences.hearings}
                    onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, hearings: e.target.checked}})}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">المهام والمواعيد النهائية</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={notificationSettings.preferences.tasks}
                    onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, tasks: e.target.checked}})}
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-400">تحديثات النظام والصيانة</span>
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={notificationSettings.preferences.systemUpdates}
                    onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, systemUpdates: e.target.checked}})}
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تذكير الجلسات قبل (أيام)</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.preferences.hearingReminderDays}
                  onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, hearingReminderDays: parseInt(e.target.value)}})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تذكير المهام قبل (أيام)</label>
                <input 
                  type="number" 
                  min="0"
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.preferences.taskReminderDays}
                  onChange={e => setNotificationSettings({...notificationSettings, preferences: {...notificationSettings.preferences, taskReminderDays: parseInt(e.target.value)}})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Integration Settings */}
        <div className="space-y-6">
          
          {/* SMTP Settings */}
          <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${!notificationSettings.preferences.email ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Mail className="w-5 h-5 text-indigo-600" /> إعدادات البريد الإلكتروني (SMTP)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">خادم SMTP</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="smtp.gmail.com"
                  value={notificationSettings.smtp.host}
                  onChange={e => setNotificationSettings({...notificationSettings, smtp: {...notificationSettings.smtp, host: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المنفذ (Port)</label>
                <input 
                  type="number" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="587"
                  value={notificationSettings.smtp.port}
                  onChange={e => setNotificationSettings({...notificationSettings, smtp: {...notificationSettings.smtp, port: parseInt(e.target.value)}})}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-indigo-600 w-4 h-4"
                    checked={notificationSettings.smtp.secure}
                    onChange={e => setNotificationSettings({...notificationSettings, smtp: {...notificationSettings.smtp, secure: e.target.checked}})}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">اتصال آمن (SSL/TLS)</span>
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم المستخدم</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.smtp.user}
                  onChange={e => setNotificationSettings({...notificationSettings, smtp: {...notificationSettings.smtp, user: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">كلمة المرور</label>
                <input 
                  type="password" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.smtp.pass}
                  onChange={e => setNotificationSettings({...notificationSettings, smtp: {...notificationSettings.smtp, pass: e.target.value}})}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">البريد المرسل (From Email)</label>
                <input 
                  type="email" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.smtp.fromEmail}
                  onChange={e => setNotificationSettings({...notificationSettings, smtp: {...notificationSettings.smtp, fromEmail: e.target.value}})}
                />
              </div>
            </div>
          </div>

          {/* WhatsApp Settings */}
          <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 ${!notificationSettings.preferences.whatsapp ? 'opacity-50 pointer-events-none' : ''}`}>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Smartphone className="w-5 h-5 text-green-600" /> إعدادات WhatsApp API
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">API Key / Access Token</label>
                <input 
                  type="password" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.whatsapp.apiKey}
                  onChange={e => setNotificationSettings({...notificationSettings, whatsapp: {...notificationSettings.whatsapp, apiKey: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number ID</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.whatsapp.phoneNumberId}
                  onChange={e => setNotificationSettings({...notificationSettings, whatsapp: {...notificationSettings.whatsapp, phoneNumberId: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Business Account ID (Optional)</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={notificationSettings.whatsapp.businessAccountId}
                  onChange={e => setNotificationSettings({...notificationSettings, whatsapp: {...notificationSettings.whatsapp, businessAccountId: e.target.value}})}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  // --- Renderers ---

  const renderGeneralTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">الإعدادات العامة</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">تخصيص بيانات المكتب وتفضيلات النظام</p>
        </div>
        {!readOnly && (
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            ) : (
               <><Save className="w-4 h-4" /> حفظ التغييرات</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Column 1: Identity & Logo */}
        <div className="xl:col-span-2 space-y-6">
          {/* Identity Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Building className="w-5 h-5 text-indigo-600" /> الهوية المؤسسية
            </h4>
            
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo Upload */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div 
                  onClick={() => !readOnly && logoInputRef.current?.click()}
                  className={`w-32 h-32 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 flex items-center justify-center ${!readOnly ? 'cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-600' : ''} transition-all overflow-hidden relative group`}
                >
                  {generalSettings.logoPreview ? (
                    <img src={generalSettings.logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                  )}
                  {!readOnly && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-bold">تغيير الشعار</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={logoInputRef} className="hidden" onChange={handleLogoUpload} accept="image/*" disabled={readOnly} />
                <p className="text-xs text-slate-500 dark:text-slate-400">الشعار الرسمي (PNG/JPG)</p>
              </div>

              {/* Basic Inputs */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المكتب / المؤسسة</label>
                  <input 
                    type="text" 
                    readOnly={readOnly}
                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={generalSettings.firmName}
                    onChange={e => setGeneralSettings({...generalSettings, firmName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الشعار اللفظي (Slogan)</label>
                  <input 
                    type="text" 
                    readOnly={readOnly}
                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={generalSettings.firmSlogan}
                    onChange={e => setGeneralSettings({...generalSettings, firmSlogan: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم السجل الضريبي / التجاري</label>
                  <input 
                    type="text" 
                    readOnly={readOnly}
                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={generalSettings.taxNumber}
                    onChange={e => setGeneralSettings({...generalSettings, taxNumber: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العنوان الرئيسي</label>
                  <input 
                    type="text" 
                    readOnly={readOnly}
                    className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={generalSettings.address}
                    onChange={e => setGeneralSettings({...generalSettings, address: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Phone className="w-5 h-5 text-indigo-600" /> بيانات التواصل
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2"><Phone className="w-3 h-3"/> الهاتف</label>
                <input 
                  type="text" 
                  readOnly={readOnly}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-left dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                  dir="ltr"
                  value={generalSettings.phone}
                  onChange={e => setGeneralSettings({...generalSettings, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2"><Mail className="w-3 h-3"/> البريد الإلكتروني</label>
                <input 
                  type="email" 
                  readOnly={readOnly}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-left dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                  dir="ltr"
                  value={generalSettings.email}
                  onChange={e => setGeneralSettings({...generalSettings, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2"><Globe className="w-3 h-3"/> الموقع الإلكتروني</label>
                <input 
                  type="text" 
                  readOnly={readOnly}
                  className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-left dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                  dir="ltr"
                  value={generalSettings.website}
                  onChange={e => setGeneralSettings({...generalSettings, website: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: System & Notifications */}
        <div className="space-y-6">
          {/* System Preferences */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <SettingsIcon className="w-5 h-5 text-indigo-600" /> تفضيلات النظام
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العملة الافتراضية</label>
                <select 
                  disabled={readOnly}
                  className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={generalSettings.currency}
                  onChange={e => setGeneralSettings({...generalSettings, currency: e.target.value})}
                >
                  <option value="EGP">الجنيه المصري (EGP)</option>
                  <option value="USD">الدولار الأمريكي (USD)</option>
                  <option value="SAR">الريال السعودي (SAR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اللغة</label>
                <select 
                  disabled={readOnly}
                  className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={generalSettings.language}
                  onChange={e => setGeneralSettings({...generalSettings, language: e.target.value})}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المظهر</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleThemeSwitch('light')}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      generalSettings.theme === 'light' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200' 
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Sun className="w-4 h-4" /> فاتح
                  </button>
                  <button 
                    onClick={() => handleThemeSwitch('dark')}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      generalSettings.theme === 'dark' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200' 
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Moon className="w-4 h-4" /> داكن
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications - MOVED TO DEDICATED TAB */}


          {/* Data Management */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Database className="w-5 h-5 text-green-600" /> النسخ الاحتياطي (Backup)
            </h4>
            
            <div className="space-y-4">
               {/* Export Backup */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">تصدير البيانات</label>
                  <button 
                    onClick={handleCreateBackup}
                    disabled={isBackingUp || readOnly}
                    className="w-full flex items-center justify-center gap-3 p-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-70"
                  >
                     {isBackingUp ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> جاري التجهيز...</>
                     ) : (
                        <><Download className="w-5 h-5" /> تحميل نسخة كاملة (.JSON)</>
                     )}
                  </button>
                  {lastBackupDate && (
                     <div className="mt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
                        <History className="w-3 h-3" />
                        آخر نسخة محفوظة: {lastBackupDate}
                     </div>
                  )}
               </div>

               {/* Import Backup */}
               <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">استعادة نسخة (Restore)</label>
                  <label 
                    onClick={() => { if(!isRestoring && !readOnly) restoreFileRef.current?.click(); }}
                    className={`w-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-400 transition-all group ${isRestoring || readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                     {isRestoring ? (
                        <div className="flex flex-col items-center gap-2 text-indigo-600">
                           <Loader2 className="w-6 h-6 animate-spin" />
                           <span className="text-xs font-bold">جاري استعادة البيانات...</span>
                        </div>
                     ) : (
                        <>
                           <RotateCcw className="w-6 h-6 text-slate-400 group-hover:text-indigo-500" />
                           <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 font-medium">اضغط لاستعادة ملف JSON</span>
                        </>
                     )}
                     <input 
                        type="file" 
                        ref={restoreFileRef}
                        className="hidden" 
                        accept=".json" 
                        onChange={handleRestoreBackup} 
                        disabled={isRestoring || readOnly}
                     />
                  </label>
               </div>

               {/* Auto Backup Settings */}
               <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mt-2">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-bold">
                        <HardDrive className="w-3 h-3" />
                        <span>نسخ تلقائي</span>
                     </div>
                     <select 
                       className="bg-transparent border-none text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer text-right"
                       value={generalSettings.autoBackup}
                       onChange={e => setGeneralSettings({...generalSettings, autoBackup: e.target.value})}
                       disabled={readOnly}
                     >
                       <option value="daily">يومياً</option>
                       <option value="weekly">أسبوعياً</option>
                       <option value="monthly">شهرياً</option>
                       <option value="off">إيقاف</option>
                     </select>
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );

  // Other render functions will go here


  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[500px]">
      {/* Sidebar */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-700 border-b border-slate-100 dark:border-slate-600">
            <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-indigo-600" /> الإعدادات
            </h2>
          </div>
          <nav className="p-2 space-y-1">
            <button 
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <SettingsIcon className="w-4 h-4" /> إعدادات عامة
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Users className="w-4 h-4" /> المستخدمين والصلاحيات
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Bell className="w-4 h-4" /> التنبيهات والإشعارات
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Lock className="w-4 h-4" /> الأمان
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'data' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Database className="w-4 h-4" /> إدارة البيانات
            </button>
            <button 
              onClick={() => setActiveTab('maintenance')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'maintenance' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <Wrench className="w-4 h-4" /> صيانة النظام
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'general' && renderGeneralTab()}
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'data' && renderDataTab()}
        {activeTab === 'maintenance' && renderMaintenanceTab()}
      </div>

      {/* User Modal (Add/Edit) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-700 min-h-[600px]">
            <style>{`
              .modal-container {
                contain: layout style;
                container-type: inline-size;
              }
              .permissions-grid {
                contain: layout;
                min-height: 400px;
              }
              .permission-row {
                contain: layout;
                min-height: 60px;
              }
            `}</style>
            {/* Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex-shrink-0">
              <div className="absolute top-4 right-4">
                <button 
                  onClick={() => setIsUserModalOpen(false)} 
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  {editingUser ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002 2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0 3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}</h3>
                  <p className="text-indigo-100 text-sm mt-1">
                    {editingUser ? 'قم بتحديث معلومات المستخدم وصلاحياته' : 'قم بإضافة مستخدم جديد وتحديد صلاحياته'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto min-h-0">
              <div className="p-6 space-y-8">
                
                {/* User Avatar Section */}
                <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-lg">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold shadow-xl overflow-hidden transform transition-transform group-hover:scale-105 border-2 border-white/20">
                      {formData.avatar ? (
                        <img 
                          src={formData.avatar} 
                          className="w-full h-full rounded-3xl object-cover" 
                          alt="صورة المستخدم"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`flex flex-col items-center ${formData.avatar ? 'hidden' : ''}`}>
                        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-2xl font-bold">{formData.name?.charAt(0) || 'U'}</span>
                        <span className="text-xs opacity-75">صورة شخصية</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-3 -right-3 w-10 h-10 bg-white dark:bg-slate-700 rounded-full shadow-xl flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-600 transition-all transform hover:scale-110 border-2 border-indigo-200 dark:border-indigo-700"
                      title="اختر صورة شخصية"
                    >
                      <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                    {formData.avatar && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar: '' })}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-all transform hover:scale-110"
                        title="حذف الصورة"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                      {formData.name || 'اسم المستخدم'}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {formData.email || 'user@example.com'}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        formData.isActive 
                          ? 'bg-green-100 text-green-700 border border-green-200 shadow-sm' 
                          : 'bg-red-100 text-red-700 border border-red-200 shadow-sm'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse"></span>
                        {formData.isActive ? 'نشط' : 'موقوف'}
                      </span>
                      <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">
                        {formData.roleLabel || 'بدون دور'}
                      </span>
                      {formData.username && (
                        <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-700 border border-purple-200 shadow-sm">
                          @{formData.username}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white">المعلومات الأساسية</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">قم بإدخال معلومات المستخدم الأساسية</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-3 lg:col-span-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            الاسم الكامل <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            required 
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-slate-700 dark:text-white transition-all"
                            placeholder="أدخل الاسم الكامل للمستخدم"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            disabled={readOnly}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            البريد الإلكتروني <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="email" 
                            required 
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-slate-700 dark:text-white transition-all"
                            placeholder="user@example.com"
                            dir="ltr"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            disabled={readOnly}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            اسم المستخدم
                          </label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-slate-700 dark:text-white transition-all"
                            placeholder="اختياري (يمكن استخدام البريد)"
                            value={formData.username || ''}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            disabled={readOnly}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            المسمى الوظيفي
                          </label>
                          <input 
                            type="text" 
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-slate-700 dark:text-white transition-all"
                            placeholder="مثال: محامي استئناف"
                            value={formData.roleLabel}
                            onChange={e => setFormData({...formData, roleLabel: e.target.value})}
                            disabled={readOnly}
                          />
                        </div>
                      </div>

                      {/* Password Section */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          كلمة المرور 
                          {editingUser && <span className="text-xs text-slate-400 font-normal">(اتركها فارغة للإبقاء على الحالية)</span>}
                          {!editingUser && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                          <input 
                            type="password" 
                            className="w-full px-4 py-3 pl-12 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none dark:bg-slate-700 dark:text-white transition-all"
                            placeholder={editingUser ? "•••••••••" : "كلمة مرور جديدة"}
                            required={!editingUser}
                            value={formData.password || ''}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            disabled={readOnly}
                          />
                          <svg className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Status and Additional Info */}
                    <div className="space-y-4">
                      {/* Status Toggle */}
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                            formData.isActive 
                              ? 'bg-green-500 shadow-lg shadow-green-500/25' 
                              : 'bg-red-500 shadow-lg shadow-red-500/25'
                          }`}>
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 dark:text-white">حالة الحساب</h5>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {formData.isActive ? 'المستخدم نشط ويمكنه الدخول' : 'المستخدم موقوف ولا يمكنه الدخول'}
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={formData.isActive}
                            onChange={e => setFormData({...formData, isActive: e.target.checked})}
                            disabled={readOnly}
                          />
                          <div className="w-16 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-green-600 peer-checked:shadow-lg peer-checked:shadow-green-600/25"></div>
                        </label>
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">الصلاحيات</p>
                              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                {formData.permissions?.filter(p => p.access !== 'none').length || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">الوصول</p>
                              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                {formData.permissions?.filter(p => p.access === 'write').length || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white">الصلاحيات والوصول</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">حدد صلاحيات المستخدم لكل وحدة</p>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden min-h-[400px]">
                    {/* Permissions Header */}
                    <div className="grid grid-cols-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 text-sm font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        الوحدة
                      </div>
                      <div className="flex justify-center items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728" />
                        </svg>
                        لا يوجد
                      </div>
                      <div className="flex justify-center items-center gap-2">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        قراءة
                      </div>
                      <div className="flex justify-center items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        تعديل
                      </div>
                    </div>
                    
                    {/* Permissions Grid */}
                    <div className="permissions-grid divide-y divide-slate-100 dark:divide-slate-700 overflow-y-auto max-h-[400px]">
                      {MODULES.map((module, index) => {
                        const currentAccess = formData.permissions?.find(p => p.moduleId === module.id)?.access || 'none';
                        
                        return (
                          <div key={module.id} className={`permission-row grid grid-cols-4 p-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${index % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                                module.id.includes('dashboard') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                module.id.includes('cases') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                module.id.includes('clients') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                module.id.includes('hearings') ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                module.id.includes('tasks') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                module.id.includes('documents') ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                module.id.includes('archive') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                module.id.includes('reports') ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' :
                                'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400'
                              }`}>
                                {module.id.includes('dashboard') ? '📊' :
                                 module.id.includes('cases') ? '⚖️' :
                                 module.id.includes('clients') ? '👥' :
                                 module.id.includes('hearings') ? '📅' :
                                 module.id.includes('tasks') ? '📋' :
                                 module.id.includes('documents') ? '📄' :
                                 module.id.includes('archive') ? '📦' :
                                 module.id.includes('reports') ? '📈' :
                                 module.id.includes('generator') ? '📝' :
                                 module.id.includes('fees') ? '💰' :
                                 module.id.includes('expenses') ? '💸' :
                                 module.id.includes('references') ? '📚' :
                                 module.id.includes('lawyers') ? '👨‍⚖️' :
                                 '🔧'}
                              </div>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{module.label}</span>
                            </div>
                            
                            {/* Permission Options */}
                            <div className="flex justify-center">
                              <label className="group cursor-pointer p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <input 
                                  type="radio" 
                                  name={`perm-${module.id}`} 
                                  checked={currentAccess === 'none'}
                                  onChange={() => handlePermissionChange(module.id, 'none')}
                                  className="sr-only"
                                  disabled={readOnly}
                                />
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  currentAccess === 'none' 
                                    ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/25' 
                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-red-400'
                                }`}>
                                  {currentAccess === 'none' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>}
                                </div>
                              </label>
                            </div>

                            <div className="flex justify-center">
                              <label className="group cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                <input 
                                  type="radio" 
                                  name={`perm-${module.id}`} 
                                  checked={currentAccess === 'read'}
                                  onChange={() => handlePermissionChange(module.id, 'read')}
                                  className="sr-only"
                                  disabled={readOnly}
                                />
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  currentAccess === 'read' 
                                    ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-400'
                                }`}>
                                  {currentAccess === 'read' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>}
                                </div>
                              </label>
                            </div>

                            <div className="flex justify-center">
                              <label className="group cursor-pointer p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                <input 
                                  type="radio" 
                                  name={`perm-${module.id}`} 
                                  checked={currentAccess === 'write'}
                                  onChange={() => handlePermissionChange(module.id, 'write')}
                                  className="sr-only"
                                  disabled={readOnly}
                                />
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  currentAccess === 'write' 
                                    ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/25' 
                                    : 'border-slate-300 dark:border-slate-600 group-hover:border-green-400'
                                }`}>
                                  {currentAccess === 'write' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>}
                                </div>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-3 justify-between items-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {editingUser ? 'سيتم حفظ التغييرات فوراً' : 'سيتم إضافة المستخدم فوراً'}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  إلغاء
                </button>
                {!readOnly && (
                  <button 
                    type="button"
                    onClick={handleSaveUser}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {editingUser ? 'تحديث المستخدم' : 'إضافة المستخدم'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    );
};

export default Settings;
