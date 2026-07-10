import express from 'express';
import { 
  register, 
  login, 
  logout, 
  forgotPassword, 
  resetPassword, 
  changePassword, 
  getMe, 
  checkUsername, 
  checkEmail
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authRateLimiter, forgotPasswordRateLimiter } from '../middleware/rateLimiter.js';
import { 
  validateBody, 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../validators/authValidator.js';

const router = express.Router();

// Public availability check endpoints (real-time field checking)
router.get('/check-username/:username', checkUsername);
router.get('/check-email/:email', checkEmail);

// Standard auth operations
router.post('/register', validateBody(registerSchema), register);
router.post('/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validateBody(resetPasswordSchema), resetPassword);

// Protected routes
router.get('/me', protect, getMe);

export default router;
