# دليل إعداد أذونات البحث الصوتي

## نظرة عامة
يحتوي النظام الآن على نظام أذونات متكامل للبحث الصوتي يسمح بالتحكم في من يمكنه استخدام هذه الميزة.

## إعداد الأذونات

### 1. إضافة صلاحية البحث الصوتي للمستخدم

عند إنشاء أو تحديث مستخدم، تأكد من إضافة الصلاحية التالية:

```typescript
const userWithVoiceSearch = {
  id: 'user123',
  name: 'أحمد محمد',
  email: 'ahmed@example.com',
  roleLabel: 'محامي',
  isActive: true,
  permissions: [
    { moduleId: 'voice_search', access: 'read' }, // البحث الصوتي
    { moduleId: 'search', access: 'read' },       // البحث العادي
    { moduleId: 'notifications', access: 'read' }, // الإشعارات
    // ... باقي الأذونات
  ]
};
```

### 2. مستويات الأذونات

- **'none'**: لا يمكن الوصول إلى البحث الصوتي
- **'read'**: يمكن استخدام البحث الصوتي (مستوى موصى به)
- **'write'**: صلاحيات كاملة (للمستقبل)

### 3. الأدوار المقترحة

#### مدير النظام
```typescript
permissions: [
  { moduleId: 'voice_search', access: 'read' },
  { moduleId: 'search', access: 'read' },
  { moduleId: 'notifications', access: 'read' },
  // ... جميع الأذونات
]
```

#### محامي
```typescript
permissions: [
  { moduleId: 'voice_search', access: 'read' },
  { moduleId: 'search', access: 'read' },
  { moduleId: 'notifications', access: 'read' },
  // ... أذونات القضايا، العملاء، إلخ
]
```

#### مساعد إداري
```typescript
permissions: [
  { moduleId: 'search', access: 'read' },
  { moduleId: 'notifications', access: 'read' },
  // قد لا يكون لديه صلاحية البحث الصوتي
]
```

#### مضيف/زائر
```typescript
permissions: [
  // لا يوجد أذونات بحث
]
```

## التحقق من الأذونات

النظام يتحقق تلقائيًا من الأذونات في المكونات:

### MobileNavigation
- يعرض زر البحث الصوتي فقط إذا كان المستخدم لديه الصلاحية
- يعرض رسالة واضحة إذا حاول المستخدم بدون صلاحية

### EnhancedSearch
- يمكن إضافة التحقق من الأذونات هناك أيضًا

```typescript
import { canUseVoiceSearch } from '../utils/permissions';

// في مكون البحث
if (canUseVoiceSearch(currentUser)) {
  // عرض زر البحث الصوتي
} else {
  // إخفاء الزر أو عرض رسالة
}
```

## رسائل الخطأ

إذا حاول مستخدم بدون صلاحية استخدام البحث الصوتي، تظهر الرسالة:
```
"عفواً، لا تملك صلاحية للوصول إلى البحث الصوتي. يرجى التواصل مع مدير النظام."
```

## إدارة الأذونات

### إضافة صلاحية لمستخدم موجود
```typescript
const updateUserPermissions = async (userId: string) => {
  const user = await getUserById(userId);
  user.permissions.push({ moduleId: 'voice_search', access: 'read' });
  await updateUser(user);
};
```

### إزالة صلاحية
```typescript
const removeVoiceSearchPermission = async (userId: string) => {
  const user = await getUserById(userId);
  user.permissions = user.permissions.filter(p => p.moduleId !== 'voice_search');
  await updateUser(user);
};
```

## الأمان

- التحقق يحدث على مستوى المكون (client-side)
- يجب أيضًا التحقق على مستوى الخادم (server-side)
- جميع طلبات البحث الصوتي يجب أن تتحقق من الأذونات

## اختبار الأذونات

### اختبار المستخدم مع صلاحية
```typescript
const testUserWithPermission = {
  permissions: [{ moduleId: 'voice_search', access: 'read' }]
};
console.log(canUseVoiceSearch(testUserWithPermission)); // true
```

### اختبار المستخدم بدون صلاحية
```typescript
const testUserWithoutPermission = {
  permissions: [] // أو بدون voice_search
};
console.log(canUseVoiceSearch(testUserWithoutPermission)); // false
```

## ملاحظات هامة

1. **البحث الصوتي يتطلب إذن الميكروفون**: حتى مع صلاحية النظام، المستخدم يحتاج إلى السماح بالميكروفون في المتصفح
2. **التوافق**: البحث الصوتي يعمل فقط في المتصفحات المدعومة (Chrome, Edge, Firefox)
3. **الخصوصية**: يتم معالجة الصوت محليًا في المتصفح ولا يتم إرساله للخادم

## استكشاف الأخطاء

### المشكلة: زر البحث الصوتي لا يظهر
**الحل**: تأكد من أن المستخدم لديه صلاحية `voice_search` في قائمة الأذونات

### المشكلة: رسالة "لا تملك صلاحية"
**الحل**: أضف `{ moduleId: 'voice_search', access: 'read' }` إلى أذونات المستخدم

### المشكلة: البحث الصوتي لا يعمل مع وجود صلاحية
**الحل**: تحقق من إذن الميكروفون في المتصفح ودعم المتصفح للبحث الصوتي
