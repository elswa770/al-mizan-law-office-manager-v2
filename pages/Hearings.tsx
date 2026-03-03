
import React, { useState, useMemo, useRef } from 'react';
import { Case, Hearing, CaseStatus, HearingStatus, Lawyer } from '../types';
import { Calendar, MapPin, Gavel, AlertCircle, X, Edit3, Link as LinkIcon, ExternalLink, ChevronLeft, ChevronRight, List, LayoutGrid, Clock, Filter, Printer, Download, Plus, CheckSquare, AlignJustify, DollarSign, CalendarDays, ArrowLeftCircle, CheckCircle, FileText, Upload, Image as ImageIcon, Eye, Trash2 } from 'lucide-react';

interface HearingsProps {
  hearings: Hearing[];
  cases: Case[];
  lawyers: Lawyer[];
  onCaseClick?: (caseId: string) => void;
  onUpdateHearing?: (hearing: Hearing) => void;
  onAddHearing?: (hearing: Hearing) => void;
  onDeleteHearing?: (hearingId: string) => void;
  readOnly?: boolean;
}

const Hearings: React.FC<HearingsProps> = ({ hearings, cases, lawyers, onCaseClick, onUpdateHearing, onAddHearing, onDeleteHearing, readOnly = false }) => {
  // --- View State ---
  const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'calendar'>('timeline');
  const [filterType, setFilterType] = useState<'upcoming' | 'past' | 'today'>('upcoming');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  
  // Delete Hearing Handler
  const handleDeleteHearing = (hearingId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الجلسة؟')) {
      onDeleteHearing && onDeleteHearing(hearingId);
    }
  };

  // --- Modal State (Wizard) ---
  const [editingHearing, setEditingHearing] = useState<Hearing | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1); // 1: Decision, 2: Requirements/Next Session, 3: Expenses

  // File Upload Refs
  const rulingFileRef = useRef<HTMLInputElement>(null);

  // --- Form Data for Wizard ---
  const [decisionData, setDecisionData] = useState({
    decision: '',
    status: HearingStatus.COMPLETED as HearingStatus,
    rulingUrl: '',
    rulingFileName: '', // For display only
    completed: false
  });
  const [nextSessionData, setNextSessionData] = useState({
    createNext: false,
    date: '',
    requirements: '',
    clientRequirements: ''
  });
  const [expensesData, setExpensesData] = useState({
    amount: 0,
    description: '',
    paidBy: 'lawyer' as 'lawyer' | 'client'
  });

  // --- New Hearing Form ---
  const [newHearingData, setNewHearingData] = useState({
    caseId: '',
    date: '',
    time: '',
    requirements: '',
    type: 'session',
    status: 'محددة' as HearingStatus,
    decision: '',
    rulingUrl: '',
    assignedLawyerId: '',
    assignedLawyerName: '',
    expenses: { amount: 0, paidBy: 'lawyer' as 'lawyer' | 'client', description: '' }
  });

  // --- Helpers ---
  const getCaseDetails = (caseId: string) => cases.find(c => c.id === caseId);
  
  const getLawyerName = (id?: string) => {
    if (!id) return 'غير معين';
    const lawyer = lawyers.find(l => l.id === id);
    return lawyer ? lawyer.name : id;
  };
  
  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  // --- Dashboard Stats Calculation ---
  const stats = useMemo(() => {
    const upcoming = hearings.filter(h => parseLocalDate(h.date) >= today).length;
    const todayCount = hearings.filter(h => parseLocalDate(h.date).getTime() === today.getTime()).length;
    const delayed = hearings.filter(h => parseLocalDate(h.date) < today && (!h.decision || h.status === HearingStatus.SCHEDULED)).length;
    
    // Nearest Hearing logic
    const futureHearings = hearings
      .filter(h => parseLocalDate(h.date) >= today)
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
    
    const nearest = futureHearings.length > 0 ? futureHearings[0] : null;
    let nearestCase = nearest ? getCaseDetails(nearest.caseId) : null;
    
    // Countdown
    let timeString = '';
    if (nearest) {
       const diff = parseLocalDate(nearest.date).getTime() - today.getTime();
       const days = Math.floor(diff / (1000 * 60 * 60 * 24));
       timeString = days === 0 ? 'اليوم' : `باقي ${days} يوم`;
    }

    return { upcoming, todayCount, delayed, nearest, nearestCase, timeString };
  }, [hearings, cases]);

  // --- Filtering Logic ---
  const filteredHearings = useMemo(() => {
    return hearings.filter(hearing => {
      const hDate = parseLocalDate(hearing.date);
      if (filterType === 'today') return hDate.getTime() === today.getTime();
      if (filterType === 'upcoming') return hDate >= today;
      return hDate < today;
    }).sort((a, b) => {
      const dateA = parseLocalDate(a.date).getTime();
      const dateB = parseLocalDate(b.date).getTime();
      return filterType === 'past' ? dateB - dateA : dateA - dateB;
    });
  }, [hearings, filterType]);

  // --- Handlers ---

  const openWizard = (hearing: Hearing) => {
    setEditingHearing(hearing);
    setWizardStep(1);
    // Populate form
    setDecisionData({
      decision: hearing.decision || '',
      status: hearing.status || HearingStatus.COMPLETED,
      rulingUrl: hearing.rulingUrl || '',
      rulingFileName: hearing.rulingUrl ? 'تم إرفاق ملف سابقاً' : '',
      completed: hearing.isCompleted || false
    });
    setExpensesData({
      amount: hearing.expenses?.amount || 0,
      description: hearing.expenses?.description || '',
      paidBy: hearing.expenses?.paidBy || 'lawyer'
    });
    setNextSessionData({
      createNext: false,
      date: '',
      requirements: '',
      clientRequirements: ''
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setDecisionData(prev => ({
        ...prev,
        rulingUrl: url,
        rulingFileName: file.name
      }));
    }
  };

  const handleWizardComplete = () => {
    if (editingHearing && onUpdateHearing) {
      // Check if expenses are being added and if they were already recorded
      const isAddingExpenses = expensesData.amount > 0 && 
        (!editingHearing.expenses || 
         editingHearing.expenses.amount !== expensesData.amount ||
         editingHearing.expenses.description !== expensesData.description);
      
      // 1. Update Current Hearing
      onUpdateHearing({
        ...editingHearing,
        decision: decisionData.decision,
        status: decisionData.status,
        rulingUrl: decisionData.rulingUrl,
        isCompleted: decisionData.completed,
        expenses: expensesData.amount > 0 ? {
           amount: expensesData.amount,
           description: expensesData.description,
           paidBy: expensesData.paidBy
        } : undefined
      });

      // 2. Create Next Hearing (if selected)
      if (nextSessionData.createNext && nextSessionData.date && onAddHearing) {
         onAddHearing({
            id: Math.random().toString(36).substring(2, 9),
            caseId: editingHearing.caseId,
            date: nextSessionData.date,
            time: '09:00', // Default
            type: 'session',
            status: HearingStatus.SCHEDULED,
            requirements: nextSessionData.requirements,
            clientRequirements: nextSessionData.clientRequirements
         });
      }

      setEditingHearing(null);
    }
  };

  const handleSaveNewHearing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddHearing || !newHearingData.caseId || !newHearingData.date) return;

    onAddHearing({
      id: Math.random().toString(36).substring(2, 9),
      caseId: newHearingData.caseId,
      date: newHearingData.date,
      time: newHearingData.time,
      requirements: newHearingData.requirements,
      type: newHearingData.type as any,
      status: HearingStatus.SCHEDULED,
      decision: '',
      rulingUrl: '',
      assignedLawyerId: newHearingData.assignedLawyerId,
      assignedLawyerName: newHearingData.assignedLawyerName,
      expenses: { amount: 0, paidBy: 'lawyer' as 'lawyer' | 'client', description: '' }
    });

    setIsAddModalOpen(false);
    setNewHearingData({ 
  caseId: '', 
  date: '', 
  time: '', 
  requirements: '', 
  type: 'session',
  status: 'محددة' as HearingStatus,
  decision: '',
  rulingUrl: '',
  assignedLawyerId: '',
  assignedLawyerName: '',
  expenses: { amount: 0, paidBy: 'lawyer' as 'lawyer' | 'client', description: '' }
});
  };

  const handleExportPDF = () => {
    window.print();
  };

  // --- Renderers ---

  const getStatusBadge = (status?: HearingStatus) => {
    switch (status) {
      case HearingStatus.SCHEDULED: return <span className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 dark:border-blue-800">محددة</span>;
      case HearingStatus.COMPLETED: return <span className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100 dark:border-green-800">تمت</span>;
      case HearingStatus.POSTPONED: return <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-100 dark:border-amber-800">مؤجلة</span>;
      case HearingStatus.CANCELLED: return <span className="bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100 dark:border-red-800">ملغاة</span>;
      case HearingStatus.RESERVED_FOR_JUDGMENT: return <span className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-100 dark:border-purple-800">حجز للحكم</span>;
      default: return <span className="bg-slate-50 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">غير محدد</span>;
    }
  };

  const renderTimeline = () => (
    <div className="space-y-6">
      {filteredHearings.map((hearing, idx) => {
        const caseInfo = getCaseDetails(hearing.caseId);
        if (!caseInfo) return null;
        const hDate = parseLocalDate(hearing.date);
        const isToday = hDate.getTime() === today.getTime();
        const isPast = hDate < today;

        return (
          <div key={hearing.id} className="flex gap-4 group">
             {/* Date Column */}
             <div className="flex flex-col items-center min-w-[60px] pt-2">
                <span className="text-xs font-bold text-slate-400">{hDate.toLocaleDateString('ar-EG', { month: 'short' })}</span>
                <span className={`text-2xl font-bold ${isToday ? 'text-primary-600' : isPast ? 'text-slate-600 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                   {hDate.getDate()}
                </span>
                <span className="text-[10px] text-slate-400">{hDate.toLocaleDateString('ar-EG', { weekday: 'short' })}</span>
                
                {idx < filteredHearings.length - 1 && (
                   <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-2"></div>
                )}
             </div>

             {/* Card */}
             <div className={`flex-1 relative bg-white dark:bg-slate-800 rounded-xl shadow-sm border transition-all hover:shadow-md ${
                isToday ? 'border-primary-300 ring-1 ring-primary-100 dark:border-primary-700 dark:ring-primary-900' : 
                isPast ? 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50' : 'border-slate-200 dark:border-slate-700'
             }`}>
                {/* Status Stripe */}
                <div className={`absolute right-0 top-4 bottom-4 w-1 rounded-l-full ${
                   hearing.status === HearingStatus.COMPLETED ? 'bg-green-500' :
                   hearing.status === HearingStatus.POSTPONED ? 'bg-amber-500' :
                   hearing.status === HearingStatus.CANCELLED ? 'bg-red-500' :
                   'bg-primary-500'
                }`}></div>

                <div className="p-4 pr-5">
                   {/* Header */}
                   <div className="flex justify-between items-start mb-3">
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(hearing.status)}
                            {hearing.time && (
                               <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {hearing.time}
                               </span>
                            )}
                         </div>
                         <h4 
                           className="font-bold text-slate-900 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 hover:underline transition-colors text-base"
                           onClick={() => onCaseClick && onCaseClick(hearing.caseId)}
                         >
                            {caseInfo.title}
                         </h4>
                         <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 rounded">{caseInfo.caseNumber}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                               <MapPin className="w-3 h-3" /> {caseInfo.court}
                            </span>
                         </div>
                      </div>
                      
                      <div className="flex gap-2">
                         {hearing.rulingUrl && (
                            <a href={hearing.rulingUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="عرض الملف المرفق">
                               <FileText className="w-4 h-4" />
                            </a>
                         )}
                         {!readOnly && (
                           <button 
                             onClick={() => openWizard(hearing)}
                             className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                             title="إدارة الجلسة / القرار"
                           >
                              <Edit3 className="w-4 h-4" />
                           </button>
                         )}
                         {!readOnly && (
                           <button 
                             onClick={() => handleDeleteHearing(hearing.id)}
                             className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                             title="حذف الجلسة"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                   </div>

                   {/* Decision / Requirements */}
                   <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                      {hearing.decision ? (
                         <div className="flex items-start gap-2 text-sm text-slate-800 dark:text-white bg-green-50/50 dark:bg-green-900/20 p-2 rounded-lg border border-green-100/50 dark:border-green-800">
                            <Gavel className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <p className="leading-relaxed font-medium">{hearing.decision}</p>
                         </div>
                      ) : hearing.requirements ? (
                         <div className="flex items-start gap-2 text-sm text-slate-800 dark:text-white bg-amber-50/50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100/50 dark:border-amber-800">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <p className="leading-relaxed font-medium">{hearing.requirements}</p>
                         </div>
                      ) : (
                         <p className="text-xs text-slate-400 italic pr-2">لم يتم تسجيل قرار أو متطلبات</p>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )
      })}
      {filteredHearings.length === 0 && (
         <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>لا توجد جلسات للعرض في هذا التصنيف</p>
         </div>
      )}
    </div>
  );

  const renderTable = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
       <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600">
             <tr>
                <th className="p-4">التاريخ</th>
                <th className="p-4">القضية</th>
                <th className="p-4">المحكمة</th>
                <th className="p-4">المطلوب / القرار</th>
                <th className="p-4">الحالة</th>
                {!readOnly && <th className="p-4">الإجراءات</th>}
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
             {filteredHearings.map(hearing => {
                const c = getCaseDetails(hearing.caseId);
                if(!c) return null;
                return (
                   <tr key={hearing.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-slate-200">
                      <td className="p-4 whitespace-nowrap">
                         <div className="font-bold">{hearing.date}</div>
                         {hearing.time && <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{hearing.time}</div>}
                      </td>
                      <td className="p-4">
                         <div className="font-bold cursor-pointer hover:text-primary-600 dark:hover:text-primary-400" onClick={() => onCaseClick && onCaseClick(c.id)}>{c.title}</div>
                         <div className="text-xs text-slate-500 dark:text-slate-400">{c.clientName}</div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">{c.courtBranch || c.court}</td>
                      <td className="p-4 max-w-xs truncate">
                         {hearing.decision ? (
                            <span className="font-medium flex items-center gap-1 text-slate-900 dark:text-white"><Gavel className="w-3 h-3 text-green-600"/> {hearing.decision}</span>
                         ) : (
                            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {hearing.requirements || '-'}</span>
                         )}
                      </td>
                      <td className="p-4">{getStatusBadge(hearing.status)}</td>
                      {!readOnly && (
                        <td className="p-4">
                           <button onClick={() => openWizard(hearing)} className="text-primary-600 dark:text-primary-400 hover:underline font-bold text-xs">إدارة</button>
                        </td>
                      )}
                   </tr>
                )
             })}
          </tbody>
       </table>
    </div>
  );

  const renderCalendar = () => {
    // Simplified Calendar Logic
    const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const daysCount = getDaysInMonth(currentCalendarDate);
    const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay(); // Sun=0
    // Adjust for Sat start: Sun(0)->1, Sat(6)->0
    const startOffset = (firstDay + 1) % 7; 
    
    const days = [];
    for(let i=0; i<startOffset; i++) days.push(<div key={`empty-${i}`} className="min-h-[100px] bg-slate-50/50 dark:bg-slate-800/50 border-r border-b border-slate-100 dark:border-slate-700"></div>);
    
    for(let d=1; d<=daysCount; d++) {
       const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
       const dayHearings = hearings.filter(h => h.date === dateStr);
       const isToday = new Date().toDateString() === new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), d).toDateString();
       
       days.push(
          <div key={d} className={`min-h-[100px] bg-white dark:bg-slate-800 border-r border-b border-slate-200 dark:border-slate-700 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
             <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>{d}</span>
             </div>
             <div className="space-y-1">
                {dayHearings.map(h => (
                   <div key={h.id} className="text-[10px] p-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 truncate cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors" onClick={() => !readOnly && openWizard(h)}>
                      {h.time} - {getCaseDetails(h.caseId)?.title}
                   </div>
                ))}
             </div>
          </div>
       );
    }

    return (
       <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
             <div className="flex gap-2">
                <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth()-1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300"><ChevronRight className="w-5 h-5"/></button>
                <span className="font-bold text-slate-800 dark:text-white">{currentCalendarDate.toLocaleDateString('ar-EG', {month: 'long', year: 'numeric'})}</span>
                <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth()+1))} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300"><ChevronLeft className="w-5 h-5"/></button>
             </div>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 py-2">
             {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 border-t border-slate-200 dark:border-slate-700">
             {days}
          </div>
       </div>
    )
  };

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Sticky Dashboard Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-md -mx-6 px-6 py-4 mb-6 transition-colors">
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            
            {/* Quick Stats */}
            <div className="flex items-center gap-6 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-700">
               <div className="pl-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <Gavel className="w-6 h-6 text-primary-600" />
                     إدارة الجلسات
                  </h2>
               </div>
               
               {stats.nearest && stats.nearestCase ? (
                  <div className="px-6 hidden md:block">
                     <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">أقرب جلسة ({stats.timeString})</p>
                     <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{stats.nearestCase.title}</span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{stats.nearest.date}</span>
                     </div>
                  </div>
               ) : (
                  <div className="px-6 hidden md:block text-slate-400 text-xs">لا توجد جلسات قادمة</div>
               )}

               <div className="px-6 flex gap-4 text-center">
                  <div>
                     <span className="block text-lg font-bold text-green-600 dark:text-green-500">{stats.upcoming}</span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-400">قادمة</span>
                  </div>
                  <div>
                     <span className="block text-lg font-bold text-red-500 dark:text-red-400">{stats.delayed}</span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-400">متأخرة</span>
                  </div>
                  <div>
                     <span className="block text-lg font-bold text-indigo-600 dark:text-indigo-500">{stats.todayCount}</span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-400">اليوم</span>
                  </div>
               </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
               <button onClick={handleExportPDF} className="flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm hidden sm:flex" title="طباعة">
                  <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>طباعة</span>
               </button>
               {!readOnly && (
                 <>
                   <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                   <button onClick={() => setIsAddModalOpen(true)} className="flex-1 lg:flex-none bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors shadow-sm flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> إضافة جلسة
                   </button>
                 </>
               )}
            </div>
         </div>

         {/* Filters & View Switcher */}
         <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg flex items-center w-full sm:w-auto">
               <button onClick={() => setFilterType('upcoming')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === 'upcoming' ? 'bg-white dark:bg-slate-600 shadow text-primary-700 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>القادمة</button>
               <button onClick={() => setFilterType('today')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === 'today' ? 'bg-white dark:bg-slate-600 shadow text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>اليوم</button>
               <button onClick={() => setFilterType('past')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterType === 'past' ? 'bg-white dark:bg-slate-600 shadow text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>السجل السابق</button>
            </div>

            <div className="flex bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden shadow-sm">
               <button onClick={() => setViewMode('timeline')} className={`p-2 ${viewMode === 'timeline' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><AlignJustify className="w-4 h-4" /></button>
               <div className="w-px bg-slate-300 dark:bg-slate-600"></div>
               <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><List className="w-4 h-4" /></button>
               <div className="w-px bg-slate-300 dark:bg-slate-600"></div>
               <button onClick={() => setViewMode('calendar')} className={`p-2 ${viewMode === 'calendar' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}><CalendarDays className="w-4 h-4" /></button>
            </div>
         </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="min-h-[400px]">
         {viewMode === 'timeline' && renderTimeline()}
         {viewMode === 'table' && renderTable()}
         {viewMode === 'calendar' && renderCalendar()}
      </div>

      {/* 3. Wizard Modal (Edit / Post-Session) */}
      {editingHearing && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
               {/* Modal Header */}
               <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                  <div>
                     <h3 className="font-bold text-slate-900 dark:text-white text-lg">إدارة الجلسة</h3>
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {getCaseDetails(editingHearing.caseId)?.title} - {editingHearing.date}
                     </p>
                  </div>
                  <button onClick={() => setEditingHearing(null)} className="text-slate-400 hover:text-red-500"><X className="w-6 h-6" /></button>
               </div>

               {/* Wizard Steps Indicator */}
               <div className="flex items-center justify-between px-8 py-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                  {[
                     { id: 1, label: 'القرار والحالة', icon: Gavel },
                     { id: 2, label: 'ما بعد الجلسة', icon: Calendar },
                     { id: 3, label: 'المصروفات', icon: DollarSign },
                  ].map((step) => (
                     <div key={step.id} className={`flex flex-col items-center gap-2 cursor-pointer ${wizardStep === step.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} onClick={() => setWizardStep(step.id as any)}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${wizardStep === step.id ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'}`}>
                           <step.icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold">{step.label}</span>
                     </div>
                  ))}
               </div>

               <div className="p-6 min-h-[300px]">
                  {/* Step 1: Decision */}
                  {wizardStep === 1 && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">قرار الجلسة</label>
                           <textarea 
                              rows={4} 
                              className="w-full border dark:border-slate-600 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                              placeholder="ماذا حدث في الجلسة؟ مثال: تم التأجيل للإعلان..."
                              value={decisionData.decision}
                              onChange={e => setDecisionData({...decisionData, decision: e.target.value})}
                              readOnly={readOnly}
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">حالة الجلسة الحالية</label>
                              <select 
                                 className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                 value={decisionData.status}
                                 onChange={e => setDecisionData({...decisionData, status: e.target.value as HearingStatus})}
                                 disabled={readOnly}
                              >
                                 {Object.values(HearingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                           </div>
                           <div className="flex items-center pt-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={decisionData.completed} 
                                    onChange={e => setDecisionData({...decisionData, completed: e.target.checked})}
                                    className="w-5 h-5 text-primary-600 rounded" 
                                    disabled={readOnly}
                                 />
                                 <span className="text-sm font-medium text-slate-700 dark:text-slate-300">تم تنفيذ جميع المتطلبات</span>
                              </label>
                           </div>
                        </div>
                        
                        {/* File Upload for Ruling */}
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">صورة المحضر / الحكم (ملف)</label>
                           <input 
                              type="file" 
                              ref={rulingFileRef}
                              className="hidden" 
                              onChange={handleFileSelect}
                              disabled={readOnly}
                           />
                           <div 
                              onClick={() => !readOnly && rulingFileRef.current?.click()}
                              className={`border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-primary-400 transition-colors flex flex-col items-center gap-2 ${readOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                           >
                              {decisionData.rulingUrl ? (
                                 <div className="flex items-center gap-3 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-4 py-2 rounded-lg">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="font-bold text-sm">تم إرفاق الملف: {decisionData.rulingFileName || 'ملف الحكم'}</span>
                                    {!readOnly && (
                                      <button 
                                         onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setDecisionData({...decisionData, rulingUrl: '', rulingFileName: ''}); 
                                         }}
                                         className="text-red-500 hover:bg-red-100 rounded-full p-1 ml-2"
                                      >
                                         <X className="w-4 h-4" />
                                      </button>
                                    )}
                                 </div>
                              ) : (
                                 <>
                                    <Upload className="w-8 h-8 text-slate-400" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">اضغط لرفع ملف (صورة أو PDF)</p>
                                 </>
                              )}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Step 2: Next Session */}
                  {wizardStep === 2 && (
                     <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
                           <div className="flex items-center gap-2 text-sm">
                              <span className="text-slate-500 dark:text-slate-400">المحامي المسؤول</span>
                              <span className="font-medium text-slate-800 dark:text-white">{getLawyerName(editingHearing.assignedLawyerId)}</span>
                           </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={nextSessionData.createNext} onChange={e => setNextSessionData({...nextSessionData, createNext: e.target.checked})} disabled={readOnly} />
                              <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                           </label>
                        </div>

                        {nextSessionData.createNext && (
                           <div className="space-y-4 border-r-2 border-blue-200 dark:border-blue-800 pr-4 mr-2">
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الجلسة القادمة</label>
                                 <input 
                                    type="date" 
                                    className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                    value={nextSessionData.date}
                                    onChange={e => setNextSessionData({...nextSessionData, date: e.target.value})}
                                    disabled={readOnly}
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المطلوب من المحامي (للجلسة القادمة)</label>
                                 <input 
                                    type="text" 
                                    className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                                    placeholder="مثال: تقديم المذكرات"
                                    value={nextSessionData.requirements}
                                    onChange={e => setNextSessionData({...nextSessionData, requirements: e.target.value})}
                                    disabled={readOnly}
                                 />
                              </div>
                              <div>
                                 <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المطلوب من الموكل</label>
                                 <input 
                                    type="text" 
                                    className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                                    placeholder="مثال: سداد باقي الأتعاب"
                                    value={nextSessionData.clientRequirements}
                                    onChange={e => setNextSessionData({...nextSessionData, clientRequirements: e.target.value})}
                                    disabled={readOnly}
                                 />
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {/* Step 3: Expenses */}
                  {wizardStep === 3 && (
                     <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 mb-4">
                           <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                           <p className="text-sm text-slate-500 dark:text-slate-400">تسجيل أي مصاريف إدارية تم دفعها في هذه الجلسة</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ (ج.م)</label>
                              <input 
                                 type="number" 
                                 className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                 value={expensesData.amount}
                                 onChange={e => setExpensesData({...expensesData, amount: Number(e.target.value)})}
                                 disabled={readOnly}
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">من قام بالدفع؟</label>
                              <select 
                                 className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                 value={expensesData.paidBy}
                                 onChange={e => setExpensesData({...expensesData, paidBy: e.target.value as any})}
                                 disabled={readOnly}
                              >
                                 <option value="lawyer">المكتب (على حساب الموكل)</option>
                                 <option value="client">الموكل بنفسه</option>
                              </select>
                           </div>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">بيان المصروفات</label>
                           <input 
                              type="text" 
                              className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                              placeholder="مثال: رسوم استخراج شهادة، إكراميات..."
                              value={expensesData.description}
                              onChange={e => setExpensesData({...expensesData, description: e.target.value})}
                              disabled={readOnly}
                           />
                        </div>
                     </div>
                  )}
               </div>

               {/* Footer Actions */}
               <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                  <button 
                     onClick={() => setWizardStep(prev => Math.max(1, prev - 1) as any)}
                     disabled={wizardStep === 1}
                     className="px-4 py-2 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm rounded-lg disabled:opacity-50 transition-all font-medium"
                  >
                     السابق
                  </button>
                  
                  {wizardStep < 3 ? (
                     <button 
                        onClick={() => setWizardStep(prev => Math.min(3, prev + 1) as any)}
                        className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors font-bold flex items-center gap-2"
                     >
                        التالي <ArrowLeftCircle className="w-4 h-4" />
                     </button>
                  ) : (
                     !readOnly && (
                       <button 
                          onClick={handleWizardComplete}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold flex items-center gap-2 shadow-lg shadow-green-200 dark:shadow-none"
                       >
                          <CheckCircle className="w-4 h-4" /> حفظ وإغلاق
                       </button>
                     )
                  )}
               </div>
            </div>
         </div>
      )}

      {/* Add Modal (Simple) */}
      {isAddModalOpen && !readOnly && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">إضافة جلسة جديدة</h3>
                  <button onClick={() => setIsAddModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
               </div>
               <form onSubmit={handleSaveNewHearing} className="p-4 space-y-4">
                  <div>
                     <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">القضية</label>
                     <select required className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newHearingData.caseId} onChange={e => setNewHearingData({...newHearingData, caseId: e.target.value})}>
                        <option value="">اختر القضية...</option>
                        {cases.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                     </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">التاريخ</label>
                        <input type="date" required className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newHearingData.date} onChange={e => setNewHearingData({...newHearingData, date: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الوقت</label>
                        <input type="time" className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newHearingData.time} onChange={e => setNewHearingData({...newHearingData, time: e.target.value})} />
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المحامي المسؤول</label>
                     <select 
                        className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white" 
                        value={newHearingData.assignedLawyerId || ''} 
                        onChange={e => {
                          const selectedLawyer = lawyers.find(l => l.id === e.target.value);
                          setNewHearingData({
                            ...newHearingData, 
                            assignedLawyerId: e.target.value,
                            assignedLawyerName: selectedLawyer ? selectedLawyer.name : ''
                          });
                        }}
                     >
                        <option value="">اختر المحامي المسؤول...</option>
                        {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المطلوب للجلسة</label>
                     <textarea placeholder="المطلوب للجلسة..." className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white" rows={2} value={newHearingData.requirements} onChange={e => setNewHearingData({...newHearingData, requirements: e.target.value})}></textarea>
                  </div>
                  <button type="submit" className="w-full bg-primary-600 text-white p-2 rounded font-bold hover:bg-primary-700">حفظ الجلسة</button>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Hearings;
