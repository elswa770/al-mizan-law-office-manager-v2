import React, { useState, useMemo } from 'react';
import { Lawyer, LawyerStatus, LawyerSpecialization, LawyerRole, BarLevel } from '../types';
import { 
  Users, Search, Filter, Plus, Phone, Mail, MapPin, Briefcase, 
  Award, DollarSign, Calendar, MoreVertical, Edit3, Trash2, CheckCircle, XCircle 
} from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLawyer, setEditingLawyer] = useState<Lawyer | null>(null);

  const [formData, setFormData] = useState<Partial<Lawyer>>({
    name: '',
    phone: '',
    email: '',
    barNumber: '',
    barRegistrationNumber: '',
    barLevel: '',
    specialization: '',
    role: '',
    status: 'active',
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
      name: '', phone: '', whatsapp: '', email: '', governorate: '', office: '',
      barLevel: 'general', salary: 0, specialization: '', joinDate: new Date().toISOString().split('T')[0],
      status: 'active', notes: ''
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
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="بحث بالاسم، الهاتف، الإيميل، رقم القيد، أو الموقع..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
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
                  <span className="font-mono font-bold">{(lawyer.hourlyRate || 0).toLocaleString()} EGP/ساعة</span>
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الواتساب</label>
                  <input 
                    type="tel" 
                    className="w-full border p-2.5 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.whatsapp}
                    onChange={e => setFormData({...formData, whatsapp: e.target.value})}
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
