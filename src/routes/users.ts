import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validateBody, validateParams } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { updateProfileSchema, userIdParamsSchema } from '../validators/user';

const router = Router();
const userController = new UserController();

router.get('/profile', authenticateToken, userController.getProfile);

router.put(
  '/profile',
  authenticateToken,
  validateBody(updateProfileSchema),
  userController.updateProfile
);

router.get(
  '/:id',
  authenticateToken,
  validateParams(userIdParamsSchema),
  userController.getUserById
);

router.delete(
  '/:id',
  authenticateToken,
  validateParams(userIdParamsSchema),
  userController.deleteUser
);

export default router;