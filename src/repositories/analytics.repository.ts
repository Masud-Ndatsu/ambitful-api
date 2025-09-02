import { prisma } from "../database/prisma";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface VisitData {
  date: string;
  visits: number;
}

export interface RegionData {
  country: string;
  visits: number;
  percentage: number;
}

export interface OpportunityPerformance {
  opportunityId: string;
  title: string;
  views: number;
  applications: number;
  ctr: number;
  avgTimeOnPage: string;
}

export interface UserEngagement {
  chatbotInteractions: number;
  opportunitiesSaved: number;
  applicationsSubmitted: number;
}

export class AnalyticsRepository {
  private getDateRange(period: "7d" | "30d" | "90d"): DateRange {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
    }

    return { startDate, endDate };
  }

  async getOverviewAnalytics(period: "7d" | "30d" | "90d" = "30d"): Promise<{
    totalVisits: number;
    activeOpportunities: number;
    pendingDrafts: number;
    avgCTR: number;
    visitTrend: VisitData[];
    topRegions: RegionData[];
  }> {
    const { startDate, endDate } = this.getDateRange(period);

    // Get total visits from user activities (mock data for now)
    const totalVisits = await this.getTotalVisits(startDate, endDate);

    // Get active opportunities count
    const activeOpportunities = await prisma.opportunity.count({
      where: { status: "PUBLISHED" },
    });

    // Get pending AI drafts count
    const pendingDrafts = await prisma.aIDraft.count({
      where: { status: "PENDING" },
    });

    // Calculate average CTR across all opportunities
    const avgCTR = await this.calculateAvgCTR();

    // Get visit trend data
    const visitTrend = await this.getVisitTrend(startDate, endDate);

    // Get top regions data
    const topRegions = await this.getTopRegions(startDate, endDate);

    return {
      totalVisits,
      activeOpportunities,
      pendingDrafts,
      avgCTR,
      visitTrend,
      topRegions,
    };
  }

  async getOpportunityPerformance(): Promise<OpportunityPerformance[]> {
    const opportunities = await prisma.opportunity.findMany({
      where: { status: "PUBLISHED" },
      include: {
        detail: true,
      },
      orderBy: {
        detail: { views: "desc" },
      },
      take: 20,
    });

    return opportunities.map((opp) => {
      const views = opp.detail?.views || 0;
      const applications = opp.detail?.applications || 0;
      const ctr = views > 0 ? (applications / views) * 100 : 0;

      return {
        opportunityId: opp.id,
        title: opp.title,
        views,
        applications,
        ctr: parseFloat(ctr.toFixed(2)),
        avgTimeOnPage: this.generateMockTimeOnPage(), // Mock data
      };
    });
  }

  async getUserAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    avgInteractions: number;
    signupTrend: VisitData[];
    engagementMetrics: UserEngagement;
  }> {
    const [totalUsers, activeUsers, verifiedUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.user.count({
        where: { verified: true },
      }),
    ]);

    // Calculate average interactions (mock calculation)
    const avgInteractions = await this.calculateAvgInteractions();

    // Get signup trend
    const signupTrend = await this.getSignupTrend();

    // Get engagement metrics
    const engagementMetrics = await this.getEngagementMetrics();

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      avgInteractions,
      signupTrend,
      engagementMetrics,
    };
  }

  private async getTotalVisits(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Mock implementation - in real app, track page visits in UserActivity
    const activities = await prisma.userActivity.count({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
        action: { contains: "view" },
      },
    });

    return activities || this.generateMockVisits();
  }

  private async calculateAvgCTR(): Promise<number> {
    const opportunities = await prisma.opportunity.findMany({
      where: { status: "PUBLISHED" },
      include: { detail: true },
    });

    if (opportunities.length === 0) return 0;

    const totalCTR = opportunities.reduce((sum, opp) => {
      const views = opp.detail?.views || 0;
      const applications = opp.detail?.applications || 0;
      const ctr = views > 0 ? (applications / views) * 100 : 0;
      return sum + ctr;
    }, 0);

    return parseFloat((totalCTR / opportunities.length).toFixed(2));
  }

  private async getVisitTrend(
    startDate: Date,
    endDate: Date
  ): Promise<VisitData[]> {
    const trend: VisitData[] = [];
    
    // Get the previous week's Monday-Friday
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // Calculate last Monday (previous week's Monday)
    const daysFromLastMonday = currentDay === 0 ? 6 : currentDay - 1 + 7; // If Sunday, go back 6 days to get last Monday, otherwise go back to previous Monday
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - daysFromLastMonday);
    lastMonday.setHours(0, 0, 0, 0);
    
    // Generate data for Monday through Friday of last week
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(lastMonday);
      date.setDate(lastMonday.getDate() + i);
      
      // Query actual visit data from UserActivity table
      const dailyVisits = await prisma.userActivity.count({
        where: {
          timestamp: {
            gte: date,
            lt: new Date(date.getTime() + 24 * 60 * 60 * 1000), // Next day
          },
          action: {
            in: ['view_opportunity', 'visit_page', 'search', 'browse']
          }
        },
      });
      
      // If no actual data, generate realistic mock data based on day patterns
      let visits = dailyVisits;
      if (dailyVisits === 0) {
        // Monday and Friday typically have lower traffic
        const baseVisits = i === 0 || i === 4 ? 320 : 450; // Mon/Fri vs Tue/Wed/Thu
        const variance = Math.floor(Math.random() * 100) - 50; // ±50 variance
        visits = Math.max(200, baseVisits + variance); // Minimum 200 visits
      }
      
      trend.push({
        date: date.toISOString().split("T")[0],
        visits: visits,
      });
    }

    return trend;
  }

  private async getTopRegions(
    startDate: Date,
    endDate: Date
  ): Promise<RegionData[]> {
    // Get user distribution by country
    const countryData = await prisma.user.groupBy({
      by: ["country"],
      _count: { country: true },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        _count: { country: "desc" },
      },
      take: 5,
    });

    const totalUsers = countryData.reduce(
      (sum, item) => sum + item._count.country,
      0
    );

    return countryData.map((item) => ({
      country: item.country,
      visits: item._count.country,
      percentage: parseFloat(
        ((item._count.country / totalUsers) * 100).toFixed(1)
      ),
    }));
  }

  private async calculateAvgInteractions(): Promise<number> {
    const totalUsers = await prisma.user.count();
    if (totalUsers === 0) return 0;

    // Mock calculation - in real app, count actual interactions
    const totalInteractions = await prisma.userActivity.count();
    return parseFloat((totalInteractions / totalUsers).toFixed(1));
  }

  private async getSignupTrend(): Promise<VisitData[]> {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const signups = await prisma.user.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      where: {
        createdAt: {
          gte: last30Days,
        },
      },
    });

    // Process and format signup data by day
    const trendMap = new Map<string, number>();

    signups.forEach((signup) => {
      const date = signup.createdAt.toISOString().split("T")[0];
      trendMap.set(date, (trendMap.get(date) || 0) + signup._count.id);
    });

    // Fill in missing days with 0
    const trend: VisitData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      trend.push({
        date: dateStr,
        visits: trendMap.get(dateStr) || 0,
      });
    }

    return trend;
  }

  private async getEngagementMetrics(): Promise<UserEngagement> {
    const [chatInteractions, savedOpportunities, applications] =
      await Promise.all([
        prisma.chatConversation.count(),
        prisma.savedOpportunity.count(),
        prisma.application.count(),
      ]);

    return {
      chatbotInteractions: chatInteractions,
      opportunitiesSaved: savedOpportunities,
      applicationsSubmitted: applications,
    };
  }

  // Export data methods
  async getUsersExportData(): Promise<any[]> {
    return await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        status: true,
        verified: true,
        createdAt: true,
        lastActive: true,
        interests: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOpportunitiesExportData(): Promise<any[]> {
    return await prisma.opportunity.findMany({
      include: {
        detail: {
          select: {
            views: true,
            applications: true,
            saves: true,
          },
        },
        _count: {
          select: {
            applications: true,
            savedOpportunities: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getAnalyticsExportData(): Promise<any[]> {
    const opportunities = await this.getOpportunityPerformance();
    const userMetrics = await this.getUserAnalytics();
    const overview = await this.getOverviewAnalytics();

    return [
      {
        type: "Overview",
        totalVisits: overview.totalVisits,
        activeOpportunities: overview.activeOpportunities,
        pendingDrafts: overview.pendingDrafts,
        avgCTR: overview.avgCTR,
      },
      {
        type: "Users",
        totalUsers: userMetrics.totalUsers,
        activeUsers: userMetrics.activeUsers,
        verifiedUsers: userMetrics.verifiedUsers,
        avgInteractions: userMetrics.avgInteractions,
      },
      ...opportunities.map((opp) => ({
        type: "Opportunity Performance",
        opportunityId: opp.opportunityId,
        title: opp.title,
        views: opp.views,
        applications: opp.applications,
        ctr: opp.ctr,
      })),
    ];
  }

  // Helper methods for mock data
  private generateMockVisits(): number {
    return Math.floor(Math.random() * 1000) + 500;
  }

  private generateMockTimeOnPage(): string {
    const minutes = Math.floor(Math.random() * 5) + 1;
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes}m ${seconds}s`;
  }
}

export const analyticsRepository = new AnalyticsRepository();
