import React, { useState, useMemo, useEffect } from 'react';
import { Lawyer, LawyerStatus, LawyerSpecialization, LawyerRole, BarLevel } from '../types';
import { 
  Users, Search, Filter, Plus, Phone, Mail, MapPin, Briefcase, 
  Award, DollarSign, Calendar, MoreVertical, Edit3, Trash2, CheckCircle, XCircle 
} from 'lucide-react';
import EnhancedSearch from '../components/EnhancedSearch';
import { shouldSearchInCurrentPage, getCurrentPageSearchQuery, clearCurrentPageSearch } from '../utils/currentPageSearch';

// Local SearchSuggestion interface for Lawyers page
interface LawyersSearchSuggestion {
  id: string;
  text: string;
  type: 'lawyer' | 'specialization' | 'status' | 'location' | 'language' | 'level' | 'experience';
  metadata?: string;
}

interface LawyersProps {
  lawyers: Lawyer[];
  onAddLawyer: (lawyer: Lawyer) => void;
  onUpdateLawyer: (lawyer: Lawyer) => void;
  onDeleteLawyer: (id: string) => void;
  onLawyerClick: (id: string) => void;
  readOnly?: boolean;
}

const Lawyers: React.FC<LawyersProps> = ({ 
  lawyers, onAddLawyer, onUpdateLawyer, onDeleteLawyer, onLawyerClick, readOnly = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLawyer, setEditingLawyer] = useState<Lawyer | null>(null);

  // Check for voice search query in current page
  useEffect(() => {
    if (shouldSearchInCurrentPage()) {
      const query = getCurrentPageSearchQuery();
      
      if (query) {
        console.log('🔍 البحث الصوتي في الصفحة الحالية (المحامين):', query);
        
        // Apply search to current page
        setSearchTerm(query);
        
        // Add to recent searches
        if (!recentSearches.includes(query)) {
          setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
        }
        
        // Show results count
        setTimeout(() => {
          const results = lawyers.filter(lawyer => 
            lawyer.name.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.specialization.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.barNumber.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.email?.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.phone?.includes(query) ||
            lawyer.officeLocation.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.bio.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.education.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.languages.some(lang => lang.toLowerCase().includes(query.toLowerCase())) ||
            lawyer.role.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.status.toLowerCase().includes(query.toLowerCase()) ||
            lawyer.barLevel.toLowerCase().includes(query.toLowerCase())
          );
          
          console.log(`🔍 نتائج البحث الصوتي في المحامين: "${query}" - ${results.length} نتيجة`);
        }, 500);
        
        // Clear search after applying
        clearCurrentPageSearch();
      }
    }
  }, [lawyers, recentSearches]);

  // Legacy voice search check (for backward compatibility)
  useEffect(() => {
    const voiceSearchQuery = localStorage.getItem('voiceSearchQuery');
    const voiceSearchTimestamp = localStorage.getItem('voiceSearchTimestamp');
    const searchType = localStorage.getItem('searchType');
    const searchInCurrent = localStorage.getItem('searchInCurrentPage');
    
    console.log('🔍 التحقق من البحث الصوتي في المحامين:', { voiceSearchQuery, searchType, searchInCurrent });
    
    // Only apply legacy search if not current page search
    if (voiceSearchQuery && voiceSearchTimestamp && searchType === 'voice' && !searchInCurrent) {
      const timestamp = parseInt(voiceSearchTimestamp);
      const now = Date.now();
      
      if (now - timestamp < 15000) {
        // Check if this search is actually for lawyers
        const normalizedQuery = voiceSearchQuery.toLowerCase();
        const isLawyerSearch = normalizedQuery.includes('محامي') || normalizedQuery.includes('محامين') ||
                              normalizedQuery.includes('محامية') || normalizedQuery.includes('استشارة') ||
                              normalizedQuery.includes('محاماة') || normalizedQuery.includes('كليف') ||
                              normalizedQuery.includes('محاكم') || normalizedQuery.includes('نقابة') ||
                              normalizedQuery.includes('دفاع') || normalizedQuery.includes('مرافعة') ||
                              normalizedQuery.includes('مستشار') || normalizedQuery.includes('خبير') ||
                              normalizedQuery.includes('محكمة') || normalizedQuery.includes('قاضي');
        
        console.log('🎯 تحليل البحث:', { normalizedQuery, isLawyerSearch });
        
        // Only apply search if it's actually for lawyers
        if (isLawyerSearch) {
          console.log('✅ تطبيق البحث الصوتي للمحامين:', voiceSearchQuery);
          setSearchTerm(voiceSearchQuery);
          
          // Add to recent searches
          if (!recentSearches.includes(voiceSearchQuery)) {
            setRecentSearches(prev => [voiceSearchQuery, ...prev.slice(0, 4)]);
          }
          
          // Show voice search notification
          setTimeout(() => {
            const resultsCount = lawyers.filter(lawyer => 
              lawyer.name.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.specialization.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.barNumber.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.email?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.phone?.includes(voiceSearchQuery) ||
              lawyer.officeLocation.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.bio.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.education.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.languages.some(lang => lang.toLowerCase().includes(voiceSearchQuery.toLowerCase())) ||
              lawyer.role.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.status.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              lawyer.barLevel.toLowerCase().includes(voiceSearchQuery.toLowerCase())
            ).length;
            
            console.log(`🔍 البحث الصوتي في المحامين: "${voiceSearchQuery}" - ${resultsCount} نتيجة`);
          }, 500);
        } else {
          console.log('❌ هذا البحث ليس للمحامين، سيتم تجاهله:', voiceSearchQuery);
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
  }, [lawyers, recentSearches]);

  const [formData, setFormData] = useState<Partial<Lawyer>>({
    name: '',
    phone: '',
    email: '',
    nationalId: '',
    barNumber: '',
    barRegistrationNumber: '',
    barLevel: BarLevel.GENERAL,
    specialization: LawyerSpecialization.CRIMINAL,
    role: LawyerRole.LAWYER,
    status: LawyerStatus.ACTIVE,
    joinDate: new Date().toISOString().split('T')[0],
    officeLocation: '',
    bio: '',
    education: '',
    experience: 0,
    hourlyRate: 0,
    languages: [],
    casesHandled: 0,
    successRate: 0,
    profileImage: ''
  });

  const filteredLawyers = useMemo(() => {
    return lawyers.filter(l => {
      const matchesSearch = (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (l.phone || '').includes(searchTerm) ||
                            (l.officeLocation || '').includes(searchTerm) ||
                            (l.barRegistrationNumber || '').includes(searchTerm) ||
                            (l.barNumber || '').includes(searchTerm) ||
                            (l.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterLevel === 'all' || l.barLevel === filterLevel;
      return matchesSearch && matchesFilter;
    });
  }, [lawyers, searchTerm, filterLevel]);

  // --- Search Suggestions ---
  const suggestions = useMemo(() => {
    const suggestionList: LawyersSearchSuggestion[] = [];
    
    // Add lawyer suggestions
    lawyers.forEach(lawyer => {
      const specText = lawyer.specialization === LawyerSpecialization.GENERAL ? 'عام' : 
                      lawyer.specialization === LawyerSpecialization.CIVIL ? 'مدني' : 
                      lawyer.specialization === LawyerSpecialization.CRIMINAL ? 'جنائي' : 'تخصص آخر';
      const statusText = lawyer.status === LawyerStatus.ACTIVE ? 'نشط' : 
                        lawyer.status === LawyerStatus.INACTIVE ? 'غير نشط' : 'في إجازة';
      
      suggestionList.push({
        id: `lawyer-${lawyer.id}`,
        text: lawyer.name,
        type: 'lawyer',
        metadata: `${specText} - ${statusText}`
      });
    });
    
    // Add specialization suggestions
    const specializations = Object.values(LawyerSpecialization);
    specializations.forEach(spec => {
      const specLawyers = lawyers.filter(l => l.specialization === spec);
      if (specLawyers.length > 0) {
        const specText = spec === LawyerSpecialization.GENERAL ? 'عام' : 
                        spec === LawyerSpecialization.CIVIL ? 'مدني' : 
                        spec === LawyerSpecialization.CRIMINAL ? 'جنائي' : 'تخصص آخر';
        suggestionList.push({
          id: `specialization-${spec}`,
          text: specText,
          type: 'specialization',
          metadata: `${specLawyers.length} محامي`
        });
      }
    });
    
    // Add status suggestions
    const statuses = Object.values(LawyerStatus);
    statuses.forEach(status => {
      const statusLawyers = lawyers.filter(l => l.status === status);
      const statusText = status === LawyerStatus.ACTIVE ? 'نشطون' : 
                       status === LawyerStatus.INACTIVE ? 'غير نشطين' : 'في إجازة';
      suggestionList.push({
        id: `status-${status}`,
        text: statusText,
        type: 'status',
        metadata: `${statusLawyers.length} محامي`
      });
    });
    
    // Add location suggestions
    const locations = [...new Set(lawyers.filter(l => l.officeLocation).map(l => l.officeLocation!))];
    locations.forEach(location => {
      const locationLawyers = lawyers.filter(l => l.officeLocation === location);
      suggestionList.push({
        id: `location-${location}`,
        text: location,
        type: 'location',
        metadata: `${locationLawyers.length} محامي`
      });
    });
    
    // Add language suggestions
    const allLanguages = [...new Set(lawyers.flatMap(l => l.languages || []))];
    allLanguages.forEach(language => {
      const langLawyers = lawyers.filter(l => l.languages?.includes(language));
      suggestionList.push({
        id: `language-${language}`,
        text: language,
        type: 'language',
        metadata: `${langLawyers.length} محامي`
      });
    });
    
    // Add level suggestions
    const levels = ['general', 'appellate', 'cassation'];
    levels.forEach(level => {
      const levelLawyers = lawyers.filter(l => l.barLevel === level);
      const levelText = level === 'general' ? 'محامون عامون' : 
                      level === 'appellate' ? 'محامون استئناف' : 'محامون نقض';
      suggestionList.push({
        id: `level-${level}`,
        text: levelText,
        type: 'level',
        metadata: `${levelLawyers.length} محامي`
      });
    });
    
    return suggestionList;
  }, [lawyers]);

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    
    // Add to recent searches if not empty and not already in list
    if (query && query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleSuggestionClick = (suggestion: LawyersSearchSuggestion) => {
    if (suggestion.type === 'lawyer') {
      // Find and scroll to lawyer
      const lawyerId = suggestion.id.replace('lawyer-', '');
      const lawyerElement = document.getElementById(`lawyer-${lawyerId}`);
      if (lawyerElement) {
        lawyerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lawyerElement.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2');
        setTimeout(() => {
          lawyerElement.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2');
        }, 3000);
      }
    } else if (suggestion.type === 'specialization') {
      // Filter by specialization
      const spec = suggestion.id.replace('specialization-', '');
      setSearchTerm('');
      // Note: You might want to add a filter state for specialization
    } else if (suggestion.type === 'status') {
      // Filter by status
      const status = suggestion.id.replace('status-', '');
      setSearchTerm('');
      // Note: You might want to add a filter state for status
    } else if (suggestion.type === 'location') {
      // Search by location
      setSearchTerm(suggestion.text);
    } else if (suggestion.type === 'language') {
      // Search by language
      setSearchTerm(suggestion.text);
    } else if (suggestion.type === 'level') {
      // Filter by bar level
      const level = suggestion.id.replace('level-', '');
      setFilterLevel(level);
      setSearchTerm('');
    } else if (suggestion.type === 'experience') {
      // Filter by experience range
      setSearchTerm('');
      // Note: You might want to add a filter state for experience
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLawyer) {
      onUpdateLawyer({ ...editingLawyer, ...formData } as Lawyer);
    } else {
      onAddLawyer({ ...formData, id: Date.now().toString() } as Lawyer);
    }
    setIsModalOpen(false);
    setEditingLawyer(null);
    setFormData({
      name: '', phone: '', email: '', nationalId: '',
      barNumber: '', barRegistrationNumber: '', barLevel: BarLevel.GENERAL, 
      specialization: LawyerSpecialization.CRIMINAL, role: LawyerRole.LAWYER,
      status: LawyerStatus.ACTIVE, joinDate: new Date().toISOString().split('T')[0],
      officeLocation: '', bio: '', education: '', experience: 0,
      hourlyRate: 0, languages: [], casesHandled: 0, successRate: 0, profileImage: ''
    });
  };

  const openEditModal = (lawyer: Lawyer) => {
    setEditingLawyer(lawyer);
    setFormData(lawyer);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-indigo-600" />
            إدارة المحامين
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">سجل كامل لبيانات المحامين، درجات القيد، والرواتب</p>
        </div>
        {!readOnly && (
          <button 
            onClick={() => {
              setEditingLawyer(null);
              setFormData({
                name: '', phone: '', whatsapp: '', email: '', governorate: '', office: '',
                barLevel: 'general', salary: 0, specialization: '', joinDate: new Date().toISOString().split('T')[0],
                status: 'active', notes: ''
              });
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
          >
            <Plus className="w-5 h-5" /> إضافة محامي جديد
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex-1 relative">
          <EnhancedSearch
            onSearch={handleSearch}
            onSuggestionClick={handleSuggestionClick as any}
            placeholder="البحث في المحامين: الاسم، التخصص، الحالة، الموقع..."
            suggestions={suggestions as any}
            recentSearches={recentSearches}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">كل الدرجات</option>
            <option value={BarLevel.GENERAL}>جدول عام</option>
            <option value={BarLevel.PRIMARY}>ابتدائي</option>
            <option value={BarLevel.APPEAL}>استئناف</option>
            <option value={BarLevel.CASSATION}>نقض</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLawyers.map(lawyer => (
          <div 
            key={lawyer.id} 
            id={`lawyer-${lawyer.id}`}
            onClick={() => onLawyerClick(lawyer.id)}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-1 h-full ${lawyer.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
            
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">{lawyer.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${lawyer.status === 'active' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                      {lawyer.status === 'active' ? 'نشط' : 'غير نشط'} • {lawyer.barNumber || 'غير محدد'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {lawyer.barLevel || 'غير محدد'}
                    </p>
                    {lawyer.barRegistrationNumber && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        القيد في النقابة: {lawyer.barRegistrationNumber}
                      </p>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => openEditModal(lawyer)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDeleteLawyer(lawyer.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{lawyer.phone || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{lawyer.officeLocation || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span>{lawyer.specialization || 'غير محدد'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <span className="font-mono font-bold">{(lawyer.hourlyRate || 0).toLocaleString()} EGP</span>
                  <span className="text-xs text-slate-500">الراتب</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700/50 px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> انضم: {lawyer.joinDate || 'غير محدد'}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-bold ${lawyer.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'}`}>
                {lawyer.status === 'active' ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-800 z-10">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingLawyer ? 'تعديل بيانات محامي' : 'إضافة محامي جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم رباعي</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الرقم القومي</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.nationalId}
                    onChange={e => setFormData({...formData, nationalId: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف</label>
                  <input 
                    required
                    type="tel" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                  <input 
                    type="email" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المحافظة</label>
                  <input 
                    required
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.governorate}
                    onChange={e => setFormData({...formData, governorate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم القيد في النقابة</label>
                  <input 
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.barRegistrationNumber || ''}
                    onChange={e => setFormData({...formData, barRegistrationNumber: e.target.value})}
                    placeholder="أدخل رقم القيد في النقابة"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">درجة القيد بالنقابة</label>
                  <select 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.barLevel || ''}
                    onChange={e => setFormData({...formData, barLevel: e.target.value as BarLevel})}
                  >
                    <option value="">اختر درجة القيد</option>
                    <option value={BarLevel.GENERAL}>جدول عام</option>
                    <option value={BarLevel.PRIMARY}>محاكم ابتدائية</option>
                    <option value={BarLevel.APPEAL}>استئناف عالي ومجلس دولة</option>
                    <option value={BarLevel.CASSATION}>نقض</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المكتب التابع له</label>
                  <input 
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.officeLocation || ''}
                    onChange={e => setFormData({...formData, officeLocation: e.target.value})}
                    placeholder="أدخل موقع المكتب"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الراتب الشهري</label>
                  <input 
                    type="number" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.salary}
                    onChange={e => setFormData({...formData, salary: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">التخصص</label>
                  <input 
                    type="text" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.specialization}
                    onChange={e => setFormData({...formData, specialization: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الانضمام</label>
                  <input 
                    type="date" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.joinDate}
                    onChange={e => setFormData({...formData, joinDate: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية</label>
                  <textarea 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      checked={formData.status === 'active'}
                      onChange={e => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})}
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">محامي نشط في المكتب</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};

export default Lawyers;
