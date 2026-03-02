import React, { useState, useMemo, useEffect } from 'react';
import { Case, Client, ArchiveLocation, ArchiveRequest, CaseStatus, ArchiveLocationType, ArchiveRequestStatus } from '../types';
import { 
  Archive, Search, Filter, Folder, Box, FileText, Clock, User, 
  MapPin, CheckCircle, XCircle, AlertCircle, ArrowUpRight, ArrowDownLeft,
  Plus, Trash2, Edit3, QrCode, Printer, Shield, Lock, Unlock, X, Save, ChevronDown, Calendar
} from 'lucide-react';
import { 
  doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, 
  query, where, getDocs, onSnapshot, orderBy 
} from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

interface ArchiveProps {
  cases: Case[];
  clients: Client[];
  onUpdateCase?: (updatedCase: Case) => void;
  onNavigate?: (page: string) => void;
  onCaseClick?: (caseId: string) => void;
}

const ArchivePage: React.FC<ArchiveProps> = ({ cases, clients, onUpdateCase, onNavigate, onCaseClick }) => {
  const [activeTab, setActiveTab] = useState<'digital' | 'physical' | 'requests'>('digital');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'archived' | 'active'>('archived');

  // Function to update case status with closed date
  const updateCaseStatus = async (caseId: string, newStatus: CaseStatus) => {
    if (!onUpdateCase) return;
    
    const targetCase = cases.find(c => c.id === caseId);
    if (!targetCase) return;

    const updatedCase: Case = {
      ...targetCase,
      status: newStatus,
      ...(newStatus === CaseStatus.CLOSED && {
        closedAt: new Date().toISOString()
      })
    };

    try {
      await updateDoc(doc(db, 'cases', caseId), updatedCase);
      onUpdateCase(updatedCase);
      alert(`تم تحديث حالة القضية إلى "${newStatus === CaseStatus.CLOSED ? 'مغلقة' : 'مؤرشفة'}" بنجاح`);
    } catch (error) {
      console.error('Error updating case status:', error);
      alert('حدث خطأ أثناء تحديث حالة القضية');
    }
  };

  // Firebase Data States
  const [locations, setLocations] = useState<ArchiveLocation[]>([]);
  const [requests, setRequests] = useState<ArchiveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced Search States
  const [searchRequestTerm, setSearchRequestTerm] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('all');
  const [requestDateFilter, setRequestDateFilter] = useState('');

  // Modal States
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ArchiveLocation | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  // Form States
  const [locationForm, setLocationForm] = useState({
    name: '',
    type: ArchiveLocationType.BOX,
    fullPath: '',
    capacity: 100,
    description: '',
    roomId: '',
    cabinetId: '',
    shelfId: ''
  });

  // Hierarchical data
  const [rooms, setRooms] = useState<ArchiveLocation[]>([]);
  const [cabinets, setCabinets] = useState<ArchiveLocation[]>([]);
  const [shelves, setShelves] = useState<ArchiveLocation[]>([]);

  const [requestForm, setRequestForm] = useState({
    caseId: '',
    requesterName: '',
    notes: ''
  });

  // Load data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load all locations
        const locationsQuery = query(collection(db, 'archiveLocations'), orderBy('createdAt', 'desc'));
        const locationsSnapshot = await getDocs(locationsQuery);
        const locationsData = locationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ArchiveLocation));
        setLocations(locationsData);

        // Filter by type for hierarchical selection
        setRooms(locationsData.filter(loc => loc.type === ArchiveLocationType.ROOM));
        setCabinets(locationsData.filter(loc => loc.type === ArchiveLocationType.CABINET));
        setShelves(locationsData.filter(loc => loc.type === ArchiveLocationType.SHELF));
      } catch (error) {
        console.error('Error loading archive data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Real-time listener for requests
  useEffect(() => {
    const requestsQuery = query(collection(db, 'archiveRequests'), orderBy('requestDate', 'desc'));
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ArchiveRequest));
      setRequests(requestsData);
    }, (error) => {
      console.error('Error listening to requests:', error);
    });

    return () => unsubscribe();
  }, []);

  // Manual refresh on component mount to ensure data is loaded
  useEffect(() => {
    const refreshRequests = async () => {
      try {
        const requestsQuery = query(collection(db, 'archiveRequests'), orderBy('requestDate', 'desc'));
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ArchiveRequest));
        setRequests(requestsData);
        console.log('Requests refreshed manually');
      } catch (error) {
        console.error('Error refreshing requests:', error);
      }
    };

    // Initial load
    refreshRequests();
    
    // Set up periodic refresh every 30 seconds as fallback
    const interval = setInterval(refreshRequests, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Update hierarchical data when locations change
  useEffect(() => {
    setRooms(locations.filter(loc => loc.type === ArchiveLocationType.ROOM));
    setCabinets(locations.filter(loc => loc.type === ArchiveLocationType.CABINET));
    setShelves(locations.filter(loc => loc.type === ArchiveLocationType.SHELF));
  }, [locations]);

  // Check if case is borrowed
  const isCaseBorrowed = (caseId: string) => {
    return requests.some(req => 
      req.caseId === caseId && 
      (req.status === ArchiveRequestStatus.APPROVED || req.status === ArchiveRequestStatus.RETURNED)
    );
  };

  // Check if case is returned to archive
  const isCaseReturnedToArchive = (caseId: string) => {
    return requests.some(req => 
      req.caseId === caseId && 
      req.status === ArchiveRequestStatus.ARCHIVED_RETURNED
    );
  };

  // --- Firebase Operations ---
  const addLocation = async () => {
    // Validate form
    if (!locationForm.name.trim()) {
      alert('يرجى إدخال اسم الوحدة');
      return;
    }
    if (locationForm.capacity < 1) {
      alert('السعة يجب أن تكون أكبر من صفر');
      return;
    }

    // Build full path based on hierarchy
    let fullPath = locationForm.name;
    let parentId: string | undefined;

    if (locationForm.type === ArchiveLocationType.CABINET && locationForm.roomId) {
      const room = rooms.find(r => r.id === locationForm.roomId);
      fullPath = `${room?.name || ''} - ${locationForm.name}`;
      parentId = locationForm.roomId;
    } else if (locationForm.type === ArchiveLocationType.SHELF && locationForm.roomId && locationForm.cabinetId) {
      const room = rooms.find(r => r.id === locationForm.roomId);
      const cabinet = cabinets.find(c => c.id === locationForm.cabinetId);
      fullPath = `${room?.name || ''} - ${cabinet?.name || ''} - ${locationForm.name}`;
      parentId = locationForm.cabinetId;
    } else if (locationForm.type === ArchiveLocationType.BOX && locationForm.roomId && locationForm.cabinetId && locationForm.shelfId) {
      const room = rooms.find(r => r.id === locationForm.roomId);
      const cabinet = cabinets.find(c => c.id === locationForm.cabinetId);
      const shelf = shelves.find(s => s.id === locationForm.shelfId);
      fullPath = `${room?.name || ''} - ${cabinet?.name || ''} - ${shelf?.name || ''} - ${locationForm.name}`;
      parentId = locationForm.shelfId;
    }

    try {
      const newLocation: Omit<ArchiveLocation, 'id'> = {
        name: locationForm.name.trim(),
        type: locationForm.type,
        fullPath: fullPath.trim(),
        capacity: locationForm.capacity,
        description: locationForm.description.trim(),
        occupied: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(parentId && { parentId })
      };

      console.log('Adding location:', newLocation);
      const docRef = await addDoc(collection(db, 'archiveLocations'), newLocation);
      console.log('Location added with ID:', docRef.id);
      
      // Update parent occupancy
      if (parentId) {
        await updateDoc(doc(db, 'archiveLocations', parentId), {
          occupied: (locations.find(l => l.id === parentId)?.occupied || 0) + 1,
          updatedAt: new Date().toISOString()
        });
        
        // Update local state for parent
        setLocations(prev => prev.map(loc => 
          loc.id === parentId ? { ...loc, occupied: loc.occupied + 1 } : loc
        ));
      }
      
      setLocations(prev => [...prev, { id: docRef.id, ...newLocation }]);
      setIsLocationModalOpen(false);
      setLocationForm({ 
        name: '', 
        type: ArchiveLocationType.BOX, 
        fullPath: '', 
        capacity: 100, 
        description: '',
        roomId: '',
        cabinetId: '',
        shelfId: ''
      });
      alert('تم إضافة وحدة التخزين بنجاح');
    } catch (error) {
      console.error('Error adding location:', error);
      alert('حدث خطأ أثناء إضافة وحدة التخزين: ' + (error as Error).message);
    }
  };

  const updateLocation = async () => {
    if (!editingLocation) return;

    try {
      const updatedLocation = {
        ...locationForm,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'archiveLocations', editingLocation.id), updatedLocation);
      setLocations(prev => prev.map(loc => 
        loc.id === editingLocation.id ? { ...loc, ...updatedLocation } as ArchiveLocation : loc
      ));
      setIsLocationModalOpen(false);
      setEditingLocation(null);
      setLocationForm({ 
        name: '', 
        type: ArchiveLocationType.BOX, 
        fullPath: '', 
        capacity: 100, 
        description: '',
        roomId: '',
        cabinetId: '',
        shelfId: ''
      });
      alert('تم تحديث وحدة التخزين بنجاح');
    } catch (error) {
      console.error('Error updating location:', error);
      alert('حدث خطأ أثناء تحديث وحدة التخزين');
    }
  };

  const deleteLocation = async (locationId: string) => {
    if (!confirm('هل أنت متأكد من حذف وحدة التخزين؟')) return;

    try {
      await deleteDoc(doc(db, 'archiveLocations', locationId));
      setLocations(prev => prev.filter(loc => loc.id !== locationId));
      alert('تم حذف وحدة التخزين بنجاح');
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('حدث خطأ أثناء حذف وحدة التخزين');
    }
  };

  const addRequest = async () => {
    try {
      const newRequest: Omit<ArchiveRequest, 'id'> = {
        caseId: requestForm.caseId,
        requesterId: 'current-user', // Should come from auth context
        requesterName: requestForm.requesterName || 'غير محدد',
        requestDate: new Date().toISOString(),
        status: ArchiveRequestStatus.PENDING,
        notes: requestForm.notes
      };

      const docRef = await addDoc(collection(db, 'archiveRequests'), newRequest);
      setRequests(prev => [...prev, { id: docRef.id, ...newRequest }]);
      setIsRequestModalOpen(false);
      setRequestForm({ caseId: '', requesterName: '', notes: '' });
      setSelectedCase(null);
      alert('تم إرسال طلب الاستعارة بنجاح');
    } catch (error) {
      console.error('Error adding request:', error);
      alert('حدث خطأ أثناء إرسال الطلب');
    }
  };

  const updateRequestStatus = async (requestId: string, status: ArchiveRequestStatus) => {
    try {
      const updateData = {
        status,
        approvedBy: 'current-user', // Should come from auth context
        approvedDate: new Date().toISOString()
      };

      await updateDoc(doc(db, 'archiveRequests', requestId), updateData);
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, ...updateData } : req
      ));
      alert('تم تحديث حالة الطلب بنجاح');
    } catch (error) {
      console.error('Error updating request:', error);
      alert('حدث خطأ أثناء تحديث حالة الطلب');
    }
  };
  const archiveCasePhysically = async (caseId: string) => {
    const caseData = cases.find(c => c.id === caseId);
    if (!caseData) return;

    // Create modal for hierarchical location selection
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-4">أرشفة القضية فيزيائياً</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الغرفة</label>
            <select id="roomSelect" class="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white">
              <option value="">اختر الغرفة</option>
              ${rooms.map(room => `<option value="${room.id}">${room.name}</option>`).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الدولاب</label>
            <select id="cabinetSelect" class="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white" disabled>
              <option value="">اختر الدولاب</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الرف</label>
            <select id="shelfSelect" class="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white" disabled>
              <option value="">اختر الرف</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الصندوق</label>
            <select id="boxSelect" class="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white" disabled>
              <option value="">اختر الصندوق</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم الملف في الصندوق</label>
            <input type="text" id="fileNumber" class="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white" placeholder="مثال: 1-25">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات (اختياري)</label>
            <textarea id="archiveNotes" class="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white" rows="3" placeholder="ملاحظات عن حالة الأرشفة..."></textarea>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button id="cancelBtn" class="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold">إلغاء</button>
          <button id="archiveBtn" class="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md">أرشفة</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const roomSelect = modal.querySelector('#roomSelect') as HTMLSelectElement;
    const cabinetSelect = modal.querySelector('#cabinetSelect') as HTMLSelectElement;
    const shelfSelect = modal.querySelector('#shelfSelect') as HTMLSelectElement;
    const boxSelect = modal.querySelector('#boxSelect') as HTMLSelectElement;
    const fileNumberInput = modal.querySelector('#fileNumber') as HTMLInputElement;
    const archiveNotesInput = modal.querySelector('#archiveNotes') as HTMLTextAreaElement;
    const cancelBtn = modal.querySelector('#cancelBtn') as HTMLButtonElement;
    const archiveBtn = modal.querySelector('#archiveBtn') as HTMLButtonElement;
    
    // Handle room selection
    roomSelect.addEventListener('change', (e) => {
      const roomId = (e.target as HTMLSelectElement).value;
      cabinetSelect.innerHTML = '<option value="">اختر الدولاب</option>';
      shelfSelect.innerHTML = '<option value="">اختر الرف</option>';
      boxSelect.innerHTML = '<option value="">اختر الصندوق</option>';
      
      if (roomId) {
        const roomCabinets = cabinets.filter(c => c.parentId === roomId);
        cabinetSelect.innerHTML = '<option value="">اختر الدولاب</option>' + 
          roomCabinets.map(cabinet => `<option value="${cabinet.id}">${cabinet.name}</option>`).join('');
        cabinetSelect.disabled = false;
      } else {
        cabinetSelect.disabled = true;
        shelfSelect.disabled = true;
        boxSelect.disabled = true;
      }
    });
    
    // Handle cabinet selection
    cabinetSelect.addEventListener('change', (e) => {
      const cabinetId = (e.target as HTMLSelectElement).value;
      shelfSelect.innerHTML = '<option value="">اختر الرف</option>';
      boxSelect.innerHTML = '<option value="">اختر الصندوق</option>';
      
      if (cabinetId) {
        const cabinetShelves = shelves.filter(s => s.parentId === cabinetId);
        shelfSelect.innerHTML = '<option value="">اختر الرف</option>' + 
          cabinetShelves.map(shelf => `<option value="${shelf.id}">${shelf.name}</option>`).join('');
        shelfSelect.disabled = false;
      } else {
        shelfSelect.disabled = true;
        boxSelect.disabled = true;
      }
    });
    
    // Handle shelf selection
    shelfSelect.addEventListener('change', (e) => {
      const shelfId = (e.target as HTMLSelectElement).value;
      boxSelect.innerHTML = '<option value="">اختر الصندوق</option>';
      
      if (shelfId) {
        const shelfBoxes = locations.filter(l => l.type === ArchiveLocationType.BOX && l.parentId === shelfId);
        boxSelect.innerHTML = '<option value="">اختر الصندوق</option>' + 
          shelfBoxes.map(box => `<option value="${box.id}">${box.name}</option>`).join('');
        boxSelect.disabled = false;
      } else {
        boxSelect.disabled = true;
      }
    });
    
    // Handle cancel
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Handle archive
    archiveBtn.addEventListener('click', async () => {
      const selectedBoxId = boxSelect.value;
      const fileNumber = fileNumberInput.value.trim();
      const archiveNotes = archiveNotesInput.value.trim();
      
      if (!selectedBoxId) {
        alert('يرجى اختيار الصندوق');
        return;
      }
      
      if (!fileNumber) {
        alert('يرجى إدخال رقم الملف في الصندوق');
        return;
      }
      
      try {
        const selectedBox = locations.find(l => l.id === selectedBoxId);
        const archiveData = {
          locationId: selectedBoxId,
          locationName: selectedBox?.fullPath || '',
          fileNumber,
          boxNumber: fileNumber, // إضافة boxNumber المطلوب
          archiveNotes,
          archivedDate: new Date().toISOString(),
          archivedBy: 'current-user',
          physicalCondition: 'good' as const
        };

        await updateDoc(doc(db, 'cases', caseId), { 
          archiveData,
          status: CaseStatus.ARCHIVED 
        });

        // Update box occupancy
        if (selectedBox) {
          await updateDoc(doc(db, 'archiveLocations', selectedBoxId), {
            occupied: selectedBox.occupied + 1,
            updatedAt: new Date().toISOString()
          });
        }

        document.body.removeChild(modal);
        alert('تم أرشفة القضية بنجاح');
        
        // Update local state to reflect changes
        if (onUpdateCase) {
          const updatedCase = cases.find(c => c.id === caseId);
          if (updatedCase) {
            onUpdateCase({
              ...updatedCase,
              archiveData,
              status: CaseStatus.ARCHIVED
            });
          }
        }
      } catch (error) {
        console.error('Error archiving case:', error);
        alert('حدث خطأ أثناء أرشفة القضية');
      }
    });
  };

  // State for collapsible hierarchy
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedCabinets, setExpandedCabinets] = useState<Set<string>>(new Set());
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(new Set());

  // Toggle functions
  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomId)) {
        newSet.delete(roomId);
      } else {
        newSet.add(roomId);
      }
      return newSet;
    });
  };

  const toggleCabinet = (cabinetId: string) => {
    setExpandedCabinets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cabinetId)) {
        newSet.delete(cabinetId);
      } else {
        newSet.add(cabinetId);
      }
      return newSet;
    });
  };

  const toggleShelf = (shelfId: string) => {
    setExpandedShelves(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shelfId)) {
        newSet.delete(shelfId);
      } else {
        newSet.add(shelfId);
      }
      return newSet;
    });
  };

  // Filtered Data
  const filteredCases = useMemo(() => {
    return cases.filter(c => {
      const matchesSearch = c.title.includes(searchTerm) || c.caseNumber.includes(searchTerm) || c.clientName.includes(searchTerm);
      const isArchived = c.status === CaseStatus.CLOSED || c.status === CaseStatus.ARCHIVED;
      const hasPhysicalArchive = !!c.archiveData;
      
      if (filterStatus === 'archived' && !isArchived && !hasPhysicalArchive) return false;
      if (filterStatus === 'active' && isArchived && !hasPhysicalArchive) return false;
      
      return matchesSearch;
    });
  }, [cases, searchTerm, filterStatus]);

  const archivedCount = cases.filter(c => c.status === CaseStatus.CLOSED || c.status === CaseStatus.ARCHIVED || !!c.archiveData).length;
  const physicalFilesCount = cases.filter(c => c.archiveData).length;

  // Organize locations hierarchically with collapsible functionality
  const getHierarchicalLocations = () => {
    const rooms = locations.filter(loc => loc.type === ArchiveLocationType.ROOM);
    const cabinets = locations.filter(loc => loc.type === ArchiveLocationType.CABINET);
    const shelves = locations.filter(loc => loc.type === ArchiveLocationType.SHELF);
    const boxes = locations.filter(loc => loc.type === ArchiveLocationType.BOX);

    const hierarchicalList: (ArchiveLocation & { 
      level: number; 
      indent: string;
      occupied: number;
      displayOccupancy: string;
      hasChildren: boolean;
      isExpanded: boolean;
      toggleFunction: () => void;
    })[] = [];

    rooms.forEach(room => {
      const roomCabinets = cabinets.filter(c => c.parentId === room.id);
      const roomOccupancy = roomCabinets.length;
      const hasChildren = roomCabinets.length > 0;
      
      hierarchicalList.push({ 
        ...room, 
        level: 0, 
        indent: '',
        occupied: roomOccupancy,
        displayOccupancy: `${roomOccupancy}/${room.capacity} دولاب`,
        hasChildren,
        isExpanded: expandedRooms.has(room.id),
        toggleFunction: () => toggleRoom(room.id)
      });
      
      // Only show cabinets if room is expanded
      if (expandedRooms.has(room.id)) {
        roomCabinets.forEach(cabinet => {
          const cabinetShelves = shelves.filter(s => s.parentId === cabinet.id);
          const cabinetOccupancy = cabinetShelves.length;
          const hasChildren = cabinetShelves.length > 0;
          
          hierarchicalList.push({ 
            ...cabinet, 
            level: 1, 
            indent: '└─ ',
            occupied: cabinetOccupancy,
            displayOccupancy: `${cabinetOccupancy}/${cabinet.capacity} رف`,
            hasChildren,
            isExpanded: expandedCabinets.has(cabinet.id),
            toggleFunction: () => toggleCabinet(cabinet.id)
          });
          
          // Only show shelves if cabinet is expanded
          if (expandedCabinets.has(cabinet.id)) {
            cabinetShelves.forEach(shelf => {
              const shelfBoxes = boxes.filter(b => b.parentId === shelf.id);
              const shelfOccupancy = shelfBoxes.length;
              const hasChildren = shelfBoxes.length > 0;
              
              hierarchicalList.push({ 
                ...shelf, 
                level: 2, 
                indent: '   └─ ',
                occupied: shelfOccupancy,
                displayOccupancy: `${shelfOccupancy}/${shelf.capacity} صندوق`,
                hasChildren,
                isExpanded: expandedShelves.has(shelf.id),
                toggleFunction: () => toggleShelf(shelf.id)
              });
              
              // Only show boxes if shelf is expanded
              if (expandedShelves.has(shelf.id)) {
                shelfBoxes.forEach(box => {
                  // Count actual files in this box
                  const filesInBox = cases.filter(c => c.archiveData?.locationId === box.id).length;
                  
                  hierarchicalList.push({ 
                    ...box, 
                    level: 3, 
                    indent: '      └─ ',
                    occupied: filesInBox,
                    displayOccupancy: `${filesInBox}/${box.capacity} ملف`,
                    hasChildren: false,
                    isExpanded: false,
                    toggleFunction: () => {}
                  });
                });
              }
            });
          }
        });
      }
    });

    return hierarchicalList;
  };

  // --- Render Functions ---

  const renderDigitalArchive = () => (
    <div className="space-y-6 animate-in fade-in">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="بحث في الأرشيف الرقمي (رقم القضية، الموكل، العنوان)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">الكل</option>
            <option value="archived">المؤرشف فقط</option>
            <option value="active">النشط</option>
          </select>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
            <Filter className="w-4 h-4" /> تصفية متقدمة
          </button>
        </div>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCases.map(c => (
          <div key={c.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group relative">
            {/* Borrowed Ribbon */}
            {isCaseBorrowed(c.id) && (
              <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
                <div className="absolute top-2 right-[-35px] w-[140px] text-center py-1 bg-red-600 text-white text-[10px] font-bold transform rotate-45 shadow-lg">
                  مستعارة
                </div>
              </div>
            )}
            
            <div className={`absolute top-4 left-4 px-2 py-1 rounded text-[10px] font-bold ${c.archiveData ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
              {c.archiveData ? 'مؤرشف فيزيائياً' : 'رقمي فقط'}
            </div>
            
            {/* Archive Location Display */}
            {c.archiveData && (
              <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <Archive className="w-4 h-4" />
                  <span className="text-xs font-bold">مكان الأرشفة:</span>
                </div>
                <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                  {c.archiveData.locationName || 'غير محدد'}
                </div>
                <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                  <span className="font-bold">رقم الملف:</span> {c.archiveData.fileNumber || 'غير محدد'}
                </div>
                {c.archiveData.archiveNotes && (
                  <div className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
                    <span className="font-bold">ملاحظات:</span> {c.archiveData.archiveNotes}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-start gap-3 mb-3">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1" title={c.title}>{c.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">{c.caseNumber}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-400">الموكل:</span>
                <span className="font-bold">{c.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">تاريخ الإغلاق:</span>
                <span className="font-mono">
                  {c.closedAt ? new Date(c.closedAt).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                  }) : (c.status === 'مغلقة' || c.status === 'closed' ? 'غير محدد' : '-')}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button 
                onClick={() => {
                  if (onCaseClick) {
                    onCaseClick(c.id);
                  } else if (onNavigate) {
                    onNavigate(`cases/${c.id}`);
                  }
                }}
                className="flex-1 py-1.5 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                عرض الملف
              </button>
              {!c.archiveData && (
                <button 
                  onClick={() => archiveCasePhysically(c.id)}
                  className="flex-1 py-1.5 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 rounded text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                >
                  أرشفة فيزيائية
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPhysicalArchive = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">إجمالي الوحدات</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{locations.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">السعة المستغلة</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">
              {Math.round((locations.reduce((acc, loc) => acc + loc.occupied, 0) / locations.reduce((acc, loc) => acc + loc.capacity, 0)) * 100)}%
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">ماسح الباركود</p>
            <button className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">فتح الماسح</button>
          </div>
        </div>
      </div>

      {/* Locations Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-500" /> وحدات التخزين
          </h3>
          <button 
            onClick={() => {
              setEditingLocation(null);
              setLocationForm({ name: '', type: ArchiveLocationType.BOX, fullPath: '', capacity: 100, description: '' });
              setIsLocationModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3 h-3" /> وحدة جديدة
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              <tr>
                <th className="p-4">اسم الوحدة</th>
                <th className="p-4">المسار الكامل</th>
                <th className="p-4">النوع</th>
                <th className="p-4">الإشغال</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {getHierarchicalLocations().map(loc => (
                <tr key={loc.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-slate-200 ${loc.level > 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}>
                  <td className="p-4 font-bold flex items-center gap-2">
                    {loc.hasChildren && (
                      <button 
                        onClick={loc.toggleFunction}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                        title={loc.isExpanded ? "طي" : "توسيع"}
                      >
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${loc.isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    <span className={`${loc.level > 0 ? 'text-slate-400' : ''}`}>{loc.indent}</span>
                    {loc.type === 'room' ? <MapPin className="w-4 h-4 text-slate-400"/> : loc.type === 'box' ? <Box className="w-4 h-4 text-amber-500"/> : <Folder className="w-4 h-4 text-blue-500"/>}
                    <span className={`${loc.level > 0 ? 'text-sm' : ''}`}>{loc.name}</span>
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400 text-xs">{loc.fullPath}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      loc.type === 'room' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                      loc.type === 'cabinet' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                      loc.type === 'shelf' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {loc.type === 'room' ? 'غرفة' : loc.type === 'cabinet' ? 'دولاب' : loc.type === 'shelf' ? 'رف' : 'صندوق'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 dark:bg-slate-600 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${loc.occupied / loc.capacity > 0.9 ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{width: `${Math.min((loc.occupied / loc.capacity) * 100, 100)}%`}}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{loc.displayOccupancy}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingLocation(loc);
                          setLocationForm({
                            name: loc.name,
                            type: loc.type,
                            fullPath: loc.fullPath,
                            capacity: loc.capacity,
                            description: loc.description || '',
                            roomId: '',
                            cabinetId: '',
                            shelfId: ''
                          });
                          setIsLocationModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-700 rounded"
                        title="تعديل الوحدة"
                      >
                        <Edit3 className="w-4 h-4"/>
                      </button>
                      <button 
                        onClick={() => deleteLocation(loc.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 dark:bg-slate-700 rounded"
                        title="حذف الوحدة"
                      >
                        <Trash2 className="w-4 h-4"/>
                      </button>
                      <button 
                        onClick={() => window.print()}
                        className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-700 rounded"
                        title="طباعة الباركود"
                      >
                        <Printer className="w-4 h-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Filter requests based on search criteria
  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Filter by search term
    if (searchRequestTerm.trim()) {
      filtered = filtered.filter(req => {
        const searchTermLower = searchRequestTerm.toLowerCase();
        const caseData = cases.find(c => c.id === req.caseId);
        return (
          req.id.toLowerCase().includes(searchTermLower) ||
          req.requesterName?.toLowerCase().includes(searchTermLower) ||
          req.notes?.toLowerCase().includes(searchTermLower) ||
          caseData?.caseNumber?.toLowerCase().includes(searchTermLower) ||
          caseData?.title?.toLowerCase().includes(searchTermLower)
        );
      });
    }

    // Filter by status
    if (requestStatusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === requestStatusFilter);
    }

    // Filter by date
    if (requestDateFilter.trim()) {
      filtered = filtered.filter(req => 
        req.requestDate.includes(requestDateFilter) ||
        req.expectedReturnDate?.includes(requestDateFilter) ||
        req.actualReturnDate?.includes(requestDateFilter) ||
        req.archivedReturnDate?.includes(requestDateFilter)
      );
    }

    return filtered;
  }, [requests, searchRequestTerm, requestStatusFilter, requestDateFilter, cases]);

  const renderRequests = () => (
    <div className="space-y-6 animate-in fade-in">
      {/* Advanced Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="بحث في الطلبات (رقم، اسم مقدم الطلب، ملاحظات، رقم القضية)..." 
              value={searchRequestTerm}
              onChange={(e) => setSearchRequestTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <select 
              value={requestStatusFilter}
              onChange={(e) => setRequestStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">تمت الموافقة</option>
              <option value="returned">تم الاستلام</option>
              <option value="archived_returned">تم الإرجاع</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="date" 
              placeholder="تصفية حسب التاريخ" 
              value={requestDateFilter}
              onChange={(e) => setRequestDateFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>
          <button 
            onClick={() => {
              setSearchRequestTerm('');
              setRequestStatusFilter('all');
              setRequestDateFilter('');
            }}
            className="bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 flex items-center gap-2"
          >
            <X className="w-4 h-4" /> مسح الفلاتر
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" /> طلبات استعارة الملفات
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
              {filteredRequests.length} طلب
            </span>
          </h3>
          <button 
            onClick={() => {
              setSelectedCase(null);
              setRequestForm({ caseId: '', requesterName: '', notes: '' });
              setIsRequestModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
          >
            <Plus className="w-3 h-3" /> طلب جديد
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
              <tr>
                <th className="p-4">رقم الطلب</th>
                <th className="p-4">القضية</th>
                <th className="p-4">مقدم الطلب</th>
                <th className="p-4">تاريخ الطلب</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">تاريخ الاستلام المتوقع</th>
                <th className="p-4">تاريخ الاستلام الفعلي</th>
                <th className="p-4">تاريخ الإرجاع</th>
                <th className="p-4">ملاحظات</th>
                <th className="p-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredRequests.map(req => {
                const caseData = cases.find(c => c.id === req.caseId);
                return (
                  <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-slate-200">
                    <td className="p-4 font-mono font-bold">#{req.id}</td>
                    <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{caseData?.title || 'قضية محذوفة'}</td>
                    <td className="p-4 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold">
                        <User className="w-3 h-3" />
                      </div>
                      {req.requesterName || 'غير محدد'}
                    </td>
                    <td className="p-4 font-mono text-xs">{req.requestDate}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        req.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        req.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                        req.status === 'returned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        req.status === 'archived_returned' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {req.status === 'approved' ? 'تمت الموافقة' : 
                         req.status === 'pending' ? 'قيد الانتظار' : 
                         req.status === 'returned' ? 'تم الاستلام' :
                         req.status === 'archived_returned' ? 'تم الإرجاع' :
                         'مرفوض'}
                      </span>
                    </td>
                    <td className="p-4 text-xs">
                      {req.expectedReturnDate ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span className="font-mono">{req.expectedReturnDate}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">غير محدد</span>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      {req.actualReturnDate ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="font-mono text-green-600 font-bold">{req.actualReturnDate}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">لم يتم الاستلام</span>
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      {req.archivedReturnDate ? (
                        <div className="flex items-center gap-1">
                          <Archive className="w-3 h-3 text-emerald-500" />
                          <span className="font-mono text-emerald-600 font-bold">{req.archivedReturnDate}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">لم يتم الإرجاع</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{req.notes}</td>
                    <td className="p-4">
                      {req.status === 'pending' && (
                        <div className="flex gap-2 flex-wrap">
                          <button 
                            onClick={() => updateRequestStatus(req.id, ArchiveRequestStatus.APPROVED)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" /> موافقة
                          </button>
                          <button 
                            onClick={() => updateRequestStatus(req.id, ArchiveRequestStatus.REJECTED)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" /> رفض
                          </button>
                          <button 
                            onClick={async () => {
                              // Set expected return date
                              const returnDate = prompt('أدخل تاريخ الاستلام المتوقع (YYYY-MM-DD):', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                              if (returnDate) {
                                try {
                                  await updateDoc(doc(db, 'archiveRequests', req.id), {
                                    expectedReturnDate: returnDate
                                  });
                                  
                                  // Update local state
                                  setRequests(prev => prev.map(request => 
                                    request.id === req.id ? { ...request, expectedReturnDate: returnDate } : request
                                  ));
                                  
                                  alert('تم تحديد تاريخ الاستلام المتوقع');
                                } catch (error) {
                                  console.error('Error setting return date:', error);
                                  alert('حدث خطأ أثناء تحديد التاريخ');
                                }
                              }
                            }}
                            className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700 flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3" /> تحديد تاريخ
                          </button>
                        </div>
                      )}
                      {req.status === 'approved' && (
                        <div className="flex gap-2 flex-wrap">
                          <button 
                            onClick={async () => {
                              // Mark as returned and close the request
                              try {
                                const updateData = {
                                  actualReturnDate: new Date().toISOString(),
                                  status: ArchiveRequestStatus.RETURNED
                                };
                                
                                await updateDoc(doc(db, 'archiveRequests', req.id), updateData);
                                
                                // Update local state
                                setRequests(prev => prev.map(request => 
                                  request.id === req.id ? { ...request, ...updateData } : request
                                ));
                                
                                alert('تم تسجيل استلام الملف وإغلاق الطلب بنجاح');
                              } catch (error) {
                                console.error('Error marking as returned:', error);
                                alert('حدث خطأ أثناء تسجيل الاستلام');
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!!req.actualReturnDate}
                          >
                            <ArrowDownLeft className="w-3 h-3" /> استلام
                          </button>
                          <button 
                            onClick={async () => {
                              // Extend return date
                              const newDate = prompt('أدخل تاريخ الاستلام الجديد (YYYY-MM-DD):', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                              if (newDate) {
                                try {
                                  await updateDoc(doc(db, 'archiveRequests', req.id), {
                                    expectedReturnDate: newDate
                                  });
                                  
                                  // Update local state
                                  setRequests(prev => prev.map(request => 
                                    request.id === req.id ? { ...request, expectedReturnDate: newDate } : request
                                  ));
                                  
                                  alert('تم تمديد تاريخ الاستلام');
                                } catch (error) {
                                  console.error('Error extending return date:', error);
                                  alert('حدث خطأ أثناء تمديد التاريخ');
                                }
                              }
                            }}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 flex items-center gap-1"
                          >
                            <Clock className="w-3 h-3" /> تمديد
                          </button>
                        </div>
                      )}
                      {req.status === 'returned' && (
                        <div className="flex gap-2 flex-wrap">
                          <button 
                            onClick={async () => {
                              // Return case to archive
                              try {
                                const updateData = {
                                  status: ArchiveRequestStatus.ARCHIVED_RETURNED,
                                  archivedReturnDate: new Date().toISOString()
                                };
                                
                                await updateDoc(doc(db, 'archiveRequests', req.id), updateData);
                                
                                // Update local state
                                setRequests(prev => prev.map(request => 
                                  request.id === req.id ? { ...request, ...updateData } : request
                                ));
                                
                                alert('تم إرجاع القضية إلى الأرشيف بنجاح');
                              } catch (error) {
                                console.error('Error returning case to archive:', error);
                                alert('حدث خطأ أثناء إرجاع القضية');
                              }
                            }}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1"
                          >
                            <Archive className="w-3 h-3" /> إرجاع للأرشيف
                          </button>
                        </div>
                      )}
                      {req.status === 'archived_returned' && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            تم الإرجاع
                          </span>
                          <span className="text-xs text-slate-500">
                            في {req.archivedReturnDate}
                          </span>
                        </div>
                      )}
                      {req.status === 'rejected' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateRequestStatus(req.id, ArchiveRequestStatus.PENDING)}
                            className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold hover:bg-amber-700 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" /> إعادة نظر
                          </button>
                        </div>
                      )}
                      {req.status === 'returned' && (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            تم الاستلام
                          </span>
                          <span className="text-xs text-slate-500">
                            في {req.actualReturnDate}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- Modals ---
  const renderLocationModal = () => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
            {editingLocation ? 'تعديل وحدة التخزين' : 'إضافة وحدة تخزين جديدة'}
          </h3>
          <button onClick={() => setIsLocationModalOpen(false)}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <form onSubmit={(e) => {
          e.preventDefault();
          if (editingLocation) {
            updateLocation();
          } else {
            addLocation();
          }
        }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              اسم الوحدة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              placeholder="مثال: صندوق قضايا 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              النوع <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
              value={locationForm.type}
              onChange={(e) => {
                const newType = e.target.value as ArchiveLocationType;
                setLocationForm({ 
                  ...locationForm, 
                  type: newType,
                  roomId: newType === ArchiveLocationType.ROOM ? '' : locationForm.roomId,
                  cabinetId: newType === ArchiveLocationType.CABINET ? '' : locationForm.cabinetId,
                  shelfId: newType === ArchiveLocationType.SHELF ? '' : locationForm.shelfId
                });
              }}
            >
              <option value={ArchiveLocationType.ROOM}>غرفة</option>
              <option value={ArchiveLocationType.CABINET}>دولاب</option>
              <option value={ArchiveLocationType.SHELF}>رف</option>
              <option value={ArchiveLocationType.BOX}>صندوق</option>
            </select>
          </div>

          {/* Room Selection */}
          {(locationForm.type === ArchiveLocationType.CABINET || locationForm.type === ArchiveLocationType.SHELF || locationForm.type === ArchiveLocationType.BOX) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                الغرفة <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                value={locationForm.roomId}
                onChange={(e) => setLocationForm({ ...locationForm, roomId: e.target.value, cabinetId: '', shelfId: '' })}
              >
                <option value="">اختر الغرفة</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Cabinet Selection */}
          {(locationForm.type === ArchiveLocationType.SHELF || locationForm.type === ArchiveLocationType.BOX) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                الدولاب <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                value={locationForm.cabinetId}
                onChange={(e) => setLocationForm({ ...locationForm, cabinetId: e.target.value, shelfId: '' })}
                disabled={!locationForm.roomId}
              >
                <option value="">اختر الدولاب</option>
                {cabinets
                  .filter(cabinet => cabinet.parentId === locationForm.roomId)
                  .map(cabinet => (
                    <option key={cabinet.id} value={cabinet.id}>{cabinet.name}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Shelf Selection */}
          {locationForm.type === ArchiveLocationType.BOX && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                الرف <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                value={locationForm.shelfId}
                onChange={(e) => setLocationForm({ ...locationForm, shelfId: e.target.value })}
                disabled={!locationForm.cabinetId}
              >
                <option value="">اختر الرف</option>
                {shelves
                  .filter(shelf => shelf.parentId === locationForm.cabinetId)
                  .map(shelf => (
                    <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              المسار الكامل
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
              value={locationForm.fullPath}
              onChange={(e) => setLocationForm({ ...locationForm, fullPath: e.target.value })}
              placeholder="مثال: الدور الأرضي - غرفة A - دولاب 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              السعة <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
              value={locationForm.capacity}
              onChange={(e) => setLocationForm({ ...locationForm, capacity: parseInt(e.target.value) })}
              placeholder="عدد الملفات"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              وصف (اختياري)
            </label>
            <textarea
              className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
              value={locationForm.description}
              onChange={(e) => setLocationForm({ ...locationForm, description: e.target.value })}
              placeholder="ملاحظات إضافية..."
              rows={3}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(false)}
              className="flex-1 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-md flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingLocation ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Archive className="w-8 h-8 text-amber-600" />
            إدارة الأرشيف المتكامل
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">نظام أرشفة ذكي للملفات الرقمية والفيزيائية مع تتبع كامل</p>
        </div>
        
        <div className="flex gap-4 text-center">
          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-600">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">إجمالي المؤرشف</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{archivedCount}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-600">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">ملفات فيزيائية</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{physicalFilesCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-xl overflow-x-auto">
        {[
          { id: 'digital', label: 'الأرشيف الرقمي', icon: Folder },
          { id: 'physical', label: 'وحدات التخزين', icon: Box },
          { id: 'requests', label: 'طلبات الاستعارة', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[120px] py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-700/50'}`}
          >
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'digital' && renderDigitalArchive()}
        {activeTab === 'physical' && renderPhysicalArchive()}
        {activeTab === 'requests' && renderRequests()}
      </div>

      {/* Modals */}
      {isLocationModalOpen && renderLocationModal()}
      
      {/* Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">طلب استعارة جديد</h3>
                <button 
                  onClick={() => setIsRequestModalOpen(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  القضية
                </label>
                <select
                  value={requestForm.caseId}
                  onChange={(e) => {
                    const caseId = e.target.value;
                    setRequestForm(prev => ({ ...prev, caseId }));
                    const selectedCase = cases.find(c => c.id === caseId);
                    setSelectedCase(selectedCase || null);
                  }}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  required
                >
                  <option value="">اختر القضية</option>
                  {cases.filter(c => c.archiveData).map(caseItem => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {caseItem.caseNumber} - {caseItem.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  اسم مقدم الطلب
                </label>
                <input
                  type="text"
                  value={requestForm.requesterName}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, requesterName: e.target.value }))}
                  placeholder="أدخل اسم مقدم الطلب..."
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أدخل أي ملاحظات إضافية..."
                  rows={3}
                  className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setIsRequestModalOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium"
              >
                إلغاء
              </button>
              <button 
                onClick={addRequest}
                disabled={!requestForm.caseId}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إرسال الطلب
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivePage;
