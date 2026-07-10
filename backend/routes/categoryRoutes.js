import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { hasPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../constants/permissions.js';
import * as categoryController from '../controllers/categoryController.js';

const router = express.Router();

// Apply auth middleware to protect all routes
router.use(protect);
router.use(branchScope);

router.post('/', hasPermission(PERMISSIONS.CREATE_CATEGORY), categoryController.createCategory);
router.get('/', hasPermission(PERMISSIONS.READ_CATEGORY), categoryController.getCategories);
router.get('/:id', hasPermission(PERMISSIONS.READ_CATEGORY), categoryController.getCategoryById);
router.patch('/:id', hasPermission(PERMISSIONS.UPDATE_CATEGORY), categoryController.updateCategory);
router.patch('/:id/status', hasPermission(PERMISSIONS.ARCHIVE_CATEGORY), categoryController.updateCategoryStatus);

export default router;
