import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from './firebaseConfig';
import { Client, Case, Hearing, Task, ActivityLog, AppUser, LegalReference, WorkLocation, Lawyer, LawyerDocument, LawyerPerformance, Appointment } from "../types";

// --- Clients ---
export const getClients = async (): Promise<Client[]> => {
  const querySnapshot = await getDocs(collection(db, "clients"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
};

// دالة تنظيف قوية لإزالة جميع قيم undefined والحقول الفارغة
const cleanObject = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    const value = obj[key];
    
    // تخطي الحقول undefined و null و empty strings
    if (value === undefined || value === null || value === '') {
      continue;
    }
    
    // إذا كانت مصفوفة، قم بتنظيف كل عنصر فيها بشكل متكرر
    if (Array.isArray(value)) {
      cleaned[key] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return cleanObject(item);
        }
        return item;
      });
    } 
    // إذا كان كائن، قم بتنظيفه بشكل متكرر
    else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanObject(value);
    } 
    // القيم البسيطة، احتفظ بها
    else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

export const addClient = async (client: Omit<Client, 'id'>): Promise<string> => {
  // تنظيف الحقول undefined قبل إرسالها إلى Firebase
  const cleanClient = cleanObject(client);
  
  const docRef = await addDoc(collection(db, "clients"), cleanClient);
  return docRef.id;
};

export const updateClient = async (id: string, client: Partial<Client>) => {
  // فحص المستندات بشكل خاص
  if (client.documents) {
    client.documents.forEach((doc, index) => {
      Object.entries(doc).forEach(([key, value]) => {
        if (value === undefined) {
          console.error(`❌ Found undefined in document ${index}, key: ${key}`);
        }
      });
    });
  }
  
  // إزالة حقل id من البيانات قبل التنظيف
  const { id: _, ...clientWithoutId } = client;
  
  // تنظيف الحقول undefined قبل إرسالها إلى Firebase
  const cleanClient = cleanObject(clientWithoutId);
  
  // التحقق النهائي
  const hasUndefined = Object.values(cleanClient).some(val => val === undefined);
  if (hasUndefined) {
    console.error('❌ dbService.ts ERROR: Still has undefined values!', cleanClient);
    throw new Error('Cannot update client with undefined values');
  }
  
  const docRef = doc(db, "clients", id);
  await updateDoc(docRef, cleanClient);
};

export const deleteClient = async (id: string) => {
  await deleteDoc(doc(db, "clients", id));
};

// --- Cases ---
export const getCases = async (): Promise<Case[]> => {
  const querySnapshot = await getDocs(collection(db, "cases"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Case));
};

export const addCase = async (caseData: Omit<Case, 'id'>): Promise<string> => {
  // تنظيف الحقول undefined قبل إرسالها إلى Firebase
  const cleanCaseData = cleanObject(caseData);
  
  const docRef = await addDoc(collection(db, "cases"), cleanCaseData);
  
  return docRef.id;
};

export const updateCase = async (id: string, caseData: Partial<Case>) => {
  // إزالة حقل id من البيانات قبل التنظيف
  const { id: _, ...caseWithoutId } = caseData;
  
  // تنظيف الحقول undefined قبل إرسالها إلى Firebase
  const cleanCaseData = cleanObject(caseWithoutId);
  
  const docRef = doc(db, "cases", id);
  try {
    await updateDoc(docRef, cleanCaseData);
  } catch (error) {
    // If document doesn't exist, create it with setDoc
    if (error instanceof Error && error.message.includes('No document to update')) {
      console.log(`⚠️ Case ${id} not found, creating new document`);
      await setDoc(docRef, { ...caseData, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } else {
      throw error;
    }
  }
};

// --- Hearings ---
export const getHearings = async (): Promise<Hearing[]> => {
  const querySnapshot = await getDocs(collection(db, "hearings"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hearing));
};

export const addHearing = async (hearing: Omit<Hearing, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "hearings"), hearing);
  return docRef.id;
};

export const updateHearing = async (id: string, hearingData: Partial<Hearing>) => {
  const docRef = doc(db, "hearings", id);
  
  // Remove undefined values from hearingData before sending to Firebase
  const cleanedData = Object.keys(hearingData).reduce((acc, key) => {
    const value = hearingData[key as keyof Hearing];
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {} as Partial<Hearing>);
  
  await updateDoc(docRef, cleanedData);
};

export const deleteHearing = async (id: string) => {
  await deleteDoc(doc(db, "hearings", id));
};

// --- Tasks ---
export const getTasks = async (): Promise<Task[]> => {
  const querySnapshot = await getDocs(collection(db, "tasks"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
};

export const addTask = async (task: Omit<Task, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "tasks"), task);
  return docRef.id;
};

export const updateTask = async (id: string, taskData: Partial<Task>) => {
  const docRef = doc(db, "tasks", id);
  await updateDoc(docRef, taskData);
};

export const deleteTask = async (id: string) => {
  await deleteDoc(doc(db, "tasks", id));
};

// --- Appointments ---
export const getAppointments = async (): Promise<Appointment[]> => {
  const querySnapshot = await getDocs(collection(db, "appointments"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
};

export const addAppointment = async (appointment: Omit<Appointment, 'id'>): Promise<string> => {
  // تنظيف الحقول undefined قبل إرسالها إلى Firebase
  const cleanAppointment = cleanObject(appointment);
  
  const docRef = await addDoc(collection(db, "appointments"), {
    ...cleanAppointment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return docRef.id;
};

export const updateAppointment = async (id: string, appointmentData: Partial<Appointment>) => {
  // إزالة حقل id من البيانات قبل التنظيف
  const { id: _, ...appointmentWithoutId } = appointmentData;
  
  // تنظيف الحقول undefined قبل إرسالها إلى Firebase
  const cleanAppointment = cleanObject(appointmentWithoutId);
  
  const docRef = doc(db, "appointments", id);
  try {
    await updateDoc(docRef, {
      ...cleanAppointment,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    // If document doesn't exist, create it with setDoc
    if (error instanceof Error && error.message.includes('No document to update')) {
      console.log(`⚠️ Appointment ${id} not found, creating new document`);
      await setDoc(docRef, { 
        ...appointmentData, 
        id, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString() 
      });
    } else {
      throw error;
    }
  }
};

export const deleteAppointment = async (id: string) => {
  await deleteDoc(doc(db, "appointments", id));
};

// Real-time listener for appointments
export const subscribeToAppointments = (callback: (appointments: Appointment[]) => void) => {
  const q = query(collection(db, "appointments"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
    callback(appointments);
  });
};

// --- Users (Lawyers/Staff) ---
export const getAppUsers = async (): Promise<AppUser[]> => {
  const querySnapshot = await getDocs(collection(db, "users"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
};

export const addAppUser = async (user: Omit<AppUser, 'id'>): Promise<string> => {
  try {
    console.log('🔍 Starting user creation process for:', user.email);
    
    // 1. Check if email already exists in Firestore
    console.log('📧 Checking if email already exists...');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', user.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      console.log('❌ Email already exists:', user.email);
      throw new Error('البريد الإلكتروني مستخدم بالفعل');
    }
    
    console.log('✅ Email is available, proceeding...');
    
    // 2. Create user in Firebase Authentication
    console.log('🔐 Creating user in Firebase Authentication...');
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
    const firebaseUser = userCredential.user;
    console.log('✅ Firebase Authentication user created:', firebaseUser.uid);
    
    // 3. Create user document in Firestore
    console.log('🗄️ Creating user document in Firestore...');
    const userDoc = {
      ...user,
      // Use Firebase Auth UID as document ID
      id: firebaseUser.uid,
      // Additional auth-related fields
      authUid: firebaseUser.uid,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      // Security fields
      passwordExpiry: user.passwordExpiry || null,
      passwordHistory: user.passwordHistory || [],
      mustChangePassword: user.mustChangePassword || false,
      twoFactorEnabled: user.twoFactorEnabled || false,
      twoFactorSecret: user.twoFactorSecret || '',
      backupCodes: user.backupCodes || [],
      trustedDevices: user.trustedDevices || [],
      failedLoginAttempts: user.failedLoginAttempts || 0,
      lockedUntil: user.lockedUntil || null,
      securityQuestions: user.securityQuestions || []
    };
    
    // Use the Firebase Auth UID as the document ID
    const docRef = doc(db, 'users', firebaseUser.uid);
    await setDoc(docRef, userDoc);
    
    console.log('✅ User document created in Firestore with ID:', firebaseUser.uid);
    console.log('📊 User creation summary:', {
      uid: firebaseUser.uid,
      email: user.email,
      name: user.name,
      roleLabel: user.roleLabel,
      permissionsCount: user.permissions?.length || 0,
      isActive: user.isActive
    });
    
    return firebaseUser.uid;
  } catch (error: any) {
    console.error('❌ Error creating user:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('البريد الإلكتروني مستخدم بالفعل في Firebase Authentication');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('كلمة المرور ضعيفة جداً');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('البريد الإلكتروني غير صالح');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('فشل الاتصال بالشبكة');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('فشل في إنشاء المستخدم');
    }
  }
};

export const updateAppUser = async (id: string, userData: Partial<AppUser>) => {
  const docRef = doc(db, "users", id);
  
  // First, get the existing document to preserve all data
  const existingDoc = await getDoc(docRef);
  if (!existingDoc.exists()) {
    // If document doesn't exist, create it
    const cleanData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) => value !== undefined)
    );
    await setDoc(docRef, cleanData);
    return;
  }
  
  // Merge existing data with new data
  const existingData = existingDoc.data();
  const cleanData = Object.fromEntries(
    Object.entries(userData).filter(([_, value]) => value !== undefined)
  );
  
  // Merge existing data with new data, preserving all fields
  const mergedData = { ...existingData, ...cleanData };
  
  await setDoc(docRef, mergedData, { merge: true });
};

export const deleteAppUser = async (id: string) => {
  await deleteDoc(doc(db, "users", id));
};

// --- Activity Logs ---
export const getActivities = async (limitCount: number = 20): Promise<ActivityLog[]> => {
  const q = query(collection(db, "activities"), orderBy("timestamp", "desc"), limit(limitCount));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp
    } as ActivityLog;
  });
};

// --- Legal References ---
export const getLegalReferences = async (): Promise<LegalReference[]> => {
  const querySnapshot = await getDocs(collection(db, "references"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LegalReference));
};

export const addLegalReference = async (reference: Omit<LegalReference, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "references"), reference);
  return docRef.id;
};

export const updateLegalReference = async (id: string, reference: Partial<LegalReference>) => {
  const docRef = doc(db, "references", id);
  await updateDoc(docRef, reference);
};

export const deleteLegalReference = async (id: string) => {
  await deleteDoc(doc(db, "references", id));
};

export const toggleFavoriteReference = async (id: string, isFavorite: boolean): Promise<void> => {
  const docRef = doc(db, "references", id);
  await updateDoc(docRef, { isFavorite });
};

export const addActivity = async (activity: Omit<ActivityLog, 'id' | 'timestamp'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "activities"), {
    ...activity,
    timestamp: serverTimestamp()
  });
  return docRef.id;
};

// --- Work Locations ---
export const getLocations = async (): Promise<WorkLocation[]> => {
  const querySnapshot = await getDocs(collection(db, "locations"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkLocation));
};

export const addLocation = async (location: Omit<WorkLocation, 'id'>): Promise<string> => {
  // Remove undefined fields to prevent Firebase errors
  const cleanLocation = Object.fromEntries(
    Object.entries(location).filter(([_, value]) => value !== undefined)
  );
  const docRef = await addDoc(collection(db, "locations"), cleanLocation);
  return docRef.id;
};

export const updateLocation = async (id: string, location: Partial<WorkLocation>) => {
  const docRef = doc(db, "locations", id);
  // Remove undefined fields to prevent Firebase errors
  const cleanLocation = Object.fromEntries(
    Object.entries(location).filter(([_, value]) => value !== undefined)
  );
  await updateDoc(docRef, cleanLocation);
};

export const deleteLocation = async (id: string) => {
  await deleteDoc(doc(db, "locations", id));
};

// --- Lawyers ---
export const getLawyers = async (): Promise<Lawyer[]> => {
  const querySnapshot = await getDocs(collection(db, "lawyers"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lawyer));
};

export const getLawyer = async (id: string): Promise<Lawyer | null> => {
  const docRef = doc(db, "lawyers", id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Lawyer : null;
};

export const createLawyer = async (lawyer: Omit<Lawyer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "lawyers"), {
    ...lawyer,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateLawyer = async (id: string, lawyer: Partial<Lawyer>): Promise<void> => {
  const docRef = doc(db, "lawyers", id);
  const cleanLawyer = cleanObject(lawyer);
  await updateDoc(docRef, {
    ...cleanLawyer,
    updatedAt: serverTimestamp()
  });
};

export const deleteLawyer = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "lawyers", id));
};

export const getLawyerDocuments = async (lawyerId: string): Promise<LawyerDocument[]> => {
  const q = query(collection(db, "lawyerDocuments"), where("lawyerId", "==", lawyerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawyerDocument));
};

export const uploadLawyerDocument = async (document: Omit<LawyerDocument, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, "lawyerDocuments"), document);
  return docRef.id;
};

export const deleteLawyerDocument = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "lawyerDocuments", id));
};

export const getLawyerPerformance = async (lawyerId: string): Promise<LawyerPerformance[]> => {
  const q = query(collection(db, "lawyerPerformance"), where("lawyerId", "==", lawyerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as LawyerPerformance));
};

export const updateLawyerPerformance = async (id: string, performance: Partial<LawyerPerformance>): Promise<void> => {
  const docRef = doc(db, "lawyerPerformance", id);
  const cleanPerformance = cleanObject(performance);
  await updateDoc(docRef, cleanPerformance);
};

// Real-time listeners for lawyers
export const subscribeToLawyers = (callback: (lawyers: Lawyer[]) => void) => {
  const q = query(collection(db, "lawyers"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const lawyers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lawyer));
    callback(lawyers);
  });
};

export const subscribeToLawyerDocuments = (lawyerId: string, callback: (documents: LawyerDocument[]) => void) => {
  const q = query(collection(db, "lawyerDocuments"), where("lawyerId", "==", lawyerId));
  return onSnapshot(q, (snapshot) => {
    const documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LawyerDocument));
    callback(documents);
  });
};
