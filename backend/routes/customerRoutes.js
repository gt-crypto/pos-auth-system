import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { hasPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../constants/permissions.js';
import * as customerController from '../controllers/customerController.js';

const router = express.Router();

router.use(protect);
router.use(branchScope);

// POS autocomplete — fast search (cashier can access)
router.get('/search', hasPermission(PERMISSIONS.READ_CUSTOMER), customerController.searchCustomersCtrl);

// Dashboard metrics
router.get('/metrics', hasPermission(PERMISSIONS.READ_CUSTOMER), customerController.getCustomerMetricsCtrl);

// Customer CRUD
router.post('/', hasPermission(PERMISSIONS.CREATE_CUSTOMER), customerController.createCustomerCtrl);
router.get('/', hasPermission(PERMISSIONS.READ_CUSTOMER), customerController.getCustomersCtrl);
router.get('/:id', hasPermission(PERMISSIONS.READ_CUSTOMER), customerController.getCustomerByIdCtrl);
router.put('/:id', hasPermission(PERMISSIONS.UPDATE_CUSTOMER), customerController.updateCustomerCtrl);
router.delete('/:id', hasPermission(PERMISSIONS.ARCHIVE_CUSTOMER), customerController.archiveCustomerCtrl);
router.patch('/:id/restore', hasPermission(PERMISSIONS.RESTORE_CUSTOMER), customerController.restoreCustomerCtrl);

// Purchase history
router.get('/:id/history', hasPermission(PERMISSIONS.READ_CUSTOMER), customerController.getCustomerHistoryCtrl);

// Orders
router.post('/orders', hasPermission(PERMISSIONS.CREATE_ORDER), customerController.createOrderCtrl);
router.get('/orders/list', hasPermission(PERMISSIONS.READ_ORDER), customerController.getOrdersCtrl);

export default router;
