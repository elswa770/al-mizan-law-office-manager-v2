import React, { useState } from 'react';
import { Hearing, Task, HearingStatus } from '../types';
import { X, Calendar, Clock, MapPin, FileText, CheckSquare, Plus } from 'lucide-react';

interface AddHearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hearing: Hearing, task?: Task) => void;
  caseId: string;
}

const AddHearingModal: React.FC<AddHearingModalProps> = ({ isOpen, onClose, onSave, caseId }) => {
  const [hearingData, setHearingData] = useState<Partial<Hearing>>({
    date: new Date().toISOString().split('T')[0],
    status: HearingStatus.SCHEDULED,
    type: 'session',
    requirements: ''
  });

  const [createTask, setCreateTask] = useState(false);
  const [taskData, setTaskData] = useState<Partial<Task>>({
    title: '',
    priority: 'high',
    dueDate: new Date().toISOString().split('T')[0]
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newHearing: Hearing = {
      id: Math.random().toString(36).substring(2, 9),
      caseId,
      date: hearingData.date || '',
      status: hearingData.status || HearingStatus.SCHEDULED,
      type: hearingData.type || 'session',
      requirements: hearingData.requirements || ''
    };

    // Add optional fields only if they have values
    if (hearingData.decision) {
      newHearing.decision = hearingData.decision;
    }

    let newTask: Task | undefined;

    if (createTask) {
      newTask = {
        id: Math.random().toString(36).substring(2, 9),
        title: taskData.title || `تحضير لجلسة ${hearingData.date}`,
        description: `مطلوب للجلسة: ${hearingData.requirements}`,
        dueDate: taskData.dueDate || hearingData.date || '',
        priority: taskData.priority || 'high',
        status: 'pending',
        relatedCaseId: caseId
      };
      console.log('🔥 Creating task:', newTask);
    } else {
      console.log('🔥 No task creation requested');
    }

    console.log('🔥 onSave called with:', { hearing: newHearing, task: newTask });
    onSave(newHearing, newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
          <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" /> إضافة جلسة جديدة
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-6 h-6"/></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ الجلسة</label>
              <input 
                type="date" 
                required
                value={hearingData.date} 
                onChange={e => {
                  setHearingData({...hearingData, date: e.target.value});
                  if (createTask) setTaskData({...taskData, dueDate: e.target.value});
                }} 
                className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">نوع الجلسة</label>
              <select 
                value={hearingData.type} 
                onChange={e => setHearingData({...hearingData, type: e.target.value as 'session' | 'procedure'})} 
                className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="session">جلسة عادية</option>
                <option value="procedure">إجراءات</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">المطلوب للجلسة (القرارات السابقة)</label>
            <textarea 
              value={hearingData.requirements} 
              onChange={e => {
                setHearingData({...hearingData, requirements: e.target.value});
                if (createTask && !taskData.title) {
                   setTaskData({...taskData, title: `تجهيز: ${e.target.value}`});
                }
              }}
              rows={3} 
              className="w-full border p-2.5 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" 
              placeholder="مثال: تقديم مذكرات، إعلان شهود، سداد أمانة خبير..."
            ></textarea>
          </div>

          {/* Task Integration Section */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
            <div className="flex items-center gap-3 mb-3">
              <input 
                type="checkbox" 
                id="createTask" 
                checked={createTask} 
                onChange={e => setCreateTask(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="createTask" className="font-bold text-slate-800 dark:text-white flex items-center gap-2 cursor-pointer">
                <CheckSquare className="w-4 h-4 text-indigo-500" /> إنشاء مهمة مرتبطة تلقائياً
              </label>
            </div>

            {createTask && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pl-8 border-r-2 border-slate-200 dark:border-slate-600 mr-1 pr-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">عنوان المهمة</label>
                  <input 
                    type="text" 
                    value={taskData.title} 
                    onChange={e => setTaskData({...taskData, title: e.target.value})} 
                    className="w-full border p-2 rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" 
                    placeholder="عنوان المهمة..."
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">تاريخ الاستحقاق</label>
                    <input 
                      type="date" 
                      value={taskData.dueDate} 
                      onChange={e => setTaskData({...taskData, dueDate: e.target.value})} 
                      className="w-full border p-2 rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm" 
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">الأولوية</label>
                    <select 
                      value={taskData.priority} 
                      onChange={e => setTaskData({...taskData, priority: e.target.value as any})} 
                      className="w-full border p-2 rounded bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white text-sm"
                    >
                      <option value="high">عالية</option>
                      <option value="medium">متوسطة</option>
                      <option value="low">منخفضة</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-colors flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> حفظ الجلسة {createTask ? '+ المهمة' : ''}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddHearingModal;
