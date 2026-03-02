
import React, { useState, useRef, useEffect } from 'react';
import { Case, Client, Hearing, CaseStatus, CaseDocument, FinancialTransaction, PaymentMethod, Lawyer } from '../types';
import { ArrowRight, Edit3, Calendar, FileText, Briefcase, MapPin, User, Shield, Save, X, Activity, DollarSign, Clock, CheckCircle, AlertCircle, Phone, Gavel, MoreVertical, Plus, Upload, FileCheck, Eye, Trash2, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Calculator, Edit, Users, Cloud, Download } from 'lucide-react';
import { googleDriveService } from '../services/googleDriveService';

interface CaseDetailsProps {
  caseId: string;
  cases: Case[];
  clients: Client[];
  lawyers: Lawyer[];
  hearings: Hearing[];
  onBack: () => void;
  onAddHearing?: (hearing: Hearing) => void;
  onUpdateCase?: (updatedCase: Case) => void;
  onUpdateHearing?: (hearing: Hearing) => void;
  onDeleteHearing?: (hearingId: string) => void;
  onClientClick?: (clientId: string) => void;
  readOnly?: boolean;
}

const CaseDetails: React.FC<CaseDetailsProps> = ({ caseId, cases, clients, lawyers, hearings, onBack, onAddHearing, onUpdateCase, onUpdateHearing, onDeleteHearing, onClientClick, readOnly = false }) => {
  const currentCase = cases.find(c => c.id === caseId);
  const [activeTab, setActiveTab] = useState<'overview' | 'hearings' | 'documents' | 'finance'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isHearingModalOpen, setIsHearingModalOpen] = useState(false);
  const [editCaseData, setEditCaseData] = useState<Partial<Case>>({});
  // Opponent Edit State (Simulate primary opponent editing)
  const [editOpponentName, setEditOpponentName] = useState('');
  const [editOpponentLawyer, setEditOpponentLawyer] = useState('');
  
  // Strategy Edit State
  const [editStrengthPoints, setEditStrengthPoints] = useState('');
  const [editWeaknessPoints, setEditWeaknessPoints] = useState('');
  const [editActionPlan, setEditActionPlan] = useState('');

  // Documents State
  const [newDocData, setNewDocData] = useState<{name: string, type: string, category: string, file: File | null, uploadToDrive: boolean}>({ name: '', type: 'pdf', category: 'other', file: null, uploadToDrive: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  // New Hearing State
  const [newHearingData, setNewHearingData] = useState({
    date: '',
    time: '',
    requirements: '',
    type: 'session',
    status: 'محددة' as any,
    decision: '',
    rulingUrl: '',
    expenses: { amount: 0, paidBy: 'lawyer' as 'lawyer' | 'client', description: '' }
  });

  // Finance State
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [transData, setTransData] = useState({ amount: 0, type: 'payment' as 'payment' | 'expense', description: '' });
  
  // Fees Edit State
  const [isFeesModalOpen, setIsFeesModalOpen] = useState(false);
  const [newFeeValue, setNewFeeValue] = useState<number>(0);

  // Initialize Google Drive service
  useEffect(() => {
    const initGoogleDrive = async () => {
      try {
        await googleDriveService.initialize();
      } catch (error) {
        console.log('Google Drive service initialization failed:', error);
      }
    };
    
    initGoogleDrive();
  }, []);

  if (!currentCase) return <div className="p-8 text-center text-slate-500">القضية غير موجودة</div>;
  
  const handleSaveNewHearing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddHearing || !newHearingData.date) return;

    onAddHearing({
      id: Math.random().toString(36).substring(2, 9),
      caseId: caseId,
      date: newHearingData.date,
      time: newHearingData.time,
      requirements: newHearingData.requirements,
      type: newHearingData.type as any,
      status: newHearingData.status,
      decision: newHearingData.decision,
      rulingUrl: newHearingData.rulingUrl,
      expenses: newHearingData.expenses
    });

    setIsHearingModalOpen(false);
    setNewHearingData({ 
      date: '', 
      time: '', 
      requirements: '', 
      type: 'session',
      status: 'محددة' as any,
      decision: '',
      rulingUrl: '',
      expenses: { amount: 0, paidBy: 'lawyer' as 'lawyer' | 'client', description: '' }
    });
  };
  const caseHearings = hearings.filter(h => h.caseId === caseId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const nextHearing = caseHearings.find(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0))) || caseHearings[0];
  const client = clients.find(c => c.id === currentCase.clientId);

  // Financials Calculations
  const totalAgreed = currentCase.finance?.agreedFees || 0;
  const totalPaid = currentCase.finance?.paidAmount || 0;
  const totalExpenses = currentCase.finance?.expenses || 0;
  const remainingDues = totalAgreed - totalPaid;
  const netIncome = totalPaid - totalExpenses;
  const paymentProgress = totalAgreed > 0 ? (totalPaid / totalAgreed) * 100 : 0;

  // --- Handlers ---

  const handleEditOpen = () => {
    setEditCaseData({ ...currentCase });
    // Load existing opponent data if any
    const primaryOpponent = currentCase.opponents && currentCase.opponents.length > 0 ? currentCase.opponents[0] : null;
    setEditOpponentName(primaryOpponent?.name || '');
    setEditOpponentLawyer(primaryOpponent?.lawyer || '');
    
    // Load existing strategy data if any
    setEditStrengthPoints(currentCase.strategy?.strengthPoints || '');
    setEditWeaknessPoints(currentCase.strategy?.weaknessPoints || '');
    setEditActionPlan(currentCase.strategy?.plan || '');
    
    setIsEditModalOpen(true);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateCase && editCaseData.title) {
       // Update opponents list
       const updatedOpponents = editOpponentName 
         ? [{ name: editOpponentName, role: 'خصم', lawyer: editOpponentLawyer }] 
         : [];

       // Update strategy
       const updatedStrategy = {
         strengthPoints: editStrengthPoints,
         weaknessPoints: editWeaknessPoints,
         plan: editActionPlan
       };

       // Check if status is being changed to CLOSED and add closedAt
       const isClosingCase = editCaseData.status === CaseStatus.CLOSED && currentCase.status !== CaseStatus.CLOSED;
       const isReopeningCase = editCaseData.status === CaseStatus.OPEN && currentCase.status === CaseStatus.CLOSED;
       
       const updatedCaseData = {
         ...editCaseData,
         ...(isClosingCase && {
           closedAt: new Date().toISOString()
         }),
         ...(isReopeningCase && {
           closedAt: undefined
         })
       };

       onUpdateCase({ 
         ...currentCase, 
         ...updatedCaseData, 
         opponents: updatedOpponents,
         strategy: updatedStrategy
       } as Case);
       setIsEditModalOpen(false);
    }
  };

  // Document Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       let type = 'other';
       if (file.type.includes('pdf')) type = 'pdf';
       else if (file.type.includes('image')) type = 'image';
       else if (file.type.includes('word')) type = 'word';
       
       setNewDocData({ ...newDocData, file, type, name: file.name });
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocData.file || !newDocData.name) return;

    try {
      let documentData: Partial<CaseDocument> = {
        id: Math.random().toString(36).substring(2, 9),
        name: newDocData.name,
        type: newDocData.type as any,
        category: newDocData.category as any,
        url: '',
        uploadDate: new Date().toISOString(),
        uploadedToDrive: false
      };

      // إذا تم اختيار التحميل إلى Google Drive
      if (newDocData.uploadToDrive) {
        setIsUploadingToDrive(true);
        
        // التحقق من تسجيل الدخول إلى Google
        if (!googleDriveService.isSignedIn()) {
          await googleDriveService.signIn();
        }

        // رفع الملف إلى Google Drive
        console.log('Starting upload to Google Drive...');
        console.log('File:', newDocData.file);
        console.log('Folder:', `القضية_${currentCase.caseNumber}_${currentCase.title}`);
        
        const driveResponse = await googleDriveService.uploadFile(
          newDocData.file, 
          `القضية ${currentCase.caseNumber} - ${currentCase.title}`
        );
        
        console.log('Google Drive response:', driveResponse);

        // تحديث البيانات بمعلومات Google Drive
        documentData.driveFileId = driveResponse.fileId;
        documentData.driveLink = driveResponse.webViewLink;
        documentData.driveContentLink = driveResponse.webContentLink;
        documentData.uploadedToDrive = true;
        documentData.url = driveResponse.webViewLink;
        
        setIsUploadingToDrive(false);
      } else {
        // التحميل المحلي معطل مؤقتاً بسبب مشكلة CORS
        // TODO: إصلاح مشكلة CORS في Firebase Storage
        alert('التحميل المحلي معطل مؤقتاً. يرجى اختيار "رفع إلى Google Drive".');
        setIsUploadingToDrive(false);
        return;
      }

      // إضافة المستند إلى قائمة المستندات
      const updatedDocuments = [...(currentCase.documents || []), documentData as CaseDocument];
      onUpdateCase && onUpdateCase({
        ...currentCase,
        documents: updatedDocuments
      });

      // إغلاق النافذة وإعادة تعيين البيانات
      setIsDocModalOpen(false);
      setNewDocData({ name: '', type: 'pdf', category: 'other', file: null, uploadToDrive: true });
      
    } catch (error) {
      console.error('Error saving document:', error);
      setIsUploadingToDrive(false);
      
      // رسائل خطأ مفصلة
      let errorMessage = 'حدث خطأ أثناء حفظ المستند. يرجى المحاولة مرة أخرى.';
      
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        if (error.message.includes('sign-in')) {
          errorMessage = 'فشل تسجيل الدخول إلى Google. يرجى المحاولة مرة أخرى.';
        } else if (error.message.includes('upload')) {
          errorMessage = 'فشل رفع الملف إلى Google Drive. يرجى التحقق من اتصال الإنترنت وحجم الملف.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'لا توجد صلاحية كافية للوصول إلى Google Drive. يرجى التحقق من الأذونات.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'مساحة Google Drive ممتلئة. يرجى مسح بعض الملفات والمحاولة مرة أخرى.';
        }
      }
      
      alert(errorMessage);
    }
  };

  // Finance Handlers
  const handleSaveTransaction = (e: React.FormEvent) => {
     e.preventDefault();
     if (!onUpdateCase) return;

     const newTrans: FinancialTransaction = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toISOString().split('T')[0],
        amount: Number(transData.amount),
        type: transData.type,
        description: transData.description,
        recordedBy: 'المحامي'
     };

     const newFinance = { ...(currentCase.finance || { agreedFees: 0, paidAmount: 0, expenses: 0, history: [] }) };
     newFinance.history = [...(newFinance.history || []), newTrans];
     
     if (transData.type === 'payment') newFinance.paidAmount += Number(transData.amount);
     else newFinance.expenses += Number(transData.amount);

     onUpdateCase({ ...currentCase, finance: newFinance });
     setIsTransModalOpen(false);
     setTransData({ amount: 0, type: 'payment', description: '' });
  };

  const handleUpdateAgreedFees = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCase) return;

    const newFinance = { 
        ...(currentCase.finance || { agreedFees: 0, paidAmount: 0, expenses: 0, history: [] }),
        agreedFees: Number(newFeeValue)
    };

    onUpdateCase({ ...currentCase, finance: newFinance });
    setIsFeesModalOpen(false);
  };

  const openFeesModal = () => {
      setNewFeeValue(totalAgreed);
      setIsFeesModalOpen(true);
  };

  const getStatusBadgeColor = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.OPEN: return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      case CaseStatus.CLOSED: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600';
      case CaseStatus.JUDGMENT: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('image')) return <FileText className="w-8 h-8 text-purple-500" />; // Or ImageIcon
    return <FileText className="w-8 h-8 text-slate-400" />;
  };

  // --- Render Sections ---

  const renderOverview = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
       {/* Left Column: Stats & Strategy */}
       <div className="lg:col-span-2 space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                   <Calendar className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-0.5">الجلسة القادمة</p>
                   <p className="font-bold text-slate-800 dark:text-white text-sm">
                      {nextHearing && new Date(nextHearing.date) >= new Date() ? nextHearing.date : 'لا توجد جلسات قادمة'}
                   </p>
                </div>
             </div>
             
             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                   <DollarSign className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-0.5">المدفوعات</p>
                   <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{totalPaid.toLocaleString()}</p>
                      <span className="text-[10px] text-slate-400">/ {totalAgreed.toLocaleString()}</span>
                   </div>
                   <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 mt-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{width: `${paymentProgress}%`}}></div>
                   </div>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                   <Activity className="w-5 h-5" />
                </div>
                <div>
                   <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-0.5">عدد الجلسات</p>
                   <p className="font-bold text-slate-800 dark:text-white text-sm">{caseHearings.length} جلسة</p>
                </div>
             </div>
          </div>

          {/* Strategy / Description Card */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ملخص واستراتيجية القضية
                </div>
                <button 
                  onClick={handleEditOpen} 
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                  title="تعديل الاستراتيجية"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
             </h3>
             <div className="space-y-4">
                <div>
                   <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">وصف الدعوى</span>
                   <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {currentCase.description || 'لم يتم إضافة وصف لهذه القضية.'}
                   </p>
                </div>
                
                {currentCase.strategy && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div>
                         <span className="text-xs font-bold text-green-600 dark:text-green-400 block mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> نقاط القوة</span>
                         <p className="text-xs text-slate-600 dark:text-slate-400">{currentCase.strategy.strengthPoints || '-'}</p>
                      </div>
                      <div>
                         <span className="text-xs font-bold text-red-500 dark:text-red-400 block mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> الثغرات / نقاط الضعف</span>
                         <p className="text-xs text-slate-600 dark:text-slate-400">{currentCase.strategy.weaknessPoints || '-'}</p>
                      </div>
                      <div>
                         <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> خطة العمل</span>
                         <p className="text-xs text-slate-600 dark:text-slate-400">{currentCase.strategy.plan || '-'}</p>
                      </div>
                   </div>
                )}
             </div>
          </div>
       </div>

       {/* Right Column: Court, Client & Opponent Info */}
       <div className="space-y-6">
          {/* Client Card */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500"></div>
             <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <User className="w-4 h-4 text-slate-400" /> الموكل
                </h4>
                <button onClick={() => onClientClick && onClientClick(currentCase.clientId)} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">عرض الملف</button>
             </div>
             
             <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold text-lg">
                   {currentCase.clientName.charAt(0)}
                </div>
                <div>
                   <p className="font-bold text-slate-800 dark:text-white">{currentCase.clientName}</p>
                   <p className="text-xs text-slate-500 dark:text-slate-400">{currentCase.clientRole}</p>
                </div>
             </div>
             
             {client && (
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                   <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors">
                      <Phone className="w-3 h-3" /> {client.phone}
                   </a>
                </div>
             )}
          </div>

          {/* Opponent Card (New) */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-1 h-full bg-red-500"></div> {/* Red stripe for opponent */}
             <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                   <Users className="w-4 h-4 text-slate-400" /> الخصوم
                </h4>
             </div>
             
             {currentCase.opponents && currentCase.opponents.length > 0 ? (
                <div className="space-y-4">
                   {currentCase.opponents.map((opp, idx) => (
                      <div key={idx} className={idx > 0 ? "pt-3 border-t border-slate-100 dark:border-slate-700" : ""}>
                         <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 font-bold text-lg">
                               {opp.name.charAt(0)}
                            </div>
                            <div>
                               <p className="font-bold text-slate-800 dark:text-white">{opp.name}</p>
                               <p className="text-xs text-slate-500 dark:text-slate-400">{opp.role || 'خصم'}</p>
                            </div>
                         </div>
                         {opp.lawyer && (
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg text-xs flex items-center gap-2 text-slate-700 dark:text-slate-300">
                               <Gavel className="w-3 h-3 text-slate-400" />
                               <span>محامي الخصم: <span className="font-bold">{opp.lawyer}</span></span>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             ) : (
                <div className="text-center py-4 text-slate-400 text-xs">
                   لم يتم تسجيل بيانات الخصم
                </div>
             )}
          </div>

          {/* Court Info */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
             <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-slate-400" /> بيانات المحكمة
             </h4>
             <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                   <span className="text-slate-500 dark:text-slate-400">المحكمة</span>
                   <span className="font-medium text-slate-800 dark:text-white">{currentCase.court}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                   <span className="text-slate-500 dark:text-slate-400">المقر / الفرع</span>
                   <span className="font-medium text-slate-800 dark:text-white">{currentCase.courtBranch || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                   <span className="text-slate-500 dark:text-slate-400">الدائرة</span>
                   <span className="font-medium text-slate-800 dark:text-white">{currentCase.circle || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 dark:border-slate-700 pb-2">
                   <span className="text-slate-500 dark:text-slate-400">القاضي</span>
                   <span className="font-medium text-slate-800 dark:text-white">{currentCase.judgeName || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 dark:text-slate-400">المحامي المسؤول</span>
                   <span className="font-medium text-slate-800 dark:text-white">{currentCase.assignedLawyerName || 'غير معين'}</span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  const renderHearingsTimeline = () => (
     <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> سجل الجلسات
           </h3>
           <button 
             onClick={() => setIsHearingModalOpen(true)}
             className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1"
           >
              <Plus className="w-3 h-3" /> جلسة جديدة
           </button>
        </div>

        <div className="relative border-r-2 border-slate-200 dark:border-slate-700 mr-4 space-y-8 pr-8">
           {caseHearings.map((h, idx) => {
              const isUpcoming = new Date(h.date) >= new Date(new Date().setHours(0,0,0,0));
              return (
                 <div key={h.id} className="relative group">
                    <div className={`absolute -right-[41px] top-0 w-5 h-5 rounded-full border-4 border-white dark:border-slate-800 ${isUpcoming ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all">
                       <div>
                          <div className="flex items-center gap-3 mb-2">
                             <span className="font-bold text-lg text-slate-800 dark:text-white font-mono">{h.date}</span>
                             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isUpcoming ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                {h.status}
                             </span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{h.decision || h.requirements || 'لا توجد تفاصيل'}</p>
                          {h.expenses && h.expenses.amount > 0 && (
                             <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 mt-2">
                                <DollarSign className="w-3 h-3" /> مصروفات: {h.expenses.amount} ج.م ({h.expenses.paidBy === 'lawyer' ? 'المكتب' : 'الموكل'})
                             </p>
                          )}
                       </div>
                       
                       <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                          {h.rulingUrl && (
                             <a href={h.rulingUrl} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline bg-white dark:bg-slate-700 px-2 py-1 rounded border border-indigo-100 dark:border-slate-600">
                                <FileText className="w-3 h-3" /> الحكم/المحضر
                             </a>
                          )}
                       </div>
                    </div>
                 </div>
              )
           })}
           {caseHearings.length === 0 && <p className="text-center text-slate-400 text-sm">لا توجد جلسات مسجلة.</p>}
        </div>
     </div>
  );

  const renderDocumentsTab = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> مستندات القضية
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">العقود، الأحكام، المذكرات، والإعلانات</p>
           </div>
           <button onClick={() => setIsDocModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-none">
              <Upload className="w-4 h-4" /> رفع مستند
           </button>
        </div>

        {currentCase.documents && currentCase.documents.length > 0 ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentCase.documents.map(doc => (
                 <div key={doc.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group relative">
                    <div className="flex items-start gap-3">
                       <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors relative">
                          {getFileIcon(doc.type)}
                          {doc.uploadedToDrive && (
                            <Cloud className="absolute -top-1 -right-1 w-4 h-4 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 rounded-full" />
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate mb-1" title={doc.name}>{doc.name}</h4>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded">
                             {doc.category === 'contract' ? 'عقد' : doc.category === 'ruling' ? 'حكم' : doc.category === 'notice' ? 'إعلان' : doc.category === 'evidence' ? 'أدلة' : 'عام'}
                          </span>
                          {doc.uploadedToDrive && (
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded mr-1">
                               Google Drive
                            </span>
                          )}
                       </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                       <span>{doc.uploadDate}</span>
                       <div className="flex gap-2">
                         {doc.uploadedToDrive && doc.driveContentLink && (
                           <a 
                             href={doc.driveContentLink} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold hover:underline"
                             title="تحميل من Google Drive"
                           >
                              <Download className="w-3 h-3" /> تحميل
                           </a>
                         )}
                         <a 
                           href={doc.url} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                           title={doc.uploadedToDrive ? "معاينة في Google Drive" : "معاينة المستند"}
                         >
                              <Eye className="w-3 h-3" /> معاينة
                         </a>
                       </div>
                    </div>
                 </div>
              ))}
           </div>
        ) : (
           <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3">
              <FileCheck className="w-12 h-12 opacity-20" />
              <p>لا توجد مستندات مرفقة في هذه القضية</p>
              <button onClick={() => setIsDocModalOpen(true)} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">اضغط لرفع أول مستند</button>
           </div>
        )}
     </div>
  );

  const renderFinanceTab = () => (
     <div className="space-y-6 animate-in fade-in">
        {/* Financial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
           {/* Total Agreed */}
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي الأتعاب</p>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{totalAgreed.toLocaleString()} <span className="text-xs font-normal">ج.م</span></h3>
                 </div>
                 <div className="flex items-start gap-1">
                    <button onClick={openFeesModal} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <Briefcase className="w-5 h-5" />
                    </div>
                 </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-2">
                 <div className="bg-blue-500 h-full" style={{width: '100%'}}></div>
              </div>
           </div>

           {/* Paid Amount (NEW CARD) */}
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">المدفوع من الأتعاب</p>
                    <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalPaid.toLocaleString()} <span className="text-xs font-normal">ج.م</span></h3>
                 </div>
                 <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                 </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-2">
                 <div className="bg-emerald-500 h-full" style={{width: `${paymentProgress}%`}}></div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">نسبة التحصيل: {Math.round(paymentProgress)}%</p>
           </div>

           {/* Remaining Dues */}
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">المستحقات (متبقي)</p>
                    <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{remainingDues.toLocaleString()} <span className="text-xs font-normal">ج.م</span></h3>
                 </div>
                 <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                 </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden mt-2">
                 <div className="bg-amber-500 h-full" style={{width: `${100 - paymentProgress}%`}}></div>
              </div>
           </div>

           {/* Expenses */}
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">مصاريف القضية</p>
                    <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{totalExpenses.toLocaleString()} <span className="text-xs font-normal">ج.م</span></h3>
                 </div>
                 <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
                    <TrendingDown className="w-5 h-5" />
                 </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">تشمل الرسوم، الانتقالات، والإكراميات</p>
           </div>

           {/* Net Income */}
           <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <div className="flex justify-between items-start mb-2">
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">صافي دخل القضية</p>
                    <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{netIncome.toLocaleString()} <span className="text-xs font-normal">ج.م</span></h3>
                 </div>
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                    <Calculator className="w-5 h-5" />
                 </div>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">بعد خصم المصاريف من المتحصل</p>
           </div>
        </div>

        {/* Transactions History */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
           <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                 <Wallet className="w-4 h-4 text-slate-500" /> سجل المعاملات المالية
              </h3>
              <button 
                onClick={() => setIsTransModalOpen(true)}
                className="text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 shadow-sm"
              >
                 <Plus className="w-3 h-3" /> إضافة معاملة
              </button>
           </div>
           
           <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-right text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold sticky top-0">
                    <tr>
                       <th className="p-3">التاريخ</th>
                       <th className="p-3">النوع</th>
                       <th className="p-3">المبلغ</th>
                       <th className="p-3">البيان</th>
                       <th className="p-3">بواسطة</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {currentCase.finance?.history && currentCase.finance.history.length > 0 ? (
                       currentCase.finance.history.map((t, idx) => (
                          <tr key={t.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">
                             <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{t.date}</td>
                             <td className="p-3">
                                {t.type === 'payment' ? (
                                   <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-xs"><ArrowDownLeft className="w-3 h-3"/> دفعة</span>
                                ) : (
                                   <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs"><ArrowUpRight className="w-3 h-3"/> مصروف</span>
                                )}
                             </td>
                             <td className={`p-3 font-bold ${t.type === 'payment' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                {t.type === 'expense' ? '-' : ''}{t.amount.toLocaleString()}
                             </td>
                             <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">{t.description || '-'}</td>
                             <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{t.recordedBy}</td>
                          </tr>
                       ))
                    ) : (
                       <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">لا توجد معاملات مسجلة حتى الآن</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
     </div>
  );

  return (
    <div className="space-y-6 pb-20">
       {/* Breadcrumb / Back */}
       <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <button onClick={onBack} className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">القضايا</button>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">{currentCase.caseNumber}</span>
       </div>

       {/* Main Header */}
       <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-600"></div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
             <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(currentCase.status)}`}>
                      {currentCase.status}
                   </span>
                   <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                      {currentCase.year}
                   </span>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                   {currentCase.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                   <span className="flex items-center gap-1.5"><Shield className="w-4 h-4"/> رقم: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{currentCase.caseNumber}</span></span>
                   <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                   <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4"/> {currentCase.court}</span>
                </div>
             </div>

             <div className="flex items-center gap-3 shrink-0">
                <button 
                  onClick={handleEditOpen} 
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 shadow-sm"
                >
                   <Edit3 className="w-4 h-4" /> تعديل
                </button>
             </div>
          </div>
       </div>

       {/* Tabs Navigation */}
       <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl overflow-x-auto">
          {[
             { id: 'overview', label: 'نظرة عامة', icon: Activity },
             { id: 'hearings', label: 'سجل الجلسات', icon: Gavel },
             { id: 'documents', label: 'المستندات', icon: FileText },
             { id: 'finance', label: 'المالية', icon: DollarSign },
          ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}
             >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                {tab.label}
             </button>
          ))}
       </div>

       {/* Tab Content */}
       <div className="min-h-[400px]">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'hearings' && renderHearingsTimeline()}
          {activeTab === 'documents' && renderDocumentsTab()}
          {activeTab === 'finance' && renderFinanceTab()}
       </div>

       {/* Edit Modal */}
       {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                 <h3 className="font-bold text-xl text-slate-800 dark:text-white">تعديل بيانات القضية</h3>
                 <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-6 h-6"/></button>
              </div>
              <form onSubmit={handleEditSave} className="space-y-5">
                 <div className="space-y-4">
                    <div>
                       <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان الدعوى</label>
                       <input type="text" value={editCaseData.title || ''} onChange={e => setEditCaseData({...editCaseData, title: e.target.value})} className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المحكمة</label>
                           <input type="text" value={editCaseData.courtBranch || ''} onChange={e => setEditCaseData({...editCaseData, courtBranch: e.target.value})} className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">الدائرة</label>
                           <input type="text" value={editCaseData.circle || ''} onChange={e => setEditCaseData({...editCaseData, circle: e.target.value})} className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">وصف / ملاحظات</label>
                       <textarea value={editCaseData.description || ''} onChange={e => setEditCaseData({...editCaseData, description: e.target.value})} rows={3} className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">حالة القضية</label>
                       <select value={editCaseData.status} onChange={e => setEditCaseData({...editCaseData, status: e.target.value as CaseStatus})} className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none">
                          {Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">المحامي المسؤول</label>
                       <select 
                          value={editCaseData.assignedLawyerId || ''} 
                          onChange={e => {
                            const selectedLawyer = lawyers.find(l => l.id === e.target.value);
                            setEditCaseData({
                              ...editCaseData, 
                              assignedLawyerId: e.target.value,
                              assignedLawyerName: selectedLawyer ? selectedLawyer.name : ''
                            });
                          }}
                          className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                       >
                          <option value="">اختر المحامي المسؤول...</option>
                          {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                       </select>
                    </div>

                    {/* Opponent Editing Fields */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                       <h4 className="font-bold text-slate-800 dark:text-white mb-2 text-sm">بيانات الخصم الرئيسي</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الخصم</label>
                             <input 
                                type="text" 
                                value={editOpponentName} 
                                onChange={e => setEditOpponentName(e.target.value)} 
                                className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="اسم الخصم..."
                             />
                          </div>
                          <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">محامي الخصم</label>
                             <input 
                                type="text" 
                                value={editOpponentLawyer} 
                                onChange={e => setEditOpponentLawyer(e.target.value)} 
                                className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="اسم المحامي..."
                             />
                          </div>
                       </div>
                    </div>

                    {/* Strategy Editing Fields */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                       <h4 className="font-bold text-slate-800 dark:text-white mb-4 text-sm flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          استراتيجية القضية
                       </h4>
                       <div className="space-y-4">
                          <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">نقاط القوة</label>
                             <textarea 
                                value={editStrengthPoints} 
                                onChange={e => setEditStrengthPoints(e.target.value)} 
                                rows={3} 
                                className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="سجل الأدلة والمواقف القانونية الداعمة..."
                             />
                          </div>
                          <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">نقاط الضعف / الثغرات</label>
                             <textarea 
                                value={editWeaknessPoints} 
                                onChange={e => setEditWeaknessPoints(e.target.value)} 
                                rows={3} 
                                className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="حدد المخاطر المحتملة..."
                             />
                          </div>
                          <div>
                             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">خطة العمل</label>
                             <textarea 
                                value={editActionPlan} 
                                onChange={e => setEditActionPlan(e.target.value)} 
                                rows={3} 
                                className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
                                placeholder="ارسم مسار سير الدعوى والإجراءات المطلوبة..."
                             />
                          </div>
                       </div>
                    </div>
                 </div>
                 <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">إلغاء</button>
                    <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-colors">حفظ التعديلات</button>
                 </div>
              </form>
           </div>
        </div>
       )}

       {/* Upload Document Modal */}
       {isDocModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white">رفع مستند جديد</h3>
                   <button onClick={() => setIsDocModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
                </div>
                <form onSubmit={handleSaveDocument} className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المستند</label>
                      <input 
                         type="text" required 
                         value={newDocData.name} 
                         onChange={e => setNewDocData({...newDocData, name: e.target.value})} 
                         className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                         placeholder="مثال: عقد، حكم، مذكرة..."
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التصنيف</label>
                      <select 
                         value={newDocData.category} 
                         onChange={e => setNewDocData({...newDocData, category: e.target.value})}
                         className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      >
                         <option value="other">عام</option>
                         <option value="contract">عقد</option>
                         <option value="ruling">حكم</option>
                         <option value="notice">إعلان/إنذار</option>
                         <option value="evidence">أدلة</option>
                      </select>
                   </div>

                   {/* Google Drive Upload Option */}
                   <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={newDocData.uploadToDrive}
                           onChange={e => setNewDocData({...newDocData, uploadToDrive: e.target.checked})}
                           className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                         />
                         <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                         <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                           رفع إلى Google Drive (موصى به)
                         </span>
                      </label>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 mr-6">
                         حفظ آمن في Google Drive للوصول من أي جهاز
                      </p>
                   </div>
                   
                   <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${newDocData.file ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                   >
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                      {newDocData.file ? (
                         <div className="flex flex-col items-center gap-2">
                            <FileCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{newDocData.file.name}</p>
                         </div>
                      ) : (
                         <div className="flex flex-col items-center gap-2 text-slate-500">
                            <Upload className="w-8 h-8 opacity-50" />
                            <p className="text-sm font-medium">اضغط لاختيار ملف</p>
                         </div>
                      )}
                   </div>

                   <button type="submit" disabled={!newDocData.file || !newDocData.name || isUploadingToDrive} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2">
                      {isUploadingToDrive ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          جاري الرفع إلى Google Drive...
                        </>
                      ) : (
                        <>
                          {newDocData.uploadToDrive ? <Cloud className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                          حفظ المستند
                        </>
                      )}
                   </button>
                </form>
             </div>
          </div>
       )}

       {/* Add Transaction Modal */}
       {isTransModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white">تسجيل معاملة مالية</h3>
                   <button onClick={() => setIsTransModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
                </div>
                <form onSubmit={handleSaveTransaction} className="space-y-4">
                   <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                      <button type="button" onClick={() => setTransData({...transData, type: 'payment'})} className={`flex-1 py-2 rounded font-bold text-sm ${transData.type === 'payment' ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-400 shadow-sm' : 'text-slate-500'}`}>دفعة (وارد)</button>
                      <button type="button" onClick={() => setTransData({...transData, type: 'expense'})} className={`flex-1 py-2 rounded font-bold text-sm ${transData.type === 'expense' ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500'}`}>مصروف (صادر)</button>
                   </div>
                   
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ (ج.م)</label>
                      <input type="number" required min="0" value={transData.amount} onChange={e => setTransData({...transData, amount: Number(e.target.value)})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الوصف / البيان</label>
                      <input type="text" value={transData.description} onChange={e => setTransData({...transData, description: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="مثال: دفعة تحت الحساب" />
                   </div>

                   <button type="submit" className={`w-full py-2 rounded-lg font-bold text-white mt-2 ${transData.type === 'payment' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                      حفظ المعاملة
                   </button>
                </form>
             </div>
          </div>
       )}

       {/* Edit Fees Modal */}
       {isFeesModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white">تعديل إجمالي الأتعاب</h3>
                   <button onClick={() => setIsFeesModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
                </div>
                <form onSubmit={handleUpdateAgreedFees} className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">قيمة الأتعاب الجديدة</label>
                      <input 
                         type="number" required min="0" 
                         value={newFeeValue} 
                         onChange={e => setNewFeeValue(Number(e.target.value))} 
                         className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" 
                      />
                   </div>
                   <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 mt-2">
                      تحديث القيمة
                   </button>
                </form>
             </div>
          </div>
       )}

       {/* Add Hearing Modal */}
       {isHearingModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white">إضافة جلسة جديدة</h3>
                  <button onClick={() => setIsHearingModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
                </div>
                <form onSubmit={handleSaveNewHearing} className="p-4 space-y-4">
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
                     <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المطلوب للجلسة</label>
                     <textarea placeholder="المطلوب للجلسة..." className="w-full border dark:border-slate-600 p-2 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white" rows={3} value={newHearingData.requirements} onChange={e => setNewHearingData({...newHearingData, requirements: e.target.value})}></textarea>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setIsHearingModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">إلغاء</button>
                    <button type="submit" className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">حفظ الجلسة</button>
                  </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default CaseDetails;
