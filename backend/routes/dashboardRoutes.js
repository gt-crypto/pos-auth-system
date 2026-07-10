import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getDashboardMe } from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/me', protect, getDashboardMe);

export default router;
