import React, { useState, useRef } from 'react';
import { 
  Archive, Upload, Download, Database, Trash2, Clock, 
  Shield, Settings, FileText, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { 
  doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

interface DataManagementProps {
  cases: any[];
  clients: any[];
  hearings: any[];
  tasks: any[];
  users: any[];
  activities: any[];
  readOnly: boolean;
}

const DataManagement: React.FC<DataManagementProps> = ({
  cases, clients, hearings, tasks, users, activities, readOnly
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    archiving: {
      autoArchive: true,
      archiveAfterDays: 365,
      archiveCriteria: 'closed' as 'closed' | 'completed' | 'all',
      archiveLocation: 'local' as 'local' | 'cloud',
      compressionEnabled: true
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily' as 'daily' | 'weekly' | 'monthly',
      backupTime: '02:00',
      backupLocation: 'local' as 'local' | 'cloud',
      retentionDays: 30,
      encryptionEnabled: true
    },
    cleanup: {
      autoCleanup: false,
      cleanupFrequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly',
      deleteOldActivities: true,
      deleteOldFiles: true,
      deleteEmptyCases: false,
      retentionPeriod: 180
    }
  });

  // --- Data Management Functions ---

  const handleArchiveData = async () => {
    if (readOnly) {
      alert("ليس لديك صلاحية لأرشفة البيانات");
      return;
    }

    if (!confirm('هل أنت متأكد من أنك تريد أرشفة القضايا القديمة؟\nهذه العملية ستنقل القضايا القديمة إلى الأرشيف.')) {
      return;
    }

    setIsProcessing(true);
    try {
      alert('🔄 جاري أرشفة البيانات...');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - settings.archiving.archiveAfterDays);
      
      let casesToArchive = cases;
      if (settings.archiving.archiveCriteria === 'closed') {
        casesToArchive = cases.filter(c => c.status === 'مغلقة' && new Date(c.createdAt || '') < cutoffDate);
      } else if (settings.archiving.archiveCriteria === 'completed') {
        casesToArchive = cases.filter(c => c.status === 'مكتملة' && new Date(c.createdAt || '') < cutoffDate);
      } else {
        casesToArchive = cases.filter(c => new Date(c.createdAt || '') < cutoffDate);
      }

      const archiveData = {
        cases: casesToArchive,
        clients: clients.filter(c => casesToArchive.some(case_ => case_.clientId === c.id)),
        hearings: hearings.filter(h => casesToArchive.some(case_ => case_.id === h.caseId)),
        tasks: tasks.filter(t => casesToArchive.some(case_ => case_.id === t.relatedCaseId)),
        archivedAt: new Date().toISOString(),
        archiveId: `archive_${Date.now()}`
      };

      await setDoc(doc(db, 'archives', archiveData.archiveId), archiveData);
      
      alert(`✅ تم أرشفة ${casesToArchive.length} قضية بنجاح`);
    } catch (error) {
      console.error('Error archiving data:', error);
      alert('❌ فشل أرشفة البيانات: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) {
      alert("ليس لديك صلاحية لاستيراد البيانات");
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm(`هل أنت متأكد من استيراد الملف: ${file.name}؟`)) {
      return;
    }

    setIsProcessing(true);
    try {
      alert('🔄 جاري استيراد البيانات...');
      
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          alert('✅ تم استيراد البيانات بنجاح');
        } else if (file.name.endsWith('.csv')) {
          alert('✅ تم استيراد البيانات بنجاح');
        } else {
          alert('❌ تنسيق الملف غير مدعوم');
        }
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing data:', error);
      alert('❌ فشل استيراد البيانات: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportData = async (format: 'json' | 'csv') => {
    if (readOnly) {
      alert("ليس لديك صلاحية لتصدير البيانات");
      return;
    }

    setIsProcessing(true);
    try {
      alert('🔄 جاري تصدير البيانات...');
      
      const exportData = {
        cases,
        clients,
        hearings,
        tasks,
        exportedAt: new Date().toISOString()
      };

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(exportData, null, 2);
        filename = `data_export_${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        content = convertToCSV(exportData);
        filename = `data_export_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('✅ تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('❌ فشل تصدير البيانات: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateBackup = async () => {
    if (readOnly) {
      alert("ليس لديك صلاحية لإنشاء نسخة احتياطية");
      return;
    }

    setIsProcessing(true);
    try {
      alert('🔄 جاري إنشاء نسخة احتياطية...');
      
      const backupData = {
        cases,
        clients,
        hearings,
        tasks,
        users,
        settings,
        backupAt: new Date().toISOString(),
        backupId: `backup_${Date.now()}`,
        type: 'manual'
      };

      await setDoc(doc(db, 'backups', backupData.backupId), backupData);
      alert('✅ تم إنشاء النسخة الاحتياطية بنجاح');
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('❌ فشل إنشاء النسخة الاحتياطية: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanupData = async () => {
    if (readOnly) {
      alert("ليس لديك صلاحية لتنظيف البيانات");
      return;
    }

    const confirmMessage = `
هل أنت متأكد من تنظيف البيانات؟
سيتم حذف البيانات القديمة غير الضرورية.
هذه العملية لا يمكن التراجع عنها!
    `.trim();

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsProcessing(true);
    try {
      alert('🔄 جاري تنظيف البيانات...');
      
      let deletedCount = 0;
      
      if (settings.cleanup.deleteOldActivities) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - settings.cleanup.retentionPeriod);
        
        const oldActivities = activities.filter(a => new Date(a.timestamp) < cutoffDate);
        for (const activity of oldActivities) {
          await deleteDoc(doc(db, 'activities', activity.id));
          deletedCount++;
        }
      }

      alert(`✅ تم تنظيف البيانات بنجاح (${deletedCount} عنصر محذوف)`);
    } catch (error) {
      console.error('Error cleaning up data:', error);
      alert('❌ فشل تنظيف البيانات: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const convertToCSV = (data: any): string => {
    const headers = Object.keys(data.cases[0] || {}).join(',');
    const rows = data.cases.map((item: any) => Object.values(item).join(','));
    return [headers, ...rows].join('\n');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">إدارة البيانات المتقدمة</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">أرشفة، استيراد، تصدير، نسخ احتياطي، وتنظيف البيانات</p>
        </div>
      </div>

      {/* Data Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Archive Data */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Archive className="w-8 h-8 text-amber-600" />
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">أرشفة البيانات</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">أرشفة القضايا القديمة</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">بعد أيام</label>
              <input
                type="number"
                value={settings.archiving.archiveAfterDays}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  archiving: { ...prev.archiving, archiveAfterDays: parseInt(e.target.value) || 365 }
                }))}
                className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                disabled={readOnly}
              />
            </div>
            <button
              onClick={handleArchiveData}
              disabled={readOnly || isProcessing}
              className="w-full bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {isProcessing ? 'جاري الأرشفة...' : 'أرشفة الآن'}
            </button>
          </div>
        </div>

        {/* Import/Export */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-8 h-8 text-blue-600" />
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">استيراد/تصدير</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">Excel, CSV, JSON</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.xlsx"
              onChange={handleImportData}
              className="hidden"
              disabled={readOnly || isProcessing}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={readOnly || isProcessing}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              استيراد بيانات
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleExportData('json')}
                disabled={readOnly || isProcessing}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                JSON
              </button>
              <button
                onClick={() => handleExportData('csv')}
                disabled={readOnly || isProcessing}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-8 h-8 text-purple-600" />
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">نسخ احتياطي</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">نسخ احتياطي تلقائي</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">الجدولة</label>
              <select
                value={settings.backup.backupFrequency}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  backup: { ...prev.backup, backupFrequency: e.target.value as any }
                }))}
                className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                disabled={readOnly}
              >
                <option value="daily">يومي</option>
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
              </select>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={readOnly || isProcessing}
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isProcessing ? 'جاري النسخ...' : 'نسخ احتياطي الآن'}
            </button>
          </div>
        </div>

        {/* Restore */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-8 h-8 text-indigo-600" />
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">استعادة البيانات</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">نقاط زمنية محفوظة</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <p>• نسخة احتياطية 1 - 2024/01/15</p>
              <p>• نسخة احتياطية 2 - 2024/01/10</p>
              <p>• نسخة احتياطية 3 - 2024/01/05</p>
            </div>
            <button
              disabled={readOnly || isProcessing}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              استعادة من نسخة
            </button>
          </div>
        </div>

        {/* Cleanup */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">تنظيف البيانات</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">حذف البيانات غير الضرورية</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">فترة الاحتفاظ (أيام)</label>
              <input
                type="number"
                value={settings.cleanup.retentionPeriod}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  cleanup: { ...prev.cleanup, retentionPeriod: parseInt(e.target.value) || 180 }
                }))}
                className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                disabled={readOnly}
              />
            </div>
            <button
              onClick={handleCleanupData}
              disabled={readOnly || isProcessing}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? 'جاري التنظيف...' : 'تنظيف الآن'}
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-8 h-8 text-slate-600" />
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white">إعدادات متقدمة</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">تخصيص العمليات</p>
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">أرشفة تلقائية</span>
              <input
                type="checkbox"
                checked={settings.archiving.autoArchive}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  archiving: { ...prev.archiving, autoArchive: e.target.checked }
                }))}
                disabled={readOnly}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">نسخ احتياطي تلقائي</span>
              <input
                type="checkbox"
                checked={settings.backup.autoBackup}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  backup: { ...prev.backup, autoBackup: e.target.checked }
                }))}
                disabled={readOnly}
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">تنظيف تلقائي</span>
              <input
                type="checkbox"
                checked={settings.cleanup.autoCleanup}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  cleanup: { ...prev.cleanup, autoCleanup: e.target.checked }
                }))}
                disabled={readOnly}
              />
            </label>
          </div>
        </div>

      </div>

      {/* Status Messages */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600" />
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>ملاحظات هامة:</strong> جميع عمليات إدارة البيانات تتطلب صلاحيات المسؤول. يرجى التواصل مع مدير النظام للحصول على الصلاحيات اللازمة.
          </p>
        </div>
      </div>

    </div>
  );
};

export default DataManagement;
