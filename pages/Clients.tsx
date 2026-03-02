
import React, { useState } from 'react';
import { Client, Case, Hearing, ClientType, ClientStatus } from '../types';
import { User, Phone, MapPin, Search, Plus, X, Save, Mail, FileText, Grid, List, Building2, Filter, Download, MessageCircle, ArrowUpRight, DollarSign, Calendar, FileSpreadsheet, Printer, AlertTriangle, ShieldAlert } from 'lucide-react';

interface ClientsProps {
  clients: Client[];
  cases: Case[];
  hearings: Hearing[];
  onClientClick: (clientId: string) => void;
  onAddClient?: (client: Client) => void;
  onUpdateClient?: (client: Client) => void;
  readOnly?: boolean;
}

const Clients: React.FC<ClientsProps> = ({ clients, cases, hearings, onClientClick, onAddClient, onUpdateClient, readOnly = false }) => {
  // View State
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Export Menu State
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Conflict Check State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [detectedConflicts, setDetectedConflicts] = useState<{caseTitle: string, caseNumber: string, opponentName: string, role: string}[]>([]);

  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    type: ClientType.INDIVIDUAL,
    status: ClientStatus.ACTIVE,
    nationalId: '',
    phone: '',
    address: '',
    email: '',
    notes: ''
  });

  // Derived Data Helpers
  const getClientCaseStats = (clientId: string) => {
    const clientCases = cases.filter(c => c.clientId === clientId);
    const activeCases = clientCases.filter(c => c.status !== 'مغلقة' && c.status !== 'مؤرشفة');
    
    // Calculate dues
    let totalDues = 0;
    clientCases.forEach(c => {
       if (c.finance) {
          totalDues += (c.finance.agreedFees - c.finance.paidAmount);
       }
    });

    // Find next hearing
    const clientCaseIds = clientCases.map(c => c.id);
    const upcomingHearings = hearings
       .filter(h => clientCaseIds.includes(h.caseId) && new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)))
       .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
       totalCases: clientCases.length,
       activeCases: activeCases.length,
       totalDues,
       nextHearing: upcomingHearings[0]
    };
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.includes(searchTerm) || c.nationalId.includes(searchTerm) || c.phone.includes(searchTerm);
    const matchesType = filterType === 'all' || c.type === filterType;
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // --- Export Functions ---

  const handleExportExcel = () => {
    // Define headers
    const headers = ['الاسم', 'النوع', 'الرقم القومي/السجل', 'الهاتف', 'العنوان', 'الحالة', 'عدد القضايا', 'إجمالي المستحقات'];
    
    // Map data
    const rows = filteredClients.map(client => {
      const stats = getClientCaseStats(client.id);
      return [
        `"${client.name}"`, // Quote strings to handle commas
        client.type,
        `"${client.nationalId}"`, // Force string for IDs
        client.phone,
        `"${client.address || ''}"`,
        client.status,
        stats.totalCases,
        stats.totalDues
      ].join(',');
    });

    // Combine with BOM for Arabic support
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Clients_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    // Generate a print-friendly window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rowsHTML = filteredClients.map(client => {
      const stats = getClientCaseStats(client.id);
      return `
        <tr>
          <td>${client.name}</td>
          <td>${client.type}</td>
          <td>${client.nationalId}</td>
          <td>${client.phone}</td>
          <td>${client.status}</td>
          <td>${stats.totalCases}</td>
          <td>${stats.totalDues.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html dir="rtl" lang="ar">
        <head>
          <title>تقرير الموكلين - الميزان</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 20px; }
            h1 { text-align: center; color: #1e293b; margin-bottom: 20px; }
            .meta { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #f1f5f9; color: #334155; font-weight: bold; padding: 10px; border: 1px solid #e2e8f0; text-align: right; }
            td { padding: 8px; border: 1px solid #e2e8f0; color: #0f172a; }
            tr:nth-child(even) { background-color: #f8fafc; }
            @media print {
              .no-print { display: none; }
              table { width: 100%; }
            }
          </style>
        </head>
        <body>
          <h1>تقرير الموكلين</h1>
          <div class="meta">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')} | عدد السجلات: ${filteredClients.length}</div>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>النوع</th>
                <th>الرقم القومي/السجل</th>
                <th>الهاتف</th>
                <th>الحالة</th>
                <th>القضايا</th>
                <th>المديونية (ج.م)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsExportMenuOpen(false);
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      type: ClientType.INDIVIDUAL,
      status: ClientStatus.ACTIVE,
      nationalId: '',
      phone: '',
      address: '',
      email: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // --- Core Save Logic ---
  const saveClientToDatabase = () => {
    if (!onAddClient || !formData.name) return;

    const newClient: Client = {
      id: Math.random().toString(36).substring(2, 9),
      name: formData.name,
      type: formData.type as ClientType,
      status: formData.status as ClientStatus,
      nationalId: formData.nationalId || '',
      phone: formData.phone || '',
      documents: [], // تهيئة مصفوفة المستندات
      secondaryPhone: formData.secondaryPhone || undefined,
      address: formData.address || undefined,
      email: formData.email || undefined,
      notes: formData.notes || undefined,
      nationality: formData.nationality || undefined,
      dateOfBirth: formData.dateOfBirth || undefined,
      companyRepresentative: formData.companyRepresentative || undefined
    };
    
    onAddClient(newClient);
    setIsModalOpen(false);
    setIsConflictModalOpen(false);
    setDetectedConflicts([]);
  };

  // --- Submit Handler with Conflict Check ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.nationalId) {
       alert('يرجى إدخال الاسم ورقم الهاتف والرقم التعريفي');
       return;
    }

    // 1. Conflict of Interest Check
    const newName = formData.name.trim();
    const conflicts: any[] = [];

    cases.forEach(c => {
      c.opponents?.forEach(opp => {
        // Check overlap (Exact match or Includes)
        if (opp.name.includes(newName) || newName.includes(opp.name)) {
          conflicts.push({
            caseTitle: c.title,
            caseNumber: c.caseNumber,
            opponentName: opp.name,
            role: opp.role
          });
        }
      });
    });

    if (conflicts.length > 0) {
      setDetectedConflicts(conflicts);
      setIsConflictModalOpen(true);
    } else {
      // No conflicts, proceed to save
      saveClientToDatabase();
    }
  };

  const handleWhatsApp = (phone: string) => {
     window.open(`https://wa.me/2${phone}`, '_blank');
  };

  const handleCall = (phone: string) => {
     window.open(`tel:${phone}`);
  };

  // --- Render Functions ---

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredClients.map(client => {
        const stats = getClientCaseStats(client.id);
        const hasDues = stats.totalDues > 0;
        
        return (
          <div key={client.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group relative overflow-hidden">
             {/* Status Stripe */}
             <div className={`absolute top-0 left-0 w-1 h-full ${client.status === ClientStatus.ACTIVE ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
             
             <div className="p-5 pl-7">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${client.type === ClientType.COMPANY ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                         {client.type === ClientType.COMPANY ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                      </div>
                      <div>
                         <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{client.name}</h3>
                         <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{client.type === ClientType.COMPANY ? 'س.ت:' : 'ID:'} {client.nationalId}</span>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${client.status === ClientStatus.ACTIVE ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                         {client.status}
                      </span>
                   </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                   <div className="bg-slate-50 dark:bg-slate-700 p-2 rounded-lg border border-slate-100 dark:border-slate-600">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/> القضايا</p>
                      <p className="font-bold text-slate-800 dark:text-white">{stats.activeCases} <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">/ {stats.totalCases}</span></p>
                   </div>
                   <div className={`p-2 rounded-lg border ${hasDues ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'}`}>
                      <p className={`text-xs mb-1 flex items-center gap-1 ${hasDues ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}><DollarSign className="w-3 h-3"/> المستحقات</p>
                      <p className={`font-bold ${hasDues ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>{stats.totalDues > 0 ? stats.totalDues.toLocaleString() : 'خالص'}</p>
                   </div>
                </div>

                {/* Next Hearing (If any) */}
                {stats.nextHearing && (
                   <div className="mb-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 rounded-lg p-2 flex items-center gap-2 text-xs text-amber-900 dark:text-amber-300">
                      <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>جلسة قادمة: <span className="font-bold">{stats.nextHearing.date}</span></span>
                   </div>
                )}

                {/* Actions Bar */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                   <button onClick={() => onClientClick(client.id)} className="flex-1 bg-slate-800 dark:bg-slate-700 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">
                      <ArrowUpRight className="w-4 h-4" /> فتح الملف
                   </button>
                   <div className="flex gap-1">
                      <button onClick={() => handleCall(client.phone)} className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-blue-600 rounded-lg transition-colors" title="اتصال">
                         <Phone className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleWhatsApp(client.phone)} className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 rounded-lg transition-colors" title="واتساب">
                         <MessageCircle className="w-4 h-4" />
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )
      })}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
       <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
             <tr>
                <th className="p-4">الموكل</th>
                <th className="p-4">رقم التعريف</th>
                <th className="p-4">الهاتف</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">القضايا (نشط/كلي)</th>
                <th className="p-4">المديونية</th>
                <th className="p-4">الإجراءات</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
             {filteredClients.map(client => {
                const stats = getClientCaseStats(client.id);
                return (
                   <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 group text-slate-800 dark:text-slate-200">
                      <td className="p-4 font-bold flex items-center gap-2">
                         {client.type === ClientType.COMPANY ? <Building2 className="w-4 h-4 text-slate-400"/> : <User className="w-4 h-4 text-slate-400"/>}
                         {client.name}
                      </td>
                      <td className="p-4 font-mono text-slate-500 dark:text-slate-400">{client.nationalId}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-400" dir="ltr">{client.phone}</td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-xs font-bold ${client.status === ClientStatus.ACTIVE ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {client.status}
                         </span>
                      </td>
                      <td className="p-4 text-center">
                         <span className="font-bold">{stats.activeCases}</span>
                         <span className="text-slate-400 dark:text-slate-500 text-xs"> / {stats.totalCases}</span>
                      </td>
                      <td className="p-4 font-bold text-red-600 dark:text-red-400">
                         {stats.totalDues > 0 ? stats.totalDues.toLocaleString() : '-'}
                      </td>
                      <td className="p-4">
                         <button onClick={() => onClientClick(client.id)} className="text-primary-600 dark:text-primary-400 hover:underline font-bold text-xs">عرض الملف</button>
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
       {/* 1. Clients Header */}
       <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4">
             <div className="flex items-center gap-2">
                <div className="bg-indigo-600 p-2 rounded-lg text-white">
                   <User className="w-6 h-6" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-slate-800 dark:text-white">إدارة الموكلين</h2>
                   <p className="text-xs text-slate-500 dark:text-slate-400">قاعدة بيانات العملاء ({clients.length} موكل)</p>
                </div>
             </div>
             
             <div className="flex gap-2 w-full lg:w-auto relative">
                {/* Export Dropdown */}
                <div className="relative">
                   <button 
                     onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                     className="flex-1 lg:flex-none flex items-center gap-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 text-sm font-bold transition-colors"
                   >
                      <Download className="w-4 h-4" /> تصدير
                   </button>
                   
                   {isExportMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 animate-in fade-in slide-in-from-top-2">
                         <button onClick={handleExportExcel} className="w-full text-right px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 border-b border-slate-50 dark:border-slate-700">
                            <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" /> تصدير Excel (CSV)
                         </button>
                         <button onClick={handleExportPDF} className="w-full text-right px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2">
                            <Printer className="w-4 h-4 text-red-600 dark:text-red-400" /> طباعة / PDF
                         </button>
                      </div>
                   )}
                </div>

                {!readOnly && (
                  <button 
                    onClick={handleOpenAddModal}
                    className="flex-1 lg:flex-none flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm"
                  >
                     <Plus className="w-4 h-4" /> إضافة موكل
                  </button>
                )}
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
             <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث باسم الموكل، رقم الهاتف، أو الرقم القومي..."
                  className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:border-primary-500 outline-none transition-all text-slate-900 dark:text-white"
                />
             </div>
             
             <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                <select 
                   value={filterType} 
                   onChange={(e) => setFilterType(e.target.value)} 
                   className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 px-3 rounded-lg text-sm outline-none cursor-pointer hover:border-slate-400"
                >
                   <option value="all">كل الأنواع</option>
                   <option value={ClientType.INDIVIDUAL}>أفراد</option>
                   <option value={ClientType.COMPANY}>شركات</option>
                </select>

                <select 
                   value={filterStatus} 
                   onChange={(e) => setFilterStatus(e.target.value)} 
                   className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 px-3 rounded-lg text-sm outline-none cursor-pointer hover:border-slate-400"
                >
                   <option value="all">كل الحالات</option>
                   <option value={ClientStatus.ACTIVE}>نشط</option>
                   <option value={ClientStatus.INACTIVE}>موقوف/أرشيف</option>
                </select>

                <div className="w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>

                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                   <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                      <Grid className="w-4 h-4" />
                   </button>
                   <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                      <List className="w-4 h-4" />
                   </button>
                </div>
             </div>
          </div>
       </div>

       {/* 2. Clients Content */}
       {viewMode === 'card' ? renderCardView() : renderTableView()}
       
       {filteredClients.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-slate-500">
             <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
             <p>لا توجد نتائج مطابقة للبحث</p>
          </div>
       )}

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white">إضافة موكل جديد</h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الموكل</label>
                       <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as ClientType})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                          <option value={ClientType.INDIVIDUAL}>فرد</option>
                          <option value={ClientType.COMPANY}>شركة</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الحالة</label>
                       <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ClientStatus})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                          <option value={ClientStatus.ACTIVE}>نشط</option>
                          <option value={ClientStatus.INACTIVE}>موقوف</option>
                       </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل / اسم الشركة <span className="text-red-500">*</span></label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                       {formData.type === ClientType.COMPANY ? 'رقم السجل التجاري' : 'الرقم القومي'} <span className="text-red-500">*</span>
                    </label>
                    <input type="text" required value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                 </div>
                 
                 {formData.type === ClientType.COMPANY && (
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم الممثل القانوني</label>
                       <input type="text" value={formData.companyRepresentative || ''} onChange={e => setFormData({...formData, companyRepresentative: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                    </div>
                 )}

                 {formData.type === ClientType.INDIVIDUAL && (
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الجنسية</label>
                          <input type="text" value={formData.nationality || ''} onChange={e => setFormData({...formData, nationality: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" placeholder="مصري" />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الميلاد</label>
                          <input type="date" value={formData.dateOfBirth || ''} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                       </div>
                    </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                       <input type="tel" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" dir="ltr" />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                       <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" dir="ltr" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العنوان</label>
                    <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" />
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">إلغاء</button>
                    <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> حفظ البيانات
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Conflict Warning Modal */}
      {isConflictModalOpen && (
         <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 border-t-4 border-red-500 overflow-hidden">
               <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 flex items-start gap-4">
                  <div className="bg-red-100 dark:bg-red-800 p-3 rounded-full shrink-0">
                     <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-200" />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold text-red-700 dark:text-red-300 mb-1">تحذير: تعارض مصالح محتمل</h3>
                     <p className="text-sm text-red-600 dark:text-red-400">
                        اسم الموكل الذي تحاول إضافته يطابق اسم خصم مسجل في قضايا أخرى.
                     </p>
                  </div>
               </div>

               <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">القضايا التي يظهر فيها الاسم كخصم:</p>
                  <div className="space-y-3">
                     {detectedConflicts.map((conflict, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-mono bg-white dark:bg-slate-600 px-2 py-1 rounded border border-slate-200 dark:border-slate-500">
                                 {conflict.caseNumber}
                              </span>
                              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-bold">
                                 {conflict.role}
                              </span>
                           </div>
                           <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{conflict.caseTitle}</h4>
                           <p className="text-xs text-slate-500 dark:text-slate-400">اسم الخصم المسجل: {conflict.opponentName}</p>
                        </div>
                     ))}
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-400">
                     * يرجى التأكد من أن هذا تشابه أسماء وليس نفس الشخص لتجنب المخالفات القانونية.
                  </div>
               </div>

               <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                  <button 
                     onClick={() => setIsConflictModalOpen(false)} 
                     className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-white dark:hover:bg-slate-700"
                  >
                     إلغاء وإعادة التدقيق
                  </button>
                  <button 
                     onClick={saveClientToDatabase}
                     className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none"
                  >
                     تجاهل التحذير وحفظ
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Clients;
