
import { Case, Client, Hearing, Task, ActivityLog, AppUser, CaseStatus, HearingStatus, ClientType, ClientStatus, LegalReference } from '../types';

export const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'أحمد محمد علي',
    type: ClientType.INDIVIDUAL,
    status: ClientStatus.ACTIVE,
    nationalId: '29001011234567',
    phone: '01012345678',
    address: '15 شارع التحرير، الدقي',
    poaExpiry: '2024-12-31',
  },
  {
    id: '2',
    name: 'شركة النور للمقاولات',
    type: ClientType.COMPANY,
    status: ClientStatus.ACTIVE,
    nationalId: '123456', // Commercial Register
    phone: '01123456789',
    companyRepresentative: 'م. محمود حسن',
    address: 'التجمع الخامس',
  }
];

export const MOCK_CASES: Case[] = [
  {
    id: '101',
    title: 'دعوى صحة توقيع',
    caseNumber: '5678',
    year: 2023,
    court: 'محكمة جنوب القاهرة',
    courtBranch: 'محكمة جنوب القاهرة الابتدائية',
    circle: 'الدائرة 5 مدني',
    judgeName: 'المستشار/ محمد حسين',
    stage: 'primary',
    status: CaseStatus.OPEN,
    clientId: '1',
    clientName: 'أحمد محمد علي',
    clientRole: 'مدعي',
    finance: {
      agreedFees: 5000,
      paidAmount: 2000,
      expenses: 500,
      history: [
        { id: 't1', date: '2023-01-01', amount: 2000, type: 'payment', method: 'cash', recordedBy: 'Admin' },
        { id: 't2', date: '2023-01-15', amount: 500, type: 'expense', category: 'رسوم', description: 'رسم دعوى', recordedBy: 'Admin' }
      ]
    },
    strategy: {
      strengthPoints: 'وجود عقد أصلي وتوكيل ساري',
      weaknessPoints: 'تأخر في رفع الدعوى',
      plan: 'التركيز على صحة التوقيع فقط دون التطرق للموضوع'
    }
  },
  {
    id: '102',
    title: 'جنحة شيك بدون رصيد',
    caseNumber: '9900',
    year: 2024,
    court: 'جنح الدقي',
    stage: 'primary',
    status: CaseStatus.OPEN,
    clientId: '2',
    clientName: 'شركة النور للمقاولات',
    clientRole: 'مجني عليه',
    finance: {
      agreedFees: 15000,
      paidAmount: 15000,
      expenses: 1200,
      history: []
    }
  }
];

export const MOCK_HEARINGS: Hearing[] = [
  {
    id: 'h1',
    caseId: '101',
    date: new Date().toISOString().split('T')[0], // Today
    time: '09:00',
    type: 'session',
    status: HearingStatus.SCHEDULED,
    requirements: 'تقديم أصل العقد'
  },
  {
    id: 'h2',
    caseId: '102',
    date: '2023-11-20',
    time: '10:00',
    type: 'session',
    status: HearingStatus.COMPLETED,
    decision: 'تأجيل للإعلان',
    isCompleted: true
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'كتابة مذكرة دفاع للقضية 5678',
    dueDate: '2023-10-25',
    priority: 'high',
    status: 'pending',
    relatedCaseId: '101'
  }
];

export const MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: 'a1',
    user: 'محمد المحامي',
    action: 'إضافة جلسة',
    target: 'دعوى صحة توقيع',
    timestamp: new Date().toISOString()
  }
];

export const MOCK_USERS: AppUser[] = [
  {
    id: 'u1',
    name: 'أستاذ أحمد',
    email: 'admin@law.com',
    username: 'admin',
    password: 'admin',
    roleLabel: 'مدير النظام',
    isActive: true,
    permissions: [
      { moduleId: 'dashboard', access: 'write' },
      { moduleId: 'cases', access: 'write' },
      { moduleId: 'clients', access: 'write' },
      { moduleId: 'hearings', access: 'write' },
      { moduleId: 'tasks', access: 'write' }, // Added tasks permission
      { moduleId: 'documents', access: 'write' },
      { moduleId: 'fees', access: 'write' },
      { moduleId: 'expenses', access: 'write' },
      { moduleId: 'reports', access: 'write' },
      { moduleId: 'settings', access: 'write' },
      { moduleId: 'ai-assistant', access: 'write' },
      { moduleId: 'references', access: 'write' }
    ]
  }
];

export const MOCK_REFERENCES: LegalReference[] = [
  {
    id: 'ref1',
    title: 'القانون المدني المصري',
    type: 'law',
    branch: 'civil',
    description: 'النص الكامل للقانون المدني رقم 131 لسنة 1948',
    year: 1948,
    tags: ['عقود', 'التزامات', 'ملكية']
  },
  {
    id: 'ref2',
    title: 'حكم نقض في بطلان القبض',
    type: 'ruling',
    branch: 'criminal',
    description: 'مبدأ هام: بطلان القبض والتفتيش لانتفاء حالة التلبس وما يترتب عليه من أدلة',
    courtName: 'محكمة النقض',
    year: 2020,
    tags: ['جنائي', 'تلبس', 'إجراءات']
  }
];
