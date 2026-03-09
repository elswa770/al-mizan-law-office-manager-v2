import React, { useState, useMemo, useEffect, lazy, Suspense, useCallback } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Lawyer, LawyerStatus, LawyerSpecialization, LawyerRole, BarLevel } from './types';
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
import Appointments from './pages/Appointments';
import Locations from './pages/Locations';
import Lawyers from './pages/Lawyers';
import LawyerDetails from './pages/LawyerDetails';
import { logoutUser, loginUser } from './services/authService';
const Settings = lazy(() => import('./pages/Settings'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const DocumentGenerator = lazy(() => import('./pages/DocumentGenerator'));
const LegalReferences = lazy(() => import('./pages/LegalReferences'));
const Calculators = lazy(() => import('./pages/Calculators'));
const Archive = lazy(() => import('./pages/Archive'));
import { Hearing, Case, Client, HearingStatus, Task, ActivityLog, AppUser, PermissionLevel, LegalReference, Appointment } from './types';
import { ShieldAlert } from 'lucide-react';
import {
  getClients, addClient, updateClient, deleteClient,
  getCases, addCase, updateCase, deleteCase,
  getHearings, addHearing, updateHearing, deleteHearing,
  getTasks, addTask, updateTask, deleteTask,
  getAppUsers, addAppUser, updateAppUser, deleteAppUser,
  getAppointments, addAppointment, updateAppointment, deleteAppointment, subscribeToAppointments,
  addActivity, getActivities, subscribeToActivities,
  getLegalReferences, addLegalReference, updateLegalReference, deleteLegalReference,
  getWorkLocations, addWorkLocation, updateWorkLocation, deleteWorkLocation,
  getLawyers, createLawyer, updateLawyer, deleteLawyer
} from './services/dbService';
import { auth, db } from './services/firebaseConfig';
import { offlineManager } from './services/offlineManager';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as AuthUser } from 'firebase/auth';

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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [references, setReferences] = useState<LegalReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render
  const [refreshKey, setRefreshKey] = useState(0); // Additional force re-render key

  // --- Network Status Helper ---
  const checkNetworkConnectivity = async (): Promise<boolean> => {
    try {
      // First check navigator.onLine
      if (!navigator.onLine) return false;
      
      // Then try to fetch a small resource to verify real connectivity
      const response = await fetch('https://www.google.com/images/cleardot.gif', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      
      return true; // If we get here, we have connectivity
    } catch (error) {
      console.log('🔍 Network connectivity check failed:', error);
      return false;
    }
  };

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
        // Failed to load general settings from Firebase
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        setIsAuthenticated(true);
        
        // Load user profile from Firestore
        try {
          // Use dynamic import to avoid caching issues
          const { getUserProfile } = await import('./services/authService');
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
                  { moduleId: 'appointments', access: 'write' as const },
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
        let casesData, hearingsData, clientsData, tasksData, activitiesData, usersData, lawyersData, appointmentsData;
        
        if (navigator.onLine) {
          // Online: Load from Firebase
          [casesData, hearingsData, clientsData, tasksData, activitiesData, usersData, lawyersData, appointmentsData] = await Promise.all([
            getCases(),
            getHearings(),
            getClients(),
            getTasks(),
            getActivities(),
            getAppUsers(),
            getLawyers(),
            getAppointments()
          ]);
          
          // Cache the data for offline use
          await Promise.all([
            offlineManager.cacheData('cases', casesData),
            offlineManager.cacheData('clients', clientsData),
            offlineManager.cacheData('hearings', hearingsData),
            offlineManager.cacheData('tasks', tasksData),
            offlineManager.cacheData('appointments', appointmentsData)
          ]);
        } else {
          // Offline: Load from cache
          [casesData, clientsData, hearingsData, tasksData, appointmentsData] = await Promise.all([
            offlineManager.getCachedData('cases'),
            offlineManager.getCachedData('clients'),
            offlineManager.getCachedData('hearings'),
            offlineManager.getCachedData('tasks'),
            offlineManager.getCachedData('appointments')
          ]);
          
          activitiesData = [];
          usersData = [];
          lawyersData = [];
        }
        
        setCases(casesData || []);
        setHearings(hearingsData || []);
        setClients(clientsData || []);
        setTasks(tasksData || []);
        setAppointments(appointmentsData || []);
        setActivities(activitiesData || []);
        setUsers(usersData || []);
        setLawyers(lawyersData || []);
        // References will be loaded separately in LegalReferences page
        setReferences([]);
        
      } catch (err) {
        console.error('Error loading data:', err);
        
        // Try to load from cache if online loading fails
        if (navigator.onLine) {
          try {
            const [casesData, clientsData, hearingsData, tasksData, appointmentsData] = await Promise.all([
              offlineManager.getCachedData('cases'),
              offlineManager.getCachedData('clients'),
              offlineManager.getCachedData('hearings'),
              offlineManager.getCachedData('tasks'),
              offlineManager.getCachedData('appointments')
            ]);
            
            setCases(casesData || []);
            setClients(clientsData || []);
            setHearings(hearingsData || []);
            setTasks(tasksData || []);
            setAppointments(appointmentsData || []);
            setActivities([]);
            setUsers([]);
            setLawyers([]);
            setReferences([]);
            
            setError('تم تحميل البيانات من التخزين المؤقت (وضع عدم الاتصال)');
          } catch (cacheError) {
            setError('فشل في تحميل البيانات من قاعدة البيانات والتخزين المؤقت');
          }
        } else {
          setError('فشل في تحميل البيانات من قاعدة البيانات');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isAuthenticated, currentUser]);

  // --- Network Status Listener ---
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Connection restored, syncing data...');
      
      // Sync pending actions
      try {
        await offlineManager.syncPendingActions();
        console.log('✅ Pending actions synced successfully');
      } catch (error) {
        console.error('❌ Failed to sync pending actions:', error);
      }
      
      // Reload data from server
      if (isAuthenticated && currentUser) {
        try {
          const [serverCasesData, serverClientsData, serverHearingsData, serverTasksData] = await Promise.all([
            getCases(),
            getClients(),
            getHearings(),
            getTasks()
          ]);
          
          // Merge server data with local offline changes
          console.log('🔄 Merging server data with local changes...');
          
          // For cases, merge local changes with server data
          const mergedCases = serverCasesData.map(serverCase => {
            const localCase = cases.find(c => c.id === serverCase.id);
            if (localCase && localCase.id !== serverCase.id) {
              // This is a locally created case that was synced
              return { ...serverCase, ...localCase };
            }
            return serverCase;
          });
          
          // Add any local cases that aren't on server yet
          const localOnlyCases = cases.filter(localCase => 
            !serverCasesData.some(serverCase => serverCase.id === localCase.id)
          );
          
          const finalCases = [...mergedCases, ...localOnlyCases];
          
          console.log('📊 Final cases data:', finalCases);
          setCases(finalCases);
          setClients(serverClientsData);
          setHearings(serverHearingsData);
          setTasks(serverTasksData);
          
          // Cache merged data
          await Promise.all([
            offlineManager.cacheData('cases', finalCases),
            offlineManager.cacheData('clients', serverClientsData),
            offlineManager.cacheData('hearings', serverHearingsData),
            offlineManager.cacheData('tasks', serverTasksData)
          ]);
          
          console.log('✅ Data synced and merged successfully');
        } catch (error) {
          console.error('❌ Failed to sync data:', error);
        }
      }
      
      // Force update to refresh UI
      setForceUpdate(prev => prev + 1);
    };

    const handleOffline = () => {
      console.log('📱 Connection lost, switching to offline mode');
      // Force update to refresh UI
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection status periodically for more responsive updates
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to check real connectivity
        const response = await fetch('https://www.google.com/images/cleardot.gif', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache',
          signal: AbortSignal.timeout(2000) // 2 second timeout
        });
        
        // If we get here, we have some form of connectivity
        const currentStatus = navigator.onLine;
        console.log('🔍 Connection check:', currentStatus ? 'Online' : 'Offline');
      } catch (error) {
        // Network error - definitely offline
        console.log('🔍 Connection check: Offline (network error)');
      }
    };

    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isAuthenticated, currentUser]);

  // --- Sync Completion Listener ---
  useEffect(() => {
    const handleSyncCompleted = async (event: CustomEvent) => {
      console.log('🔄 Sync completed event received:', event.detail);
      
      // Reload cached data to get updated IDs
      if (isAuthenticated && currentUser) {
        try {
          const cachedHearings = await offlineManager.getCachedData('hearings');
          console.log('📱 Updated hearings from cache after sync:', cachedHearings);
          
          // Update local state with cached data (which now has real Firebase IDs)
          setHearings(cachedHearings);
          
          // Force UI update
          setForceUpdate(prev => prev + 1);
          setRefreshKey(prev => prev + 1);
          
          console.log('✅ Local state updated with synced data');
        } catch (error) {
          console.error('❌ Failed to update local state after sync:', error);
        }
      }
    };

    // Add event listener for sync completion
    window.addEventListener('offlineSyncCompleted', handleSyncCompleted as EventListener);

    return () => {
      window.removeEventListener('offlineSyncCompleted', handleSyncCompleted as EventListener);
    };
  }, [isAuthenticated, currentUser]);

  // --- Auth Handlers ---
  const handleLogin = async (email: string, password: string) => {
    try {
      console.log('Attempting login for email:', email);
      const user = await loginUser(email, password);
      console.log('Login successful, user:', user);
      
      // Update user's last login in Firestore
      try {
        console.log('Updating last login for user:', user.uid);
        await setDoc(doc(db, 'users', user.uid), {
          lastLogin: new Date().toISOString()
        }, { merge: true });
        console.log('Last login updated successfully');
      } catch (updateError) {
        console.warn('Failed to update last login:', updateError);
        // Don't fail login if last login update fails
      }
      
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Re-throw the error to be handled by the Login component
      throw error;
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
      const lawyerData = {
        name: lawyer.name || '',
        email: lawyer.email || '',
        phone: lawyer.phone || '',
        nationalId: lawyer.nationalId || '',
        barNumber: lawyer.barNumber || '',
        barRegistrationNumber: lawyer.barRegistrationNumber || '',
        barLevel: lawyer.barLevel || BarLevel.GENERAL,
        specialization: lawyer.specialization || LawyerSpecialization.CRIMINAL,
        role: lawyer.role || LawyerRole.LAWYER,
        status: lawyer.status || LawyerStatus.ACTIVE,
        joinDate: lawyer.joinDate || new Date().toISOString().split('T')[0],
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

      // Check if online and try to save to Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          const docId = await createLawyer(lawyerData);
          
          // إضافة المحامي الجديد إلى الحالة المحلية مع الـ ID الصحيح
          setLawyers(prev => {
            const updatedLawyers = [...prev, { 
              ...lawyerData, 
              id: docId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }];
            return updatedLawyers;
          });
          
          // Cache the updated data
          await offlineManager.cacheData('lawyers', [...lawyers, { ...lawyerData, id: docId }]);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving lawyer offline:', error);
          
          // Save to offline queue if Firebase fails
          const tempId = `temp_lawyer_${Date.now()}`;
          setLawyers(prev => {
            const updatedLawyers = [...prev, { 
              ...lawyerData, 
              id: tempId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }];
            return updatedLawyers;
          });
          
          await offlineManager.addPendingAction({
            type: 'create',
            entity: 'lawyer',
            data: { ...lawyerData, tempId }
          });
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, saving lawyer locally');
        const tempId = `temp_lawyer_${Date.now()}`;
        
        // Update local state first
        const newLawyer = { 
          ...lawyerData, 
          id: tempId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const updatedLawyers = [...lawyers, newLawyer];
        
        console.log('📱 App.tsx - New lawyer to add:', newLawyer);
        console.log('📱 App.tsx - Updated lawyers array:', updatedLawyers);
        
        setLawyers([...updatedLawyers]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        await offlineManager.addPendingAction({
          type: 'create',
          entity: 'lawyer',
          data: { ...lawyerData, tempId }
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('lawyers', updatedLawyers);
        console.log('� App.tsx - Lawyer added and cached successfully');
      }
    } catch (error) {
      console.error('Error adding lawyer:', error);
    }
  };

  const handleUpdateLawyer = async (lawyer: Lawyer) => {
    try {
      // Check if online and try to update in Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          // Online: Update in Firebase
          await updateLawyer(lawyer.id, lawyer);
          
          // Update local state
          setLawyers(prev => prev.map(l => l.id === lawyer.id ? lawyer : l));
          
          // Cache the updated data
          await offlineManager.cacheData('lawyers', lawyers.map(l => l.id === lawyer.id ? lawyer : l));
          
          console.log('✅ Lawyer updated online');
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving lawyer update offline:', error);
          
          // Update local state immediately
          setLawyers(prev => prev.map(l => l.id === lawyer.id ? lawyer : l));
          
          // Add to pending actions
          await offlineManager.addPendingAction({
            type: 'update',
            entity: 'lawyer',
            data: lawyer
          });
          
          // Cache locally with updated data
          await offlineManager.cacheData('lawyers', lawyers.map(l => l.id === lawyer.id ? lawyer : l));
          console.log('📴 Lawyer update added to pending actions (fallback)');
        }
      } else {
        // Offline mode - update locally and add to queue
        console.log('📱 App.tsx - Offline mode, updating lawyer locally');
        
        // Update local state first
        const updatedLawyers = lawyers.map(l => l.id === lawyer.id ? lawyer : l);
        
        console.log('📱 App.tsx - Updated lawyers array:', updatedLawyers);
        
        setLawyers([...updatedLawyers]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'lawyer',
          data: lawyer
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('lawyers', updatedLawyers);
        console.log('� App.tsx - Lawyer updated and cached successfully');
      }
    } catch (error) {
      console.error('Error updating lawyer:', error);
    }
  };

  const handleDeleteLawyer = async (lawyerId: string) => {
    try {
      if (navigator.onLine) {
        try {
          // Online: Delete from Firebase
          await deleteLawyer(lawyerId);
          
          // Update local state
          setLawyers(prev => prev.filter(l => l.id !== lawyerId));
          console.log('✅ Lawyer deleted online');
        } catch (error) {
          console.log('📱 Connection failed, switching to offline mode for delete');
          
          // Offline: Add to pending actions
          // Update local state immediately
          setLawyers(prev => prev.filter(l => l.id !== lawyerId));
          
          // Add to pending actions
          await offlineManager.addPendingAction({
            type: 'delete',
            entity: 'lawyer',
            data: { id: lawyerId }
          });
          console.log('📴 Lawyer deletion added to pending actions (fallback)');
        }
      } else {
        // Offline: Add to pending actions
        // Update local state immediately
        setLawyers(prev => prev.filter(l => l.id !== lawyerId));
        
        // Add to pending actions
        await offlineManager.addPendingAction({
          type: 'delete',
          entity: 'lawyer',
          data: { id: lawyerId }
        });
        console.log('📴 Lawyer deletion added to pending actions');
      }
    } catch (error) {
      console.error('Error deleting lawyer:', error);
    }
  };

  const handleAddCase = async (newCase: Omit<Case, 'id'>) => {
    try {
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

      // Check if online and try to save to Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          const caseId = await addCase(caseData);
          
          // إضافة القضية الجديدة إلى الحالة المحلية مع الـ ID الصحيح
          setCases(prev => {
            const updatedCases = [...prev, { ...caseData, id: caseId }];
            return updatedCases;
          });
          
          // Cache the updated data
          await offlineManager.cacheData('cases', [...cases, { ...caseData, id: caseId }]);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving offline:', error);
          
          // Save to offline queue if Firebase fails
          const tempId = `temp_${Date.now()}`;
          setCases(prev => {
            const updatedCases = [...prev, { ...caseData, id: tempId }];
            return updatedCases;
          });
          
          await offlineManager.addPendingAction({
            type: 'create',
            entity: 'case',
            data: caseData
          });
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, saving case locally');
        const tempId = `temp_${Date.now()}`;
        
        // Update local state first
        const newCase = { ...caseData, id: tempId };
        const updatedCases = [...cases, newCase];
        
        console.log('📱 App.tsx - New case to add:', newCase);
        console.log('📱 App.tsx - Updated cases array:', updatedCases);
        
        setCases([...updatedCases]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        await offlineManager.addPendingAction({
          type: 'create',
          entity: 'case',
          data: caseData
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('cases', updatedCases);
        console.log('📱 App.tsx - Case added and cached successfully');
      }
      
      // Log activity (works offline too)
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
      // التحقق من وجود id
      if (!updatedCase.id) {
        console.error('❌ App.tsx - Case ID is missing:', updatedCase);
        setError('لا يمكن تحديث قضية بدون معرف');
        return;
      }

      // Check if online and try to update in Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          // تحديث في Firebase
          await updateCase(updatedCase.id, updatedCase);
          
          // تحديث الحالة المحلية بشكل صحيح
          let updatedCases;
          setCases(prev => {
            updatedCases = prev.map(c => {
              if (c.id === updatedCase.id) {
                // دمج البيانات بدلاً من الاستبدال الكامل
                return { ...c, ...updatedCase };
              }
              return c;
            });
            console.log('App.tsx - Updated cases array:', updatedCases);
            console.log('App.tsx - Looking for case with ID:', updatedCase.id);
            console.log('App.tsx - Updated case in array:', updatedCases.find(c => c.id === updatedCase.id));
            return updatedCases;
          });
          
          // Cache the updated data
          await offlineManager.cacheData('cases', updatedCases);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving update offline:', error);
          
          // Save update to offline queue if Firebase fails
          setCases(prev => {
            const updatedCases = prev.map(c => {
              if (c.id === updatedCase.id) {
                return { ...c, ...updatedCase };
              }
              return c;
            });
            return updatedCases;
          });
          
          await offlineManager.addPendingAction({
            type: 'update',
            entity: 'case',
            data: updatedCase
          });
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, updating case locally');
        console.log('📱 App.tsx - Case to update:', updatedCase);
        console.log('📱 App.tsx - Current cases before update:', cases);
        
        // Update local state first
        const updatedCases = cases.map(c => {
          if (c.id === updatedCase.id) {
            console.log('📱 App.tsx - Found case to update:', c);
            console.log('📱 App.tsx - Updated case will be:', { ...c, ...updatedCase });
            return { ...c, ...updatedCase };
          }
          return c;
        });
        
        console.log('📱 App.tsx - Updated cases array:', updatedCases);
        console.log('📱 App.tsx - Setting cases with new data...');
        
        // Force update with new array reference
        setCases([...updatedCases]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        // Verify the update happened
        setTimeout(() => {
          console.log('📱 App.tsx - Cases after setCases:', cases);
        }, 100);
        
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'case',
          data: updatedCase
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('cases', updatedCases);
        console.log('📱 App.tsx - Case updated and cached successfully');
      }
      
      // Log activity (works offline too)
      await handleAddActivity({
        action: 'تعديل بيانات القضية',
        target: updatedCase.title,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('❌ App.tsx - Error updating case:', err);
      setError('فشل في تحديث القضية');
    }
  };

  const handleAddHearing = async (newHearing: Hearing) => {
    try {
      // التحقق من عدم وجود الجلسة مسبقاً (لمنع التكرار)
      const existingHearing = hearings.find(h => 
        h.caseId === newHearing.caseId && 
        h.date === newHearing.date && 
        h.time === newHearing.time
      );
      
      if (existingHearing) {
        console.warn('⚠️ App.tsx - Hearing already exists:', existingHearing);
        setError('هذه الجلسة موجودة بالفعل');
        return;
      }

      // إضافة اسم المحامي إذا تم اختياره
      const hearingData = {
        ...newHearing,
        assignedLawyerName: newHearing.assignedLawyerId ? 
          (lawyers.find(l => l.id === newHearing.assignedLawyerId)?.name || '') : ''
      };

      // Check if online and try to save to Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          console.log('🌐 App.tsx - Online mode, saving hearing to Firebase');
          const hearingId = await addHearing(hearingData);
          
          // إضافة الجلسة الجديدة إلى الحالة المحلية مع الـ ID الصحيح
          setHearings(prev => {
            const updatedHearings = [{ ...hearingData, id: hearingId }, ...prev];
            return updatedHearings;
          });
          
          // Cache the updated data
          await offlineManager.cacheData('hearings', [{ ...hearingData, id: hearingId }, ...hearings]);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving hearing offline:', error);
          
          // Save to offline queue if Firebase fails
          const tempId = `temp_hearing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const hearingWithTempId = { ...hearingData, id: tempId };
          
          setHearings(prev => {
            const updatedHearings = [hearingWithTempId, ...prev];
            return updatedHearings;
          });
          
          await offlineManager.addPendingAction({
            type: 'create',
            entity: 'hearing',
            data: hearingData
          });
          
          // Cache locally with temp ID
          await offlineManager.cacheData('hearings', [hearingWithTempId, ...hearings]);
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, saving hearing locally');
        const tempId = `temp_hearing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const hearingWithTempId = { ...hearingData, id: tempId };
        
        // Update local state first
        const updatedHearings = [hearingWithTempId, ...hearings];
        
        console.log('📱 App.tsx - New hearing to add:', hearingWithTempId);
        console.log('📱 App.tsx - Updated hearings array:', updatedHearings);
        
        setHearings([...updatedHearings]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        await offlineManager.addPendingAction({
          type: 'create',
          entity: 'hearing',
          data: hearingData
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('hearings', updatedHearings);
        console.log('📱 App.tsx - Hearing added and cached successfully');
      }
      
      // Log activity (works offline too)
      const caseTitle = cases.find(c => c.id === newHearing.caseId)?.title || 'قضية غير معروفة';
      await handleAddActivity({
        action: 'إضافة جلسة جديدة',
        target: caseTitle,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ App.tsx - Error adding hearing:', error);
      setError('فشل في إضافة الجلسة');
    }
  };

  const handleUpdateHearing = async (updatedHearing: Hearing) => {
    try {
      // التحقق من وجود ID
      if (!updatedHearing.id) {
        console.error('❌ App.tsx - Hearing ID is missing:', updatedHearing);
        setError('لا يمكن تحديث جلسة بدون معرف');
        return;
      }

      // التحقق من وجود الجلسة
      const existingHearing = hearings.find(h => h.id === updatedHearing.id);
      if (!existingHearing) {
        console.error('❌ App.tsx - Hearing not found:', updatedHearing.id);
        setError('الجلسة غير موجودة');
        return;
      }

      // إضافة اسم المحامي إذا تم اختياره
      const hearingData = {
        ...updatedHearing,
        assignedLawyerName: updatedHearing.assignedLawyerId ? 
          (lawyers.find(l => l.id === updatedHearing.assignedLawyerId)?.name || '') : ''
      };

      // Check if online and try to update in Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          console.log('🌐 App.tsx - Online mode, updating hearing in Firebase');
          // Update hearing first
          await updateHearing(updatedHearing.id, hearingData);
          const updatedHearings = hearings.map(h => h.id === updatedHearing.id ? hearingData : h);
          setHearings(updatedHearings);
          
          // If the hearing has expenses, also update case expenses
          if (hearingData.expenses && hearingData.expenses.amount > 0 && hearingData.caseId) {
            const targetCase = cases.find(c => c.id === hearingData.caseId);
            if (targetCase) {
              
              // Create a unique identifier for this expense record
              const expenseIdentifier = `${hearingData.id}-${hearingData.expenses.amount}-${hearingData.expenses.description}`;
              
              // Check if this hearing expense was already recorded using multiple criteria
              const existingExpense = targetCase.finance?.history?.find(
                transaction => 
                  transaction.hearingId === hearingData.id && 
                  transaction.type === 'expense'
              );
              
              // Check for exact match including amount and description
              const exactMatch = targetCase.finance?.history?.find(
                transaction => 
                  transaction.hearingId === hearingData.id && 
                  transaction.type === 'expense' &&
                  transaction.amount === hearingData.expenses.amount &&
                  transaction.description?.includes(hearingData.expenses.description)
              );
              
              // Check for recent addition (within last 5 seconds) to prevent rapid duplicates
              const recentAddition = targetCase.finance?.history?.find(
                transaction => 
                  transaction.hearingId === hearingData.id && 
                  transaction.type === 'expense' &&
                  new Date(transaction.date).getTime() > (Date.now() - 5000)
              );
              
              // Only add if not already recorded and not recently added
              if (!existingExpense && !exactMatch && !recentAddition) {
                // Add hearing expenses to case finance.expenses
                const updatedCase = {
                  ...targetCase,
                  finance: {
                    ...(targetCase.finance || {
                      agreedFees: 0,
                      paidAmount: 0,
                      expenses: 0,
                      history: []
                    }),
                    expenses: (targetCase.finance?.expenses || 0) + hearingData.expenses.amount,
                    history: [
                      ...(targetCase.finance?.history || []),
                      {
                        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                        type: 'expense' as const,
                        amount: hearingData.expenses.amount,
                        description: `مصاريف الجلسة - ${hearingData.date}: ${hearingData.expenses.description}`,
                        date: new Date().toISOString(), // Use current timestamp for better tracking
                        paidBy: hearingData.expenses.paidBy,
                        hearingId: hearingData.id,
                        recordedBy: 'System'
                      }
                    ]
                  }
                };
                
                // Update case with new expenses
                await updateCase(hearingData.caseId, updatedCase);
                setCases(prev => prev.map(c => c.id === hearingData.caseId ? updatedCase : c));
              } else {
                // Hearing expenses already recorded, skipping duplicate entry
                console.log('💰 App.tsx - Hearing expenses already recorded, skipping duplicate');
              }
            } else {
              // Target case not found
              console.warn('⚠️ App.tsx - Target case not found for hearing expenses');
            }
          } else {
            // No expenses to process for this hearing
            console.log('💰 App.tsx - No expenses to process for this hearing');
          }
          
          // Cache the updated data
          await offlineManager.cacheData('hearings', updatedHearings);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving hearing update offline:', error);
          
          // Save update to offline queue if Firebase fails
          const updatedHearings = hearings.map(h => h.id === updatedHearing.id ? hearingData : h);
          setHearings(updatedHearings);
          
          await offlineManager.addPendingAction({
            type: 'update',
            entity: 'hearing',
            data: hearingData
          });
          
          // Cache locally with updated data
          await offlineManager.cacheData('hearings', updatedHearings);
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, updating hearing locally');
        console.log('📱 App.tsx - Hearing to update:', hearingData);
        console.log('📱 App.tsx - Current hearings before update:', hearings);
        
        // Update local state first
        const updatedHearings = hearings.map(h => {
          if (h.id === updatedHearing.id) {
            console.log('📱 App.tsx - Found hearing to update:', h);
            console.log('📱 App.tsx - Updated hearing will be:', hearingData);
            return hearingData;
          }
          return h;
        });
        
        console.log('📱 App.tsx - Updated hearings array:', updatedHearings);
        console.log('📱 App.tsx - Setting hearings with new data...');
        
        // Force update with new array reference
        setHearings([...updatedHearings]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        // Verify the update happened
        setTimeout(() => {
          console.log('📱 App.tsx - Hearings after setHearings:', hearings);
        }, 100);
        
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'hearing',
          data: hearingData
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('hearings', updatedHearings);
        console.log('📱 App.tsx - Hearing updated and cached successfully');
      }
      
      // Log activity (works offline too)
      const caseTitle = cases.find(c => c.id === updatedHearing.caseId)?.title || 'قضية غير معروفة';
      await handleAddActivity({
        action: 'تعديل بيانات الجلسة',
        target: `${updatedHearing.date} - ${caseTitle}`,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('❌ App.tsx - Error updating hearing:', err);
      setError('فشل في تحديث الجلسة');
    }
  };

  const handleDeleteHearing = async (hearingId: string) => {
    try {
      // التحقق من وجود الجلسة
      const hearingToDelete = hearings.find(h => h.id === hearingId);
      if (!hearingToDelete) {
        console.error('❌ App.tsx - Hearing not found for deletion:', hearingId);
        setError('الجلسة غير موجودة');
        return;
      }

      // Get real ID if this is a temp ID
      const realId = offlineManager.getRealId(hearingId);
      console.log(`🗑️ App.tsx - Deleting hearing with ID: ${hearingId} (real: ${realId})`);

      // Check if online and try to delete from Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          console.log('🌐 App.tsx - Online mode, deleting hearing from Firebase');
          await deleteHearing(realId);
          const updatedHearings = hearings.filter(h => h.id !== hearingId);
          setHearings(updatedHearings);
          
          // Cache the updated data
          await offlineManager.cacheData('hearings', updatedHearings);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving hearing deletion offline:', error);
          
          // Save deletion to offline queue if Firebase fails
          const updatedHearings = hearings.filter(h => h.id !== hearingId);
          setHearings(updatedHearings);
          
          await offlineManager.addPendingAction({
            type: 'delete',
            entity: 'hearing',
            data: { id: hearingId }
          });
          
          // Cache locally with updated data
          await offlineManager.cacheData('hearings', updatedHearings);
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, deleting hearing locally');
        console.log('📱 App.tsx - Hearing ID to delete:', hearingId);
        console.log('📱 App.tsx - Current hearings before delete:', hearings);
        
        // Update local state first
        const updatedHearings = hearings.filter(h => h.id !== hearingId);
        
        console.log('📱 App.tsx - Updated hearings array:', updatedHearings);
        console.log('📱 App.tsx - Setting hearings with new data...');
        
        // Force update with new array reference
        setHearings([...updatedHearings]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        // Verify the deletion happened
        setTimeout(() => {
          console.log('📱 App.tsx - Hearings after setHearings:', hearings);
        }, 100);
        
        await offlineManager.addPendingAction({
          type: 'delete',
          entity: 'hearing',
          data: { id: hearingId }
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('hearings', updatedHearings);
        console.log('📱 App.tsx - Hearing deleted and cached successfully');
      }
      
      // Log activity (works offline too)
      const caseTitle = cases.find(c => c.id === hearingToDelete.caseId)?.title || 'قضية غير معروفة';
      await handleAddActivity({
        action: 'حذف جلسة',
        target: `${hearingToDelete.date} - ${caseTitle}`,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ App.tsx - Error deleting hearing:', error);
      setError('فشل في حذف الجلسة');
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

      // Check if online and try to save to Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          const clientId = await addClient(cleanClient);
          setClients(prev => [{ ...newClient, id: clientId }, ...prev]);
          
          // Cache the updated data
          await offlineManager.cacheData('clients', [{ ...newClient, id: clientId }, ...clients]);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving client offline:', error);
          
          // Save to offline queue if Firebase fails
          const tempId = `temp_client_${Date.now()}`;
          setClients(prev => [{ ...newClient, id: tempId }, ...prev]);
          
          await offlineManager.addPendingAction({
            type: 'create',
            entity: 'client',
            data: cleanClient
          });
          
          // Cache locally with updated data
          await offlineManager.cacheData('clients', [{ ...newClient, id: tempId }, ...clients]);
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, saving client locally');
        const tempId = `temp_client_${Date.now()}`;
        
        // Update local state first
        const newClientWithId = { ...newClient, id: tempId };
        const updatedClients = [newClientWithId, ...clients];
        
        console.log('📱 App.tsx - New client to add:', newClientWithId);
        console.log('📱 App.tsx - Updated clients array:', updatedClients);
        
        setClients([...updatedClients]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        await offlineManager.addPendingAction({
          type: 'create',
          entity: 'client',
          data: cleanClient
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('clients', updatedClients);
        console.log('📱 App.tsx - Client added and cached successfully');
      }
      
      // Log activity (works offline too)
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
      // التحقق من وجود id
      if (!updatedClient.id) {
        console.error('❌ App.tsx - Client ID is missing:', updatedClient);
        setError('لا يمكن تحديث موكل بدون معرف');
        return;
      }
      
      // Check if online and try to update in Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          // تحديث في Firebase
          await updateClient(updatedClient.id, updatedClient);
          
          // تحديث الحالة المحلية بشكل صحيح
          setClients(prev => {
            const updatedClients = prev.map(c => {
              if (c.id === updatedClient.id) {
                // دمج البيانات بدلاً من الاستبدال الكامل
                return { ...c, ...updatedClient };
              }
              return c;
            });
            return updatedClients;
          });
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving update offline:', error);
          
          // Save update to offline queue if Firebase fails
          setClients(prev => {
            const updatedClients = prev.map(c => {
              if (c.id === updatedClient.id) {
                return { ...c, ...updatedClient };
              }
              return c;
            });
            return updatedClients;
          });
          
          await offlineManager.addPendingAction({
            type: 'update',
            entity: 'client',
            data: updatedClient
          });
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, updating client locally');
        console.log('📱 App.tsx - Client to update:', updatedClient);
        console.log('📱 App.tsx - Current clients before update:', clients);
        
        // Update local state first
        const updatedClients = clients.map(c => {
          if (c.id === updatedClient.id) {
            console.log('📱 App.tsx - Found client to update:', c);
            console.log('📱 App.tsx - Updated client will be:', { ...c, ...updatedClient });
            return { ...c, ...updatedClient };
          }
          return c;
        });
        
        console.log('📱 App.tsx - Updated clients array:', updatedClients);
        console.log('📱 App.tsx - Setting clients with new data...');
        
        // Force update with new array reference
        setClients([...updatedClients]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        // Verify the update happened
        setTimeout(() => {
          console.log('📱 App.tsx - Clients after setClients:', clients);
        }, 100);
        
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'client',
          data: updatedClient
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('clients', updatedClients);
        console.log('📱 App.tsx - Client updated and cached successfully');
      }
      
      // Log activity (works offline too)
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
      // Check if online and try to save to Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          const taskId = await addTask(newTask);
          setTasks(prev => [{ ...newTask, id: taskId }, ...prev]);
          
          // Cache the updated data
          await offlineManager.cacheData('tasks', [{ ...newTask, id: taskId }, ...tasks]);
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving task offline:', error);
          
          // Save to offline queue if Firebase fails
          const tempId = `temp_task_${Date.now()}`;
          setTasks(prev => [{ ...newTask, id: tempId }, ...prev]);
          
          await offlineManager.addPendingAction({
            type: 'create',
            entity: 'task',
            data: newTask
          });
          
          // Cache locally with updated data
          await offlineManager.cacheData('tasks', [{ ...newTask, id: tempId }, ...tasks]);
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, saving task locally');
        const tempId = `temp_task_${Date.now()}`;
        
        // Update local state first
        const newTaskWithId = { ...newTask, id: tempId };
        const updatedTasks = [newTaskWithId, ...tasks];
        
        console.log('📱 App.tsx - New task to add:', newTaskWithId);
        console.log('📱 App.tsx - Updated tasks array:', updatedTasks);
        
        setTasks([...updatedTasks]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        await offlineManager.addPendingAction({
          type: 'create',
          entity: 'task',
          data: newTask
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('tasks', updatedTasks);
        console.log('📱 App.tsx - Task added and cached successfully');
      }
      
      // Log activity (works offline too)
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
      // Check if online and try to update in Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          // Safety check: verify task exists before updating
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./services/firebaseConfig');
          const taskDoc = await getDoc(doc(db, "tasks", updatedTask.id));
          
          if (!taskDoc.exists()) {
            console.warn(`⚠️ Task ${updatedTask.id} not found in Firebase, removing from local state`);
            // Remove from local state if it doesn't exist in Firebase
            setTasks(prev => prev.filter(t => t.id !== updatedTask.id));
            return;
          }
          
          // تحديث في Firebase
          await updateTask(updatedTask.id, updatedTask);
          
          // تحديث الحالة المحلية بشكل صحيح
          setTasks(prev => {
            const updatedTasks = prev.map(t => {
              if (t.id === updatedTask.id) {
                // دمج البيانات بدلاً من الاستبدال الكامل
                return { ...t, ...updatedTask };
              }
              return t;
            });
            return updatedTasks;
          });
          
          // Cache the updated data
          await offlineManager.cacheData('tasks', tasks.map(t => 
            t.id === updatedTask.id ? { ...t, ...updatedTask } : t
          ));
          
        } catch (error) {
          console.error('❌ App.tsx - Firebase error, saving update offline:', error);
          
          // Save update to offline queue if Firebase fails
          setTasks(prev => {
            const updatedTasks = prev.map(t => {
              if (t.id === updatedTask.id) {
                return { ...t, ...updatedTask };
              }
              return t;
            });
            return updatedTasks;
          });
          
          await offlineManager.addPendingAction({
            type: 'update',
            entity: 'task',
            data: updatedTask
          });
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, updating task locally');
        console.log('📱 App.tsx - Task to update:', updatedTask);
        console.log('📱 App.tsx - Current tasks before update:', tasks);
        
        // Update local state first
        const updatedTasks = tasks.map(t => {
          if (t.id === updatedTask.id) {
            console.log('📱 App.tsx - Found task to update:', t);
            console.log('📱 App.tsx - Updated task will be:', { ...t, ...updatedTask });
            return { ...t, ...updatedTask };
          }
          return t;
        });
        
        console.log('📱 App.tsx - Updated tasks array:', updatedTasks);
        console.log('📱 App.tsx - Setting tasks with new data...');
        
        // Force update with new array reference
        setTasks([...updatedTasks]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1); // Additional force re-render
        
        // Verify the update happened
        setTimeout(() => {
          console.log('📱 App.tsx - Tasks after setTasks:', tasks);
        }, 100);
        
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'task',
          data: updatedTask
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('tasks', updatedTasks);
        console.log('📱 App.tsx - Task updated and cached successfully');
      }
      
      // Log activity (works offline too)
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
        // Get real ID if this is a temp ID
        const realId = offlineManager.getRealId(taskId);
        console.log(`🗑️ App.tsx - Deleting task with ID: ${taskId} (real: ${realId})`);
        
        // Check if online and try to delete from Firebase
        const isOnline = await checkNetworkConnectivity();
        
        if (isOnline) {
          try {
            // Delete from Firestore using real ID
            await deleteTask(realId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            
            // Cache the updated data
            await offlineManager.cacheData('tasks', tasks.filter(t => t.id !== taskId));
            
          } catch (error) {
            console.error('❌ App.tsx - Firebase error, saving delete offline:', error);
            
            // Save delete to offline queue if Firebase fails
            setTasks(prev => prev.filter(t => t.id !== taskId));
            
            await offlineManager.addPendingAction({
              type: 'delete',
              entity: 'task',
              data: { id: taskId }
            });
          }
        } else {
          // Offline mode - save locally and add to queue
          console.log('📱 App.tsx - Offline mode, deleting task locally');
          
          // Update local state first
          const updatedTasks = tasks.filter(t => t.id !== taskId);
          console.log('📱 App.tsx - Tasks after deletion:', updatedTasks);
          
          setTasks([...updatedTasks]);
          
          // Force re-render of components
          setForceUpdate(prev => prev + 1);
          setRefreshKey(prev => prev + 1); // Additional force re-render
          
          await offlineManager.addPendingAction({
            type: 'delete',
            entity: 'task',
            data: { id: taskId }
          });
          
          // Cache locally with updated data
          await offlineManager.cacheData('tasks', updatedTasks);
          console.log('📱 App.tsx - Task deleted and cached successfully');
        }
        
        // Log activity (works offline too)
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

  // --- Appointments Handlers ---
  const handleAddAppointment = async (newAppointment: Appointment) => {
    try {
      console.log('📅 Adding appointment:', newAppointment);
      
      // Always update local state immediately for better UX
      const tempId = `temp_appointment_${Date.now()}`;
      const appointmentWithId = { ...newAppointment, id: tempId };
      
      setAppointments(prev => {
        const updated = [appointmentWithId, ...prev];
        console.log('📅 Appointments after add:', updated);
        return updated;
      });
      
      // Cache the updated data
      await offlineManager.cacheData('appointments', [appointmentWithId, ...appointments]);
      
      // Check if online and try to save to Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          // Save to Firebase
          const firebaseId = await addAppointment(newAppointment);
          console.log('✅ Appointment saved to Firebase with ID:', firebaseId);
          
          // Update local state with Firebase ID
          setAppointments(prev => {
            const updated = prev.map(a => 
              a.id === appointmentWithId.id ? { ...newAppointment, id: firebaseId } : a
            );
            console.log('📅 Appointments after Firebase save:', updated);
            return updated;
          });
          
        } catch (error) {
          console.error('❌ App.tsx - Error saving appointment to Firebase:', error);
          
          // Save to offline queue if Firebase fails
          await offlineManager.addPendingAction({
            type: 'create',
            entity: 'appointment',
            data: newAppointment
          });
          
          console.log('📱 Appointment added to offline queue');
        }
      } else {
        // Offline mode - add to pending actions
        console.log('📱 Offline mode - adding to queue');
        
        await offlineManager.addPendingAction({
          type: 'create',
          entity: 'appointment',
          data: newAppointment
        });
        
        console.log('📱 Appointment saved offline');
      }
      
      // Log activity (works offline too)
      const caseTitle = newAppointment.relatedCaseId ? cases.find(c => c.id === newAppointment.relatedCaseId)?.title || 'قضية غير معروفة' : 'موعد عام';
      await handleAddActivity({
        action: 'إضافة موعد جديد',
        target: `${newAppointment.title} - ${caseTitle}`,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      console.error('Error adding appointment:', err);
      setError('فشل في إضافة الموعد');
    }
  };

  const handleUpdateAppointment = async (updatedAppointment: Appointment) => {
    try {
      // Check if online and try to update in Firebase
      const isOnline = await checkNetworkConnectivity();
      
      if (isOnline) {
        try {
          // Update in Firebase
          await updateAppointment(updatedAppointment.id, updatedAppointment);
          console.log('✅ Appointment updated in Firebase');
          
          // Update local state
          setAppointments(prev => {
            const updatedAppointments = prev.map(a => {
              if (a.id === updatedAppointment.id) {
                return { ...a, ...updatedAppointment };
              }
              return a;
            });
            return updatedAppointments;
          });
          
        } catch (error) {
          console.error('❌ App.tsx - Error updating appointment in Firebase:', error);
          
          // Save update to offline queue if Firebase fails
          setAppointments(prev => {
            const updatedAppointments = prev.map(a => {
              if (a.id === updatedAppointment.id) {
                return { ...a, ...updatedAppointment };
              }
              return a;
            });
            return updatedAppointments;
          });
          
          await offlineManager.addPendingAction({
            type: 'update',
            entity: 'appointment',
            data: updatedAppointment
          });
        }
      } else {
        // Offline mode - save locally and add to queue
        console.log('📱 App.tsx - Offline mode, updating appointment locally');
        
        // Update local state first
        const updatedAppointments = appointments.map(a => {
          if (a.id === updatedAppointment.id) {
            return { ...a, ...updatedAppointment };
          }
          return a;
        });
        
        // Force update with new array reference
        setAppointments([...updatedAppointments]);
        
        // Force re-render of components
        setForceUpdate(prev => prev + 1);
        setRefreshKey(prev => prev + 1);
        
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'appointment',
          data: updatedAppointment
        });
        
        // Cache locally with updated data
        await offlineManager.cacheData('appointments', updatedAppointments);
        console.log('📱 App.tsx - Appointment updated and cached successfully');
      }
      
      // Log activity (works offline too)
      const caseTitle = updatedAppointment.relatedCaseId ? cases.find(c => c.id === updatedAppointment.relatedCaseId)?.title || 'قضية غير معروفة' : 'موعد عام';
      await handleAddActivity({
        action: 'تعديل الموعد',
        target: `${updatedAppointment.title} - ${caseTitle}`,
        user: currentUser?.name || 'مستخدم',
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('فشل في تحديث الموعد');
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      const appointmentToDelete = appointments.find(a => a.id === appointmentId);
      if (appointmentToDelete) {
        // Check if online and try to delete from Firebase
        const isOnline = await checkNetworkConnectivity();
        
        if (isOnline) {
          try {
            // Delete from Firebase
            await deleteAppointment(appointmentId);
            console.log('✅ Appointment deleted from Firebase');
            
            // Update local state
            setAppointments(prev => prev.filter(a => a.id !== appointmentId));
            
          } catch (error) {
            console.error('❌ App.tsx - Error deleting appointment from Firebase:', error);
            
            // Update local state first
            const updatedAppointments = appointments.filter(a => a.id !== appointmentId);
            setAppointments([...updatedAppointments]);
            
            await offlineManager.addPendingAction({
              type: 'delete',
              entity: 'appointment',
              data: { id: appointmentId }
            });
          }
        } else {
          // Offline mode - delete locally and add to queue
          console.log('📱 App.tsx - Offline mode, deleting appointment locally');
          
          // Update local state first
          const updatedAppointments = appointments.filter(a => a.id !== appointmentId);
          
          setAppointments([...updatedAppointments]);
          
          // Force re-render of components
          setForceUpdate(prev => prev + 1);
          setRefreshKey(prev => prev + 1);
          
          await offlineManager.addPendingAction({
            type: 'delete',
            entity: 'appointment',
            data: { id: appointmentId }
          });
          
          // Cache locally with updated data
          await offlineManager.cacheData('appointments', updatedAppointments);
          console.log('📱 App.tsx - Appointment deleted and cached successfully');
        }
        
        // Log activity (works offline too)
        const caseTitle = appointmentToDelete.relatedCaseId ? cases.find(c => c.id === appointmentToDelete.relatedCaseId)?.title || 'قضية غير معروفة' : 'موعد عام';
        await handleAddActivity({
          action: 'حذف الموعد',
          target: `${appointmentToDelete.title} - ${caseTitle}`,
          user: currentUser?.name || 'مستخدم',
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
      setError('فشل في حذف الموعد');
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
          appointments={appointments}
          onCaseClick={handleCaseClick}
          onUpdateTask={handleUpdateTask}
          onAddActivity={handleAddActivity}
          onNavigate={setCurrentPage}
          onUpdateCase={handleUpdateCase}
          onUpdateClient={handleUpdateClient}
          readOnly={isReadOnly('dashboard')}
          generalSettings={generalSettings}
        />;
      case 'cases':
        return <Cases 
          key={`cases-${forceUpdate}-${refreshKey}`}
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
          key={`clients-${forceUpdate}-${refreshKey}`}
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
      case 'appointments':
        return <Appointments 
          key={`appointments-${forceUpdate}-${refreshKey}`}
          appointments={appointments} 
          cases={cases}
          clients={clients}
          users={users}
          onAddAppointment={handleAddAppointment}
          onUpdateAppointment={handleUpdateAppointment}
          onDeleteAppointment={handleDeleteAppointment}
          onCaseClick={handleCaseClick}
          readOnly={isReadOnly('appointments')} // Pass prop
          forceUpdate={forceUpdate}
          refreshKey={refreshKey}
        />;
      case 'documents':
        return <Documents 
          key={`documents-${forceUpdate}-${refreshKey}`}
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
          key={`fees-${forceUpdate}`}
          cases={cases} 
          clients={clients}
          hearings={hearings}
          onUpdateCase={handleUpdateCase}
          onAddActivity={handleAddActivity}
          canViewIncome={hasAccess('fees')}
          canViewExpenses={hasAccess('expenses')}
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
              key={`ai-assistant-${forceUpdate}-${refreshKey}`}
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
              key={`archive-${forceUpdate}-${refreshKey}`}
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
              key={`case-details-${forceUpdate}-${refreshKey}`}
              caseId={selectedCaseId}
              cases={cases}
              clients={clients}
              lawyers={lawyers}
              hearings={hearings}
              onBack={handleBackToCases}
              onUpdateCase={handleUpdateCase}
              onAddHearing={handleAddHearing}
              onAddTask={handleAddTask}
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
          appointments={appointments}
        >
          {renderPage()}
        </Layout>
      )}
    </>
  );
}

export default App;
