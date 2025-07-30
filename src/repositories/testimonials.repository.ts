import { prisma } from "../database/prisma";
import { Testimonial } from "@prisma/client";

export interface TestimonialFilters {
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class TestimonialsRepository {
  async findTestimonialsWithPagination(
    filters: TestimonialFilters,
    pagination: PaginationOptions
  ): Promise<{
    testimonials: Testimonial[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          opportunity: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          testimonial: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    const [testimonials, total] = await Promise.all([
      prisma.testimonial.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.testimonial.count({ where }),
    ]);

    return {
      testimonials,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllTestimonials(): Promise<Testimonial[]> {
    return await prisma.testimonial.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async findTestimonialById(id: string): Promise<Testimonial | null> {
    return await prisma.testimonial.findUnique({
      where: { id },
    });
  }

  async createTestimonial(testimonialData: {
    name: string;
    age: number;
    location: string;
    opportunity: string;
    testimonial: string;
    image?: string;
  }): Promise<Testimonial> {
    return await prisma.testimonial.create({
      data: testimonialData,
    });
  }

  async updateTestimonial(
    id: string,
    updateData: Partial<{
      name: string;
      age: number;
      location: string;
      opportunity: string;
      testimonial: string;
      image?: string;
    }>
  ): Promise<Testimonial> {
    return await prisma.testimonial.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteTestimonial(id: string): Promise<void> {
    await prisma.testimonial.delete({
      where: { id },
    });
  }

  async getTestimonialStats(): Promise<{
    total: number;
    thisMonth: number;
    avgAge: number;
    topLocations: { location: string; count: number }[];
  }> {
    const total = await prisma.testimonial.count();

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonth = await prisma.testimonial.count({
      where: {
        createdAt: {
          gte: thisMonthStart,
        },
      },
    });

    // Calculate average age
    const avgAgeResult = await prisma.testimonial.aggregate({
      _avg: {
        age: true,
      },
    });

    const avgAge = Math.round(avgAgeResult._avg.age || 0);

    // Get top locations
    const locationStats = await prisma.testimonial.groupBy({
      by: ["location"],
      _count: {
        location: true,
      },
      orderBy: {
        _count: {
          location: "desc",
        },
      },
      take: 5,
    });

    const topLocations = locationStats.map((stat) => ({
      location: stat.location,
      count: stat._count.location,
    }));

    return {
      total,
      thisMonth,
      avgAge,
      topLocations,
    };
  }

  async getRecentTestimonials(limit: number = 5): Promise<Testimonial[]> {
    return await prisma.testimonial.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async searchTestimonials(query: string): Promise<Testimonial[]> {
    return await prisma.testimonial.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            location: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            opportunity: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            testimonial: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTestimonialsByLocation(location: string): Promise<Testimonial[]> {
    return await prisma.testimonial.findMany({
      where: {
        location: {
          contains: location,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTestimonialsByAgeRange(
    minAge: number,
    maxAge: number
  ): Promise<Testimonial[]> {
    return await prisma.testimonial.findMany({
      where: {
        age: {
          gte: minAge,
          lte: maxAge,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async bulkDeleteTestimonials(ids: string[]): Promise<number> {
    const result = await prisma.testimonial.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return result.count;
  }
}
