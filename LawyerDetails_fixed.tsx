import React, { useState, useRef } from 'react';
import { Lawyer, Case, LawyerStatus, BarLevel, Hearing, HearingStatus, LawyerDocument } from '../types';
import { 
  User, Phone, Mail, MapPin, Briefcase, Award, DollarSign, Calendar, 
  ArrowRight, FileText, CheckCircle, Clock, AlertCircle, Edit, Upload, 
  FileCheck, Download, Eye, Cloud 
} from 'lucide-react';

interface LawyerDetailsProps {
  lawyerId: string;
  lawyers: Lawyer[];
  cases: Case[];
  hearings?: Hearing[];
  onBack: () => void;
  onCaseClick?: (caseId: string) => void;
  onUpdateLawyer: (lawyer: Lawyer) => void;
  readOnly?: boolean;
}

const LawyerDetails: React.FC<LawyerDetailsProps> = ({ 
  lawyerId, lawyers, cases, hearings, onBack, onCaseClick, onUpdateLawyer, readOnly = false 
}) => {
  const lawyer = lawyers.find(l => l.id === lawyerId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedLawyer, setEditedLawyer] = useState<Lawyer | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents'>('overview');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [newDocData, setNewDocData] = useState<{name: string, type: string, documentType: string, file: File | null, uploadToDrive: boolean}>({ name: '', type: 'pdf', documentType: 'other', file: null, uploadToDrive: true });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  
  if (!lawyer) return <div>Lawyer not found</div>;

  const assignedCases = cases.filter(c => c.assignedLawyerId === lawyer.id);
  const activeCasesCount = assignedCases.filter(c => c.status !== 'مغلقة').length;
  const closedCasesCount = assignedCases.filter(c => c.status === 'مغلقة').length;
  
  const assignedHearings = hearings ? hearings.filter(h => h.assignedLawyerId === lawyer.id) : [];
  const sortedHearings = assignedHearings.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const upcomingHearingsCount = assignedHearings.filter(h => new Date(h.date) > new Date()).length;
  const completedHearingsCount = assignedHearings.filter(h => h.status === HearingStatus.COMPLETED).length;

  // Helper functions
  const getDaysUntilHearing = (date: string) => {
    const hearingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    hearingDate.setHours(0, 0, 0, 0);
    const diffTime = hearingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `مضت ${Math.abs(diffDays)} يوم`;
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    return `بعد ${diffDays} يوم`;
  };

  const getStatusColor = (status: HearingStatus) => {
    switch (status) {
      case HearingStatus.COMPLETED: 
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200';
      case HearingStatus.SCHEDULED: 
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
      case HearingStatus.CANCELLED: 
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-slate-200';
    }
  };

  // Handle edit functions
  const handleEditLawyer = () => {
    setEditedLawyer({ ...lawyer });
    setIsEditing(true);
  };

  const handleSaveLawyer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedLawyer && onUpdateLawyer) {
      onUpdateLawyer(editedLawyer);
      setIsEditing(false);
      setEditedLawyer(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedLawyer(null);
  };

  const handleInputChange = (field: keyof Lawyer, value: any) => {
    if (editedLawyer) {
      setEditedLawyer({ ...editedLawyer, [field]: value });
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
    if (!newDocData.file || !newDocData.name || !onUpdateLawyer) return;

    try {
      let documentData: Partial<LawyerDocument> = {
        id: Math.random().toString(36).substring(2, 9),
        lawyerId: lawyer.id,
        documentType: newDocData.documentType as any,
        documentName: newDocData.name,
        documentUrl: '',
        uploadDate: new Date().toISOString(),
        uploadedBy: 'المحامي',
        verified: false
      };

      // إذا تم اختيار التحميل إلى Google Drive
      if (newDocData.uploadToDrive) {
        setIsUploadingToDrive(true);
        
        // التحقق من تسجيل الدخول إلى Google
        // TODO: إضافة خدمة Google Drive للمحامين
        alert('سيتم إضافة رفع Google Drive للمحامين قريباً');
        setIsUploadingToDrive(false);
        return;
      }

      // إضافة المستند إلى قائمة المستندات
      const updatedDocuments = [...(lawyer.documents || []), documentData as LawyerDocument];
      onUpdateLawyer({
        ...lawyer,
        documents: updatedDocuments
      });

      // إغلاق النافذة وإعادة تعيين البيانات
      setIsDocModalOpen(false);
      setNewDocData({ name: '', type: 'pdf', documentType: 'other', file: null, uploadToDrive: true });
      
    } catch (error) {
      console.error('Error saving document:', error);
      setIsUploadingToDrive(false);
      alert('حدث خطأ أثناء حفظ المستند. يرجى المحاولة مرة أخرى.');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('image')) return <FileText className="w-8 h-8 text-purple-500" />;
    return <FileText className="w-8 h-8 text-slate-400" />;
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'cv': return 'السيرة الذاتية';
      case 'certificate': return 'شهادة';
      case 'license': return 'رخصة';
      case 'contract': return 'عقد';
      default: return 'أخرى';
    }
  };

  // Advanced statistics
  const hearingsStats = {
    total: assignedHearings.length,
    thisMonth: assignedHearings.filter(h => {
      const hearingDate = new Date(h.date);
      const now = new Date();
      return hearingDate.getMonth() === now.getMonth() && 
             hearingDate.getFullYear() === now.getFullYear();
    }).length,
    completed: completedHearingsCount,
    upcoming: upcomingHearingsCount,
    completionRate: assignedHearings.length > 0 
      ? Math.round((completedHearingsCount / assignedHearings.length) * 100) 
      : 0
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="رجوع"
          >
            <ArrowRight className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{lawyer.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${lawyer.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
              {lawyer.status === 'active' ? 'نشط' : 'غير نشط'} • {lawyer.barNumber || 'غير محدد'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              درجة القيد: {lawyer.barLevel || 'غير محدد'}
            </p>
            {lawyer.barRegistrationNumber && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                القيد في النقابة: {lawyer.barRegistrationNumber}
              </p>
            )}
          </div>
        </div>
        {!readOnly && (
          <button
            onClick={handleEditLawyer}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            title="تعديل بيانات المحامي"
          >
            <Edit className="w-4 h-4" />
            تعديل
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-1">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: User },
            { id: 'documents', label: 'المستندات', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'documents')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-3xl mb-4">
                  {lawyer.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{lawyer.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{lawyer.specialization}</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <Phone className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">رقم الهاتف</p>
                    <p className="font-bold text-slate-800 dark:text-white">{lawyer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">البريد الإلكتروني</p>
                    <p className="font-bold text-slate-800 dark:text-white">{lawyer.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <MapPin className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">الموقع</p>
                    <p className="font-bold text-slate-800 dark:text-white">{lawyer.officeLocation || 'غير محدد'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">الراتب</p>
                    <p className="font-bold text-slate-800 dark:text-white">{(lawyer.hourlyRate || 0).toLocaleString()} EGP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats & Cases */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي القضايا</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">{assignedCases.length}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">قضايا نشطة</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">{activeCasesCount}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-full">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">قضايا مغلقة</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">{closedCasesCount}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">الجلسات المسندة</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">{assignedHearings.length}</p>
                </div>
              </div>
            </div>

            {/* Advanced Hearing Statistics */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-slate-500" /> إحصائيات الجلسات
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{hearingsStats.total}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي الجلسات</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{hearingsStats.thisMonth}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">هذا الشهر</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{hearingsStats.completed}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">مكتملة</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{hearingsStats.completionRate}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">نسبة الإنجاز</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Cases List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500" /> الجلسات المسندة
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {sortedHearings.length > 0 ? sortedHearings.map(h => {
                  const relatedCase = cases.find(c => c.id === h.caseId);
                  return (
                    <div key={h.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 dark:text-white text-sm">{relatedCase?.title || 'قضية غير معروفة'}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{h.date} {h.time ? `• ${h.time}` : ''}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{h.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(h.status)}`}>
                            {h.status}
                          </span>
                          {onCaseClick && (
                            <button 
                              onClick={() => onCaseClick(h.caseId)}
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs hover:bg-indigo-200 transition-colors"
                              title="فتح القضية"
                            >
                              <FileText className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {getDaysUntilHearing(h.date)}
                        </span>
                        {h.requirements && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs" title={h.requirements}>
                            {h.requirements}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-8 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">لا توجد جلسات مسندة حالياً</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assigned Cases List */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-slate-500" /> القضايا المسندة
                </h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {assignedCases.length > 0 ? assignedCases.map(c => (
                  <div key={c.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">{c.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.caseNumber} • {c.court}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        c.status === 'مغلقة' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' : 
                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {c.status}
                      </span>
                      {onCaseClick && (
                        <button 
                          onClick={() => onCaseClick(c.id)}
                          className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs hover:bg-indigo-200 transition-colors"
                          title="فتح القضية"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-slate-400">
                    <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">لا توجد قضايا مسندة حالياً</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> مستندات المحامي
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">كارنية النقابة، البطاقة الشخصية، الشهادات، والعقود</p>
            </div>
            <button onClick={() => setIsDocModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-none">
              <Upload className="w-4 h-4" /> رفع مستند
            </button>
          </div>

          {lawyer.documents && lawyer.documents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lawyer.documents.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group relative">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors relative">
                      {getFileIcon(doc.documentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate mb-1" title={doc.documentName}>{doc.documentName}</h4>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded">
                        {getDocumentTypeLabel(doc.documentType)}
                      </span>
                      {doc.verified && (
                        <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded mr-1">
                          موثق
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
                    <span>{new Date(doc.uploadDate).toLocaleDateString('ar-EG')}</span>
                    <div className="flex gap-2">
                      {doc.documentUrl && (
                        <a 
                          href={doc.documentUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                          title="معاينة المستند"
                        >
                          <Eye className="w-3 h-3" /> معاينة
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-3">
              <FileCheck className="w-12 h-12 opacity-20" />
              <p>لا توجد مستندات مرفقة لهذا المحامي</p>
              <button onClick={() => setIsDocModalOpen(true)} className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline">اضغط لرفع أول مستند</button>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && editedLawyer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                تعديل بيانات محامي
              </h3>
              <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <AlertCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLawyer} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم رباعي</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                  <input 
                    required
                    type="tel" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.phone}
                    onChange={e => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.email || ''}
                    onChange={e => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم القيد</label>
                  <input 
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.barNumber || ''}
                    onChange={e => handleInputChange('barNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم القيد في النقابة</label>
                  <input 
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.barRegistrationNumber || ''}
                    onChange={e => handleInputChange('barRegistrationNumber', e.target.value)}
                    placeholder="أدخل رقم القيد في النقابة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">درجة القيد بالنقابة</label>
                  <select 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.barLevel || ''}
                    onChange={e => handleInputChange('barLevel', e.target.value)}
                  >
                    <option value="">اختر درجة القيد</option>
                    <option value="general">جدول عام</option>
                    <option value="primary">محاكم ابتدائية</option>
                    <option value="appeal">استئناف عالي ومجلس دولة</option>
                    <option value="cassation">نقض</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المكتب التابع له</label>
                  <input 
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.officeLocation || ''}
                    onChange={e => handleInputChange('officeLocation', e.target.value)}
                    placeholder="أدخل موقع المكتب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الراتب الشهري</label>
                  <input 
                    type="number" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.hourlyRate || 0}
                    onChange={e => handleInputChange('hourlyRate', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التخصص</label>
                  <input 
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={editedLawyer.specialization}
                    onChange={e => handleInputChange('specialization', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      checked={editedLawyer.status === 'active'}
                      onChange={e => handleInputChange('status', e.target.checked ? 'active' : 'inactive')}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">محامي نشط في المكتب</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {isDocModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                رفع مستند جديد
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <AlertCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSaveDocument} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اختر الملف</label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {newDocData.file ? newDocData.file.name : 'اسحب وأفلت الملف هنا أو انقر للاختيار'}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                    >
                      اختر ملف
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المستند</label>
                  <input
                    type="text"
                    required
                    value={newDocData.name}
                    onChange={e => setNewDocData({...newDocData, name: e.target.value})}
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    placeholder="أدخل اسم المستند"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع المستند</label>
                  <select
                    value={newDocData.documentType}
                    onChange={e => setNewDocData({...newDocData, documentType: e.target.value})}
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  >
                    <option value="cv">السيرة الذاتية</option>
                    <option value="certificate">شهادة</option>
                    <option value="license">رخصة</option>
                    <option value="contract">عقد</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      checked={newDocData.uploadToDrive}
                      onChange={e => setNewDocData({...newDocData, uploadToDrive: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">رفع إلى Google Drive</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploadingToDrive}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingToDrive ? 'جاري الرفع...' : 'رفع المستند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LawyerDetails;
