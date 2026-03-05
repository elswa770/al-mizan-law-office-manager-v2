# 🚀 دليل المميزات المتقدمة لنظام Offline

## 🎯 الهدف
إضافة مميزات متقدمة لإدارة أفضل للمعاملات المحفوظة في وضع عدم الاتصال، مع إحصائيات مفصلة وتحكم كامل في قائمة الانتظار.

---

## 📊 1. إحصائيات المعاملات المحفوظة

### 🏪 في offlineManager.ts
```typescript
// إضافة دالة للحصول على إحصائيات المعاملات المحفوظة
async getOfflineStats(): Promise<OfflineStats> {
  if (!this.db) await this.initDB();
  
  const actions = await this.getPendingActions();
  const stats = {
    total: actions.length,
    byType: {
      case: actions.filter(a => a.entity === 'case').length,
      client: actions.filter(a => a.entity === 'client').length,
      hearing: actions.filter(a => a.entity === 'hearing').length,
      task: actions.filter(a => a.entity === 'task').length
    },
    byAction: {
      create: actions.filter(a => a.action === 'create').length,
      update: actions.filter(a => a.action === 'update').length,
      delete: actions.filter(a => a.action === 'delete').length
    },
    oldestAction: actions.length > 0 ? 
      new Date(Math.min(...actions.map(a => new Date(a.timestamp)))) : null,
    totalSize: JSON.stringify(actions).length // حجم البيانات بالبايت
  };
  
  return stats;
}

// تعريف واجهة الإحصائيات
interface OfflineStats {
  total: number;
  byType: {
    case: number;
    client: number;
    hearing: number;
    task: number;
  };
  byAction: {
    create: number;
    update: number;
    delete: number;
  };
  oldestAction: Date | null;
  totalSize: number;
}
```

### 📱 عرض الإحصائيات في الصفحات
```typescript
// في أي صفحة (مثال: Fees.tsx)
const [offlineStats, setOfflineStats] = useState<OfflineStats | null>(null);

useEffect(() => {
  const loadStats = async () => {
    const stats = await offlineManager.getOfflineStats();
    setOfflineStats(stats);
  };
  
  loadStats();
  const interval = setInterval(loadStats, 10000); // تحديث كل 10 ثواني
  return () => clearInterval(interval);
}, []);

// عرض الإحصائيات
{!isOnline && offlineStats && (
  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 mb-4">
    <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
      <BarChart3 className="w-5 h-5" />
      إحصائيات المعاملات المحفوظة
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-primary-600">{offlineStats.total}</div>
        <div className="text-xs text-slate-500">إجمالي</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-green-600">{offlineStats.byType.case}</div>
        <div className="text-xs text-slate-500">قضايا</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-amber-600">{offlineStats.oldestAction ? 
          Math.floor((Date.now() - offlineStats.oldestAction.getTime()) / (1000 * 60 * 60)) : 0} ساعة</div>
        <div className="text-xs text-slate-500">أقدم معاملة</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-bold text-blue-600">{(offlineStats.totalSize / 1024).toFixed(1)} KB</div>
        <div className="text-xs text-slate-500">حجم البيانات</div>
      </div>
    </div>
  </div>
)}
```

---

## 🕒 2. عرض تاريخ آخر مزامنة

### 📅 في offlineManager.ts
```typescript
// إضافة خاصية لتتبع تاريخ المزامنة
private lastSyncTime: Date | null = null;

// تحديث وقت المزامنة
private updateLastSyncTime(): void {
  this.lastSyncTime = new Date();
  // حفظ في localStorage للاستمرارية
  localStorage.setItem('lastSyncTime', this.lastSyncTime.toISOString());
}

// الحصول على وقت المزامنة
getLastSyncTime(): Date | null {
  if (!this.lastSyncTime) {
    const saved = localStorage.getItem('lastSyncTime');
    if (saved) {
      this.lastSyncTime = new Date(saved);
    }
  }
  return this.lastSyncTime;
}

// في دالة المزامنة
async syncPendingActions(): Promise<void> {
  console.log('🔄 Starting sync...');
  
  try {
    const actions = await this.getPendingActions();
    
    for (const action of actions) {
      await this.executeAction(action);
    }
    
    if (actions.length > 0) {
      await this.clearPendingActions();
      this.updateLastSyncTime(); // تحديث وقت المزامنة
    }
    
    console.log('✅ Sync completed successfully');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}
```

### 🕐 عرض تاريخ المزامنة في الواجهة
```typescript
// في أي صفحة
const [lastSync, setLastSync] = useState<Date | null>(null);

useEffect(() => {
  const updateLastSync = () => {
    const syncTime = offlineManager.getLastSyncTime();
    setLastSync(syncTime);
  };
  
  updateLastSync();
  const interval = setInterval(updateLastSync, 5000);
  return () => clearInterval(interval);
}, []);

// عرض تاريخ المزامنة
<div className="flex items-center gap-2 text-sm text-slate-500">
  <Clock className="w-4 h-4" />
  {lastSync ? (
    <span>آخر مزامنة: {lastSync.toLocaleString('ar-EG')}</span>
  ) : (
    <span>لم تتم مزامنة بعد</span>
  )}
</div>
```

---

## 🗑️ 3. إمكانية الحذف من قائمة الانتظار

### 📋 في offlineManager.ts
```typescript
// حذف إجراء محدد
async removePendingAction(actionId: string): Promise<void> {
  if (!this.db) await this.initDB();
  
  const tx = this.db.transaction(['pendingActions'], 'readwrite');
  const store = tx.objectStore('pendingActions');
  await store.delete(actionId);
  
  console.log(`🗑️ Removed action ${actionId} from pending queue`);
}

// حذف جميع الإجراءات لنوع معين
async removePendingActionsByType(entity: string, action?: string): Promise<void> {
  if (!this.db) await this.initDB();
  
  const allActions = await this.getPendingActions();
  const toDelete = allActions.filter(a => 
    a.entity === entity && (!action || a.action === action)
  );
  
  const tx = this.db.transaction(['pendingActions'], 'readwrite');
  const store = tx.objectStore('pendingActions');
  
  for (const action of toDelete) {
    await store.delete(action.id);
  }
  
  console.log(`🗑️ Removed ${toDelete.length} actions for ${entity}${action ? ` (${action})` : ''}`);
}

// حذف جميع الإجراءات
async clearAllPendingActions(): Promise<void> {
  if (!this.db) await this.initDB();
  
  const tx = this.db.transaction(['pendingActions'], 'readwrite');
  const store = tx.objectStore('pendingActions');
  await store.clear();
  
  console.log('🗑️ Cleared all pending actions');
}
```

### 🎛️ واجهة الحذف في الصفحات
```typescript
// مكون قائمة الانتظار
const PendingActionsManager: React.FC = () => {
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  useEffect(() => {
    const loadActions = async () => {
      const actions = await offlineManager.getPendingActions();
      setPendingActions(actions);
    };
    
    loadActions();
    const interval = setInterval(loadActions, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRemoveAction = async (actionId: string) => {
    await offlineManager.removePendingAction(actionId);
    const updated = await offlineManager.getPendingActions();
    setPendingActions(updated);
    setShowConfirm(null);
  };

  const handleClearByType = async (entity: string) => {
    await offlineManager.removePendingActionsByType(entity);
    const updated = await offlineManager.getPendingActions();
    setPendingActions(updated);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
      <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <ListX className="w-5 h-5" />
        قائمة الانتظار ({pendingActions.length})
      </h3>
      
      {pendingActions.length === 0 ? (
        <p className="text-slate-500 text-center py-4">لا توجد معاملات محفوظة</p>
      ) : (
        <div className="space-y-2">
          {pendingActions.map(action => (
            <div key={action.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex-1">
                <div className="font-medium text-slate-800 dark:text-white">
                  {action.action === 'create' ? 'إضافة' : action.action === 'update' ? 'تحديث' : 'حذف'} {action.entity}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(action.timestamp).toLocaleString('ar-EG')}
                </div>
              </div>
              <button
                onClick={() => setShowConfirm(action.id)}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {/* أزرار الحذف الجماعي */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <button
              onClick={() => handleClearByType('case')}
              className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm"
            >
              حذف قضايا
            </button>
            <button
              onClick={() => handleClearByType('client')}
              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
            >
              حذف موكلين
            </button>
            <button
              onClick={() => offlineManager.clearAllPendingActions()}
              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
            >
              حذف الكل
            </button>
          </div>
        </div>
      )}
      
      {/* نافذة التأكيد */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">
              تأكيد الحذف
            </h4>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              هل أنت متأكد من حذف هذه المعاملة من قائمة الانتظار؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleRemoveAction(showConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 📤 4. تصدير/استيراد البيانات المحفوظة

### 💾 في offlineManager.ts
```typescript
// تصدير البيانات المحفوظة
async exportOfflineData(): Promise<OfflineExport> {
  if (!this.db) await this.initDB();
  
  const actions = await this.getPendingActions();
  const lastSync = this.getLastSyncTime();
  
  const exportData: OfflineExport = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    lastSync: lastSync?.toISOString() || null,
    pendingActions: actions,
    stats: await this.getOfflineStats()
  };
  
  return exportData;
}

// استيراد البيانات المحفوظة
async importOfflineData(data: OfflineExport): Promise<void> {
  if (!this.db) await this.initDB();
  
  // التحقق من التوافق
  if (data.version !== '1.0') {
    throw new Error('إصدار البيانات غير متوافق');
  }
  
  // استيراد الإجراءات
  const tx = this.db.transaction(['pendingActions'], 'readwrite');
  const store = tx.objectStore('pendingActions');
  
  for (const action of data.pendingActions) {
    // إنشاء ID جديد لتجنب التعارض
    const newAction = {
      ...action,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    await store.add(newAction);
  }
  
  console.log(`📥 Imported ${data.pendingActions.length} actions`);
}

// واجهة التصدير
interface OfflineExport {
  version: string;
  exportDate: string;
  lastSync: string | null;
  pendingActions: OfflineAction[];
  stats: OfflineStats;
}
```

### 📥 واجهة التصدير/الاستيراد
```typescript
// مكون إدارة البيانات
const OfflineDataManager: React.FC = () => {
  const [exportData, setExportData] = useState<string>('');
  const [importFile, setImportFile] = useState<File | null>(null);

  const handleExport = async () => {
    try {
      const data = await offlineManager.exportOfflineData();
      const json = JSON.stringify(data, null, 2);
      setExportData(json);
      
      // تحميل الملف تلقائياً
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      const text = await importFile.text();
      const data = JSON.parse(text) as OfflineExport;
      await offlineManager.importOfflineData(data);
      
      alert('تم استيراد البيانات بنجاح');
      setImportFile(null);
    } catch (error) {
      console.error('Import failed:', error);
      alert('فشل استيراد البيانات: ' + error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 space-y-4">
      <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
        <Database className="w-5 h-5" />
        إدارة البيانات المحفوظة
      </h3>
      
      {/* قسم التصدير */}
      <div>
        <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">تصدير البيانات</h4>
        <button
          onClick={handleExport}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          تصدير البيانات المحفوظة
        </button>
      </div>
      
      {/* قسم الاستيراد */}
      <div>
        <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">استيراد البيانات</h4>
        <input
          type="file"
          accept=".json"
          onChange={(e) => setImportFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
        />
        {importFile && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleImport}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              استيراد {importFile.name}
            </button>
            <button
              onClick={() => setImportFile(null)}
              className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-4 py-2 rounded-lg"
            >
              إلغاء
            </button>
          </div>
        )}
      </div>
      
      {/* عرض البيانات المصدرة */}
      {exportData && (
        <div>
          <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">معاينة البيانات</h4>
          <pre className="bg-slate-100 dark:bg-slate-700 p-3 rounded-lg text-xs overflow-auto max-h-40">
            {exportData}
          </pre>
        </div>
      )}
    </div>
  );
};
```

---

## 🎨 تكامل الواجهة

### 📱 صفحة الإعدادات المتقدمة
```typescript
// إنشاء صفحة جديدة للإعدادات المتقدمة
const OfflineSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'stats' | 'queue' | 'data'>('stats');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
        إعدادات العمل بدون اتصال
      </h1>
      
      {/* تبويبات */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'stats' 
              ? 'border-b-2 border-primary-500 text-primary-600' 
              : 'text-slate-500'
          }`}
        >
          إحصائيات
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'queue' 
              ? 'border-b-2 border-primary-500 text-primary-600' 
              : 'text-slate-500'
          }`}
        >
          قائمة الانتظار
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'data' 
              ? 'border-b-2 border-primary-500 text-primary-600' 
              : 'text-slate-500'
          }`}
        >
          تصدير/استيراد
        </button>
      </div>
      
      {/* المحتوى */}
      {activeTab === 'stats' && <OfflineStats />}
      {activeTab === 'queue' && <PendingActionsManager />}
      {activeTab === 'data' && <OfflineDataManager />}
    </div>
  );
};
```

---

## 🚀 خطوات التنفيذ

### 1. **تحديث offlineManager.ts**
- إضافة دوال الإحصائيات
- إضافة دوال التصدير/الاستيراد
- إضافة دوال الحذف الانتقائي
- إضافة تتبع وقت المزامنة

### 2. **إنشاء مكونات جديدة**
- OfflineStats للإحصائيات
- PendingActionsManager لإدارة قائمة الانتظار
- OfflineDataManager للتصدير/الاستيراد

### 3. **تحديث الصفحات الحالية**
- إضافة المكونات الجديدة للصفحات الموجودة
- تحديث واجهة المستخدم

### 4. **الاختبار والتحقق**
- اختبار جميع المميزات
- التحقق من الأداء

---

## ✅ الفوائد المتوقعة

### 🎯 للمستخدم:
- **تحكم كامل** في البيانات المحفوظة
- **إحصائيات مفصلة** عن حالة النظام
- **إمكانية النسخ الاحتياطي** واستعادة البيانات
- **إدارة سهلة** لقائمة الانتظار

### 💼 للنظام:
- **مرونة عالية** في التعامل مع البيانات
- **قدرة على التشخيص** وحل المشاكل
- **دعم كامل** لسيناريوهات العمل المختلفة
- **قابلية للتوسع** في المستقبل

---

*تم الإنشاء: 5 مارس 2026*
*آخر تحديث: 5 مارس 2026*
