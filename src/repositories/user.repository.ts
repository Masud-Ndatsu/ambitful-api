import { prisma } from "../database/prisma";
import { User, UserActivity } from "@prisma/client";

export interface UserFilters {
  status?: string;
  country?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export class UserRepository {
  async findUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: {
        ...data,
        lastActive: new Date(),
      },
    });
  }

  async deleteUser(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  async findUsersWithPagination(
    filters: UserFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedUsers> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status.toLowerCase();
    }

    if (filters.country) {
      where.country = {
        contains: filters.country,
        mode: "insensitive",
      };
    }

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [users, total]: [any[], number] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          signupDate: "desc",
        },
        select: {
          id: true,
          name: true,
          email: true,
          country: true,
          status: true,
          verified: true,
          signupDate: true,
          lastActive: true,
          interests: true,
          profilePicture: true,
          role: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(id: string, status: string): Promise<User> {
    return await prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async createUserActivity(activityData: {
    userId: string;
    action: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<UserActivity> {
    return await prisma.userActivity.create({
      data: activityData,
    });
  }

  async findUserActivities(userId: string): Promise<UserActivity[]> {
    return await prisma.userActivity.findMany({
      where: { userId },
      orderBy: {
        timestamp: "desc",
      },
      take: 50,
    });
  }

  async updateLastActive(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { lastActive: new Date() },
    });
  }
}

export const userRepository = new UserRepository();
