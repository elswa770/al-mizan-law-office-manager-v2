import { Permission, PermissionLevel, PermissionCheck, RoleTemplate, UserRole } from '../types';

// مستويات الصلاحيات مرتبة حسب الأولوية
export const PERMISSION_LEVELS: { [key in PermissionLevel]: number } = {
  'none': 0,
  'view': 1,
  'read': 2,
  'create': 3,
  'edit': 4,
  'delete': 5,
  'approve': 6,
  'admin': 7,
  'super_admin': 8
};

// قوالب الأدوار الجاهزة
export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: 'super_admin',
    name: 'مدير النظام',
    description: 'صلاحيات كاملة على كل شيء',
    isSystem: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: [
      { moduleId: '*', access: 'super_admin' }
    ]
  },
  {
    id: 'admin',
    name: 'مدير',
    description: 'صلاحيات إدارية كاملة',
    isSystem: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: [
      { moduleId: '*', access: 'admin' }
    ]
  },
  {
    id: 'lawyer',
    name: 'محامي',
    description: 'صلاحيات المحامي الأساسية',
    isSystem: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: [
      { moduleId: 'dashboard', access: 'view' },
      { moduleId: 'cases', access: 'edit', scope: { own: true } },
      { moduleId: 'cases', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'clients', access: 'edit', scope: { own: true } },
      { moduleId: 'clients', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'hearings', access: 'edit', scope: { own: true } },
      { moduleId: 'hearings', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'tasks', access: 'edit', scope: { own: true } },
      { moduleId: 'documents', access: 'create' },
      { moduleId: 'documents', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'appointments', access: 'edit', scope: { own: true } },
      { moduleId: 'appointments', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'ai-assistant', access: 'read' },
      { moduleId: 'references', access: 'read' },
      { moduleId: 'calculators', access: 'read' },
      { moduleId: 'generator', access: 'create' }
    ]
  },
  {
    id: 'assistant',
    name: 'مساعد إداري',
    description: 'صلاحيات محدودة للمساعدة',
    isSystem: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: [
      { moduleId: 'dashboard', access: 'view' },
      { moduleId: 'cases', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'clients', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'hearings', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'appointments', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'documents', access: 'view', scope: { department: 'legal' } },
      { moduleId: 'references', access: 'read' },
      { moduleId: 'calculators', access: 'read' }
    ]
  },
  {
    id: 'viewer',
    name: 'مراقب',
    description: 'صلاحيات مشاهدة فقط',
    isSystem: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: [
      { moduleId: 'dashboard', access: 'view' },
      { moduleId: 'cases', access: 'view', scope: { own: true } },
      { moduleId: 'clients', access: 'view', scope: { own: true } },
      { moduleId: 'hearings', access: 'view', scope: { own: true } },
      { moduleId: 'appointments', access: 'view', scope: { own: true } },
      { moduleId: 'documents', access: 'view', scope: { own: true } },
      { moduleId: 'reports', access: 'view', scope: { own: true } }
    ]
  }
];

export class PermissionService {
  /**
   * التحقق من صلاحية المستخدم لوحدة معينة
   */
  static checkPermission(
    userPermissions: Permission[],
    moduleId: string,
    requiredLevel: PermissionLevel,
    context?: {
      userId?: string;
      department?: string;
      branch?: string;
      region?: string;
    }
  ): PermissionCheck {
    try {
      // البحث عن صلاحية خاصة بالوحدة
      const modulePermission = userPermissions.find(p => 
        p.moduleId === moduleId || p.moduleId === '*'
      );

      if (!modulePermission) {
        return {
          hasAccess: false,
          level: 'none',
          reason: 'لا توجد صلاحية لهذه الوحدة'
        };
      }

      // التحقق من مستوى الصلاحية
      const userLevel = PERMISSION_LEVELS[modulePermission.access];
      const requiredLevelValue = PERMISSION_LEVELS[requiredLevel];

      if (userLevel < requiredLevelValue) {
        return {
          hasAccess: false,
          level: modulePermission.access,
          reason: `مستوى الصلاحية غير كافٍ. مطلوب: ${requiredLevel}, موجود: ${modulePermission.access}`
        };
      }

      // التحقق من نطاق الصلاحيات
      if (modulePermission.scope) {
        const scopeCheck = this.checkScope(modulePermission.scope, context);
        if (!scopeCheck.passed) {
          return {
            hasAccess: false,
            level: modulePermission.access,
            reason: scopeCheck.reason
          };
        }
      }

      // التحقق من القيود
      if (modulePermission.restrictions) {
        const restrictionCheck = this.checkRestrictions(modulePermission.restrictions);
        if (!restrictionCheck.passed) {
          return {
            hasAccess: false,
            level: modulePermission.access,
            reason: restrictionCheck.reason
          };
        }
      }

      return {
        hasAccess: true,
        level: modulePermission.access,
        scope: modulePermission.scope,
        restrictions: modulePermission.restrictions
      };

    } catch (error) {
      console.error('Error checking permission:', error);
      return {
        hasAccess: false,
        level: 'none',
        reason: 'خطأ في التحقق من الصلاحيات'
      };
    }
  }

  /**
   * التحقق من نطاق الصلاحيات
   */
  private static checkScope(
    scope: NonNullable<Permission['scope']>,
    context?: {
      userId?: string;
      department?: string;
      branch?: string;
      region?: string;
    }
  ): { passed: boolean; reason?: string } {
    // إذا كان الوصول لكل البيانات
    if (scope.all) {
      return { passed: true };
    }

    // التحقق من البيانات الخاصة
    if (scope.own && context?.userId) {
      // هنا يجب التحقق إذا كان السجل ملك للمستخدم
      return { passed: true };
    }

    // التحقق من القسم
    if (scope.department && context?.department) {
      if (scope.department !== context.department) {
        return { 
          passed: false, 
          reason: `الوصول مخصص للقسم: ${scope.department}` 
        };
      }
    }

    // التحقق من الفرع
    if (scope.branch && context?.branch) {
      if (scope.branch !== context.branch) {
        return { 
          passed: false, 
          reason: `الوصول مخصص للفرع: ${scope.branch}` 
        };
      }
    }

    // التحقق من المنطقة
    if (scope.region && context?.region) {
      if (scope.region !== context.region) {
        return { 
          passed: false, 
          reason: `الوصول مخصص للمنطقة: ${scope.region}` 
        };
      }
    }

    return { passed: true };
  }

  /**
   * التحقق من القيود
   */
  private static checkRestrictions(
    restrictions: NonNullable<Permission['restrictions']>
  ): { passed: boolean; reason?: string } {
    // التحقق من الحد الزمني
    if (restrictions.timeLimit) {
      const expiryDate = new Date(restrictions.timeLimit);
      if (new Date() > expiryDate) {
        return { 
          passed: false, 
          reason: 'انتهت صلاحية الوصول' 
        };
      }
    }

    // التحقق من قائمة IP المسموح بها
    if (restrictions.ipWhitelist && restrictions.ipWhitelist.length > 0) {
      const currentIP = this.getCurrentIP();
      if (!currentIP || !restrictions.ipWhitelist.includes(currentIP)) {
        return { 
          passed: false, 
          reason: 'عنوان IP غير مصرح به' 
        };
      }
    }

    return { passed: true };
  }

  /**
   * الحصول على عنوان IP الحالي (محاكاة)
   */
  private static getCurrentIP(): string | null {
    // في بيئة حقيقية، يجب الحصول على IP من الطلب
    return null;
  }

  /**
   * الحصول على الصلاحيات الفعالة للمستخدم
   */
  static getEffectivePermissions(
    userPermissions: Permission[],
    userRoles?: UserRole[],
    roleTemplates?: RoleTemplate[]
  ): Permission[] {
    let effectivePermissions = [...userPermissions];

    // إضافة صلاحيات الأدوار
    if (userRoles && roleTemplates) {
      userRoles.forEach(userRole => {
        if (!userRole.isActive) return;

        const roleTemplate = roleTemplates.find(rt => rt.id === userRole.roleId);
        if (roleTemplate && roleTemplate.isActive) {
          effectivePermissions.push(...roleTemplate.permissions);
        }
      });
    }

    return effectivePermissions;
  }

  /**
   * إنشاء قالب صلاحيات جديد
   */
  static createRoleTemplate(
    name: string,
    description: string,
    permissions: Permission[]
  ): RoleTemplate {
    return {
      id: `role_${Date.now()}`,
      name,
      description,
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions
    };
  }

  /**
   * تصفية الصلاحيات حسب المستوى
   */
  static filterPermissionsByLevel(
    permissions: Permission[],
    minLevel: PermissionLevel
  ): Permission[] {
    const minLevelValue = PERMISSION_LEVELS[minLevel];
    
    return permissions.filter(permission => 
      PERMISSION_LEVELS[permission.access] >= minLevelValue
    );
  }

  /**
   * الحصول على ملخص الصلاحيات
   */
  static getPermissionSummary(permissions: Permission[]): {
    totalModules: number;
    modulesWithAccess: string[];
    highestLevel: PermissionLevel;
    scopeTypes: string[];
  } {
    const modulesWithAccess = [...new Set(permissions.map(p => p.moduleId))];
    const levels = permissions.map(p => p.access);
    const highestLevel = levels.reduce((highest, current) => 
      PERMISSION_LEVELS[current] > PERMISSION_LEVELS[highest] ? current : highest
    , 'none' as PermissionLevel);

    const scopeTypes = [...new Set(
      permissions
        .filter(p => p.scope)
        .flatMap(p => Object.keys(p.scope || {}))
    )];

    return {
      totalModules: modulesWithAccess.length,
      modulesWithAccess,
      highestLevel,
      scopeTypes
    };
  }
}

// دالات مساعدة للتحقق السريع
export const hasPermission = (
  userPermissions: Permission[],
  moduleId: string,
  requiredLevel: PermissionLevel,
  context?: any
): boolean => {
  return PermissionService.checkPermission(userPermissions, moduleId, requiredLevel, context).hasAccess;
};

export const canView = (permissions: Permission[], moduleId: string, context?: any): boolean =>
  hasPermission(permissions, moduleId, 'view', context);

export const canRead = (permissions: Permission[], moduleId: string, context?: any): boolean =>
  hasPermission(permissions, moduleId, 'read', context);

export const canCreate = (permissions: Permission[], moduleId: string, context?: any): boolean =>
  hasPermission(permissions, moduleId, 'create', context);

export const canEdit = (permissions: Permission[], moduleId: string, context?: any): boolean =>
  hasPermission(permissions, moduleId, 'edit', context);

export const canDelete = (permissions: Permission[], moduleId: string, context?: any): boolean =>
  hasPermission(permissions, moduleId, 'delete', context);

export const canApprove = (permissions: Permission[], moduleId: string, context?: any): boolean =>
  hasPermission(permissions, moduleId, 'approve', context);

export const isAdmin = (permissions: Permission[]): boolean =>
  hasPermission(permissions, '*', 'admin');

export const isSuperAdmin = (permissions: Permission[]): boolean =>
  hasPermission(permissions, '*', 'super_admin');
