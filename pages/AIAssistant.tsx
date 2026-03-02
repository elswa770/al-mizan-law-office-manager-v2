
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { askLegalAssistant } from '../services/geminiService';
import { Send, Sparkles, AlertTriangle, Copy, Check, Briefcase, FileText, Save, Edit3, X, ChevronRight, Download, Lightbulb, History, Trash2, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Case, CaseDocument, CourtType, ChatMessage, LegalReference, Hearing } from '../types';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface AIAssistantProps {
  cases?: Case[];
  references?: LegalReference[]; 
  hearings?: Hearing[]; // Added hearings prop
  onUpdateCase?: (updatedCase: Case) => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ cases = [], references = [], hearings = [], onUpdateCase }) => {
  // --- Chat State ---
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- Context State ---
  const [selectedContextCaseId, setSelectedContextCaseId] = useState<string>('');
  
  // --- Editor/Save State ---
  const [draftContent, setDraftContent] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [saveTargetCaseId, setSaveTargetCaseId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Hidden ref for PDF generation
  const printRef = useRef<HTMLDivElement>(null);

  // --- Auto-scroll ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // --- Load Chat History Effect ---
  useEffect(() => {
    if (selectedContextCaseId) {
      const selectedCase = cases.find(c => c.id === selectedContextCaseId);
      if (selectedCase && selectedCase.aiChatHistory) {
        setMessages(selectedCase.aiChatHistory);
      } else {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [selectedContextCaseId, cases]);

  // --- Helpers: Deep Context Builder ---
  const getContextString = () => {
    let context = "";

    // 1. Case Specific Context (Deep)
    if (selectedContextCaseId) {
      const c = cases.find(x => x.id === selectedContextCaseId);
      if (c) {
        // Basic Metadata
        context += `
        === بيانات القضية الأساسية ===
        العنوان: ${c.title}
        رقم القضية: ${c.caseNumber} لسنة ${c.year}
        المحكمة: ${c.court} - ${c.courtBranch || ''} (الدائرة: ${c.circle || 'غير محدد'})
        الموكل: ${c.clientName} (صفته: ${c.clientRole})
        `;

        // Opponents
        if (c.opponents && c.opponents.length > 0) {
           context += `\n\n=== الخصوم ===\n`;
           c.opponents.forEach((op, idx) => {
              context += `${idx+1}. ${op.name} (صفته: ${op.role}) - محاميه: ${op.lawyer || 'غير معروف'}\n`;
           });
        }

        // Hearings History (Crucial for Strategy)
        if (hearings && hearings.length > 0) {
           const caseHearings = hearings.filter(h => h.caseId === c.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
           if (caseHearings.length > 0) {
              context += `\n\n=== سجل الجلسات والموقف الإجرائي ===\n`;
              // Next Hearing
              const next = caseHearings.find(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)));
              if (next) {
                 context += `[الجلسة القادمة]: بتاريخ ${next.date} - المطلوب: ${next.requirements || 'لم يحدد'}\n`;
              } else {
                 context += `[تنبيه]: لا توجد جلسات قادمة محددة.\n`;
              }
              // Previous Hearings (Last 3)
              context += `[آخر الجلسات]:\n`;
              caseHearings.filter(h => new Date(h.date) < new Date(new Date().setHours(0,0,0,0))).slice(0, 3).forEach(h => {
                 context += `- بتاريخ ${h.date}: القرار (${h.decision || 'تأجيل'}), الحالة: ${h.status}\n`;
              });
           }
        }

        // Deep Strategy
        if (c.strategy) {
           context += `\n\n=== استراتيجية الدفاع الخاصة بنا (Context of Strategy) ===\n`;
           context += `يجب أن تكون إجاباتك متوافقة مع هذه الخطة:\n`;
           if (c.strategy.strengthPoints) context += `[نقاط القوة]: ${c.strategy.strengthPoints}\n`;
           if (c.strategy.weaknessPoints) context += `[نقاط الضعف/الثغرات]: ${c.strategy.weaknessPoints}\n`;
           if (c.strategy.plan) context += `[خطة العمل]: ${c.strategy.plan}\n`;
           if (c.strategy.privateNotes) context += `[ملاحظات خاصة]: ${c.strategy.privateNotes}\n`;
        }

        // Private Notes History
        if (c.notes && c.notes.length > 0) {
           context += `\n\n=== سجل الملاحظات اليومية ===\n`;
           c.notes.forEach(n => {
              context += `- ${n.date}: ${n.content}\n`;
           });
        }

        // Memos
        if (c.memos && c.memos.length > 0) {
           context += `\n\n=== المذكرات المقدمة سابقاً ===\n`;
           c.memos.forEach(m => {
              context += `- مذكرة (${m.type}): ${m.title} بتاريخ ${m.submissionDate}\n`;
           });
        }
        
        // Documents List
        if (c.documents && c.documents.length > 0) {
           context += `\n\n=== المستندات المتاحة في الملف ===\n`;
           c.documents.forEach(d => {
              context += `- ${d.name} (نوع: ${d.category})\n`;
           });
        }
      }
    }

    // 2. Global Legal References (Library)
    if (references.length > 0) {
       context += `\n\n=== مكتبة المراجع القانونية الخاصة بالمكتب (للاسترشاد) ===\n`;
       references.slice(0, 20).forEach(ref => {
          context += `- [${ref.type === 'law' ? 'قانون' : 'حكم'}] ${ref.title}: ${ref.description ? ref.description.substring(0, 100) : ''}...\n`;
       });
    }

    return context.trim();
  };

  const handleAsk = async () => {
    if (!prompt.trim()) return;

    const context = getContextString();
    
    // Create User Message
    const newUserMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      text: prompt,
      timestamp: new Date().toISOString()
    };

    // Update Local State Optimistically
    const tempMessages = [...messages, newUserMsg];
    setMessages(tempMessages);
    setPrompt('');
    setLoading(true);
    setError(null);
    
    try {
      const result = await askLegalAssistant(newUserMsg.text, context);
      const modelResponse = result || 'عذراً، لم أتمكن من الحصول على إجابة.';
      
      const newModelMsg: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'model',
        text: modelResponse,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...tempMessages, newModelMsg];
      setMessages(finalMessages);

      // Persist to Case if Context is Selected
      if (selectedContextCaseId && onUpdateCase) {
        const c = cases.find(x => x.id === selectedContextCaseId);
        if (c) {
          onUpdateCase({ ...c, aiChatHistory: finalMessages });
        }
      }

    } catch (err) {
      setError('حدث خطأ أثناء التواصل مع الخادم. تأكد من الاتصال بالإنترنت.');
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    if (selectedContextCaseId && onUpdateCase) {
      const c = cases.find(x => x.id === selectedContextCaseId);
      if (c) {
        onUpdateCase({ ...c, aiChatHistory: [] });
      }
    }
  };

  const openEditor = (content: string) => {
    setDraftContent(content);
    setIsEditorOpen(true);
  };

  const handleSaveDocument = async () => {
    if (!onUpdateCase || !saveTargetCaseId || !documentName) return;
    const targetCase = cases.find(c => c.id === saveTargetCaseId);
    if (!targetCase) return;

    setIsSaving(true);

    try {
        const input = printRef.current;
        if (!input) throw new Error("Print ref missing");

        const canvas = await html2canvas(input, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);

        const newDoc: CaseDocument = {
          id: Math.random().toString(36).substring(2, 9),
          name: documentName.endsWith('.pdf') ? documentName : `${documentName}.pdf`, 
          type: 'pdf',
          category: 'contract', 
          url: url,
          size: `${(blob.size / 1024).toFixed(2)} KB`,
          uploadDate: new Date().toISOString().split('T')[0],
          isOriginal: false
        };

        const updatedDocs = [...(targetCase.documents || []), newDoc];
        onUpdateCase({ ...targetCase, documents: updatedDocs });

        setIsSaveModalOpen(false);
        setIsEditorOpen(false);
        setDocumentName('');
        alert('تم حفظ المستند (PDF) بنجاح في ملف القضية!');

    } catch (err) {
        console.error("PDF Save Error:", err);
        alert("حدث خطأ أثناء إنشاء ملف PDF.");
    } finally {
        setIsSaving(false);
    }
  };

  // --- Dynamic Prompts Logic ---
  const dynamicPrompts = useMemo(() => {
    const defaultPrompts = [
      "صغ لي عقد اتفاق أتعاب محاماة",
      "لخص لي أحكام النقض الحديثة في المسؤولية التقصيرية",
      "اكتب صيغة إنذار رسمي على يد محضر",
      "جدول المواعيد القانونية للاستئناف والنقض"
    ];

    if (!selectedContextCaseId) return defaultPrompts;

    const selectedCase = cases.find(c => c.id === selectedContextCaseId);
    if (!selectedCase) return defaultPrompts;

    // Smart prompts based on case strategy and type and title analysis
    const prompts = [];
    
    // 1. Strategy-based prompts
    if (selectedCase.strategy?.weaknessPoints) {
       prompts.push("كيف يمكن معالجة نقاط الضعف المذكورة في الاستراتيجية؟");
    }
    if (selectedCase.strategy?.plan) {
       prompts.push("اقترح خطوات عملية لتنفيذ خطة العمل");
    }

    // 2. Keyword Analysis (Title-based)
    const title = selectedCase.title.toLowerCase();
    let specificPrompts: string[] = [];

    // Civil / Contracts
    if (title.includes('صحة توقيع')) {
      specificPrompts.push("ما هي الدفوع الشكلية في دعوى صحة التوقيع؟");
      specificPrompts.push("صيغة مذكرة دفاع في دعوى صحة توقيع");
    } else if (title.includes('فسخ') || title.includes('عقد')) {
      specificPrompts.push("شروط فسخ العقد والإخلال بالالتزامات");
      specificPrompts.push("أحكام النقض في الشرط الفاسخ الصريح");
    }
    
    // Criminal / Checks / Theft / Drugs
    else if (title.includes('شيك') || title.includes('رصيد')) {
      specificPrompts.push("دفوع البراءة في جنحة شيك بدون رصيد (التقادم/الركن المادي)");
      specificPrompts.push("هل يجوز التصالح في قضايا الشيكات بعد الحكم النهائي؟");
    } else if (title.includes('مخدرات') || title.includes('تعاطي') || title.includes('اتجار')) {
      specificPrompts.push("بطلان القبض والتفتيش لانتفاء حالة التلبس");
      specificPrompts.push("مناقشة ضابط الواقعة حول إجراءات الضبط");
    } else if (title.includes('سرقة') || title.includes('تبديد') || title.includes('أمانة')) {
      specificPrompts.push("أركان جريمة السرقة وانتفاء القصد الجنائي");
      specificPrompts.push("الدفوع في جنحة التبديد (خيانة الأمانة)");
    } 
    
    // Family
    else if (title.includes('نفقة') || title.includes('أجور') || title.includes('مصاريف')) {
      specificPrompts.push("كيفية إثبات دخل الزوج الحقيقي (التحريات)");
      specificPrompts.push("صيغة استئناف حكم نفقة لزيادة المفروض");
    } else if (title.includes('طلاق') || title.includes('خلع')) {
      specificPrompts.push("إجراءات دعوى الطلاق للضرر وحقوق الزوجة");
      specificPrompts.push("حقوق الزوجة المالية بعد الخلع");
    } else if (title.includes('رؤية') || title.includes('حضانة')) {
      specificPrompts.push("شروط إسقاط الحضانة عن الأم");
      specificPrompts.push("تنظيم حق الرؤية في حالة تعنت الحاضنة");
    }
    
    // Real Estate / Rent
    else if (title.includes('إيجار') || title.includes('طرد') || title.includes('إخلاء')) {
      specificPrompts.push("شروط الإخلاء لعدم سداد الأجرة (قانون قديم/جديد)");
      specificPrompts.push("دفوع المستأجر في دعوى الطرد للغصب");
    } 
    
    // Labor
    else if (title.includes('عمال') || title.includes('فصل') || title.includes('تعسفي')) {
      specificPrompts.push("مستحقات العامل في حالة الفصل التعسفي");
      specificPrompts.push("عبء الإثبات في الدعاوى العمالية");
    }

    // 3. Fallback to General Court Type if no keywords match
    if (specificPrompts.length > 0) {
        prompts.push(...specificPrompts);
    } else {
        switch (selectedCase.court) {
          case CourtType.FAMILY: 
            prompts.push("صغ لي مذكرة دفاع في دعوى أسرة");
            prompts.push("المستندات المطلوبة لتعزيز موقفنا");
            break;
          case CourtType.CRIMINAL: 
            prompts.push("اكتب مذكرة بالدفوع الشكلية (بطلان الإجراءات)");
            prompts.push("سيناريو مرافعة يركز على تناقض الشهود");
            break;
          case CourtType.CIVIL: 
            prompts.push("صغ مذكرة بالرد على دعوى الخصم");
            prompts.push("تحليل قانوني للعقد المرفق في القضية");
            break;
          default:
            prompts.push("لخص لي وقائع هذه القضية واستخرج الدفوع");
        }
    }
    
    // Fill remaining slots with default prompts if needed
    if (prompts.length < 5) {
        const remaining = 5 - prompts.length;
        prompts.push(...defaultPrompts.slice(0, remaining));
    }
    
    return prompts;
  }, [selectedContextCaseId, cases]);

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6">
      
      {/* Hidden Div for PDF Generation (Off-screen) */}
      <div 
        ref={printRef} 
        className="fixed top-0 left-0 bg-white p-12 text-slate-900 font-serif leading-loose pointer-events-none z-[-10]"
        style={{ width: '210mm', minHeight: '297mm', direction: 'rtl', visibility: isSaving ? 'visible' : 'hidden', left: isSaving ? '0' : '-9999px' }}
      >
         <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
            <h1 className="text-2xl font-bold">مسودة قانونية</h1>
            <p className="text-sm text-slate-500">تم الصياغة بواسطة الميزان AI</p>
         </div>
         <div className="whitespace-pre-wrap text-lg">
            {draftContent}
         </div>
         <div className="mt-12 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
            <p>تم إنشاء هذا المستند آلياً - يرجى المراجعة القانونية قبل الاستخدام.</p>
         </div>
      </div>

      {/* Sidebar: Context & History */}
      <div className="w-80 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex-col hidden lg:flex">
        <div className="mb-6">
          <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            سياق القضية (Context)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">اختر قضية لتزويد المساعد ببياناتها الكاملة (الخصوم، الاستراتيجية، الملاحظات):</p>
          <select 
            value={selectedContextCaseId}
            onChange={(e) => setSelectedContextCaseId(e.target.value)}
            className="w-full text-sm border-slate-300 dark:border-slate-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700 dark:text-white"
          >
            <option value="">-- محادثة عامة --</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.title} - {c.clientName}</option>
            ))}
          </select>
          {selectedContextCaseId && (
             <div className="mt-2 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded text-xs text-indigo-700 dark:text-indigo-300 animate-in fade-in">
                <p className="font-bold flex items-center gap-1"><History className="w-3 h-3"/> تم تفعيل السياق العميق</p>
                <p className="mt-1 opacity-80 leading-relaxed">
                   يتم الآن استخدام الاستراتيجية، الملاحظات، سجل الجلسات، بيانات الخصوم، والمكتبة القانونية في الردود.
                </p>
             </div>
          )}
          {references.length > 0 && (
             <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <BookOpen className="w-3 h-3" />
                <span>متصل بالمكتبة القانونية ({references.length} مرجع)</span>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
           <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1">
             <Lightbulb className="w-3 h-3" /> مقترحات ذكية
           </h4>
           <div className="space-y-2">
              {dynamicPrompts.map((p, i) => (
                 <button 
                   key={i}
                   onClick={() => setPrompt(p)}
                   className="w-full text-right text-xs p-2 bg-slate-50 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-500 rounded transition-all text-slate-600 dark:text-slate-300 active:scale-95"
                 >
                    {p}
                 </button>
              ))}
           </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col relative">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/50">
           <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                 <h2 className="font-bold text-slate-800 dark:text-white">المستشار القانوني الذكي (Pro)</h2>
                 <p className="text-[10px] text-slate-500 dark:text-slate-400">يدعم التحليل العميق وربط الوقائع بالقانون</p>
              </div>
           </div>
           <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> محو المحادثة
           </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-800">
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-4 opacity-60">
                <Sparkles className="w-16 h-16 stroke-1" />
                <p>مرحباً بك في الميزان AI. أنا جاهز لتحليل القضايا وصياغة المذكرات.</p>
                {selectedContextCaseId && <p className="text-sm bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400">وضع التحليل العميق للقضية مفعل</p>}
             </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
               <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tr-none' : 'bg-indigo-50 dark:bg-indigo-900/30 text-slate-800 dark:text-slate-200 border border-indigo-100 dark:border-indigo-800 rounded-tl-none'}`}>
                  {msg.role === 'user' ? (
                     <p className="text-sm font-medium">{msg.text}</p>
                  ) : (
                     <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:text-indigo-800 dark:prose-headings:text-indigo-300 dark:text-slate-300 dark:prose-strong:text-slate-200">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                        {/* Actions for Model Response */}
                        <div className="mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-800 flex gap-2">
                           <button 
                             onClick={() => {navigator.clipboard.writeText(msg.text)}}
                             className="text-xs flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded hover:bg-white dark:hover:bg-slate-700"
                           >
                              <Copy className="w-3 h-3" /> نسخ
                           </button>
                           <button 
                             onClick={() => openEditor(msg.text)}
                             className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-bold px-2 py-1 rounded bg-white dark:bg-slate-700 border border-indigo-100 dark:border-slate-600 hover:shadow-sm transition-all"
                           >
                              <FileText className="w-3 h-3" /> تحويل لمستند وتعديل
                           </button>
                        </div>
                     </div>
                  )}
                  {msg.timestamp && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-left dir-ltr">{new Date(msg.timestamp).toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})}</p>}
               </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-end">
               <div className="bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
                  <span className="text-xs text-slate-400 dark:text-slate-300 mr-2">جاري التفكير والتحليل القانوني...</span>
               </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 mx-auto max-w-md">
               <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="اكتب طلبك القانوني هنا... (مثال: تحليل استراتيجية الخصم بناءً على نقاط الضعف)"
              className="w-full resize-none rounded-xl border-slate-300 dark:border-slate-600 pr-4 pl-12 py-3 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm bg-slate-50 dark:bg-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-600 transition-colors"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />
            <button 
              onClick={handleAsk}
              disabled={loading || !prompt.trim()}
              className="absolute left-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white p-2 rounded-lg transition-colors shadow-sm"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* --- Editor Overlay --- */}
        {isEditorOpen && (
           <div className="absolute inset-0 bg-white dark:bg-slate-900 z-20 flex flex-col animate-in slide-in-from-bottom-5 duration-300">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-indigo-50/30 dark:bg-indigo-900/20">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> محرر المسودة
                 </h3>
                 <div className="flex gap-2">
                    <button onClick={() => setIsEditorOpen(false)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-sm">إلغاء</button>
                    <button 
                       onClick={() => {
                          setSaveTargetCaseId(selectedContextCaseId || (cases.length > 0 ? cases[0].id : ''));
                          setDocumentName('مسودة قانونية جديد');
                          setIsSaveModalOpen(true);
                       }}
                       className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
                    >
                       <Save className="w-4 h-4" /> حفظ في القضية
                    </button>
                 </div>
              </div>
              <textarea 
                 value={draftContent}
                 onChange={(e) => setDraftContent(e.target.value)}
                 className="flex-1 p-6 resize-none focus:outline-none text-slate-800 dark:text-slate-200 leading-relaxed font-serif text-lg bg-transparent"
              ></textarea>
           </div>
        )}

        {/* --- Save Modal --- */}
        {isSaveModalOpen && (
           <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95">
                 <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">حفظ المستند (PDF)</h3>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم المستند</label>
                       <div className="relative">
                          <input 
                             type="text" 
                             value={documentName}
                             onChange={(e) => setDocumentName(e.target.value)}
                             className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 pl-12 focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                          />
                          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">.pdf</span>
                       </div>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">حفظ في قضية</label>
                       <select 
                          value={saveTargetCaseId}
                          onChange={(e) => setSaveTargetCaseId(e.target.value)}
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-700 dark:text-white"
                       >
                          {cases.map(c => (
                             <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                       </select>
                    </div>
                 </div>
                 <div className="flex gap-2 mt-6">
                    <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-lg font-medium">رجوع</button>
                    <button 
                      onClick={handleSaveDocument} 
                      disabled={isSaving}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
                    >
                       {isSaving ? (
                          <>
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             جاري المعالجة...
                          </>
                       ) : (
                          'تأكيد الحفظ'
                       )}
                    </button>
                 </div>
              </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default AIAssistant;
