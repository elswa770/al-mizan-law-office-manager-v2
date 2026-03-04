# دليل نظام الجلسات بدون اتصال (Offline Hearings System)

## 🌐 **نظرة عامة**

نظام الجلسات بدون اتصال في تطبيق الميزان يسمح بإدارة الجلسات بشكل كامل حتى عند عدم وجود اتصال بالإنترنت، مع ضمان عدم فقدان أي بيانات ومزامنتها تلقائياً عند عودة الاتصال.

## 🚀 **المميزات الرئيسية**

### 📱 **العمل بدون اتصال الكامل**
- ✅ **إضافة جلسة جديدة**: حفظ محلي مع معرف مؤقت
- ✅ **تعديل بيانات الجلسة**: تحديث فوري في الواجهة والتخزين المحلي
- ✅ **حذف جلسة**: إزالة فورية مع تأكيد المستخدم
- ✅ **معالجة المصاريف**: ربط مصاريف الجلسة بالقضية تلقائياً

### 🔄 **المزامنة التلقائية**
- **اكتشاف الاتصال**: التحقق من حالة الشبكة بشكل دوري
- **المزامنة عند العودة**: تنفيذ جميع الإجراءات المعلقة تلقائياً
- **إعادة المحاولة**: 3 محاولات للإجراءات الفاشلة
- **حفظ الترتيب**: الحفاظ على ترتيب تنفيذ الإجراءات

### 📊 **واجهة المستخدم**
- **مؤشر الحالة**: عرض حالة الاتصال (متصل/غير متصل)
- **عداد الإجراءات المعلقة**: عرض عدد العمليات في انتظار المزامنة
- **زر المزامنة اليدوية**: مزامنة فورية عند الاتصال
- **التحديث الفوري**: تحديث الواجهة فوراً مع أي تغيير

## 🛠️ **آلية العمل**

### **1. التحقق من الاتصال**
```typescript
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    // التحقق من navigator.onLine أولاً
    if (!navigator.onLine) return false;
    
    // ثم محاولة جلب مورد صغير للتحقق من الاتصال الحقيقي
    const response = await fetch('https://www.google.com/images/cleardot.gif', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(2000) // 2 ثانية كحد أقصى
    });
    
    return true; // إذا وصلنا هنا، لدينا اتصال
  } catch (error) {
    return false;
  }
};
```

### **2. إضافة جلسة (Online/Offline)**

#### **عند الاتصال:**
```typescript
const isOnline = await checkNetworkConnectivity();

if (isOnline) {
  try {
    // حفظ في Firebase
    const hearingId = await addHearing(hearingData);
    
    // تحديث الحالة المحلية
    setHearings(prev => [{ ...hearingData, id: hearingId }, ...prev]);
    
    // تحديث التخزين المؤقت
    await offlineManager.cacheData('hearings', updatedHearings);
  } catch (error) {
    // إذا فشل Firebase، حفظ محلياً
    await saveOffline(hearingData, 'create');
  }
} else {
  // حفظ محلي مباشرة
  await saveOffline(hearingData, 'create');
}
```

#### **عند انقطاع الاتصال:**
```typescript
// إنشاء معرف مؤقت
const tempId = `temp_hearing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const hearingWithTempId = { ...hearingData, id: tempId };

// تحديث الحالة المحلية فوراً
setHearings(prev => [hearingWithTempId, ...prev]);

// إضافة للقائمة الانتظار
await offlineManager.addPendingAction({
  type: 'create',
  entity: 'hearing',
  data: hearingData
});

// تحديث التخزين المؤقت
await offlineManager.cacheData('hearings', updatedHearings);
```

### **3. تعديل جلسة (Online/Offline)**

#### **عند الاتصال:**
```typescript
if (isOnline) {
  try {
    // تحديث في Firebase
    await updateHearing(updatedHearing.id, hearingData);
    
    // تحديث الحالة المحلية
    const updatedHearings = hearings.map(h => 
      h.id === updatedHearing.id ? hearingData : h
    );
    setHearings(updatedHearings);
    
    // معالجة المصاريف إذا وجدت
    if (hearingData.expenses && hearingData.expenses.amount > 0) {
      await processExpenses(hearingData);
    }
    
    // تحديث التخزين المؤقت
    await offlineManager.cacheData('hearings', updatedHearings);
  } catch (error) {
    // إذا فشل Firebase، حفظ محلياً
    await saveOffline(hearingData, 'update');
  }
} else {
  // حفظ محلي مباشرة
  await saveOffline(hearingData, 'update');
}
```

#### **عند انقطاع الاتصال:**
```typescript
// تحديث الحالة المحلية فوراً
const updatedHearings = hearings.map(h => 
  h.id === updatedHearing.id ? hearingData : h
);
setHearings([...updatedHearings]);

// إضافة للقائمة الانتظار
await offlineManager.addPendingAction({
  type: 'update',
  entity: 'hearing',
  data: hearingData
});

// تحديث التخزين المؤقت
await offlineManager.cacheData('hearings', updatedHearings);
```

### **4. حذف جلسة (Online/Offline)**

#### **عند الاتصال:**
```typescript
if (isOnline) {
  try {
    // حذف من Firebase
    await deleteHearing(hearingId);
    
    // تحديث الحالة المحلية
    const updatedHearings = hearings.filter(h => h.id !== hearingId);
    setHearings(updatedHearings);
    
    // تحديث التخزين المؤقت
    await offlineManager.cacheData('hearings', updatedHearings);
  } catch (error) {
    // إذا فشل Firebase، حفظ محلياً
    await saveOffline({ id: hearingId }, 'delete');
  }
} else {
  // حفظ محلي مباشرة
  await saveOffline({ id: hearingId }, 'delete');
}
```

## 🔄 **نظام المزامنة**

### **المزامنة التلقائية:**
```typescript
// في offlineManager.ts
window.addEventListener('online', () => {
  console.log('Network connection restored');
  this.notifyStatusChange();
  this.syncPendingActions(); // مزامنة تلقائية
});

async syncPendingActions() {
  const actions = await this.getPendingActions();
  
  for (const action of actions) {
    try {
      await this.executeAction(action);
      await this.removePendingAction(action.id);
      await this.logSyncAction(action, 'success');
    } catch (error) {
      // إعادة المحاولة (3 محاولات كحد أقصى)
      action.retryCount++;
      if (action.retryCount < 3) {
        await this.updatePendingAction(action);
      } else {
        await this.removePendingAction(action.id);
      }
    }
  }
}
```

### **المزامنة اليدوية:**
```typescript
const handleSyncNow = async () => {
  if (!isOnline) return;
  
  setIsSyncing(true);
  try {
    const success = await syncNow();
    if (success) {
      console.log('✅ Hearings synced successfully');
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    setIsSyncing(false);
  }
};
```

## 📱 **واجهة المستخدم**

### **مؤشر الحالة:**
- **🟢 متصل**: أيقونة Wifi خضراء + نص "متصل"
- **🔴 غير متصل**: أيقونة WifiOff حمراء + نص "غير متصل"
- **🔄 مزامنة**: أيقونة RefreshCw دوارة + زر المزامنة

### **الإجراءات المعلقة:**
- **عند الاتصال**: زر أزرق يعرض عدد الإجراءات المعلقة
- **عند انقطاع الاتصال**: شريط أصفر يعرض عدد الإجراءات المعلقة

### **التحديث الفوري:**
- جميع التغييرات تظهر فوراً في الواجهة
- استخدام `forceUpdate` و `refreshKey` لضمان إعادة العرض
- رسائل واضحة للمستخدم عن حالة العملية

## 🔧 **معالجة الأخطاء**

### **التحقق من البيانات:**
```typescript
// التحقق من عدم وجود الجلسة مسبقاً
const existingHearing = hearings.find(h => 
  h.caseId === newHearing.caseId && 
  h.date === newHearing.date && 
  h.time === newHearing.time
);

if (existingHearing) {
  setError('هذه الجلسة موجودة بالفعل');
  return;
}

// التحقق من وجود ID للتعديل
if (!updatedHearing.id) {
  setError('لا يمكن تحديث جلسة بدون معرف');
  return;
}
```

### **معالجة المصاريف:**
```typescript
// منع التكرار في تسجيل المصاريف
const existingExpense = targetCase.finance?.history?.find(
  transaction => 
    transaction.hearingId === hearingData.id && 
    transaction.type === 'expense'
);

const recentAddition = targetCase.finance?.history?.find(
  transaction => 
    transaction.hearingId === hearingData.id && 
    transaction.type === 'expense' &&
    new Date(transaction.date).getTime() > (Date.now() - 5000)
);

// فقط إذا لم يتم تسجيلها من قبل
if (!existingExpense && !recentAddition) {
  await addExpenseToCase(hearingData);
}
```

## 📋 **قائمة التحقق**

### **قبل الاستخدام:**
- [ ] يعمل التطبيق بدون اتصال
- [ ] تظهر الجلسات المخزنة محلياً
- [ ] تعرض واجهة المستخدم الحالة الصحيحة
- [ ] تعمل جميع الأزرار والنماذج

### **أثناء الاستخدام:**
- [ ] إضافة جلسة تعمل بدون اتصال
- [ ] تعديل جلسة يعمل بدون اتصال
- [ ] حذف جلسة يعمل بدون اتصال
- [ ] تظهر التغييرات فوراً في الواجهة

### **بعد العودة للاتصال:**
- [ ] تتم المزامنة تلقائياً
- [ ] تظهر الإجراءات المعلقة بشكل صحيح
- [ ] تعمل المزامنة اليدوية
- [ ] يتم تحديث البيانات في Firebase

## 🚧 **التحسينات المستقبلية**

### **مقترحات:**
1. **Background Sync API**: مزامنة في الخلفية
2. **Conflict Resolution**: حل تعارضات البيانات
3. **Real-time Updates**: تحديثات فورية عبر WebSocket
4. **Batch Operations**: عمليات دفعة للمزامنة
5. **Offline Analytics**: تحليلات استخدام بدون اتصال

### **ميزات جديدة:**
1. **Smart Caching**: التنبؤ بالبيانات المطلوبة
2. **Progressive Enhancement**: تحسين تدريجي للوظائف
3. **Offline Notifications**: إشعارات بدون اتصال
4. **Data Compression**: ضغط البيانات المحلية

---

**ملاحظة**: هذا النظام مصمم للعمل بشكل أفضل مع متصفحات الويب الحديثة التي تدعم Service Worker و IndexedDB.
