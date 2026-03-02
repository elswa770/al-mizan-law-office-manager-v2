import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Lawyer, LawyerStatus, LawyerSpecialization, LawyerRole } from './types';
import { createLawyer, updateLawyer, deleteLawyer, getLawyers } from './services/dbservice';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import Clients from './pages/Clients';
import Hearings from './pages/Hearings';
import Documents from './pages/Documents';
import Fees from './pages/Fees';
import Reports from './pages/Reports';
import CaseDetails from './pages/CaseDetails';
import ClientDetails from './pages/ClientDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import Tasks from './pages/Tasks';
import Locations from './pages/Locations';
import Lawyers from './pages/Lawyers';
import LawyerDetails from './pages/LawyerDetails';
const Settings = lazy(() => import('./pages/Settings'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const DocumentGenerator = lazy(() => import('./pages/DocumentGenerator'));
const LegalReferences = lazy(() => import('./pages/LegalReferences'));
const Calculators = lazy(() => import('./pages/Calculators'));
const Archive = lazy(() => import('./pages/Archive'));
import { Hearing, Case, Client, HearingStatus, Task, ActivityLog, AppUser, PermissionLevel, LegalReference } from './types';
import { auth } from './services/firebaseConfig';
import { ShieldAlert } from 'lucide-react';
import { 
  getClients, addClient, updateClient, deleteClient,
  getCases, addCase, updateCase,
  getHearings, addHearing, updateHearing,
  getTasks, addTask, updateTask, deleteTask,
  getAppUsers, addAppUser, updateAppUser, deleteAppUser,
  getActivities, addActivity,
  getLegalReferences, addLegalReference
} from './services/dbService';
import { 
  loginUser, 
  logoutUser, 
  onAuthStateChange, 
  getUserProfile, 
  AuthUser 
} from './services/authService';
import { db } from './services/firebaseConfig';

// Helper function for default permissions
const getDefaultPermissions = () => [
  { moduleId: 'dashboard', access: 'read' as const },
  { moduleId: 'cases', access: 'read' as const },
  { moduleId: 'clients', access: 'read' as const },
  { moduleId: 'hearings', access: 'read' as const },
  { moduleId: 'tasks', access: 'read' as const },
  { moduleId: 'documents', access: 'read' as const },
  { moduleId: 'archive', access: 'read' as const }, // Added archive permission
  { moduleId: 'lawyers', access: 'read' as const }, // Added lawyers permission
  { moduleId: 'fees', access: 'read' as const },
  { moduleId: 'expenses', access: 'none' as const },
  { moduleId: 'reports', access: 'none' as const },
  { moduleId: 'settings', access: 'none' as const },
  { moduleId: 'ai-assistant', access: 'read' as const },
  { moduleId: 'references', access: 'read' as const },
  { moduleId: 'locations', access: 'read' as const },
  { moduleId: 'calculators', access: 'read' as const },
  { moduleId: 'generator', access: 'read' as const }
];

function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  
  // Data State
  const [cases, setCases] = useState<Case[]>([]);
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [references, setReferences] = useState<LegalReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Load General Settings from Firebase ---
  const [generalSettings, setGeneralSettings] = useState<any>(null);
  
  useEffect(() => {
    const loadGeneralSettings = async () => {
      try {
        if (auth.currentUser) {
          const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
          if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            setGeneralSettings(settings);
            if (settings.theme) {
              setTheme(settings.theme as 'light' | 'dark');
            }
          }
        }
      } catch (error) {
        console.log('Failed to load general settings from Firebase:', error);
      }
    };

    loadGeneralSettings();
  }, [auth.currentUser]);

  // --- Theme Effect ---
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- Firebase Auth State Management ---
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        setAuthUser(user);
        setIsAuthenticated(true);
        
        // Load user profile from Firestore
        try {
          const userProfile = await getUserProfile(user.uid);
          if (userProfile) {
            setCurrentUser(userProfile);
          } else {
            // Check if this is the admin user
            if (user.email === 'admin@mizan.com') {
              const adminProfile: AppUser = {
                id: 'admin-user-123',
                name: 'مدير النظام',
                email: user.email!,
                username: 'admin',
                roleLabel: 'مدير النظام',
                isActive: true,
                permissions: [
                  { moduleId: 'dashboard', access: 'write' as const },
                  { moduleId: 'cases', access: 'write' as const },
                  { moduleId: 'clients', access: 'write' as const },
                  { moduleId: 'hearings', access: 'write' as const },
                  { moduleId: 'tasks', access: 'write' as const },
                  { moduleId: 'documents', access: 'write' as const },
                  { moduleId: 'fees', access: 'write' as const },
                  { moduleId: 'expenses', access: 'write' as const },
                  { moduleId: 'reports', access: 'write' as const },
                  { moduleId: 'settings', access: 'write' as const },
                  { moduleId: 'ai-assistant', access: 'write' as const },
                  { moduleId: 'references', access: 'write' as const },
                  { moduleId: 'locations', access: 'write' as const },
                  { moduleId: 'calculators', access: 'write' as const },
                  { moduleId: 'generator', access: 'write' as const }
                ],
                lastLogin: new Date().toISOString()
              };
              setCurrentUser(adminProfile);
            } else {
              // Create default user profile if not exists
              const defaultProfile: AppUser = {
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'مستخدم',
                email: user.email!,
                username: user.email?.split('@')[0] || 'user',
                roleLabel: 'مستخدم',
                isActive: true,
                permissions: getDefaultPermissions(),
                lastLogin: new Date().toISOString()
              };
              
              // Save to Firestore
              await setDoc(doc(db, 'users', user.uid), defaultProfile);
              setCurrentUser(defaultProfile);
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setAuthUser(null);
        setIsAuthenticated(false);
        setCurrentUser(null);
        setLoading(false); // Stop loading when logged out
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Load data only when authenticated and user profile is loaded ---
  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      return;
    }

    const loadData = async () => {
      if (!isAuthenticated || !currentUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('🔄 App.tsx - Starting data load for user:', currentUser?.email || 'Unknown');
        
        const [
          casesData,
          hearingsData,
          clientsData,
          tasksData,
          activitiesData,
          usersData,
          lawyersData
        ] = await Promise.all([
          getCases(),
          getHearings(),
          getClients(),
          getTasks(),
          getActivities(),
          getAppUsers(),
          getLawyers()
        ]);
        
        setCases(casesData);
        setHearings(hearingsData);
        setClients(clientsData);
        setTasks(tasksData);
        setActivities(activitiesData);
        setUsers(usersData);
        setLawyers(lawyersData);
        // References will be loaded separately in LegalReferences page
        setReferences([]);
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('فشل في تحميل البيانات من قاعدة البيانات');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isAuthenticated, currentUser]);

  // --- Auth Handlers ---
  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await loginUser(email, password);
      
      // Update user's last login in Firestore
      try {
        await setDoc(doc(db, 'users', user.uid), {
          lastLogin: new Date().toISOString()
        }, { merge: true });
      } catch (updateError) {
        console.warn('Failed to update last login:', updateError);
      }
      
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    }
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
    // User will be automatically logged in after registration
  };

  const handleBackToLogin = () => {
    setShowRegister(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Auth state change will handle the rest
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  const getPermission = (moduleId: string): PermissionLevel => {
    if (!currentUser || !currentUser.permissions) return 'none';
    const perm = currentUser.permissions.find(p => p.moduleId === moduleId);
    return perm ? perm.access : 'none';
  };

  const hasAccess = (moduleId: string): boolean => {
    return getPermission(moduleId) !== 'none';
  };

  const isReadOnly = (moduleId: string): boolean => {
    return getPermission(moduleId) === 'read';
  };

  // --- App Logic ---

  const handleCaseClick = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentPage('case-details');
  };

  const handleBackToCases = () => {
    setSelectedCaseId(null);
    setCurrentPage('cases'); 
  };

  const handleClientClick = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentPage('client-details');
  };

  const handleBackToClients = () => {
    setSelectedClientId(null);
    setCurrentPage('clients');
  };

  const handleBackToLawyers = () => {
    setSelectedLawyerId(null);
    setCurrentPage('lawyers');
  };

  // Lawyer management functions
  const handleAddLawyer = async (lawyer: Lawyer) => {
    try {
      // Save to Firebase
      const lawyerData = {
        name: lawyer.name,
        email: lawyer.email,
        phone: lawyer.phone,
        nationalId: lawyer.nationalId || '',
        barNumber: lawyer.barNumber || '',
        barRegistrationNumber: lawyer.barRegistrationNumber || '',
        barLevel: lawyer.barLevel || '',
        specialization: (lawyer.specialization || 'عام') as LawyerSpecialization,
        role: (lawyer.role || 'محامي') as LawyerRole,
        status: (lawyer.status || 'نشط') as LawyerStatus,
        joinDate: lawyer.joinDate || '',
        officeLocation: lawyer.officeLocation || '',
        bio: lawyer.bio || '',
        education: lawyer.education || '',
        experience: lawyer.experience || 0,
        languages: lawyer.languages || [],
        casesHandled: lawyer.casesHandled || 0,
        successRate: lawyer.successRate || 0,
        hourlyRate: lawyer.hourlyRate || 0,
        profileImage: lawyer.profileImage || ''
      };
      
      const docId = await createLawyer(lawyerData);
      const newLawyer = { ...lawyer, id: docId };
      
      // Update local state
      setLawyers(prev => [...prev, newLawyer]);
      console.log('Lawyer added to Firebase:', newLawyer);
    } catch (error) {
      console.error('Error adding lawyer to Firebase:', error);
    }
  };

  const handleUpdateLawyer = async (lawyer: Lawyer) => {
    try {
      // Update in Firebase
      await updateLawyer(lawyer.id, lawyer);
      
      // Update local state
      setLawyers(prev => prev.map(l => l.id === lawyer.id ? lawyer : l));
      console.log('Lawyer updated in Firebase:', lawyer);
    } catch (error) {
      console.error('Error updating lawyer in Firebase:', error);
    }
  };

  const handleDeleteLawyer = async (lawyerId: string) => {
    try {
      // Delete from Firebase
      await deleteLawyer(lawyerId);
      
      // Update local state
      setLawyers(prev => prev.filter(l => l.id !== lawyerId));
      console.log('Lawyer deleted from Firebase:', lawyerId);
    } catch (error) {
      console.error('Error deleting lawyer from Firebase:', error);
    }
  };

  const handleAddCase = async (newCase: Omit<Case, 'id'>) => {
    try {
      console.log('🆕 App.tsx - handleAddCase called with:', newCase);
      
      // التحقق من عدم وجود القضية مسبقاً (باستخدام caseNumber و title)
      const existingCase = cases.find(c => 
        c.caseNumber === newCase.caseNumber && 
        c.title === newCase.title
      );
      
      if (existingCase) {
        console.warn('⚠️ App.tsx - Case already exists:', existingCase);
        return;
      }

      // إضافة اسم المحامي إذا تم اختياره
      const caseData = {
        ...newCase,
        assignedLawyerName: newCase.assignedLawyerId ? 
          (lawyers.find(l => l.id === newCase.assignedLawyerId)?.name || '') : ''
      };

      const caseId = await addCase(caseData);
      console.log('✅ App.tsx - Case added with ID:', caseId);
      
      // إضافة القضية الجديدة إلى الحالة المحلية مع الـ ID الصحيح
      setCases(prev => {
        const updatedCases = [...prev, { ...caseData, id: caseId }];
        console.log('📝 App.tsx - Updated cases array after add:', updatedCases);
        return updatedCases;
      });
      
      // Log activity
      await handleAddActivity({
        action: 'إضافة قضية جديدة',
        target: newCase.title,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ App.tsx - Error adding case:', error);
    }
  };

  const handleUpdateCase = async (updatedCase: Case) => {
    try {
      console.log('🔄 App.tsx - handleUpdateCase called with:', updatedCase);
      
      // التحقق من وجود id
      if (!updatedCase.id) {
        console.error('❌ App.tsx - Case ID is missing:', updatedCase);
        setError('لا يمكن تحديث قضية بدون معرف');
        return;
      }
      
      // تحديث في Firebase
      await updateCase(updatedCase.id, updatedCase);
      console.log('✅ App.tsx - Firebase update successful');
      
      // تحديث الحالة المحلية بشكل صحيح
      setCases(prev => {
        const updatedCases = prev.map(c => {
          if (c.id === updatedCase.id) {
            // دمج البيانات بدلاً من الاستبدال الكامل
            return { ...c, ...updatedCase };
          }
          return c;
        });
        console.log('📝 App.tsx - Updated cases array:', updatedCases);
        return updatedCases;
      });
      
      // Log activity
      await handleAddActivity({
        action: 'تعديل بيانات القضية',
        target: updatedCase.title,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating case:', err);
      setError('فشل في تحديث القضية');
    }
  };

  const handleAddHearing = async (newHearing: Hearing) => {
    try {
      // إضافة اسم المحامي إذا تم اختياره
      const hearingData = {
        ...newHearing,
        assignedLawyerName: newHearing.assignedLawyerId ? 
          (lawyers.find(l => l.id === newHearing.assignedLawyerId)?.name || '') : ''
      };

      const hearingId = await addHearing(hearingData);
      setHearings(prev => [{ ...hearingData, id: hearingId }, ...prev]);
      
      // Log activity
      const caseTitle = cases.find(c => c.id === newHearing.caseId)?.title || 'قضية غير معروفة';
      await handleAddActivity({
        action: 'إضافة جلسة جديدة',
        target: caseTitle,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error adding hearing:', err);
      setError('فشل في إضافة الجلسة');
    }
  };

  const handleUpdateHearing = async (updatedHearing: Hearing) => {
    try {
      await updateHearing(updatedHearing.id, updatedHearing);
      setHearings(prev => prev.map(h => h.id === updatedHearing.id ? updatedHearing : h));
    } catch (err) {
      console.error('Error updating hearing:', err);
      setError('فشل في تحديث الجلسة');
    }
  };

  const handleDeleteHearing = async (hearingId: string) => {
    try {
      await deleteDoc(doc(db, 'hearings', hearingId));
      setHearings(prev => prev.filter(h => h.id !== hearingId));
      
      // Log activity
      const hearing = hearings.find(h => h.id === hearingId);
      if (hearing) {
        const caseTitle = cases.find(c => c.id === hearing.caseId)?.title || 'قضية غير معروفة';
        await handleAddActivity({
          action: 'حذف جلسة',
          target: `${hearing.date} - ${caseTitle}`,
          user: currentUser?.name || 'مستخدم',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error deleting hearing:', error);
    }
  };

  const handleAddClient = async (newClient: Client) => {
    try {
      // دالة تنظيف قوية لإزالة جميع قيم undefined والحقول الفارغة
      const cleanObject = (obj: any): any => {
        const cleaned: any = {};
        for (const key in obj) {
          if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
            cleaned[key] = obj[key];
          }
        }
        return cleaned;
      };
      
      const cleanClient = cleanObject(newClient);
      
      const clientId = await addClient(cleanClient);
      setClients(prev => [{ ...newClient, id: clientId }, ...prev]);
      
      // Log activity
      await handleAddActivity({
        action: 'إضافة موكل جديد',
        target: newClient.name,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error adding client:', err);
      setError('فشل في إضافة الموكل');
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    try {
      console.log('🔄 App.tsx - handleUpdateClient called with:', updatedClient);
      
      // التحقق من وجود id
      if (!updatedClient.id) {
        console.error('❌ App.tsx - Client ID is missing:', updatedClient);
        setError('لا يمكن تحديث موكل بدون معرف');
        return;
      }
      
      // تحديث في Firebase
      await updateClient(updatedClient.id, updatedClient);
      console.log('✅ App.tsx - Firebase update successful');
      
      // تحديث الحالة المحلية بشكل صحيح
      setClients(prev => {
        const updatedClients = prev.map(c => {
          if (c.id === updatedClient.id) {
            // دمج البيانات بدلاً من الاستبدال الكامل
            return { ...c, ...updatedClient };
          }
          return c;
        });
        console.log('📝 App.tsx - Updated clients array:', updatedClients);
        return updatedClients;
      });
      
      // Log activity
      await handleAddActivity({
        action: 'تعديل بيانات الموكل',
        target: updatedClient.name,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating client:', err);
      setError('فشل في تحديث الموكل');
    }
  };

  const handleAddTask = async (newTask: Task) => {
    try {
      const taskId = await addTask(newTask);
      setTasks(prev => [{ ...newTask, id: taskId }, ...prev]);
      
      // Log activity
      const caseTitle = newTask.relatedCaseId ? cases.find(c => c.id === newTask.relatedCaseId)?.title || 'قضية غير معروفة' : 'مهمة عامة';
      await handleAddActivity({
        action: 'إضافة مهمة جديدة',
        target: `${newTask.title} - ${caseTitle}`,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error adding task:', err);
      setError('فشل في إضافة المهمة');
    }
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      await updateTask(updatedTask.id, updatedTask);
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      
      // Log activity
      const caseTitle = updatedTask.relatedCaseId ? cases.find(c => c.id === updatedTask.relatedCaseId)?.title || 'قضية غير معروفة' : 'مهمة عامة';
      await handleAddActivity({
        action: 'تعديل المهمة',
        target: `${updatedTask.title} - ${caseTitle}`,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating task:', err);
      setError('فشل في تحديث المهمة');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const taskToDelete = tasks.find(t => t.id === taskId);
      if (taskToDelete) {
        await deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        
        // Log activity
        const caseTitle = taskToDelete.relatedCaseId ? cases.find(c => c.id === taskToDelete.relatedCaseId)?.title || 'قضية غير معروفة' : 'مهمة عامة';
        await handleAddActivity({
          action: 'حذف المهمة',
          target: `${taskToDelete.title} - ${caseTitle}`,
          user: currentUser?.name || 'مستخدم',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('فشل في حذف المهمة');
    }
  };

  const handleAddUser = async (newUser: AppUser) => {
    try {
      const userId = await addAppUser(newUser);
      setUsers(prev => [...prev, { ...newUser, id: userId }]);
    } catch (err) {
      console.error('Error adding user:', err);
      setError('فشل في إضافة المستخدم');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteAppUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('فشل في حذف المستخدم');
    }
  };

  const handleAddActivity = async (activity: Omit<ActivityLog, 'id'>) => {
    try {
      const activityId = await addActivity(activity);
      setActivities(prev => [{ ...activity, id: activityId }, ...prev]);
    } catch (err) {
      console.error('Error adding activity:', err);
      setError('فشل في تسجيل النشاط');
    }
  };

  const handleUpdateUser = async (updatedUser: AppUser) => {
    try {
      await updateAppUser(updatedUser.id, updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      
      // Log activity
      await handleAddActivity({
        action: 'تعديل بيانات المستخدم',
        target: updatedUser.name,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating user:', err);
      setError('فشل في تحديث المستخدم');
    }
  };

  const handleAddReference = async (newRef: LegalReference) => {
    try {
      // ✅ لا داعي للحفظ مرة أخرى - تم الحفظ بالفعل في LegalReferences.tsx
      // فقط أضف إلى الحالة المحلية
      setReferences(prev => [newRef, ...prev]);
    } catch (err) {
      console.error('Error adding reference to local state:', err);
      setError('فشل في إضافة المرجع القانوني');
    }
  };

  const handleRestoreData = (data: any) => {
    if (!data) return;
    if (data.cases) setCases(data.cases);
    if (data.clients) setClients(data.clients);
    if (data.hearings) setHearings(data.hearings);
    if (data.tasks) setTasks(data.tasks);
    if (data.users) setUsers(data.users); 
    if (data.references) setReferences(data.references);
    alert('تم استعادة البيانات بنجاح! سيتم تحديث الصفحة.');
  };

  // --- SMART NOTIFICATION SYSTEM ---
  const notifications = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const notificationList: any[] = [];

    const parseDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    };

    hearings.forEach(h => {
      if (!h.date) return;
      const hDate = parseDate(h.date);
      const diffTime = hDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const relatedCase = cases.find(c => c.id === h.caseId);
      const caseTitle = relatedCase?.title || 'قضية غير معروفة';

      if (diffDays >= 0 && h.status !== HearingStatus.COMPLETED && h.status !== HearingStatus.CANCELLED) {
        let title = '';
        let urgency: 'critical' | 'high' | 'medium' | 'low' = 'low';
        let message = '';

        if (diffDays === 0) {
          title = `جلسة اليوم: ${caseTitle}`;
          urgency = 'critical';
          message = 'يرجى مراجعة الملف والاستعداد للجلسة';
        } else if (diffDays === 1) {
          title = `جلسة غداً: ${caseTitle}`;
          urgency = 'high';
          message = 'تذكير: الجلسة غداً، هل تم تجهيز المستندات؟';
        } else if (diffDays === 3) {
          title = `جلسة بعد 3 أيام: ${caseTitle}`;
          urgency = 'medium';
          message = 'تذكير بالموعد القادم';
        } else if (diffDays === 7) {
          title = `جلسة بعد أسبوع: ${caseTitle}`;
          urgency = 'low';
          message = 'تنبيه مبكر';
        }

        if (title) {
          notificationList.push({
            id: `hearing-upcoming-${h.id}-${diffDays}`,
            date: h.date,
            time: h.time,
            title,
            message,
            caseNumber: relatedCase?.caseNumber,
            clientName: relatedCase?.clientName,
            court: relatedCase?.court,
            caseId: h.caseId,
            hearingId: h.id,
            type: 'hearing',
            urgency
          });
        }
      }

      if (diffDays < 0 && (h.status === HearingStatus.SCHEDULED || !h.status)) {
        notificationList.push({
          id: `hearing-overdue-${h.id}`,
          date: h.date,
          title: `تأخير إجراء: ${caseTitle}`,
          message: 'مر موعد الجلسة ولم يتم تحديث الحالة أو القرار',
          caseNumber: relatedCase?.caseNumber,
          clientName: relatedCase?.clientName,
          court: relatedCase?.court,
          caseId: h.caseId,
          hearingId: h.id,
          type: 'hearing',
          urgency: 'critical'
        });
      }

      if (diffDays <= 0 && h.requirements && !h.isCompleted && h.status !== HearingStatus.CANCELLED) {
         notificationList.push({
          id: `hearing-task-${h.id}`,
          date: h.date,
          title: `مطلوب تنفيذ: ${caseTitle}`,
          message: `المطلوب: ${h.requirements}`,
          caseNumber: relatedCase?.caseNumber,
          clientName: relatedCase?.clientName,
          caseId: h.caseId,
          hearingId: h.id,
          type: 'task',
          urgency: 'high'
        });
      }
    });

    const poaWarningDate = new Date(today);
    poaWarningDate.setDate(today.getDate() + 30); 

    clients.forEach(c => {
      if (!c.poaExpiry) return;
      const expiryDate = parseDate(c.poaExpiry);
      
      if (expiryDate < today) {
        notificationList.push({
          id: `poa-expired-${c.id}`,
          date: c.poaExpiry,
          title: `توكيل منتهي: ${c.name}`,
          message: 'يرجى تجديد التوكيل فوراً',
          clientName: c.name,
          clientId: c.id,
          type: 'poa_expiry',
          urgency: 'critical'
        });
      } else if (expiryDate <= poaWarningDate) {
        const daysLeft = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        notificationList.push({
          id: `poa-soon-${c.id}`,
          date: c.poaExpiry,
          title: `قرب انتهاء توكيل: ${c.name}`,
          message: `باقي ${daysLeft} يوم على الانتهاء`,
          clientName: c.name,
          clientId: c.id,
          type: 'poa_expiry',
          urgency: 'high'
        });
      }
    });

    return notificationList.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (urgencyOrder[a.urgency as keyof typeof urgencyOrder] !== urgencyOrder[b.urgency as keyof typeof urgencyOrder]) {
        return urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder];
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [hearings, cases, clients]);

  const handleNotificationClick = (id: string, type: 'hearing' | 'poa_expiry' | 'task') => {
    if (type === 'poa_expiry') {
      setSelectedClientId(id);
      setCurrentPage('client-details');
    } else {
      setSelectedCaseId(id); 
      setCurrentPage('case-details');
    }
  };

  const renderPage = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">جاري تحميل البيانات...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">حدث خطأ</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    // Determine the permission module ID for the current page
    let moduleId = currentPage;
    
    // Map detail pages to their parent module
    if (currentPage === 'case-details') moduleId = 'cases';
    if (currentPage === 'client-details') moduleId = 'clients';
    if (currentPage === 'lawyer-details') moduleId = 'lawyers';
    
    // Special handling for shared modules
    if (currentPage === 'fees') {
       const hasFees = hasAccess('fees');
       const hasExpenses = hasAccess('expenses');
       if (!hasFees && !hasExpenses) {
          return <AccessDenied />;
       }
    } else if (!hasAccess(moduleId)) {
       return <AccessDenied />;
    }
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
          cases={cases}
          clients={clients} 
          hearings={hearings} 
          tasks={tasks}
          activities={activities}
          onNavigate={setCurrentPage}
          onCaseClick={handleCaseClick}
          onUpdateTask={handleUpdateTask}
          onAddActivity={handleAddActivity}
          readOnly={isReadOnly('dashboard')}
        />;
      case 'cases':
        return <Cases 
          cases={cases}
          clients={clients}
          lawyers={lawyers}
          hearings={hearings}
          onCaseClick={handleCaseClick} 
          onAddCase={handleAddCase}
          readOnly={isReadOnly('cases')}
        />;
        case 'clients':
        return <Clients 
          clients={clients} 
          cases={cases}
          hearings={hearings}
          onClientClick={handleClientClick}
          onAddClient={handleAddClient}
          onUpdateClient={handleUpdateClient}
          readOnly={isReadOnly('clients')}
        />;
      case 'hearings':
        return <Hearings 
          hearings={hearings} 
          cases={cases} 
          lawyers={lawyers}
          onCaseClick={handleCaseClick}
          onAddHearing={handleAddHearing}
          onUpdateHearing={handleUpdateHearing}
          onDeleteHearing={handleDeleteHearing}
          readOnly={isReadOnly('hearings')} // Pass prop
        />;
      case 'tasks':
        return <Tasks 
          tasks={tasks} 
          cases={cases}
          users={users}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onCaseClick={handleCaseClick}
          readOnly={isReadOnly('tasks')} // Pass prop
        />;
      case 'documents':
        return <Documents 
          cases={cases} 
          clients={clients}
          onCaseClick={handleCaseClick}
          onClientClick={handleClientClick}
          onUpdateCase={handleUpdateCase}
          onUpdateClient={handleUpdateClient}
          readOnly={isReadOnly('documents')}
        />;
      case 'fees':
        return <Fees 
          cases={cases} 
          clients={clients} 
          hearings={hearings}
          onUpdateCase={handleUpdateCase}
          onAddActivity={handleAddActivity}
          canViewIncome={hasAccess('fees')}
          canViewExpenses={hasAccess('expenses')}
          readOnly={isReadOnly('fees') && isReadOnly('expenses')}
        />;
      case 'reports':
        return <Reports 
          cases={cases} 
          clients={clients} 
          hearings={hearings} 
          tasks={tasks} 
        />;
      case 'ai-assistant':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          }>
            <AIAssistant 
              cases={cases}
              references={references}
              hearings={hearings}
              onUpdateCase={handleUpdateCase}
            />
          </Suspense>
        );
      case 'locations':
        return <Locations readOnly={isReadOnly('locations')} />;
      case 'lawyers':
        return <Lawyers 
          lawyers={lawyers} 
          onAddLawyer={handleAddLawyer}
          onUpdateLawyer={handleUpdateLawyer}
          onDeleteLawyer={handleDeleteLawyer}
          onLawyerClick={(lawyerId) => {
            setSelectedLawyerId(lawyerId);
            setCurrentPage('lawyer-details');
          }}
          readOnly={isReadOnly('lawyers')}
        />;
      case 'lawyer-details':
        if (!selectedLawyerId) return <Lawyers lawyers={lawyers} />;
        return <LawyerDetails 
          lawyerId={selectedLawyerId}
          lawyers={lawyers}
          cases={cases}
          hearings={hearings}
          onBack={handleBackToLawyers}
          onCaseClick={handleCaseClick}
          onUpdateLawyer={handleUpdateLawyer}
          readOnly={isReadOnly('lawyers')}
        />;
      case 'calculators':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          }>
            <Calculators />
          </Suspense>
        ); 
      case 'generator':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          }>
            <DocumentGenerator cases={cases} clients={clients} />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          }>
            <Settings 
              users={users}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              currentTheme={theme}
              onThemeChange={setTheme}
              cases={cases}
              clients={clients}
              hearings={hearings}
              tasks={tasks}
              references={references}
              activities={activities}
              onRestoreData={handleRestoreData}
              readOnly={isReadOnly('settings')}
            />
          </Suspense>
        );
      case 'references':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          }>
            <LegalReferences 
              references={references}
              onAddReference={handleAddReference}
              readOnly={isReadOnly('references')}
            />
          </Suspense>
        );
      case 'archive':
        return (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          }>
            <Archive 
              cases={cases}
              clients={clients}
              onUpdateCase={handleUpdateCase}
              onNavigate={setCurrentPage}
              onCaseClick={handleCaseClick}
            />
          </Suspense>
        );
      case 'case-details':
        if (!selectedCaseId) return <Dashboard cases={cases} clients={clients} hearings={hearings} />;
        return <CaseDetails 
              caseId={selectedCaseId}
              cases={cases}
              clients={clients}
              lawyers={lawyers}
              hearings={hearings}
              onBack={handleBackToCases}
              onUpdateCase={handleUpdateCase}
              onAddHearing={handleAddHearing}
              onUpdateHearing={handleUpdateHearing}
              onDeleteHearing={handleDeleteHearing}
              onClientClick={handleClientClick}
              readOnly={isReadOnly('cases')}
            />;
      case 'client-details':
        if (!selectedClientId) return <Clients clients={clients} cases={cases} hearings={hearings} onClientClick={handleClientClick} />;
        return <ClientDetails 
          clientId={selectedClientId} 
          clients={clients} 
          cases={cases} 
          hearings={hearings}
          onBack={handleBackToClients}
          onCaseClick={handleCaseClick}
          onUpdateClient={handleUpdateClient}
          readOnly={isReadOnly('clients')}
          generalSettings={generalSettings}
        />;
      default:
        return <Dashboard cases={cases} clients={clients} hearings={hearings} />;
    }
  };

  const AccessDenied = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in">
      <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-slate-800 mb-2 dark:text-slate-100">عفواً، لا تملك صلاحية للوصول</h2>
      <p className="text-slate-500 dark:text-slate-400">يرجى التواصل مع المدير لمنحك الصلاحيات اللازمة</p>
      <button onClick={() => setCurrentPage('dashboard')} className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">العودة للرئيسية</button>
    </div>
  );

  return (
    <>
      {!isAuthenticated ? (
        showRegister ? (
          <Register 
            onRegisterSuccess={handleRegisterSuccess}
            onBackToLogin={handleBackToLogin}
          />
        ) : (
          <Login 
            onLogin={handleLogin}
            onShowRegister={() => setShowRegister(true)}
          />
        )
      ) : (
        <Layout 
          activePage={currentPage} 
          onNavigate={setCurrentPage}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          currentUser={currentUser}
          authUser={authUser}
          onLogout={handleLogout}
        >
          {renderPage()}
        </Layout>
      )}
    </>
  );
}

export default App;
