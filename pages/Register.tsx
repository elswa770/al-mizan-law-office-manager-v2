import React, { useState } from 'react';
import { Gavel, Lock, User, ArrowRight, Mail, Building, Shield, Eye, EyeOff } from 'lucide-react';
import { AppUser, PermissionLevel } from '../types';
import { registerUser } from '../services/authService';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onBackToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onBackToLogin }) => {
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    roleLabel: string;
    permissions: { moduleId: string; access: PermissionLevel }[];
  }>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    roleLabel: 'محامي',
    permissions: getDefaultPermissions()
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (formData.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      await registerUser(
        formData.email,
        formData.password,
        formData.name,
        {
          roleLabel: formData.roleLabel,
          permissions: formData.permissions
        }
      );
      
      onRegisterSuccess();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionChange = (moduleId: string, access: PermissionLevel) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.map(p => 
        p.moduleId === moduleId ? { ...p, access } : p
      )
    }));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 relative">
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
           <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-lg mb-4">
              <Gavel className="w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">إنشاء حساب جديد</h1>
           <p className="text-sm text-slate-500 mt-1">انضم إلى نظام الميزان لإدارة مكتب المحاماة</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                 {error}
              </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                 <div className="relative">
                    <User className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="الاسم الكامل"
                      required
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                 <div className="relative">
                    <Mail className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="البريد الإلكتروني"
                      required
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">كلمة المرور</label>
                 <div className="relative">
                    <Lock className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-12 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="كلمة المرور"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">تأكيد كلمة المرور</label>
                 <div className="relative">
                    <Lock className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full pl-12 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                      placeholder="تأكيد كلمة المرور"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                 </div>
              </div>

              <div>
                 <label className="block text-sm font-bold text-slate-700 mb-1">المنصب</label>
                 <div className="relative">
                    <Building className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                    <select 
                      value={formData.roleLabel}
                      onChange={(e) => setFormData(prev => ({ ...prev, roleLabel: e.target.value }))}
                      className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all appearance-none"
                    >
                      <option value="محامي">محامي</option>
                      <option value="مستشار قانوني">مستشار قانوني</option>
                      <option value="محامي متدرب">محامي متدرب</option>
                      <option value="مساعد قانوني">مساعد قانوني</option>
                      <option value="مدير إداري">مدير إداري</option>
                    </select>
                 </div>
              </div>
           </div>

           {/* Permissions Section */}
           <div className="border-t border-slate-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                 <Shield className="w-5 h-5 text-primary-600" />
                 <h3 className="font-bold text-slate-800">الصلاحيات الافتراضية</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                 {formData.permissions.map((permission) => (
                    <div key={permission.moduleId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                       <span className="text-sm font-medium text-slate-700">
                          {getModuleLabel(permission.moduleId)}
                       </span>
                       <select 
                         value={permission.access}
                         onChange={(e) => handlePermissionChange(permission.moduleId, e.target.value as PermissionLevel)}
                         className="text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-primary-500"
                       >
                          <option value="none">لا شيء</option>
                          <option value="read">قراءة</option>
                          <option value="write">كتابة</option>
                       </select>
                    </div>
                 ))}
              </div>
           </div>

           <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" required />
                 <span className="text-slate-600">أوافق على الشروط والأحكام</span>
              </label>
           </div>

           <div className="flex gap-4">
              <button 
                type="button"
                onClick={onBackToLogin}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center gap-2"
              >
                 العودة
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                 {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                 ) : (
                    <>
                       إنشاء حساب <ArrowRight className="w-4 h-4" />
                    </>
                 )}
              </button>
           </div>
        </form>
        
        <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">
           جميع الحقوق محفوظة © {new Date().getFullYear()} الميزان
        </div>
      </div>
    </div>
  );
};

// Helper Functions
const getDefaultPermissions = (): { moduleId: string; access: PermissionLevel }[] => [
  { moduleId: 'dashboard', access: 'read' as const },
  { moduleId: 'cases', access: 'read' as const },
  { moduleId: 'clients', access: 'read' as const },
  { moduleId: 'hearings', access: 'read' as const },
  { moduleId: 'tasks', access: 'read' as const },
  { moduleId: 'documents', access: 'read' as const },
  { moduleId: 'fees', access: 'none' as const },
  { moduleId: 'expenses', access: 'none' as const },
  { moduleId: 'reports', access: 'none' as const },
  { moduleId: 'settings', access: 'none' as const },
  { moduleId: 'ai-assistant', access: 'read' as const },
  { moduleId: 'references', access: 'read' as const },
  { moduleId: 'locations', access: 'read' as const },
  { moduleId: 'calculators', access: 'read' as const },
  { moduleId: 'generator', access: 'read' as const }
];

const getModuleLabel = (moduleId: string): string => {
  const labels: Record<string, string> = {
    'dashboard': 'لوحة التحكم',
    'cases': 'إدارة القضايا',
    'clients': 'إدارة الموكلين',
    'hearings': 'الجلسات',
    'tasks': 'المهام',
    'documents': 'المستندات',
    'fees': 'الأتعاب',
    'expenses': 'المصروفات',
    'reports': 'التقارير',
    'settings': 'الإعدادات',
    'ai-assistant': 'المساعد الذكي',
    'references': 'المراجع',
    'locations': 'المحاكم',
    'calculators': 'الحاسبات',
    'generator': 'منشئ العقود'
  };
  return labels[moduleId] || moduleId;
};

export default Register;
