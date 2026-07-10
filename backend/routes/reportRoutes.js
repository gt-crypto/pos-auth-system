import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { hasPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../constants/permissions.js';
import * as reportController from '../controllers/reportController.js';

const router = express.Router();

router.use(protect);
router.use(branchScope);

// All report routes require READ_REPORTS
router.get('/dashboard', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getDashboardCtrl);
router.get('/sales', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getSalesCtrl);
router.get('/payment-method', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getPaymentCtrl);
router.get('/top-products', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getProductsCtrl);
router.get('/inventory', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getInventoryCtrl);
router.get('/cashiers', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getCashiersCtrl);
router.get('/branches', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getBranchesCtrl);
router.get('/customers', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getCustomerAnalyticsCtrl);
router.get('/low-stock', hasPermission(PERMISSIONS.READ_REPORTS), reportController.getLowStockCtrl);

export default router;
