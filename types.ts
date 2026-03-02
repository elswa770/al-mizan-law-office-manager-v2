
export enum CaseStatus {
  OPEN = 'مفتوحة',
  CLOSED = 'مغلقة',
  ARCHIVED = 'مؤرشفة',
  JUDGMENT = 'حكم نهائي',
  EXECUTION = 'قيد التنفيذ'
}

export enum CaseType {
  CIVIL_CASE = 'قضية مدنية',
  CRIMINAL_CASE = 'قضية جنائية',
  FAMILY_CASE = 'قضية أسرة',
  ADMINISTRATIVE_CASE = 'قضية مجلس دولة',
  LABOR_CASE = 'قضية عمالية',
  COMMERCIAL_CASE = 'قضية تجارية',
  ECONOMIC_CASE = 'قضية اقتصادية',
  OTHER_CASE = 'قضية أخرى'
}

export enum HearingStatus {
  SCHEDULED = 'محددة',
  COMPLETED = 'تمت',
  POSTPONED = 'مؤجلة',
  CANCELLED = 'ملغاة',
  RESERVED_FOR_JUDGMENT = 'حجز للحكم'
}

export enum ClientType {
  INDIVIDUAL = 'فرد',
  COMPANY = 'شركة'
}

export enum ClientStatus {
  ACTIVE = 'نشط',
  INACTIVE = 'غير نشط'
}

export enum ArchiveStatus {
  DIGITAL = 'رقمي',
  PHYSICAL = 'فيزيائي',
  BOTH = 'رقمي وفيزيائي'
}

export enum ArchiveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RETURNED = 'returned',
  ARCHIVED_RETURNED = 'archived_returned'
}

export enum LawyerStatus {
  ACTIVE = 'نشط',
  INACTIVE = 'غير نشط',
  ON_LEAVE = 'في إجازة',
  SUSPENDED = 'موقوف'
}

export enum BarLevel {
  GENERAL = 'جدول عام',
  PRIMARY = 'محاكم ابتدائية',
  APPEAL = 'استئناف عالي ومجلس دولة',
  CASSATION = 'نقض'
}

export enum LawyerSpecialization {
  GENERAL = 'عام',
  CIVIL = 'مدني',
  CRIMINAL = 'جنائي',
  FAMILY = 'أسرة',
  COMMERCIAL = 'تجاري',
  LABOR = 'عمالي',
  ADMINISTRATIVE = 'مجلس دولة',
  ECONOMIC = 'اقتصادي'
}

export enum LawyerRole {
  SENIOR_PARTNER = 'شريك أول',
  PARTNER = 'شريك',
  SENIOR_LAWYER = 'محامي أول',
  LAWYER = 'محامي',
  JUNIOR_LAWYER = 'محامي مبتدئ',
  LEGAL_ADVISOR = 'مستشار قانوني',
  LEGAL_ASSISTANT = 'مساعد قانوني'
}

export enum ArchiveLocationType {
  ROOM = 'room',
  CABINET = 'cabinet',
  SHELF = 'shelf',
  BOX = 'box'
}

export enum CourtType {
  FAMILY_COURT = 'محكمة الأسرة',
  CRIMINAL = 'جنايات',
  MISDEMEANOR = 'جنح',
  CIVIL_COURT = 'محكمة مدنية',
  ADMINISTRATIVE_COURT = 'محكمة مجلس دولة',
  ECONOMIC_COURT = 'محكمة اقتصادية',
  COMMERCIAL_COURT = 'محكمة تجارية',
  LABOR_COURT = 'محكمة عمالية',
  OTHER_COURT = 'محكمة أخرى'
}

export type PermissionLevel = 'none' | 'read' | 'write';
export type PaymentMethod = 'cash' | 'check' | 'instapay' | 'wallet' | 'bank_transfer';
export type ReferenceType = 'law' | 'ruling' | 'encyclopedia' | 'regulation';
export type LawBranch = 'civil' | 'criminal' | 'administrative' | 'commercial' | 'family' | 'labor' | 'other';

export interface Permission {
  moduleId: string;
  access: PermissionLevel;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  roleLabel: string;
  isActive: boolean;
  permissions: Permission[];
  avatar?: string;
  lastLogin?: string;
}

export interface ClientDocument {
  id: string;
  type: 'national_id' | 'poa' | 'commercial_register' | 'contract' | 'other';
  name: string;
  url: string;
  uploadDate: string;
  expiryDate?: string;
  issueDate?: string;
  notes?: string;
  // Google Drive fields
  driveFileId?: string;
  driveLink?: string;
  driveContentLink?: string;
  uploadedToDrive?: boolean;
  uploadToDrive?: boolean;
}

export interface POAFile extends ClientDocument {}

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  status: ClientStatus;
  nationalId: string;
  phone: string;
  secondaryPhone?: string;
  address?: string;
  email?: string;
  notes?: string;
  nationality?: string;
  dateOfBirth?: string;
  companyRepresentative?: string;
  documents: ClientDocument[];
  poaFiles?: POAFile[];
  poaExpiry?: string;
}

export interface Opponent {
  name: string;
  role: string;
  lawyer?: string;
  phone?: string;
}

export interface CaseDocument {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'excel' | 'image' | 'other';
  category: 'contract' | 'ruling' | 'notice' | 'evidence' | 'other';
  url: string;
  uploadDate: string;
  driveFileId?: string;
  driveLink?: string;
  driveContentLink?: string;
  uploadedToDrive?: boolean;
  isOriginal?: boolean;
}

export interface CaseRuling {
  id: string;
  date: string;
  summary: string;
  documentName?: string;
  url?: string;
}

export interface CaseMemo {
  id: string;
  title: string;
  type: 'defense' | 'appeal' | 'other';
  submissionDate: string;
  url?: string;
}

export interface DailyNote {
  id: string;
  date: string;
  content: string;
  author: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  amount: number;
  type: 'payment' | 'expense';
  method?: PaymentMethod;
  category?: string;
  description?: string;
  recordedBy: string;
}

export interface CaseFinance {
  agreedFees: number;
  paidAmount: number;
  expenses: number;
  history: FinancialTransaction[];
}

export interface CaseStrategy {
  strengthPoints?: string;
  weaknessPoints?: string;
  plan?: string;
  privateNotes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface Case {
  id: string;
  title: string;
  caseNumber: string;
  year: number;
  court: string;
  courtBranch?: string;
  circle?: string;
  judgeName?: string;
  stage?: 'primary' | 'appeal' | 'cassation';
  status: CaseStatus;
  clientId: string;
  clientName: string;
  clientRole?: string;
  opponents?: Opponent[];
  documents?: CaseDocument[];
  rulings?: CaseRuling[];
  memos?: CaseMemo[];
  notes?: DailyNote[];
  finance?: CaseFinance;
  strategy?: CaseStrategy;
  aiChatHistory?: ChatMessage[];
  description?: string;
  startDate?: string;
  // New fields for advanced case tracking
  assignedLawyerId?: string;
  assignedLawyerName?: string; // اسم المحامي المسؤول
  caseType?: LawBranch;
  filingDate?: string;
  hearings?: Hearing[];
  deadlines?: string[];
  archiveData?: ArchiveData; // Added archive data field
  closedAt?: string; // تاريخ الإغلاق الفعلي
}

export interface HearingExpenses {
  amount: number;
  description: string;
  paidBy: 'lawyer' | 'client';
}

export interface Hearing {
  id: string;
  caseId: string;
  date: string;
  time?: string;
  type: 'session' | 'procedure';
  status: HearingStatus;
  decision?: string;
  requirements?: string;
  clientRequirements?: string;
  isCompleted?: boolean;
  rulingUrl?: string;
  expenses?: HearingExpenses;
  // Lawyer assignment fields
  assignedLawyerId?: string; // المحامي المسؤول عن الجلسة
  assignedLawyerName?: string; // اسم المحامي المسؤول
  createdAt?: string;
  updatedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  relatedCaseId?: string;
  assignedTo?: string; // User ID
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface LegalReference {
  id: string;
  title: string;
  type: ReferenceType;
  branch: LawBranch;
  description?: string;
  articleNumber?: string;
  year?: number;
  courtName?: string;
  author?: string;
  url?: string;
  tags?: string[];
  // Google Drive fields
  uploadedToDrive?: boolean;
  driveFileId?: string;
  driveLink?: string;
  driveContentLink?: string;
  uploadDate?: string;
  // Favorite field
  isFavorite?: boolean;
}

export interface WorkLocation {
  id: string;
  name: string;
  type: 'court' | 'police_station' | 'notary' | 'expert' | 'other';
  address: string;
  governorate: string;
  googleMapLink?: string;
  notes?: string;
  phone?: string;
}

export interface SMTPSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromEmail: string;
  fromName: string;
}

export interface WhatsAppSettings {
  apiKey: string;
  phoneNumberId: string;
  businessAccountId?: string;
  enabled: boolean;
}

export interface AlertPreferences {
  email: boolean;
  whatsapp: boolean;
  system: boolean;
  
  // Specific Toggles
  hearings: boolean;
  tasks: boolean;
  deadlines: boolean;
  systemUpdates: boolean;
  
  // Timing
  hearingReminderDays: number; // Days before hearing
  taskReminderDays: number; // Days before deadline
}

export interface NotificationSettings {
  smtp: SMTPSettings;
  whatsapp: WhatsAppSettings;
  preferences: AlertPreferences;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'financial' | 'operational' | 'case' | 'client' | 'custom';
  sections: string[]; // IDs of sections to include
  filters?: Record<string, any>;
  createdBy: string;
  createdAt: string;
}

export interface ScheduledReport {
  id: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[]; // Email addresses
  format: 'pdf' | 'excel' | 'word';
  nextRun: string;
  lastRun?: string;
  active: boolean;
}

export interface ReportSignature {
  id: string;
  userId: string;
  imageUrl: string; // Base64 or URL
  uploadedAt: string;
}

export interface LoginAttempt {
  id: string;
  ip: string;
  timestamp: string;
  success: boolean;
  username: string;
  userAgent: string;
}

export interface ActiveSession {
  id: string;
  userId: string;
  ip: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passwordPolicy: {
    minLength: number;
    requireNumbers: boolean;
    requireSymbols: boolean;
    requireUppercase: boolean;
    expiryDays: number;
  };
  ipWhitelist: string[];
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
}

export interface DataManagementSettings {
  autoBackupFrequency: 'daily' | 'weekly' | 'monthly' | 'off';
  autoBackupTime: string;
  retainBackupsCount: number;
  archiveClosedCasesAfterDays: number;
  deleteArchivedAfterYears: number;
  enableAutoArchive: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  lastCheck: string;
  components: {
    database: 'operational' | 'degraded' | 'down';
    api: 'operational' | 'degraded' | 'down';
    storage: 'operational' | 'degraded' | 'down';
    backup: 'operational' | 'degraded' | 'down';
  };
}

export interface SystemError {
  id: string;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  source: string;
  resolved: boolean;
}

export interface ResourceUsage {
  cpu: number; // percentage
  memory: number; // percentage
  storage: number; // percentage used
  uptime: string;
}

// Archive Management Interfaces
export interface ArchiveLocation {
  id: string;
  name: string;
  type: ArchiveLocationType;
  fullPath: string;
  capacity: number;
  occupied: number;
  description?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string; // For hierarchical relationship
}

export interface ArchiveRequest {
  id: string;
  caseId: string;
  requesterId: string;
  requesterName: string;
  requestDate: string;
  status: ArchiveRequestStatus;
  notes?: string;
  approvedBy?: string;
  approvedDate?: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  archivedReturnDate?: string;
}

// Lawyer Management Interfaces
export interface Lawyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  barNumber: string;
  barRegistrationNumber?: string; // رقم القيد في النقابة
  barLevel?: BarLevel; // درجة القيد بالنقابة
  specialization: LawyerSpecialization;
  role: LawyerRole;
  status: LawyerStatus;
  joinDate: string;
  officeLocation?: string;
  bio?: string;
  education?: string;
  experience?: number;
  languages?: string[];
  casesHandled?: number;
  successRate?: number;
  hourlyRate?: number;
  profileImage?: string;
  documents?: LawyerDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface LawyerDocument {
  id: string;
  lawyerId: string;
  documentType: 'cv' | 'certificate' | 'license' | 'contract' | 'other';
  documentName: string;
  documentUrl: string;
  uploadDate: string;
  uploadedBy: string;
  verified: boolean;
  notes?: string;
}

export interface LawyerPerformance {
  lawyerId: string;
  period: string; // e.g., "2024-Q1"
  casesHandled: number;
  casesWon: number;
  casesLost: number;
  casesPending: number;
  totalRevenue: number;
  averageCaseDuration: number;
  clientSatisfactionScore: number;
  billableHours: number;
}

export interface ArchiveData {
  locationId: string;
  boxNumber: string;
  archivedDate: string;
  archivedBy: string;
  physicalCondition: 'good' | 'fair' | 'poor';
  notes?: string;
  qrCode?: string;
}

// Extend Case interface to include archive data
export interface CaseWithArchive extends Case {
  archiveData?: ArchiveData;
}

export interface MaintenanceSettings {
  autoUpdate: boolean;
  errorReporting: boolean;
  performanceMonitoring: boolean;
  maintenanceWindow: string; // e.g., "03:00"
}
