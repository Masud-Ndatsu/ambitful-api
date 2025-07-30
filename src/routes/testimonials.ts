import { Router } from "express";
import { TestimonialsController } from "../controllers/testimonials.controller";
import { validateParams, validateQuery } from "../middleware/validation";
import {
  testimonialsQuerySchema,
  testimonialIdParamsSchema,
} from "../validators/testimonials";

const router = Router();
const testimonialsController = new TestimonialsController();

// Get all testimonials with pagination and search
router.get(
  "/",
  validateQuery(testimonialsQuerySchema),
  testimonialsController.getTestimonials.bind(testimonialsController)
);

// Get featured testimonials
router.get(
  "/featured",
  testimonialsController.getFeaturedTestimonials.bind(testimonialsController)
);

// Get specific testimonial by ID
router.get(
  "/:id",
  validateParams(testimonialIdParamsSchema),
  testimonialsController.getTestimonialById.bind(testimonialsController)
);

export default router;
