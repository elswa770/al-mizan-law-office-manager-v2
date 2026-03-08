
import React, { useState, useMemo } from 'react';
import { Task, Case, AppUser } from '../types';
import { 
  CheckSquare, Plus, Search, Filter, Calendar, User, Briefcase, 
  Clock, AlertCircle, MoreHorizontal, LayoutGrid, List, Trash2, Edit3,
  CheckCircle, ArrowRight, Layout, Wifi, WifiOff, 
  Tag, MapPin, Paperclip, Timer, Target, TrendingUp, Users, FileText, Bell
} from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import EnhancedSearch from '../components/EnhancedSearch';

// Local SearchSuggestion interface for Tasks page
interface TasksSearchSuggestion {
  id: string;
  text: string;
  type: 'task' | 'case' | 'user' | 'document';
  metadata?: string;
}

interface TasksProps {
  tasks: Task[];
  cases: Case[];
  users: AppUser[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onCaseClick: (caseId: string) => void;
  readOnly?: boolean;
}

const Tasks: React.FC<TasksProps> = ({ 
  tasks, cases, users, onAddTask, onUpdateTask, onDeleteTask, onCaseClick, readOnly = false 
}) => {
  // --- Offline Status ---
  const offlineStatus = useOfflineStatus();
  const isOnline = offlineStatus?.online ?? true;
  const pendingCount = offlineStatus?.pendingActions ?? 0;
  
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'pending',
    relatedCaseId: '',
    assignedTo: '',
    estimatedHours: undefined,
    actualHours: undefined,
    tags: [],
    category: 'other',
    progress: 0,
    attachments: [],
    reminderDate: '',
    location: '',
    dependsOn: [],
    createdBy: '',
    createdAt: new Date().toISOString(),
    completedAt: undefined,
    notes: ''
  });

  // --- Helper Functions ---
  const getUserName = (userId?: string) => {
    if (!userId) return 'غير محدد';
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'مستخدم محذوف';
  };

  const getCaseName = (caseId?: string) => {
    if (!caseId) return null;
    const c = cases.find(x => x.id === caseId);
    return c ? c.title : null;
  };

  // --- Filtering ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchesUser = filterUser === 'all' || t.assignedTo === filterUser;
      
      return matchesSearch && matchesStatus && matchesUser;
    });
  }, [tasks, searchTerm, filterStatus, filterUser]);

  // --- Search Suggestions ---
  const suggestions = useMemo(() => {
    const suggestionList: TasksSearchSuggestion[] = [];
    
    // Add task suggestions
    tasks.forEach(task => {
      suggestionList.push({
        id: `task-${task.id}`,
        text: task.title,
        type: 'task',
        metadata: `${task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'عادي'} - ${task.dueDate} - ${getUserName(task.assignedTo)}`
      });
    });
    
    // Add case suggestions for related tasks
    cases.forEach(c => {
      const relatedTasks = tasks.filter(t => t.relatedCaseId === c.id);
      if (relatedTasks.length > 0) {
        suggestionList.push({
          id: `case-${c.id}`,
          text: `${c.caseNumber} / ${c.year} - ${c.title}`,
          type: 'case',
          metadata: `${relatedTasks.length} مهمة مرتبطة - ${c.court}`
        });
      }
    });
    
    // Add user suggestions
    users.forEach(user => {
      const userTasks = tasks.filter(t => t.assignedTo === user.id);
      if (userTasks.length > 0) {
        suggestionList.push({
          id: `user-${user.id}`,
          text: user.name,
          type: 'user',
          metadata: `${userTasks.length} مهمة مكلفة - ${user.roleLabel || 'موظف'}`
        });
      }
    });
    
    return suggestionList;
  }, [tasks, cases, users]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    
    // Add to recent searches if not empty and not already in list
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleSuggestionClick = (suggestion: TasksSearchSuggestion) => {
    if (suggestion.type === 'task') {
      // Find and scroll to task (or highlight it)
      const taskId = suggestion.id.replace('task-', '');
      const taskElement = document.getElementById(`task-${taskId}`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskElement.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2');
        setTimeout(() => {
          taskElement.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2');
        }, 3000);
      }
    } else if (suggestion.type === 'case') {
      const caseId = suggestion.id.replace('case-', '');
      onCaseClick(caseId);
    } else if (suggestion.type === 'user') {
      // Filter by user
      const userId = suggestion.id.replace('user-', '');
      setFilterUser(userId);
      setSearchTerm('');
    }
  };

  // --- Stats ---
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const highPriority = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, pending, highPriority, completionRate };
  }, [tasks]);

  // --- Handlers ---
  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({ ...task });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'medium',
        status: 'pending',
        relatedCaseId: '',
        assignedTo: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    if (editingTask) {
      onUpdateTask({ ...editingTask, ...formData } as Task);
    } else {
      onAddTask({
        ...formData,
        id: Math.random().toString(36).substring(2, 9),
      } as Task);
    }
    setIsModalOpen(false);
  };

  const handleChangeStatus = (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onUpdateTask({ ...task, status: newStatus });
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  // --- Render Functions ---

  const renderTaskCard = (task: Task) => (
    <div key={task.id} id={`task-${task.id}`} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
      {/* Status Indicator Bar */}
      <div className={`h-1 w-full ${
        task.status === 'completed' ? 'bg-green-500' :
        task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400'
      }`}></div>
      
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Badge */}
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getPriorityColor(task.priority)}`}>
              {task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'عادي'}
            </span>
            
            {/* Category Badge */}
            {task.category && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                {task.category === 'legal' ? 'قانوني' : 
                 task.category === 'administrative' ? 'إداري' :
                 task.category === 'research' ? 'بحث' :
                 task.category === 'meeting' ? 'اجتماع' : 'أخرى'}
              </span>
            )}
          </div>
          
          {/* Actions */}
          {!readOnly && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => handleOpenModal(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => onDeleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Title */}
        <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-2 line-clamp-2 leading-tight">{task.title}</h4>
        
        {/* Description */}
        {task.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>
        )}
        
        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.tags.map((tag, index) => (
              <span key={index} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-800">
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Progress Bar */}
        {task.progress !== undefined && task.progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">نسبة الإنجاز</span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">{task.progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
              <div 
                className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Key Information Grid */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          {/* Due Date */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-100 dark:border-amber-800/50">
            <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">تاريخ الاستحقاق</span>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">{task.dueDate}</p>
            </div>
          </div>
          
          {/* Assigned User */}
          {task.assignedTo && (
            <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div className="flex-1">
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">المكلف به</span>
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-200">{getUserName(task.assignedTo)}</p>
              </div>
            </div>
          )}
          
          {/* Related Case */}
          {task.relatedCaseId && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/50">
              <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div className="flex-1">
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">القضية المرتبطة</span>
                <button 
                  onClick={() => onCaseClick(task.relatedCaseId!)}
                  className="text-sm font-bold text-purple-800 dark:text-purple-200 hover:underline text-right line-clamp-1"
                >
                  {getCaseName(task.relatedCaseId)}
                </button>
              </div>
            </div>
          )}
          
          {/* Location */}
          {task.location && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-100 dark:border-slate-600">
              <MapPin className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <div className="flex-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">المكان</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{task.location}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
          <div className="flex items-center gap-4">
            {(task.estimatedHours || task.actualHours) && (
              <div className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                <span>تقديري: {task.estimatedHours || '-'}س | فعلي: {task.actualHours || '-'}س</span>
              </div>
            )}
            {task.reminderDate && (
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Bell className="w-3 h-3" />
                <span>تذكير</span>
              </div>
            )}
          </div>
          
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              <span>{task.attachments.length} مرفق</span>
            </div>
          )}
        </div>
        
        {/* Completion Date */}
        {task.completedAt && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">تم الإنجاز: {new Date(task.completedAt).toLocaleDateString('ar-EG')}</span>
            </div>
          </div>
        )}
        
        {/* Status Selector - Separate Section */}
        {!readOnly && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">حالة المهمة:</span>
              <select 
                className="text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none cursor-pointer font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={task.status}
                onChange={(e) => handleChangeStatus(task.id, e.target.value as any)}
                title="تغيير حالة المهمة"
              >
                <option value="pending">قيد الانتظار</option>
                <option value="in_progress">جاري التنفيذ</option>
                <option value="completed">مكتمل</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderKanbanBoard = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-x-auto pb-4">
      {/* Column 1: Pending */}
      <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-2">
        <div className="flex items-center justify-between p-3 mb-2">
           <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-slate-400"></div> قيد الانتظار
           </h3>
           <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 font-bold">
             {filteredTasks.filter(t => t.status === 'pending').length}
           </span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-1 custom-scrollbar">
           {filteredTasks.filter(t => t.status === 'pending').map(renderTaskCard)}
        </div>
      </div>

      {/* Column 2: In Progress */}
      <div className="flex flex-col h-full bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 p-2">
        <div className="flex items-center justify-between p-3 mb-2">
           <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div> جاري التنفيذ
           </h3>
           <span className="text-xs bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded-full text-blue-700 dark:text-blue-200 font-bold">
             {filteredTasks.filter(t => t.status === 'in_progress').length}
           </span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-1 custom-scrollbar">
           {filteredTasks.filter(t => t.status === 'in_progress').map(renderTaskCard)}
        </div>
      </div>

      {/* Column 3: Completed */}
      <div className="flex flex-col h-full bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/30 p-2">
        <div className="flex items-center justify-between p-3 mb-2">
           <h3 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
             <CheckCircle className="w-4 h-4 text-green-600" /> مكتملة
           </h3>
           <span className="text-xs bg-green-100 dark:bg-green-800 px-2 py-0.5 rounded-full text-green-700 dark:text-green-200 font-bold">
             {filteredTasks.filter(t => t.status === 'completed').length}
           </span>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-1 custom-scrollbar">
           {filteredTasks.filter(t => t.status === 'completed').map(renderTaskCard)}
        </div>
      </div>
    </div>
  );

  const renderListView = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-right text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600">
          <tr>
            <th className="p-4">المهمة</th>
            <th className="p-4">الأولوية</th>
            <th className="p-4">الحالة</th>
            <th className="p-4">الموعد</th>
            <th className="p-4">مرتبط بـ</th>
            <th className="p-4">المكلف</th>
            <th className="p-4">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
          {filteredTasks.map(t => (
            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-800 dark:text-slate-200">
              <td className="p-4 font-bold">{t.title}</td>
              <td className="p-4">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getPriorityColor(t.priority)}`}>
                  {t.priority === 'high' ? 'عاجل' : t.priority === 'medium' ? 'متوسط' : 'عادي'}
                </span>
              </td>
              <td className="p-4">
                <select 
                   disabled={readOnly}
                   className="text-xs bg-transparent border border-slate-200 dark:border-slate-600 rounded p-1 outline-none cursor-pointer"
                   value={t.status}
                   onChange={(e) => handleChangeStatus(t.id, e.target.value as any)}
                 >
                   <option value="pending">قيد الانتظار</option>
                   <option value="in_progress">جاري التنفيذ</option>
                   <option value="completed">مكتمل</option>
                 </select>
              </td>
              <td className="p-4 font-mono text-xs">{t.dueDate}</td>
              <td className="p-4 text-xs">
                {t.relatedCaseId ? (
                  <button onClick={() => onCaseClick(t.relatedCaseId!)} className="text-indigo-600 hover:underline">
                    {getCaseName(t.relatedCaseId)}
                  </button>
                ) : '-'}
              </td>
              <td className="p-4 text-xs">{getUserName(t.assignedTo)}</td>
              <td className="p-4">
                {!readOnly && (
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenModal(t)} className="text-slate-400 hover:text-indigo-600"><Edit3 className="w-4 h-4"/></button>
                    <button onClick={() => onDeleteTask(t.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6 pb-20 h-full flex flex-col">
      
      {/* Offline Status Indicator */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              وضع عدم الاتصال - سيتم حفظ المهام محلياً
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {pendingCount} مهمة تنتظر المزامنة
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* 1. Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <CheckSquare className="w-6 h-6 text-primary-600" />
               إدارة المهام والمتابعة
               {isOnline ? (
                 <Wifi className="w-5 h-5 text-green-500" />
               ) : (
                 <WifiOff className="w-5 h-5 text-amber-500" />
               )}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
               <span className="flex items-center gap-1"><Layout className="w-3 h-3"/> إجمالي: {stats.total}</span>
               <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold"><CheckCircle className="w-3 h-3"/> منجز: {stats.completionRate}%</span>
               <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold"><AlertCircle className="w-3 h-3"/> عاجل: {stats.highPriority}</span>
            </div>
         </div>
         
         {!readOnly && (
           <button onClick={() => handleOpenModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors">
              <Plus className="w-4 h-4" /> مهمة جديدة
           </button>
         )}
      </div>

      {/* 2. Filters & View Toggle */}
      <div className="flex flex-col md:flex-row gap-4">
         {/* Enhanced Search Bar */}
         <EnhancedSearch
           onSearch={handleSearch}
           onSuggestionClick={handleSuggestionClick as any}
           placeholder="البحث في المهام، القضايا، الموظفين..."
           suggestions={suggestions as any}
           recentSearches={recentSearches}
           className="flex-1"
         />
         
         <div className="flex gap-2 overflow-x-auto">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
               <Filter className="w-4 h-4 text-slate-400" />
               <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-transparent border-none text-sm outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
               >
                  <option value="all">كل الحالات</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="in_progress">جاري التنفيذ</option>
                  <option value="completed">مكتمل</option>
               </select>
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
               <User className="w-4 h-4 text-slate-400" />
               <select 
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="bg-transparent border-none text-sm outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
               >
                  <option value="all">كل الموظفين</option>
                  {users.map(u => (
                     <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
               </select>
            </div>

            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
               <button onClick={() => setViewMode('board')} className={`p-1.5 rounded transition-colors ${viewMode === 'board' ? 'bg-slate-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400' : 'text-slate-400'}`}>
                  <LayoutGrid className="w-4 h-4" />
               </button>
               <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400' : 'text-slate-400'}`}>
                  <List className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* 3. Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
         {viewMode === 'board' ? renderKanbanBoard() : renderListView()}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
               <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-3">
                  {editingTask ? 'تعديل مهمة' : 'إضافة مهمة جديدة'}
               </h3>
               
               <form onSubmit={handleSaveTask} className="space-y-4">
                  {/* --- المعلومات الأساسية --- */}
                  <div className="border-b pb-4 mb-4">
                     <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        المعلومات الأساسية
                     </h4>
                     
                     <div className="grid grid-cols-1 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان المهمة <span className="text-red-500">*</span></label>
                           <input 
                              type="text" 
                              required
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.title}
                              onChange={e => setFormData({...formData, title: e.target.value})}
                              placeholder="مثال: كتابة مذكرة دفاع..."
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التفاصيل / الوصف</label>
                           <textarea 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              rows={3}
                              value={formData.description || ''}
                              onChange={e => setFormData({...formData, description: e.target.value})}
                              placeholder="تفاصيل إضافية عن المهمة..."
                           />
                        </div>
                     </div>
                  </div>

                  {/* --- التصنيف والأولوية --- */}
                  <div className="border-b pb-4 mb-4">
                     <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        التصنيف والأولوية
                     </h4>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تصنيف المهمة</label>
                           <select 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.category}
                              onChange={e => setFormData({...formData, category: e.target.value as any})}
                           >
                              <option value="legal">قانوني</option>
                              <option value="administrative">إداري</option>
                              <option value="research">بحث</option>
                              <option value="meeting">اجتماع</option>
                              <option value="other">أخرى</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الأولوية</label>
                           <select 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.priority}
                              onChange={e => setFormData({...formData, priority: e.target.value as any})}
                           >
                              <option value="low">عادي</option>
                              <option value="medium">متوسط</option>
                              <option value="high">عاجل</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الحالة</label>
                           <select 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.status}
                              onChange={e => setFormData({...formData, status: e.target.value as any})}
                           >
                              <option value="pending">معلقة</option>
                              <option value="in_progress">قيد التنفيذ</option>
                              <option value="completed">منجزة</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  {/* --- الوقت والتواريخ --- */}
                  <div className="border-b pb-4 mb-4">
                     <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        الوقت والتواريخ
                     </h4>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الاستحقاق</label>
                           <input 
                              type="date" 
                              required
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.dueDate}
                              onChange={e => setFormData({...formData, dueDate: e.target.value})}
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ التذكير</label>
                           <input 
                              type="datetime-local" 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.reminderDate}
                              onChange={e => setFormData({...formData, reminderDate: e.target.value})}
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الوقت التقديري (ساعات)</label>
                           <input 
                              type="number" 
                              min="0.5"
                              step="0.5"
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.estimatedHours || ''}
                              onChange={e => setFormData({...formData, estimatedHours: parseFloat(e.target.value) || undefined})}
                              placeholder="مثال: 2.5"
                           />
                        </div>
                     </div>
                  </div>

                  {/* --- التخصيص والارتباطات --- */}
                  <div className="border-b pb-4 mb-4">
                     <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        التخصيص والارتباطات
                     </h4>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مرتبط بقضية</label>
                           <select 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.relatedCaseId || ''}
                              onChange={e => setFormData({...formData, relatedCaseId: e.target.value})}
                           >
                              <option value="">-- بدون ارتباط --</option>
                              {cases.map(c => (
                                 <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تعيين إلى</label>
                           <select 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.assignedTo || ''}
                              onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                           >
                              <option value="">-- اختر موظف --</option>
                              {users.map(u => (
                                 <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                           </select>
                        </div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مكان التنفيذ</label>
                           <input 
                              type="text" 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.location || ''}
                              onChange={e => setFormData({...formData, location: e.target.value})}
                              placeholder="مثال: المكتب، المحكمة، اجتماع عبر Zoom..."
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نسبة الإنجاز (%)</label>
                           <div className="flex items-center gap-2">
                              <input 
                                 type="range" 
                                 min="0"
                                 max="100"
                                 className="flex-1"
                                 value={formData.progress || 0}
                                 onChange={e => setFormData({...formData, progress: parseInt(e.target.value)})}
                              />
                              <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-12 text-center">
                                 {formData.progress || 0}%
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* --- المرفقات --- */}
                  <div className="border-b pb-4 mb-4">
                     <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        المرفقات
                     </h4>
                     
                     <div className="space-y-3">
                        {/* قائمة المرفقات الحالية */}
                        {formData.attachments && formData.attachments.length > 0 && (
                           <div className="space-y-2">
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">المرفقات الحالية:</label>
                              {formData.attachments.map((attachment, index) => (
                                 <div key={index} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                    <div className="flex items-center gap-2 flex-1">
                                       <Paperclip className="w-4 h-4 text-slate-400" />
                                       <a 
                                          href={attachment} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
                                       >
                                          {attachment.split('/').pop() || attachment}
                                       </a>
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => {
                                          const newAttachments = formData.attachments?.filter((_, i) => i !== index) || [];
                                          setFormData({...formData, attachments: newAttachments});
                                       }}
                                       className="text-red-500 hover:text-red-700 p-1"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}
                        
                        {/* إضافة مرفق جديد */}
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">إضافة مرفق جديد:</label>
                           <div className="flex gap-2">
                              <input
                                 type="text"
                                 className="flex-1 border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                 value={formData.newAttachment || ''}
                                 onChange={e => setFormData({...formData, newAttachment: e.target.value})}
                                 placeholder="رابط الملف أو اسمه..."
                              />
                              <button
                                 type="button"
                                 onClick={() => {
                                    if (formData.newAttachment && formData.newAttachment.trim()) {
                                       const currentAttachments = formData.attachments || [];
                                       setFormData({
                                          ...formData, 
                                          attachments: [...currentAttachments, formData.newAttachment.trim()],
                                          newAttachment: ''
                                       });
                                    }
                                 }}
                                 className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                              >
                                 <Paperclip className="w-4 h-4" />
                                 إضافة
                              </button>
                           </div>
                        </div>
                        
                        {/* رفع ملف (مستقبلاً) */}
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                           <span className="flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              ملاحظة: حالياً يدعم إضافة الروابط فقط. رفع الملفات سيتم إضافته لاحقاً.
                           </span>
                        </div>
                     </div>
                  </div>

                  {/* --- الوسوم والملاحظات --- */}
                  <div className="border-b pb-4 mb-4">
                     <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <Tag className="w-4 h-4" />
                        الوسوم والملاحظات
                     </h4>
                     
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وسوم (افصل بين الوسوم بفاصلة)</label>
                           <input 
                              type="text" 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              value={formData.tags?.join(', ') || ''}
                              onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)})}
                              placeholder="مثال: عاجل، محكمة، بحث"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية</label>
                           <textarea 
                              className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                              rows={2}
                              value={formData.notes || ''}
                              onChange={e => setFormData({...formData, notes: e.target.value})}
                              placeholder="ملاحظات داخلية أو متطلبات خاصة..."
                           />
                        </div>
                     </div>
                  </div>

                  {/* --- الوقت الفعلي والإحصائيات --- */}
                  {editingTask && (
                     <div className="border-b pb-4 mb-4">
                        <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                           <Timer className="w-4 h-4" />
                           الوقت الفعلي والإحصائيات
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الوقت الفعلي (ساعات)</label>
                              <input 
                                 type="number" 
                                 min="0.5"
                                 step="0.5"
                                 className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                 value={formData.actualHours || ''}
                                 onChange={e => setFormData({...formData, actualHours: parseFloat(e.target.value) || undefined})}
                                 placeholder="الوقت الفعلي المنقضي"
                              />
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الإنجاز</label>
                              <input 
                                 type="datetime-local" 
                                 className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                 value={formData.completedAt || ''}
                                 onChange={e => setFormData({...formData, completedAt: e.target.value})}
                              />
                           </div>
                        </div>
                     </div>
                  )}

                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300">إلغاء</button>
                     <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                        {editingTask ? 'تحديث المهمة' : 'حفظ المهمة'}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Tasks;
