import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { AppUser, PermissionLevel } from '../types';

// Create admin user for the system
export const createAdminUser = async (): Promise<void> => {
  const adminUid = 'admin-user-123'; // Fixed UID for admin
  const adminEmail = 'admin@mizan.com';
  
  const adminUser: AppUser = {
    id: adminUid,
    name: 'مدير النظام',
    email: adminEmail,
    username: 'admin',
    roleLabel: 'مدير النظام',
    isActive: true,
    permissions: [
      { moduleId: 'dashboard', access: 'write' as PermissionLevel },
      { moduleId: 'cases', access: 'write' as PermissionLevel },
      { moduleId: 'clients', access: 'write' as PermissionLevel },
      { moduleId: 'hearings', access: 'write' as PermissionLevel },
      { moduleId: 'tasks', access: 'write' as PermissionLevel },
      { moduleId: 'documents', access: 'write' as PermissionLevel },
      { moduleId: 'fees', access: 'write' as PermissionLevel },
      { moduleId: 'expenses', access: 'write' as PermissionLevel },
      { moduleId: 'reports', access: 'write' as PermissionLevel },
      { moduleId: 'settings', access: 'write' as PermissionLevel },
      { moduleId: 'ai-assistant', access: 'write' as PermissionLevel },
      { moduleId: 'references', access: 'write' as PermissionLevel },
      { moduleId: 'locations', access: 'write' as PermissionLevel },
      { moduleId: 'calculators', access: 'write' as PermissionLevel },
      { moduleId: 'generator', access: 'write' as PermissionLevel }
    ],
    lastLogin: new Date().toISOString()
  };

  try {
    await setDoc(doc(db, 'users', adminUid), adminUser);
    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Create sample users for testing
export const createSampleUsers = async (): Promise<void> => {
  const sampleUsers: AppUser[] = [
    {
      id: 'lawyer-1',
      name: 'أحمد محمد',
      email: 'lawyer1@mizan.com',
      username: 'ahmed_lawyer',
      roleLabel: 'محامي',
      isActive: true,
      permissions: [
        { moduleId: 'dashboard', access: 'write' as PermissionLevel },
        { moduleId: 'cases', access: 'write' as PermissionLevel },
        { moduleId: 'clients', access: 'write' as PermissionLevel },
        { moduleId: 'hearings', access: 'write' as PermissionLevel },
        { moduleId: 'tasks', access: 'write' as PermissionLevel },
        { moduleId: 'documents', access: 'write' as PermissionLevel },
        { moduleId: 'fees', access: 'read' as PermissionLevel },
        { moduleId: 'expenses', access: 'none' as PermissionLevel },
        { moduleId: 'reports', access: 'read' as PermissionLevel },
        { moduleId: 'settings', access: 'none' as PermissionLevel },
        { moduleId: 'ai-assistant', access: 'read' as PermissionLevel },
        { moduleId: 'references', access: 'read' as PermissionLevel },
        { moduleId: 'locations', access: 'read' as PermissionLevel },
        { moduleId: 'calculators', access: 'read' as PermissionLevel },
        { moduleId: 'generator', access: 'read' as PermissionLevel }
      ],
      lastLogin: new Date().toISOString()
    },
    {
      id: 'assistant-1',
      name: 'فاطمة علي',
      email: 'assistant@mizan.com',
      username: 'fatima_assistant',
      roleLabel: 'مساعد قانوني',
      isActive: true,
      permissions: [
        { moduleId: 'dashboard', access: 'read' as PermissionLevel },
        { moduleId: 'cases', access: 'read' as PermissionLevel },
        { moduleId: 'clients', access: 'read' as PermissionLevel },
        { moduleId: 'hearings', access: 'read' as PermissionLevel },
        { moduleId: 'tasks', access: 'write' as PermissionLevel },
        { moduleId: 'documents', access: 'write' as PermissionLevel },
        { moduleId: 'fees', access: 'none' as PermissionLevel },
        { moduleId: 'expenses', access: 'none' as PermissionLevel },
        { moduleId: 'reports', access: 'none' as PermissionLevel },
        { moduleId: 'settings', access: 'none' as PermissionLevel },
        { moduleId: 'ai-assistant', access: 'read' as PermissionLevel },
        { moduleId: 'references', access: 'read' as PermissionLevel },
        { moduleId: 'locations', access: 'read' as PermissionLevel },
        { moduleId: 'calculators', access: 'read' as PermissionLevel },
        { moduleId: 'generator', access: 'read' as PermissionLevel }
      ],
      lastLogin: new Date().toISOString()
    }
  ];

  try {
    for (const user of sampleUsers) {
      await setDoc(doc(db, 'users', user.id), user);
    }
    console.log('Sample users created successfully');
  } catch (error) {
    console.error('Error creating sample users:', error);
  }
};
