
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Case, Client, Hearing, PaymentMethod, FinancialTransaction, ActivityLog } from '../types';
import { Wallet, TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUpRight, ArrowDownLeft, Filter, Search, Plus, CreditCard, Calendar, FileText, AlertCircle, CheckCircle, Calculator, User, Receipt, X, Building, Smartphone, Banknote, ScrollText, Printer, Share2, Download, Wifi, WifiOff } from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { offlineManager } from '../services/offlineManager';
import EnhancedSearch from '../components/EnhancedSearch';
import { shouldSearchInCurrentPage, getCurrentPageSearchQuery, clearCurrentPageSearch } from '../utils/currentPageSearch';

interface FeesProps {
  cases: Case[];
  clients: Client[];
  hearings: Hearing[];
  onUpdateCase?: (updatedCase: Case) => void;
  onAddActivity?: (activity: any) => void;
  canViewIncome?: boolean;
  canViewExpenses?: boolean;
  readOnly?: boolean;
}

const Fees: React.FC<FeesProps> = ({ cases, clients, hearings, onUpdateCase, onAddActivity, canViewIncome = true, canViewExpenses = true, readOnly = false }) => {
  // --- Offline Status ---
  const offlineStatus = useOfflineStatus();
  const isOnline = offlineStatus?.online ?? true;
  const pendingCount = offlineStatus?.pendingActions ?? 0;
  
  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses'>('overview');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'debt'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Check for voice search query in current page
  useEffect(() => {
    if (shouldSearchInCurrentPage()) {
      const query = getCurrentPageSearchQuery();
      
      if (query) {
        console.log('🔍 البحث الصوتي في الصفحة الحالية (المصاريف والاتعاب):', query);
        
        // Apply search to current page
        setSearchTerm(query);
        
        // Add to recent searches
        if (!recentSearches.includes(query)) {
          setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
        }
        
        // Show results count
        setTimeout(() => {
          // Search in all fees data
          const feeItems = [
            ...cases.map(c => ({ ...c, itemType: 'case' as const })),
            ...clients.map(c => ({ ...c, itemType: 'client' as const })),
            ...hearings.map(h => ({ ...h, itemType: 'hearing' as const }))
          ];
          
          const results = feeItems.filter(item => 
            (item as any).title?.toLowerCase().includes(query.toLowerCase()) ||
            (item as any).caseNumber?.toLowerCase().includes(query.toLowerCase()) ||
            (item as any).clientName?.toLowerCase().includes(query.toLowerCase()) ||
            (item as any).description?.toLowerCase().includes(query.toLowerCase()) ||
            (item as any).status?.toLowerCase().includes(query.toLowerCase()) ||
            (item as any).paymentMethod?.toLowerCase().includes(query.toLowerCase()) ||
            (item as any).category?.toLowerCase().includes(query.toLowerCase()) ||
            // Search in payment method
            (item as any).amount?.toString().includes(query) ||
            // Search in activity logs
            (item as any).notes?.toLowerCase().includes(query.toLowerCase())
          );
          
          console.log(`🔍 نتائج البحث الصوتي في المصاريف والاتعاب: "${query}" - ${results.length} نتيجة`);
        }, 500);
        
        // Clear search after applying
        clearCurrentPageSearch();
      }
    }
  }, [cases, clients, hearings, recentSearches]);

  // Legacy voice search check (for backward compatibility)
  useEffect(() => {
    const voiceSearchQuery = localStorage.getItem('voiceSearchQuery');
    const voiceSearchTimestamp = localStorage.getItem('voiceSearchTimestamp');
    const searchType = localStorage.getItem('searchType');
    const searchInCurrent = localStorage.getItem('searchInCurrentPage');
    
    console.log('🔍 التحقق من البحث الصوتي في المصاريف والاتعاب:', { voiceSearchQuery, searchType, searchInCurrent });
    
    // Only apply legacy search if not current page search
    if (voiceSearchQuery && voiceSearchTimestamp && searchType === 'voice' && !searchInCurrent) {
      const timestamp = parseInt(voiceSearchTimestamp);
      const now = Date.now();
      
      if (now - timestamp < 15000) {
        // Check if this search is actually for fees
        const normalizedQuery = voiceSearchQuery.toLowerCase();
        const isFeesSearch = normalizedQuery.includes('مصروف') || normalizedQuery.includes('مصاريف') ||
                             normalizedQuery.includes('اتعاب') || normalizedQuery.includes('رسوم') ||
                             normalizedQuery.includes('دفع') || normalizedQuery.includes('دفعات') ||
                             normalizedQuery.includes('مقبوض') || normalizedQuery.includes('مقبوضات') ||
                             normalizedQuery.includes('حساب') || normalizedQuery.includes('حسابات') ||
                             normalizedQuery.includes('عمولة') || normalizedQuery.includes('عمولات') ||
                             normalizedQuery.includes('أتعاب') || normalizedQuery.includes('أتعاب') ||
                             normalizedQuery.includes('مصروفية') || normalizedQuery.includes('مصروفيات');
        
        console.log('🎯 تحليل البحث:', { normalizedQuery, isFeesSearch });
        
        // Only apply search if it's actually for fees
        if (isFeesSearch) {
          console.log('✅ تطبيق البحث الصوتي للمصاريف والاتعاب:', voiceSearchQuery);
          setSearchTerm(voiceSearchQuery);
          
          // Add to recent searches
          if (!recentSearches.includes(voiceSearchQuery)) {
            setRecentSearches(prev => [voiceSearchQuery, ...prev.slice(0, 4)]);
          }
          
          // Show voice search notification
          setTimeout(() => {
            const feeItems = [
              ...cases.map(c => ({ ...c, itemType: 'case' as const })),
              ...clients.map(c => ({ ...c, itemType: 'client' as const })),
              ...hearings.map(h => ({ ...h, itemType: 'hearing' as const }))
            ];
            
            const resultsCount = feeItems.filter(item => 
              (item as any).title?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              (item as any).caseNumber?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              (item as any).clientName?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              (item as any).description?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              (item as any).status?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              (item as any).paymentMethod?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              (item as any).category?.toLowerCase().includes(voiceSearchQuery.toLowerCase()) ||
              (item as any).amount?.toString().includes(voiceSearchQuery) ||
              (item as any).notes?.toLowerCase().includes(voiceSearchQuery.toLowerCase())
            ).length;
            
            console.log(`🔍 البحث الصوتي في المصاريف والاتعاب: "${voiceSearchQuery}" - ${resultsCount} نتيجة`);
          }, 500);
        } else {
          console.log('❌ هذا البحث ليس للمصاريف والاتعاب، سيتم تجاهله:', voiceSearchQuery);
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
  }, [cases, clients, hearings, recentSearches]);

  // Modal State
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedCaseForDetails, setSelectedCaseForDetails] = useState<string | null>(null); // For View History Modal
  const [detailsTab, setDetailsTab] = useState<'payments' | 'expenses'>('payments');

  // Invoice Generation State
  const [printingTrans, setPrintingTrans] = useState<{ trans: FinancialTransaction, caseData: Case, clientName: string } | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Add Transaction Form Data
  const [transactionData, setTransactionData] = useState({
    caseId: '',
    amount: 0,
    type: 'payment' as 'payment' | 'expense',
    description: '',
    method: 'cash' as PaymentMethod,
    category: ''
  });

  // --- Activity Logging ---
  const logActivity = (action: string, target: string, user: string = 'مستخدم') => {
    if (onAddActivity) {
      const activity: Omit<ActivityLog, 'id'> = {
        action,
        target,
        user,
        timestamp: new Date().toISOString()
      };
      onAddActivity(activity);
    }
  };

  // Handle Tab Logic based on Permissions
  useEffect(() => {
    if (!canViewIncome && canViewExpenses) {
      setActiveTab('expenses');
    } else if (canViewIncome) {
      setActiveTab('overview');
    }
  }, [canViewIncome, canViewExpenses]);

  // --- Data Aggregation & Logic ---

  // 1. Financial Stats
  const stats = useMemo(() => {
    let totalAgreed = 0;
    let totalCollected = 0;
    let totalExpenses = 0;

    cases.forEach(c => {
      if (c.finance) {
        totalAgreed += c.finance.agreedFees || 0;
        totalCollected += c.finance.paidAmount || 0;
        totalExpenses += c.finance.expenses || 0; // Hearing expenses are already included here
      }
    });

    const totalPending = totalAgreed - totalCollected;
    const netIncome = totalCollected - totalExpenses;
    const collectionRate = totalAgreed > 0 ? Math.round((totalCollected / totalAgreed) * 100) : 0;

    return { totalAgreed, totalCollected, totalPending, totalExpenses, netIncome, collectionRate };
  }, [cases]); // Remove hearings from dependencies

  // 2. Cases Financial List
  const casesFinancials = useMemo(() => {
    return cases.map(c => {
      const client = clients.find(cl => cl.id === c.clientId);
      const agreed = c.finance?.agreedFees || 0;
      const paid = c.finance?.paidAmount || 0;
      const remaining = agreed - paid;
      const percentage = agreed > 0 ? (paid / agreed) * 100 : 0;
      
      let status: 'completed' | 'partial' | 'unpaid' = 'partial';
      if (paid >= agreed && agreed > 0) status = 'completed';
      else if (paid === 0) status = 'unpaid';

      return {
        ...c,
        clientName: client?.name || 'غير معروف',
        financials: { agreed, paid, remaining, percentage, status }
      };
    }).filter(c => {
      const matchesSearch = c.title.includes(searchTerm) || c.clientName.includes(searchTerm) || c.caseNumber.includes(searchTerm);
      if (!matchesSearch) return false;

      if (filterStatus === 'completed') return c.financials.status === 'completed';
      if (filterStatus === 'pending') return c.financials.status !== 'completed';
      if (filterStatus === 'debt') return c.financials.remaining > 0;
      
      return true;
    });
  }, [cases, clients, searchTerm, filterStatus]);

  // 3. Expenses List (Aggregated) - Only from Case Finance History
  const expensesList = useMemo(() => {
    const list: any[] = [];
    
    // Only include expenses from case finance history (hearing expenses are already added there)
    cases.forEach(c => {
      if (c.finance?.history) {
         c.finance.history.filter(t => t.type === 'expense').forEach(t => {
            list.push({
               id: t.id,
               date: t.date,
               category: t.category || (t.hearingId ? 'مصروفات جلسة' : 'إدارية'),
               description: t.description || 'مصروفات',
               amount: t.amount,
               caseTitle: c.title,
               clientName: clients.find(cl => cl.id === c.clientId)?.name,
               paidBy: 'المكتب'
            });
         });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cases, clients]);

  // --- Handlers ---

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateCase || !transactionData.caseId) {
      console.error('Missing required data:', { caseId: transactionData.caseId });
      alert('الرجاء اختيار القضية أولاً');
      return;
    }

    const targetCase = cases.find(c => c.id === transactionData.caseId);
    if (!targetCase) {
      console.error('Case not found:', { caseId: transactionData.caseId });
      alert('القضية المحددة غير موجودة');
      return;
    }

    // Validate transaction data
    if (!transactionData.amount || Number(transactionData.amount) <= 0) {
      console.error('Invalid amount:', { amount: transactionData.amount });
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (!transactionData.description || transactionData.description.trim() === '') {
      console.error('Missing description:', { description: transactionData.description });
      alert('يرجى إدخال وصف للمعاملة');
      return;
    }

    try {
      const currentFinance = targetCase.finance || { agreedFees: 0, paidAmount: 0, expenses: 0, history: [] };
      
      const newTransaction: FinancialTransaction = {
         id: Math.random().toString(36).substring(2, 9),
         date: new Date().toISOString().split('T')[0],
         amount: Number(transactionData.amount),
         type: transactionData.type,
         description: transactionData.description,
         recordedBy: 'المحامي' // In real app, use current user name
      };

      // Add optional fields only if they have values
      if (transactionData.type === 'payment' && transactionData.method) {
        newTransaction.method = transactionData.method;
      }
      if (transactionData.type === 'expense' && transactionData.category) {
        newTransaction.category = transactionData.category;
      }

      let newFinance = { 
         ...currentFinance,
         history: [...(currentFinance.history || []), newTransaction]
      };

      if (transactionData.type === 'payment') {
        newFinance.paidAmount += Number(transactionData.amount);
      } else {
        newFinance.expenses += Number(transactionData.amount);
      }

      console.log('Processing transaction:', { 
        caseId: targetCase.id,
        transaction: newTransaction,
        newFinance: newFinance,
        isOnline
      });

      // Handle offline/online transaction
      if (isOnline) {
        // Online: Update case directly
        console.log('📡 Online: Updating case directly');
        onUpdateCase({
          ...targetCase,
          finance: newFinance
        });
      } else {
        // Offline: Add to pending actions
        console.log('📴 Offline: Adding transaction to pending actions');
        await offlineManager.addPendingAction({
          type: 'update',
          entity: 'case',
          data: {
            id: targetCase.id,
            finance: newFinance
          }
        });
        
        // Update local state immediately for better UX
        onUpdateCase({
          ...targetCase,
          finance: newFinance
        });
      }

      // Log activity
      const actionType = transactionData.type === 'payment' ? 'تسجيل معاملة دفع' : 'تسجيل مصروفات';
      logActivity(actionType, `${transactionData.description} - ${targetCase.title}`);
      
      setIsTransactionModalOpen(false);
      setTransactionData({ caseId: '', amount: 0, type: 'payment', description: '', method: 'cash', category: '' });
      
      alert('تمت إضافة المعاملة المالية بنجاح');
    } catch (err) {
      console.error('Error processing transaction:', err);
      alert('فشل في معاملة العملية المالية');
    }
  };

  const openTransactionModal = (caseId?: string) => {
    if (caseId) {
       setTransactionData(prev => ({ ...prev, caseId }));
    }
    // Default to 'expense' if user has no income permission
    if (!canViewIncome) {
       setTransactionData(prev => ({ ...prev, type: 'expense' }));
    }
    setIsTransactionModalOpen(true);
  };

  const getMethodIcon = (method: string) => {
     switch(method) {
        case 'cash': return <Banknote className="w-4 h-4 text-green-600" />;
        case 'instapay': return <Smartphone className="w-4 h-4 text-purple-600" />;
        case 'check': return <ScrollText className="w-4 h-4 text-blue-600" />;
        case 'wallet': return <Wallet className="w-4 h-4 text-amber-600" />;
        case 'bank_transfer': return <Building className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
        default: return <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />;
     }
  };

  const getMethodLabel = (method: string) => {
     switch(method) {
        case 'cash': return 'نقدي (Cash)';
        case 'instapay': return 'InstaPay';
        case 'check': return 'شيك بنكي';
        case 'wallet': return 'محفظة إلكترونية';
        case 'bank_transfer': return 'تحويل بنكي';
        default: return 'أخرى';
     }
  };

  // --- Invoice Generation Logic ---
  const handlePrintReceipt = async (trans: FinancialTransaction, caseData: Case) => {
     const client = clients.find(c => c.id === caseData.clientId);
     setPrintingTrans({ trans, caseData, clientName: client?.name || 'غير معروف' });
     
     // Allow state to update and DOM to render
     setTimeout(async () => {
        if (!invoiceRef.current) return;
        
        try {
           const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
           const imgData = canvas.toDataURL('image/png');
           const pdf = new jsPDF('p', 'mm', 'a4');
           const pdfWidth = pdf.internal.pageSize.getWidth();
           const imgProps = pdf.getImageProperties(imgData);
           const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
           
           pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
           pdf.save(`Receipt_${trans.id}.pdf`);
           
           // Clean up
           setPrintingTrans(null);
        } catch (err) {
           console.error('Invoice Print Error:', err);
           alert('حدث خطأ أثناء طباعة الإيصال');
        }
     }, 500);
  };

  const handleShareWhatsApp = (trans: FinancialTransaction, caseData: Case) => {
     const client = clients.find(c => c.id === caseData.clientId);
     if (!client) return;

     const typeLabel = trans.type === 'payment' ? 'إيصال استلام دفعة' : 'بيان مصروفات';
     const msg = `
*مكتب الميزان للمحاماة*
${typeLabel}

👤 الموكل: ${client.name}
⚖️ القضية: ${caseData.title} (${caseData.caseNumber})
💰 المبلغ: ${trans.amount.toLocaleString()} ج.م
📅 التاريخ: ${trans.date}
📝 البيان: ${trans.description || '-'}

تم تسجيل المعاملة بنجاح.
     `;
     
     const url = `https://wa.me/2${client.phone}?text=${encodeURIComponent(msg)}`;
     window.open(url, '_blank');
  };

  // --- Render Components ---

  const renderStatCard = (title: string, value: number, icon: any, colorClass: string, subValue?: string) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">{title}</p>
        <h3 className={`text-2xl font-bold ${colorClass}`}>{value.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></h3>
        {subValue && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subValue}</p>}
      </div>
      <div className={`p-3 rounded-full ${colorClass.replace('text-', 'bg-').replace('700', '100').replace('600', '100')} ${colorClass}`}>
        {React.createElement(icon, { className: "w-6 h-6" })}
      </div>
    </div>
  );

  const renderCaseFinancialDetails = () => {
     if (!selectedCaseForDetails) return null;
     const c = cases.find(x => x.id === selectedCaseForDetails);
     if (!c) return null;
     
     const transactions = c.finance?.history || [];
     const payments = transactions.filter(t => t.type === 'payment').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
     const expenses = transactions.filter(t => t.type === 'expense').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

     // Calculate Net Income for this specific case
     const totalPaid = c.finance?.paidAmount || 0;
     const totalExpenses = c.finance?.expenses || 0;
     const netIncome = totalPaid - totalExpenses;

     return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              
              {/* Header */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                 <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{c.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                       <User className="w-4 h-4" /> {c.clientName} | <FileText className="w-4 h-4" /> {c.caseNumber}
                    </p>
                 </div>
                 <button onClick={() => setSelectedCaseForDetails(null)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-red-500">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              {/* Summary Cards inside Modal - Show only if income permission exists */}
              {canViewIncome && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                   <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">إجمالي الأتعاب</p>
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-200">{c.finance?.agreedFees.toLocaleString()}</p>
                   </div>
                   <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800 text-center">
                      <p className="text-xs text-green-600 dark:text-green-400 font-bold mb-1">المدفوع</p>
                      <p className="text-lg font-bold text-green-900 dark:text-green-200">{totalPaid.toLocaleString()}</p>
                   </div>
                   <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-bl-full"></div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mb-1">صافي الدخل</p>
                      <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200">{netIncome.toLocaleString()}</p>
                      <p className="text-[10px] text-indigo-400 mt-1">بعد خصم المصروفات ({totalExpenses.toLocaleString()})</p>
                   </div>
                   <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 text-center">
                      <p className="text-xs text-red-600 dark:text-red-400 font-bold mb-1">المتبقي</p>
                      <p className="text-lg font-bold text-red-900 dark:text-red-200">{((c.finance?.agreedFees||0) - totalPaid).toLocaleString()}</p>
                   </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                 {canViewIncome && (
                   <button 
                      onClick={() => setDetailsTab('payments')}
                      className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${detailsTab === 'payments' ? 'border-b-2 border-green-500 text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-900/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                   >
                      <ArrowDownLeft className="w-4 h-4" /> سجل الدفعات (الوارد)
                   </button>
                 )}
                 {canViewExpenses && (
                   <button 
                      onClick={() => setDetailsTab('expenses')}
                      className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${detailsTab === 'expenses' ? 'border-b-2 border-red-500 text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                   >
                      <ArrowUpRight className="w-4 h-4" /> سجل المصروفات (الصادر)
                   </button>
                 )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-0">
                 {detailsTab === 'payments' && canViewIncome ? (
                    <table className="w-full text-right text-sm">
                       <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 sticky top-0">
                          <tr>
                             <th className="p-4">التاريخ</th>
                             <th className="p-4">المبلغ</th>
                             <th className="p-4">طريقة الدفع</th>
                             <th className="p-4">البيان</th>
                             <th className="p-4 text-center">إيصال</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                          {payments.map(p => (
                             <tr key={p.id} className="hover:bg-green-50/30 dark:hover:bg-green-900/10">
                                <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{p.date}</td>
                                <td className="p-4 font-bold text-green-700 dark:text-green-400">{p.amount.toLocaleString()} ج.م</td>
                                <td className="p-4">
                                   <div className="flex items-center gap-2">
                                      {getMethodIcon(p.method || 'cash')}
                                      <span>{getMethodLabel(p.method || 'cash')}</span>
                                   </div>
                                </td>
                                <td className="p-4 text-slate-600 dark:text-slate-400">{p.description}</td>
                                <td className="p-4 text-center flex justify-center gap-2">
                                   <button 
                                     onClick={() => handlePrintReceipt(p, c)}
                                     className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                     title="طباعة إيصال"
                                   >
                                      <Printer className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => handleShareWhatsApp(p, c)}
                                     className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:text-green-400 dark:hover:bg-green-900/30 rounded transition-colors"
                                     title="مشاركة واتساب"
                                   >
                                      <Share2 className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                          {payments.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد دفعات مسجلة</td></tr>}
                       </tbody>
                    </table>
                 ) : (
                    <table className="w-full text-right text-sm">
                       <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 sticky top-0">
                          <tr>
                             <th className="p-4">التاريخ</th>
                             <th className="p-4">المبلغ</th>
                             <th className="p-4">البند</th>
                             <th className="p-4">البيان</th>
                             <th className="p-4 text-center">طباعة</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                          {expenses.map(ex => (
                             <tr key={ex.id} className="hover:bg-red-50/30 dark:hover:bg-red-900/10">
                                <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{ex.date}</td>
                                <td className="p-4 font-bold text-red-700 dark:text-red-400">-{ex.amount.toLocaleString()} ج.م</td>
                                <td className="p-4"><span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{ex.category}</span></td>
                                <td className="p-4 text-slate-600 dark:text-slate-400">{ex.description}</td>
                                <td className="p-4 text-center">
                                   <button 
                                     onClick={() => handlePrintReceipt(ex, c)}
                                     className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 rounded transition-colors"
                                   >
                                      <Printer className="w-4 h-4" />
                                   </button>
                                </td>
                             </tr>
                          ))}
                          {expenses.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">لا توجد مصروفات مسجلة</td></tr>}
                       </tbody>
                    </table>
                 )}
              </div>
              
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                 <button onClick={() => setSelectedCaseForDetails(null)} className="px-6 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-600">إغلاق</button>
              </div>
           </div>
        </div>
     );
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      
      {/* Offline Status Indicator */}
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              وضع عدم الاتصال - سيتم حفظ المعاملات محلياً
            </p>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {pendingCount} معاملة تنتظر المزامنة
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Hidden Invoice Template */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
         {printingTrans && (
            <div 
               ref={invoiceRef} 
               className="bg-white text-black p-12 flex flex-col font-serif"
               style={{ width: '210mm', minHeight: '148mm', direction: 'rtl' }}
            >
               {/* Header */}
               <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-start">
                  <div>
                     <h1 className="text-2xl font-bold mb-2">مكتب الميزان للمحاماة</h1>
                     <p className="text-sm text-gray-600">للاستشارات القانونية وأعمال المحاماة</p>
                  </div>
                  <div className="text-left">
                     <h2 className="text-xl font-bold bg-gray-100 px-4 py-1 rounded border border-gray-300">
                        {printingTrans.trans.type === 'payment' ? 'إيصال استلام نقدية' : 'إذن صرف نقدية'}
                     </h2>
                     <p className="text-sm mt-2">رقم: {printingTrans.trans.id.toUpperCase()}</p>
                     <p className="text-sm">التاريخ: {printingTrans.trans.date}</p>
                  </div>
               </div>

               {/* Body */}
               <div className="flex-1 space-y-6 text-lg leading-loose">
                  <div className="flex gap-4">
                     <span className="font-bold min-w-[100px]">استلمنا من السيد/</span>
                     <span className="border-b border-dotted border-gray-400 flex-1 px-2">{printingTrans.clientName}</span>
                  </div>
                  <div className="flex gap-4">
                     <span className="font-bold min-w-[100px]">مبلغ وقدره/</span>
                     <span className="border-b border-dotted border-gray-400 flex-1 px-2 bg-gray-50 font-mono font-bold text-xl">{printingTrans.trans.amount.toLocaleString()} ج.م (فقط وقدره ................................)</span>
                  </div>
                  <div className="flex gap-4">
                     <span className="font-bold min-w-[100px]">وذلك مقابل/</span>
                     <span className="border-b border-dotted border-gray-400 flex-1 px-2">
                        {printingTrans.trans.description || 'أتعاب محاماة'} - قضية: {printingTrans.caseData.title} ({printingTrans.caseData.caseNumber})
                     </span>
                  </div>
                  <div className="flex gap-4">
                     <span className="font-bold min-w-[100px]">طريقة الدفع/</span>
                     <span className="border-b border-dotted border-gray-400 flex-1 px-2">{getMethodLabel(printingTrans.trans.method || 'cash')}</span>
                  </div>
               </div>

               {/* Footer */}
               <div className="mt-12 pt-8 flex justify-between items-center border-t border-gray-200">
                  <div className="text-center">
                     <p className="font-bold mb-8">المستلم (المحاسب)</p>
                     <p className="text-gray-400">.......................</p>
                  </div>
                  <div className="text-center">
                     <p className="font-bold mb-8">اعتماد المحامي</p>
                     <p className="text-gray-400">.......................</p>
                  </div>
                  <div className="text-center">
                     <div className="w-24 h-24 border-2 border-gray-300 rounded-full flex items-center justify-center text-gray-300 font-bold transform -rotate-12">
                        ختم المكتب
                     </div>
                  </div>
               </div>
               
               <div className="mt-8 text-center text-xs text-gray-500">
                  العنوان: المهندسين، الجيزة - هاتف: 01000000000
               </div>
            </div>
         )}
      </div>

      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            الإدارة المالية
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-500" />
            )}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">متابعة دقيقة للأتعاب، المدفوعات، ومصروفات القضايا</p>
        </div>
        <div className="flex gap-2">
           {!readOnly && (canViewIncome || canViewExpenses) && <button 
             onClick={() => setIsTransactionModalOpen(true)}
             className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
           >
             <Plus className="w-4 h-4" /> تسجيل معاملة
           </button>}
           {canViewIncome && (
             <button className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
               تصدير تقرير
             </button>
           )}
        </div>
      </div>

      {/* 2. Dashboard Stats (Hide completely if only Expenses) */}
      {canViewIncome ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {renderStatCard('إجمالي الأتعاب المتفق عليها', stats.totalAgreed, TrendingUp, 'text-slate-700 dark:text-slate-300', 'قيمة العقود المسجلة')}
          {renderStatCard('إجمالي المحصل', stats.totalCollected, ArrowDownLeft, 'text-emerald-600', `نسبة التحصيل: ${stats.collectionRate}%`)}
          {renderStatCard('مستحقات (ديون)', stats.totalPending, AlertCircle, 'text-red-600 dark:text-red-400', 'أتعاب لم يتم تحصيلها')}
          {renderStatCard('إجمالي المصاريف', stats.totalExpenses, ArrowUpRight, 'text-red-600 dark:text-red-400', 'مصروفات جميع القضايا')}
          {renderStatCard('صافي الدخل', stats.netIncome, Calculator, 'text-indigo-600 dark:text-indigo-400', `بعد خصم المصروفات (${stats.totalExpenses.toLocaleString()})`)}
        </div>
      ) : (
        /* Only Expense Stats */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {renderStatCard('إجمالي المصروفات', stats.totalExpenses, ArrowUpRight, 'text-red-600 dark:text-red-400', 'نثريات، انتقالات، ورسوم')}
        </div>
      )}

      {/* 3. Main Content (Tabs) */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[500px]">
        {/* Tabs Header */}
        <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
           {canViewIncome && (
             <button 
               onClick={() => setActiveTab('overview')} 
               className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}
             >
                <FileText className="w-4 h-4" /> سجل أتعاب القضايا
             </button>
           )}
           {canViewExpenses && (
             <button 
               onClick={() => setActiveTab('expenses')} 
               className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-600 text-red-700 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}
             >
                <ArrowUpRight className="w-4 h-4" /> سجل المصروفات
             </button>
           )}
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
           <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                 type="text" 
                 placeholder={activeTab === 'overview' ? "بحث باسم القضية أو الموكل..." : "بحث في المصروفات..."}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pr-9 pl-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
              />
           </div>
           
           {activeTab === 'overview' && (
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                 <Filter className="w-4 h-4 text-slate-400" />
                 <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                    disabled={readOnly}
                  >
                    <option value="all">جميع الحالات</option>
                    <option value="completed">خالص السداد</option>
                    <option value="debt">علية مديونية</option>
                 </select>
              </div>
           )}
        </div>

        {/* Tab Content: Cases Financials */}
        {activeTab === 'overview' && canViewIncome && (
           <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                       <th className="p-4">القضية / الموكل</th>
                       <th className="p-4">إجمالي الأتعاب</th>
                       <th className="p-4 w-1/4">موقف السداد</th>
                       <th className="p-4">المدفوع</th>
                       <th className="p-4">المتبقي</th>
                       <th className="p-4">الإجراءات</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                    {casesFinancials.map(c => (
                       <tr key={c.id} onClick={() => setSelectedCaseForDetails(c.id)} className="hover:bg-slate-50 dark:hover:bg-slate-700 group cursor-pointer transition-colors">
                          <td className="p-4">
                             <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{c.title}</div>
                             <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                <User className="w-3 h-3" /> {c.clientName}
                             </div>
                          </td>
                          <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{c.financials.agreed.toLocaleString()}</td>
                          <td className="p-4">
                             <div className="w-full bg-slate-200 dark:bg-slate-600 h-2.5 rounded-full overflow-hidden mb-1">
                                <div 
                                   className={`h-full rounded-full ${c.financials.status === 'completed' ? 'bg-emerald-500' : c.financials.percentage < 50 ? 'bg-red-500' : 'bg-amber-500'}`} 
                                   style={{ width: `${c.financials.percentage}%` }}
                                ></div>
                             </div>
                             <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                <span>{Math.round(c.financials.percentage)}%</span>
                                <span>{c.financials.status === 'completed' ? 'مكتمل' : 'جاري'}</span>
                             </div>
                          </td>
                          <td className="p-4 text-emerald-700 dark:text-emerald-400 font-bold">{c.financials.paid.toLocaleString()}</td>
                          <td className={`p-4 font-bold ${c.financials.remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                             {c.financials.remaining > 0 ? c.financials.remaining.toLocaleString() : '0'}
                          </td>
                          <td className="p-4">
                             {!readOnly && canViewIncome && <button 
                               onClick={(e) => { e.stopPropagation(); openTransactionModal(c.id); }}
                               className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 p-2 rounded-lg transition-colors flex items-center gap-1 font-bold text-xs"
                             >
                                <Plus className="w-3 h-3" /> إضافة دفعة
                             </button>}
                          </td>
                       </tr>
                    ))}
                    {casesFinancials.length === 0 && (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">لا توجد سجلات مطابقة</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        )}

        {/* Tab Content: Expenses */}
        {activeTab === 'expenses' && canViewExpenses && (
           <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                       <th className="p-4">التاريخ</th>
                       <th className="p-4">البند / الوصف</th>
                       <th className="p-4">نوع المصروف</th>
                       <th className="p-4">خاص بقضية</th>
                       <th className="p-4">القيمة</th>
                       <th className="p-4">جهة الدفع</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
                    {expensesList.map((exp: any) => (
                       <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="p-4 font-mono text-slate-600 dark:text-slate-400">{exp.date}</td>
                          <td className="p-4 text-slate-800 dark:text-white">{exp.description}</td>
                          <td className="p-4"><span className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs">{exp.category}</span></td>
                          <td className="p-4">
                             {exp.caseTitle ? (
                                <div>
                                   <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{exp.caseTitle}</div>
                                   <div className="text-[10px] text-slate-400">{exp.clientName}</div>
                                </div>
                             ) : '-'}
                          </td>
                          <td className="p-4 font-bold text-red-600 dark:text-red-400">-{exp.amount.toLocaleString()}</td>
                          <td className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">{exp.paidBy}</td>
                       </tr>
                    ))}
                    {expensesList.length === 0 && (
                       <tr><td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">لا توجد مصروفات مسجلة</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        )}
      </div>

      {/* Transaction Modal (Add New) */}
      {isTransactionModalOpen && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">تسجيل معاملة مالية</h3>
                  <button onClick={() => setIsTransactionModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button>
               </div>
               
               <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
                  {/* Transaction Type */}
                  <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg mb-4">
                     {canViewIncome && (
                       <button 
                          type="button" 
                          onClick={() => setTransactionData({...transactionData, type: 'payment'})}
                          className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${transactionData.type === 'payment' ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                       >
                          <ArrowDownLeft className="w-4 h-4" /> استلام دفعة
                       </button>
                     )}
                     {canViewExpenses && (
                       <button 
                          type="button" 
                          onClick={() => setTransactionData({...transactionData, type: 'expense'})}
                          className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${transactionData.type === 'expense' ? 'bg-white dark:bg-slate-600 text-red-600 dark:text-red-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                       >
                          <ArrowUpRight className="w-4 h-4" /> تسجيل مصروف
                       </button>
                     )}
                  </div>

                  {/* Case Selection */}
                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القضية الخاصة بالمعاملة</label>
                     <select 
                        required
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                        value={transactionData.caseId}
                        onChange={e => setTransactionData({...transactionData, caseId: e.target.value})}
                        disabled={readOnly || (!canViewIncome && !canViewExpenses)}
                     >
                        <option value="">اختر القضية...</option>
                        {cases.map(c => (
                           <option key={c.id} value={c.id}>{c.title} - {clients.find(cl=>cl.id===c.clientId)?.name}</option>
                        ))}
                     </select>
                  </div>

                  {/* Amount */}
                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المبلغ (ج.م)</label>
                     <input 
                        type="number" 
                        required
                        min="0"
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                        value={transactionData.amount}
                        onChange={e => setTransactionData({...transactionData, amount: Number(e.target.value)})}
                        disabled={readOnly || (!canViewIncome && !canViewExpenses)}
                     />
                  </div>

                  {/* Payment Method (If Payment) */}
                  {transactionData.type === 'payment' && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">طريقة الدفع</label>
                        <div className="grid grid-cols-2 gap-2">
                           {['cash', 'check', 'instapay', 'wallet', 'bank_transfer'].map(method => (
                              <button
                                 key={method}
                                 type="button"
                                 onClick={() => setTransactionData({...transactionData, method: method as PaymentMethod})}
                                 className={`p-2 rounded border text-xs font-bold flex items-center justify-center gap-2 ${transactionData.method === method ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                 disabled={readOnly || !canViewIncome}
                              >
                                 {getMethodIcon(method)}
                                 {getMethodLabel(method)}
                              </button>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* Category (If Expense) */}
                  {transactionData.type === 'expense' && (
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">بند المصروف</label>
                        <select 
                           className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                           value={transactionData.category}
                           onChange={e => setTransactionData({...transactionData, category: e.target.value})}
                           disabled={readOnly || !canViewExpenses}
                        >
                           <option value="">اختر...</option>
                           <option value="رسوم">رسوم قضائية</option>
                           <option value="انتقالات">انتقالات</option>
                           <option value="إدارية">إدارية / نثريات</option>
                           <option value="تصوير">تصوير</option>
                           <option value="ضيافة">ضيافة</option>
                        </select>
                     </div>
                  )}

                  {/* Description */}
                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ملاحظات / بيان</label>
                     <input 
                        type="text" 
                        className="w-full border border-slate-300 dark:border-slate-600 p-2 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                        placeholder={transactionData.type === 'payment' ? 'دفعة من حساب الأتعاب' : 'تفاصيل المصروف'}
                        value={transactionData.description}
                        onChange={e => setTransactionData({...transactionData, description: e.target.value})}
                        disabled={readOnly || (transactionData.type === 'payment' && !canViewIncome) || (transactionData.type === 'expense' && !canViewExpenses)}
                     />
                  </div>

                  {!readOnly && ((transactionData.type === 'payment' && canViewIncome) || (transactionData.type === 'expense' && canViewExpenses)) && <button 
                     type="submit" 
                     className={`w-full py-3 rounded-lg text-white font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mt-4 ${transactionData.type === 'payment' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none'}`}
                  >
                     {transactionData.type === 'payment' ? <Plus className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                     {transactionData.type === 'payment' ? 'إضافة الدفعة' : 'تسجيل المصروف'}
                  </button>}
               </form>
            </div>
         </div>
      )}

      {/* Details View Modal */}
      {renderCaseFinancialDetails()}
    </div>
  );
}

export default Fees;
