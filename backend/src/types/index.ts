// Import types that are re-exported below

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Session related types
export interface CreateSessionDto {
  name: string;
  date: string; // ISO string
}

export interface UpdateSessionDto {
  name?: string;
  date?: string;
  status?: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
}

// Export Prisma types for convenience
export type {
  Session,
  TranscriptionData,
  Section,
  SectionMapping
} from '@prisma/client';

// Define types that were previously enums
export type SessionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
export type DataSource = 'NOTTA' | 'MANUS';
export type ProcessingStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
// Section related types
export interface CreateSectionDto {
  source: DataSource;
  speaker: string;
  timestamp: string;
  endTimestamp?: string | null;
  content?: string;
  insertPosition?: number; // 挿入位置（0ベース）
}

export interface UpdateSectionDto {
  speaker?: string;
  timestamp?: string;
  endTimestamp?: string | null;
  content?: string;
  isExcluded?: boolean;
}

export interface ReorderSectionsDto {
  source: DataSource;
}

