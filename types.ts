export enum AppStep {
  UPLOAD = 'UPLOAD',
  PROFILE_REVIEW = 'PROFILE_REVIEW',
  JOB_SELECTION = 'JOB_SELECTION',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS'
}

export enum SkillLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export interface Skill {
  name: string;
  category: 'Technical' | 'Soft' | 'Tool' | 'Domain';
  level: SkillLevel;
  evidence?: string;
}

export interface UserProfile {
  fullName?: string;
  summary?: string;
  skills: Skill[];
  experienceYears?: number;
}

export interface JobContext {
  role: string;
  type: 'Generalized' | 'CompanySpecific';
  description?: string; // For company specific
  companyName?: string;
  modelSpeed: 'fastest' | 'balanced' | 'deep';
}

export interface SkillGap {
  skill: string;
  status: 'Missing' | 'Weak' | 'Improvement Needed';
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface LearningStep {
  step: string;
  title: string; // New field for the step title
  description: string;
  resourceName: string;
  resourceSuggestion: string;
  estimatedTime: string;
}

export interface AlternativeRole {
  role: string;
  matchReason: string;
  matchPercentage: number;
}

export interface AnalysisResult {
  readinessScore: number; // 0-100
  readinessLevel: 'Not Ready' | 'Novice' | 'Partially Ready' | 'Well Qualified' | 'Job Ready';
  executiveSummary: string;
  skillGaps: SkillGap[];
  learningPath: LearningStep[];
  alternativeRoles: AlternativeRole[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  sources?: Array<{ title: string; uri: string }>;
  attachment?: {
    name: string;
    preview: string;
    type: 'image' | 'file';
  };
}

export interface UserFeedback {
  rating: number; // 1-5
  comment?: string;
  timestamp: number;
}

export interface AnalysisHistoryItem {
  id: string;
  userId: string;
  timestamp: number;
  jobRole: string;
  companyName?: string;
  candidateName?: string;
  experienceYears?: number;
  result: AnalysisResult;
  feedback?: UserFeedback;
  modelUsed?: string;
  cost?: number;
}

export interface CreditUsageLog {
  id: string;
  userId: string;
  timestamp: number;
  amount: number;
  action: string; // e.g., "Analysis: Software Engineer", "Chat"
  modelUsed?: string;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}