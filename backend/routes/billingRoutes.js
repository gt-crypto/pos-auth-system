import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { branchScope } from '../middleware/branchScope.js';
import { hasPermission } from '../middleware/authorize.js';
import { PERMISSIONS } from '../constants/permissions.js';
import * as billingController from '../controllers/billingController.js';

const router = express.Router();

router.use(protect);
router.use(branchScope);

router.post('/checkout', hasPermission(PERMISSIONS.CREATE_BILL), billingController.checkoutCart);
router.post('/hold', hasPermission(PERMISSIONS.CREATE_BILL), billingController.holdOrder);
router.post('/resume/:id', hasPermission(PERMISSIONS.CREATE_BILL), billingController.resumeOrder);
router.post('/cancel-hold/:id', hasPermission(PERMISSIONS.CREATE_BILL), billingController.cancelHoldOrder);
router.post('/split', hasPermission(PERMISSIONS.CREATE_BILL), billingController.splitOrder);

router.post('/void/:id', hasPermission(PERMISSIONS.VOID_BILL), billingController.voidOrder);
router.post('/refund/:id', hasPermission(PERMISSIONS.REFUND_BILL), billingController.refundOrder);

router.get('/orders', hasPermission(PERMISSIONS.READ_ORDER), billingController.getOrdersList);
router.get('/orders/:id', hasPermission(PERMISSIONS.READ_ORDER), billingController.getOrderById);

export default router;
