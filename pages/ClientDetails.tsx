
import React, { useState, useRef, useEffect } from 'react';
import { Client, Case, CaseStatus, POAFile, ClientType, Hearing, ClientDocument, ClientStatus } from '../types';
import { ArrowRight, User, Phone, MapPin, Mail, FileText, Calendar, Briefcase, Hash, Save, X, ScrollText, AlertTriangle, Upload, Eye, CheckCircle, Trash2, Edit3, Plus, File, Building2, Wallet, BellRing, PhoneCall, MessageCircle, MoreVertical, Clock, Send, Copy, Cloud, Download } from 'lucide-react';
import { googleDriveService } from '../services/googleDriveService';

interface ClientDetailsProps {
  clientId: string;
  clients: Client[];
  cases: Case[];
  hearings?: Hearing[];
  onBack: () => void;
  onCaseClick: (caseId: string) => void;
  onUpdateClient?: (client: Client) => void;
  readOnly?: boolean;
  generalSettings?: any; // إضافة إعدادات عامة
}

const ClientDetails: React.FC<ClientDetailsProps> = ({ clientId, clients, cases, hearings = [], onBack, onCaseClick, onUpdateClient, readOnly = false, generalSettings }) => {
  const client = clients.find(c => c.id === clientId);
  const clientCases = cases.filter(c => c.clientId === clientId);
  
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'documents' | 'finance'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});
  
  // Handle case click with confirmation
  const handleCaseClick = (caseId: string) => {
    const selectedCase = cases.find(c => c.id === caseId);
    if (selectedCase) {
      console.log('Navigating to case:', selectedCase.title);
      onCaseClick(caseId);
    }
  };
  
  // Doc Upload State
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newDocData, setNewDocData] = useState<Partial<ClientDocument>>({ type: 'poa', name: '', uploadToDrive: true });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp Modal State
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('session_reminder');
  const [msgPreview, setMsgPreview] = useState('');

  if (!client) return <div className="p-10 text-center dark:text-white">الموكل غير موجود</div>;

  // --- Derived Stats & Data ---
  const activeCasesCount = clientCases.filter(c => c.status !== CaseStatus.CLOSED && c.status !== CaseStatus.ARCHIVED).length;
  
  const totalDues = clientCases.reduce((acc, curr) => acc + (curr.finance ? (curr.finance.agreedFees - curr.finance.paidAmount) : 0), 0);
  const totalPaid = clientCases.reduce((acc, curr) => acc + (curr.finance?.paidAmount || 0), 0);

  // POA Status
  const isPOAExpired = client.poaExpiry ? new Date(client.poaExpiry) < new Date() : false;
  const isPOANearExpiry = client.poaExpiry ? 
    new Date(client.poaExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 
    new Date(client.poaExpiry) >= new Date() : false;
  
  // Find Next Hearing for Templates
  const allClientHearings = hearings.filter(h => clientCases.some(c => c.id === h.caseId));
  const nextHearing = allClientHearings
    .filter(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  const nextHearingCase = nextHearing ? clientCases.find(c => c.id === nextHearing.caseId) : null;

  // Get Alerts
  const alerts = [];
  // 1. POA Expiry
  if (client.poaExpiry) {
     const expiry = new Date(client.poaExpiry);
     const today = new Date();
     const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
     if (diffDays < 0) alerts.push({ type: 'critical', msg: 'التوكيل منتهي الصلاحية' });
     else if (diffDays <= 7) alerts.push({ type: 'critical', msg: `تحذير: التوكيل ينتهي خلال ${diffDays} أيام` });
     else if (diffDays < 30) alerts.push({ type: 'warning', msg: `التوكيل ينتهي خلال ${diffDays} يوم` });
  }
  // 2. Risk Cases (Active but no future hearing)
  const riskyCases = clientCases.filter(c => {
     if (c.status === CaseStatus.CLOSED || c.status === CaseStatus.ARCHIVED) return false;
     const futureHearing = hearings.find(h => h.caseId === c.id && new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)));
     return !futureHearing;
  });
  if (riskyCases.length > 0) alerts.push({ type: 'warning', msg: `يوجد ${riskyCases.length} قضايا نشطة بدون جلسات قادمة` });
  // 3. Financials
  if (totalDues > 5000) alerts.push({ type: 'info', msg: `مستحقات مالية مرتفعة: ${totalDues.toLocaleString()} ج.م` });

  // --- Browser Notifications ---
  useEffect(() => {
    // Request notification permission on component mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Initialize Google Drive
  useEffect(() => {
    const initGoogleDrive = async () => {
      try {
        await googleDriveService.initialize();
        console.log('Google Drive initialized successfully');
      } catch (error) {
        console.error('Google Drive initialization failed:', error);
      }
    };
    
    initGoogleDrive();
  }, []);

  useEffect(() => {
    // Show browser notifications when alerts exist and system notifications are enabled
    if (generalSettings?.enableSystemNotifications && alerts.length > 0) {
      alerts.forEach((alert, index) => {
        if ('Notification' in window && Notification.permission === 'granted') {
          // Show notification with a small delay to prevent spam
          setTimeout(() => {
            new Notification(`تنبيه من الميزان - ${client.name}`, {
              body: alert.msg,
              icon: '/icon-192x192.png',
              tag: `client-${client.id}-${index}`,
              requireInteraction: alert.type === 'critical',
              silent: false
            });
          }, index * 500); // 500ms delay between notifications
        }
      });
    }
  }, [alerts, generalSettings?.enableSystemNotifications, client.name]);


  // --- Handlers ---
  const handleOpenEdit = () => {
    setFormData({ ...client });
    setIsEditModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateClient && formData.name) {
       const updatedClient: Client = {
         ...client,
         name: formData.name,
         type: formData.type as ClientType,
         status: formData.status as ClientStatus,
         nationalId: formData.nationalId || '',
         phone: formData.phone || '',
         secondaryPhone: formData.secondaryPhone || undefined,
         address: formData.address || undefined,
         email: formData.email || undefined,
         notes: formData.notes || undefined,
         nationality: formData.nationality || undefined,
         dateOfBirth: formData.dateOfBirth || undefined,
         companyRepresentative: formData.companyRepresentative || undefined,
         documents: client.documents || [], // الحفاظ على المستندات الموجودة
         poaFiles: client.poaFiles || [], // الحفاظ على ملفات التوكيل
         poaExpiry: formData.poaExpiry || undefined
       };
       
       onUpdateClient(updatedClient);
       setIsEditModalOpen(false);
    }
  };

  const handleDocFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
        if (!newDocData.name) setNewDocData({ ...newDocData, name: e.target.files[0].name });
     }
  };

  const handleSaveDocument = async () => {
     if (!onUpdateClient || !selectedFile || !newDocData.name) return;

     try {
        const documentData: ClientDocument = {
           id: Math.random().toString(36).substring(2, 9),
           type: newDocData.type as any,
           name: newDocData.name || '',
           url: '', // سيتم تحديثه بعد الرفع
           uploadDate: new Date().toISOString().split('T')[0],
           issueDate: newDocData.issueDate || undefined,
           expiryDate: newDocData.expiryDate || undefined,
           notes: newDocData.notes || undefined,
           uploadToDrive: newDocData.uploadToDrive || false,
           driveFileId: undefined,
           driveLink: undefined,
           driveContentLink: undefined,
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
           console.log('File:', selectedFile);
           console.log('Folder:', `الموكل ${client.name}`);
           
           const driveResponse = await googleDriveService.uploadFile(
             selectedFile, 
             `الموكل ${client.name}`
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
           alert('التحميل المحلي معطل مؤقتاً. يرجى اختيار "رفع إلى Google Drive".');
           setIsUploadingToDrive(false);
           return;
        }

        console.log('Final document data:', documentData);
        console.log('Client current documents:', client.documents);

        // التأكد من تهيئة مصفوفة المستندات (الآن إلزامية)
        const currentDocuments = client.documents || [];
        console.log('Current documents after null check:', currentDocuments);

        let updatedClient = { 
          ...client, 
          documents: [...currentDocuments, documentData] 
        };

        // If it's a POA, update client's main expiration date for global alerts
        if (newDocData.type === 'poa' && newDocData.expiryDate) {
           updatedClient.poaExpiry = newDocData.expiryDate;
        }

        // تنظيف الحقول undefined قبل إرسالها
        const cleanUpdatedClient: Client = {
          id: updatedClient.id,
          name: updatedClient.name,
          type: updatedClient.type,
          status: updatedClient.status,
          nationalId: updatedClient.nationalId,
          phone: updatedClient.phone,
          documents: updatedClient.documents,
          secondaryPhone: updatedClient.secondaryPhone,
          address: updatedClient.address,
          email: updatedClient.email,
          notes: updatedClient.notes,
          nationality: updatedClient.nationality,
          dateOfBirth: updatedClient.dateOfBirth,
          companyRepresentative: updatedClient.companyRepresentative,
          poaFiles: updatedClient.poaFiles,
          poaExpiry: updatedClient.poaExpiry
        };

        // دالة تنظيف قوية لإزالة جميع قيم undefined والحقول الفارغة
        const cleanObject = (obj: any): any => {
          const cleaned: any = {};
          console.log('🔍 Cleaning object:', obj);
          for (const key in obj) {
            console.log(`🔍 Key: ${key}, Value:`, obj[key], 'Type:', typeof obj[key]);
            if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
              cleaned[key] = obj[key];
              console.log(`✅ Keeping: ${key}`);
            } else {
              console.log(`❌ Removing: ${key}`);
            }
          }
          console.log('🧹 Cleaned object:', cleaned);
          return cleaned;
        };

        // تنظيف البيانات بشكل عميق
        const finalCleanClient = cleanObject(cleanUpdatedClient);

        console.log('Updated client:', updatedClient);
        console.log('Clean updated client:', finalCleanClient);

        // التحقق النهائي من عدم وجود undefined
        const hasUndefined = Object.values(finalCleanClient).some(val => val === undefined);
        console.log('🚨 Has undefined values:', hasUndefined);
        if (hasUndefined) {
          console.error('❌ ERROR: Still has undefined values!', finalCleanClient);
        }

        onUpdateClient(finalCleanClient as Client);
        setIsDocModalOpen(false);
        setNewDocData({ type: 'poa', name: '', uploadToDrive: true });
        setSelectedFile(null);
        
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

  // --- WhatsApp Logic ---
  const generateMessage = (template: string) => {
     let msg = "";
     const greeting = `تحياتي، أستاذ/ة ${client.name}.`;
     
     switch (template) {
        case 'session_reminder':
           if (nextHearing && nextHearingCase) {
              msg = `${greeting}\n\nنود تذكيركم بموعد الجلسة القادمة في قضية "${nextHearingCase.title}" رقم (${nextHearingCase.caseNumber}).\n\n📅 التاريخ: ${nextHearing.date}\n🏛️ المحكمة: ${nextHearingCase.court}\n\nيرجى التواصل في حال وجود استفسارات.`;
           } else {
              msg = `${greeting}\n\nلا توجد جلسات قادمة محددة حالياً في الجدول. سنتواصل معكم عند تحديد أي جديد.`;
           }
           break;
        case 'payment_request':
           if (totalDues > 0) {
              msg = `${greeting}\n\nنحيطكم علماً بوجود مستحقات مالية (أتعاب/مصروفات) معلقة بقيمة إجمالية: ${totalDues.toLocaleString()} ج.م.\n\nيرجى التكرم بالسداد في أقرب وقت لضمان سير العمل.`;
           } else {
              msg = `${greeting}\n\nشكراً لكم، حسابكم لدينا خالص بالكامل ولا توجد مستحقات حالياً.`;
           }
           break;
        case 'case_update':
           msg = `${greeting}\n\nيوجد تحديث جديد بخصوص قضيتكم. يرجى الاتصال بنا أو زيارة المكتب لمناقشة التفاصيل.\n\nمكتب الميزان للمحاماة.`;
           break;
        case 'docs_required':
           msg = `${greeting}\n\nنحتاج منكم تزويدنا ببعض المستندات الضرورية لاستكمال إجراءات القضية.\nيرجى التواصل معنا لمعرفة التفاصيل.`;
           break;
        case 'welcome':
           msg = `أهلاً بك أستاذ/ة ${client.name} في مكتب الميزان للمحاماة.\n\nيسعدنا خدمتكم وتولي قضاياكم. رقم المكتب للتواصل: 01000000000\nالعنوان: المهندسين، الجيزة.`;
           break;
     }
     return encodeURIComponent(msg);
  };

  const openWhatsApp = () => {
     const text = generateMessage(selectedTemplate);
     window.open(`https://wa.me/2${client.phone}?text=${text}`, '_blank');
     setIsMsgModalOpen(false);
  };

  const handleCall = (phone: string) => {
     window.open(`tel:${phone}`);
  };

  // --- Render Sections ---

  const renderSidebar = () => (
     <div className="space-y-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
           <div className={`h-24 ${client.status === ClientStatus.ACTIVE ? 'bg-slate-800' : 'bg-slate-400'} relative`}>
              {!readOnly && (
              <button onClick={handleOpenEdit} className="absolute top-3 left-3 p-1.5 bg-white/20 hover:bg-white/40 rounded text-white transition-colors">
                 <Edit3 className="w-4 h-4" />
              </button>
              )}
           </div>
           <div className="px-6 pb-6 -mt-10 relative">
              <div className="flex justify-between items-end mb-4">
                 <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-800 p-1 shadow-md">
                    <div className={`w-full h-full rounded-lg flex items-center justify-center text-3xl font-bold ${client.type === ClientType.COMPANY ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300'}`}>
                       {client.type === ClientType.COMPANY ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8" />}
                    </div>
                 </div>
                 <div className={`px-3 py-1 rounded-full text-xs font-bold border ${client.status === ClientStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'}`}>
                    {client.status}
                 </div>
              </div>
              
              <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-1">{client.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mb-4">{client.nationalId}</p>

              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                 <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span dir="ltr">{client.phone}</span>
                 </div>
                 {client.email && (
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                       <Mail className="w-4 h-4 text-slate-400" />
                       <span>{client.email}</span>
                    </div>
                 )}
                 <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                    <span>{client.address || 'العنوان غير مسجل'}</span>
                 </div>
                 {client.companyRepresentative && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                       <User className="w-4 h-4 text-slate-400 mt-0.5" />
                       <span>يمثلها: {client.companyRepresentative}</span>
                    </div>
                 )}
                 {client.poaExpiry && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-700 mt-2">
                       <Clock className="w-4 h-4 text-amber-500 mt-0.5" />
                       <span className={new Date(client.poaExpiry) < new Date() ? "text-red-500 font-bold" : ""}>
                          ينتهي التوكيل: {client.poaExpiry}
                       </span>
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-6">
                 {!readOnly && (
                 <button onClick={() => handleCall(client.phone)} className="flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-sm font-medium transition-colors">
                    <PhoneCall className="w-4 h-4" /> اتصال
                 </button>
                 )}
                 {!readOnly && (
                 <button onClick={() => setIsMsgModalOpen(true)} className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 text-sm font-medium transition-colors">
                    <MessageCircle className="w-4 h-4" /> واتساب
                 </button>
                 )}
              </div>
           </div>
        </div>

        {/* Alerts Section (Sidebar) */}
        {alerts.length > 0 && (
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
              <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                 <BellRing className="w-5 h-5 text-amber-500" /> تنبيهات هامة
              </h3>
              <div className="space-y-3">
                 {alerts.map((alert, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                       alert.type === 'critical' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                       alert.type === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                       'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                       <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                       <span>{alert.msg}</span>
                    </div>
                 ))}
              </div>
           </div>
        )}
     </div>
  );

  // --- TABS CONTENT ---

  const renderOverviewTab = () => (
     <div className="space-y-6 animate-in fade-in">
        {/* POA Alert */}
        {(isPOAExpired || isPOANearExpiry) && (
           <div className={`p-4 rounded-xl border ${isPOAExpired ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'}`}>
              <div className="flex items-start gap-3">
                 <AlertTriangle className={`w-5 h-5 mt-0.5 ${isPOAExpired ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                 <div className="flex-1">
                    <p className={`font-bold ${isPOAExpired ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                       {isPOAExpired ? 'التوكيل منتهي الصلاحية' : 'التوكيل قريب من الانتهاء'}
                    </p>
                    <p className={`text-sm mt-1 ${isPOAExpired ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'}`}>
                       {client.poaExpiry && (
                          <>
                             تاريخ الانتهاء: {new Date(client.poaExpiry).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                             })}
                             {!isPOAExpired && (
                                <span className="mr-2">
                                   (متبقي {Math.ceil((new Date(client.poaExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} يوم)
                                </span>
                             )}
                          </>
                       )}
                    </p>
                    <button 
                       onClick={handleOpenEdit}
                       className={`mt-2 text-sm font-medium ${isPOAExpired ? 'text-red-700 hover:text-red-800 dark:text-red-300 dark:hover:text-red-200' : 'text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200'}`}
                    >
                       تحديث تاريخ التوكيل
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">القضايا النشطة</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{activeCasesCount}</p>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">إجمالي المستحقات</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalDues.toLocaleString()} ج.م</p>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">إجمالي المدفوعات</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPaid.toLocaleString()} ج.م</p>
           </div>
        </div>

        {/* Recent Cases Preview */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
           <h3 className="font-bold text-slate-800 dark:text-white mb-4">آخر القضايا</h3>
           <div className="space-y-4">
              {clientCases.slice(0, 3).map(c => (
                 <div key={c.id} onClick={() => handleCaseClick(c.id)} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                   <div>
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{c.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.caseNumber} / {c.year} - {c.court}</p>
                   </div>
                   <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${c.status === CaseStatus.OPEN ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                         {c.status}
                      </span>
                   </div>
                 </div>
              ))}
              {clientCases.length === 0 && <p className="text-slate-500 text-sm text-center">لا توجد قضايا مسجلة</p>}
              {clientCases.length > 3 && <button onClick={() => setActiveTab('cases')} className="w-full text-center text-xs text-primary-600 dark:text-primary-400 font-bold mt-2">عرض الكل</button>}
           </div>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white">ملاحظات عامة</h3>
              {!readOnly && <button onClick={handleOpenEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Edit3 className="w-4 h-4"/></button>}
           </div>
           <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {client.notes || 'لا توجد ملاحظات مسجلة.'}
           </p>
        </div>

        {/* POA Expiry */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
           <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <Calendar className="w-4 h-4" />
                 تاريخ انتهاء التوكيل
              </h3>
              {!readOnly && <button onClick={handleOpenEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Edit3 className="w-4 h-4"/></button>}
           </div>
           <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              {client.poaExpiry ? (
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                       {new Date(client.poaExpiry).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                       })}
                    </span>
                    {new Date(client.poaExpiry) < new Date() ? (
                       <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-full font-bold">
                          منتهي الصلاحية
                       </span>
                    ) : (
                       <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full font-bold">
                          ساري
                       </span>
                    )}
                 </div>
              ) : (
                 <span className="text-sm text-slate-500 dark:text-slate-400">لم يتم تحديد تاريخ انتهاء التوكيل</span>
              )}
           </div>
        </div>
     </div>
  );

  const renderCasesTab = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
       <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white">سجل القضايا ({clientCases.length})</h3>
       </div>
       <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {clientCases.map(c => {
             const nextHearing = hearings.find(h => h.caseId === c.id && new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)));
             const isRisky = c.status === CaseStatus.OPEN && !nextHearing;

             return (
                <div key={c.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-lg ${isRisky ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {isRisky ? <AlertTriangle className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                         </div>
                         <div>
                            <h4 onClick={() => handleCaseClick(c.id)} className="font-bold text-slate-800 dark:text-white cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 hover:underline">
                               {c.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{c.caseNumber} / {c.year} • {c.court}</p>
                         </div>
                      </div>
                      <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-medium">{c.status}</span>
                   </div>
                   
                   <div className="flex items-center gap-6 mt-3 pl-12">
                      {nextHearing ? (
                         <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                            <Calendar className="w-3 h-3" />
                            <span>جلسة قادمة: {nextHearing.date}</span>
                         </div>
                      ) : (
                         c.status === CaseStatus.OPEN && (
                            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
                               <AlertTriangle className="w-3 h-3" />
                               <span>لا توجد جلسات مجدولة (مطلوب تحديد جلسة)</span>
                            </div>
                         )
                      )}
                   </div>
                </div>
             );
          })}
          {clientCases.length === 0 && <div className="p-8 text-center text-slate-400">لا توجد قضايا</div>}
       </div>
    </div>
  );

  const renderDocumentsTab = () => (
     <div className="space-y-4 animate-in fade-in">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <h3 className="font-bold text-slate-800 dark:text-white">المستندات القانونية</h3>
           {!readOnly && <button onClick={() => setIsDocModalOpen(true)} className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-primary-700 flex items-center gap-2">
              <Upload className="w-4 h-4" /> رفع مستند
           </button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Legacy POAs mapping + New Documents */}
           {[...(client.documents || []), ...(client.poaFiles || [])].map((doc, i) => {
              // Ensure doc has all required ClientDocument properties
              const clientDoc: ClientDocument = {
                id: doc.id,
                type: doc.type || 'other',
                name: doc.name,
                url: doc.url,
                uploadDate: doc.uploadDate,
                expiryDate: doc.expiryDate || (doc.type === 'poa' ? client.poaExpiry : undefined),
                issueDate: doc.issueDate,
                notes: doc.notes,
                driveFileId: doc.driveFileId,
                driveLink: doc.driveLink,
                driveContentLink: doc.driveContentLink,
                uploadedToDrive: doc.uploadedToDrive,
                uploadToDrive: doc.uploadToDrive
              };

              return (
              <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start justify-between group">
                 <div className="flex items-start gap-3">
                    <div className="bg-slate-50 dark:bg-slate-700 p-2.5 rounded-lg text-slate-500 dark:text-slate-400">
                       <FileText className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="font-bold text-slate-800 dark:text-white text-sm">{clientDoc.name}</p>
                       <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                             {clientDoc.type === 'poa' ? 'توكيل' : clientDoc.type === 'national_id' ? 'بطاقة هوية' : 'مستند'}
                          </span>
                          {clientDoc.uploadedToDrive && (
                             <span className="text-[10px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Cloud className="w-3 h-3" />
                                Google Drive
                             </span>
                          )}
                          {clientDoc.expiryDate && (
                             <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${new Date(clientDoc.expiryDate) < new Date() ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                {new Date(clientDoc.expiryDate) < new Date() ? 'منتهي' : 'ساري'}
                             </span>
                          )}
                          {clientDoc.issueDate && clientDoc.type === 'poa' && (
                             <span className="text-[10px] text-slate-400">إصدار: {clientDoc.issueDate}</span>
                          )}
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-1">
                 {clientDoc.uploadedToDrive ? (
                    <>
                       <a 
                          href={clientDoc.driveLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="معاينة في Google Drive"
                       >
                          <Eye className="w-4 h-4" />
                       </a>
                       <a 
                          href={clientDoc.driveContentLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="تحميل من Google Drive"
                       >
                          <Download className="w-4 h-4" />
                       </a>
                    </>
                 ) : (
                    <a href={clientDoc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg">
                       <Eye className="w-4 h-4" />
                    </a>
                 )}
              </div>
              </div>
           );
           })}
           {[...(client.documents || []), ...(client.poaFiles || [])].length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                 <File className="w-10 h-10 mx-auto mb-2 opacity-50" />
                 <p>لا توجد مستندات مرفقة</p>
              </div>
           )}
        </div>
     </div>
  );

  const renderFinanceTab = () => (
     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
           <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-600" />
              كشف حساب الموكل
           </h3>
           <div className="text-sm">
              <span className="text-slate-500 dark:text-slate-400 ml-2">إجمالي المتبقي:</span>
              <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded">{totalDues.toLocaleString()} ج.م</span>
           </div>
        </div>
        <table className="w-full text-sm text-right">
           <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-600">
              <tr>
                 <th className="p-4">القضية</th>
                 <th className="p-4">قيمة الأتعاب</th>
                 <th className="p-4">المدفوع</th>
                 <th className="p-4">المصروفات</th>
                 <th className="p-4">المتبقي</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {clientCases.map(c => {
                 if (!c.finance) return null;
                 const remaining = c.finance.agreedFees - c.finance.paidAmount;
                 return (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">
                       <td className="p-4 font-medium">{c.title}</td>
                       <td className="p-4">{c.finance.agreedFees.toLocaleString()}</td>
                       <td className="p-4 text-green-700 dark:text-green-400">{c.finance.paidAmount.toLocaleString()}</td>
                       <td className="p-4 text-amber-700 dark:text-amber-400">{c.finance.expenses.toLocaleString()}</td>
                       <td className={`p-4 font-bold ${remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                          {remaining > 0 ? remaining.toLocaleString() : 'خالص'}
                       </td>
                    </tr>
                 )
              })}
           </tbody>
        </table>
     </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Top Nav */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
        <ArrowRight className="w-4 h-4" /> <span>عودة لقائمة الموكلين</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* 2. Sidebar Profile */}
         <div>{renderSidebar()}</div>
         
         {/* 3. Main Content Area */}
         <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1 flex">
               {[
                  { id: 'overview', label: 'نظرة عامة', icon: Briefcase },
                  { id: 'cases', label: 'القضايا', icon: FileText },
                  { id: 'documents', label: 'المستندات', icon: File },
                  { id: 'finance', label: 'الحسابات', icon: Wallet },
               ].map(tab => {
                  const Icon = tab.icon;
                  return (
                     <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-slate-800 dark:bg-slate-700 text-white shadow' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                     >
                        <Icon className="w-4 h-4" /> {tab.label}
                     </button>
                  )
               })}
            </div>

            <div className="min-h-[400px]">
               {activeTab === 'overview' && renderOverviewTab()}
               {activeTab === 'cases' && renderCasesTab()}
               {activeTab === 'documents' && renderDocumentsTab()}
               {activeTab === 'finance' && renderFinanceTab()}
            </div>
         </div>
      </div>

      {/* WhatsApp Template Modal */}
      {isMsgModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center rounded-t-xl">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                     <MessageCircle className="w-5 h-5 text-green-600" />
                     مراسلة الموكل (واتساب)
                  </h3>
                  <button onClick={() => setIsMsgModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
               </div>
               
               <div className="p-6 space-y-4">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">اختر نموذج الرسالة</label>
                     <div className="grid grid-cols-2 gap-2">
                        {[
                           { id: 'session_reminder', label: 'تذكير بجلسة', icon: Calendar },
                           { id: 'payment_request', label: 'مطالبة مالية', icon: Wallet },
                           { id: 'case_update', label: 'تحديث في قضية', icon: Briefcase },
                           { id: 'welcome', label: 'رسالة ترحيب', icon: User },
                        ].map(tmpl => (
                           <button
                              key={tmpl.id}
                              onClick={() => setSelectedTemplate(tmpl.id)}
                              className={`p-3 rounded-lg border text-sm font-bold flex items-center gap-2 transition-all ${
                                 selectedTemplate === tmpl.id 
                                 ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                                 : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                              }`}
                           >
                              <tmpl.icon className="w-4 h-4" /> {tmpl.label}
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                     <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">معاينة نص الرسالة</label>
                     <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                        {decodeURIComponent(generateMessage(selectedTemplate))}
                     </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                     <button onClick={() => setIsMsgModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">إلغاء</button>
                     {!readOnly && <button 
                        onClick={openWhatsApp}
                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 dark:shadow-none transition-all"
                     >
                        <Send className="w-4 h-4" /> إرسال عبر واتساب
                     </button>}
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* Edit Client Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">تعديل بيانات الموكل</h3>
              <form onSubmit={handleSaveClient} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" required disabled={readOnly} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الموكل</label>
                        <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={readOnly}>
                           <option value={ClientType.INDIVIDUAL}>فرد</option>
                           <option value={ClientType.COMPANY}>شركة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الحالة</label>
                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={readOnly}>
                           <option value={ClientStatus.ACTIVE}>نشط</option>
                           <option value={ClientStatus.INACTIVE}>موقوف</option>
                        </select>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الرقم القومي / السجل</label>
                    <input type="text" value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" required disabled={readOnly} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="رقم الهاتف" required dir="ltr" disabled={readOnly} />
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="البريد الإلكتروني" dir="ltr" disabled={readOnly} />
                 </div>
                 <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="العنوان" disabled={readOnly} />
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ انتهاء التوكيل</label>
                    <input 
                       type="date" 
                       value={formData.poaExpiry ? new Date(formData.poaExpiry).toISOString().split('T')[0] : ''} 
                       onChange={e => setFormData({...formData, poaExpiry: e.target.value})} 
                       className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                       disabled={readOnly}
                    />
                 </div>
                 <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="ملاحظات..." rows={3} disabled={readOnly}></textarea>
                 
                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg">إلغاء</button>
                    {!readOnly && <button type="submit" className="flex-1 bg-primary-600 text-white p-2 rounded-lg">حفظ</button>}
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Upload Doc Modal */}
      {isDocModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
               <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">إضافة مستند جديد</h3>
               <div className="space-y-3">
                  <select value={newDocData.type} onChange={e => setNewDocData({...newDocData, type: e.target.value as any})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={readOnly}>
                     <option value="national_id">بطاقة رقم قومي</option>
                     <option value="poa">توكيل</option>
                     <option value="commercial_register">سجل تجاري</option>
                     <option value="contract">عقد</option>
                     <option value="other">أخرى</option>
                  </select>
                  
                  {/* Additional Dates for POA */}
                  {newDocData.type === 'poa' && (
                     <div className="grid grid-cols-2 gap-3 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 animate-in fade-in">
                        <div>
                           <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">تاريخ الإصدار</label>
                           <input 
                              type="date" 
                              className="w-full border p-1.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                              value={newDocData.issueDate || ''}
                              onChange={e => setNewDocData({...newDocData, issueDate: e.target.value})}
                              disabled={readOnly}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">تاريخ الانتهاء</label>
                           <input 
                              type="date" 
                              className="w-full border p-1.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                              value={newDocData.expiryDate || ''}
                              onChange={e => setNewDocData({...newDocData, expiryDate: e.target.value})}
                              disabled={readOnly}
                           />
                        </div>
                        <div className="col-span-2 text-[10px] text-amber-600 dark:text-amber-500">
                           * سيتم تفعيل التنبيهات تلقائياً قبل انتهاء التوكيل بأسبوع.
                        </div>
                     </div>
                  )}

                  <input type="text" placeholder="اسم المستند (مثال: توكيل عام 2024)" value={newDocData.name} onChange={e => setNewDocData({...newDocData, name: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" disabled={readOnly} />
                  <textarea placeholder="ملاحظات..." value={newDocData.notes || ''} onChange={e => setNewDocData({...newDocData, notes: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" rows={2} disabled={readOnly}></textarea>
                  
                  {/* Google Drive Upload Option */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                           type="checkbox" 
                           checked={newDocData.uploadToDrive || false} 
                           onChange={e => setNewDocData({...newDocData, uploadToDrive: e.target.checked})}
                           className="w-4 h-4 text-blue-600 rounded border-blue-300 focus:ring-blue-500"
                           disabled={readOnly}
                        />
                        <div className="flex items-center gap-2">
                           <Cloud className="w-4 h-4 text-blue-600" />
                           <span className="text-sm font-medium text-blue-700 dark:text-blue-300">رفع إلى Google Drive</span>
                        </div>
                     </label>
                     <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 mr-6">
                        سيتم حفظ المستند في Google Drive والوصول إليه من أي جهاز
                     </p>
                  </div>
                  
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleDocFileSelect} />
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                     {selectedFile ? (
                        <p className="text-primary-600 font-bold">{selectedFile.name}</p>
                     ) : (
                        <div className="text-slate-500">
                           <Upload className="w-6 h-6 mx-auto mb-1" />
                           <span className="text-sm">اضغط لاختيار ملف</span>
                        </div>
                     )}
                  </div>
               </div>
               <div className="flex gap-2 mt-4">
                  <button onClick={() => setIsDocModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-lg">إلغاء</button>
                  {!readOnly && <button 
                     onClick={handleSaveDocument} 
                     disabled={!selectedFile || !newDocData.name || isUploadingToDrive} 
                     className="flex-1 bg-primary-600 text-white p-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                     {isUploadingToDrive ? (
                        <>
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           <span>جاري الرفع...</span>
                        </>
                     ) : (
                        <>
                           <Cloud className="w-4 h-4" />
                           <span>رفع المستند</span>
                        </>
                     )}
                  </button>}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default ClientDetails;
