// tools/careerAdvisorTools.ts
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma } from "../database/prisma";

export const findOpportunitiesTool = new DynamicStructuredTool({
  name: "findOpportunities",
  description:
    "Search for job opportunities based on user preferences and skills",
  schema: z.object({
    userId: z.string().describe("User ID to get personalized recommendations"),
    category: z.string().optional().describe("Job category filter"),
    location: z.string().optional().describe("Location filter"),
    keywords: z.array(z.string()).optional().describe("Keywords to search for"),
  }),
  func: async ({ userId, category, location, keywords }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { interests: true },
      });

      if (!user) return "User profile not found.";

      const whereClause: any = { status: "active" };

      if (category) {
        whereClause.category = { contains: category, mode: "insensitive" };
      }
      if (location) {
        whereClause.location = { contains: location, mode: "insensitive" };
      }
      if (keywords?.length) {
        whereClause.OR = keywords.map((kw) => ({
          OR: [
            { title: { contains: kw, mode: "insensitive" } },
            { description: { contains: kw, mode: "insensitive" } },
          ],
        }));
      }

      if (user.interests.length > 0) {
        if (!whereClause.OR) whereClause.OR = [];
        whereClause.OR.push(
          ...user.interests.map((interest) => ({
            OR: [
              { category: { contains: interest, mode: "insensitive" } },
              { title: { contains: interest, mode: "insensitive" } },
            ],
          }))
        );
      }

      const opportunities = await prisma.opportunity.findMany({
        where: whereClause,
        include: {
          detail: true,
          applications: { where: { userId } },
          savedOpportunities: { where: { userId } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (opportunities.length === 0) {
        return "No matching opportunities found. Try adjusting your filters or updating your interests.";
      }

      const formatted = opportunities.map((opp) => ({
        id: opp.id,
        title: opp.title,
        type: opp.type,
        category: opp.category,
        location: opp.location,
        amount: opp.amount,
        deadline: opp.deadline,
        description: opp.description.substring(0, 200) + "...",
        isApplied: opp.applications.length > 0,
        isSaved: opp.savedOpportunities.length > 0,
        applicationCount: opp.detail?.applications || 0,
      }));

      return JSON.stringify({
        count: formatted.length,
        opportunities: formatted,
        searchCriteria: { category, location, keywords },
      });
    } catch (error) {
      console.error("Error in findOpportunities tool:", error);
      return "An error occurred while searching for opportunities. Please try again later.";
    }
  },
});

export const getUserProfileTool = new DynamicStructuredTool({
  name: "getUserProfile",
  description: "Get user profile including skills, interests, and history",
  schema: z.object({
    userId: z.string().describe("User ID to retrieve profile for"),
  }),
  func: async ({ userId }) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          applications: {
            include: { opportunity: true },
            orderBy: { submittedAt: "desc" },
            take: 5,
          },
          savedOpportunities: {
            include: { opportunity: true },
            orderBy: { savedAt: "desc" },
            take: 5,
          },
        },
      });

      if (!user) return "User not found.";

      return JSON.stringify({
        name: user.name,
        email: user.email,
        country: user.country,
        interests: user.interests,
        signupDate: user.signupDate,
        lastActive: user.lastActive,
        totalApplications: user.applications.length,
        recentApplications: user.applications.map((a) => ({
          opportunityTitle: a.opportunity.title,
          status: a.status,
          submittedAt: a.submittedAt,
          opportunityType: a.opportunity.type,
        })),
        savedOpportunities: user.savedOpportunities.map((s) => ({
          opportunityTitle: s.opportunity.title,
          savedAt: s.savedAt,
          opportunityType: s.opportunity.type,
        })),
      });
    } catch (error) {
      console.error("Error in getUserProfile tool:", error);
      return "An error occurred while retrieving user profile.";
    }
  },
});

export const analyzeApplicationHistoryTool = new DynamicStructuredTool({
  name: "analyzeApplicationHistory",
  description:
    "Analyze user's application history to provide insights and recommendations",
  schema: z.object({
    userId: z.string().describe("User ID to analyze application history for"),
  }),
  func: async ({ userId }) => {
    try {
      const applications = await prisma.application.findMany({
        where: { userId },
        include: { opportunity: true },
        orderBy: { submittedAt: "desc" },
      });

      if (applications.length === 0) {
        return "You haven't applied to any opportunities yet. Consider exploring roles that match your interests.";
      }

      const applicationsByStatus = applications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const applicationsByType = applications.reduce((acc, app) => {
        acc[app.opportunity.type] = (acc[app.opportunity.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const applicationsByCategory = applications.reduce((acc, app) => {
        acc[app.opportunity.category] =
          (acc[app.opportunity.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const firstAppDate = new Date(
        applications[applications.length - 1].submittedAt
      );
      const lastAppDate = new Date(applications[0].submittedAt);
      const timeDiffInMonths =
        (lastAppDate.getTime() - firstAppDate.getTime()) /
        (1000 * 60 * 60 * 24 * 30);
      const avgPerMonth =
        timeDiffInMonths > 0
          ? parseFloat((applications.length / timeDiffInMonths).toFixed(2))
          : applications.length;

      return JSON.stringify({
        totalApplications: applications.length,
        applicationsByStatus,
        applicationsByType,
        applicationsByCategory,
        recentApplications: applications.slice(0, 5).map((app) => ({
          title: app.opportunity.title,
          status: app.status,
          submittedAt: app.submittedAt,
          type: app.opportunity.type,
        })),
        averageApplicationsPerMonth: avgPerMonth,
      });
    } catch (error) {
      console.error("Error in analyzeApplicationHistory tool:", error);
      return "An error occurred while analyzing your application history.";
    }
  },
});

// ✅ Export all tools as an array
export const careerAdvisorTools = [
  findOpportunitiesTool,
  getUserProfileTool,
  analyzeApplicationHistoryTool,
];
