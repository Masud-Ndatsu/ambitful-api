import { analyticsRepository } from "../repositories/analytics.repository";
import { CustomError } from "../middleware/errorHandler";

export interface ExportOptions {
  type: "users" | "opportunities" | "analytics";
  format: "csv" | "xlsx";
  period?: "7d" | "30d" | "90d";
  startDate?: string;
  endDate?: string;
}

export class ExportService {
  constructor() {
    // No need to initialize repository - using singleton
  }

  async exportData(options: ExportOptions): Promise<{
    filename: string;
    data: string | Buffer;
    contentType: string;
  }> {
    try {
      const data = await this.getData(options);

      if (options.format === "csv") {
        return {
          filename: this.generateFilename(options, "csv"),
          data: this.convertToCSV(data),
          contentType: "text/csv",
        };
      } else {
        return {
          filename: this.generateFilename(options, "xlsx"),
          data: await this.convertToXLSX(data),
          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
      }
    } catch (error) {
      console.error("Export service error:", error);
      throw new CustomError("Failed to export data", 500);
    }
  }

  private async getData(options: ExportOptions): Promise<any[]> {
    switch (options.type) {
      case "users":
        return await analyticsRepository.getUsersExportData();

      case "opportunities":
        return await analyticsRepository.getOpportunitiesExportData();

      case "analytics":
        return await analyticsRepository.getAnalyticsExportData();

      default:
        throw new CustomError("Invalid export type", 400);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) {
      return "";
    }

    // Get headers from the first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");

    // Convert data rows
    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header];

          // Handle null/undefined values
          if (value === null || value === undefined) {
            return "";
          }

          // Handle arrays and objects
          if (Array.isArray(value)) {
            return `"${value.join("; ")}"`;
          }

          if (typeof value === "object") {
            return `"${JSON.stringify(value)}"`;
          }

          // Handle strings with commas or quotes
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        })
        .join(",");
    });

    return [csvHeaders, ...csvRows].join("\n");
  }

  private async convertToXLSX(data: any[]): Promise<Buffer> {
    // Mock implementation - in real app, use libraries like 'xlsx' or 'exceljs'
    // For now, return CSV-like data as buffer
    const csvData = this.convertToCSV(data);
    return Buffer.from(csvData, "utf-8");
  }

  private generateFilename(options: ExportOptions, extension: string): string {
    const timestamp = new Date().toISOString().split("T")[0];
    const period = options.period || "all";

    return `${options.type}_export_${period}_${timestamp}.${extension}`;
  }

  async getExportStats(): Promise<{
    totalExports: number;
    exportsByType: { [key: string]: number };
    recentExports: { type: string; format: string; date: string }[];
  }> {
    // Mock implementation - in real app, track export statistics
    return {
      totalExports: 150,
      exportsByType: {
        users: 75,
        opportunities: 50,
        analytics: 25,
      },
      recentExports: [
        { type: "users", format: "csv", date: new Date().toISOString() },
        {
          type: "opportunities",
          format: "xlsx",
          date: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          type: "analytics",
          format: "csv",
          date: new Date(Date.now() - 172800000).toISOString(),
        },
      ],
    };
  }

  validateExportRequest(options: ExportOptions): boolean {
    const validTypes = ["users", "opportunities", "analytics"];
    const validFormats = ["csv", "xlsx"];
    const validPeriods = ["7d", "30d", "90d"];

    if (!validTypes.includes(options.type)) {
      return false;
    }

    if (!validFormats.includes(options.format)) {
      return false;
    }

    if (options.period && !validPeriods.includes(options.period)) {
      return false;
    }

    // Validate date range if provided
    if (options.startDate && options.endDate) {
      const startDate = new Date(options.startDate);
      const endDate = new Date(options.endDate);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return false;
      }

      if (startDate >= endDate) {
        return false;
      }
    }

    return true;
  }

  async scheduleExport(
    options: ExportOptions,
    adminId: string
  ): Promise<{
    exportId: string;
    status: "queued" | "processing" | "completed" | "failed";
    message: string;
  }> {
    // Mock implementation for scheduled exports
    // In real app, queue export job and process asynchronously
    const exportId = `export_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    return {
      exportId,
      status: "queued",
      message:
        "Export has been queued for processing. You will receive an email when it's ready.",
    };
  }

  async getExportStatus(exportId: string): Promise<{
    exportId: string;
    status: "queued" | "processing" | "completed" | "failed";
    progress: number;
    downloadUrl?: string;
    error?: string;
  }> {
    // Mock implementation
    return {
      exportId,
      status: "completed",
      progress: 100,
      downloadUrl: `/api/admin/analytics/download/${exportId}`,
    };
  }

  private formatUserData(users: any[]): any[] {
    return users.map((user) => ({
      ID: user.id,
      Name: user.name,
      Email: user.email,
      Country: user.country,
      Status: user.status,
      Verified: user.verified ? "Yes" : "No",
      "Sign Up Date": new Date(user.createdAt).toLocaleDateString(),
      "Last Active": user.lastActive
        ? new Date(user.lastActive).toLocaleDateString()
        : "Never",
      Interests: Array.isArray(user.interests)
        ? user.interests.join(", ")
        : user.interests || "",
    }));
  }

  private formatOpportunityData(opportunities: any[]): any[] {
    return opportunities.map((opp) => ({
      ID: opp.id,
      Title: opp.title,
      Type: opp.type,
      Description: opp.description,
      Location: opp.location,
      Amount: opp.amount || "Not specified",
      Category: opp.category,
      Status: opp.status,
      "Created Date": new Date(opp.createdAt).toLocaleDateString(),
      "Deadline Date": new Date(opp.deadline).toLocaleDateString(),
      Views: opp.detail?.views || 0,
      Applications: opp.detail?.applications || 0,
      Saves: opp.detail?.saves || 0,
      "Application Count": opp._count?.applications || 0,
      "Save Count": opp._count?.savedOpportunities || 0,
      CTR:
        opp.detail?.views > 0
          ? `${((opp.detail.applications / opp.detail.views) * 100).toFixed(
              2
            )}%`
          : "0%",
    }));
  }
}

export const exportService = new ExportService();
