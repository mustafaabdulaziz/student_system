export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  AGENT = 'agent',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  countryCode?: string;
  password?: string;
  active?: boolean;
  agentCommissions?: AgentCommission[];
}

export interface AgentCommission {
  universityId: string;
  commissionKind: 'rate' | 'amount';
  commissionValue: number;
  depositSupport?: number | null;
}

export interface University {
  id: string;
  name: string;
  website: string;
  country: 'Turkey' | 'Cyprus';
  city: string;
  description: string;
  logo?: string; // URL or base64 - optional
  /** Admin-only: education VAT rate (integer, e.g. percent points) */
  educationVatRate?: number | null;
  /** Admin-only: overseas VAT rate default for new applications (percent, e.g. 10) */
  abroadVatRate?: number | null;
  /** Admin-only: commission as fixed amount or rate */
  commissionKind?: 'amount' | 'rate' | null;
  commissionValue?: number | null;
  /** Admin-only: default bonus max/min for new applications */
  bonusMax?: number | null;
  bonusMin?: number | null;
}

export interface Program {
  id: string;
  universityId: string;
  name: string; // Branch name
  nameInArabic?: string;
  degree: 'Bachelor' | 'Master' | 'PhD' | 'Diploma' | 'CombinedPhD';
  language: 'English' | 'Turkish' | 'Arabic';
  years: number;
  deadline?: string; // deprecated: use periodId
  periodId?: string;
  fee: number;
  feeBeforeDiscount?: number;
  deposit?: number;
  cashPrice?: number;
  currency?: string;
  description?: string;
  /** Program intake / listing availability (false = closed) */
  isOpen?: boolean;
  /** Admin-only: archived programs hidden from agents/users */
  isArchived?: boolean;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  passportNumber: string;
  fatherName: string;
  motherName: string;
  gender: 'Male' | 'Female';
  phone: string;
  email: string;
  nationality: string;
  degreeTarget: string; // Desired degree level
  dob: string;
  residenceCountry: string;
  userId?: string; // Agent who owns this student (for ADMIN/USER display)
  files?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export enum ApplicationStatus {
  NEW = 'Yeni Başvuru',
  OFFER_LETTER_WAITING = 'Teklif mektubu bekleniyor',
  OFFER_LETTER_SEND_TO_COMPANY_WAITING = "Teklif mektubu firma'ya gonderilmesi bekleniyor",
  DEPOSIT_PAYMENT_WAITING = 'Depozito ödemesi bekleniyor',
  DEPOSIT_PAYMENT_UPLOAD_WAITING = 'Depozito ödemesi sisteme Yüklenmesi bekleniyor',
  ACCEPTANCE_LETTER_WAITING = 'Kabul mektubu bekleniyor',
  ACCEPTANCE_LETTER_SEND_TO_COMPANY_WAITING = "kabul metubu firma'ya gonderilmesi bekleniyor",
  STUDENT_DOCUMENT_WAITING = 'Öğrenci belgesi bekleniyor',
  STUDENT_DOCUMENT_DELIVERED = 'Öğrenci belgesi teslim edildi',
  ANNUAL_PAYMENT_RECEIPT_WAITING = 'Yıllık ödemesi dekonto bekleniyor',
  UNIVERSITY_ACCOUNTING_APPROVAL_WAITING = 'Üniversite muhasebe listesinde onaylanması bekleniyor',
  COMPLETED = 'Tamamlandı',
  SCHOLARSHIP = 'Burslu',
  REJECTED = 'Red edildi',
  REGISTERED_WITH_OTHER_AGENCY = 'Baska agenta uzerinden kayitli',
  MISSING_DOCS = 'Eksik evrak',
  QUOTA_FULL = 'Kota ful',
  PAYMENT_REJECTED = 'Ödeme red edildi',
  DEPOSIT_REFUND_FORM_COMPLETED = 'Depozito iade formu dolduruldu',
  DEPOSIT_REFUND_DEPOSITED_TO_ACCOUNT = 'Depozito iadesi hesaba yatırıldı',
  DEPOSIT_REFUND_DELIVERED_TO_COMPANY = 'Depozito iadesi firmaya teslim edildi',
}

export interface Application {
  id: string;
  studentId: string;
  programId: string;
  periodId?: string;
  status: ApplicationStatus;
  semester: string;
  createdAt: string;
  updatedAt?: string;
  files: string[]; // URLs or fake paths
  userId?: string;
  agentPhone?: string;
  agentName?: string;
  agentCountryCode?: string;
  responsibleId?: string;
  responsibleName?: string;
  agencyCompanyId?: string;
  agencyCompanyName?: string;
  annualPayment?: number;
  educationVatRate?: number;
  educationVat?: number;
  abroadVatRate?: number;
  grossCommission?: number;
  abroadVat?: number;
  netCommission?: number;
  bonusMax?: number;
  bonusMin?: number;
  agencyCommission?: number;
  agencyBonus?: number;
  depositSupport?: number;
  agencyContractAmount?: number;
  currency?: string;
  remainingMin?: number;
  remainingMax?: number;
  paymentDeserved?: boolean;
  paymentDate?: string;
  paymentMonth?: string;
  internalDescription?: string | null;
}

export interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active?: boolean;
}

export interface AgencyCompany {
  id: string;
  name: string;
}

export interface PaymentSource {
  id: string;
  name: string;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string;
  createdByName?: string | null;
}

// Helper types for state management
export interface AppState {
  users: User[];
  universities: University[];
  programs: Program[];
  students: Student[];
  applications: Application[];
  periods: Period[];
  agencyCompanies: AgencyCompany[];
  paymentSources: PaymentSource[];
  currentUser: User | null;
}

/** Filters passed from dashboard chart/table drill-down to the applications list. */
export interface ApplicationListFilters {
  createdFrom?: string;
  createdTo?: string;
  statuses?: string[];
  universityIds?: string[];
  programIds?: string[];
  degrees?: string[];
  nationalities?: string[];
  responsibles?: string[];
  agents?: string[];
  currencies?: string[];
}