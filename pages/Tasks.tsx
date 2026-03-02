
import React, { useState, useMemo } from 'react';
import { Task, Case, AppUser } from '../types';
import { 
  CheckSquare, Plus, Search, Filter, Calendar, User, Briefcase, 
  Clock, AlertCircle, MoreHorizontal, LayoutGrid, List, Trash2, Edit3,
  CheckCircle, ArrowRight, Layout
} from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
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
    assignedTo: ''
  });

  // --- Filtering ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchesUser = filterUser === 'all' || t.assignedTo === filterUser;
      
      return matchesSearch && matchesStatus && matchesUser;
    });
  }, [tasks, searchTerm, filterStatus, filterUser]);

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

  // --- Render Functions ---

  const renderTaskCard = (task: Task) => (
    <div key={task.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getPriorityColor(task.priority)}`}>
          {task.priority === 'high' ? 'عاجل' : task.priority === 'medium' ? 'متوسط' : 'عادي'}
        </span>
        {!readOnly && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button onClick={() => handleOpenModal(task)} className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDeleteTask(task.id)} className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      
      <h4 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-2">{task.title}</h4>
      {task.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{task.description}</p>}
      
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Calendar className="w-3 h-3" />
          <span>{task.dueDate}</span>
        </div>
        
        {task.relatedCaseId && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline" onClick={() => onCaseClick(task.relatedCaseId!)}>
            <Briefcase className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{getCaseName(task.relatedCaseId)}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
           <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
              <User className="w-3 h-3" />
              <span>{getUserName(task.assignedTo)}</span>
           </div>
           
           {!readOnly && (
             <select 
               className="text-[10px] bg-transparent border border-slate-200 dark:border-slate-600 rounded p-1 outline-none cursor-pointer"
               value={task.status}
               onChange={(e) => handleChangeStatus(task.id, e.target.value as any)}
             >
               <option value="pending">قيد الانتظار</option>
               <option value="in_progress">جاري التنفيذ</option>
               <option value="completed">مكتمل</option>
             </select>
           )}
        </div>
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
      {/* 1. Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
         <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <CheckSquare className="w-6 h-6 text-primary-600" />
               إدارة المهام والمتابعة
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
         <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
               type="text" 
               placeholder="بحث في المهام..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pr-9 pl-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-primary-500 text-slate-900 dark:text-white"
            />
         </div>
         
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
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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

                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300">إلغاء</button>
                     <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">حفظ المهمة</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Tasks;
