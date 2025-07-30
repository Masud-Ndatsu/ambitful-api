import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import {
  sendMessageSchema,
  conversationIdParamsSchema,
  conversationsQuerySchema
} from '../validators/chat';

const router = Router();
const chatController = new ChatController();

// Send message to AI assistant
router.post(
  '/message',
  authenticateToken,
  validateBody(sendMessageSchema),
  chatController.sendMessage
);

// Get user's conversations
router.get(
  '/conversations',
  authenticateToken,
  validateQuery(conversationsQuerySchema),
  chatController.getConversations
);

// Get specific conversation
router.get(
  '/conversations/:id',
  authenticateToken,
  validateParams(conversationIdParamsSchema),
  chatController.getConversationById
);

// Delete conversation
router.delete(
  '/conversations/:id',
  authenticateToken,
  validateParams(conversationIdParamsSchema),
  chatController.deleteConversation
);

// Get personalized career advice
router.get(
  '/career-advice',
  authenticateToken,
  chatController.getCareerAdvice
);

// Get opportunity recommendations
router.get(
  '/opportunity-recommendations',
  authenticateToken,
  chatController.getOpportunityRecommendations
);

export default router;