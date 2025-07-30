export interface User {
  id: string;
  name: string;
  email: string;
  country: string;
  status: "active" | "inactive" | "suspended";
  verified: boolean;
  signupDate: string;
  lastActive: string;
  interests: string[];
  profilePicture?: string;
  role: "user" | "admin";
}

export interface Opportunity {
  id: string;
  title: string;
  type: "scholarship" | "internship" | "fellowship" | "grant";
  description: string;
  deadline: string;
  location: string;
  amount?: string;
  link: string;
  category: string;
  status: "published" | "draft" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityDetail extends Opportunity {
  fullDescription: string;
  applicationInstructions: string;
  eligibility: string[];
  benefits: string[];
  views: number;
  applications: number;
  saves: number;
}

export interface AIDraft {
  id: string;
  title: string;
  source: string;
  status: "pending" | "approved" | "rejected";
  priority: "high" | "medium" | "low";
  extractedData: Partial<Opportunity>;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "bot";
  timestamp: string;
  metadata?: any;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

export interface Application {
  id: string;
  userId: string;
  opportunityId: string;
  status: "pending" | "submitted" | "reviewed" | "accepted" | "rejected";
  applicationData?: any;
  submittedAt: string;
  opportunity?: Opportunity;
}

export interface AdminOpportunity extends OpportunityDetail {
  applicationCount?: number;
  viewCount?: number;
  saveCount?: number;
}

export interface OpportunityStats {
  published: number;
  draft: number;
  archived: number;
}

export interface OpportunityAnalytics {
  views: number;
  applications: number;
  saves: number;
  ctr: number;
  avgTimeOnPage: string;
  viewsHistory: { date: string; views: number }[];
}

export interface Testimonial {
  id: string;
  name: string;
  age: number;
  location: string;
  opportunity: string;
  testimonial: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}
