
import React, { useState, useEffect, useMemo } from 'react';
import { Case, Client, CaseStatus, CourtType, LawBranch, Lawyer, Hearing } from '../types';
import { Briefcase, Search, Plus, Filter, User, Calendar, MapPin, ArrowUpRight, X, Save, Gavel, LayoutGrid, List, Users, Scale, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import EnhancedSearch from '../components/EnhancedSearch';
import { shouldSearchInCurrentPage, getCurrentPageSearchQuery, clearCurrentPageSearch, performCurrentPageSearch } from '../utils/currentPageSearch';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'case' | 'client' | 'hearing' | 'document';
  metadata?: string;
}

interface CasesProps {
  cases: Case[];
  clients: Client[];
  lawyers: Lawyer[];
  hearings: Hearing[];
  onCaseClick: (caseId: string) => void;
  onAddCase?: (newCase: Omit<Case, 'id'>) => void;
  onUpdateCase?: (updatedCase: Case) => void;
  onDeleteCase?: (caseId: string) => void;
  onAddClient?: (newClient: Omit<Client, 'id'>) => void;
  onAddHearing?: (newHearing: Omit<Hearing, 'id'>) => void;
  readOnly?: boolean;
  currentUser?: any;
}

const Cases: React.FC<CasesProps> = ({ 
  cases, clients, hearings, lawyers, onCaseClick, onAddCase, onUpdateCase, onDeleteCase, onAddClient, onAddHearing, readOnly = false, currentUser 
}) => {
  const offlineStatus = useOfflineStatus();
  const isOnline = offlineStatus?.online ?? true;
  const pendingCount = offlineStatus?.pendingActions ?? 0;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [lawyerFilter, setLawyerFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [forceRerender, setForceRerender] = useState(0); // Force re-render for offline updates
  
  // Check for voice search query in current page
  useEffect(() => {
    if (shouldSearchInCurrentPage()) {
      const query = getCurrentPageSearchQuery();
      
      if (query) {
        console.log('🔍 البحث الصوتي في الصفحة الحالية (القضايا):', query);
        
        // Apply search to current page
        setSearchTerm(query);
        
        // Add to recent searches
        if (!recentSearches.includes(query)) {
          setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
        }
        
        // Show results count
        setTimeout(() => {
          const results = performCurrentPageSearch(query, 'cases', cases);
          // console.log(`🔍 نتائج البحث الصوتي في القضايا: "${query}" - ${results.length} نتيجة`);
        }, 500);
        
        // Clear search after applying
        clearCurrentPageSearch();
      }
    }
  }, [cases, recentSearches]);

  // Legacy voice search check (for backward compatibility)
  useEffect(() => {
    const voiceSearchQuery = localStorage.getItem('voiceSearchQuery');
    const voiceSearchTimestamp = localStorage.getItem('voiceSearchTimestamp');
    const searchType = localStorage.getItem('searchType');
    const searchInCurrent = localStorage.getItem('searchInCurrentPage');
    
    // console.log('🔍 التحقق من البحث الصوتي في القضايا:', { voiceSearchQuery, searchType, searchInCurrent });
    
    // Only apply legacy search if not current page search
    if (voiceSearchQuery && voiceSearchTimestamp && searchType === 'voice' && !searchInCurrent) {
      const timestamp = parseInt(voiceSearchTimestamp);
      const now = Date.now();
      
      if (now - timestamp < 15000) {
        // Check if this search is actually for cases (not clients)
        const normalizedQuery = voiceSearchQuery.toLowerCase();
        const isCaseSearch = normalizedQuery.includes('قضية') || normalizedQuery.includes('حكم') || 
                           normalizedQuery.includes('استئناف') || normalizedQuery.includes('دعوى') ||
                           normalizedQuery.includes('طعن') || normalizedQuery.includes('مستأنف') ||
                           normalizedQuery.includes('محكمة') || normalizedQuery.includes('قاضي') ||
                           normalizedQuery.includes('جلسة') || normalizedQuery.includes('حكم نهائي') ||
                           normalizedQuery.includes('حكم ابتدائي') || normalizedQuery.includes('استئناف') ||
                           normalizedQuery.includes('نقض') || normalizedQuery.includes('خصم') ||
                           normalizedQuery.includes('الخصومة') || normalizedQuery.includes('محاكم');
        
        // console.log('🎯 تحليل البحث:', { normalizedQuery, isCaseSearch });
        
        // Only apply search if it's actually for cases
        if (isCaseSearch) {
          // console.log('✅ تطبيق البحث الصوتي للقضايا:', voiceSearchQuery);
          setSearchTerm(voiceSearchQuery);
          
          // Add to recent searches
          if (!recentSearches.includes(voiceSearchQuery)) {
            setRecentSearches(prev => [voiceSearchQuery, ...prev.slice(0, 4)]);
          }
          
          // Show voice search notification
          setTimeout(() => {
            const resultsCount = cases.filter(c => 
              c.title.toLowerCase().includes(voiceSearchQuery.toLowerCase()) || 
              c.caseNumber.includes(voiceSearchQuery) || 
              c.clientName.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              c.court.toLowerCase().includes(voiceSearchQuery.toLowerCase())
            ).length;
            
            // console.log(`🔍 البحث الصوتي في القضايا: "${voiceSearchQuery}" - ${resultsCount} نتيجة`);
          }, 500);
        } else {
          // console.log('❌ هذا البحث ليس للقضايا، سيتم تجاهله:', voiceSearchQuery);
        }
        
        // Always clear the stored voice search after checking
        setTimeout(() => {
          localStorage.removeItem('voiceSearchQuery');
          localStorage.removeItem('voiceSearchTimestamp');
          localStorage.removeItem('searchType');
        }, 1000);
      } else {
        // Clear old voice search queries
        localStorage.removeItem('voiceSearchQuery');
        localStorage.removeItem('voiceSearchTimestamp');
        localStorage.removeItem('searchType');
      }
    }
  }, [cases, recentSearches]);
  
  // Force re-render when cases change (for offline updates)
  useEffect(() => {
    // console.log('🔄 Cases.tsx - Cases prop changed:', cases.length);
    setForceRerender(prev => prev + 1);
  }, [cases]);

  // Generate search suggestions
  const suggestions = useMemo(() => {
    const suggestionList: SearchSuggestion[] = [];
    
    // Add case suggestions
    cases.forEach(c => {
      suggestionList.push({
        id: `case-${c.id}`,
        text: `${c.caseNumber} / ${c.year} - ${c.title}`,
        type: 'case',
        metadata: `${c.clientName} - ${c.court}`
      });
    });
    
    // Add client suggestions
    clients.forEach(client => {
      suggestionList.push({
        id: `client-${client.id}`,
        text: client.name,
        type: 'client',
        metadata: `موكل - ${client.phone || ''}`
      });
    });
    
    // Add hearing suggestions
    hearings.forEach(hearing => {
      const caseInfo = cases.find(c => c.id === hearing.caseId);
      if (caseInfo) {
        suggestionList.push({
          id: `hearing-${hearing.id}`,
          text: `جلسة ${hearing.date}`,
          type: 'hearing',
          metadata: `${caseInfo.title} - ${hearing.time || ''}`
        });
      }
    });
    
    return suggestionList;
  }, [cases, clients, hearings]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    
    // Add to recent searches if not empty and not already in list
    if (query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'case') {
      const caseId = suggestion.id.replace('case-', '');
      onCaseClick(caseId);
    } else if (suggestion.type === 'client') {
      setSearchTerm(suggestion.text);
    } else if (suggestion.type === 'hearing') {
      const hearingId = suggestion.id.replace('hearing-', '');
      const hearing = hearings.find(h => h.id === hearingId);
      if (hearing) {
        const caseInfo = cases.find(c => c.id === hearing.caseId);
        if (caseInfo) {
          onCaseClick(caseInfo.id);
        }
      }
    }
  };
  
  // New Case Form State
  const [formData, setFormData] = useState<Partial<Case>>({
    title: '',
    caseNumber: '',
    year: new Date().getFullYear(),
    court: '',
    status: CaseStatus.OPEN,
    clientId: '',
    clientRole: 'مدعي',
    courtBranch: '',
    circle: '',
    judgeName: '',
    description: '',
    caseType: undefined,
    assignedLawyerId: '',
    assignedLawyerName: '',
    filingDate: new Date().toISOString().split('T')[0]
  });

  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.caseNumber.includes(searchTerm) || 
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesType = typeFilter === 'all' || c.caseType === typeFilter;
    const matchesCourt = courtFilter === 'all' || c.court === courtFilter;
    const matchesLawyer = lawyerFilter === 'all' || (c.assignedLawyerId && c.assignedLawyerId.includes(lawyerFilter));
    
    return matchesSearch && matchesStatus && matchesType && matchesCourt && matchesLawyer;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddCase) return;
    
    const client = clients.find(c => c.id === formData.clientId);
    const newCase: Omit<Case, 'id'> = {
      title: formData.title || '',
      caseNumber: formData.caseNumber || '',
      year: formData.year || new Date().getFullYear(),
      court: formData.court || '',
      courtBranch: formData.courtBranch,
      circle: formData.circle,
      judgeName: formData.judgeName,
      status: formData.status as CaseStatus,
      clientId: formData.clientId || '',
      clientName: client?.name || '',
      clientRole: formData.clientRole,
      description: formData.description,
      finance: { agreedFees: 0, paidAmount: 0, expenses: 0, history: [] },
      caseType: formData.caseType,
      assignedLawyerId: formData.assignedLawyerId,
      filingDate: formData.filingDate
    };

    onAddCase(newCase);
    setIsAddModalOpen(false);
    setFormData({
      title: '', caseNumber: '', year: new Date().getFullYear(), court: '', 
      status: CaseStatus.OPEN, clientId: '', clientRole: 'مدعي',
      filingDate: new Date().toISOString().split('T')[0]
    });
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.OPEN: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-900';
      case CaseStatus.CLOSED: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-600';
      case CaseStatus.ARCHIVED: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
      case CaseStatus.JUDGMENT: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900';
      case CaseStatus.EXECUTION: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-900';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getLawyerName = (id?: string) => {
    if (!id) return 'غير معين';
    const lawyer = lawyers.find(l => l.id === id);
    return lawyer ? lawyer.name : id;
  };

  const getCaseTypeArabic = (type?: string) => {
    switch (type) {
      case 'civil': return 'مدني';
      case 'criminal': return 'جنائي';
      case 'family': return 'أسرة';
      case 'administrative': return 'مجلس دولة';
      case 'labor': return 'عمالي';
      case 'commercial': return 'تجاري';
      case 'other': return 'أخرى';
      default: return type || '-';
    }
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
      {filteredCases.map(c => {
        const opponent = c.opponents && c.opponents.length > 0 ? c.opponents[0] : null;
        const nextHearing = hearings.find(h => h.caseId === c.id && new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)));
        return (
          <div key={`${c.id}-${forceRerender}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group overflow-hidden flex flex-col relative">
            <div className={`h-1.5 w-full ${
              c.status === CaseStatus.OPEN ? 'bg-green-500' :
              c.status === CaseStatus.CLOSED ? 'bg-slate-400' : 'bg-amber-500'
            }`}></div>
            
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-600">
                  {c.caseNumber} / {c.year}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getStatusColor(c.status)}`}>
                  {c.status}
                </span>
              </div>
              
              <h3 
                onClick={() => onCaseClick(c.id)}
                className="text-lg font-bold text-slate-800 dark:text-white mb-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors line-clamp-1"
              >
                {c.title}
              </h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <User className="w-3 h-3" />
                  <span className="truncate">{c.clientName} ({c.clientRole})</span>
                </div>
                {opponent && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-3 h-3 text-red-500" />
                    <span className="truncate text-red-600 dark:text-red-400 font-medium">ضد: {opponent.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{c.courtBranch || c.court}</span>
                </div>
                {c.caseType && (
                   <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Scale className="w-3 h-3 text-indigo-500" />
                      <span className="truncate">{getCaseTypeArabic(c.caseType)}</span>
                   </div>
                )}
                {c.assignedLawyerId && (
                   <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Briefcase className="w-3 h-3 text-emerald-500" />
                      <span className="truncate">المحامي: {getLawyerName(c.assignedLawyerId)}</span>
                   </div>
                )}
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

            <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-mono">ID: {c.id}</span>
              <button 
                onClick={() => onCaseClick(c.id)}
                className="text-primary-600 dark:text-primary-400 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                التفاصيل <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTableView = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in">
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600">
            <tr>
              <th className="p-4 w-[25%]">عنوان الدعوى</th>
              <th className="p-4">رقم الدعوى</th>
              <th className="p-4">النوع / المحكمة</th>
              <th className="p-4">الخصوم</th>
              <th className="p-4">المحامي المسؤول</th>
              <th className="p-4">الحالة</th>
              <th className="p-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredCases.map(c => (
              <tr key={`${c.id}-${forceRerender}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-800 dark:text-slate-200 group">
                <td className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        c.status === CaseStatus.OPEN ? 'bg-green-500' :
                        c.status === CaseStatus.CLOSED ? 'bg-slate-400' : 'bg-amber-500'
                    }`}></div>
                    <div>
                        <div 
                            onClick={() => onCaseClick(c.id)}
                            className="font-bold cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-base"
                        >
                            {c.title}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.description || 'لا يوجد وصف'}</div>
                        {c.filingDate && <div className="text-[10px] text-slate-400 mt-1">تاريخ القيد: {c.filingDate}</div>}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                   <span className="font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-600 whitespace-nowrap">
                      {c.caseNumber} / {c.year}
                   </span>
                </td>
                <td className="p-4">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{c.court}</span>
                      {c.caseType && <span className="text-xs text-indigo-600 dark:text-indigo-400">{getCaseTypeArabic(c.caseType)}</span>}
                      {c.courtBranch && <span className="text-[10px] text-slate-400">{c.courtBranch}</span>}
                   </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-1.5 rounded-full text-indigo-600 dark:text-indigo-400">
                         <User className="w-3 h-3" />
                      </div>
                      <div className="flex flex-col">
                          <span className="font-bold text-xs">{c.clientName}</span>
                          <span className="text-[10px] text-slate-400">{c.clientRole}</span>
                      </div>
                    </div>
                    {c.opponents && c.opponents.length > 0 && (
                      <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-1">
                        <div className="bg-red-50 dark:bg-red-900/30 p-1.5 rounded-full text-red-600 dark:text-red-400">
                            <Users className="w-3 h-3" />
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">{c.opponents[0].name}</span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                   {c.assignedLawyerId ? (
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                         <Briefcase className="w-3 h-3 text-slate-400" />
                         {getLawyerName(c.assignedLawyerId)}
                      </span>
                   ) : (
                      <span className="text-xs text-slate-400">-</span>
                   )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-4">
                  <button 
                    onClick={() => onCaseClick(c.id)}
                    className="group-hover:bg-white dark:group-hover:bg-slate-800 border border-transparent group-hover:border-slate-200 dark:group-hover:border-slate-600 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 p-2 rounded-lg transition-all"
                    title="فتح الملف"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* Offline Status Indicator */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              وضع عدم الاتصال - سيتم حفظ القضايا محلياً
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {pendingCount} إجراء تنتظر المزامنة
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary-600" />
            سجل القضايا
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-500" />
            )}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">إدارة ومتابعة جميع ملفات القضايا ({cases.length} قضية)</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          {!readOnly && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors w-full md:w-auto"
            >
              <Plus className="w-4 h-4" /> قضية جديدة
            </button>
          )}
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col gap-4">
        {/* Enhanced Search Bar */}
        <EnhancedSearch
          onSearch={handleSearch}
          onSuggestionClick={handleSuggestionClick}
          placeholder="البحث في القضايا، الموكلين، الجلسات..."
          suggestions={suggestions}
          recentSearches={recentSearches}
          className="w-full"
        />
        
        {/* Advanced Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 flex-1 min-w-[150px]">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none w-full cursor-pointer"
            >
              <option value="all">جميع الحالات</option>
              {Object.values(CaseStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 flex-1 min-w-[150px]">
            <Scale className="w-4 h-4 text-slate-400 shrink-0" />
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none w-full cursor-pointer"
            >
              <option value="all">جميع الأنواع</option>
              <option value="civil">مدني</option>
              <option value="criminal">جنائي</option>
              <option value="family">أسرة</option>
              <option value="administrative">مجلس دولة</option>
              <option value="labor">عمالي</option>
              <option value="commercial">تجاري</option>
            </select>
          </div>

          {/* Court Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 flex-1 min-w-[150px]">
            <Gavel className="w-4 h-4 text-slate-400 shrink-0" />
            <select 
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none w-full cursor-pointer"
            >
              <option value="all">جميع المحاكم</option>
              {Object.values(CourtType).map(court => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
          </div>

          {/* Lawyer Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 flex-1 min-w-[150px]">
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
            <input 
              type="text"
              value={lawyerFilter === 'all' ? '' : lawyerFilter}
              onChange={(e) => setLawyerFilter(e.target.value || 'all')}
              placeholder="بحث بالمحامي..."
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none w-full cursor-pointer"
            />
          </div>

          {/* View Toggle */}
          <div className="flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shrink-0 ml-auto">
             <button 
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="عرض بطاقات"
             >
                <LayoutGrid className="w-5 h-5" />
             </button>
             <button 
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                title="عرض جدول"
             >
                <List className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      {/* Cases List */}
      {viewMode === 'grid' ? renderGridView() : renderTableView()}
      
      {filteredCases.length === 0 && (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-bold">لا توجد قضايا مطابقة للبحث</p>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 sticky top-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">إضافة قضية جديدة</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان الدعوى <span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="مثال: دعوى تعويض عن حادث سيارة" />
                </div>
                
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الدعوى <span className="text-red-500">*</span></label>
                   <input type="text" required className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.caseNumber} onChange={e => setFormData({...formData, caseNumber: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">السنة</label>
                   <input type="number" className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">نوع القضية</label>
                   <select className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.caseType || ''} onChange={e => setFormData({...formData, caseType: e.target.value as LawBranch})}>
                      <option value="">اختر...</option>
                      <option value="civil">مدني</option>
                      <option value="criminal">جنائي</option>
                      <option value="family">أسرة</option>
                      <option value="administrative">مجلس دولة</option>
                      <option value="labor">عمالي</option>
                      <option value="commercial">تجاري</option>
                   </select>
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ القيد</label>
                   <input type="date" className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.filingDate} onChange={e => setFormData({...formData, filingDate: e.target.value})} />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">المحكمة المختصة <span className="text-red-500">*</span></label>
                   <select required className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.court} onChange={e => setFormData({...formData, court: e.target.value})}>
                      <option value="">اختر...</option>
                      {Object.values(CourtType).map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">اسم/مقر المحكمة</label>
                   <input type="text" className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.courtBranch} onChange={e => setFormData({...formData, courtBranch: e.target.value})} placeholder="مثال: مجمع محاكم زنانيري" />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">الدائرة</label>
                   <input type="text" className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.circle} onChange={e => setFormData({...formData, circle: e.target.value})} />
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">اسم القاضي</label>
                   <input type="text" className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.judgeName} onChange={e => setFormData({...formData, judgeName: e.target.value})} />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">الموكل <span className="text-red-500">*</span></label>
                   <select required className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
                      <option value="">اختر الموكل...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">صفة الموكل</label>
                   <input type="text" className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.clientRole} onChange={e => setFormData({...formData, clientRole: e.target.value})} placeholder="مدعي / مدعى عليه" />
                </div>

                <div>
                   <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">المحامي المسؤول</label>
                   <select className="w-full border p-2 rounded-lg bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white" value={formData.assignedLawyerId || ''} onChange={e => {
                     const selectedLawyer = lawyers.find(l => l.id === e.target.value);
                     setFormData({
                       ...formData, 
                       assignedLawyerId: e.target.value,
                       assignedLawyerName: selectedLawyer ? selectedLawyer.name : ''
                     });
                   }}>
                      <option value="">اختر المحامي المسؤول...</option>
                      {lawyers.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name}</option>)}
                   </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                 <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold">إلغاء</button>
                 <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold shadow-md flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" /> حفظ القضية
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cases;
