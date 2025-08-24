export enum OPPORTUNITY_EVENTS {
  IMPROVE_OPPORTUNITY_DATA = "IMPROVE_OPPORTUNITY_DATA",
}

export enum CRAWLER_EVENTS {
  CONTENT_CRAWLED = "CONTENT_CRAWLED",
  CONTENT_PARSED = "CONTENT_PARSED",
  PARSING_FAILED = "PARSING_FAILED",
  OPPORTUNITIES_EXTRACTED = "OPPORTUNITIES_EXTRACTED",
}

// Default opportunity types and categories for filters
export const DEFAULT_TYPES = [
  "fulltime",
  "parttime",
  "freelance",
  "contract",
  "remote",
  "internship",
  "entrepreneurship",
  "volunteer",
  "scholarship",
  "fellowship",
  "grant",
];

export const DEFAULT_CATEGORIES = [
  "Technology",
  "Healthcare",
  "Business",
  "Education",
  "Research",
  "Arts",
  "Social",
  "General",
];
