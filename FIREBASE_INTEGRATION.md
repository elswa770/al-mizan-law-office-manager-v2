# تكامل Firebase مع صفحة الإعدادات

## نظرة عامة
تم ربط صفحة الإعدادات بنجاح مع Firebase للتخزين السحابي والمزامنة.

## الميزات المضافة

### 1. التخزين السحابي للإعدادات
- **الإعدادات العامة**: `generalSettings`
- **إعدادات الأمان**: `securitySettings`
- **إعدادات التنبيهات**: `notificationSettings`
- **إعدادات إدارة البيانات**: `dataManagementSettings`
- **إعدادات الصيانة**: `maintenanceSettings`

### 2. المزامنة التلقائية
- تحميل الإعدادات من Firebase عند تحميل الصفحة
- حفظ التغييرات في Firebase و localStorage simultaniously
- دعم العمل بدون اتصال (localStorage)

### 3. النسخ الاحتياطي السحابي
- رفع النسخ الاحتياطية تلقائياً إلى Firebase Storage
- حفظ محلي بالإضافة إلى الرفع السحابي
- تسمية الملفات بالتاريخ

## الهيكل في Firestore

```
collections/
├── generalSettings/
│   └── main (document)
├── securitySettings/
│   └── main (document)
├── notificationSettings/
│   └── main (document)
├── dataManagementSettings/
│   └── main (document)
└── maintenanceSettings/
    └── main (document)
```

## الهيكل في Storage

```
backups/
├── AlMizan_Backup_2024-02-22.json
├── AlMizan_Backup_2024-02-21.json
└── ...
```

## الدوال المضافة

### `saveSettingsToFirebase(collectionName, data)`
حفظ البيانات في Firestore

### `loadSettingsFromFirebase(collectionName)`
تحميل البيانات من Firestore

### `uploadBackupToFirebase(backupData, filename)`
رفع النسخ الاحتياطية لـ Storage

## معالجة الأخطاء
- يتم حفظ البيانات محلياً دائماً كنسخة احتياطية
- عرض رسائل خطأ واضحة للمستخدم
- تسجيل الأخطاء في console للتصحيح

## الأمان
- استخدام Firebase Security Rules للتحكم في الوصول
- تشفير البيانات أثناء النقل
- صلاحيات المستخدمين في Firestore

## الأداء
- تحميل الإعدادات بشكل غير متزامن
- تحديثات فورية مع onSnapshot (يمكن إضافتها)
- تخزين مؤقت في localStorage للسرعة

## الاستخدام
1. يتم تحميل الإعدادات تلقائياً من Firebase
2. أي تغيير يتم حفظه في Firebase و localStorage
3. النسخ الاحتياطي يتم رفعه للـ Storage
4. في حالة انقطاع الاتصال، يعمل التطبيق من localStorage

## التكامل المستقبلي
- إضافة onSnapshot للتحديثات الفورية
- إدارة المستخدمين عبر Firebase Auth
- مزامنة البيانات بين الأجهزة
- إعدادات متقدمة للصلاحيات
