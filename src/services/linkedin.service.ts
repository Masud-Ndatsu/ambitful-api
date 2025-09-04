import axios from "axios";
import { LinkedInProfile, LinkedInPosition, LinkedInEducation } from "../types";
import { CustomError } from "../middleware/errorHandler";
import { userRepository } from "../repositories/user.repository";

export interface LinkedInOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
}

export interface LinkedInUserProfile {
  id: string;
  firstName: {
    localized: {
      [key: string]: string;
    };
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  lastName: {
    localized: {
      [key: string]: string;
    };
    preferredLocale: {
      country: string;
      language: string;
    };
  };
  profilePicture?: {
    "displayImage~": {
      elements: Array<{
        identifiers: Array<{
          identifier: string;
        }>;
      }>;
    };
  };
  headline?: {
    localized: {
      [key: string]: string;
    };
  };
}

export class LinkedInService {
  private config: LinkedInOAuthConfig;

  constructor() {
    this.config = {
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      redirectUri: process.env.LINKEDIN_REDIRECT_URI!,
    };

    if (
      !this.config.clientId ||
      !this.config.clientSecret ||
      !this.config.redirectUri
    ) {
      throw new Error("LinkedIn OAuth configuration is missing");
    }
  }

  generateAuthUrl(state?: string): string {
    const scope = "openid profile email";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope,
      ...(state && { state }),
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<LinkedInTokenResponse> {
    try {
      const response = await axios.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        {
          grant_type: "authorization_code",
          code,
          redirect_uri: this.config.redirectUri,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(
        "LinkedIn token exchange error:",
        error.response?.data || error.message
      );
      throw new CustomError(
        "Failed to exchange LinkedIn authorization code",
        400
      );
    }
  }

  async getLinkedInProfile(accessToken: string): Promise<any> {
    try {
      // Use both OpenID Connect userinfo and LinkedIn API for richer data
      const [userinfo] = await Promise.all([
        axios.get("https://api.linkedin.com/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      // Combine data from both sources
      return {
        ...userinfo.data,
      };
    } catch (error: any) {
      console.error(
        "LinkedIn profile fetch error:",
        error.response?.data || error.message
      );
      throw new CustomError("Failed to fetch LinkedIn profile", 400);
    }
  }

  async getLinkedInPositions(
    accessToken: string,
    linkedinId: string
  ): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://api.linkedin.com/v2/people/(id:${linkedinId})/positions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      return response.data.elements || [];
    } catch (error: any) {
      console.error(
        "LinkedIn positions fetch error:",
        error.response?.data || error.message
      );
      // Non-critical, return empty array
      return [];
    }
  }

  async getLinkedInEducation(
    accessToken: string,
    linkedinId: string
  ): Promise<any[]> {
    try {
      const response = await axios.get(
        `https://api.linkedin.com/v2/people/(id:${linkedinId})/educations`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
          },
        }
      );

      return response.data.elements || [];
    } catch (error: any) {
      console.error(
        "LinkedIn education fetch error:",
        error.response?.data || error.message
      );
      // Non-critical, return empty array
      return [];
    }
  }

  private parseLinkedInProfile(
    profile: any,
    positions: any[] = [],
    educations: any[] = []
  ): LinkedInProfile {
    // OpenID Connect userinfo response format
    const firstName = profile.given_name || "";
    const lastName = profile.family_name || "";
    const headline = ""; // Not available in userinfo
    const pictureUrl = profile.picture || undefined;

    const parsedPositions: LinkedInPosition[] = positions.map((pos, index) => ({
      id: pos.id || `pos-${index}`,
      title: pos.title || "",
      company: pos.companyName || "",
      description: pos.description || "",
      startDate: pos.startDate
        ? `${pos.startDate.year}-${pos.startDate.month}`
        : "",
      endDate: pos.endDate ? `${pos.endDate.year}-${pos.endDate.month}` : "",
      isCurrent: !pos.endDate,
      location: pos.locationName || "",
    }));

    const parsedEducations: LinkedInEducation[] = educations.map(
      (edu, index) => ({
        id: edu.id || `edu-${index}`,
        schoolName: edu.schoolName || "",
        degree: edu.degreeName || "",
        fieldOfStudy: edu.fieldOfStudy || "",
        startDate: edu.startDate ? `${edu.startDate.year}` : "",
        endDate: edu.endDate ? `${edu.endDate.year}` : "",
        description: edu.description || "",
      })
    );

    return {
      id: profile.sub, // OpenID Connect uses 'sub' for user ID
      firstName,
      lastName,
      headline,
      summary: "",
      industry: "",
      location: "",
      pictureUrl,
      publicProfileUrl: profile.profile || "",
      positions: parsedPositions,
      educations: parsedEducations,
      skills: [],
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
    };
  }

  async connectLinkedInProfile(
    userId: string,
    code: string
  ): Promise<LinkedInProfile> {
    try {
      // Exchange code for access token
      const tokenResponse = await this.exchangeCodeForToken(code);

      console.log({ tokenResponse });
      // Get LinkedIn profile data using stored access token
      const profile = await this.getLinkedInProfile(tokenResponse.access_token);

      // Get positions and education data using the access token
      const positions = await this.getLinkedInPositions(
        tokenResponse.access_token,
        profile.sub || profile.id
      );
      const educations = await this.getLinkedInEducation(
        tokenResponse.access_token,
        profile.sub || profile.id
      );

      // Parse and format the comprehensive data
      const linkedinProfile = this.parseLinkedInProfile(
        profile,
        positions,
        educations
      );

      // Calculate token expiration time
      const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

      // Update user record with LinkedIn data and access token
      await userRepository.updateUser(userId, {
        linkedinId: profile.sub || profile.id,
        linkedinProfile: linkedinProfile as any,
        linkedinAccessToken: tokenResponse.access_token,
        linkedinTokenExpiresAt: expiresAt,
        profilePicture: linkedinProfile.pictureUrl || undefined,
      });

      return linkedinProfile;
    } catch (error: any) {
      console.error("LinkedIn connection error:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to connect LinkedIn profile", 500);
    }
  }

  async disconnectLinkedInProfile(userId: string): Promise<void> {
    try {
      await userRepository.updateUser(userId, {
        linkedinId: null,
        linkedinProfile: null,
        linkedinAccessToken: null,
        linkedinTokenExpiresAt: null,
      });
    } catch (error: any) {
      console.error("LinkedIn disconnection error:", error);
      throw new CustomError("Failed to disconnect LinkedIn profile", 500);
    }
  }

  async getUserLinkedInData(userId: string): Promise<LinkedInProfile | null> {
    try {
      const user = await userRepository.findUserById(userId);
      if (!user?.linkedinAccessToken || !user.linkedinId) {
        return null;
      }

      // Check if token is expired
      if (
        user.linkedinTokenExpiresAt &&
        new Date() > user.linkedinTokenExpiresAt
      ) {
        // Token expired, remove it
        await userRepository.updateUser(userId, {
          linkedinAccessToken: null,
          linkedinTokenExpiresAt: null,
        });
        return user.linkedinProfile as unknown as LinkedInProfile;
      }

      // Token is valid, fetch fresh data
      try {
        const profile = await this.getLinkedInProfile(user.linkedinAccessToken);
        const positions = await this.getLinkedInPositions(
          user.linkedinAccessToken,
          user.linkedinId
        );
        const educations = await this.getLinkedInEducation(
          user.linkedinAccessToken,
          user.linkedinId
        );

        const updatedProfile = this.parseLinkedInProfile(
          profile,
          positions,
          educations
        );
        updatedProfile.lastSyncAt = new Date().toISOString();

        // Update stored profile with fresh data
        await userRepository.updateUser(userId, {
          linkedinProfile: updatedProfile as any,
        });

        return updatedProfile;
      } catch (error) {
        // If API call fails, return cached profile data
        console.warn(
          "Failed to fetch fresh LinkedIn data, using cached:",
          error
        );
        return user.linkedinProfile as unknown as LinkedInProfile;
      }
    } catch (error: any) {
      console.error("Error getting LinkedIn data:", error);
      return null;
    }
  }

  async refreshLinkedInData(
    userId: string,
    accessToken: string
  ): Promise<LinkedInProfile> {
    try {
      const user = await userRepository.findUserById(userId);
      if (!user?.linkedinId) {
        throw new CustomError("No LinkedIn profile connected", 404);
      }

      // Fetch fresh data from LinkedIn using OpenID Connect
      const profile = await this.getLinkedInProfile(accessToken);

      // Parse and update
      const updatedProfile = this.parseLinkedInProfile(profile);
      updatedProfile.lastSyncAt = new Date().toISOString();

      await userRepository.updateUser(userId, {
        linkedinProfile: updatedProfile as any,
        profilePicture: updatedProfile.pictureUrl || user.profilePicture,
      });

      return updatedProfile;
    } catch (error: any) {
      console.error("LinkedIn refresh error:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to refresh LinkedIn data", 500);
    }
  }
}

export const linkedinService = new LinkedInService();
