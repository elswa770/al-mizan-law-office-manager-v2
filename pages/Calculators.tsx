
import React, { useState } from 'react';
import { Calculator, Calendar, DollarSign, Percent, Info, RotateCcw } from 'lucide-react';

const Calculators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'deadline' | 'fees' | 'interest'>('deadline');

  // --- Deadline Calculator State ---
  const [judgmentDate, setJudgmentDate] = useState('');
  const [procedureType, setProcedureType] = useState('appeal_civil');
  const [deadlineResult, setDeadlineResult] = useState<{ date: string; daysLeft: number } | null>(null);

  // --- Fees Calculator State ---
  const [claimAmount, setClaimAmount] = useState<number>(0);
  const [feesResult, setFeesResult] = useState<{ relative: number; services: number; total: number } | null>(null);

  // --- Interest Calculator State ---
  const [interestAmount, setInterestAmount] = useState<number>(0);
  const [interestStartDate, setInterestStartDate] = useState('');
  const [interestRate, setInterestRate] = useState<number>(4); // 4% civil, 5% commercial
  const [interestResult, setInterestResult] = useState<{ totalInterest: number; totalAmount: number; days: number } | null>(null);

  // --- Deadline Logic ---
  const calculateDeadline = () => {
    if (!judgmentDate) return;
    const date = new Date(judgmentDate);
    let daysToAdd = 0;

    switch (procedureType) {
      case 'appeal_civil': daysToAdd = 40; break;
      case 'appeal_urgent': daysToAdd = 15; break;
      case 'cassation': daysToAdd = 60; break;
      case 'review': daysToAdd = 40; break;
      case 'misdemeanor_appeal': daysToAdd = 10; break;
      default: daysToAdd = 0;
    }

    const deadline = new Date(date);
    deadline.setDate(date.getDate() + daysToAdd);
    
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    setDeadlineResult({
      date: deadline.toISOString().split('T')[0],
      daysLeft
    });
  };

  // --- Fees Logic (Estimator) ---
  const calculateFees = () => {
    // Simplified Egyptian Court Fees Estimation
    // Note: This is a rough estimation as laws change and contain tiers
    if (claimAmount <= 0) return;

    let relativeFee = 0;
    
    // Simple Tiered Logic (Example)
    // First 4000 approx 2%, Above approx 5% (simplified)
    if (claimAmount <= 4000) {
        relativeFee = claimAmount * 0.02; // 2%
    } else {
        const firstTier = 4000 * 0.02;
        const remaining = claimAmount - 4000;
        relativeFee = firstTier + (remaining * 0.05); // 5%
    }

    // Min/Max caps can be applied here if strictly needed
    if (relativeFee < 10) relativeFee = 10; 

    // Services Fund (approx 50% of relative or fixed ratio)
    const servicesFund = relativeFee * 0.50; 

    setFeesResult({
      relative: Math.round(relativeFee),
      services: Math.round(servicesFund),
      total: Math.round(relativeFee + servicesFund)
    });
  };

  // --- Interest Logic ---
  const calculateInterest = () => {
    if (!interestStartDate || interestAmount <= 0) return;
    const start = new Date(interestStartDate);
    const end = new Date();
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = diffDays / 365;

    // Simple Interest: P * R * T
    const interest = interestAmount * (interestRate / 100) * years;

    setInterestResult({
      totalInterest: Math.round(interest * 100) / 100,
      totalAmount: Math.round((interestAmount + interest) * 100) / 100,
      days: diffDays
    });
  };

  // --- Renderers ---

  const renderDeadlineTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">تاريخ صدور الحكم</label>
          <input 
            type="date" 
            className="w-full border p-3 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            value={judgmentDate}
            onChange={(e) => setJudgmentDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">نوع الإجراء / الطعن</label>
          <select 
            className="w-full border p-3 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
            value={procedureType}
            onChange={(e) => setProcedureType(e.target.value)}
          >
            <option value="appeal_civil">استئناف (مدني/تجاري) - 40 يوم</option>
            <option value="appeal_urgent">استئناف (مستعجل) - 15 يوم</option>
            <option value="cassation">نقض (مدني/جنائي) - 60 يوم</option>
            <option value="review">التماس إعادة نظر - 40 يوم</option>
            <option value="misdemeanor_appeal">استئناف جنح - 10 أيام</option>
          </select>
        </div>
      </div>
      
      <button 
        onClick={calculateDeadline}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
      >
        <Calendar className="w-5 h-5" /> احسب الميعاد
      </button>

      {deadlineResult && (
        <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">آخر موعد لرفع الإجراء هو</p>
          <h3 className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">{deadlineResult.date}</h3>
          <p className={`text-sm font-bold ${deadlineResult.daysLeft > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {deadlineResult.daysLeft > 0 ? `متبقي ${deadlineResult.daysLeft} يوم` : `انتهى الميعاد منذ ${Math.abs(deadlineResult.daysLeft)} يوم`}
          </p>
          <p className="text-xs text-slate-400 mt-4">* تنبيه: يجب مراعاة مواعيد المسافة والعطلات الرسمية يدوياً.</p>
        </div>
      )}
    </div>
  );

  const renderFeesTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">قيمة الدعوى (المبلغ المطالب به)</label>
        <div className="relative">
           <input 
             type="number" 
             className="w-full border p-3 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pl-12"
             placeholder="0.00"
             value={claimAmount || ''}
             onChange={(e) => setClaimAmount(Number(e.target.value))}
           />
           <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-bold">ج.م</span>
        </div>
      </div>

      <button 
        onClick={calculateFees}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
      >
        <Calculator className="w-5 h-5" /> تقدير الرسوم
      </button>

      {feesResult && (
        <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
           <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="font-bold text-slate-700 dark:text-slate-300">إجمالي الرسوم التقديرية</span>
              <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">{feesResult.total.toLocaleString()} ج.م</span>
           </div>
           <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                 <span className="text-slate-500 dark:text-slate-400">الرسم النسبي (تقديري)</span>
                 <span className="font-medium text-slate-800 dark:text-white">{feesResult.relative.toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span className="text-slate-500 dark:text-slate-400">صندوق الخدمات</span>
                 <span className="font-medium text-slate-800 dark:text-white">{feesResult.services.toLocaleString()} ج.م</span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-amber-600 dark:text-amber-500 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/10 p-2 rounded">
                 <Info className="w-4 h-4 shrink-0 mt-0.5" />
                 <p>هذا الحساب استرشادي فقط بناءً على النسب التقريبية ولا يشمل الدمغات والمصاريف الإدارية المتغيرة.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  const renderInterestTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">المبلغ الأصلي</label>
            <div className="relative">
               <input 
                 type="number" 
                 className="w-full border p-3 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pl-12"
                 value={interestAmount || ''}
                 onChange={(e) => setInterestAmount(Number(e.target.value))}
               />
               <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-bold">ج.م</span>
            </div>
         </div>
         <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">تاريخ المطالبة القضائية</label>
            <input 
              type="date" 
              className="w-full border p-3 rounded-xl bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={interestStartDate}
              onChange={(e) => setInterestStartDate(e.target.value)}
            />
         </div>
      </div>

      <div>
         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">نوع الفائدة</label>
         <div className="flex gap-4">
            <label className="flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
               <input type="radio" name="rate" checked={interestRate === 4} onChange={() => setInterestRate(4)} className="w-4 h-4 text-primary-600" />
               <span className="text-slate-700 dark:text-slate-300 font-bold">4% (مدني)</span>
            </label>
            <label className="flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
               <input type="radio" name="rate" checked={interestRate === 5} onChange={() => setInterestRate(5)} className="w-4 h-4 text-primary-600" />
               <span className="text-slate-700 dark:text-slate-300 font-bold">5% (تجاري)</span>
            </label>
         </div>
      </div>

      <button 
        onClick={calculateInterest}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
      >
        <Percent className="w-5 h-5" /> احسب الفوائد
      </button>

      {interestResult && (
         <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center">
               <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-1 font-bold">إجمالي الفوائد</p>
               <p className="text-xl font-bold text-indigo-900 dark:text-indigo-200">{interestResult.totalInterest.toLocaleString()} ج.م</p>
               <p className="text-[10px] text-indigo-400 mt-1">عن مدة {interestResult.days} يوم</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
               <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-bold">إجمالي المبلغ المستحق</p>
               <p className="text-xl font-bold text-slate-800 dark:text-white">{interestResult.totalAmount.toLocaleString()} ج.م</p>
               <p className="text-[10px] text-slate-400 mt-1">أصل الدين + الفوائد</p>
            </div>
         </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
       {/* Header */}
       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
             <Calculator className="w-6 h-6 text-primary-600" />
             الحاسبات القانونية
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
             أدوات مساعدة لحساب المواعيد، الرسوم، والفوائد بدقة وسرعة.
          </p>
       </div>

       {/* Tabs */}
       <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('deadline')}
            className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'deadline' ? 'bg-slate-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
             <Calendar className="w-4 h-4" /> حاسبة المواعيد
          </button>
          <button 
            onClick={() => setActiveTab('fees')}
            className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'fees' ? 'bg-slate-100 dark:bg-slate-700 text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
             <DollarSign className="w-4 h-4" /> حاسبة الرسوم
          </button>
          <button 
            onClick={() => setActiveTab('interest')}
            className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'interest' ? 'bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
          >
             <Percent className="w-4 h-4" /> حاسبة الفوائد
          </button>
       </div>

       {/* Content Area */}
       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
          {activeTab === 'deadline' && renderDeadlineTab()}
          {activeTab === 'fees' && renderFeesTab()}
          {activeTab === 'interest' && renderInterestTab()}
       </div>
    </div>
  );
};

export default Calculators;
