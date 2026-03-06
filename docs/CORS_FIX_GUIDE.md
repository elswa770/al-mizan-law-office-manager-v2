# 📋 إصلاح مشكلة CORS في Firebase Storage

## 🔍 **المشكلة:**
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' 
from origin 'https://al-mizan-law.web.app' has been blocked by CORS policy
```

## 🔧 **الحلول المقترحة:**

### **1. تحديث Firebase Storage Configuration**
تم تحديث `services/firebaseConfig.ts` لاستخدام:
```typescript
export const storage = getStorage(app, "gs://al-mizan-law.firebasestorage.app");
```

### **2. إعداد CORS Rules**
تم إنشاء ملف `cors.json` يحتوي على:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Content-Length", "Content-Disposition"]
  }
]
```

### **3. تطبيق CORS Rules عبر Firebase CLI**
```bash
# تثبيت Firebase CLI إذا لم يكن مثبتاً
npm install -g firebase-tools

# تسجيل الدخول إلى Firebase
firebase login

# تطبيق قواعد CORS
gsutil cors set cors.json gs://al-mizan-law.firebasestorage.app
```

## 🚀 **الخطوات التنفيذ:**

### **الخطوة 1: تثبيت gsutil**
```bash
# تثبيت Google Cloud SDK
# اتبع التعليمات من: https://cloud.google.com/sdk/docs/install
```

### **الخطوة 2: المصادقة**
```bash
gcloud auth login
gcloud config set project al-mizan-law
```

### **الخطوة 3: تطبيق CORS**
```bash
# من مجلد المشروع
gsutil cors set cors.json gs://al-mizan-law.firebasestorage.app
```

### **الخطوة 4: التحقق**
```bash
gsutil cors get gs://al-mizan-law.firebasestorage.app
```

## 📝 **ملاحظات هامة:**

1. **قد يستغرق التطبيق بضع دقائق**
2. **تأكد من صلاحيات المشروع في Google Cloud Console**
3. **قد تحتاج لإعادة تشغيل التطبيق بعد التطبيق**
4. **اختبر النسخ الاحتياطي مرة أخرى بعد التطبيق**

## 🔄 **البديل المؤقت:**
إذا استمرت المشكلة، يمكن استخدام:
- Firestore بدلاً من Storage للنسخ الاحتياطي
- أو استخدام Server-side upload بدلاً من Client-side

## 📞 **الدعم:**
إذا استمرت المشكلة:
1. تحقق من Firebase Console > Storage > Rules
2. تحقق من Google Cloud Console > IAM & Admin
3. تأكد من أن المشروع نشط ومفعل
