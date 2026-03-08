import { AppUser, PermissionLevel, MODULE_IDS } from '../types';

/**
 * Check if user has permission for a specific module
 */
export const hasPermission = (
  user: AppUser | null | undefined,
  moduleId: string,
  requiredLevel: PermissionLevel = 'read'
): boolean => {
  if (!user || !user.isActive) {
    return false;
  }

  const permission = user.permissions.find(p => p.moduleId === moduleId);
  
  if (!permission) {
    return false;
  }

  const levels = { none: 0, read: 1, write: 2 };
  const userLevel = levels[permission.access] || 0;
  const requiredLevelNum = levels[requiredLevel] || 0;

  return userLevel >= requiredLevelNum;
};

/**
 * Check if user can access voice search
 */
export const canUseVoiceSearch = (user: AppUser | null | undefined): boolean => {
  return hasPermission(user, MODULE_IDS.VOICE_SEARCH, 'read');
};

/**
 * Check if user can access search
 */
export const canUseSearch = (user: AppUser | null | undefined): boolean => {
  return hasPermission(user, MODULE_IDS.SEARCH, 'read');
};

/**
 * Check if user can access notifications
 */
export const canAccessNotifications = (user: AppUser | null | undefined): boolean => {
  return hasPermission(user, MODULE_IDS.NOTIFICATIONS, 'read');
};

/**
 * Get user's permission level for a module
 */
export const getPermissionLevel = (
  user: AppUser | null | undefined,
  moduleId: string
): PermissionLevel => {
  if (!user || !user.isActive) {
    return 'none';
  }

  const permission = user.permissions.find(p => p.moduleId === moduleId);
  return permission?.access || 'none';
};

/**
 * Check if user has any of the specified permissions
 */
export const hasAnyPermission = (
  user: AppUser | null | undefined,
  moduleIds: string[],
  requiredLevel: PermissionLevel = 'read'
): boolean => {
  return moduleIds.some(moduleId => hasPermission(user, moduleId, requiredLevel));
};

/**
 * Check if user has all specified permissions
 */
export const hasAllPermissions = (
  user: AppUser | null | undefined,
  moduleIds: string[],
  requiredLevel: PermissionLevel = 'read'
): boolean => {
  return moduleIds.every(moduleId => hasPermission(user, moduleId, requiredLevel));
};
