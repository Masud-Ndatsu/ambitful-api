import { Router } from 'express';
import { OpportunityController } from '../controllers/opportunity.controller';
import { validateQuery, validateParams, validateBody } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { 
  opportunitiesQuerySchema, 
  opportunityIdParamsSchema,
  applyOpportunitySchema,
  shareOpportunitySchema,
  savedOpportunitiesQuerySchema
} from '../validators/opportunity';

const router = Router();
const opportunityController = new OpportunityController();

router.get(
  '/',
  validateQuery(opportunitiesQuerySchema),
  opportunityController.getOpportunities
);

router.get('/featured', opportunityController.getFeaturedOpportunities);

router.get('/trending', opportunityController.getTrendingOpportunities);

router.get(
  '/saved',
  authenticateToken,
  validateQuery(savedOpportunitiesQuerySchema),
  opportunityController.getSavedOpportunities
);

router.get(
  '/applied',
  authenticateToken,
  opportunityController.getUserApplications
);

router.get(
  '/similar/:id',
  validateParams(opportunityIdParamsSchema),
  opportunityController.getSimilarOpportunities
);

router.post(
  '/:id/save',
  authenticateToken,
  validateParams(opportunityIdParamsSchema),
  opportunityController.saveOpportunity
);

router.delete(
  '/:id/save',
  authenticateToken,
  validateParams(opportunityIdParamsSchema),
  opportunityController.unsaveOpportunity
);

router.post(
  '/:id/apply',
  authenticateToken,
  validateParams(opportunityIdParamsSchema),
  validateBody(applyOpportunitySchema),
  opportunityController.applyToOpportunity
);

router.post(
  '/:id/share',
  authenticateToken,
  validateParams(opportunityIdParamsSchema),
  validateBody(shareOpportunitySchema),
  opportunityController.shareOpportunity
);

router.post(
  '/:id/view',
  authenticateToken,
  validateParams(opportunityIdParamsSchema),
  opportunityController.recordOpportunityView
);

router.get(
  '/:id',
  validateParams(opportunityIdParamsSchema),
  opportunityController.getOpportunityById
);

export default router;