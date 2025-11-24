export enum UserRole {
  NEW = 'NEW',
  RETURNING = 'RETURNING'
}

export interface UserProfile {
  id: string;
  username: string;
  securityKey: string; // For password recovery
  subscriptionStatus: 'free' | 'monthly' | 'yearly';
  onboardingComplete: boolean;
  // Support for multiple careers, each with its own timeline
  activeCareers: {
    careerId: string;
    title: string;
    addedAt: number;
    educationYear: string;
    targetCompletionDate: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
    focusAreas?: string; // specific topics for upskilling
    lastAdaptationCheck?: number; // timestamp of last AI check
  }[];
  currentCareerId?: string;
}

export interface CareerOption {
  id: string;
  title: string;
  description: string;
  fitScore: number; // 0-100
  reason: string;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  type: 'skill' | 'project' | 'internship' | 'certificate';
  duration: string; // e.g., "2 weeks"
  status: 'pending' | 'in-progress' | 'completed';
  completedAt?: number; // Timestamp for velocity tracking
  link?: string; // For internships/certs
  importance: 'high' | 'medium' | 'low';
  isAIAdaptation?: boolean; // To badge newly added items
}

export interface RoadmapPhase {
  phaseName: string;
  items: RoadmapItem[];
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string;
}