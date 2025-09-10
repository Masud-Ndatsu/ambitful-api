import {
  userRepository,
  UserFilters,
  PaginationOptions,
} from "../repositories/user.repository";
import { User, UserActivity } from "../types";
import { CustomError } from "../middleware/errorHandler";
import { UserRole } from "../enums";

export class UserService {
  constructor() {
    // No need to initialize repository - using singleton
  }

  async getUserProfile(userId: string): Promise<User> {
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    return this.formatUser(user);
  }

  async updateUserProfile(
    userId: string,
    updateData: {
      name?: string;
      email?: string;
      country?: string;
      interests?: string[];
      bio?: string;
      skills?: string[];
      profilePicture?: string;
      academicLevel?: string;
      fieldOfStudy?: string;
      careerStage?: string;
      goals?: string[];
      preferences?: any;
      personalityTraits?: string[];
      learningStyle?: string;
      aiInteractionPrefs?: any;
      timeZone?: string;
      languages?: string[];
      workExperience?: string;
      currentFocus?: string[];
    }
  ): Promise<User> {
    const existingUser = await userRepository.findUserById(userId);
    if (!existingUser) {
      throw new CustomError("User not found", 404);
    }

    // Check if email is being updated and if it's already taken
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await userRepository.findUserByEmail(
        updateData.email
      );
      if (emailExists) {
        throw new CustomError("Email already exists", 409);
      }
    }

    const updatedUser = await userRepository.updateUser(userId, updateData);

    // Log the activity
    await userRepository.createUserActivity({
      userId,
      action: "PROFILE_UPDATE",
      description: "User updated their profile information",
    });

    return this.formatUser(updatedUser);
  }

  async getUserById(requesterId: string, targetUserId: string): Promise<User> {
    const requester = await userRepository.findUserById(requesterId);
    if (!requester) {
      throw new CustomError("Unauthorized", 401);
    }

    const targetUser = await userRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new CustomError("User not found", 404);
    }

    // Log the activity
    await userRepository.createUserActivity({
      userId: requesterId,
      action: "VIEW_USER",
      description: `Viewed user profile: ${targetUser.name}`,
    });

    return this.formatUser(targetUser);
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new CustomError("User not found", 404);
    }

    await userRepository.deleteUser(userId);

    return { message: "User deleted successfully" };
  }

  async getUsersWithPagination(
    filters: UserFilters,
    pagination: PaginationOptions
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await userRepository.findUsersWithPagination(
      filters,
      pagination
    );

    return {
      users: result.users.map((user) => this.formatUser(user)),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  async updateUserStatus(
    adminId: string,
    targetUserId: string,
    status: "active" | "inactive" | "suspended"
  ): Promise<User> {
    const admin = await userRepository.findUserById(adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new CustomError("Unauthorized", 403);
    }

    const targetUser = await userRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new CustomError("User not found", 404);
    }

    const statusEnum = status;
    const updatedUser = await userRepository.updateUserStatus(
      targetUserId,
      statusEnum
    );

    // Log the admin activity
    await userRepository.createUserActivity({
      userId: adminId,
      action: "USER_STATUS_UPDATE",
      description: `Updated user status to ${status} for user: ${targetUser.name}`,
    });

    // Log the user activity
    await userRepository.createUserActivity({
      userId: targetUserId,
      action: "STATUS_CHANGED",
      description: `Status changed to ${status} by admin`,
    });

    return this.formatUser(updatedUser);
  }

  async getUserActivity(
    adminId: string,
    targetUserId: string
  ): Promise<UserActivity[]> {
    const admin = await userRepository.findUserById(adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new CustomError("Unauthorized", 403);
    }

    const targetUser = await userRepository.findUserById(targetUserId);
    if (!targetUser) {
      throw new CustomError("User not found", 404);
    }

    const activities = await userRepository.findUserActivities(targetUserId);

    return activities.map((activity) => ({
      id: activity.id,
      userId: activity.userId,
      action: activity.action,
      description: activity.description,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      timestamp: activity.timestamp.toISOString(),
    })) as any[];
  }

  private formatUser(user: any): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      country: user.country,
      status: user.status.toLowerCase() as "active" | "inactive" | "suspended",
      verified: user.verified,
      signupDate: user.signupDate.toISOString(),
      lastActive: user.lastActive.toISOString(),
      interests: user.interests || [],
      bio: user.bio,
      skills: user.skills || [],
      profilePicture: user.profilePicture,

      // Enhanced profile for AI personalization
      academicLevel: user.academicLevel,
      fieldOfStudy: user.fieldOfStudy,
      careerStage: user.careerStage,
      goals: user.goals || [],
      preferences: user.preferences,
      personalityTraits: user.personalityTraits || [],
      learningStyle: user.learningStyle,
      aiInteractionPrefs: user.aiInteractionPrefs,
      timeZone: user.timeZone,
      languages: user.languages || [],
      workExperience: user.workExperience,
      currentFocus: user.currentFocus || [],

      role: user.role.toLowerCase() as "user" | "admin",
      linkedinId: user.linkedinId,
      linkedinProfile: user.linkedinProfile,
      linkedinAccessToken: user.linkedinAccessToken,
      linkedinTokenExpiresAt: user.linkedinTokenExpiresAt?.toISOString(),
    };
  }
}

export const userService = new UserService();
