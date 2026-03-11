# 📋 توثيق نظام الصلاحيات المتقدم

## 🎯 **الهدف**

تطوير نظام صلاحيات متعددة المستويات يسمح بالتحكم الدقيق في وصول المستخدمين للوحدات المختلفة مع إمكانية تحديد النطاق والقيود.

## 📅 **التاريخ**

10 مارس 2026

## 🏗️ **هيكل النظام**

### 📊 **مستويات الصلاحيات**

```typescript
export type PermissionLevel = 
  | 'none'         // لا يوجد وصول
  | 'view'         // مشاهدة فقط
  | 'read'         // قراءة البيانات
  | 'create'       // إنشاء سجلات جديدة
  | 'edit'         // تعديل السجلات
  | 'delete'       // حذف السجلات
  | 'approve'      // اعتماد الموافقات
  | 'admin'        // صلاحيات إدارية كاملة
  | 'super_admin'; // صلاحيات مدير النظام
```

### 🎯 **نطاق الصلاحيات (Scope)**

```typescript
scope?: {
  own?: boolean;        // بياناته الخاصة فقط
  department?: string;  // قسم معين
  branch?: string;      // فرع معين
  region?: string;      // منطقة معينة
  all?: boolean;        // كل البيانات
};
```

### 🔒 **قيود الصلاحيات (Restrictions)**

```typescript
restrictions?: {
  timeLimit?: string;     // محدد زمنياً
  ipWhitelist?: string[]; // عناوين IP معينة
  deviceLimit?: number;   // عدد الأجهزة
};
```

## 🚀 **المكونات الرئيسية**

### 1. 📋 **PermissionService**

خدمة أساسية للتعامل مع الصلاحيات:

```typescript
// التحقق من الصلاحية
PermissionService.checkPermission(
  userPermissions: Permission[],
  moduleId: string,
  requiredLevel: PermissionLevel,
  context?: { userId?, department?, branch?, region? }
): PermissionCheck

// الحصول على الصلاحيات الفعالة
PermissionService.getEffectivePermissions(
  userPermissions: Permission[],
  userRoles?: UserRole[],
  roleTemplates?: RoleTemplate[]
): Permission[]

// ملخص الصلاحيات
PermissionService.getPermissionSummary(permissions: Permission[]): {
  totalModules: number;
  modulesWithAccess: string[];
  highestLevel: PermissionLevel;
  scopeTypes: string[];
}
```

### 2. 🎣 **usePermissions Hook**

Hook React للتعامل مع الصلاحيات:

```typescript
const {
  // التحقق من الصلاحيات
  checkPermission,
  hasPermission,
  
  // دوال مساعدة
  canView,
  canRead,
  canCreate,
  canEdit,
  canDelete,
  canApprove,
  
  // معلومات الصلاحيات
  isAdmin,
  isSuperAdmin,
  permissionSummary,
  
  // إدارة الصلاحيات
  roleTemplates,
  updatePermissions,
  assignRole,
  removeRole
} = usePermissions(userPermissions, options);
```

### 3. 🛡️ **usePermissionGuard Hook**

لحماية المكونات بناءً على الصلاحيات:

```typescript
const { Guard } = usePermissionGuard(
  userPermissions,
  'cases',
  'edit',
  { userId, department }
);

// استخدام
<Guard fallback={<div>لا تملك صلاحية كافية</div>}>
  <CaseEditForm />
</Guard>
```

### 4. 🔘 **usePermissionButton Hook**

للتحكم في الأزرار بناءً على الصلاحيات:

```typescript
const { Button } = usePermissionButton(
  userPermissions,
  'cases',
  'delete'
);

// استخدام
<Button onClick={handleDelete}>
  حذف القضية
</Button>
```

### 5. 📱 **usePermissionMenu Hook**

للتصفية القوائم بناءً على الصلاحيات:

```typescript
const { menuItems } = usePermissionMenu(
  userPermissions,
  [
    { id: 'view', moduleId: 'cases', requiredLevel: 'view', label: 'عرض القضايا' },
    { id: 'edit', moduleId: 'cases', requiredLevel: 'edit', label: 'تعديل القضايا' },
    { id: 'delete', moduleId: 'cases', requiredLevel: 'delete', label: 'حذف القضايا' }
  ]
);
```

### 6. 🎛️ **PermissionManager Component**

مكون لإدارة الصلاحيات في واجهة المستخدم:

```typescript
<PermissionManager
  userPermissions={userPermissions}
  onPermissionsChange={setPermissions}
  userId={user.id}
  department={user.department}
  branch={user.branch}
/>
```

## 📋 **قوالب الأدوار الجاهزة**

### 🎯 **الأدوار النظامية**

1. **مدير النظام (Super Admin)**
   - صلاحيات كاملة على كل شيء
   - `{ moduleId: '*', access: 'super_admin' }`

2. **مدير (Admin)**
   - صلاحيات إدارية كاملة
   - `{ moduleId: '*', access: 'admin' }`

3. **محامي (Lawyer)**
   - صلاحيات المحامي الأساسية
   - تعديل بياناته الخاصة
   - مشاهدة بيانات القسم

4. **مساعد إداري (Assistant)**
   - صلاحيات محدودة للمساعدة
   - مشاهدة فقط لبيانات القسم

5. **مراقب (Viewer)**
   - صلاحيات مشاهدة فقط
   - بياناته الخاصة فقط

## 🔧 **أمثلة الاستخدام**

### 📊 **مثال 1: التحقق من صلاحية تعديل القضايا**

```typescript
import { usePermissions } from '../hooks/usePermissions';

function CaseEditButton({ caseId, lawyerId }) {
  const { canEdit } = usePermissions(currentUser.permissions, {
    userId: currentUser.id,
    department: currentUser.department
  });

  // التحقق إذا كان يمكن تعديل هذه القضية
  const canEditThisCase = canEdit('cases') && 
    (currentUser.id === lawyerId || currentUser.department === 'legal');

  if (!canEditThisCase) {
    return null;
  }

  return <button onClick={() => editCase(caseId)}>تعديل</button>;
}
```

### 🛡️ **مثال 2: حماية صفحة كاملة**

```typescript
import { usePermissionGuard } from '../hooks/usePermissions';

function CasesPage() {
  const { Guard } = usePermissionGuard(
    currentUser.permissions,
    'cases',
    'view',
    { department: currentUser.department }
  );

  return (
    <Guard fallback={<div>لا تملك صلاحية لعرض القضايا</div>}>
      <CasesList />
    </Guard>
  );
}
```

### 🎛️ **مثال 3: إدارة صلاحيات المستخدم**

```typescript
import { PermissionManager } from '../components/PermissionManager';

function UserPermissionsPage() {
  const [userPermissions, setUserPermissions] = useState(selectedUser.permissions);

  return (
    <div>
      <h2>إدارة صلاحيات: {selectedUser.name}</h2>
      <PermissionManager
        userPermissions={userPermissions}
        onPermissionsChange={setUserPermissions}
        userId={selectedUser.id}
        department={selectedUser.department}
        branch={selectedUser.branch}
      />
    </div>
  );
}
```

### 🔒 **مثال 4: صلاحيات محدودة زمنياً**

```typescript
const tempPermission: Permission = {
  moduleId: 'reports',
  access: 'read',
  restrictions: {
    timeLimit: '2024-12-31T23:59:59Z' // تنتهي بنهاية العام
  }
};
```

### 🌐 **مثال 5: صلاحيات محدودة بعناوين IP**

```typescript
const restrictedPermission: Permission = {
  moduleId: 'settings',
  access: 'admin',
  restrictions: {
    ipWhitelist: ['192.168.1.100', '10.0.0.50'] // عناوين IP المسموح بها
  }
};
```

## 🎯 **سيناريوهات الاستخدام**

### 🏢 **سيناريو 1: مكتب محاماة متعدد الفروع**

```typescript
// مدير فرع القاهرة
const branchManagerPermissions = [
  { moduleId: 'cases', access: 'edit', scope: { branch: 'cairo' } },
  { moduleId: 'clients', access: 'edit', scope: { branch: 'cairo' } },
  { moduleId: 'reports', access: 'view', scope: { branch: 'cairo' } },
  { moduleId: 'hearings', access: 'edit', scope: { branch: 'cairo' } }
];

// محامي في فرع الإسكندرية
const lawyerPermissions = [
  { moduleId: 'cases', access: 'edit', scope: { own: true } },
  { moduleId: 'clients', access: 'edit', scope: { own: true } },
  { moduleId: 'documents', access: 'create' },
  { moduleId: 'ai-assistant', access: 'read' }
];
```

### 🏛️ **سيناريو 2: جهة حكومية متعددة الإدارات**

```typescript
// مدير قسم القضايا المدنية
const civilDeptManager = [
  { moduleId: 'cases', access: 'admin', scope: { department: 'civil' } },
  { moduleId: 'clients', access: 'edit', scope: { department: 'civil' } },
  { moduleId: 'hearings', access: 'approve', scope: { department: 'civil' } },
  { moduleId: 'reports', access: 'edit', scope: { department: 'civil' } }
];

// مساعد قسم القضايا الجنائية
const criminalAssistant = [
  { moduleId: 'cases', access: 'view', scope: { department: 'criminal' } },
  { moduleId: 'hearings', access: 'view', scope: { department: 'criminal' } },
  { moduleId: 'documents', access: 'view', scope: { department: 'criminal' } }
];
```

### 🔐 **سيناريو 3: صلاحيات مؤقتة**

```typescript
// مدقق حسابات خارجي لمدة شهر
const auditorPermissions = [
  { 
    moduleId: 'reports', 
    access: 'read',
    restrictions: {
      timeLimit: '2024-04-30T23:59:59Z'
    }
  },
  { 
    moduleId: 'fees', 
    access: 'read',
    restrictions: {
      timeLimit: '2024-04-30T23:59:59Z'
    }
  }
];
```

## 🎯 **المميزات المتقدمة**

### 🔍 **التحقق الديناميكي**
- التحقق الفوري للصلاحيات
- رسائل خطأ واضحة
- تسجيل العمليات

### 📊 **التحليل والإحصائيات**
- ملخص الصلاحيات
- تتبع الاستخدام
- تقارير الأمان

### 🔄 **التحديثات الفورية**
- تحديث الصلاحيات مباشرة
- بدون الحاجة لإعادة تحميل الصفحة
- مزامنة مع Firebase

### 🛡️ **الأمان المتقدم**
- تشفير الصلاحيات
- التحقق من الهوية
- حماية من الوصول غير المصرح به

## 🚀 **التطوير المستقبلي**

### 📱 **واجهة مستخدم محسّنة**
- تصميم عصري
- سهولة الاستخدام
- تجربة مستخدم أفضل

### 🤖 **ذكاء اصطناعي**
- اقتراح صلاحيات مناسبة
- تحليل الأنماط
- كشف الانتهاكات

### 📊 **تحليل متقدم**
- رسوم بيانية
- تقارير مفصلة
- تنبؤات

### 🔗 **التكامل مع أنظمة أخرى**
- LDAP/Active Directory
- OAuth 2.0
- SAML

## 🎉 **الخلاصة**

**✅ نظام الصلاحيات المتقدم يوفر:**
- 🔐 **أمان عالي** - تحكم دقيق في الوصول
- 📊 **مرونة عالية** - تخصيص كامل
- 🎯 **سهولة استخدام** - واجهة بسيطة
- 🚀 **قابلية للتطوير** - بنية مرنة
- 🛡️ **حماية متقدمة** - قيود ونطاقات

**ممتاز! 🎊 النظام الآن جاهز للاستخدام الإنتاجي مع صلاحيات متعددة المستويات!** 🚀
