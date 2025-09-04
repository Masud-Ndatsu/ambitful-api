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
  bio?: string;
  skills: string[];
  profilePicture?: string;
  
  // Enhanced profile for AI personalization
  academicLevel?: string;
  fieldOfStudy?: string;
  careerStage?: string;
  goals: string[];
  preferences?: any;
  personalityTraits: string[];
  learningStyle?: string;
  aiInteractionPrefs?: any;
  timeZone?: string;
  languages: string[];
  workExperience?: string;
  currentFocus: string[];
  
  role: "user" | "admin";
  linkedinId?: string;
  linkedinProfile?: LinkedInProfile;
  linkedinAccessToken?: string;
  linkedinTokenExpiresAt?: string;
}

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  summary?: string;
  industry?: string;
  location?: string;
  pictureUrl?: string;
  publicProfileUrl?: string;
  positions?: LinkedInPosition[];
  educations?: LinkedInEducation[];
  skills?: string[];
  connectedAt: string;
  lastSyncAt: string;
}

export interface LinkedInPosition {
  id: string;
  title: string;
  company: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  location?: string;
}

export interface LinkedInEducation {
  id: string;
  schoolName: string;
  degree?: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
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
  applicationInstructions: string[];
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

  // Raw scraped content
  rawContent: string;
  dateScraped: Date;

  // Extracted opportunity fields (individual columns)
  extractedTitle?: string | null;
  extractedType?: "scholarship" | "internship" | "fellowship" | "grant" | null;
  extractedDescription?: string | null;
  extractedDeadline?: Date | null;
  extractedLocation?: string | null;
  extractedAmount?: string | null;
  extractedLink?: string | null;
  extractedCategory?: string | null;

  // Extracted detail fields
  extractedFullDescription?: string | null;
  extractedApplicationInstructions?: string[];
  extractedEligibility?: string[];
  extractedBenefits?: string[];

  // Additional extracted data (JSON)
  extractedData?: any;

  // Review fields
  feedback?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  opportunityId?: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  messages?: ChatMessage[];
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

export interface ParsedOpportunity {
  title: string;
  description: string;
  type: "SCHOLARSHIP" | "INTERNSHIP" | "FELLOWSHIP" | "GRANT";
  deadline: string;
  link: string;
  location: string;
  amount: string | null;
  category: string;
}
