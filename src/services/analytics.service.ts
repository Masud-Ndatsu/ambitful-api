import { analyticsRepository, VisitData, RegionData, OpportunityPerformance, UserEngagement } from '../repositories/analytics.repository';
import { ExportService, ExportOptions } from './export.service';
import { CustomError } from '../middleware/errorHandler';

export interface OverviewAnalytics {
  totalVisits: number;
  activeOpportunities: number;
  pendingDrafts: number;
  avgCTR: number;
  visitTrend: VisitData[];
  topRegions: RegionData[];
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  avgInteractions: number;
  signupTrend: VisitData[];
  engagementMetrics: UserEngagement;
}

export class AnalyticsService {
  private exportService: ExportService;

  constructor() {
    this.exportService = new ExportService();
  }

  async getOverviewAnalytics(period: '7d' | '30d' | '90d' = '30d'): Promise<OverviewAnalytics> {
    try {
      return await analyticsRepository.getOverviewAnalytics(period);
    } catch (error) {
      console.error('Error getting overview analytics:', error);
      throw new CustomError('Failed to retrieve overview analytics', 500);
    }
  }

  async getOpportunityPerformance(): Promise<{
    performance: OpportunityPerformance[];
  }> {
    try {
      const performance = await analyticsRepository.getOpportunityPerformance();
      return { performance };
    } catch (error) {
      console.error('Error getting opportunity performance:', error);
      throw new CustomError('Failed to retrieve opportunity performance data', 500);
    }
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    try {
      return await analyticsRepository.getUserAnalytics();
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw new CustomError('Failed to retrieve user analytics', 500);
    }
  }

  async exportAnalyticsData(options: ExportOptions): Promise<{
    filename: string;
    data: string | Buffer;
    contentType: string;
  }> {
    try {
      // Validate export request
      if (!this.exportService.validateExportRequest(options)) {
        throw new CustomError('Invalid export request parameters', 400);
      }

      return await this.exportService.exportData(options);
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to export analytics data', 500);
    }
  }

  async getDashboardSummary(): Promise<{
    overview: OverviewAnalytics;
    topPerformingOpportunities: OpportunityPerformance[];
    userGrowth: {
      totalUsers: number;
      newUsersThisWeek: number;
      growthRate: number;
    };
    systemHealth: {
      uptime: string;
      responseTime: string;
      errorRate: number;
    };
  }> {
    try {
      const [overview, performance, userAnalytics] = await Promise.all([
        this.getOverviewAnalytics('30d'),
        analyticsRepository.getOpportunityPerformance(),
        this.getUserAnalytics()
      ]);

      // Get top 5 performing opportunities
      const topPerformingOpportunities = performance.slice(0, 5);

      // Calculate user growth metrics
      const userGrowth = await this.calculateUserGrowth(userAnalytics);

      // Get system health metrics (mock data)
      const systemHealth = {
        uptime: '99.9%',
        responseTime: '250ms',
        errorRate: 0.02
      };

      return {
        overview,
        topPerformingOpportunities,
        userGrowth,
        systemHealth
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw new CustomError('Failed to retrieve dashboard summary', 500);
    }
  }

  async getDetailedMetrics(period: '7d' | '30d' | '90d' = '30d'): Promise<{
    overview: OverviewAnalytics;
    opportunities: {
      totalOpportunities: number;
      publishedOpportunities: number;
      draftOpportunities: number;
      archivedOpportunities: number;
      avgViewsPerOpportunity: number;
      avgApplicationsPerOpportunity: number;
      topCategories: { category: string; count: number; }[];
    };
    users: UserAnalytics & {
      usersByCountry: RegionData[];
      activeUsersTrend: VisitData[];
    };
    engagement: {
      totalPageViews: number;
      avgSessionDuration: string;
      bounceRate: number;
      conversionRate: number;
      topPages: { page: string; views: number; }[];
    };
  }> {
    try {
      const [overview, userAnalytics, opportunityMetrics] = await Promise.all([
        this.getOverviewAnalytics(period),
        this.getUserAnalytics(),
        this.getOpportunityMetrics()
      ]);

      const engagement = await this.getEngagementMetrics(period);

      return {
        overview,
        opportunities: opportunityMetrics,
        users: {
          ...userAnalytics,
          usersByCountry: overview.topRegions,
          activeUsersTrend: await this.getActiveUsersTrend(period)
        },
        engagement
      };
    } catch (error) {
      console.error('Error getting detailed metrics:', error);
      throw new CustomError('Failed to retrieve detailed metrics', 500);
    }
  }

  private async calculateUserGrowth(userAnalytics: UserAnalytics): Promise<{
    totalUsers: number;
    newUsersThisWeek: number;
    growthRate: number;
  }> {
    // Calculate growth rate from signup trend (last 7 days vs previous 7 days)
    const recentSignups = userAnalytics.signupTrend.slice(-7);
    const previousSignups = userAnalytics.signupTrend.slice(-14, -7);

    const newUsersThisWeek = recentSignups.reduce((sum, day) => sum + day.visits, 0);
    const newUsersPreviousWeek = previousSignups.reduce((sum, day) => sum + day.visits, 0);

    const growthRate = newUsersPreviousWeek > 0 
      ? ((newUsersThisWeek - newUsersPreviousWeek) / newUsersPreviousWeek) * 100
      : 0;

    return {
      totalUsers: userAnalytics.totalUsers,
      newUsersThisWeek,
      growthRate: parseFloat(growthRate.toFixed(1))
    };
  }

  private async getOpportunityMetrics(): Promise<{
    totalOpportunities: number;
    publishedOpportunities: number;
    draftOpportunities: number;
    archivedOpportunities: number;
    avgViewsPerOpportunity: number;
    avgApplicationsPerOpportunity: number;
    topCategories: { category: string; count: number; }[];
  }> {
    const performance = await analyticsRepository.getOpportunityPerformance();
    
    // Mock data for opportunity counts by status
    const totalOpportunities = performance.length;
    const publishedOpportunities = Math.floor(totalOpportunities * 0.8);
    const draftOpportunities = Math.floor(totalOpportunities * 0.15);
    const archivedOpportunities = totalOpportunities - publishedOpportunities - draftOpportunities;

    // Calculate averages
    const avgViewsPerOpportunity = performance.length > 0 
      ? Math.round(performance.reduce((sum, opp) => sum + opp.views, 0) / performance.length)
      : 0;

    const avgApplicationsPerOpportunity = performance.length > 0
      ? Math.round(performance.reduce((sum, opp) => sum + opp.applications, 0) / performance.length)
      : 0;

    // Mock top categories
    const topCategories = [
      { category: 'Technology', count: 45 },
      { category: 'Education', count: 38 },
      { category: 'Healthcare', count: 32 },
      { category: 'Business', count: 28 },
      { category: 'Arts', count: 22 }
    ];

    return {
      totalOpportunities,
      publishedOpportunities,
      draftOpportunities,
      archivedOpportunities,
      avgViewsPerOpportunity,
      avgApplicationsPerOpportunity,
      topCategories
    };
  }

  private async getEngagementMetrics(period: '7d' | '30d' | '90d'): Promise<{
    totalPageViews: number;
    avgSessionDuration: string;
    bounceRate: number;
    conversionRate: number;
    topPages: { page: string; views: number; }[];
  }> {
    // Mock engagement data - in real app, track these metrics
    const multiplier = period === '7d' ? 0.25 : period === '30d' ? 1 : 3;
    
    return {
      totalPageViews: Math.floor(15000 * multiplier),
      avgSessionDuration: '4m 32s',
      bounceRate: 0.35,
      conversionRate: 0.125,
      topPages: [
        { page: '/opportunities', views: Math.floor(3500 * multiplier) },
        { page: '/opportunities/search', views: Math.floor(2800 * multiplier) },
        { page: '/dashboard', views: Math.floor(2200 * multiplier) },
        { page: '/chat', views: Math.floor(1900 * multiplier) },
        { page: '/profile', views: Math.floor(1500 * multiplier) }
      ]
    };
  }

  private async getActiveUsersTrend(period: '7d' | '30d' | '90d'): Promise<VisitData[]> {
    // Mock active users trend - in real app, query actual user activity
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const trend: VisitData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      trend.push({
        date: date.toISOString().split('T')[0],
        visits: Math.floor(Math.random() * 200) + 100
      });
    }

    return trend;
  }

  async getRealtimeMetrics(): Promise<{
    activeUsers: number;
    pageViews: number;
    newSignups: number;
    opportunityViews: number;
    chatInteractions: number;
    lastUpdated: string;
  }> {
    // Mock real-time data - in real app, use WebSocket or real-time analytics
    return {
      activeUsers: Math.floor(Math.random() * 500) + 200,
      pageViews: Math.floor(Math.random() * 100) + 50,
      newSignups: Math.floor(Math.random() * 10) + 2,
      opportunityViews: Math.floor(Math.random() * 80) + 30,
      chatInteractions: Math.floor(Math.random() * 25) + 10,
      lastUpdated: new Date().toISOString()
    };
  }

  async generateAnalyticsReport(
    period: '7d' | '30d' | '90d',
    includeCharts: boolean = false
  ): Promise<{
    reportId: string;
    summary: string;
    metrics: any;
    insights: string[];
    recommendations: string[];
  }> {
    try {
      const metrics = await this.getDetailedMetrics(period);
      const reportId = `report_${Date.now()}`;

      // Generate insights based on data
      const insights = this.generateInsights(metrics);
      const recommendations = this.generateRecommendations(metrics);

      const summary = this.generateSummary(metrics, period);

      return {
        reportId,
        summary,
        metrics,
        insights,
        recommendations
      };
    } catch (error) {
      console.error('Error generating analytics report:', error);
      throw new CustomError('Failed to generate analytics report', 500);
    }
  }

  private generateInsights(metrics: any): string[] {
    const insights: string[] = [];

    if (metrics.overview.avgCTR > 5) {
      insights.push('Above-average click-through rate indicates strong user engagement');
    }

    if (metrics.users.activeUsers / metrics.users.totalUsers > 0.3) {
      insights.push('High user retention rate suggests strong product-market fit');
    }

    if (metrics.engagement.bounceRate < 0.4) {
      insights.push('Low bounce rate indicates users find the content relevant and engaging');
    }

    return insights;
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.overview.avgCTR < 3) {
      recommendations.push('Consider improving opportunity titles and descriptions to increase click-through rates');
    }

    if (metrics.users.verifiedUsers / metrics.users.totalUsers < 0.5) {
      recommendations.push('Implement email verification incentives to increase verified user percentage');
    }

    if (metrics.engagement.conversionRate < 0.1) {
      recommendations.push('Optimize the application process to improve conversion rates');
    }

    return recommendations;
  }

  private generateSummary(metrics: any, period: string): string {
    return `Analytics report for the last ${period}. Total visits: ${metrics.overview.totalVisits}, Active opportunities: ${metrics.overview.activeOpportunities}, Total users: ${metrics.users.totalUsers}. Overall performance shows ${metrics.overview.avgCTR}% average CTR with ${metrics.users.activeUsers} active users.`;
  }
}

export const analyticsService = new AnalyticsService();