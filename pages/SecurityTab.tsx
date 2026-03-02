import React from 'react';
import { ShieldAlert, Fingerprint, Smartphone, History, Shield, Globe2, Loader2, Save } from 'lucide-react';
import { PasswordPolicy, TwoFactorSettings, TrustedDevice, SecurityActivity } from '../types';

interface SecurityTabProps {
  passwordPolicy: PasswordPolicy;
  twoFactorSettings: TwoFactorSettings;
  trustedDevices: TrustedDevice[];
  securityActivity: SecurityActivity[];
  isSaving: boolean;
  readOnly: boolean;
  onUpdatePasswordPolicy: (policy: PasswordPolicy) => void;
  onEnableTwoFactor: (method: 'sms' | 'email' | 'authenticator') => void;
  onDisableTwoFactor: () => void;
  onRemoveTrustedDevice: (deviceId: string) => void;
  onSaveSettings: () => void;
  checkPasswordStrength: (password: string) => { score: number; feedback: string[] };
}

const SecurityTab: React.FC<SecurityTabProps> = ({
  passwordPolicy,
  twoFactorSettings,
  trustedDevices,
  securityActivity,
  isSaving,
  readOnly,
  onUpdatePasswordPolicy,
  onEnableTwoFactor,
  onDisableTwoFactor,
  onRemoveTrustedDevice,
  onSaveSettings,
  checkPasswordStrength
}) => {
  const [passwordTest, setPasswordTest] = React.useState('');
  const [strengthResult, setStrengthResult] = React.useState<{ score: number; feedback: string[] }>({ score: 0, feedback: [] });

  const handlePasswordTest = (value: string) => {
    setPasswordTest(value);
    const result = checkPasswordStrength(value);
    setStrengthResult(result);
  };

  const getStrengthColor = (score: number) => {
    if (score < 40) return 'bg-red-500';
    if (score < 60) return 'bg-yellow-500';
    if (score < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 40) return 'ضعيفة';
    if (score < 60) return 'متوسطة';
    if (score < 80) return 'قوية';
    return 'قوية جداً';
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">إعدادات الأمان المتقدمة</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">حماية الحساب والتحكم في الوصول</p>
        </div>
        {!readOnly && (
          <button 
            onClick={onSaveSettings}
            disabled={isSaving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
               <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
            ) : (
               <><Save className="w-4 h-4" /> حفظ الإعدادات</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Password Policy */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> سياسة كلمات المرور
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">الحد الأدنى للطول</span>
                <input 
                  type="number" 
                  className="w-16 border p-1 rounded text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={passwordPolicy.minLength}
                  onChange={e => onUpdatePasswordPolicy({...passwordPolicy, minLength: parseInt(e.target.value)})}
                  disabled={readOnly}
                />
              </div>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-600 dark:text-slate-400">تطلب أحرف كبيرة</span>
                <input 
                  type="checkbox" 
                  className="accent-indigo-600 w-4 h-4"
                  checked={passwordPolicy.requireUppercase}
                  onChange={e => onUpdatePasswordPolicy({...passwordPolicy, requireUppercase: e.target.checked})}
                  disabled={readOnly}
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-600 dark:text-slate-400">تطلب أحرف صغيرة</span>
                <input 
                  type="checkbox" 
                  className="accent-indigo-600 w-4 h-4"
                  checked={passwordPolicy.requireLowercase}
                  onChange={e => onUpdatePasswordPolicy({...passwordPolicy, requireLowercase: e.target.checked})}
                  disabled={readOnly}
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-600 dark:text-slate-400">تطلب أرقام</span>
                <input 
                  type="checkbox" 
                  className="accent-indigo-600 w-4 h-4"
                  checked={passwordPolicy.requireNumbers}
                  onChange={e => onUpdatePasswordPolicy({...passwordPolicy, requireNumbers: e.target.checked})}
                  disabled={readOnly}
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-600 dark:text-slate-400">تطلب رموز خاصة</span>
                <input 
                  type="checkbox" 
                  className="accent-indigo-600 w-4 h-4"
                  checked={passwordPolicy.requireSpecialChars}
                  onChange={e => onUpdatePasswordPolicy({...passwordPolicy, requireSpecialChars: e.target.checked})}
                  disabled={readOnly}
                />
              </label>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">صلاحية كلمة المرور (يوم)</span>
                <input 
                  type="number" 
                  className="w-16 border p-1 rounded text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={passwordPolicy.maxAge}
                  onChange={e => onUpdatePasswordPolicy({...passwordPolicy, maxAge: parseInt(e.target.value)})}
                  disabled={readOnly}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">عدد كلمات المرور في السجل</span>
                <input 
                  type="number" 
                  className="w-16 border p-1 rounded text-center dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={passwordPolicy.historyCount}
                  onChange={e => onUpdatePasswordPolicy({...passwordPolicy, historyCount: parseInt(e.target.value)})}
                  disabled={readOnly}
                />
              </div>
            </div>
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-green-600" /> المصادقة الثنائية (2FA)
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">حماية إضافية للحساب</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={twoFactorSettings.enabled} 
                  onChange={e => e.target.checked ? onEnableTwoFactor('sms') : onDisableTwoFactor()}
                  disabled={readOnly}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            {twoFactorSettings.enabled && (
              <div className="space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded">
                      <div className="w-16 h-16 bg-slate-900 flex items-center justify-center text-white text-xs">QR</div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800 dark:text-green-300">امسح الرمز ضوئياً</p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">استخدم تطبيق المصادقة لمسح الرمز وتفعيل الحماية.</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">طريقة المصادقة</label>
                  <select 
                    className="w-full border p-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={twoFactorSettings.method}
                    onChange={e => {/* Handle method change */}}
                    disabled={readOnly}
                  >
                    <option value="sms">رسالة نصية (SMS)</option>
                    <option value="email">بريد إلكتروني</option>
                    <option value="authenticator">تطبيق مصادقة</option>
                  </select>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>رموز الاسترداد:</strong> {twoFactorSettings.backupCodes?.length || 0} رمز متاح
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Trusted Devices */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Smartphone className="w-5 h-5 text-blue-600" /> الأجهزة الموثوقة
            </h4>
            <div className="space-y-3">
              {trustedDevices.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">لا توجد أجهزة موثوقة</p>
              ) : (
                trustedDevices.map(device => (
                  <div key={device.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-600 p-2 rounded-full">
                        {device.deviceType === 'desktop' ? <Globe2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{device.deviceName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">آخر استخدام: {device.lastUsed}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemoveTrustedDevice(device.id)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                      disabled={readOnly}
                    >
                      إزالة
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Security Activity */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <History className="w-5 h-5 text-purple-600" /> سجل النشاط الأمني
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {securityActivity.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">لا يوجد نشاط أمني</p>
              ) : (
                securityActivity.slice(0, 10).map(activity => (
                  <div key={activity.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.riskLevel === 'critical' ? 'bg-red-500' :
                        activity.riskLevel === 'high' ? 'bg-orange-500' :
                        activity.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div>
                        <p className="text-xs font-medium text-slate-800 dark:text-white">
                          {activity.action === 'login' ? 'تسجيل دخول' :
                           activity.action === 'logout' ? 'تسجيل خروج' :
                           activity.action === 'password_change' ? 'تغيير كلمة المرور' :
                           activity.action === 'permission_change' ? 'تغيير الصلاحيات' :
                           activity.action === '2fa_enabled' ? 'تفعيل المصادقة الثنائية' :
                           activity.action === '2fa_disabled' ? 'إلغاء المصادقة الثنائية' :
                           activity.action === 'account_locked' ? 'قفل الحساب' :
                           activity.action === 'account_unlocked' ? 'فتح الحساب' :
                           activity.action === 'failed_login' ? 'محاولة دخول فاشلة' : activity.action}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(activity.timestamp).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      activity.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {activity.success ? 'نجح' : 'فشل'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Password Strength Meter */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <Shield className="w-5 h-5 text-indigo-600" /> قوة كلمة المرور
            </h4>
            <div className="space-y-3">
              <input 
                type="password" 
                placeholder="اختبار قوة كلمة المرور"
                className="w-full border p-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={passwordTest}
                onChange={e => handlePasswordTest(e.target.value)}
              />
              <div className="h-2 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getStrengthColor(strengthResult.score)} transition-all duration-300`} 
                  style={{width: `${strengthResult.score}%`}}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  قوة كلمة المرور: <span className={`font-bold ${getStrengthColor(strengthResult.score).replace('bg-', 'text-')}`}>{getStrengthText(strengthResult.score)}</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {strengthResult.score}/100
                </p>
              </div>
              {strengthResult.feedback.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">توصيات:</p>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                    {strengthResult.feedback.map((feedback, index) => (
                      <li key={index}>• {feedback}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityTab;
