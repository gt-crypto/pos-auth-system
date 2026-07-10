import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { hasPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../constants/permissions.js';
import * as productController from '../controllers/productController.js';

const router = express.Router();

// Apply auth middleware to protect all routes
router.use(protect);
router.use(branchScope);

router.post('/', hasPermission(PERMISSIONS.CREATE_PRODUCT), productController.createProduct);
router.get('/', hasPermission(PERMISSIONS.READ_PRODUCT), productController.getProducts);
router.get('/:id', hasPermission(PERMISSIONS.READ_PRODUCT), productController.getProductById);
router.patch('/:id', hasPermission(PERMISSIONS.UPDATE_PRODUCT), productController.updateProduct);
router.patch('/:id/status', hasPermission(PERMISSIONS.ARCHIVE_PRODUCT), productController.updateProductStatus);

export default router;
