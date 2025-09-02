import { testimonialsRepository, TestimonialFilters, PaginationOptions } from '../repositories/testimonials.repository';
import { Testimonial } from '../types';
import { CustomError } from '../middleware/errorHandler';

export class TestimonialsService {
  constructor() {
    // No need to initialize repository - using singleton
  }

  async getTestimonials(
    filters: TestimonialFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 10 }
  ): Promise<{
    testimonials: Testimonial[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const result = await testimonialsRepository.findTestimonialsWithPagination(filters, pagination);
      
      const formattedTestimonials: Testimonial[] = result.testimonials.map(testimonial => ({
        id: testimonial.id,
        name: testimonial.name,
        age: testimonial.age,
        location: testimonial.location,
        opportunity: testimonial.opportunity,
        testimonial: testimonial.testimonial,
        image: testimonial.image || undefined,
        createdAt: testimonial.createdAt.toISOString(),
        updatedAt: testimonial.updatedAt.toISOString()
      }));

      return {
        testimonials: formattedTestimonials,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages
      };
    } catch (error) {
      console.error('Error getting testimonials:', error);
      throw new CustomError('Failed to retrieve testimonials', 500);
    }
  }

  async getAllTestimonials(): Promise<Testimonial[]> {
    try {
      const testimonials = await testimonialsRepository.findAllTestimonials();
      
      return testimonials.map(testimonial => ({
        id: testimonial.id,
        name: testimonial.name,
        age: testimonial.age,
        location: testimonial.location,
        opportunity: testimonial.opportunity,
        testimonial: testimonial.testimonial,
        image: testimonial.image || undefined,
        createdAt: testimonial.createdAt.toISOString(),
        updatedAt: testimonial.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting all testimonials:', error);
      throw new CustomError('Failed to retrieve testimonials', 500);
    }
  }

  async getTestimonialById(id: string): Promise<Testimonial> {
    try {
      const testimonial = await testimonialsRepository.findTestimonialById(id);
      
      if (!testimonial) {
        throw new CustomError('Testimonial not found', 404);
      }

      return {
        id: testimonial.id,
        name: testimonial.name,
        age: testimonial.age,
        location: testimonial.location,
        opportunity: testimonial.opportunity,
        testimonial: testimonial.testimonial,
        image: testimonial.image || undefined,
        createdAt: testimonial.createdAt.toISOString(),
        updatedAt: testimonial.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Error getting testimonial by ID:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to retrieve testimonial', 500);
    }
  }

  async createTestimonial(testimonialData: {
    name: string;
    age: number;
    location: string;
    opportunity: string;
    testimonial: string;
    image?: string;
  }): Promise<Testimonial> {
    try {
      // Validate testimonial data
      if (!this.validateTestimonialData(testimonialData)) {
        throw new CustomError('Invalid testimonial data', 400);
      }

      const createdTestimonial = await testimonialsRepository.createTestimonial(testimonialData);

      return {
        id: createdTestimonial.id,
        name: createdTestimonial.name,
        age: createdTestimonial.age,
        location: createdTestimonial.location,
        opportunity: createdTestimonial.opportunity,
        testimonial: createdTestimonial.testimonial,
        image: createdTestimonial.image || undefined,
        createdAt: createdTestimonial.createdAt.toISOString(),
        updatedAt: createdTestimonial.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Error creating testimonial:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to create testimonial', 500);
    }
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
    try {
      // Check if testimonial exists
      const existingTestimonial = await testimonialsRepository.findTestimonialById(id);
      if (!existingTestimonial) {
        throw new CustomError('Testimonial not found', 404);
      }

      const updatedTestimonial = await testimonialsRepository.updateTestimonial(id, updateData);

      return {
        id: updatedTestimonial.id,
        name: updatedTestimonial.name,
        age: updatedTestimonial.age,
        location: updatedTestimonial.location,
        opportunity: updatedTestimonial.opportunity,
        testimonial: updatedTestimonial.testimonial,
        image: updatedTestimonial.image || undefined,
        createdAt: updatedTestimonial.createdAt.toISOString(),
        updatedAt: updatedTestimonial.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Error updating testimonial:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to update testimonial', 500);
    }
  }

  async deleteTestimonial(id: string): Promise<{ message: string }> {
    try {
      const testimonial = await testimonialsRepository.findTestimonialById(id);
      if (!testimonial) {
        throw new CustomError('Testimonial not found', 404);
      }

      await testimonialsRepository.deleteTestimonial(id);
      
      return { message: 'Testimonial deleted successfully' };
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to delete testimonial', 500);
    }
  }

  async getTestimonialStats(): Promise<{
    total: number;
    thisMonth: number;
    avgAge: number;
    topLocations: { location: string; count: number; }[];
  }> {
    try {
      return await testimonialsRepository.getTestimonialStats();
    } catch (error) {
      console.error('Error getting testimonial stats:', error);
      throw new CustomError('Failed to retrieve testimonial statistics', 500);
    }
  }

  async searchTestimonials(query: string): Promise<Testimonial[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const testimonials = await testimonialsRepository.searchTestimonials(query.trim());
      
      return testimonials.map(testimonial => ({
        id: testimonial.id,
        name: testimonial.name,
        age: testimonial.age,
        location: testimonial.location,
        opportunity: testimonial.opportunity,
        testimonial: testimonial.testimonial,
        image: testimonial.image || undefined,
        createdAt: testimonial.createdAt.toISOString(),
        updatedAt: testimonial.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error searching testimonials:', error);
      throw new CustomError('Failed to search testimonials', 500);
    }
  }

  async getTestimonialsByLocation(location: string): Promise<Testimonial[]> {
    try {
      const testimonials = await testimonialsRepository.getTestimonialsByLocation(location);
      
      return testimonials.map(testimonial => ({
        id: testimonial.id,
        name: testimonial.name,
        age: testimonial.age,
        location: testimonial.location,
        opportunity: testimonial.opportunity,
        testimonial: testimonial.testimonial,
        image: testimonial.image || undefined,
        createdAt: testimonial.createdAt.toISOString(),
        updatedAt: testimonial.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting testimonials by location:', error);
      throw new CustomError('Failed to retrieve testimonials by location', 500);
    }
  }

  async bulkDeleteTestimonials(ids: string[]): Promise<{ message: string; deleted: number }> {
    try {
      if (!ids || ids.length === 0) {
        throw new CustomError('No testimonial IDs provided', 400);
      }

      const deleted = await testimonialsRepository.bulkDeleteTestimonials(ids);
      
      return {
        message: `Successfully deleted ${deleted} testimonials`,
        deleted
      };
    } catch (error) {
      console.error('Error bulk deleting testimonials:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to delete testimonials', 500);
    }
  }

  private validateTestimonialData(data: {
    name: string;
    age: number;
    location: string;
    opportunity: string;
    testimonial: string;
    image?: string;
  }): boolean {
    // Basic validation
    if (!data.name || data.name.trim().length === 0) return false;
    if (!data.location || data.location.trim().length === 0) return false;
    if (!data.opportunity || data.opportunity.trim().length === 0) return false;
    if (!data.testimonial || data.testimonial.trim().length < 10) return false;
    if (data.age < 1 || data.age > 120) return false;

    // Validate image URL if provided
    if (data.image) {
      try {
        new URL(data.image);
      } catch {
        return false;
      }
    }

    return true;
  }

  async getFeaturedTestimonials(limit: number = 6): Promise<Testimonial[]> {
    try {
      const testimonials = await testimonialsRepository.getRecentTestimonials(limit);
      
      return testimonials.map(testimonial => ({
        id: testimonial.id,
        name: testimonial.name,
        age: testimonial.age,
        location: testimonial.location,
        opportunity: testimonial.opportunity,
        testimonial: testimonial.testimonial,
        image: testimonial.image || undefined,
        createdAt: testimonial.createdAt.toISOString(),
        updatedAt: testimonial.updatedAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting featured testimonials:', error);
      throw new CustomError('Failed to retrieve featured testimonials', 500);
    }
  }
}

export const testimonialsService = new TestimonialsService();