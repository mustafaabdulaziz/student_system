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
}

export interface University {
  id: string;
  name: string;
  website: string;
  country: 'Turkey' | 'Cyprus';
  city: string;
  description: string;
  logo?: string; // URL or base64 - optional
}

export type ProgramCategory =
  | 'medicine_health_sciences'
  | 'engineering_technology'
  | 'natural_sciences'
  | 'social_economic_admin_sciences'
  | 'education_teaching'
  | 'law_communication_humanities'
  | 'art_design_sports';

export const PROGRAM_CATEGORIES: ProgramCategory[] = [
  'medicine_health_sciences',
  'engineering_technology',
  'natural_sciences',
  'social_economic_admin_sciences',
  'education_teaching',
  'law_communication_humanities',
  'art_design_sports'
];

export interface Program {
  id: string;
  universityId: string;
  name: string; // Branch name
  nameInArabic?: string;
  category?: ProgramCategory;
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
  country?: string;
  description?: string;
  /** Program intake / listing availability (false = closed) */
  isOpen?: boolean;
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
  createdAt?: string;
  updatedAt?: string;
}

export enum ApplicationStatus {
  DRAFT = 'Draft',
  UNDER_REVIEW = 'Under Review',
  ACCEPTED = 'Accepted',
  REJECTED = 'Rejected',
  MISSING_DOCS = 'Missing Documents'
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
  cost?: number;
  commission?: number;
  saleAmount?: number;
  currency?: string;
}

export const APPLICATION_CURRENCIES = ['USD', 'TRY', 'EUR'] as const;

export interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  active?: boolean;
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
  currentUser: User | null;
}