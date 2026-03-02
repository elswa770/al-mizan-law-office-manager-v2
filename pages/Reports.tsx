
import React, { useState, useMemo, useRef } from 'react';
import { Case, Client, Hearing, Task, CaseStatus, HearingStatus, ReportTemplate, ScheduledReport } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Activity, Scale, Gavel, 
  Users, AlertCircle, Calendar, Printer, Filter, PieChart as PieIcon, Download, Building2, FileText, List,
  Plus, Edit3, Trash2, Clock, Mail, FileSpreadsheet, File as FileIcon, PenTool, CheckCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsProps {
  cases: Case[];
  clients: Client[];
  hearings: Hearing[];
  tasks: Task[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#64748b', '#f97316', '#14b8a6'];

const Reports: React.FC<ReportsProps> = ({ cases, clients, hearings, tasks }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operational' | 'builder' | 'scheduled'>('overview');
  const [dateRange, setDateRange] = useState('year'); // month, year, all
  const reportRef = useRef<HTMLDivElement>(null);

  // --- Report Builder State ---
  const [templates, setTemplates] = useState<ReportTemplate[]>([
    { id: '1', name: 'التقرير الشهري الشامل', type: 'custom', sections: ['financial', 'operational'], createdBy: 'Admin', createdAt: '2024-01-01' },
    { id: '2', name: 'تقرير القضايا المتعثرة', type: 'case', sections: ['cases'], filters: { status: 'stalled' }, createdBy: 'Admin', createdAt: '2024-01-15' }
  ]);
  
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([
    { id: '1', templateId: '1', frequency: 'monthly', recipients: ['manager@almizan.com'], format: 'pdf', nextRun: '2024-03-01', active: true }
  ]);

  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  // --- Signature State ---
  const [signature, setSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);


  // --- 1. Data Aggregation Engines ---

  // A. Financial Metrics
  const financialStats = useMemo(() => {
    let totalAgreed = 0;
    let totalCollected = 0;
    let totalCaseExpenses = 0;
    let monthlyIncome: Record<string, number> = {};

    cases.forEach(c => {
      if (c.finance) {
        totalAgreed += c.finance.agreedFees || 0;
        totalCollected += c.finance.paidAmount || 0;
        totalCaseExpenses += c.finance.expenses || 0;

        // Mock monthly distribution based on payments history
        c.finance.history?.forEach(tx => {
           if (tx.type === 'payment') {
              const month = tx.date.substring(0, 7); // YYYY-MM
              monthlyIncome[month] = (monthlyIncome[month] || 0) + tx.amount;
           }
        });
      }
    });

    const pending = totalAgreed - totalCollected;
    const collectionRate = totalAgreed > 0 ? Math.round((totalCollected / totalAgreed) * 100) : 0;
    
    // Convert monthly income to array for chart
    const incomeTrend = Object.keys(monthlyIncome).sort().map(key => ({
       name: key,
       income: monthlyIncome[key]
    }));

    return { totalAgreed, totalCollected, totalCaseExpenses, pending, collectionRate, incomeTrend };
  }, [cases]);

  // B. Case Metrics
  const caseStats = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const courtCounts: Record<string, number> = {};
    
    cases.forEach(c => {
       statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
       courtCounts[c.court] = (courtCounts[c.court] || 0) + 1;
    });

    const statusData = Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] }));
    const courtData = Object.keys(courtCounts)
      .map(key => ({ name: key, value: courtCounts[key] }))
      .sort((a, b) => b.value - a.value); // Sort descending

    return { statusData, courtData, total: cases.length };
  }, [cases]);

  // C. Operational Metrics (Hearings & Tasks)
  const operationalStats = useMemo(() => {
     const hearingStatusCounts: Record<string, number> = {};
     let totalHearings = hearings.length;
     
     hearings.forEach(h => {
        const status = h.status || 'غير محدد';
        hearingStatusCounts[status] = (hearingStatusCounts[status] || 0) + 1;
     });

     const hearingData = Object.keys(hearingStatusCounts).map(key => ({ name: key, value: hearingStatusCounts[key] }));
     
     const completedTasks = tasks.filter(t => t.status === 'completed').length;
     const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

     return { hearingData, totalHearings, taskCompletionRate };
  }, [hearings, tasks]);


  // --- Export & Signature Handlers ---
  const handleExportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AlMizan_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('حدث خطأ أثناء تصدير التقرير');
    }
  };

  const handleExportExcel = () => {
    // Simple CSV Export Simulation
    const headers = ['Category', 'Value'];
    const rows = [
      ['Total Collected', financialStats.totalCollected],
      ['Active Cases', caseStats.total],
      ['Hearings', hearings.length],
      ['Task Completion', `${operationalStats.taskCompletionRate}%`]
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "report_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportWord = () => {
    // Simple HTML to Word (MHT/HTML) Simulation
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + document.getElementById('report-content')?.innerHTML + footer;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = 'report.doc';
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleSignReport = () => {
    setIsSigning(true);
    // Simulate signature process
    setTimeout(() => {
      setSignature('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png'); // Mock signature
      setIsSigning(false);
    }, 1500);
  };

  // --- Render Functions ---

  const renderBuilderTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">مصمم التقارير المخصص</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">أنشئ قوالب تقارير مخصصة لاحتياجاتك</p>
        </div>
        <button 
          onClick={() => setIsBuilderModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> قالب جديد
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group relative">
            <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <Edit3 className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
              <PenTool className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1">{template.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">تم الإنشاء بواسطة {template.createdBy} • {template.createdAt}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {template.sections.map(sec => (
                <span key={sec} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] rounded-md font-bold">
                  {sec === 'financial' ? 'المالية' : sec === 'operational' ? 'العمليات' : sec === 'cases' ? 'القضايا' : sec}
                </span>
              ))}
            </div>

            <button className="w-full py-2 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
              استخدام القالب
            </button>
          </div>
        ))}
      </div>

      {/* Builder Modal */}
      {isBuilderModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">إنشاء قالب تقرير جديد</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم القالب</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  placeholder="مثال: تقرير الأداء الربع سنوي"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">الأقسام المضمنة</label>
                <div className="space-y-2">
                  {['financial', 'operational', 'cases', 'clients'].map(sec => (
                    <label key={sec} className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                      <input 
                        type="checkbox" 
                        className="accent-indigo-600"
                        checked={selectedSections.includes(sec)}
                        onChange={e => {
                          if (e.target.checked) setSelectedSections([...selectedSections, sec]);
                          else setSelectedSections(selectedSections.filter(s => s !== sec));
                        }}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{sec}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsBuilderModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button 
                  onClick={() => {
                    setTemplates([...templates, {
                      id: Math.random().toString(),
                      name: newTemplateName,
                      type: 'custom',
                      sections: selectedSections,
                      createdBy: 'Current User',
                      createdAt: new Date().toISOString().split('T')[0]
                    }]);
                    setIsBuilderModalOpen(false);
                  }}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                  حفظ القالب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderScheduledTab = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">التقارير المجدولة</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">إدارة التقارير التي يتم إرسالها تلقائياً</p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
          <Clock className="w-4 h-4" /> جدولة تقرير جديد
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs uppercase font-bold border-b border-slate-200 dark:border-slate-600">
            <tr>
              <th className="p-4">اسم التقرير</th>
              <th className="p-4">التكرار</th>
              <th className="p-4">المستلمين</th>
              <th className="p-4">الصيغة</th>
              <th className="p-4">التشغيل القادم</th>
              <th className="p-4">الحالة</th>
              <th className="p-4 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            {scheduledReports.map(report => (
              <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-slate-200">
                <td className="p-4 font-bold">
                  {templates.find(t => t.id === report.templateId)?.name || 'تقرير مخصص'}
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-bold">
                    {report.frequency === 'monthly' ? 'شهري' : report.frequency === 'weekly' ? 'أسبوعي' : 'يومي'}
                  </span>
                </td>
                <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">
                  {report.recipients.join(', ')}
                </td>
                <td className="p-4 uppercase font-mono text-xs font-bold">
                  {report.format}
                </td>
                <td className="p-4 font-mono text-xs">
                  {report.nextRun}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${report.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {report.active ? 'نشط' : 'متوقف'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-lg transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSummaryCard = (title: string, value: string | number, subtext: string, icon: any, colorClass: string) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-all hover:shadow-md print:border-slate-300 print:shadow-none break-inside-avoid print:break-inside-avoid">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1 print:text-slate-600">{title}</p>
        <h3 className={`text-2xl font-bold ${colorClass} print:text-black`}>{value}</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 print:text-slate-500">{subtext}</p>
      </div>
      <div className={`p-4 rounded-full bg-opacity-10 dark:bg-opacity-20 ${colorClass.replace('text-', 'bg-')} ${colorClass} print:bg-slate-100 print:text-black`}>
        {React.createElement(icon, { className: "w-6 h-6" })}
      </div>
    </div>
  );

  const renderOverviewTab = () => (
     <div className="space-y-6 animate-in fade-in">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-2 print:gap-4">
           {renderSummaryCard('إجمالي التحصيلات', `${financialStats.totalCollected.toLocaleString()} ج.م`, `معدل تحصيل ${financialStats.collectionRate}%`, DollarSign, 'text-emerald-600 dark:text-emerald-400')}
           {renderSummaryCard('القضايا النشطة', caseStats.total, 'ملف قيد العمل', Scale, 'text-blue-600 dark:text-blue-400')}
           {renderSummaryCard('الجلسات هذا الشهر', hearings.length, 'جلسة مجدولة/منتهية', Gavel, 'text-amber-600 dark:text-amber-400')}
           {renderSummaryCard('إنجاز المهام', `${operationalStats.taskCompletionRate}%`, 'معدل الكفاءة', Activity, 'text-purple-600 dark:text-purple-400')}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
           {/* Chart: Revenue Trend */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 break-inside-avoid print:break-inside-avoid print:border-slate-300">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 print:text-black" />
                 التدفقات النقدية (آخر 6 أشهر)
              </h3>
              <div className="h-72 w-full text-xs print:h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financialStats.incomeTrend}>
                       <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                             <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                       <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94a3b8" />
                       <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} stroke="#94a3b8" />
                       {/* Hide tooltip in print to avoid artifacts */}
                       <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }} wrapperClassName="print:hidden" />
                       <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" name="الدخل" isAnimationActive={false} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Chart: Case Status Distribution */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 break-inside-avoid print:break-inside-avoid print:border-slate-300 print:mt-6">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                 <PieIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 print:text-black" />
                 توزيع حالات القضايا
              </h3>
              <div className="h-72 w-full text-xs flex items-center justify-center print:h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={caseStats.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          isAnimationActive={false}
                       >
                          {caseStats.statusData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip wrapperClassName="print:hidden" contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none' }} />
                       <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
     </div>
  );

  const renderFinancialTab = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 print:border-none print:shadow-none">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">التقرير المالي التفصيلي</h3>
              <div className="flex gap-2">
                 <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm font-bold border border-red-100 dark:border-red-800 print:bg-white print:border-slate-300 print:text-black">
                    مستحقات (ديون): {financialStats.pending.toLocaleString()} ج.م
                 </div>
                 <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-bold border border-emerald-100 dark:border-emerald-800 print:bg-white print:border-slate-300 print:text-black">
                    صافي الدخل: {(financialStats.totalCollected - financialStats.totalCaseExpenses).toLocaleString()} ج.م
                 </div>
              </div>
           </div>

           {/* Top Debtors Table */}
           <div className="overflow-x-auto">
              <table className="w-full text-right text-sm border-collapse">
                 <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600 print:bg-slate-200">
                    <tr>
                       <th className="p-4 border dark:border-slate-600 print:border-slate-300">اسم الموكل</th>
                       <th className="p-4 border dark:border-slate-600 print:border-slate-300">القضية</th>
                       <th className="p-4 border dark:border-slate-600 print:border-slate-300">المتفق عليه</th>
                       <th className="p-4 border dark:border-slate-600 print:border-slate-300">المدفوع</th>
                       <th className="p-4 border dark:border-slate-600 print:border-slate-300">المتبقي (دين)</th>
                       <th className="p-4 border dark:border-slate-600 print:border-slate-300">نسبة السداد</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700 print:divide-slate-300">
                    {cases.filter(c => c.finance && (c.finance.agreedFees - c.finance.paidAmount) > 0)
                         .sort((a, b) => (b.finance!.agreedFees - b.finance!.paidAmount) - (a.finance!.agreedFees - a.finance!.paidAmount))
                         .slice(0, 8)
                         .map(c => {
                            const agreed = c.finance?.agreedFees || 0;
                            const paid = c.finance?.paidAmount || 0;
                            const remaining = agreed - paid;
                            const percent = Math.round((paid / agreed) * 100);
                            
                            return (
                               <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 print:bg-white text-slate-800 dark:text-slate-200">
                                  <td className="p-4 font-bold border dark:border-slate-600 print:border-slate-300">{c.clientName}</td>
                                  <td className="p-4 text-slate-600 dark:text-slate-400 border dark:border-slate-600 print:border-slate-300">{c.title}</td>
                                  <td className="p-4 border dark:border-slate-600 print:border-slate-300">{agreed.toLocaleString()}</td>
                                  <td className="p-4 text-emerald-600 dark:text-emerald-400 border dark:border-slate-600 print:border-slate-300">{paid.toLocaleString()}</td>
                                  <td className="p-4 text-red-600 dark:text-red-400 font-bold border dark:border-slate-600 print:border-slate-300">{remaining.toLocaleString()}</td>
                                  <td className="p-4 border dark:border-slate-600 print:border-slate-300">
                                     <div className="flex items-center gap-2">
                                        <div className="w-16 bg-slate-200 dark:bg-slate-600 h-1.5 rounded-full overflow-hidden print:border print:border-slate-400">
                                           <div className={`h-full ${percent < 50 ? 'bg-red-500' : 'bg-emerald-500'} print:bg-slate-800`} style={{width: `${percent}%`}}></div>
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">{percent}%</span>
                                     </div>
                                  </td>
                               </tr>
                            )
                         })
                    }
                 </tbody>
              </table>
           </div>
        </div>
     </div>
  );

  const renderOperationalTab = () => (
     <div className="space-y-6 animate-in fade-in">
        {/* Row 1: Hearing Stats Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 break-inside-avoid print:break-inside-avoid print:border-slate-300">
           <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-indigo-600 dark:text-indigo-400 print:text-black" />
              إحصائيات الجلسات والقرارات
           </h3>
           <div className="h-72 w-full text-xs print:h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={operationalStats.hearingData} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} stroke="#cbd5e1" />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} stroke="#cbd5e1" />
                    <Tooltip cursor={{fill: 'rgba(99, 102, 241, 0.1)'}} wrapperClassName="print:hidden" contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} name="عدد الجلسات" isAnimationActive={false}>
                        {operationalStats.hearingData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Row 2: Court Distribution (Table & Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block print:space-y-6">
           
           {/* Left: Chart */}
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 break-inside-avoid print:break-inside-avoid print:border-slate-300">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                 <PieIcon className="w-5 h-5 text-slate-600 dark:text-slate-400 print:text-black" />
                 توزيع القضايا (رسم بياني)
              </h3>
              <div className="h-64 w-full text-xs print:h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={caseStats.courtData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          isAnimationActive={false}
                       >
                          {caseStats.courtData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip wrapperClassName="print:hidden" contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none' }} />
                       <Legend verticalAlign="middle" align="right" layout="vertical" />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Right: Table */}
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full print:border-slate-300">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
                 <List className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                 <h3 className="font-bold text-slate-800 dark:text-white">جدول توزيع القضايا حسب المحكمة</h3>
              </div>
              <div className="flex-1 overflow-x-auto">
                 <table className="w-full text-right text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600">
                       <tr>
                          <th className="p-3">المحكمة</th>
                          <th className="p-3">العدد</th>
                          <th className="p-3 w-1/3">النسبة المئوية</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                       {caseStats.courtData.map((court, index) => {
                          const percentage = Math.round((court.value / caseStats.total) * 100);
                          const color = COLORS[index % COLORS.length];
                          
                          return (
                             <tr key={court.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200">
                                <td className="p-3 font-medium flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                                   {court.name}
                                </td>
                                <td className="p-3 font-bold">{court.value}</td>
                                <td className="p-3">
                                   <div className="flex items-center gap-2">
                                      <div className="w-full bg-slate-100 dark:bg-slate-600 h-2 rounded-full overflow-hidden">
                                         <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
                                      </div>
                                      <span className="text-xs text-slate-500 dark:text-slate-400 w-8">{percentage}%</span>
                                   </div>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>

        </div>
     </div>
  );

  return (
    <div className="space-y-6 pb-20 print:p-0 print:m-0">
       <style>{`
         @media print {
           @page { size: landscape; margin: 10mm; }
           body { -webkit-print-color-adjust: exact; background-color: white !important; font-size: 12px; }
           
           /* Explicitly hide non-print elements */
           nav, header, aside, .no-print, .actions-bar { display: none !important; }
           
           /* Reset Layout for Print */
           main { padding: 0 !important; margin: 0 !important; height: auto !important; overflow: visible !important; width: 100% !important; display: block !important; }
           .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
           .bg-white, .dark\\:bg-slate-800 { background-color: transparent !important; }
           
           /* Force Text Color */
           .text-slate-500, .text-slate-400, .dark\\:text-slate-400, .dark\\:text-white { color: #475569 !important; }
           
           /* Grid & Layout Adjustments */
           .grid { display: grid !important; }
           
           /* Table Borders */
           table { border-collapse: collapse; width: 100%; }
           th, td { border: 1px solid #cbd5e1 !important; padding: 8px !important; }
           
           /* Charts Fix - CRITICAL */
           .recharts-responsive-container { height: 300px !important; width: 100% !important; }
           .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
         }
       `}</style>

       {/* 1. Header */}
       <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 no-print">
          <div>
             <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-indigo-600" />
                التقارير والتحليلات
             </h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">مركز ذكاء الأعمال ومؤشرات الأداء</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
             <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg flex text-xs font-bold overflow-x-auto max-w-full">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white dark:bg-slate-600 text-indigo-700 dark:text-indigo-300 shadow' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   نظرة عامة
                </button>
                <button 
                  onClick={() => setActiveTab('financial')}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${activeTab === 'financial' ? 'bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   التقرير المالي
                </button>
                <button 
                  onClick={() => setActiveTab('operational')}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${activeTab === 'operational' ? 'bg-white dark:bg-slate-600 text-blue-700 dark:text-blue-400 shadow' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   الأداء التشغيلي
                </button>
                <button 
                  onClick={() => setActiveTab('builder')}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${activeTab === 'builder' ? 'bg-white dark:bg-slate-600 text-purple-700 dark:text-purple-400 shadow' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   مصمم التقارير
                </button>
                <button 
                  onClick={() => setActiveTab('scheduled')}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap ${activeTab === 'scheduled' ? 'bg-white dark:bg-slate-600 text-amber-700 dark:text-amber-400 shadow' : 'text-slate-500 dark:text-slate-400'}`}
                >
                   المجدولة
                </button>
             </div>
             
             {/* Export Actions */}
             <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-600 pr-2 mr-2">
                <button onClick={handleExportPDF} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="تصدير PDF">
                   <FileIcon className="w-5 h-5" />
                </button>
                <button onClick={handleExportExcel} className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="تصدير Excel">
                   <FileSpreadsheet className="w-5 h-5" />
                </button>
                <button onClick={handleExportWord} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="تصدير Word">
                   <FileText className="w-5 h-5" />
                </button>
             </div>

             <button 
               onClick={handleSignReport}
               disabled={isSigning || !!signature}
               className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm ${signature ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
             >
                {isSigning ? 'جاري التوقيع...' : signature ? 'تم التوقيع' : 'توقيع التقرير'}
                {signature ? <CheckCircle className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
             </button>
          </div>
       </div>

       {/* Print Header (Only visible when printing) */}
       <div className="hidden print:block mb-8 text-center border-b border-slate-300 pb-4">
          <div className="flex justify-center items-center gap-2 mb-2">
             <FileText className="w-8 h-8 text-black" />
             <h1 className="text-2xl font-bold text-black">الميزان - تقرير دوري</h1>
          </div>
          <p className="text-sm text-slate-600">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
          <p className="text-sm text-slate-600 mt-1">
             {activeTab === 'overview' ? 'نظرة عامة شاملة' : activeTab === 'financial' ? 'تقرير الوضع المالي' : 'تقرير الأداء التشغيلي'}
          </p>
       </div>

       {/* 2. Content */}
       <div className="min-h-[500px]" id="report-content" ref={reportRef}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'financial' && renderFinancialTab()}
          {activeTab === 'operational' && renderOperationalTab()}
          {activeTab === 'builder' && renderBuilderTab()}
          {activeTab === 'scheduled' && renderScheduledTab()}
          
          {/* Signature Footer */}
          {signature && (activeTab === 'overview' || activeTab === 'financial' || activeTab === 'operational') && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <div className="text-center">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">يعتمد، المدير العام</p>
                <img src={signature} alt="Signature" className="h-16 object-contain opacity-80" />
                <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('ar-EG')}</p>
              </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default Reports;
