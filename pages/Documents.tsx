import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Case, Client, CaseDocument, ClientDocument, CaseRuling } from '../types';
import { FileText, Search, Filter, FolderOpen, User, Briefcase, File, Gavel, FileCheck, Shield, Download, Eye, ExternalLink, Calendar, Grid, List, Building2, Upload, X, Check, Cloud, Plus, Trash2 } from 'lucide-react';
import CloudDocumentUpload from '../components/CloudDocumentUpload';
import { googleDriveService } from '../services/googleDriveService';

interface DocumentsProps {
  cases: Case[];
  clients: Client[];
  onCaseClick?: (caseId: string) => void;
  onClientClick?: (clientId: string) => void;
  onUpdateCase?: (updatedCase: Case) => void;
  onUpdateClient?: (updatedClient: Client) => void;
  readOnly?: boolean;
}

// Unified Document Interface for View
interface UnifiedDoc {
  id: string;
  uniqueKey: string; // Composite key
  title: string;
  type: string; // pdf, image, etc.
  category: 'legal' | 'admin' | 'evidence' | 'ruling' | 'contract' | 'other';
  categoryLabel: string;
  date: string;
  url?: string;
  sourceType: 'case' | 'client';
  sourceId: string;
  sourceName: string;
  isOriginal?: boolean;
}

const Documents: React.FC<DocumentsProps> = ({ cases, clients, onCaseClick, onClientClick, onUpdateCase, onUpdateClient, readOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'case' | 'client'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // --- Upload Modal State ---
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadData, setUploadData] = useState({
    targetType: 'case' as 'case' | 'client',
    targetId: '',
    name: '',
    type: 'pdf' as string, // For file type (pdf, image, word)
    docType: '' as string, // For specific doc type (contract, poa, etc.)
    isOriginal: false,
    file: null as File | null,
    uploadToDrive: true // Google Drive enabled by default
  });

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

  // --- 1. Data Aggregation Engine ---
  const allDocuments = useMemo(() => {
    const docs: UnifiedDoc[] = [];

    // A. Process Client Documents
    clients.forEach(client => {
      // 1. Generic Documents
      client.documents?.forEach(d => {
        let cat: UnifiedDoc['category'] = 'other';
        let label = 'مستندات عامة';
        
        if (['national_id', 'commercial_register', 'tax_card'].includes(d.type)) { cat = 'admin'; label = 'مستندات هوية'; }
        else if (['poa'].includes(d.type)) { cat = 'legal'; label = 'توكيلات'; }
        else if (['contract'].includes(d.type)) { cat = 'contract'; label = 'عقود'; }

        docs.push({
          id: d.id,
          uniqueKey: `client-${client.id}-${d.id}`,
          title: d.name,
          type: 'file',
          category: cat,
          categoryLabel: label,
          date: d.uploadDate,
          url: d.url,
          sourceType: 'client',
          sourceId: client.id,
          sourceName: client.name,
        });
      });

      // 2. Legacy POAs (if any in mock data)
      client.poaFiles?.forEach(p => {
        docs.push({
          id: p.id,
          uniqueKey: `client-poa-${client.id}-${p.id}`,
          title: p.name,
          type: 'pdf',
          category: 'legal',
          categoryLabel: 'توكيلات',
          date: p.uploadDate,
          url: p.url,
          sourceType: 'client',
          sourceId: client.id,
          sourceName: client.name,
        });
      });
    });

    // B. Process Case Documents
    cases.forEach(c => {
      // 1. Standard Case Documents
      c.documents?.forEach(d => {
        let cat: UnifiedDoc['category'] = 'other';
        let label = 'مستندات القضية';

        if (d.category === 'contract') { cat = 'contract'; label = 'عقود'; }
        else if (d.category === 'ruling') { cat = 'ruling'; label = 'أحكام'; }
        else if (d.category === 'notice') { cat = 'legal'; label = 'إعلانات وإنذارات'; }
        else if (d.category === 'minutes') { cat = 'evidence'; label = 'محاضر'; }

        docs.push({
          id: d.id,
          uniqueKey: `case-${c.id}-${d.id}`,
          title: d.name,
          type: d.type,
          category: cat,
          categoryLabel: label,
          date: d.uploadDate,
          url: d.url,
          sourceType: 'case',
          sourceId: c.id,
          sourceName: c.title, // Or client name if preferred
          isOriginal: d.isOriginal
        });
      });

      // 2. Rulings (that have files)
      c.rulings?.forEach(r => {
        if (r.url) {
          docs.push({
            id: r.id,
            uniqueKey: `case-ruling-${c.id}-${r.id}`,
            title: r.documentName || `ملف حكم: ${r.summary.substring(0, 20)}...`,
            type: 'pdf',
            category: 'ruling',
            categoryLabel: 'أحكام قضائية',
            date: r.date,
            url: r.url,
            sourceType: 'case',
            sourceId: c.id,
            sourceName: c.title,
            isOriginal: true
          });
        }
      });
      
      // 3. Memos (that have files)
      c.memos?.forEach(m => {
        if (m.url) {
          docs.push({
            id: m.id,
            uniqueKey: `case-memo-${c.id}-${m.id}`,
            title: `مذكرة: ${m.title}`,
            type: 'pdf',
            category: 'legal',
            categoryLabel: 'مذكرات دفاع',
            date: m.submissionDate,
            url: m.url,
            sourceType: 'case',
            sourceId: c.id,
            sourceName: c.title,
          });
        }
      });
    });

    return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cases, clients]);

  // --- 2. Filtering Logic ---
  const filteredDocs = allDocuments.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.sourceName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || doc.category === activeCategory;
    const matchesSource = sourceFilter === 'all' || doc.sourceType === sourceFilter;
    
    return matchesSearch && matchesCategory && matchesSource;
  });

  // --- 3. Categories Config ---
  const categories = [
    { id: 'all', label: 'الكل', icon: FolderOpen, count: allDocuments.length },
    { id: 'legal', label: 'أوراق قانونية', icon: Shield, count: allDocuments.filter(d => d.category === 'legal').length },
    { id: 'ruling', label: 'أحكام', icon: Gavel, count: allDocuments.filter(d => d.category === 'ruling').length },
    { id: 'contract', label: 'عقود واتفاقات', icon: FileText, count: allDocuments.filter(d => d.category === 'contract').length },
    { id: 'admin', label: 'مستندات هوية', icon: User, count: allDocuments.filter(d => d.category === 'admin').length },
    { id: 'evidence', label: 'أدلة ومحاضر', icon: FileCheck, count: allDocuments.filter(d => d.category === 'evidence').length },
  ];

  // --- 4. Render Helpers ---
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('image')) return <File className="w-8 h-8 text-purple-500" />;
    if (type.includes('word')) return <FileText className="w-8 h-8 text-blue-500" />;
    return <File className="w-8 h-8 text-slate-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- 5. Upload Handlers ---
  const handleOpenUpload = () => {
    setUploadData({
      targetType: 'case',
      targetId: '',
      name: '',
      type: 'pdf',
      docType: 'other',
      isOriginal: false,
      file: null,
      uploadToDrive: true // Include uploadToDrive
    });
    setIsUploadModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Auto detect type
      let type = 'other';
      if (file.type.includes('pdf')) type = 'pdf';
      else if (file.type.includes('image')) type = 'image';
      else if (file.type.includes('word') || file.type.includes('document')) type = 'word';

      setUploadData(prev => ({
        ...prev,
        file: file,
        name: prev.name || file.name,
        type: type
      }));
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadData.file || !uploadData.name || !uploadData.targetId) return;

    try {
      let fileUrl = '';
      const date = new Date().toISOString().split('T')[0];
      const size = formatFileSize(uploadData.file.size);

      // Google Drive Upload
      if (uploadData.uploadToDrive) {
        setIsUploadingToDrive(true);
        
        // Check if signed in to Google
        if (!googleDriveService.isSignedIn()) {
          await googleDriveService.signIn();
        }

        // Get target name for folder
        const targetName = uploadData.targetType === 'case' 
          ? cases.find(c => c.id === uploadData.targetId)?.title || 'قضية'
          : clients.find(c => c.id === uploadData.targetId)?.name || 'موكل';

        // Upload to Google Drive
        const driveResponse = await googleDriveService.uploadFile(
          uploadData.file, 
          targetName
        );
        
        console.log('Google Drive response:', driveResponse);
        fileUrl = driveResponse.webViewLink;
        setIsUploadingToDrive(false);
      } else {
        // Local upload
        fileUrl = URL.createObjectURL(uploadData.file);
      }

      // Save to case or client
      if (uploadData.targetType === 'case' && onUpdateCase) {
         const targetCase = cases.find(c => c.id === uploadData.targetId);
         if (targetCase) {
            const newDoc: CaseDocument = {
               id: Math.random().toString(36).substring(2, 9),
               name: uploadData.name,
               type: uploadData.type as any,
               category: uploadData.docType as any,
               url: fileUrl,
               size: size,
               uploadDate: date,
               isOriginal: uploadData.isOriginal,
               uploadedToDrive: uploadData.uploadToDrive,
               driveFileId: uploadData.uploadToDrive ? undefined : undefined,
               driveLink: uploadData.uploadToDrive ? fileUrl : undefined,
               driveContentLink: uploadData.uploadToDrive ? fileUrl : undefined
            };
            onUpdateCase({ ...targetCase, documents: [...(targetCase.documents || []), newDoc] });
         }
      } else if (uploadData.targetType === 'client' && onUpdateClient) {
         const targetClient = clients.find(c => c.id === uploadData.targetId);
         if (targetClient) {
            const newDoc: ClientDocument = {
               id: Math.random().toString(36).substring(2, 9),
               name: uploadData.name,
               type: uploadData.docType as any,
               url: fileUrl,
               uploadDate: date,
               uploadedToDrive: uploadData.uploadToDrive,
               driveFileId: uploadData.uploadToDrive ? undefined : undefined,
               driveLink: uploadData.uploadToDrive ? fileUrl : undefined,
               driveContentLink: uploadData.uploadToDrive ? fileUrl : undefined
            };
            onUpdateClient({ ...targetClient, documents: [...(targetClient.documents || []), newDoc] });
         }
      }

      setIsUploadModalOpen(false);
      alert('تم حفظ المستند بنجاح!');
    } catch (error) {
      console.error('Error saving document:', error);
      setIsUploadingToDrive(false);
      alert('حدث خطأ أثناء حفظ المستند. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
      
      {/* Sidebar Filters */}
      <div className="w-full md:w-64 shrink-0 space-y-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500" /> تصنيف المستندات
           </h3>
           <div className="space-y-1">
              {categories.map(cat => (
                 <button
                   key={cat.id}
                   onClick={() => setActiveCategory(cat.id)}
                   className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${
                     activeCategory === cat.id 
                       ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-bold' 
                       : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                   }`}
                 >
                    <div className="flex items-center gap-3">
                       <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                       <span>{cat.label}</span>
                    </div>
                    <span className="bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full border border-slate-100 dark:border-slate-600">
                       {cat.count}
                    </span>
                 </button>
              ))}
           </div>
        </div>

        {/* Source Filter */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
           <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm">حسب المصدر</h3>
           <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                 <input type="radio" name="source" checked={sourceFilter === 'all'} onChange={() => setSourceFilter('all')} className="text-primary-600 dark:text-primary-400" />
                 <span>جميع المصادر</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                 <input type="radio" name="source" checked={sourceFilter === 'client'} onChange={() => setSourceFilter('client')} className="text-primary-600 dark:text-primary-400" />
                 <span>العملاء فقط</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                 <input type="radio" name="source" checked={sourceFilter === 'case'} onChange={() => setSourceFilter('case')} className="text-primary-600 dark:text-primary-400" />
                 <span>القضايا فقط</span>
              </label>
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
         {/* Top Bar */}
         <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800">
            <div className="relative w-full sm:w-96">
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
               <input 
                 type="text" 
                 placeholder="بحث باسم المستند، الموكل، أو القضية..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:border-primary-500 text-slate-900 dark:text-white"
               />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <div className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg flex overflow-hidden">
                  <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                     <Grid className="w-5 h-5" />
                  </button>
                  <div className="w-px bg-slate-300 dark:bg-slate-600"></div>
                  <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-600 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                     <List className="w-5 h-5" />
                  </button>
               </div>
               
               <button 
                  onClick={handleOpenUpload}
                  className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-700 shadow-sm transition-colors" 
                  title="رفع مستند جديد"
               >
                  <Upload className="w-4 h-4" /> رفع جديد
               </button>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
            {/* Tab Navigation - Local Documents Only */}
            <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
               <button
                  className="pb-3 px-1 font-medium text-sm transition-colors border-b-2 text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400"
               >
                  <FolderOpen className="w-4 h-4 inline ml-2" />
                  مستندات القضايا
               </button>
            </div>

            {/* Tab Content - Case Documents Only */}
            {filteredDocs.length > 0 ? (
               viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {filteredDocs.map(doc => (
                        <div key={doc.uniqueKey} className="group bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative">
                           {doc.isOriginal && (
                              <div className="absolute top-2 left-2 text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-bold z-10">
                                 أصل
                              </div>
                           )}
                           
                           <div className="flex items-start gap-4 mb-3">
                              <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 transition-colors">
                                 {getFileIcon(doc.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate mb-1" title={doc.title}>
                                    {doc.title}
                                 </h4>
                                 <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
                                    {doc.categoryLabel}
                                 </span>
                              </div>
                           </div>

                           <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-4 pt-3 border-t border-slate-50 dark:border-slate-700">
                              <div className="flex items-center gap-1.5 truncate">
                                 {doc.sourceType === 'case' ? <Briefcase className="w-3 h-3 text-indigo-500" /> : <User className="w-3 h-3 text-green-500" />}
                                 <span 
                                    className="cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 hover:underline truncate"
                                    onClick={() => doc.sourceType === 'case' ? onCaseClick && onCaseClick(doc.sourceId) : onClientClick && onClientClick(doc.sourceId)}
                                 >
                                    {doc.sourceName}
                                 </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                 <Calendar className="w-3 h-3 text-slate-400" />
                                 <span>{doc.date}</span>
                              </div>
                           </div>

                           <div className="flex gap-2">
                              {doc.url && (
                                 <a 
                                    href={doc.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex-1 flex items-center justify-center gap-2 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                 >
                                    <Eye className="w-3 h-3" /> معاينة
                                 </a>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                     <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 font-bold">
                           <tr>
                              <th className="p-3">اسم المستند</th>
                              <th className="p-3">التصنيف</th>
                              <th className="p-3">المصدر (القضية/الموكل)</th>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">الإجراءات</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                           {filteredDocs.map(doc => (
                              <tr key={doc.uniqueKey} className="hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200">
                                 <td className="p-3">
                                    <div className="flex items-center gap-3">
                                       {getFileIcon(doc.type)}
                                       <div>
                                          <p className="font-bold">{doc.title}</p>
                                          {doc.isOriginal && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">نسخة أصلية</span>}
                                       </div>
                                    </div>
                                 </td>
                                 <td className="p-3">
                                    <span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{doc.categoryLabel}</span>
                                 </td>
                                 <td className="p-3">
                                     <div className="flex items-center gap-2">
                                       {doc.sourceType === 'case' ? <Briefcase className="w-3 h-3 text-indigo-500" /> : <User className="w-3 h-3 text-green-500" />}
                                       <span 
                                          className="cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 hover:underline font-medium"
                                          onClick={() => doc.sourceType === 'case' ? onCaseClick && onCaseClick(doc.sourceId) : onClientClick && onClientClick(doc.sourceId)}
                                       >
                                          {doc.sourceName}
                                       </span>
                                    </div>
                                 </td>
                                 <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{doc.date}</td>
                                 <td className="p-3">
                                    {doc.url && (
                                       <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline text-xs font-bold flex items-center gap-1">
                                          <ExternalLink className="w-3 h-3" /> فتح
                                       </a>
                                    )}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <FolderOpen className="w-16 h-16 opacity-20 mb-4" />
                  <p className="text-lg font-medium">لا توجد مستندات تطابق البحث</p>
                  <p className="text-sm">جرب تغيير الفلاتر أو البحث بكلمات أخرى</p>
               </div>
            )}
         </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">رفع مستند جديد</h3>
                  <button onClick={() => setIsUploadModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
               </div>
               
               <form onSubmit={handleSaveDocument} className="p-6 space-y-4">
                  {/* Target Selection */}
                  <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                     <button
                        type="button"
                        onClick={() => { setUploadData({ ...uploadData, targetType: 'case', targetId: '', docType: 'contract' }); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${uploadData.targetType === 'case' ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                     >
                        <Briefcase className="w-4 h-4 inline-block ml-2" /> خاص بقضية
                     </button>
                     <button
                        type="button"
                        onClick={() => { setUploadData({ ...uploadData, targetType: 'client', targetId: '', docType: 'national_id' }); }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${uploadData.targetType === 'client' ? 'bg-white dark:bg-slate-600 text-green-600 dark:text-green-300 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                     >
                        <User className="w-4 h-4 inline-block ml-2" /> خاص بموكل
                     </button>
                  </div>

                  {/* Target Dropdown */}
                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {uploadData.targetType === 'case' ? 'اختر القضية' : 'اختر الموكل'} <span className="text-red-500">*</span>
                     </label>
                     <select
                        required
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                        value={uploadData.targetId}
                        onChange={e => setUploadData({ ...uploadData, targetId: e.target.value })}
                     >
                        <option value="">-- اختر --</option>
                        {uploadData.targetType === 'case' 
                           ? cases.map(c => <option key={c.id} value={c.id}>{c.title} - {c.caseNumber}</option>)
                           : clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        }
                     </select>
                  </div>

                  {/* File Upload Area */}
                  <div 
                     onClick={() => fileInputRef.current?.click()}
                     className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${uploadData.file ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                     <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                     {uploadData.file ? (
                        <div className="flex flex-col items-center gap-2">
                           <FileCheck className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                           <p className="text-sm font-bold text-slate-800 dark:text-white">{uploadData.file.name}</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(uploadData.file.size)}</p>
                        </div>
                     ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                           <Upload className="w-8 h-8 opacity-50" />
                           <p className="text-sm font-medium">اضغط لاختيار ملف من جهازك</p>
                           <p className="text-xs">PDF, Word, Images</p>
                        </div>
                     )}
                  </div>

                  {/* Google Drive Option */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                           type="checkbox" 
                           checked={uploadData.uploadToDrive}
                           onChange={e => setUploadData({...uploadData, uploadToDrive: e.target.checked})}
                           className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                           الرفع على Google Drive
                        </span>
                     </label>
                     {isUploadingToDrive && (
                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                           <div className="animate-spin w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                           جاري الرفع...
                        </div>
                     )}
                  </div>

                  {/* Document Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المستند</label>
                        <input 
                           type="text" 
                           required
                           className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                           value={uploadData.name}
                           onChange={e => setUploadData({ ...uploadData, name: e.target.value })}
                           placeholder="مثال: عقد بيع ابتدائي"
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التصنيف</label>
                        <select
                           className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                           value={uploadData.docType}
                           onChange={e => setUploadData({ ...uploadData, docType: e.target.value })}
                        >
                           {uploadData.targetType === 'case' ? (
                              <>
                                 <option value="contract">عقد</option>
                                 <option value="ruling">حكم</option>
                                 <option value="notice">إعلان/إنذار</option>
                                 <option value="minutes">محضر</option>
                                 <option value="other">عام</option>
                              </>
                           ) : (
                              <>
                                 <option value="national_id">بطاقة هوية</option>
                                 <option value="poa">توكيل</option>
                                 <option value="commercial_register">سجل تجاري</option>
                                 <option value="contract">عقد</option>
                                 <option value="other">أخرى</option>
                              </>
                           )}
                        </select>
                     </div>
                  </div>

                  {uploadData.targetType === 'case' && (
                     <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <input type="checkbox" checked={uploadData.isOriginal} onChange={e => setUploadData({ ...uploadData, isOriginal: e.target.checked })} className="rounded text-primary-600 focus:ring-primary-500" />
                        نسخة أصلية
                     </label>
                  )}

                  {/* Footer Actions */}
                  <div className="pt-2 flex gap-3">
                     <button type="button" onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold">إلغاء</button>
                     <button 
                        type="submit" 
                        disabled={!uploadData.file || !uploadData.name || !uploadData.targetId || isUploadingToDrive} 
                        className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        {isUploadingToDrive ? (
                           <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                              جاري الرفع على Google Drive...
                           </>
                        ) : (
                           <>
                              {uploadData.uploadToDrive ? <Cloud className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                              حفظ المستند
                           </>
                        )}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Documents;
