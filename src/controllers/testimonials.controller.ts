import { Request, Response, NextFunction } from 'express';
import { TestimonialsService } from '../services/testimonials.service';
import { createTestimonialSchema, updateTestimonialSchema, testimonialsQuerySchema } from '../validators/testimonials';
import { CustomError } from '../middleware/errorHandler';
import { SuccessResponse } from '../utils/response';

export class TestimonialsController {
  private testimonialsService: TestimonialsService;

  constructor() {
    this.testimonialsService = new TestimonialsService();
  }

  async getTestimonials(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = testimonialsQuerySchema.validate(req.query);
      if (error) {
        throw new CustomError(error.details[0].message, 400);
      }

      const { page, limit, search } = value;
      const result = await this.testimonialsService.getTestimonials(
        { search },
        { page, limit }
      );
      SuccessResponse(res, result, 'Testimonials retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFeaturedTestimonials(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 3;
      const testimonials = await this.testimonialsService.getFeaturedTestimonials(limit);
      SuccessResponse(res, testimonials, 'Featured testimonials retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTestimonialById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const testimonial = await this.testimonialsService.getTestimonialById(id);
      
      if (!testimonial) {
        throw new CustomError('Testimonial not found', 404);
      }

      SuccessResponse(res, testimonial, 'Testimonial retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const { error, value } = createTestimonialSchema.validate(req.body);
      if (error) {
        throw new CustomError(error.details[0].message, 400);
      }

      const testimonial = await this.testimonialsService.createTestimonial(value);
      SuccessResponse(res, testimonial, 'Testimonial created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { error, value } = updateTestimonialSchema.validate(req.body);
      if (error) {
        throw new CustomError(error.details[0].message, 400);
      }

      const testimonial = await this.testimonialsService.updateTestimonial(id, value);
      SuccessResponse(res, testimonial, 'Testimonial updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteTestimonial(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await this.testimonialsService.deleteTestimonial(id);
      SuccessResponse(res, null, 'Testimonial deleted successfully', 204);
    } catch (error) {
      next(error);
    }
  }

  async bulkDeleteTestimonials(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new CustomError('IDs array is required', 400);
      }

      const result = await this.testimonialsService.bulkDeleteTestimonials(ids);
      SuccessResponse(res, result, 'Testimonials deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getTestimonialsStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await this.testimonialsService.getTestimonialStats();
      SuccessResponse(res, stats, 'Testimonial statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}