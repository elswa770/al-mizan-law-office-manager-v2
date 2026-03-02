
import React, { useState } from 'react';
import { Gavel, Lock, User, ArrowRight, Mail } from 'lucide-react';
import { resetPassword } from '../services/authService';
import { logFailedLogin, getClientIP, getUserAgent, getLocationFromIP } from '../utils/loginLogger';

interface LoginProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
  onShowRegister?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onShowRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setError(err.message || 'فشل في إرسال رابط إعادة تعيين كلمة المرور');
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    setShowForgotPassword(true);
    setResetEmail(email);
    setError('');
    setResetSuccess(false);
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setError('');
    setResetSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await onLogin(email, password);
      if (!success) {
        // Log failed login attempt only if login actually failed
        const ip = getClientIP();
        const userAgent = getUserAgent();
        const location = await getLocationFromIP(ip);
        
        await logFailedLogin(email, ip, userAgent, location);
        setError('فشل في تسجيل الدخول');
      }
      // If success is true, don't log anything - login was successful
    } catch (err: any) {
      // Log failed login attempt only if there was an actual error
      const ip = getClientIP();
      const userAgent = getUserAgent();
      const location = await getLocationFromIP(ip);
      
      await logFailedLogin(email, ip, userAgent, location);
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
         <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 relative">
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
           <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-lg mb-4">
              <Gavel className="w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">
             {showForgotPassword ? 'إعادة تعيين كلمة المرور' : 'الميزان'}
           </h1>
           <p className="text-sm text-slate-500 mt-1">
             {showForgotPassword ? 'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور' : 'نظام إدارة مكاتب المحاماة'}
           </p>
        </div>

        {showForgotPassword ? (
          // Forgot Password Form
          <form onSubmit={handleResetPassword} className="p-8 space-y-6 pb-8">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}
            
            {resetSuccess && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-green-600 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                 <Mail className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                 <input 
                   type="email" 
                   value={resetEmail}
                   onChange={(e) => setResetEmail(e.target.value)}
                   className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                   placeholder="البريد الإلكتروني"
                   required
                 />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                type="button"
                onClick={handleBackToLogin}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 focus:ring-4 focus:ring-slate-200 transition-all"
              >
                العودة
              </button>
              <button 
                type="submit" 
                disabled={resetLoading || resetSuccess}
                className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-all disabled:opacity-50"
              >
                {resetLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                ) : (
                  'إرسال رابط إعادة التعيين'
                )}
              </button>
            </div>
          </form>
        ) : (
          // Login Form
          <form onSubmit={handleSubmit} className="p-8 space-y-6 pb-8">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                 <User className="absolute right-3 top-3 w-5 h-5 text-slate-400" />
                 <input 
                   type="email" 
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
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
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                   placeholder="••••••••"
                   required
                 />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" className="rounded text-primary-600 focus:ring-primary-500" />
                 <span className="text-slate-600">تذكرني</span>
              </label>
              <button 
                type="button" 
                onClick={handleForgotPasswordClick}
                className="text-primary-600 hover:text-primary-700 font-bold hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
              <button 
                type="button" 
                onClick={onShowRegister}
                className="text-primary-600 hover:text-primary-700 font-bold hover:underline mr-4"
              >
                إنشاء حساب جديد
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isLoading ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                 <>
                    تسجيل الدخول <ArrowRight className="w-4 h-4" />
                 </>
              )}
            </button>
          </form>
        )}
        
        <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">
           جميع الحقوق محفوظة © {new Date().getFullYear()} الميزان
        </div>
      </div>
    </div>
  );
};

export default Login;
