
import React, { useState, useEffect, useMemo } from 'react';
import { WorkLocation } from '../types';
import { MapPin, Search, Plus, Filter, Navigation, Phone, Info, Building2, Shield, FileSignature, X, Save, Edit3, Trash2, Map } from 'lucide-react';
import { 
  getLocations, 
  addLocation, 
  updateLocation, 
  deleteLocation 
} from '../services/dbService';
import EnhancedSearch from '../components/EnhancedSearch';

// Local SearchSuggestion interface for Locations page
interface LocationsSearchSuggestion {
  id: string;
  text: string;
  type: 'location' | 'type' | 'governorate' | 'address' | 'phone';
  metadata?: string;
}

interface LocationsProps {
  readOnly?: boolean;
}

const Locations: React.FC<LocationsProps> = ({ readOnly = false }) => {
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<WorkLocation>>({
    name: '', type: 'court', address: '', governorate: 'القاهرة'
  });

  // Load data from Firebase
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setLoading(true);
        const data = await getLocations();
        setLocations(data);
      } catch (error) {
        console.error('Error loading locations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLocations();
  }, []);

  // --- Search Suggestions ---
  const suggestions = useMemo(() => {
    const suggestionList: LocationsSearchSuggestion[] = [];
    
    // Add location suggestions
    locations.forEach(location => {
      suggestionList.push({
        id: `location-${location.id}`,
        text: location.name,
        type: 'location',
        metadata: `${location.type === 'court' ? 'محكمة' : location.type === 'police_station' ? 'قسم شرطة' : location.type === 'notary' ? 'كاتب عدل' : location.type === 'expert' ? 'خبير' : 'أخرى'} - ${location.governorate}`
      });
    });
    
    // Add type suggestions
    const types = ['court', 'police_station', 'notary', 'expert', 'other'] as const;
    types.forEach(type => {
      const typeLocations = locations.filter(l => l.type === type);
      if (typeLocations.length > 0) {
        suggestionList.push({
          id: `type-${type}`,
          text: type === 'court' ? 'محاكم' : type === 'police_station' ? 'أقسام الشرطة' : type === 'notary' ? 'كتاب العدل' : type === 'expert' ? 'الخبراء' : 'أخرى',
          type: 'type',
          metadata: `${typeLocations.length} موقع`
        });
      }
    });
    
    // Add governorate suggestions
    const governorates = [...new Set(locations.map(l => l.governorate))];
    governorates.forEach(governorate => {
      const governorateLocations = locations.filter(l => l.governorate === governorate);
      suggestionList.push({
        id: `governorate-${governorate}`,
        text: governorate,
        type: 'governorate',
        metadata: `${governorateLocations.length} موقع`
      });
    });
    
    // Add address suggestions
    locations.forEach(location => {
      if (location.address) {
        suggestionList.push({
          id: `address-${location.id}`,
          text: location.address,
          type: 'address',
          metadata: location.name
        });
      }
    });
    
    // Add phone suggestions
    locations.forEach(location => {
      if (location.phone) {
        suggestionList.push({
          id: `phone-${location.id}`,
          text: location.phone,
          type: 'phone',
          metadata: location.name
        });
      }
    });
    
    return suggestionList;
  }, [locations]);

  const handleSearch = (query: string) => {
    // Ensure search term is properly handled
    setSearchTerm(query || '');
    
    // Add to recent searches only if query is not empty and not already in list
    if (query && query.trim() && !recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleSuggestionClick = (suggestion: LocationsSearchSuggestion) => {
    if (suggestion.type === 'location') {
      // Find and scroll to location
      const locationId = suggestion.id.replace('location-', '');
      const locationElement = document.getElementById(`location-${locationId}`);
      if (locationElement) {
        locationElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        locationElement.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2');
        setTimeout(() => {
          locationElement.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2');
        }, 3000);
      }
    } else if (suggestion.type === 'type') {
      // Filter by type
      const type = suggestion.id.replace('type-', '');
      setFilterType(type);
      setSearchTerm('');
    } else if (suggestion.type === 'governorate') {
      // Filter by governorate
      const governorate = suggestion.id.replace('governorate-', '');
      setSearchTerm(governorate);
    } else if (suggestion.type === 'address') {
      // Search by address
      setSearchTerm(suggestion.text);
    } else if (suggestion.type === 'phone') {
      // Search by phone
      setSearchTerm(suggestion.text);
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      // Handle empty search term - show all locations
      if (!searchTerm || searchTerm.trim() === '') {
        return filterType === 'all' || loc.type === filterType;
      }
      
      // Apply search filters when search term is present
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        loc.name.toLowerCase().includes(searchLower) || 
        loc.address.toLowerCase().includes(searchLower) ||
        loc.governorate.toLowerCase().includes(searchLower) ||
        loc.phone?.includes(searchTerm) ||
        loc.notes?.toLowerCase().includes(searchLower);
      
      const matchesType = filterType === 'all' || loc.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [locations, searchTerm, filterType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    try {
      if (formData.id) {
        await updateLocation(formData.id, formData);
        setLocations(prev => prev.map(l => l.id === formData.id ? { ...l, ...formData } as WorkLocation : l));
      } else {
        const newId = await addLocation(formData as Omit<WorkLocation, 'id'>);
        const newLoc: WorkLocation = {
          id: newId,
          name: formData.name,
          type: formData.type as any,
          address: formData.address || '',
          governorate: formData.governorate || '',
          googleMapLink: formData.googleMapLink,
          notes: formData.notes,
          phone: formData.phone
        };
        setLocations(prev => [newLoc, ...prev]);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const handleEdit = (loc: WorkLocation) => {
    setFormData({ ...loc });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المكان؟')) {
      try {
        await deleteLocation(id);
        setLocations(prev => prev.filter(l => l.id !== id));
      } catch (error) {
        console.error('Error deleting location:', error);
      }
    }
  };

  const getTypeIcon = (type: string) => {
     switch (type) {
        case 'court': return <Building2 className="w-5 h-5 text-indigo-600" />;
        case 'police_station': return <Shield className="w-5 h-5 text-slate-600" />;
        case 'notary': return <FileSignature className="w-5 h-5 text-green-600" />;
        default: return <MapPin className="w-5 h-5 text-amber-600" />;
     }
  };

  const getTypeLabel = (type: string) => {
     switch (type) {
        case 'court': return 'محكمة';
        case 'police_station': return 'قسم شرطة';
        case 'notary': return 'شهر عقاري';
        case 'expert': return 'مكتب خبراء';
        default: return 'أخرى';
     }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
       {/* Header */}
       <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
             <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Map className="w-6 h-6 text-primary-600" />
                دليل الجهات والمحاكم
             </h2>
             <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                قاعدة بيانات للعناوين وأماكن العمل ({locations.length} موقع)
             </p>
          </div>
          {!readOnly && (
             <button 
               onClick={() => { setFormData({name: '', type: 'court', address: '', governorate: 'القاهرة'}); setIsModalOpen(true); }}
               className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
             >
                <Plus className="w-4 h-4" /> إضافة مكان جديد
             </button>
          )}
       </div>

       {/* Filters */}
       <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <EnhancedSearch
              onSearch={handleSearch}
              onSuggestionClick={handleSuggestionClick as any}
              placeholder="البحث في المحاكم، الأقسام، العناوين، المحافظات..."
              suggestions={suggestions as any}
              recentSearches={recentSearches}
              className="w-full"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
             <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                   value={filterType}
                   onChange={(e) => setFilterType(e.target.value)}
                   className="bg-transparent border-none text-sm outline-none text-slate-700 dark:text-slate-300 cursor-pointer min-w-[120px]"
                >
                   <option value="all">كل الجهات</option>
                   <option value="court">محاكم</option>
                   <option value="police_station">أقسام شرطة</option>
                   <option value="notary">شهر عقاري</option>
                   <option value="expert">مكاتب خبراء</option>
                </select>
             </div>
          </div>
       </div>

       {/* Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map(loc => (
             <div key={loc.id} id={`location-${loc.id}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                   <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                         {getTypeIcon(loc.type)}
                      </div>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded font-bold">
                         {getTypeLabel(loc.type)}
                      </span>
                   </div>
                   
                   <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{loc.name}</h3>
                   
                   <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-start gap-2">
                         <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                         <span className="line-clamp-2">{loc.address}</span>
                      </div>
                      {loc.phone && (
                         <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 shrink-0" />
                            <span dir="ltr">{loc.phone}</span>
                         </div>
                      )}
                   </div>

                   {loc.notes && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg text-xs text-amber-800 dark:text-amber-400 flex items-start gap-2">
                         <Info className="w-4 h-4 shrink-0 mt-0.5" />
                         <p>{loc.notes}</p>
                      </div>
                   )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                   <a 
                     href={loc.googleMapLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.name + ' ' + loc.address)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                   >
                      <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" /> الذهاب
                   </a>
                   {!readOnly && (
                      <>
                         <button onClick={() => handleEdit(loc)} className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                            <Edit3 className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDelete(loc.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all">
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </>
                   )}
                </div>
             </div>
          ))}
       </div>

       {filteredLocations.length === 0 && (
          <div className="text-center py-16 text-slate-400">
             <Map className="w-16 h-16 mx-auto mb-4 opacity-20" />
             <p className="text-lg font-medium">لا توجد أماكن مطابقة للبحث</p>
          </div>
       )}

       {/* Modal */}
       {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                   <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                      {formData.id ? 'تعديل بيانات المكان' : 'إضافة مكان جديد'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                
                <form onSubmit={handleSave} className="space-y-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">اسم المكان <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required
                        className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="مثال: محكمة شمال القاهرة"
                      />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">النوع</label>
                         <select 
                           className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                           value={formData.type}
                           onChange={e => setFormData({...formData, type: e.target.value as any})}
                         >
                            <option value="court">محكمة</option>
                            <option value="police_station">قسم شرطة</option>
                            <option value="notary">شهر عقاري</option>
                            <option value="expert">مكتب خبراء</option>
                            <option value="other">أخرى</option>
                         </select>
                      </div>
                      <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المحافظة</label>
                         <input 
                           type="text" 
                           className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                           value={formData.governorate}
                           onChange={e => setFormData({...formData, governorate: e.target.value})}
                         />
                      </div>
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العنوان التفصيلي</label>
                      <input 
                        type="text" 
                        className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        placeholder="الشارع، المنطقة، المعالم القريبة..."
                      />
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رابط خرائط جوجل (اختياري)</label>
                      <input 
                        type="url" 
                        className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        value={formData.googleMapLink || ''}
                        onChange={e => setFormData({...formData, googleMapLink: e.target.value})}
                        placeholder="https://goo.gl/maps/..."
                        dir="ltr"
                      />
                   </div>

                   <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات (ركنة، مواعيد، الخ)</label>
                      <textarea 
                        rows={2}
                        className="w-full border dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        value={formData.notes || ''}
                        onChange={e => setFormData({...formData, notes: e.target.value})}
                      />
                   </div>

                   <div className="pt-4 flex gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300">إلغاء</button>
                      <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-sm flex items-center justify-center gap-2">
                         <Save className="w-4 h-4" /> حفظ البيانات
                      </button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Locations;
