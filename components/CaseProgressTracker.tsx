import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, Users, FileText, Award, Activity, Plus, Save, X, CheckCircle, Eye, EyeOff, AlertCircle, Gavel, BookOpen, Scale, Target } from 'lucide-react';
import { Case, CaseMilestone, CaseAchievement, CaseNote, CaseProcedure, Hearing, CaseProgress } from '../types';

interface CaseProgressTrackerProps {
  caseData: Case;
  hearings: Hearing[];
  onUpdateProgress?: (progress: CaseProgress) => void;
  onUpdateMilestone?: (milestone: CaseMilestone) => void;
  onAddAchievement?: (achievement: CaseAchievement) => void;
  onAddNote?: (note: CaseNote) => void;
  onAddProcedure?: (procedure: CaseProcedure) => void;
  readOnly?: boolean;
}

// Function to calculate appeal and cassation deadlines
const calculateDeadlines = (judgmentDate: string) => {
  const date = new Date(judgmentDate);
  
  // Appeal deadline: 30 days from judgment date
  const appealDeadline = new Date(date);
  appealDeadline.setDate(date.getDate() + 30);
  
  // Cassation deadline: 60 days from judgment date
  const cassationDeadline = new Date(date);
  cassationDeadline.setDate(date.getDate() + 60);
  
  return {
    appealDeadline: appealDeadline.toISOString().split('T')[0],
    cassationDeadline: cassationDeadline.toISOString().split('T')[0]
  };
};

const CaseProgressTracker: React.FC<CaseProgressTrackerProps> = ({
  caseData,
  hearings,
  onUpdateProgress,
  onUpdateMilestone,
  onAddAchievement,
  onAddNote,
  onAddProcedure,
  readOnly = false
}) => {
  // Helper functions for auto-adding next milestones
  const getNextMilestoneTitle = (nextStage: string): string => {
    switch (nextStage) {
      case 'appeal': return 'تقديم استئناف';
      case 'cassation': return 'تقديم نقض';
      case 'enforcement': return 'بدء التنفيذ';
      default: return 'محطة تالية';
    }
  };

  const getNextMilestoneDescription = (nextStage: string): string => {
    switch (nextStage) {
      case 'appeal': return 'إجراءات تقديم الاستئناف';
      case 'cassation': return 'إجراءات تقديم النقض';
      case 'enforcement': return 'إجراءات التنفيذ';
      default: return 'المرحلة التالية من القضية';
    }
  };

  const getNextMilestoneType = (nextStage: string): string => {
    switch (nextStage) {
      case 'appeal': return 'appeal_filing';
      case 'cassation': return 'cassation_filing';
      case 'enforcement': return 'enforcement_filing';
      default: return 'other';
    }
  };

  const getNextMilestoneDate = (currentDate: string, nextStage: string): string => {
    const date = new Date(currentDate);
    
    // Add typical time gaps between stages
    switch (nextStage) {
      case 'appeal':
        // Appeal typically filed 15-30 days after judgment
        date.setDate(date.getDate() + 20);
        break;
      case 'cassation':
        // Cassation typically filed 30-60 days after appeal judgment
        date.setDate(date.getDate() + 45);
        break;
      case 'enforcement':
        // Enforcement typically filed 15-30 days after final judgment
        date.setDate(date.getDate() + 20);
        break;
      default:
        date.setDate(date.getDate() + 7);
        break;
    }
    
    return date.toISOString().split('T')[0];
  };
  const [activeTab, setActiveTab] = useState<'timeline' | 'milestones' | 'achievements' | 'notes' | 'procedures'>('timeline');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [isAddingAchievement, setIsAddingAchievement] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isAddingProcedure, setIsAddingProcedure] = useState(false);
  const [showPrivateNotes, setShowPrivateNotes] = useState(false);

  // Form states
  const [newMilestone, setNewMilestone] = useState<Partial<CaseMilestone>>({
    title: '',
    description: '',
    date: '',
    type: 'other',
    status: 'pending',
    importance: 'medium'
  });

  // Local state for milestones to ensure immediate updates
  const [localMilestones, setLocalMilestones] = useState(caseData.progress?.milestones || []);

  // Update local milestones when case data changes
  useEffect(() => {
    setLocalMilestones(caseData.progress?.milestones || []);
  }, [caseData.progress?.milestones]);

  const [newAchievement, setNewAchievement] = useState<Partial<CaseAchievement>>({
    title: '',
    description: '',
    date: '',
    type: 'other',
    impact: 'medium'
  });

  const [newNote, setNewNote] = useState<Partial<CaseNote>>({
    content: '',
    type: 'progress_update',
    priority: 'medium',
    isPrivate: false
  });

  const [newProcedure, setNewProcedure] = useState<Partial<CaseProcedure>>({
    title: '',
    description: '',
    date: '',
    type: 'other',
    status: 'pending'
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStageColor = (stage: string) => {
    const colors = {
      initial: 'bg-blue-100 text-blue-700 border-blue-200',
      investigation: 'bg-purple-100 text-purple-700 border-purple-200',
      trial: 'bg-orange-100 text-orange-700 border-orange-200',
      judgment: 'bg-green-100 text-green-700 border-green-200',
      appeal: 'bg-amber-100 text-amber-700 border-amber-200',
      execution: 'bg-red-100 text-red-700 border-red-200',
      closed: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getMilestoneIcon = (type: string) => {
    const icons = {
      case_opening: <Calendar className="w-5 h-5" />,
      lawsuit_filing: <FileText className="w-5 h-5" />,
      first_hearing: <Gavel className="w-5 h-5" />,
      evidence_submission: <BookOpen className="w-5 h-5" />,
      witness_hearing: <Users className="w-5 h-5" />,
      expert_report: <Scale className="w-5 h-5" />,
      judgment: <Award className="w-5 h-5" />,
      appeal: <Activity className="w-5 h-5" />,
      execution: <Activity className="w-5 h-5" />,
      other: <CheckCircle className="w-5 h-5" />
    };
    return icons[type as keyof typeof icons] || <CheckCircle className="w-5 h-5" />;
  };


  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      completed: 'bg-green-100 text-green-700 border-green-200',
      delayed: 'bg-red-100 text-red-700 border-red-200',
      in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
      rejected: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getImportanceColor = (importance: string) => {
    const colors = {
      low: 'border-gray-300',
      medium: 'border-blue-300',
      high: 'border-orange-300',
      critical: 'border-red-500'
    };
    return colors[importance as keyof typeof colors] || 'border-gray-300';
  };

  const renderTimeline = () => {
    type TimelineEvent = {
      id: string;
      title: string;
      description: string;
      date: string;
      type: string;
      icon: React.ReactNode;
      status?: string;
      importance?: string;
      impact?: string;
    };

    const events: TimelineEvent[] = [
      // Case opening
      ...(caseData.caseOpeningDate ? [{
        id: 'case-opening',
        title: 'فتح القضية',
        description: 'تم فتح الملف القضي',
        date: caseData.caseOpeningDate,
        type: 'case_opening',
        icon: <Calendar className="w-5 h-5 text-blue-600" />
      }] : []),
      // Lawsuit filing
      ...(caseData.filingDate ? [{
        id: 'lawsuit-filing',
        title: 'رفع الدعوى',
        description: 'تم رفع الدعوى للمحكمة',
        date: caseData.filingDate,
        type: 'lawsuit_filing',
        icon: <FileText className="w-5 h-5 text-green-600" />
      }] : []),
      // Hearings
      ...hearings.map(hearing => ({
        id: hearing.id,
        title: `جلسة ${hearing.date}`,
        description: hearing.decision || hearing.requirements || 'جلسة محاكمة',
        date: hearing.date,
        type: 'hearing',
        icon: <Gavel className="w-5 h-5 text-purple-600" />,
        status: hearing.status
      })),
      // Milestones
      ...(caseData.progress?.milestones || []).map(milestone => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        date: milestone.date,
        type: milestone.type,
        icon: getMilestoneIcon(milestone.type),
        status: milestone.status,
        importance: milestone.importance
      })),
      // Achievements
      ...(caseData.progress?.achievements || []).map(achievement => ({
        id: achievement.id,
        title: `إنجاز: ${achievement.title}`,
        description: achievement.description,
        date: achievement.date,
        type: 'achievement',
        icon: <Award className="w-5 h-5 text-yellow-600" />,
        impact: achievement.impact
      }))
    ];

    // Sort by date
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="space-y-6">
        {/* Progress Overview */}
        {caseData.progress && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              نظرة عامة على سير القضية
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${getStageColor(caseData.progress.currentStage)}`}>
                  {caseData.progress.currentStage === 'initial' && 'المرحلة الأولية'}
                  {caseData.progress.currentStage === 'investigation' && 'التحقيق'}
                  {caseData.progress.currentStage === 'trial' && 'المحاكمة'}
                  {caseData.progress.currentStage === 'judgment' && 'الحكم'}
                  {caseData.progress.currentStage === 'appeal' && 'الاستئناف'}
                  {caseData.progress.currentStage === 'execution' && 'التنفيذ'}
                  {caseData.progress.currentStage === 'closed' && 'مغلقة'}
                </span>
                <p className="text-sm text-slate-600 dark:text-slate-400">المرحلة الحالية</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {caseData.progress.milestones.filter(m => m.status === 'completed').length}/{caseData.progress.milestones.length}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">المحطات المنجزة</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {caseData.progress.achievements.length}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">الإنجازات</p>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            الخط الزمني للقضية
          </h3>
          <div className="relative">
            <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
            <div className="space-y-6">
              {events.map((event, index) => (
                <div key={event.id} className="relative flex items-start gap-4">
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
                    {event.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className="font-bold text-slate-800 dark:text-white">{event.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{event.date}</span>
                          {event.status && (
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(event.status)}`}>
                              {event.status === 'pending' && 'معلق'}
                              {event.status === 'completed' && 'تم'}
                              {event.status === 'delayed' && 'متأخر'}
                              {event.status === 'محددة' && 'محددة'}
                              {event.status === 'تمت' && 'تمت'}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{event.description}</p>
                      {event.importance && (
                        <div className={`mt-2 text-xs px-2 py-1 rounded border ${getImportanceColor(event.importance)}`}>
                          الأهمية: {event.importance === 'low' && 'منخفضة'}{event.importance === 'medium' && 'متوسطة'}{event.importance === 'high' && 'عالية'}{event.importance === 'critical' && 'حرجة'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMilestones = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            المحطات الرئيسية
          </h3>
          {!readOnly && (
            <button
              onClick={() => setIsAddingMilestone(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> إضافة محطة
            </button>
          )}
        </div>

        {isAddingMilestone && (
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 mb-6 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">محطة جديدة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان المحطة</label>
                <input
                  type="text"
                  placeholder="عنوان المحطة"
                  value={newMilestone.title}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
                <input
                  type="date"
                  value={newMilestone.date}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع المحطة</label>
                <select
                  value={newMilestone.type}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="case_opening">فتح القضية</option>
                  <option value="lawsuit_filing">رفع الدعوى</option>
                  <option value="first_hearing">الجلسة الأولى</option>
                  <option value="evidence_submission">تقديم الأدلة</option>
                  <option value="witness_hearing">جلسة شهود</option>
                  <option value="expert_report">تقرير خبير</option>
                  <option value="initial_judgment">حكم ابتدائي</option>
                  <option value="appeal_judgment">حكم استئنافي</option>
                  <option value="cassation_judgment">حكم نقض</option>
                  <option value="enforcement_judgment">حكم تنفيذ</option>
                  <option value="judgment">الحكم</option>
                  <option value="appeal">استئناف</option>
                  <option value="execution">تنفيذ</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الأهمية</label>
                <select
                  value={newMilestone.importance}
                  onChange={(e) => setNewMilestone(prev => ({ ...prev, importance: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                  <option value="critical">حرجة</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وصف المحطة</label>
              <textarea
                placeholder="وصف المحطة"
                value={newMilestone.description}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                rows={3}
              />
            </div>
            {/* Judgment specific fields */}
            {(newMilestone.type === 'initial_judgment' || newMilestone.type === 'appeal_judgment' || newMilestone.type === 'cassation_judgment' || newMilestone.type === 'enforcement_judgment') && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h5 className="font-bold text-blue-800 dark:text-blue-200 mb-3">بيانات الحكم</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">نوع الحكم</label>
                    <select
                      value={newMilestone.judgmentType || 'initial'}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, judgmentType: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="initial">ابتدائي</option>
                      <option value="appeal">استئنافي</option>
                      <option value="cassation">نقض</option>
                      <option value="enforcement">تنفيذ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">نتيجة الحكم</label>
                    <select
                      value={newMilestone.judgmentOutcome || ''}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, judgmentOutcome: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="">اختر النتيجة</option>
                      <option value="favorable">مواتٍ</option>
                      <option value="unfavorable">غير مواتٍ</option>
                      <option value="partial">جزئي</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">المرحلة التالية</label>
                    <select
                      value={newMilestone.nextStage || ''}
                      onChange={(e) => setNewMilestone(prev => ({ ...prev, nextStage: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="">اختر المرحلة</option>
                      <option value="appeal">استئناف</option>
                      <option value="cassation">نقض</option>
                      <option value="enforcement">تنفيذ</option>
                      <option value="closed">مغلقة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">موعد الاستئناف</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={newMilestone.appealDeadline || ''}
                        onChange={(e) => setNewMilestone(prev => ({ ...prev, appealDeadline: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newMilestone.date) {
                            const deadlines = calculateDeadlines(newMilestone.date);
                            setNewMilestone(prev => ({ ...prev, appealDeadline: deadlines.appealDeadline }));
                          }
                        }}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                      >
                        <AlertCircle className="w-4 h-4" />
                        احتساب تلقائي
                      </button>
                    </div>
                  </div>
                  {(newMilestone.type === 'appeal_judgment' || newMilestone.type === 'cassation_judgment') && (
                    <div>
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">موعد النقض</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={newMilestone.cassationDeadline || ''}
                          onChange={(e) => setNewMilestone(prev => ({ ...prev, cassationDeadline: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (newMilestone.date) {
                              const deadlines = calculateDeadlines(newMilestone.date);
                              setNewMilestone(prev => ({ ...prev, cassationDeadline: deadlines.cassationDeadline }));
                            }
                          }}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                        >
                          <AlertCircle className="w-4 h-4" />
                          احتساب تلقائي
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (onUpdateMilestone && newMilestone.title) {
                    const milestoneData = {
                      id: Math.random().toString(36).substring(2, 9),
                      title: newMilestone.title,
                      description: newMilestone.description || '',
                      date: newMilestone.date || new Date().toISOString().split('T')[0],
                      type: newMilestone.type as any,
                      status: (newMilestone.status || 'pending') as 'pending' | 'completed' | 'delayed',
                      importance: newMilestone.importance as any,
                      judgmentType: newMilestone.judgmentType,
                      judgmentOutcome: newMilestone.judgmentOutcome,
                      nextStage: newMilestone.nextStage,
                      appealDeadline: newMilestone.appealDeadline,
                      cassationDeadline: newMilestone.cassationDeadline
                    };
                    
                    console.log('حفظ المحطة الجديدة:', milestoneData);
                    
                    // Update local milestones immediately
                    setLocalMilestones(prev => [...prev, milestoneData]);
                    
                    // Reset form
                    setNewMilestone({ title: '', description: '', date: '', type: 'other', status: 'pending', importance: 'medium' });
                    
                    onUpdateMilestone(milestoneData);
                    setIsAddingMilestone(false);
                    setNewMilestone({ title: '', description: '', date: '', type: 'other', status: 'pending', importance: 'medium' });
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> حفظ
              </button>
              <button
                onClick={() => setIsAddingMilestone(false)}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {localMilestones?.map((milestone, index) => (
            <div key={`${milestone.id}-${index}`} className={`bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border-r-4 ${getImportanceColor(milestone.importance)}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    {getMilestoneIcon(milestone.type)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">{milestone.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{milestone.description}</p>
                    
                                        
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{milestone.date}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(milestone.status)}`}>
                        {milestone.status === 'pending' ? 'معلق' : milestone.status === 'completed' ? 'تم' : milestone.status === 'delayed' ? 'متأخر' : milestone.status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getImportanceColor(milestone.importance)}`}>
                        {milestone.importance === 'high' ? 'عالٍ' : milestone.importance === 'medium' ? 'متوسط' : 'منخفض'}
                      </span>
                    </div>
                  </div>
                  {/* Display judgment details for judgment milestones */}
                  {(milestone.type === 'initial_judgment' || milestone.type === 'appeal_judgment' || milestone.type === 'cassation_judgment' || milestone.type === 'enforcement_judgment') && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h5 className="font-bold text-blue-800 dark:text-blue-200 mb-2">بيانات الحكم</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-300">نوع الحكم:</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {milestone.judgmentType === 'initial' && 'حكم ابتدائي'}
                            {milestone.judgmentType === 'appeal' && 'حكم استئنافي'}
                            {milestone.judgmentType === 'cassation' && 'حكم نقض'}
                            {milestone.judgmentType === 'enforcement' && 'حكم تنفيذ'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-300">نتيجة الحكم:</span>
                          <span className={`px-2 py-1 rounded ${
                            milestone.judgmentOutcome === 'favorable' ? 'bg-green-100 text-green-700' :
                            milestone.judgmentOutcome === 'unfavorable' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {milestone.judgmentOutcome === 'favorable' && 'مواتٍ'}
                            {milestone.judgmentOutcome === 'unfavorable' && 'غير مواتٍ'}
                            {milestone.judgmentOutcome === 'partial' && 'جزئي'}
                          </span>
                        </div>
                      </div>
                      {milestone.nextStage && milestone.nextStage !== 'closed' && (
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-300">المرحلة التالية:</span>
                          <span className="text-blue-600 dark:text-blue-400">
                            {milestone.nextStage === 'appeal' && 'استئناف'}
                            {milestone.nextStage === 'cassation' && 'نقض'}
                            {milestone.nextStage === 'enforcement' && 'تنفيذ'}
                          </span>
                        </div>
                      )}
                      {milestone.appealDeadline && milestone.nextStage === 'appeal' && (
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-300">موعد الاستئناف:</span>
                          <span className={`text-blue-600 dark:text-blue-400 ${new Date(milestone.appealDeadline) < new Date() ? 'text-red-600 font-bold' : ''}`}>
                            {milestone.appealDeadline}
                            {new Date(milestone.appealDeadline) < new Date() && ' (متأخر!)'}
                          </span>
                        </div>
                      )}
                      {milestone.cassationDeadline && milestone.nextStage === 'cassation' && (
                        <div>
                          <span className="font-medium text-blue-700 dark:text-blue-300">موعد النقض:</span>
                          <span className={`text-blue-600 dark:text-blue-400 ${new Date(milestone.cassationDeadline) < new Date() ? 'text-red-600 font-bold' : ''}`}>
                            {milestone.cassationDeadline}
                            {new Date(milestone.cassationDeadline) < new Date() && ' (متأخر!)'}
                          </span>
                        </div>
                      )}
                      {/* Show calculated deadlines if not manually set */}
                      {!milestone.appealDeadline && milestone.date && milestone.judgmentType && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <span className="font-medium text-yellow-800 dark:text-yellow-200">المواعيد المحسوبة تلقائياً:</span>
                          </div>
                          {milestone.judgmentType === 'initial' && (
                            <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                              <div>موعد الاستئناف: {calculateDeadlines(milestone.date).appealDeadline}</div>
                              <div>موعد النقض: {calculateDeadlines(milestone.date).cassationDeadline}</div>
                            </div>
                          )}
                          {milestone.judgmentType === 'appeal' && (
                            <div className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                              <div>موعد النقض: {calculateDeadlines(milestone.date).cassationDeadline}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => {
                      const isCompleting = milestone.status !== 'completed';
                      const updatedMilestone = { ...milestone, status: milestone.status === 'completed' ? 'pending' as any : 'completed' as any };
                      
                      // Update local milestones immediately
                      setLocalMilestones(prev => 
                        prev.map(m => m.id === milestone.id ? updatedMilestone : m)
                      );
                      
                      onUpdateMilestone && onUpdateMilestone(updatedMilestone);
                      
                      // Auto-add next milestone if judgment is being completed
                      console.log('التحقق من شروط الإضافة التلقائية:', {
                        isCompleting,
                        milestone: milestone,
                        hasJudgmentType: !!milestone.judgmentType,
                        hasNextStage: !!milestone.nextStage,
                        nextStageValue: milestone.nextStage,
                        milestoneType: milestone.type,
                        isJudgmentMilestone: milestone.type === 'initial_judgment' || milestone.type === 'appeal_judgment' || milestone.type === 'cassation_judgment' || milestone.type === 'enforcement_judgment'
                      });
                      
                      // Check if this is a judgment milestone (by type) OR has judgment data
                      const isJudgmentMilestone = milestone.type === 'initial_judgment' || 
                                                  milestone.type === 'appeal_judgment' || 
                                                  milestone.type === 'cassation_judgment' || 
                                                  milestone.type === 'enforcement_judgment';
                      
                      if (isCompleting && (milestone.judgmentType || isJudgmentMilestone) && milestone.nextStage && milestone.nextStage !== 'closed') {
                        console.log('شروط الإضافة التلقائية متوفرة:', {
                          isCompleting,
                          judgmentType: milestone.judgmentType,
                          nextStage: milestone.nextStage,
                          milestoneDate: milestone.date
                        });
                        const nextMilestone: Partial<CaseMilestone> = {
                          id: Math.random().toString(36).substring(2, 9),
                          title: getNextMilestoneTitle(milestone.nextStage),
                          description: getNextMilestoneDescription(milestone.nextStage),
                          date: getNextMilestoneDate(milestone.date, milestone.nextStage),
                          type: getNextMilestoneType(milestone.nextStage) as any,
                          status: 'pending',
                          importance: 'high',
                          assignedTo: milestone.assignedTo || 'المحامي المسؤول'
                        };
                        
                        // Add the next milestone after a short delay
                        setTimeout(() => {
                          if (onUpdateMilestone) {
                            // Update local milestones immediately
                            setLocalMilestones(prev => [...prev, nextMilestone as CaseMilestone]);
                            
                            onUpdateMilestone(nextMilestone as CaseMilestone);
                            
                            // Show notification to user
                            const message = `تمت إضافة المحطة التالية تلقائياً: ${nextMilestone.title}`;
                            console.log(message);
                            console.log('تفاصيل المحطة المضافة:', nextMilestone);
                            
                            // Show alert for debugging
                            alert(message);
                          }
                        }, 1000);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                  >
                    {milestone.status === 'completed' ? <X className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            الإنجازات
          </h3>
          {!readOnly && (
            <button
              onClick={() => setIsAddingAchievement(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> إضافة إنجاز
            </button>
          )}
        </div>

        {isAddingAchievement && (
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 mb-6 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">إنجاز جديد</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان الإنجاز</label>
                <input
                  type="text"
                  placeholder="عنوان الإنجاز"
                  value={newAchievement.title}
                  onChange={(e) => setNewAchievement(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
                <input
                  type="date"
                  value={newAchievement.date}
                  onChange={(e) => setNewAchievement(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الإنجاز</label>
                <select
                  value={newAchievement.type}
                  onChange={(e) => setNewAchievement(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="document_filed">تقديم مستند</option>
                  <option value="hearing_won">الفوز بجلسة</option>
                  <option value="evidence_admitted">قبول دليل</option>
                  <option value="witness_testimony">شهادة شهود</option>
                  <option value="expert_opinion">رأي خبير</option>
                  <option value="settlement">تسوية</option>
                  <option value="judgment_favorable">حكم مواتٍ</option>
                  <option value="procedural_victory">انتصار إجرائي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">مستوى التأثير</label>
                <select
                  value={newAchievement.impact}
                  onChange={(e) => setNewAchievement(prev => ({ ...prev, impact: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="low">منخفض</option>
                  <option value="medium">متوسط</option>
                  <option value="high">عالي</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وصف الإنجاز</label>
              <textarea
                placeholder="وصف الإنجاز"
                value={newAchievement.description}
                onChange={(e) => setNewAchievement(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (onAddAchievement && newAchievement.title) {
                    onAddAchievement({
                      id: Math.random().toString(36).substring(2, 9),
                      title: newAchievement.title,
                      description: newAchievement.description || '',
                      date: newAchievement.date || new Date().toISOString().split('T')[0],
                      type: newAchievement.type as any,
                      impact: newAchievement.impact as any,
                      documentedBy: 'المحامي'
                    });
                    setIsAddingAchievement(false);
                    setNewAchievement({ title: '', description: '', date: '', type: 'other', impact: 'medium' });
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> حفظ
              </button>
              <button
                onClick={() => setIsAddingAchievement(false)}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {caseData.progress?.achievements?.map((achievement) => (
            <div key={achievement.id} className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <Award className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white">{achievement.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{achievement.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{achievement.date}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        achievement.impact === 'low' ? 'bg-gray-100 text-gray-700' :
                        achievement.impact === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {achievement.impact === 'low' && 'منخفض'}
                        {achievement.impact === 'medium' && 'متوسط'}
                        {achievement.impact === 'high' && 'عالي'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      بواسطة: {achievement.documentedBy}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotes = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            ملاحظات القضية
          </h3>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                onClick={() => setIsAddingNote(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> إضافة ملاحظة
              </button>
            )}
            <button
              onClick={() => setShowPrivateNotes(!showPrivateNotes)}
              className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${
                showPrivateNotes 
                  ? 'bg-slate-600 text-white' 
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {showPrivateNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPrivateNotes ? 'إخفاء الملاحظات الخاصة' : 'إظهار الملاحظات الخاصة'}
            </button>
          </div>
        </div>

        {isAddingNote && (
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 mb-6 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">ملاحظة جديدة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الملاحظة</label>
                <select
                  value={newNote.type}
                  onChange={(e) => setNewNote(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="progress_update">تحديث سير</option>
                  <option value="observation">ملاحظة</option>
                  <option value="strategy_note">ملاحظة استراتيجية</option>
                  <option value="client_communication">تواصل مع الموكل</option>
                  <option value="court_note">ملاحظة محكمة</option>
                  <option value="task_reminder">تذكير مهمة</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الأولوية</label>
                <select
                  value={newNote.priority}
                  onChange={(e) => setNewNote(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={newNote.isPrivate}
                  onChange={(e) => setNewNote(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <label htmlFor="isPrivate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  ملاحظة خاصة (لا تظهر للمحامين الآخرين)
                </label>
              </div>
            </div>
            <div className="md:col-span-2 mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المحتوى</label>
              <textarea
                placeholder="اكتب الملاحظة هنا..."
                value={newNote.content}
                onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                rows={4}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (onAddNote && newNote.content) {
                    onAddNote({
                      id: Math.random().toString(36).substring(2, 9),
                      content: newNote.content,
                      date: new Date().toISOString().split('T')[0],
                      type: newNote.type as any,
                      priority: newNote.priority as any,
                      isPrivate: newNote.isPrivate || false,
                      author: 'المحامي'
                    });
                    setIsAddingNote(false);
                    setNewNote({ content: '', type: 'progress_update', priority: 'medium', isPrivate: false });
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> حفظ
              </button>
              <button
                onClick={() => setIsAddingNote(false)}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {caseData.caseNotes?.map((note) => (
            <div key={note.id} className={`bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border border-slate-100 dark:border-slate-700 ${
              note.isPrivate && !showPrivateNotes ? 'opacity-50' : ''
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      note.priority === 'high' ? 'bg-red-100 text-red-700' :
                      note.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {note.priority === 'high' && 'عالية'}
                      {note.priority === 'medium' && 'متوسطة'}
                      {note.priority === 'low' && 'منخفضة'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{note.date}</span>
                    {note.isPrivate && (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        <EyeOff className="w-3 h-3 inline" />
                        خاصة
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      note.type === 'progress_update' ? 'bg-blue-100 text-blue-700' :
                      note.type === 'observation' ? 'bg-purple-100 text-purple-700' :
                      note.type === 'strategy_note' ? 'bg-green-100 text-green-700' :
                      note.type === 'client_communication' ? 'bg-orange-100 text-orange-700' :
                      note.type === 'court_note' ? 'bg-red-100 text-red-700' :
                      note.type === 'task_reminder' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {note.type === 'progress_update' && 'تحديث سير'}
                      {note.type === 'observation' && 'ملاحظة'}
                      {note.type === 'strategy_note' && 'ملاحظة استراتيجية'}
                      {note.type === 'client_communication' && 'تواصل مع الموكل'}
                      {note.type === 'court_note' && 'ملاحظة محكمة'}
                      {note.type === 'task_reminder' && 'تذكير مهمة'}
                      {note.type === 'other' && 'أخرى'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{note.content}</p>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    بواسطة: {note.author}
                  </div>
                </div>
                {note.isPrivate && !showPrivateNotes && (
                  <div className="text-xs text-gray-500 italic">
                    ملاحظة خاصة - لا يمكن عرضها
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProcedures = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            الإجراءات القانونية
          </h3>
          {!readOnly && (
            <button
              onClick={() => setIsAddingProcedure(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> إضافة إجراء
            </button>
          )}
        </div>

        {isAddingProcedure && (
          <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 mb-6 border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-4">إجراء قانوني جديد</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان الإجراء</label>
                <input
                  type="text"
                  placeholder="عنوان الإجراء"
                  value={newProcedure.title}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التاريخ</label>
                <input
                  type="date"
                  value={newProcedure.date}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">نوع الإجراء</label>
                <select
                  value={newProcedure.type}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="filing">تقديم</option>
                  <option value="serving">إعلان</option>
                  <option value="evidence">دليل</option>
                  <option value="motion">طلب</option>
                  <option value="objection">اعتراض</option>
                  <option value="appeal">استئناف</option>
                  <option value="enforcement">تنفيذ</option>
                  <option value="other">أخرى</option>
                  {/* Appeal procedures */}
                  <option value="appeal_filing">تقديم استئناف</option>
                  <option value="appeal_service">خدمة إعلان</option>
                  <option value="appeal_evidence">تقديم دليل استئناف</option>
                  <option value="appeal_argument">مذكرة دفاع</option>
                  <option value="appeal_objection">اعتراض على حكم</option>
                  <option value="cassation_filing">تقديم نقض</option>
                  <option value="cassation_service">خدمة نقض</option>
                  <option value="cassation_argument">مذكرة نقض</option>
                  <option value="enforcement_filing">تقديم تنفيذ</option>
                  <option value="enforcement_service">خدمة تنفيذ</option>
                  <option value="enforcement_argument">مذكرة دفاع</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الحالة</label>
                <select
                  value={newProcedure.status}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                >
                  <option value="pending">معلق</option>
                  <option value="in_progress">قيد التنفيذ</option>
                  <option value="completed">مكتمل</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المسؤول</label>
                <input
                  type="text"
                  placeholder="اسم المسؤول"
                  value={newProcedure.responsible || ''}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, responsible: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الموعد النهائي</label>
                <input
                  type="date"
                  value={newProcedure.deadline || ''}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التكلفة</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newProcedure.cost || 0}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وصف الإجراء</label>
              <textarea
                placeholder="وصف الإجراء القانوني..."
                value={newProcedure.description}
                onChange={(e) => setNewProcedure(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  if (onAddProcedure && newProcedure.title) {
                    onAddProcedure({
                      id: Math.random().toString(36).substring(2, 9),
                      title: newProcedure.title,
                      description: newProcedure.description || '',
                      date: newProcedure.date || new Date().toISOString().split('T')[0],
                      type: newProcedure.type as any,
                      status: newProcedure.status as any,
                      responsible: newProcedure.responsible || '',
                      deadline: newProcedure.deadline,
                      cost: newProcedure.cost || 0
                    });
                    setIsAddingProcedure(false);
                    setNewProcedure({ title: '', description: '', date: '', type: 'other', status: 'pending' });
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> حفظ
              </button>
              <button
                onClick={() => setIsAddingProcedure(false)}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" /> إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {caseData.procedures?.map((procedure) => (
            <div key={procedure.id} className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      procedure.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      procedure.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      procedure.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {procedure.status === 'pending' && 'معلق'}
                      {procedure.status === 'in_progress' && 'قيد التنفيذ'}
                      {procedure.status === 'completed' && 'مكتمل'}
                      {procedure.status === 'rejected' && 'مرفوض'}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{procedure.date}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white">{procedure.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{procedure.description}</p>
                  <div className="grid grid-cols-2 gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="font-medium">النوع:</span>
                      <span className={`px-2 py-1 rounded ${
                        procedure.type === 'filing' ? 'bg-blue-100 text-blue-700' :
                        procedure.type === 'serving' ? 'bg-purple-100 text-purple-700' :
                        procedure.type === 'evidence' ? 'bg-green-100 text-green-700' :
                        procedure.type === 'motion' ? 'bg-orange-100 text-orange-700' :
                        procedure.type === 'objection' ? 'bg-red-100 text-red-700' :
                        procedure.type === 'appeal' ? 'bg-amber-100 text-amber-700' :
                        procedure.type === 'enforcement' ? 'bg-indigo-100 text-indigo-700' :
                        procedure.type === 'appeal_filing' ? 'bg-pink-100 text-pink-700' :
                        procedure.type === 'appeal_service' ? 'bg-cyan-100 text-cyan-700' :
                        procedure.type === 'appeal_evidence' ? 'bg-teal-100 text-teal-700' :
                        procedure.type === 'appeal_argument' ? 'bg-orange-100 text-orange-700' :
                        procedure.type === 'cassation_filing' ? 'bg-purple-100 text-purple-700' :
                        procedure.type === 'cassation_service' ? 'bg-indigo-100 text-indigo-700' :
                        procedure.type === 'enforcement_filing' ? 'bg-red-100 text-red-700' :
                        procedure.type === 'enforcement_service' ? 'bg-yellow-100 text-yellow-700' :
                        procedure.type === 'enforcement_argument' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {procedure.type === 'filing' && 'تقديم'}
                        {procedure.type === 'serving' && 'إعلان'}
                        {procedure.type === 'evidence' && 'دليل'}
                        {procedure.type === 'motion' && 'طلب'}
                        {procedure.type === 'objection' && 'اعتراض'}
                        {procedure.type === 'appeal' && 'استئناف'}
                        {procedure.type === 'enforcement' && 'تنفيذ'}
                        {procedure.type === 'appeal_filing' && 'تقديم استئناف'}
                        {procedure.type === 'appeal_service' && 'خدمة إعلان'}
                        {procedure.type === 'appeal_evidence' && 'تقديم دليل استئناف'}
                        {procedure.type === 'appeal_argument' && 'مذكرة دفاع'}
                        {procedure.type === 'cassation_filing' && 'تقديم نقض'}
                        {procedure.type === 'cassation_service' && 'خدمة نقض'}
                        {procedure.type === 'enforcement_filing' && 'تقديم تنفيذ'}
                        {procedure.type === 'enforcement_service' && 'خدمة تنفيذ'}
                        {procedure.type === 'other' && 'أخرى'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">الحالة:</span>
                      <span className="text-blue-600 dark:text-blue-400">{procedure.status}</span>
                    </div>
                  </div>
                  {(procedure.type === 'appeal_filing' || procedure.type === 'appeal_service' || procedure.type === 'appeal_evidence' || procedure.type === 'appeal_argument' || procedure.type === 'cassation_filing' || procedure.type === 'cassation_service' || procedure.type === 'enforcement_filing' || procedure.type === 'enforcement_service') && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h5 className="font-bold text-blue-800 dark:text-blue-200 mb-2">بيانات الاستئناف</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">تاريخ التقديم</label>
                          <input
                            type="date"
                            value={procedure.appealFilingDate || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, appealFilingDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">النتيجة</label>
                          <select
                            value={procedure.appealOutcome || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, appealOutcome: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          >
                            <option value="">اختر النتيجة</option>
                            <option value="favorable">مواتٍ</option>
                            <option value="unfavorable">غير مواتٍ</option>
                            <option value="partial">جزئي</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">موعد الاستئناف</label>
                          <input
                            type="date"
                            value={procedure.appealDeadline || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, appealDeadline: e.target.value }))}
                            className="w-full px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {(procedure.type === 'cassation_filing' || procedure.type === 'cassation_service') && (
                    <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <h5 className="font-bold text-purple-800 dark:text-purple-200 mb-2">بيانات النقض</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">تاريخ التقديم</label>
                          <input
                            type="date"
                            value={procedure.cassationFilingDate || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, cassationFilingDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">النتيجة</label>
                          <select
                            value={procedure.cassationOutcome || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, cassationOutcome: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          >
                            <option value="">اختر النتيجة</option>
                            <option value="favorable">مواتٍ</option>
                            <option value="unfavorable">غير مواتٍ</option>
                            <option value="partial">جزئي</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">موعد النقض</label>
                          <input
                            type="date"
                            value={procedure.cassationDeadline || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, cassationDeadline: e.target.value }))}
                            className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {(procedure.type === 'enforcement_filing' || procedure.type === 'enforcement_service') && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <h5 className="font-bold text-red-800 dark:text-red-200 mb-2">بيانات التنفيذ</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">تاريخ التنفيذ</label>
                          <input
                            type="date"
                            value={procedure.enforcementFilingDate || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, enforcementFilingDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">النتيجة</label>
                          <select
                            value={procedure.enforcementOutcome || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, enforcementOutcome: e.target.value as any }))}
                            className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          >
                            <option value="">اختر النتيجة</option>
                            <option value="successful">ناجح</option>
                            <option value="partial">جزئي</option>
                            <option value="failed">فشل</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-red-700 dark:text-red-300 mb-1">موعد التنفيذ</label>
                          <input
                            type="date"
                            value={procedure.enforcementDeadline || ''}
                            onChange={(e) => setNewProcedure(prev => ({ ...prev, enforcementDeadline: e.target.value }))}
                            className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Main component return
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-2">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'timeline', label: 'الخط الزمني', icon: <Clock className="w-4 h-4" /> },
            { id: 'milestones', label: 'المحطات', icon: <Calendar className="w-4 h-4" /> },
            { id: 'achievements', label: 'الإنجازات', icon: <Award className="w-4 h-4" /> },
            { id: 'notes', label: 'الملاحظات', icon: <FileText className="w-4 h-4" /> },
            { id: 'procedures', label: 'الإجراءات', icon: <Activity className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' && renderTimeline()}
      {activeTab === 'milestones' && renderMilestones()}
      {activeTab === 'achievements' && renderAchievements()}
      {activeTab === 'notes' && renderNotes()}
      {activeTab === 'procedures' && renderProcedures()}
    </div>
  );
};

export default CaseProgressTracker;
