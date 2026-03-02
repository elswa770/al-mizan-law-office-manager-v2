import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { AppUser } from '../types';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

// --- Authentication Functions ---

export const loginUser = async (email: string, password: string): Promise<AuthUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined
    };
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Don't log failed attempts here - it's handled in the Login component
    // to avoid duplicate logging and ensure proper error handling
    
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string,
  roleData: Partial<AppUser>
): Promise<AuthUser> => {
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 2. Update profile with display name
    await updateProfile(user, { displayName });
    
    // 3. Create user document in Firestore
    const userData: AppUser = {
      id: user.uid,
      name: displayName,
      email: user.email!,
      username: email.split('@')[0], // Default username from email
      roleLabel: roleData.roleLabel || 'محامي',
      isActive: true,
      permissions: roleData.permissions || getDefaultPermissions(),
      avatar: user.photoURL || undefined,
      lastLogin: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Logout error:', error);
    throw new Error('فشل في تسجيل الخروج');
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Password reset error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

// --- User Management ---

export const getUserProfile = async (uid: string): Promise<AppUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as AppUser;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('فشل في جلب بيانات المستخدم');
  }
};

export const updateUserProfile = async (uid: string, data: Partial<AppUser>): Promise<void> => {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
    
    // Also update Firebase Auth profile if name is provided
    if (data.name && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: data.name });
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('فشل في تحديث بيانات المستخدم');
  }
};

// --- Auth State Observer ---

export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const authUser: AuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined
      };
      callback(authUser);
    } else {
      callback(null);
    }
  });
};

// --- Helper Functions ---

const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'المستخدم غير موجود',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
    'auth/weak-password': 'كلمة المرور ضعيفة جداً (6 أحرف على الأقل)',
    'auth/invalid-email': 'البريد الإلكتروني غير صالح',
    'auth/user-disabled': 'تم تعطيل حساب المستخدم',
    'auth/too-many-requests': 'محاولات كثيرة، يرجى المحاولة لاحقاً',
    'auth/network-request-failed': 'فشل الاتصال بالشبكة',
    'auth/requires-recent-login': 'يتطلب تسجيل دخول حديث، يرجى تسجيل الدخول مرة أخرى'
  };
  
  return errorMessages[errorCode] || 'حدث خطأ غير متوقع';
};

const getDefaultPermissions = () => [
  { moduleId: 'dashboard', access: 'read' as const },
  { moduleId: 'cases', access: 'read' as const },
  { moduleId: 'clients', access: 'read' as const },
  { moduleId: 'hearings', access: 'read' as const },
  { moduleId: 'tasks', access: 'read' as const },
  { moduleId: 'documents', access: 'read' as const },
  { moduleId: 'fees', access: 'none' as const },
  { moduleId: 'expenses', access: 'none' as const },
  { moduleId: 'reports', access: 'none' as const },
  { moduleId: 'settings', access: 'none' as const },
  { moduleId: 'ai-assistant', access: 'read' as const },
  { moduleId: 'references', access: 'read' as const }
];

// --- Current User Helper ---

export const getCurrentUser = (): AuthUser | null => {
  const user = auth.currentUser;
  if (user) {
    return {
      uid: user.uid,
      email: user.email!,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined
    };
  }
  return null;
};
