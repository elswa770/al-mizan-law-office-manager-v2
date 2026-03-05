import React, { useState, useEffect, useMemo } from 'react';
import { Case, Client, Hearing, Task, ActivityLog, CaseStatus, CaseType, Appointment, CaseDocument, HearingStatus } from '../types';
import { 
  Briefcase, 
  Calendar, 
  FileText, 
  CheckSquare, 
  DollarSign, 
  Users, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Phone,
  Mail,
  Shield,
  Settings,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Eye,
  Video,
  MessageSquare,
  Bell,
  Menu
} from 'lucide-react';

interface CaseDetailsProps {
  caseId: string;
  case: Case;
  client: Client;
  hearings: Hearing[];
  tasks: Task[];
  documents: CaseDocument[];
  appointments: Appointment[];
  activities: ActivityLog[];
  onBack: () => void;
  onUpdateCase: (updatedCase: Case) => void;
  onUpdateHearing: (updatedHearing: Hearing) => void;
  onUpdateTask: (updatedTask: Task) => void;
  onAddHearing: (hearing: Omit<Hearing, 'id'>) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onAddDocument: (document: Omit<CaseDocument, 'id'>) => void;
  readOnly?: boolean;
}

const CaseDetails: React.FC<CaseDetailsProps> = ({
  caseId,
  case: caseData,
  client,
  hearings,
  tasks,
  documents,
  appointments,
  activities,
  onBack,
  onUpdateCase,
  onUpdateHearing,
  onUpdateTask,
  onAddHearing,
  onAddTask,
  onAddDocument,
  readOnly = false
}) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalHearings = hearings.length;
    const completedHearings = hearings.filter(h => h.status === HearingStatus.COMPLETED).length;
    const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
    const documentsCount = documents.length;
    const daysSinceFiling = Math.floor((Date.now() - new Date(caseData.filingDate).getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      totalHearings,
      completedHearings,
      pendingTasks,
      documentsCount,
      daysSinceFiling
    };
  }, [hearings, tasks, documents, caseData.filingDate]);

  // Progress calculation
  const progress = useMemo(() => {
    const phases = [
      { name: 'فتح القضية', completed: true },
      { name: 'جمع المستندات', completed: documents.length > 0 },
      { name: 'تحضير الدفوع', completed: tasks.filter(t => t.status === 'completed').length > 0 },
      { name: 'الجلسات', completed: hearings.filter(h => h.status === HearingStatus.COMPLETED).length > 0 },
      { name: 'الحكم النهائي', completed: caseData.status === CaseStatus.CLOSED }
    ];
    
    const completedPhases = phases.filter(p => p.completed).length;
    const completionPercentage = (completedPhases / phases.length) * 100;
    
    return {
      currentPhase: phases.find(p => !p.completed)?.name || 'مكتمل',
      phases,
      completionPercentage
    };
  }, [documents, tasks, hearings, caseData.status]);

  // Sidebar navigation items
  const sidebarItems = [
    { id: 'overview', label: 'نظرة عامة', icon: Briefcase },
    { id: 'hearings', label: 'الجلسات', icon: Calendar, count: hearings.length },
    { id: 'documents', label: 'المستندات', icon: FileText, count: documents.length },
    { id: 'tasks', label: 'المهام', icon: CheckSquare, count: metrics.pendingTasks },
    { id: 'financial', label: 'المالية', icon: DollarSign },
    { id: 'communications', label: 'التواصل', icon: MessageSquare },
    { id: 'security', label: 'الأمان', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">{caseData.title}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{caseData.caseNumber} • {client.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              caseData.status === CaseStatus.OPEN 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : caseData.status === CaseStatus.CLOSED
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {caseData.status}
            </div>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Interactive Sidebar */}
        <aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out lg:transition-none`}>
          <div className="p-4">
            <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-4">أقسام القضية</h2>
            <nav className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-right transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-right">{item.label}</span>
                    {item.count !== undefined && (
                      <span className="bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg mb-4"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>

            {/* Overview Section */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">الجلسات</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{metrics.totalHearings}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">{metrics.completedHearings} مكتملة</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <CheckSquare className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">المهام</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{tasks.length}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{metrics.pendingTasks} معلقة</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">المستندات</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{metrics.documentsCount}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">مدة القضية</p>
                        <p className="text-2xl font-bold text-slate-800 dark:text-white">{metrics.daysSinceFiling}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">يوم</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">مراحل القضية</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">الحالة الحالية</span>
                      <span className="font-medium text-slate-800 dark:text-white">{progress.currentPhase}</span>
                    </div>
                    <div className={`w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3`}>
                      <div 
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress.completionPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{progress.completionPercentage.toFixed(1)}% مكتمل</div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">الخط الزمني</h3>
                  <div className="space-y-4">
                    {progress.phases.map((phase, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${
                          phase.completed 
                            ? 'bg-green-500' 
                            : 'bg-slate-300 dark:bg-slate-600'
                        }`} />
                        <div className="flex-1">
                          <p className={`font-medium ${
                            phase.completed 
                              ? 'text-slate-800 dark:text-white' 
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            {phase.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">إجراءات سريعة</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors">
                      <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">إضافة جلسة</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors">
                      <Plus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">إضافة مهمة</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors">
                      <Upload className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">رفع مستند</span>
                    </button>
                    <button className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors">
                      <Edit className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">تعديل القضية</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder for other sections */}
            {activeSection !== 'overview' && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                  {sidebarItems.find(item => item.id === activeSection)?.label}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  هذا القسم قيد التطوير. سيتم إضافة المميزات الكاملة قريباً.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Fixed Action Bar */}
      <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              <Phone className="w-4 h-4" />
              <span>اتصل بالموكل</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <Mail className="w-4 h-4" />
              <span>إرسال إيميل</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Eye className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseDetails;
